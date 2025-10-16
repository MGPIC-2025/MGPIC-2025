#!/usr/bin/env node

/**
 * 智能资源上传脚本
 * 支持增量上传和版本管理
 */

import { PutObjectCommand, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { shouldUploadFile, isAllowedFileType, getUploadConfig } from './upload-config.js';
import { 
  loadEnv, 
  createS3Client, 
  getMimeType, 
  getFileHash,
  formatSize,
  formatDuration,
  getPublicUrl,
  logger,
  withErrorHandling,
  ProgressBar
} from '../shared/utils.js';

// 加载配置
const config = loadEnv();
const s3Client = createS3Client(config);

/**
 * 检查远程文件是否存在且哈希值匹配
 */
async function isFileUpToDate(remotePath, localHash) {
  try {
    const command = new HeadObjectCommand({
      Bucket: config.bucketName,
      Key: remotePath,
    });
    
    const response = await s3Client.send(command);
    const remoteHash = response.Metadata?.['content-hash'];
    
    return remoteHash === localHash;
  } catch (error) {
    // 文件不存在
    return false;
  }
}

/**
 * 智能上传文件
 */
async function smartUploadFile(localPath, remotePath) {
  // 检查文件是否应该上传
  const relativePath = relative(process.cwd() + '/assets', localPath);
  if (!shouldUploadFile(localPath, relativePath)) {
    logger.debug(`跳过 (配置排除): ${remotePath}`);
    return { uploaded: false, skipped: true, reason: '配置排除' };
  }
  
  // 检查文件类型是否允许
  if (!isAllowedFileType(localPath)) {
    logger.debug(`跳过 (文件类型不允许): ${remotePath}`);
    return { uploaded: false, skipped: true, reason: '文件类型不允许' };
  }
  
  const localHash = getFileHash(localPath);
  
  // 检查文件是否需要上传
  if (await isFileUpToDate(remotePath, localHash)) {
    logger.debug(`跳过 (未变化): ${remotePath}`);
    return { uploaded: false, skipped: true, reason: '未变化' };
  }
  
  try {
    const fileContent = readFileSync(localPath);
    const mimeType = getMimeType(localPath);
    const uploadConfig = getUploadConfig(localPath);
    
    // 检查文件大小
    if (fileContent.length > uploadConfig.maxFileSize) {
      logger.warn(`文件过大，跳过: ${remotePath} (${formatSize(fileContent.length)})`);
      return { uploaded: false, skipped: true, reason: '文件过大' };
    }
    
    const command = new PutObjectCommand({
      Bucket: config.bucketName,
      Key: remotePath,
      Body: fileContent,
      ContentType: mimeType,
      CacheControl: uploadConfig.cacheControl,
      Metadata: {
        'content-hash': localHash,
        'upload-time': new Date().toISOString(),
        'file-size': fileContent.length.toString(),
      },
    });

    await s3Client.send(command);
    logger.success(`上传: ${remotePath} (${formatSize(fileContent.length)})`);
    return { uploaded: true, skipped: false, size: fileContent.length };
  } catch (error) {
    logger.error(`上传失败 ${remotePath}:`, error.message);
    return { uploaded: false, skipped: false, error: error.message };
  }
}

/**
 * 递归处理目录（使用配置文件规则）
 */
async function processDirectory(localPath, remotePath = '', progressBar = null) {
  const items = readdirSync(localPath);
  let stats = { 
    uploaded: 0, 
    skipped: 0, 
    errors: 0, 
    totalSize: 0,
    skipReasons: {} 
  };

  for (const item of items) {
    const localItemPath = join(localPath, item);
    const remoteItemPath = remotePath ? `${remotePath}/${item}` : item;
    const relativePath = relative(process.cwd() + '/assets', localItemPath);
    
    if (statSync(localItemPath).isDirectory()) {
      // 检查目录是否应该处理
      if (!shouldUploadFile(localItemPath, relativePath)) {
        logger.info(`跳过目录: ${remoteItemPath} (配置排除)`);
        continue;
      }
      
      logger.info(`处理目录: ${remoteItemPath}`);
      const result = await processDirectory(localItemPath, remoteItemPath, progressBar);
      stats.uploaded += result.uploaded;
      stats.skipped += result.skipped;
      stats.errors += result.errors;
      stats.totalSize += result.totalSize;
      
      // 合并跳过原因统计
      Object.entries(result.skipReasons).forEach(([reason, count]) => {
        stats.skipReasons[reason] = (stats.skipReasons[reason] || 0) + count;
      });
    } else {
      const result = await smartUploadFile(localItemPath, remoteItemPath);
      
      if (result.uploaded) {
        stats.uploaded++;
        stats.totalSize += result.size || 0;
      } else if (result.skipped) {
        stats.skipped++;
        const reason = result.reason || '未知原因';
        stats.skipReasons[reason] = (stats.skipReasons[reason] || 0) + 1;
      } else if (result.error) {
        stats.errors++;
      }
      
      // 更新进度条
      if (progressBar) {
        progressBar.update(stats.uploaded + stats.skipped + stats.errors);
      }
    }
  }

  return stats;
}

/**
 * 清理过期文件
 */
async function cleanupOldFiles() {
  return withErrorHandling(async () => {
    logger.info('检查存储桶状态...');
    
    const command = new ListObjectsV2Command({
      Bucket: config.bucketName,
      MaxKeys: 1000,
    });
    
    const response = await s3Client.send(command);
    const files = response.Contents || [];
    
    logger.info(`存储桶中共有 ${files.length} 个文件`);
  }, '清理检查失败');
}

/**
 * 主函数
 */
async function main() {
  const startTime = Date.now();
  
  logger.info('开始智能资源上传...');
  logger.info(`存储桶: ${config.bucketName}`);
  
  const assetsPath = join(process.cwd(), 'assets');
  
  try {
    if (!statSync(assetsPath).isDirectory()) {
      throw new Error('assets 目录不存在');
    }

    // 处理资源上传
    logger.info('扫描并上传资源...');
    const result = await processDirectory(assetsPath);
    
    // 清理过期文件
    await cleanupOldFiles();
    
    const duration = (Date.now() - startTime) / 1000;
    
    console.log('\n' + '='.repeat(60));
    logger.success('上传完成');
    console.log('='.repeat(60));
    logger.info(`成功上传: ${result.uploaded} 个文件`);
    logger.info(`跳过: ${result.skipped} 个文件`);
    
    // 显示跳过原因统计
    if (Object.keys(result.skipReasons).length > 0) {
      logger.info('跳过原因统计:');
      Object.entries(result.skipReasons).forEach(([reason, count]) => {
        logger.info(`  - ${reason}: ${count} 个文件`);
      });
    }
    
    logger.info(`失败: ${result.errors} 个文件`);
    logger.info(`总大小: ${formatSize(result.totalSize)}`);
    logger.info(`耗时: ${formatDuration(duration)}`);
    console.log('='.repeat(60));
    
    // 显示访问 URL
    const publicUrl = getPublicUrl(config);
    logger.info(`资源访问地址: ${publicUrl}`);
    
  } catch (error) {
    logger.error('上传失败:', error.message);
    process.exit(1);
  }
}

// 运行脚本
main().catch(error => {
  logger.error('脚本执行失败:', error.message);
  process.exit(1);
});
