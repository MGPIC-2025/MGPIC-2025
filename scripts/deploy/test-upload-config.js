#!/usr/bin/env node

/**
 * 测试上传配置脚本
 * 显示哪些文件会被上传，哪些会被跳过
 */

import { readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { shouldUploadFile, isAllowedFileType, getUploadConfig } from './upload-config.js';
import { formatSize, logger } from '../shared/utils.js';

/**
 * 递归扫描目录
 */
function scanDirectory(localPath, remotePath = '', results = { uploaded: [], skipped: [] }) {
  const items = readdirSync(localPath);
  
  for (const item of items) {
    const localItemPath = join(localPath, item);
    const remoteItemPath = remotePath ? `${remotePath}/${item}` : item;
    const relativePath = relative(process.cwd() + '/assets', localItemPath);
    
    if (statSync(localItemPath).isDirectory()) {
      // 检查目录是否应该处理
      if (!shouldUploadFile(localItemPath, relativePath)) {
        results.skipped.push({
          path: remoteItemPath,
          reason: '配置排除',
          type: 'directory'
        });
        continue;
      }
      
      scanDirectory(localItemPath, remoteItemPath, results);
    } else {
      // 检查文件是否应该上传
      if (!shouldUploadFile(localItemPath, relativePath)) {
        results.skipped.push({
          path: remoteItemPath,
          reason: '配置排除',
          type: 'file'
        });
        continue;
      }
      
      // 检查文件类型是否允许
      if (!isAllowedFileType(localItemPath)) {
        results.skipped.push({
          path: remoteItemPath,
          reason: '文件类型不允许',
          type: 'file'
        });
        continue;
      }
      
      // 获取上传配置
      const uploadConfig = getUploadConfig(localItemPath);
      const fileSize = statSync(localItemPath).size;
      
      if (fileSize > uploadConfig.maxFileSize) {
        results.skipped.push({
          path: remoteItemPath,
          reason: `文件过大 (${formatSize(fileSize)})`,
          type: 'file'
        });
        continue;
      }
      
      results.uploaded.push({
        path: remoteItemPath,
        size: fileSize,
        sizeFormatted: formatSize(fileSize),
        cacheControl: uploadConfig.cacheControl,
        type: 'file'
      });
    }
  }
  
  return results;
}

/**
 * 主函数
 */
function main() {
  logger.info('扫描 assets 目录，分析上传配置...\n');
  
  const assetsPath = join(process.cwd(), 'assets');
  
  try {
    if (!statSync(assetsPath).isDirectory()) {
      throw new Error('assets 目录不存在');
    }
    
    const results = scanDirectory(assetsPath);
    
    // 将要上传的文件
    console.log('='.repeat(60));
    console.log('将要上传的文件:');
    console.log('='.repeat(60));
    
    if (results.uploaded.length === 0) {
      logger.info('(无)');
    } else {
      results.uploaded.forEach((item, index) => {
        console.log(`${index + 1}. ${item.path}`);
        console.log(`   大小: ${item.sizeFormatted}`);
        console.log(`   缓存策略: ${item.cacheControl}`);
      });
    }
    
    // 跳过的文件/目录
    console.log('\n' + '='.repeat(60));
    console.log('跳过的文件/目录:');
    console.log('='.repeat(60));
    
    if (results.skipped.length === 0) {
      logger.info('(无)');
    } else {
      const grouped = results.skipped.reduce((acc, item) => {
        if (!acc[item.reason]) acc[item.reason] = [];
        acc[item.reason].push(item);
        return acc;
      }, {});
      
      Object.entries(grouped).forEach(([reason, items]) => {
        console.log(`\n${reason}:`);
        items.forEach((item, index) => {
          console.log(`  ${index + 1}. ${item.path} [${item.type}]`);
        });
      });
    }
    
    // 统计信息
    console.log('\n' + '='.repeat(60));
    console.log('统计信息:');
    console.log('='.repeat(60));
    
    const totalSize = results.uploaded.reduce((sum, item) => sum + item.size, 0);
    
    logger.info(`上传文件数: ${results.uploaded.length}`);
    logger.info(`跳过文件数: ${results.skipped.length}`);
    logger.info(`总大小: ${formatSize(totalSize)}`);
    
    // 按文件类型分组统计
    const byExtension = results.uploaded.reduce((acc, item) => {
      const ext = item.path.split('.').pop().toLowerCase();
      if (!acc[ext]) acc[ext] = { count: 0, size: 0 };
      acc[ext].count++;
      acc[ext].size += item.size;
      return acc;
    }, {});
    
    if (Object.keys(byExtension).length > 0) {
      console.log('\n按文件类型统计:');
      Object.entries(byExtension).forEach(([ext, stats]) => {
        logger.info(`  .${ext}: ${stats.count} 个文件, ${formatSize(stats.size)}`);
      });
    }
    
    console.log('='.repeat(60));
    
  } catch (error) {
    logger.error('扫描失败:', error.message);
    process.exit(1);
  }
}

// 运行脚本
main();
