/**
 * 铜偶名称映射工具
 * 提供中文名到英文文件夹名的映射
 */

// 铜偶中文名到英文文件夹名的映射
export const copperNameMap = {
  // Arcanist
  '咝咝': 'spark',
  '拉斐尔': 'syrup',
  '波普尔': 'bubble',
  '菲尼': 'glimmer',
  '卷卷': 'turner',
  // CraftsMan
  '波波': 'wrench',
  '公输': 'artifex',
  '特斯拉': 'coil',
  '丁格': 'drillbit',
  '小卯': 'quickhand',
  // IronWall
  '阿磐': 'rocky',
  '卫斯理': 'wesley',
  '大贝尔': 'bell',
  '团团': 'tumble',
  '铿铿': 'chief',
  // Mechanic
  '米洛': 'gyro',
  '杰克': 'tricky',
  '格洛克': 'pendulum',
  '溜溜': 'yoyo',
  '卡琳': 'karin',
  // Resonator
  '絮絮': 'murmur',
  '啾啾': 'melody',
  '库克': 'clawster',
  '鼹鼠的地洞': 'diggs',
  '蜜拉': 'hive'
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



