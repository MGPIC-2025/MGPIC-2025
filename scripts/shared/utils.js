/**
 * 脚本公共工具库
 * 提供共享的工具函数和配置
 */

import { S3Client } from '@aws-sdk/client-s3';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

/**
 * 加载环境变量
 */
export function loadEnv() {
  dotenv.config({ path: '.env.local' });
  
  const R2_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
  const R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME;

  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    throw new Error('缺少必要的环境变量：CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY, CLOUDFLARE_R2_BUCKET_NAME');
  }

  return {
    accountId: R2_ACCOUNT_ID,
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    bucketName: R2_BUCKET_NAME
  };
}

/**
 * 创建 S3 客户端
 */
export function createS3Client(config) {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

/**
 * MIME 类型映射表
 */
const MIME_TYPES = {
  'glb': 'model/gltf-binary',
  'webp': 'image/webp',
  'png': 'image/png',
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'gif': 'image/gif',
  'svg': 'image/svg+xml',
  'ico': 'image/x-icon',
  'mp3': 'audio/mpeg',
  'js': 'application/javascript',
  'mjs': 'application/javascript',
  'css': 'text/css',
  'html': 'text/html',
  'json': 'application/json',
  'txt': 'text/plain',
  'xml': 'application/xml',
  'pdf': 'application/pdf',
  'zip': 'application/zip',
};

/**
 * 获取文件 MIME 类型
 * @param {string} filePath - 文件路径
 * @returns {string} MIME 类型
 */
export function getMimeType(filePath) {
  const ext = filePath.split('.').pop().toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

/**
 * 计算文件哈希值
 * @param {string} filePath - 文件路径
 * @param {string} algorithm - 哈希算法 (默认 'md5')
 * @returns {string} 文件哈希值
 */
export function getFileHash(filePath, algorithm = 'md5') {
  const content = readFileSync(filePath);
  return createHash(algorithm).update(content).digest('hex');
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的大小
 */
export function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

/**
 * 格式化时间（秒）
 * @param {number} seconds - 秒数
 * @returns {string} 格式化后的时间
 */
export function formatDuration(seconds) {
  if (seconds < 60) return seconds.toFixed(1) + '秒';
  const minutes = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(0);
  return `${minutes}分${secs}秒`;
}

/**
 * 获取公共访问 URL
 * @param {Object} config - R2 配置
 * @returns {string} 公共访问 URL
 */
export function getPublicUrl(config) {
  return `https://${config.bucketName}.${config.accountId}.r2.cloudflarestorage.com`;
}

/**
 * 日志工具
 */
export const logger = {
  info: (msg, ...args) => console.log(`[INFO] ${msg}`, ...args),
  success: (msg, ...args) => console.log(`[SUCCESS] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[WARN] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[ERROR] ${msg}`, ...args),
  debug: (msg, ...args) => {
    if (process.env.DEBUG) {
      console.log(`[DEBUG] ${msg}`, ...args);
    }
  }
};

/**
 * 错误处理包装器
 * @param {Function} fn - 异步函数
 * @param {string} errorMsg - 错误消息
 */
export async function withErrorHandling(fn, errorMsg = '操作失败') {
  try {
    return await fn();
  } catch (error) {
    logger.error(`${errorMsg}:`, error.message);
    if (process.env.DEBUG) {
      console.error(error);
    }
    throw error;
  }
}

/**
 * 进度条显示
 */
export class ProgressBar {
  constructor(total, width = 40) {
    this.total = total;
    this.current = 0;
    this.width = width;
  }

  update(current, message = '') {
    this.current = current;
    const percentage = Math.round((current / this.total) * 100);
    const filled = Math.round((current / this.total) * this.width);
    const bar = '█'.repeat(filled) + '░'.repeat(this.width - filled);
    
    process.stdout.write(`\r[${bar}] ${percentage}% ${message}`);
    
    if (current === this.total) {
      process.stdout.write('\n');
    }
  }

  finish(message = '完成') {
    this.update(this.total, message);
  }
}

