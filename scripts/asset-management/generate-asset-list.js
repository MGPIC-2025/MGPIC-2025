/**
 * 自动扫描 assets 目录并生成资源列表
 * 用于预加载资源配置
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { formatSize, logger } from '../shared/utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置
const ASSETS_DIR = path.join(__dirname, '../../assets');
const OUTPUT_FILE = path.join(__dirname, '../../src/utils/asset-list.json');

// 资源优先级配置
const PRIORITY_CONFIG = {
  // 高优先级：首屏必需资源
  high: [
    /^logo\.glb$/,
    /^frontend_resource\//,
  ],
  
  // 中优先级：常用小资源
  medium: [
    /^equipment\//,
    /^resource\/.*\.webp$/,
  ],
  
  // 低优先级：可选资源（默认不预加载）
  low: [
    /\.glb$/, // 3D模型文件较大
  ],
  
  // 排除的资源（不加入预加载列表）
  exclude: [
    /\.DS_Store$/,
    /Thumbs\.db$/,
    /\.gitkeep$/,
  ]
};

// 文件大小限制（字节）
const SIZE_LIMITS = {
  high: 10 * 1024 * 1024,    // 高优先级最大 10MB
  medium: 5 * 1024 * 1024,   // 中优先级最大 5MB
  low: Infinity,             // 低优先级不限制
};

/**
 * 递归扫描目录获取所有文件
 */
function scanDirectory(dir, baseDir = dir) {
  const files = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // 递归扫描子目录
        files.push(...scanDirectory(fullPath, baseDir));
      } else if (entry.isFile()) {
        // 获取相对路径
        const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
        
        // 检查是否排除
        const shouldExclude = PRIORITY_CONFIG.exclude.some(pattern => 
          pattern.test(relativePath)
        );
        
        if (!shouldExclude) {
          // 获取文件大小
          const stats = fs.statSync(fullPath);
          
          files.push({
            path: relativePath,
            size: stats.size,
            ext: path.extname(entry.name).toLowerCase()
          });
        }
      }
    }
  } catch (error) {
    console.error(`扫描目录失败: ${dir}`, error.message);
  }
  
  return files;
}

/**
 * 确定资源优先级
 */
function getPriority(relativePath) {
  // 检查高优先级
  if (PRIORITY_CONFIG.high.some(pattern => pattern.test(relativePath))) {
    return 'high';
  }
  
  // 检查中优先级
  if (PRIORITY_CONFIG.medium.some(pattern => pattern.test(relativePath))) {
    return 'medium';
  }
  
  // 检查低优先级
  if (PRIORITY_CONFIG.low.some(pattern => pattern.test(relativePath))) {
    return 'low';
  }
  
  // 默认为中优先级
  return 'medium';
}

// formatSize 已从 utils.js 导入

/**
 * 主函数
 */
function main() {
  logger.info('开始扫描 assets 目录...\n');
  
  // 检查 assets 目录是否存在
  if (!fs.existsSync(ASSETS_DIR)) {
    logger.error('assets 目录不存在:', ASSETS_DIR);
    process.exit(1);
  }
  
  // 扫描所有文件
  const allFiles = scanDirectory(ASSETS_DIR);
  logger.info(`找到 ${allFiles.length} 个资源文件\n`);
  
  // 按优先级分类
  const categorized = {
    high: [],
    medium: [],
    low: []
  };
  
  const stats = {
    high: { count: 0, totalSize: 0 },
    medium: { count: 0, totalSize: 0 },
    low: { count: 0, totalSize: 0 },
    skipped: { count: 0, totalSize: 0 }
  };
  
  for (const file of allFiles) {
    const priority = getPriority(file.path);
    const sizeLimit = SIZE_LIMITS[priority];
    
    // 检查文件大小限制
    if (file.size <= sizeLimit) {
      categorized[priority].push({
        path: file.path,
        size: file.size,
        ext: file.ext
      });
      
      stats[priority].count++;
      stats[priority].totalSize += file.size;
    } else {
      logger.warn(`跳过大文件 [${priority}]: ${file.path} (${formatSize(file.size)})`);
      stats.skipped.count++;
      stats.skipped.totalSize += file.size;
    }
  }
  
  // 构建输出数据
  const output = {
    generated: new Date().toISOString(),
    version: '1.0.0',
    total: allFiles.length,
    categories: {
      high: {
        description: '首屏必需资源（自动预加载）',
        count: categorized.high.length,
        totalSize: stats.high.totalSize,
        resources: categorized.high
      },
      medium: {
        description: '常用资源（推荐预加载）',
        count: categorized.medium.length,
        totalSize: stats.medium.totalSize,
        resources: categorized.medium
      },
      low: {
        description: '可选资源（按需加载）',
        count: categorized.low.length,
        totalSize: stats.low.totalSize,
        resources: categorized.low
      }
    },
    stats: stats
  };
  
  // 确保输出目录存在
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // 写入文件
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');
  
  // 打印统计信息
  console.log('\n' + '='.repeat(60));
  console.log('资源统计');
  console.log('='.repeat(60));
  logger.info(`高优先级: ${stats.high.count} 个文件，总大小 ${formatSize(stats.high.totalSize)}`);
  logger.info(`中优先级: ${stats.medium.count} 个文件，总大小 ${formatSize(stats.medium.totalSize)}`);
  logger.info(`低优先级: ${stats.low.count} 个文件，总大小 ${formatSize(stats.low.totalSize)}`);
  if (stats.skipped.count > 0) {
    logger.warn(`已跳过:   ${stats.skipped.count} 个文件，总大小 ${formatSize(stats.skipped.totalSize)}`);
  }
  console.log('='.repeat(60));
  
  // 推荐预加载配置
  const recommendedSize = stats.high.totalSize + stats.medium.totalSize;
  logger.info(`\n推荐预加载: 高+中优先级 (${stats.high.count + stats.medium.count} 个文件，${formatSize(recommendedSize)})`);
  
  logger.success(`\n资源列表已生成: ${OUTPUT_FILE}`);
}

// 运行
main();

