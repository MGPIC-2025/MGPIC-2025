/**
 * 铜偶名称映射工具
 * 提供中文名到英文文件夹名的映射
 */

// 铜偶中文名到英文文件夹名的映射
export const copperNameMap = {
  // Arcanist
  '咝咝': 'bubble',
  '闪光': 'glimmer',
  '火花': 'spark',
  '糖浆': 'syrup',
  '特纳': 'turner',
  // CraftsMan
  '波波': 'artifex',
  '线圈': 'coil',
  '钻头': 'drillbit',
  '快手': 'quickhand',
  '扳手': 'wrench',
  // IronWall
  '阿磐': 'bell',
  '酋长': 'chief',
  '洛基': 'rocky',
  '汤波': 'tumble',
  '卫斯理': 'wesley',
  // Mechanic
  '陀螺': 'gyro',
  '卡琳': 'karin',
  '钟摆': 'pendulum',
  '狡黠': 'tricky',
  '悠悠': 'yoyo',
  // Resonator
  '夹子': 'clawster',
  '迪格斯': 'diggs',
  '蜂巢': 'hive',
  '旋律': 'melody',
  '低语': 'murmur'
};

// 铜偶类型到文件夹名的映射
export const copperTypeFolderMap = {
  'IronWall': 'iron_wall',
  'Arcanist': 'arcanist',
  'Mechanic': 'mechanic',
  'Resonator': 'resonator',
  'CraftsMan': 'craftsman'
};

/**
 * 将中文铜偶名转换为英文文件夹名
 * @param {string} chineseName - 中文名称
 * @returns {string} 英文文件夹名
 */
export function getCopperEnglishName(chineseName) {
  return copperNameMap[chineseName] || chineseName.toLowerCase();
}

/**
 * 将铜偶类型转换为文件夹名
 * @param {string} copperType - 铜偶类型（如 IronWall）
 * @returns {string} 文件夹名（如 iron_wall）
 */
export function getCopperTypeFolder(copperType) {
  return copperTypeFolderMap[copperType] || copperType.toLowerCase();
}



