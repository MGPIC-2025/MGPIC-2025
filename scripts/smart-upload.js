#!/usr/bin/env node

/**
 * 智能资源上传脚本
 * 支持增量上传和版本管理
 */

import { S3Client, PutObjectCommand, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { createHash } from 'crypto';
import { shouldUploadFile, isAllowedFileType, getUploadConfig } from './upload-config.js';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config({ path: '.env.local' });

const R2_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
  console.error('❌ 缺少必要的环境变量');
  process.exit(1);
}

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

/**
 * 计算文件哈希值
 */
function getFileHash(filePath) {
  const content = readFileSync(filePath);
  return createHash('md5').update(content).digest('hex');
}

/**
 * 获取文件 MIME 类型
 */
function getMimeType(filePath) {
  const ext = filePath.split('.').pop().toLowerCase();
  const mimeTypes = {
    'glb': 'model/gltf-binary',
    'webp': 'image/webp',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'js': 'application/javascript',
    'css': 'text/css',
    'html': 'text/html',
    'json': 'application/json',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * 检查远程文件是否存在且哈希值匹配
 */
async function isFileUpToDate(remotePath, localHash) {
  try {
    const command = new HeadObjectCommand({
      Bucket: R2_BUCKET_NAME,
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
    console.log(`⏭️  跳过 (配置排除): ${remotePath}`);
    return { uploaded: false, skipped: true };
  }
  
  // 检查文件类型是否允许
  if (!isAllowedFileType(localPath)) {
    console.log(`⏭️  跳过 (文件类型不允许): ${remotePath}`);
    return { uploaded: false, skipped: true };
  }
  
  const localHash = getFileHash(localPath);
  
  // 检查文件是否需要上传
  if (await isFileUpToDate(remotePath, localHash)) {
    console.log(`⏭️  跳过 (未变化): ${remotePath}`);
    return { uploaded: false, skipped: true };
  }
  
  try {
    const fileContent = readFileSync(localPath);
    const mimeType = getMimeType(localPath);
    const uploadConfig = getUploadConfig(localPath);
    
    // 检查文件大小
    if (fileContent.length > uploadConfig.maxFileSize) {
      console.log(`⚠️  文件过大，跳过: ${remotePath} (${(fileContent.length / 1024 / 1024).toFixed(1)}MB)`);
      return { uploaded: false, skipped: true };
    }
    
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
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
    console.log(`✅ 上传: ${remotePath} (${(fileContent.length / 1024).toFixed(1)}KB)`);
    return { uploaded: true, skipped: false };
  } catch (error) {
    console.error(`❌ 上传失败 ${remotePath}:`, error.message);
    return { uploaded: false, skipped: false, error: error.message };
  }
}

/**
 * 递归处理目录（使用配置文件规则）
 */
async function processDirectory(localPath, remotePath = '') {
  const items = readdirSync(localPath);
  let stats = { uploaded: 0, skipped: 0, errors: 0 };

  for (const item of items) {
    const localItemPath = join(localPath, item);
    const remoteItemPath = remotePath ? `${remotePath}/${item}` : item;
    const relativePath = relative(process.cwd() + '/assets', localItemPath);
    
    if (statSync(localItemPath).isDirectory()) {
      // 检查目录是否应该处理
      if (!shouldUploadFile(localItemPath, relativePath)) {
        console.log(`⏭️  跳过目录: ${remoteItemPath} (配置排除)`);
        continue;
      }
      
      console.log(`📁 处理目录: ${remoteItemPath}`);
      const result = await processDirectory(localItemPath, remoteItemPath);
      stats.uploaded += result.uploaded;
      stats.skipped += result.skipped;
      stats.errors += result.errors;
    } else {
      const result = await smartUploadFile(localItemPath, remoteItemPath);
      if (result.uploaded) stats.uploaded++;
      else if (result.skipped) stats.skipped++;
      else if (result.error) stats.errors++;
    }
  }

  return stats;
}

/**
 * 清理过期文件
 */
async function cleanupOldFiles() {
  try {
    console.log('🧹 检查过期文件...');
    
    const command = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      MaxKeys: 1000,
    });
    
    const response = await s3Client.send(command);
    const files = response.Contents || [];
    
    // 这里可以添加清理逻辑
    // 例如：删除超过 30 天未访问的文件
    console.log(`📊 存储桶中共有 ${files.length} 个文件`);
    
  } catch (error) {
    console.warn('⚠️ 清理检查失败:', error.message);
  }
}

/**
 * 主函数
 */
async function main() {
  const startTime = Date.now();
  
  console.log('🚀 开始智能资源上传...');
  console.log(`📦 存储桶: ${R2_BUCKET_NAME}`);
  
  const assetsPath = join(process.cwd(), 'assets');
  
  try {
    if (!statSync(assetsPath).isDirectory()) {
      throw new Error('assets 目录不存在');
    }

    // 处理资源上传
    const result = await processDirectory(assetsPath);
    
    // 清理过期文件
    await cleanupOldFiles();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n📊 上传完成:');
    console.log(`✅ 成功上传: ${result.uploaded} 个文件`);
    console.log(`⏭️  跳过 (未变化): ${result.skipped} 个文件`);
    console.log(`❌ 失败: ${result.errors} 个文件`);
    console.log(`⏱️  耗时: ${duration}秒`);
    
    // 显示访问 URL
    const publicUrl = `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    console.log(`\n🌐 资源访问地址: ${publicUrl}`);
    
  } catch (error) {
    console.error('❌ 上传失败:', error.message);
    process.exit(1);
  }
}

// 运行脚本
main().catch(console.error);
