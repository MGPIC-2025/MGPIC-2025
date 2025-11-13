import { getAssetUrl } from './resourceLoader.js';

export const RESOURCE_META = {
  HeartCrystalDust: {
    name: '心晶尘',
    icon: getAssetUrl('resource/heart_crystal_dust.png'),
  },
  RecallGear: {
    name: '回响齿轮',
    icon: getAssetUrl('resource/recall_gear.png'),
  },
  ResonantCrystal: {
    name: '共鸣星晶',
    icon: getAssetUrl(
      'resource/resonant_star_crystal/resonant_star_crystal.png'
    ),
  },
  RefinedCopper: {
    name: '精炼铜锭',
    icon: getAssetUrl(
      'resource/refined_copper_ingot/refined_copper_ingot.png'
    ),
  },
  SpiritalSpark: {
    name: '灵性火花',
    icon: getAssetUrl('resource/spiritual_spark.png'),
  },
};

export function getItemName(item) {
  if (Array.isArray(item?.item_type) && item.item_type[0] === 'Resource') {
    const resourceType = item.item_type[1];
    return RESOURCE_META[resourceType]?.name || resourceType;
  } else if (
    Array.isArray(item?.item_type) &&
    item.item_type[0] === 'Equipment'
  ) {
    return '装备';
  }
  return '未知物品';
}

export function getItemIcon(item) {
  if (Array.isArray(item?.item_type) && item.item_type[0] === 'Resource') {
    const resourceType = item.item_type[1];
    return RESOURCE_META[resourceType]?.icon || '';
  }
  return '';
}

export function getResourceName(resourceType) {
  return RESOURCE_META[resourceType]?.name || resourceType;
}

export function getResourceIcon(resourceType) {
  return RESOURCE_META[resourceType]?.icon || '';
}
