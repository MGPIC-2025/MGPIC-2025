#!/usr/bin/env node

/**
 * 测试上传配置脚本
 * 显示哪些文件会被上传，哪些会被跳过
 */

import { readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { shouldUploadFile, isAllowedFileType, getUploadConfig } from './upload-config.js';

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
          reason: `文件过大 (${(fileSize / 1024 / 1024).toFixed(1)}MB)`,
          type: 'file'
        });
        continue;
      }
      
      results.uploaded.push({
        path: remoteItemPath,
        size: (fileSize / 1024).toFixed(1) + 'KB',
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
  console.log('🔍 扫描 assets 目录，分析上传配置...\n');
  
  const assetsPath = join(process.cwd(), 'assets');
  
  try {
    if (!statSync(assetsPath).isDirectory()) {
      throw new Error('assets 目录不存在');
    }
    
    const results = scanDirectory(assetsPath);
    
    console.log('📤 将要上传的文件:');
    if (results.uploaded.length === 0) {
      console.log('  (无)');
    } else {
      results.uploaded.forEach(item => {
        console.log(`  ✅ ${item.path} (${item.size})`);
        if (item.cacheControl) {
          console.log(`     └─ 缓存策略: ${item.cacheControl}`);
        }
      });
    }
    
    console.log('\n⏭️  跳过的文件/目录:');
    if (results.skipped.length === 0) {
      console.log('  (无)');
    } else {
      const grouped = results.skipped.reduce((acc, item) => {
        if (!acc[item.reason]) acc[item.reason] = [];
        acc[item.reason].push(item);
        return acc;
      }, {});
      
      Object.entries(grouped).forEach(([reason, items]) => {
        console.log(`  📋 ${reason}:`);
        items.forEach(item => {
          console.log(`     ⏭️  ${item.path}`);
        });
      });
    }
    
    console.log('\n📊 统计:');
    console.log(`  📤 上传: ${results.uploaded.length} 个文件`);
    console.log(`  ⏭️  跳过: ${results.skipped.length} 个文件/目录`);
    
    // 计算总大小
    const totalSize = results.uploaded.reduce((sum, item) => {
      return sum + parseFloat(item.size);
    }, 0);
    console.log(`  📦 总大小: ${totalSize.toFixed(1)}KB`);
    
  } catch (error) {
    console.error('❌ 扫描失败:', error.message);
    process.exit(1);
  }
}

// 运行脚本
main();
