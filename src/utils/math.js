// src/utils/math.js

/**
 * 执行一个基于属性的成功判定。
 * @param {string} attribute 参与判定的主要属性名称。
 * @param {number} value 判定所需的属性值阈值。
 * @param {object} playerAttributes 玩家当前所有属性。
 * @param {number} stage 当前游戏阶段。
 * @param {string} [attribute2] 参与判定的次要属性名称 (可选)。
 * @param {number} [value2] 次要属性判定所需值 (可选)。
 * @param {number} [multiplier=1] 额外的成功率乘数 (例如：怪物力竭)。
 * @param {number} [playerStamina] 玩家当前体力值，用于加成。
 * @returns {boolean} 判定是否成功。
 */
export function performCheck(attribute, value, playerAttributes, stage, attribute2 = null, value2 = null, multiplier = 1, playerStamina) {
    // 基础成功率由玩家属性决定
    let successChance = playerAttributes[attribute] / 100;
    // 难度惩罚，降低判定值对成功率的负面影响
    const difficultyPenalty = value / 100 * 0.4;
    // 体力加成：体力值越高，加成越高 (0 - 10%)
    const staminaBonus = (playerStamina / 100) * 0.1;

    // 计算最终基础成功率
    let finalChance = successChance - difficultyPenalty + staminaBonus;

    // 应用力竭或阶段乘数
    finalChance *= multiplier;

    // 如果有第二个属性判定，取两者中较低的成功率
    if (attribute2 && value2) {
        const successChance2 = playerAttributes[attribute2] / 100;
        const difficultyPenalty2 = value2 / 100 * 0.4;
        const finalChance2 = successChance2 - difficultyPenalty2 + staminaBonus;
        finalChance = Math.min(finalChance, finalChance2);
    }
    
    // 限制成功率在合理的范围内 (5% 到 95%)
    finalChance = Math.max(0.05, Math.min(0.95, finalChance));

    // 返回随机判定结果
    return Math.random() < finalChance;
}


/**
 * 计算战斗中玩家对怪物造成的伤害。
 * @param {number} playerStrength 玩家力量。
 * @param {number} monsterStrength 怪物力量（当前未使用）。
 * @param {number} playerStamina 玩家体力。
 * @param {number} stage 当前游戏阶段。
 * @returns {number} 造成的伤害值。
 */
export function calculateCombatDamage(playerStrength, monsterStrength, playerStamina, stage) {
    // 基础伤害由玩家力量决定
    const baseDamage = playerStrength / 5;
    // 随机伤害波动现在随力量值增长，让高力量更具爆发力
    const randomDamage = Math.floor(Math.random() * (playerStrength / 5 + 1));
    // 阶段加成
    const stageMultiplier = 1 + (stage * 0.1);
    // 体力加成
    const staminaMultiplier = playerStamina > 50 ? 1.2 : 1;

    // 伤害最终值
    let finalDamage = (baseDamage + randomDamage) * stageMultiplier * staminaMultiplier;
    
    // 伤害不低于1
    return Math.max(1, finalDamage);
}