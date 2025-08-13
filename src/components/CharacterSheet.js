// src/components/CharacterSheet.js

/**
 * 渲染或更新角色信息面板。
 * @param {object} player 玩家角色数据。
 * @param {string} job 玩家职业。
 * @param {number} stage 当前游戏阶段。
 */
export function renderCharacterSheet(player, job, stage) {
    const characterInfoDiv = document.getElementById('character-info');
    characterInfoDiv.innerHTML = `
        <p><strong>等级:</strong> ${player.level}</p>
        <p><strong>职业:</strong> ${job || '无'}</p>
        <p><strong>年龄:</strong> ${player.age}</p>
        <p><strong>阶段:</strong> ${stage}</p>
        <p><strong>生命值:</strong> ${player.currentHP} / ${player.maxHP}</p>
        <div class="progress-bar"><div class="progress-bar-fill" style="width: ${(player.currentHP / player.maxHP) * 100}%"></div></div>
        <p><strong>经验值:</strong> ${player.exp} / ${player.nextLevelExp}</p>
        <div class="progress-bar"><div class="progress-bar-fill" style="width: ${(player.exp / player.nextLevelExp) * 100}%"></div></div>
        <hr>
        ${Object.entries(player.attributes).map(([key, value]) => `<p><strong>${key}:</strong> ${value}</p>`).join('')}
    `;
}