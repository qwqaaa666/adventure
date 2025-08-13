// src/utils/storage.js

const SAVE_KEY = 'ForgottenThroneSave';

/**
 * 将游戏数据保存到本地存储。
 * @param {object} data 要保存的游戏数据。
 */
export function saveGameData(data) {
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
        console.log('游戏数据已保存。');
    } catch (e) {
        console.error('保存游戏数据失败:', e);
        // 在实际游戏中，这里可以给用户一个友好的错误提示
    }
}

/**
 * 从本地存储加载游戏数据。
 * @returns {object|null} 加载的游戏数据，如果没有则返回null。
 */
export function loadGameData() {
    try {
        const savedData = localStorage.getItem(SAVE_KEY);
        if (savedData) {
            return JSON.parse(savedData);
        }
    } catch (e) {
        console.error('加载游戏数据失败或数据损坏:', e);
        // 可以选择清除损坏的存档
        localStorage.removeItem(SAVE_KEY);
    }
    return null;
}

/**
 * 清除本地存储的游戏数据。
 */
export function clearGameData() {
    try {
        localStorage.removeItem(SAVE_KEY);
        console.log('游戏数据已清除。');
    } catch (e) {
        console.error('清除游戏数据失败:', e);
    }
}