/**
 * 音频配置
 * 包含音乐和音效的URL配置
 */

import { getAssetUrl } from './resourceLoader.js';

/**
 * 音乐配置
 */
export const musicConfig = {
  gameScene: getAssetUrl('@assets/frontend_resource/gamescene.mp3'),
};

/**
 * 音效配置
 */
export const soundConfig = {
  move: getAssetUrl('@assets/frontend_resource/move.mp3'),
  moveEnemy: getAssetUrl('@assets/frontend_resource/move_enemy.mp3'),
  attack: getAssetUrl('@assets/frontend_resource/attack.mp3'),
  attackEnemy: getAssetUrl('@assets/frontend_resource/attack_enemy.mp3'),
  meHurt: getAssetUrl('@assets/frontend_resource/me_hurt.mp3'),
  enemyHurt: getAssetUrl('@assets/frontend_resource/enemy_hurt.mp3'),
};

/**
 * 获取音乐URL
 * @param {string} key - 音乐键名
 * @returns {string} 音乐URL
 */
export function getMusicUrl(key) {
  return musicConfig[key] || '';
}

/**
 * 获取音效URL
 * @param {string} key - 音效键名
 * @returns {string} 音效URL
 */
export function getSoundUrl(key) {
  return soundConfig[key] || '';
}
