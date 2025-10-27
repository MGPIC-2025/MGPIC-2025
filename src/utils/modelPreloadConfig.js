/**
 * 模型预加载配置
 * 定义游戏中所有可能用到的模型URL
 */

import { getAssetUrl, getCopperModelUrl, getEnemyModelUrl, getStructureModelUrl } from './resourceLoader.js';

// 铜偶模型配置
const COPPER_MODELS = {
  // Arcanist 系列
  arcanist: [
    'bubble', 'glimmer', 'spark', 'syrup', 'turner'
  ],
  // Craftsman 系列  
  craftsman: [
    'artifex', 'coil', 'drillbit', 'quickhand', 'wrench'
  ],
  // IronWall 系列
  iron_wall: [
    'bell', 'chief', 'rocky', 'tumble', 'wesley'
  ],
  // Mechanic 系列
  mechanic: [
    'gyro', 'karin', 'pendulum', 'tricky', 'yoyo'
  ],
  // Resonator 系列
  resonator: [
    'clawster', 'diggs', 'hive', 'melody', 'murmur'
  ]
};

// 敌人模型配置
const ENEMY_MODELS = [
  'assassin', 'boxer', 'cruiser', 'demon', 'devourer',
  'glutton', 'goblin', 'guard', 'horn', 'mirror',
  'scout', 'shatra', 'variant'
];

// 建筑模型配置
const STRUCTURE_MODELS = [
  'automatic_loading_gun', 'charging_coil', 'heart_source_mineral_drill',
  'mirro_light_refraction_tower', 'repair_workshop', 'resonance_alarm_bell',
  'rivet_barrier', 'steam_mining_car', 'storm_anvil'
];

/**
 * 生成所有模型URL列表
 * @returns {Array<string>} 模型URL数组
 */
export function getAllModelUrls() {
  const urls = [];
  
  // 添加铜偶模型
  for (const [type, names] of Object.entries(COPPER_MODELS)) {
    for (const name of names) {
      const url = getCopperModelUrl(type, name);
      urls.push(url);
    }
  }
  
  // 添加敌人模型
  for (const name of ENEMY_MODELS) {
    const url = getEnemyModelUrl(name);
    urls.push(url);
  }
  
  // 添加建筑模型
  for (const name of STRUCTURE_MODELS) {
    const url = getStructureModelUrl(name);
    urls.push(url);
  }
  
  console.log(`[ModelPreloadConfig] 生成了 ${urls.length} 个模型URL`);
  return urls;
}

/**
 * 获取高优先级模型URL（常用模型）
 * @returns {Array<string>} 高优先级模型URL数组
 */
export function getHighPriorityModelUrls() {
  const urls = [];
  
  // 添加常用铜偶模型
  const commonCoppers = [
    { type: 'arcanist', name: 'bubble' },
    { type: 'craftsman', name: 'coil' },
    { type: 'iron_wall', name: 'bell' },
    { type: 'mechanic', name: 'gyro' },
    { type: 'resonator', name: 'clawster' }
  ];
  
  for (const copper of commonCoppers) {
    const url = getCopperModelUrl(copper.type, copper.name);
    urls.push(url);
  }
  
  // 添加常用敌人模型
  const commonEnemies = ['goblin', 'guard', 'demon'];
  for (const name of commonEnemies) {
    const url = getEnemyModelUrl(name);
    urls.push(url);
  }
  
  console.log(`[ModelPreloadConfig] 生成了 ${urls.length} 个高优先级模型URL`);
  return urls;
}

/**
 * 获取中等优先级模型URL（较常用模型）
 * @returns {Array<string>} 中等优先级模型URL数组
 */
export function getMediumPriorityModelUrls() {
  const urls = [];
  
  // 添加中等常用铜偶模型
  const mediumCoppers = [
    { type: 'arcanist', name: 'glimmer' },
    { type: 'arcanist', name: 'spark' },
    { type: 'craftsman', name: 'artifex' },
    { type: 'craftsman', name: 'wrench' },
    { type: 'iron_wall', name: 'chief' },
    { type: 'iron_wall', name: 'rocky' },
    { type: 'mechanic', name: 'karin' },
    { type: 'mechanic', name: 'tricky' },
    { type: 'resonator', name: 'diggs' },
    { type: 'resonator', name: 'hive' }
  ];
  
  for (const copper of mediumCoppers) {
    const url = getCopperModelUrl(copper.type, copper.name);
    urls.push(url);
  }
  
  // 添加中等常用敌人模型
  const mediumEnemies = ['assassin', 'boxer', 'cruiser', 'devourer', 'glutton'];
  for (const name of mediumEnemies) {
    const url = getEnemyModelUrl(name);
    urls.push(url);
  }
  
  console.log(`[ModelPreloadConfig] 生成了 ${urls.length} 个中等优先级模型URL`);
  return urls;
}

/**
 * 获取低优先级模型URL（不常用模型）
 * @returns {Array<string>} 低优先级模型URL数组
 */
export function getLowPriorityModelUrls() {
  const urls = [];
  
  // 添加不常用铜偶模型
  const lowCoppers = [
    { type: 'arcanist', name: 'syrup' },
    { type: 'arcanist', name: 'turner' },
    { type: 'craftsman', name: 'drillbit' },
    { type: 'craftsman', name: 'quickhand' },
    { type: 'iron_wall', name: 'tumble' },
    { type: 'iron_wall', name: 'wesley' },
    { type: 'mechanic', name: 'pendulum' },
    { type: 'mechanic', name: 'yoyo' },
    { type: 'resonator', name: 'melody' },
    { type: 'resonator', name: 'murmur' }
  ];
  
  for (const copper of lowCoppers) {
    const url = getCopperModelUrl(copper.type, copper.name);
    urls.push(url);
  }
  
  // 添加不常用敌人模型
  const lowEnemies = ['horn', 'mirror', 'scout', 'shatra', 'variant'];
  for (const name of lowEnemies) {
    const url = getEnemyModelUrl(name);
    urls.push(url);
  }
  
  // 添加所有建筑模型
  for (const name of STRUCTURE_MODELS) {
    const url = getStructureModelUrl(name);
    urls.push(url);
  }
  
  console.log(`[ModelPreloadConfig] 生成了 ${urls.length} 个低优先级模型URL`);
  return urls;
}

/**
 * 根据优先级获取模型URL
 * @param {Array<string>} priorities - 优先级数组 ['high', 'medium', 'low']
 * @returns {Array<string>} 模型URL数组
 */
export function getModelUrlsByPriority(priorities = ['high', 'medium']) {
  const urls = [];
  
  for (const priority of priorities) {
    switch (priority) {
      case 'high':
        urls.push(...getHighPriorityModelUrls());
        break;
      case 'medium':
        urls.push(...getMediumPriorityModelUrls());
        break;
      case 'low':
        urls.push(...getLowPriorityModelUrls());
        break;
    }
  }
  
  // 去重
  const uniqueUrls = [...new Set(urls)];
  console.log(`[ModelPreloadConfig] 根据优先级 ${priorities.join(', ')} 生成了 ${uniqueUrls.length} 个唯一模型URL`);
  
  return uniqueUrls;
}

/**
 * 获取模型统计信息
 * @returns {Object} 模型统计信息
 */
export function getModelStats() {
  const stats = {
    copper: {
      arcanist: COPPER_MODELS.arcanist.length,
      craftsman: COPPER_MODELS.craftsman.length,
      iron_wall: COPPER_MODELS.iron_wall.length,
      mechanic: COPPER_MODELS.mechanic.length,
      resonator: COPPER_MODELS.resonator.length,
      total: Object.values(COPPER_MODELS).flat().length
    },
    enemy: {
      total: ENEMY_MODELS.length
    },
    structure: {
      total: STRUCTURE_MODELS.length
    },
    grandTotal: Object.values(COPPER_MODELS).flat().length + ENEMY_MODELS.length + STRUCTURE_MODELS.length
  };
  
  return stats;
}

// 导出配置对象
export const MODEL_PRELOAD_CONFIG = {
  COPPER_MODELS,
  ENEMY_MODELS,
  STRUCTURE_MODELS,
  getAllModelUrls,
  getHighPriorityModelUrls,
  getMediumPriorityModelUrls,
  getLowPriorityModelUrls,
  getModelUrlsByPriority,
  getModelStats
};
