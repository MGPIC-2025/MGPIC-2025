#!/usr/bin/env node

/**
 * Cloudflare R2 资源上传脚本
 * 用于将 assets 目录上传到 R2 存储桶
 */

import { PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { 
  loadEnv, 
  createS3Client, 
  getMimeType, 
  formatSize, 
  getPublicUrl,
  logger,
  withErrorHandling
} from '../shared/utils.js';

// 加载配置
const config = loadEnv();
const s3Client = createS3Client(config);

/**
 * 递归上传目录
 */
async function uploadDirectory(localPath, remotePath = '') {
  const items = readdirSync(localPath);
  let stats = { uploaded: 0, skipped: 0, totalSize: 0 };

  for (const item of items) {
    const localItemPath = join(localPath, item);
    const remoteItemPath = remotePath ? `${remotePath}/${item}` : item;
    
    if (statSync(localItemPath).isDirectory()) {
      logger.info(`处理目录: ${remoteItemPath}`);
      const result = await uploadDirectory(localItemPath, remoteItemPath);
      stats.uploaded += result.uploaded;
      stats.skipped += result.skipped;
      stats.totalSize += result.totalSize;
    } else {
      const result = await uploadFile(localItemPath, remoteItemPath);
      if (result.success) {
        stats.uploaded++;
        stats.totalSize += result.size;
      } else {
        stats.skipped++;
      }
    }
  }

  return stats;
}

/**
 * 上传单个文件
 */
async function uploadFile(localPath, remotePath) {
  try {
    const fileContent = readFileSync(localPath);
    const mimeType = getMimeType(localPath);
    
    const command = new PutObjectCommand({
      Bucket: config.bucketName,
      Key: remotePath,
      Body: fileContent,
      ContentType: mimeType,
      CacheControl: 'public, max-age=31536000', // 1年缓存
    });

    await s3Client.send(command);
    logger.success(`上传: ${remotePath} (${formatSize(fileContent.length)})`);
    
    return { success: true, size: fileContent.length };
  } catch (error) {
    logger.error(`上传失败 ${remotePath}:`, error.message);
    return { success: false, size: 0 };
  }
}

/**
 * 列出存储桶中的现有文件
 */
async function listExistingFiles() {
  return withErrorHandling(async () => {
    const command = new ListObjectsV2Command({
      Bucket: config.bucketName,
      MaxKeys: 1000,
    });
    
    const response = await s3Client.send(command);
    return response.Contents?.map(obj => obj.Key) || [];
  }, '列出文件失败');
}

/**
 * 主函数
 */
async function main() {
  const startTime = Date.now();
  
  logger.info('开始上传资源到 Cloudflare R2...');
  logger.info(`存储桶: ${config.bucketName}`);
  
  const assetsPath = join(process.cwd(), 'assets');
  
  try {
    // 检查 assets 目录是否存在
    if (!statSync(assetsPath).isDirectory()) {
      throw new Error('assets 目录不存在');
    }

    // 上传资源
    const result = await uploadDirectory(assetsPath);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n' + '='.repeat(60));
    logger.success('上传完成');
    console.log('='.repeat(60));
    logger.info(`成功上传: ${result.uploaded} 个文件`);
    logger.info(`跳过: ${result.skipped} 个文件`);
    logger.info(`总大小: ${formatSize(result.totalSize)}`);
    logger.info(`耗时: ${duration}秒`);
    console.log('='.repeat(60));
    
    // 显示访问 URL
    const publicUrl = getPublicUrl(config);
    logger.info(`资源访问地址: ${publicUrl}`);
    logger.info('建议配置自定义域名以获得更好的性能');
    
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
