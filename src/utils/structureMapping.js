/**
 * 建筑名称映射工具
 * 提供中文名到英文文件夹名的映射
 */

// 建筑中文名到英文文件夹名的映射
export const structureNameMap = {
  铆接壁垒: 'rivet_barrier',
  齿轮箭塔: 'gear_arrow_tower',
  心源矿钻: 'heart_source_mineral_drill',
  蒸汽矿车: 'steam_mining_car',
  充能线圈: 'charging_coil',
  维修工坊: 'repair_workshop',
  镜光折射塔: 'mirro_light_refraction_tower',
  共鸣警钟: 'resonance_alarm_bell',
  风暴铁砧: 'storm_anvil',
  自动装填炮: 'automatic_loading_gun',
};

/**
 * 将中文建筑名转换为英文文件夹名
 * @param {string} chineseName - 中文名称
 * @returns {string} 英文文件夹名
 */
export function getStructureEnglishName(chineseName) {
  return (
    structureNameMap[chineseName] ||
    chineseName.toLowerCase().replace(/\s+/g, '_')
  );
}

// 资源类型到文件夹名的映射
export const resourceTypeMap = {
  RefinedCopper: 'refined_copper_ingot',
  ResonantCrystal: 'resonant_star_crystal',
  HeartCrystalDust: 'heart_crystal_dust',
  RecallGear: 'recall_gear',
  SpiritalSpark: 'spiritual_spark',
};

/**
 * 将资源类型转换为文件夹名
 * @param {string} resourceType - 资源类型
 * @returns {string} 文件夹名
 */
export function getResourceFolderName(resourceType) {
  return resourceTypeMap[resourceType] || resourceType.toLowerCase();
}
