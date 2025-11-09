/**
 * 游戏设置管理
 * 使用 localStorage 持久化存储用户设置
 */

const SETTINGS_KEY = 'mgpic_game_settings';

// 默认设置
const DEFAULT_SETTINGS = {
  // 控制模式：'touchpad' = 触控板模式（需要按住鼠标），'mouse' = 鼠标模式（直接移动）
  controlMode: 'touchpad',
  // 鼠标灵敏度
  mouseSensitivity: 0.002,
};

/**
 * 获取所有设置
 */
export function getSettings() {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const settings = JSON.parse(stored);
      // 合并默认设置，确保新增的设置项也能有默认值
      return { ...DEFAULT_SETTINGS, ...settings };
    }
  } catch (e) {
    console.error('[GameSettings] 读取设置失败:', e);
  }
  return { ...DEFAULT_SETTINGS };
}

/**
 * 保存设置
 */
export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch (e) {
    console.error('[GameSettings] 保存设置失败:', e);
    return false;
  }
}

/**
 * 获取单个设置项
 */
export function getSetting(key) {
  const settings = getSettings();
  return settings[key];
}

/**
 * 更新单个设置项
 */
export function updateSetting(key, value) {
  const settings = getSettings();
  settings[key] = value;
  return saveSettings(settings);
}

/**
 * 重置为默认设置
 */
export function resetSettings() {
  return saveSettings({ ...DEFAULT_SETTINGS });
}
