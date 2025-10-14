#!/usr/bin/env node

/**
 * Cloudflare R2 资源上传脚本
 * 用于将 assets 目录上传到 R2 存储桶
 */

import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { createReadStream } from 'fs';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config({ path: '.env.local' });

const R2_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
  console.error('❌ 缺少必要的环境变量');
  console.error('需要设置: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY, CLOUDFLARE_R2_BUCKET_NAME');
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
 * 递归上传目录（排除 img 目录）
 */
async function uploadDirectory(localPath, remotePath = '') {
  const items = readdirSync(localPath);
  let uploadedCount = 0;
  let skippedCount = 0;

  for (const item of items) {
    const localItemPath = join(localPath, item);
    const remoteItemPath = remotePath ? `${remotePath}/${item}` : item;
    
    // 跳过 img 目录
    if (item === 'img') {
      console.log(`⏭️  跳过目录: ${remoteItemPath} (img 目录不上传到 R2)`);
      continue;
    }
    
    if (statSync(localItemPath).isDirectory()) {
      console.log(`📁 处理目录: ${remoteItemPath}`);
      const result = await uploadDirectory(localItemPath, remoteItemPath);
      uploadedCount += result.uploaded;
      skippedCount += result.skipped;
    } else {
      try {
        const fileContent = readFileSync(localItemPath);
        const mimeType = getMimeType(localItemPath);
        
        const command = new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: remoteItemPath,
          Body: fileContent,
          ContentType: mimeType,
          CacheControl: 'public, max-age=31536000', // 1年缓存
        });

        await s3Client.send(command);
        console.log(`✅ 上传: ${remoteItemPath} (${(fileContent.length / 1024).toFixed(1)}KB)`);
        uploadedCount++;
      } catch (error) {
        console.error(`❌ 上传失败 ${remoteItemPath}:`, error.message);
      }
    }
  }

  return { uploaded: uploadedCount, skipped: skippedCount };
}

/**
 * 列出存储桶中的现有文件
 */
async function listExistingFiles() {
  try {
    const command = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      MaxKeys: 1000,
    });
    
    const response = await s3Client.send(command);
    return response.Contents?.map(obj => obj.Key) || [];
  } catch (error) {
    console.error('❌ 列出文件失败:', error.message);
    return [];
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始上传资源到 Cloudflare R2...');
  console.log(`📦 存储桶: ${R2_BUCKET_NAME}`);
  
  const assetsPath = join(process.cwd(), 'assets');
  
  try {
    // 检查 assets 目录是否存在
    if (!statSync(assetsPath).isDirectory()) {
      throw new Error('assets 目录不存在');
    }

    // 上传资源
    const result = await uploadDirectory(assetsPath);
    
    console.log('\n📊 上传完成:');
    console.log(`✅ 成功上传: ${result.uploaded} 个文件`);
    console.log(`⏭️  跳过: ${result.skipped} 个文件`);
    
    // 显示访问 URL
    const publicUrl = `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    console.log(`\n🌐 资源访问地址: ${publicUrl}`);
    console.log('💡 建议配置自定义域名以获得更好的性能');
    
  } catch (error) {
    console.error('❌ 上传失败:', error.message);
    process.exit(1);
  }
}

// 运行脚本
main().catch(console.error);
