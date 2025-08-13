// src/App.js

import { saveGameData, loadGameData } from './utils/storage.js';
import { performCheck, calculateCombatDamage } from './utils/math.js';
import { renderCharacterSheet } from './components/CharacterSheet.js';
import { renderEvent, clearChoices } from './components/EventDisplay.js';

// 游戏核心数据
let game = {
    player: {},
    stage: 1,
    gameOver: false,
    job: null,
    inventory: [],
    mainQuestProgress: {},
    stamina: 100,
    maxStamina: 100,
    lastActionTime: Date.now(),
    uniqueEventsTriggered: [],
    month: 1,
    statusEffects: {} // 新增：用于追踪玩家的负面效果，如流血、眩晕
};

// 游戏数据
let gameData = {
    events: null,
    monsters: null,
    items: null
};

// UI 元素引用
const startScreen = document.getElementById('start-screen');
const attributeScreen = document.getElementById('attribute-screen');
const gameScreen = document.getElementById('game-screen');
const endingScreen = document.getElementById('ending-screen');

const pointsLeftSpan = document.getElementById('points-left');
const attributeList = document.getElementById('attribute-list');
const confirmAttributesBtn = document.getElementById('confirm-attributes-btn');
const newGameBtn = document.getElementById('new-game-btn');
const loadGameBtn = document.getElementById('load-game-btn');
const saveGameBtn = document.getElementById('save-game-btn');
const returnToMenuBtn = document.getElementById('return-to-menu-btn');

const eventTextP = gameScreen.querySelector('.event-text');
const choicesArea = document.getElementById('choices-area');
const inventoryList = document.getElementById('inventory-list');
const monthDisplay = document.getElementById('month-display');
const itemTooltip = document.getElementById('item-tooltip'); // 新增：物品提示框元素

const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
const sidebar = gameScreen.querySelector('.sidebar');
const chapterTitleElement = document.getElementById('chapter-title');

/**
 * 创建一个全新的玩家角色数据。
 * @returns {object} 新玩家对象
 */
function createNewPlayer() {
    return {
        attributes: {
            耐力: 0,
            精神: 0,
            体态: 0,
            运气: 0,
            异化: 0,
            学习: 0,
            体力: 0,
            力量: 0,
            感知: 0,
            情感: 0,
        },
        pointsLeft: 50,
        level: 1,
        exp: 0,
        nextLevelExp: 25, // 初始升级经验
        maxHP: 50, // 初始生命值
        currentHP: 50,
        age: 1,
        dynamicMaxStamina: 100,
        stamina: 100,
        equippedWeapon: null // 新增：玩家装备的武器
    };
}

/**
 * 切换屏幕显示。
 * @param {string} screenId 要激活的屏幕ID。
 */
function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

/**
 * 异步加载所有游戏数据文件。
 */
async function loadGameDataFiles() {
    try {
        const [eventsRes, monstersRes, itemsRes] = await Promise.all([
            fetch('src/data/events.json'),
            fetch('src/data/monsters.json'),
            fetch('src/data/items.json')
        ]);

        gameData.events = await eventsRes.json();
        gameData.monsters = await monstersRes.json();
        gameData.items = await itemsRes.json();

        console.log('所有游戏数据已加载。');
    } catch (e) {
        console.error('加载游戏数据文件失败，请确保文件路径正确:', e);
        eventTextP.textContent = "游戏数据加载失败，请检查文件是否完整。";
    }
}

/**
 * 初始化游戏，检查是否有存档并更新主菜单按钮状态。
 */
async function initGame() {
    await loadGameDataFiles();
    const savedData = loadGameData();
    loadGameBtn.disabled = !savedData;
    switchScreen('start-screen');
}

/**
 * 渲染属性分配界面，用于玩家初始化角色属性。
 */
function renderAttributeScreen() {
    game.player = createNewPlayer();
    pointsLeftSpan.textContent = game.player.pointsLeft;
    attributeList.innerHTML = '';
    const attributes = Object.keys(game.player.attributes);
    attributes.forEach(attr => {
        const item = document.createElement('div');
        item.className = 'attribute-item';
        item.innerHTML = `
            <h4>${attr}</h4>
            <div class="attribute-controls">
                <button class="minus-10-btn" data-attr="${attr}" disabled>-10</button>
                <button class="minus-btn" data-attr="${attr}" disabled>-</button>
                <span class="value" id="attr-value-${attr}">${game.player.attributes[attr]}</span>
                <button class="plus-btn" data-attr="${attr}" ${game.player.pointsLeft === 0 ? 'disabled' : ''}>+</button>
                <button class="plus-10-btn" data-attr="${attr}" ${game.player.pointsLeft < 10 ? 'disabled' : ''}>+10</button>
            </div>
        `;
        attributeList.appendChild(item);
    });
    updateAttributeControls();
}

/**
 * 更新属性分配界面按钮状态和剩余点数显示。
 */
function updateAttributeControls() {
    pointsLeftSpan.textContent = game.player.pointsLeft;
    confirmAttributesBtn.disabled = game.player.pointsLeft !== 0;

    document.querySelectorAll('.plus-btn').forEach(btn => {
        const attr = btn.dataset.attr;
        btn.disabled = game.player.pointsLeft === 0 || game.player.attributes[attr] >= 100;
    });

    document.querySelectorAll('.minus-btn').forEach(btn => {
        const attr = btn.dataset.attr;
        btn.disabled = game.player.attributes[attr] === 0;
    });

    document.querySelectorAll('.plus-10-btn').forEach(btn => {
        const attr = btn.dataset.attr;
        btn.disabled = game.player.pointsLeft < 10 || game.player.attributes[attr] > 90;
    });

    document.querySelectorAll('.minus-10-btn').forEach(btn => {
        const attr = btn.dataset.attr;
        btn.disabled = game.player.attributes[attr] < 10;
    });
}

// 属性分配按钮事件监听
attributeList.addEventListener('click', (e) => {
    const attr = e.target.dataset.attr;
    if (!attr) return;

    const currentValue = game.player.attributes[attr];
    const pointsLeft = game.player.pointsLeft;
    let change = 0;

    if (e.target.classList.contains('plus-btn')) {
        change = 1;
        if (pointsLeft < change || currentValue + change > 100) return;
    } else if (e.target.classList.contains('minus-btn')) {
        change = -1;
        if (currentValue + change < 0) return;
    } else if (e.target.classList.contains('plus-10-btn')) {
        change = 10;
        if (pointsLeft < change || currentValue + change > 100) return;
    } else if (e.target.classList.contains('minus-10-btn')) {
        change = -10;
        if (currentValue + change < 0) return;
    }

    if (change !== 0) {
        game.player.attributes[attr] += change;
        game.player.pointsLeft -= change;
        document.getElementById(`attr-value-${attr}`).textContent = game.player.attributes[attr];
        updateAttributeControls();
    }
});

/**
 * 开始游戏，初始化UI并进入第一个事件。
 */
function startGame() {
    game.maxStamina = 100 + Math.floor((game.player.attributes.体力 + game.player.attributes.耐力) / 5);
    game.stamina = game.maxStamina;
    game.lastActionTime = Date.now();
    updateUI();
    setChapterTitle(game.stage);
    nextEvent();
}

/**
 * 根据阶段设置章节标题。
 * @param {number} stage 阶段ID。
 */
function setChapterTitle(stage) {
    let title = '';
    switch (stage) {
        case 1:
            title = "序章：被遗忘的血脉 (1-15岁)";
            break;
        case 2:
            title = "第一幕：觉醒与初探 (15-23岁)";
            break;
        case 3:
            title = "第二幕：寻觅与迷失 (23-30岁)";
            break;
        case 4:
            title = "第二幕：寻觅与迷失 (30-38岁)";
            break;
        case 5:
            title = "第三幕：镜中之王 (38岁之后)";
            break;
        case 6:
            title = "终章：自我之镜 (最终决战)";
            break;
        default:
            title = "未知章节";
            break;
    }
    if (chapterTitleElement) {
        chapterTitleElement.textContent = title;
    }
}

/**
 * 更新游戏主界面所有信息 (角色信息、背包、月份)。
 */
function updateUI() {
    renderCharacterSheet(game.player, game.job, game.stage, game.stamina, game.maxStamina);
    // 重新渲染背包列表并添加事件监听器
    inventoryList.innerHTML = game.inventory.map(item => `<li data-item="${item}">${item}</li>`).join('');
    setupInventoryTooltips();
    if (monthDisplay) {
        monthDisplay.textContent = `年龄: ${game.player.age} 岁, 月份: ${game.month}`;
    }
}

/**
 * 设置背包物品的鼠标悬停提示功能。
 */
function setupInventoryTooltips() {
    document.querySelectorAll('#inventory-list li').forEach(itemElement => {
        const itemName = itemElement.dataset.item;
        const itemData = gameData.items[itemName];

        if (itemData) {
            itemElement.addEventListener('click', (e) => {
                e.stopPropagation(); // 阻止事件冒泡到document
                showItemTooltip(itemData, e.clientX, e.clientY);
            });
        }
    });

    // 点击其他地方隐藏提示框
    document.addEventListener('click', hideItemTooltip);
}

/**
 * 显示物品提示框。
 * @param {object} itemData 物品数据。
 * @param {number} x 鼠标X坐标。
 * @param {number} y 鼠标Y坐标。
 */
function showItemTooltip(itemData, x, y) {
    itemTooltip.innerHTML = `
        <h3>${itemData.name}</h3>
        <p>类型: ${itemData.type}</p>
        <p>${itemData.description}</p>
        ${itemData.skillEffect ? `<p>技能效果: ${itemData.skillEffect.description}</p>` : ''}
    `;
    itemTooltip.style.display = 'block';
    itemTooltip.style.left = `${x + 15}px`;
    itemTooltip.style.top = `${y + 15}px`;
}

/**
 * 隐藏物品提示框。
 */
function hideItemTooltip() {
    itemTooltip.style.display = 'none';
}


/**
 * 恢复体力。
 */
function restoreStamina() {
    const now = Date.now();
    const elapsedTime = now - game.lastActionTime;
    let staminaToRestore = Math.floor(elapsedTime / 10000);

    game.stamina = Math.min(game.maxStamina, game.stamina + staminaToRestore);
    game.lastActionTime = now;
}

/**
 * 渲染“继续前进”按钮。
 */
function renderContinueButton() {
    clearChoices(choicesArea);
    const button = document.createElement('button');
    button.textContent = "继续前进";
    button.addEventListener('click', nextEvent);
    choicesArea.appendChild(button);
}

/**
 * 检查年龄并触发章节过渡。
 */
function checkAgeTransition() {
    if (game.player.age >= 15 && game.stage === 1) {
        game.stage = 2;
        eventTextP.textContent += "\n【章节过渡】你已步入青年，第一幕：觉醒与初探，开始了！";
        setChapterTitle(game.stage);
        return true;
    } else if (game.player.age >= 23 && game.stage === 2) {
        game.stage = 3;
        eventTextP.textContent += "\n【章节过渡】你步入了成熟期，第二幕：寻觅与迷失，开始了！";
        setChapterTitle(game.stage);
        return true;
    } else if (game.player.age >= 30 && game.stage === 3) {
        game.stage = 4;
        eventTextP.textContent += "\n【章节过渡】你深入迷失，第二幕：寻觅与迷失，进入新的阶段！";
        setChapterTitle(game.stage);
        return true;
    } else if (game.player.age >= 38 && game.stage === 4) {
        game.stage = 5;
        eventTextP.textContent += "\n【章节过渡】你已步入最终阶段，第三幕：镜中之王，开始了！";
        setChapterTitle(game.stage);
        return true;
    }
    return false;
}

/**
 * 获取下一个事件。
 */
function nextEvent() {
    restoreStamina();
    updateUI();

    if (game.gameOver) {
        return;
    }

    if (checkAgeTransition()) {
        renderContinueButton();
        return;
    }

    clearChoices(choicesArea);

    let currentEvent = null;

    // --- 月份特殊事件判定逻辑 (5% 概率) ---
    if (Math.random() < 0.05) {
        const monthEvent = gameData.events.monthEvents[game.month];
        if (monthEvent) {
            currentEvent = monthEvent[Math.floor(Math.random() * monthEvent.length)];
        }
    }
    
    // --- 主线事件判定逻辑 ---
    if (!currentEvent) {
        if (game.stage === 2) {
            if (!game.mainQuestProgress.metOldMan) {
                currentEvent = gameData.events.eventPools["2"].find(e => e.id === "main-2-1");
                game.mainQuestProgress.metOldMan = true;
            } else if (game.mainQuestProgress.metOldMan && !game.mainQuestProgress.foundStoneTablet) {
                currentEvent = gameData.events.eventPools["2"].find(e => e.id === "main-2-2");
                game.mainQuestProgress.foundStoneTablet = true;
            }
        } else if (game.stage === 3 && !game.mainQuestProgress.enteredCapital) {
            currentEvent = gameData.events.eventPools["3"].find(e => e.id === "main-3-1");
            game.mainQuestProgress.enteredCapital = true;
        } else if (game.stage === 4) {
            if (!game.mainQuestProgress.metMirror) {
                currentEvent = gameData.events.eventPools["4"].find(e => e.id === "main-4-1");
                game.mainQuestProgress.metMirror = true;
            } else if (!game.mainQuestProgress.foundCave && Math.random() < 0.2) {
                currentEvent = gameData.events.eventPools["4"].find(e => e.id === "easter-egg-cave");
                game.mainQuestProgress.foundCave = true;
            }
        } else if (game.stage === 5 && !game.mainQuestProgress.metAncestor) {
            currentEvent = gameData.events.eventPools["5"].find(e => e.id === "final-boss");
            game.mainQuestProgress.metAncestor = true;
        } else if (game.stage === 6 && !game.mainQuestProgress.metSelf) {
            currentEvent = gameData.events.eventPools["6"].find(e => e.id === "true-final-boss");
            game.mainQuestProgress.metSelf = true;
        }
    }
    

    if (currentEvent) {
        if (currentEvent.unique && game.uniqueEventsTriggered.includes(currentEvent.id)) {
            currentEvent = null;
        } else {
            game.uniqueEventsTriggered.push(currentEvent.id);
            renderEventBasedOnCheck(currentEvent);
            return;
        }
    }

    // --- 如果没有主线或特殊事件，则从随机池中选择 ---
    const currentPool = gameData.events.eventPools[game.stage] || gameData.events.eventPools["1"];
    const randomEvent = currentPool[Math.floor(Math.random() * currentPool.length)];
    renderEventBasedOnCheck(randomEvent);
}

/**
 * 根据事件的check属性渲染事件文本和选项。
 * @param {object} event 要渲染的事件对象。
 */
function renderEventBasedOnCheck(event) {
    if (event.check) {
        const checkPassed = performCheck(event.check.attribute, event.check.value, game.player.attributes, game.stage, event.check.attribute2, event.check.value2, 1, game.stamina);
        if (checkPassed) {
            renderEvent(eventTextP, choicesArea, event.text, event.choices, handleChoice);
        } else {
            renderEvent(eventTextP, choicesArea, event.failText, [{ text: "继续前进", type: "event", eventId: "next" }], handleChoice);
        }
    } else {
        renderEvent(eventTextP, choicesArea, event.text, event.choices, handleChoice);
    }
}

/**
 * 处理玩家选择。
 * @param {object} choice 玩家选择的选项对象。
 */
function handleChoice(choice) {
    clearChoices(choicesArea);

    if (choice.staminaCost) {
        if (game.stamina < choice.staminaCost) {
            eventTextP.textContent = "你的体力不足，无法执行此操作。";
            renderContinueButton();
            return;
        }
        game.stamina -= choice.staminaCost;
    }

    switch (choice.type) {
        case 'attribute':
            eventTextP.textContent = choice.successText;
            game.player.attributes[choice.attribute] = Math.min(100, Math.max(0, game.player.attributes[choice.attribute] + choice.change));
            game.month++;
            break;
        case 'check':
            const checkPassed = performCheck(choice.check.attribute, choice.check.value, game.player.attributes, game.stage, choice.check.attribute2, choice.check.value2, 1, game.stamina);
            if (checkPassed) {
                if (choice.success.effect) {
                    applyEffect(choice.success.effect);
                }
                eventTextP.textContent = choice.success.text;
                if (choice.success.type === 'combat' && choice.success.monsters) {
                    setTimeout(() => startCombat(choice.success.monsters), 2000);
                    return;
                } else if (choice.success.type === 'combat') {
                    setTimeout(() => startCombat([choice.success.monster]), 2000);
                    return;
                }
            } else {
                if (choice.fail.effect) {
                    applyEffect(choice.fail.effect);
                }
                eventTextP.textContent = choice.fail.text;
                if (choice.fail.type === 'combat' && choice.fail.monsters) {
                    setTimeout(() => startCombat(choice.fail.monsters), 2000);
                    return;
                } else if (choice.fail.type === 'combat') {
                    setTimeout(() => startCombat([choice.fail.monster]), 2000);
                    return;
                }
                if (choice.fail.isDead && game.player.currentHP <= 0) {
                    endGame(game.stage <= 2 ? 5 : 6);
                    return;
                }
            }
            game.month++;
            break;
        case 'event':
            if (choice.eventId === 'next') {
            } else if (choice.eventId === 'ending') {
                endGame(choice.endingId);
                return;
            } else if (choice.eventId === 'touch-mirror') {
                handleMirrorEvent();
                return;
            } else if (choice.eventId === 'enter-cave-reset') {
                handleCaveReset();
                return;
            } else if (choice.eventId === 'trigger_final_boss') {
                 eventTextP.textContent = "你感受到了强烈的异化能量波动，最终Boss (先祖) 出现了！";
                setTimeout(() => startBossCombat(gameData.monsters["镜中之王-先祖"]), 2000);
                return;
            }
            game.month++;
            break;
        case 'combat':
            if (choice.monsters) {
                setTimeout(() => startCombat(choice.monsters), 2000);
            } else {
                setTimeout(() => startCombat([choice.monster]), 2000);
            }
            return;
        case 'item':
            handleItem(choice);
            return;
        case 'escape':
            handleEscape(choice);
            return;
        case 'dialogue':
            if (choice.effect) {
                applyEffect(choice.effect);
            }
            eventTextP.textContent = choice.dialogueText;
            game.month++;
            break;
        case 'boss_combat':
            startBossCombat(gameData.monsters[choice.monster]);
            return;
    }

    // Check for month transition
    if (game.month > 12) {
        game.month = 1;
        game.player.age++;
    }

    updateUI();
    // 所有非战斗事件都由点击“继续前进”触发
    renderContinueButton();
}

/**
 * 处理山洞彩蛋事件，重置游戏状态并提升异化属性。
 */
function handleCaveReset() {
    eventTextP.textContent = "你坠入了幻境，所有经历清零，你被强制回到了零岁...但你感到体内的异化血脉比以往更加强大！";
    setTimeout(() => {
        const tempBloodlineBoost = game.player.attributes.异化;
        game = {
            player: createNewPlayer(),
            stage: 5,
            gameOver: false,
            job: null,
            inventory: [],
            mainQuestProgress: { metAncestor: false, metSelf: false },
            stamina: 100,
            maxStamina: 100,
            lastActionTime: Date.now(),
            uniqueEventsTriggered: [],
            month: 1
        };
        game.player.attributes.异化 = Math.min(100, tempBloodlineBoost + 20);
        game.player.maxHP = 50 + game.player.attributes.耐力 * 2;
        game.player.currentHP = game.player.maxHP;
        switchScreen('game-screen');
        startGame();
    }, 5000);
}

/**
 * 处理镜子事件，根据情况进入终章。
 */
function handleMirrorEvent() {
    eventTextP.textContent = "你触摸了镜子，它发出刺眼的光芒，镜中映照出了一个与你一模一样的身影，但他的眼神却充满了扭曲的异化之力。他，正是镜中之王！你不得不与他进行一场决战！";
    game.mainQuestProgress.metMirror = true;
    game.stage = 6;
    setChapterTitle(game.stage);
    setTimeout(() => {
        nextEvent();
    }, 3000);
}

/**
 * 处理物品获取逻辑。
 * @param {object} choice 物品选择对象。
 */
function handleItem(choice) {
    const itemData = gameData.items[choice.item];
    if (!itemData) {
        eventTextP.textContent = `物品 "${choice.item}" 不存在。`;
        renderContinueButton();
        return;
    }

    // 检查背包是否已满
    if (game.inventory.length >= 5) {
        eventTextP.textContent = `你的背包已满，无法拾取 ${choice.item}。请选择一个物品来丢弃，或放弃新物品。`;
        renderDiscardChoices(choice.item);
        return;
    }

    const attributeCheckPassed = itemData.attributeRequirement ?
        performCheck(itemData.attributeRequirement.attribute, itemData.attributeRequirement.value, game.player.attributes, game.stage, null, null, 1, game.stamina) : true;

    if (attributeCheckPassed) {
        const isWeapon = itemData.type === 'weapon';
        if (isWeapon) {
            // 替换现有武器
            if (game.player.equippedWeapon) {
                const oldWeapon = game.player.equippedWeapon;
                removeAttributeEffect(oldWeapon);
                game.inventory = game.inventory.filter(item => item !== oldWeapon);
                eventTextP.textContent += `你丢弃了旧武器 "${oldWeapon}"。`;
            }
            game.player.equippedWeapon = choice.item;
        }

        game.inventory.push(choice.item);
        eventTextP.textContent += `你获得了 ${choice.item}！ ${itemData.description || ''}`;
        
        if (itemData.unlocksJob) {
            game.job = itemData.unlocksJob;
            eventTextP.textContent += `你感受到了与${game.job}职业的共鸣！`;
        }
        if (itemData.attributeEffect) {
            applyAttributeEffect(itemData.attributeEffect);
        }
    } else {
        eventTextP.textContent = `你的${itemData.attributeRequirement.attribute}属性不足，无法正确拾取${choice.item}。`;
    }

    game.month++;
    updateUI();
    renderContinueButton();
}

/**
 * 渲染背包已满时的丢弃选项。
 * @param {string} newItemName 新物品名称。
 */
function renderDiscardChoices(newItemName) {
    clearChoices(choicesArea);
    const discardChoices = game.inventory.map(item => ({
        text: `丢弃 ${item}`,
        type: 'discard_item',
        discardItem: item,
        newItem: newItemName
    }));
    discardChoices.push({
        text: '放弃新物品',
        type: 'abandon_item',
        newItem: newItemName
    });

    discardChoices.forEach(choice => {
        const button = document.createElement('button');
        button.textContent = choice.text;
        button.addEventListener('click', () => handleDiscardChoice(choice));
        choicesArea.appendChild(button);
    });
}

/**
 * 处理背包已满时的玩家选择。
 * @param {object} choice 玩家选择的丢弃/放弃选项。
 */
function handleDiscardChoice(choice) {
    clearChoices(choicesArea);
    if (choice.type === 'discard_item') {
        const discardedItem = choice.discardItem;
        const newItem = choice.newItem;
        
        // 移除旧物品的属性效果
        removeAttributeEffect(discardedItem);

        // 移除旧物品
        const index = game.inventory.indexOf(discardedItem);
        if (index > -1) {
            game.inventory.splice(index, 1);
        }

        // 拾取新物品
        const newItemData = gameData.items[newItem];
        if (newItemData && newItemData.type === 'weapon' && game.player.equippedWeapon === discardedItem) {
            game.player.equippedWeapon = newItem;
        }

        game.inventory.push(newItem);
        applyAttributeEffect(gameData.items[newItem].attributeEffect);
        
        eventTextP.textContent = `你丢弃了 "${discardedItem}" 并拾取了 "${newItem}"。`;
    } else {
        eventTextP.textContent = `你放弃了拾取新物品 "${choice.newItem}"。`;
    }

    updateUI();
    renderContinueButton();
}

/**
 * 应用物品的属性效果。
 * @param {object} effect 效果对象。
 */
function applyAttributeEffect(effect) {
    if (effect && effect.attribute) {
        game.player.attributes[effect.attribute] += effect.change;
        if (effect.attribute2) {
            game.player.attributes[effect.attribute2] += effect.change2;
        }
        eventTextP.textContent += `你的${effect.attribute}属性提升了${effect.change}点。`;
    }
}

/**
 * 移除物品的属性效果。
 * @param {string} itemName 物品名称。
 */
function removeAttributeEffect(itemName) {
    const itemData = gameData.items[itemName];
    if (itemData && itemData.attributeEffect) {
        game.player.attributes[itemData.attributeEffect.attribute] -= itemData.attributeEffect.change;
        if (itemData.attributeEffect.attribute2) {
            game.player.attributes[itemData.attributeEffect.attribute2] -= itemData.attributeEffect.change2;
        }
        eventTextP.textContent += `\n丢弃${itemName}，你的${itemData.attributeEffect.attribute}属性降低了${itemData.attributeEffect.change}点。`;
    }
}

/**
 * 处理逃跑尝试。
 * @param {object} choice 逃跑选项对象。
 */
function handleEscape(choice) {
    const checkPassed = performCheck(choice.check.attribute, choice.check.value, game.player.attributes, game.stage, null, null, 1, game.stamina);
    if (checkPassed) {
        eventTextP.textContent = choice.success.text;
        renderContinueButton();
    } else {
        eventTextP.textContent = choice.fail.text;
        setTimeout(() => startCombat([choice.monster || '异化狼人']), 2000);
    }
}


/**
 * 启动普通战斗，支持单只或多只怪物。
 * @param {string[]} monsterIds 怪物ID数组。
 */
function startCombat(monsterIds) {
    const monstersInCombat = monsterIds.map(id => ({ ...gameData.monsters[id] }));
    const monsterNames = monstersInCombat.map(m => m.name).join(' 和 ');
    eventTextP.textContent = `你遭遇了 ${monsterNames}！进入战斗阶段...`;

    const monsterAttackTimers = [];
    const combatStartTime = Date.now();
    let bleedTimer = null;
    let weaknessTimer = null;
    let stunTimer = null;

    const clearTimers = () => {
        monsterAttackTimers.forEach(timer => clearInterval(timer));
        if (bleedTimer) {
            clearInterval(bleedTimer);
            game.statusEffects.bleed = false;
        }
        if (weaknessTimer) {
            clearInterval(weaknessTimer);
            game.statusEffects.weakness = false;
        }
        if (stunTimer) {
            clearInterval(stunTimer);
            game.statusEffects.stun = false;
        }
    };

    const handleCombatEnd = (message) => {
        clearTimers();
        eventTextP.textContent += `\n${message}`;
        if (!game.gameOver) {
            renderContinueButton();
        }
    };

    const renderCombatInfo = () => {
        let combatInfo = "";
        monstersInCombat.forEach(m => {
            if (m.hp > 0) {
                combatInfo += `\n【${m.name}】HP: ${m.hp.toFixed(0)} / ${gameData.monsters[m.name].hp} | 攻击欲望: ${m.attackDesire}`;
            }
        });
        if (game.statusEffects.bleed) {
            combatInfo += "\n【状态】你正在流血！";
        }
        if (game.statusEffects.weakness) {
            combatInfo += "\n【状态】你被虚弱了！攻击力降低。";
        }
        if (game.statusEffects.stun) {
            combatInfo += "\n【状态】你被震慑，无法行动！";
        }
        eventTextP.textContent = `你遭遇了 ${monsterNames}！\n` + combatInfo;
    };

    const renderCombatChoices = () => {
        clearChoices(choicesArea);
        if (game.statusEffects.stun) {
            const button = document.createElement('button');
            button.textContent = "眩晕中，无法行动...";
            button.disabled = true;
            choicesArea.appendChild(button);
            return;
        }
        
        const choices = [{
            text: "普通攻击",
            type: "combat_attack"
        }];

        const playerWeapon = game.player.equippedWeapon;
        if (playerWeapon && game.stamina >= gameData.items[playerWeapon].staminaCost) {
            choices.push({
                text: `武器反击 (${gameData.items[playerWeapon].staminaCost}体力)`,
                type: "combat_counter",
                item: playerWeapon,
                staminaCost: gameData.items[playerWeapon].staminaCost
            });
        }
        choices.push({
            text: "逃跑",
            type: "combat_escape"
        });

        choices.forEach(choice => {
            const button = document.createElement('button');
            button.textContent = choice.text;
            button.addEventListener('click', () => handlePlayerAction(choice));
            choicesArea.appendChild(button);
        });
    };

    const handlePlayerAction = (choice) => {
        let playerDamage = 0;
        let successRateMultiplier = 1;
        let damageMultiplier = 1;
        
        const targetMonster = monstersInCombat.filter(m => m.hp > 0).sort((a, b) => a.hp - b.hp)[0];
        if (!targetMonster) return;

        const elapsedTime = (Date.now() - combatStartTime) / 1000;
        const exhaustionStart = targetMonster.attackCycleDuration - targetMonster.exhaustionDuration;
        const isInExhaustion = (elapsedTime % targetMonster.attackCycleDuration >= exhaustionStart);

        if (isInExhaustion) {
            eventTextP.textContent += `\n【${targetMonster.name} 力竭！】玩家攻击成功率翻倍，伤害增加1.5倍！`;
            successRateMultiplier = 2;
            damageMultiplier = 1.5;
        }

        switch (choice.type) {
            case 'combat_attack':
                const checkPassed = performCheck('力量', targetMonster.strength, game.player.attributes, game.stage, null, null, successRateMultiplier, game.stamina);
                if (checkPassed) {
                    playerDamage = calculateCombatDamage(game.player.attributes.力量, targetMonster.strength, game.player.attributes.体力, game.stage) * damageMultiplier;
                    if (game.statusEffects.weakness) {
                        playerDamage = playerDamage * 0.5; // 虚弱效果
                    }
                    targetMonster.hp -= playerDamage;
                    eventTextP.textContent += `\n你对 ${targetMonster.name} 造成了 ${playerDamage.toFixed(0)} 点伤害。`;
                } else {
                    eventTextP.textContent += `\n你的攻击落空了。`;
                }
                break;
            case 'combat_counter':
                const weapon = gameData.items[choice.item];
                if (weapon && game.stamina >= weapon.staminaCost) {
                    game.stamina -= weapon.staminaCost;
                    playerDamage = game.player.attributes.力量 + Math.floor(Math.random() * 11) - 5;
                    if (game.statusEffects.weakness) {
                         playerDamage = playerDamage * 0.5;
                    }
                    targetMonster.hp -= playerDamage;
                    eventTextP.textContent += `\n你用 ${choice.item} 对 ${targetMonster.name} 进行了反击，造成了 ${playerDamage.toFixed(0)} 点伤害！`;

                    // 玩家武器技能触发
                    if (weapon.skillEffect && Math.random() < weapon.skillEffect.chance) {
                        eventTextP.textContent += `\n【武器技能】${weapon.skillEffect.description}`;
                        if (weapon.skillEffect.effect === 'bleed') {
                            // 对怪物施加流血效果
                            targetMonster.statusEffects = targetMonster.statusEffects || {};
                            if (!targetMonster.statusEffects.bleed) {
                                targetMonster.statusEffects.bleed = true;
                                const bleedDamage = 1;
                                let bleedTurns = 3;
                                const bleedInterval = setInterval(() => {
                                    if (targetMonster.hp <= 0 || bleedTurns <= 0) {
                                        clearInterval(bleedInterval);
                                        return;
                                    }
                                    targetMonster.hp -= bleedDamage;
                                    eventTextP.textContent += `\n【流血】${targetMonster.name} 流失了 ${bleedDamage} 点生命。`;
                                    updateUI();
                                    bleedTurns--;
                                }, 1000);
                            }
                        } else if (weapon.skillEffect.effect === 'stun') {
                            // 对怪物施加眩晕效果
                            targetMonster.statusEffects = targetMonster.statusEffects || {};
                            if (!targetMonster.statusEffects.stun) {
                                targetMonster.statusEffects.stun = true;
                                setTimeout(() => {
                                    targetMonster.statusEffects.stun = false;
                                    eventTextP.textContent += `\n${targetMonster.name} 从眩晕中恢复了！`;
                                    updateUI();
                                }, 3000);
                            }
                        }
                    }
                } else {
                    eventTextP.textContent += `\n你的体力不足以使用反击！`;
                }
                break;
            case 'combat_escape':
                const escapeSuccess = performCheck('体态', 30, game.player.attributes, game.stage, null, null, 1, game.stamina);
                if (escapeSuccess) {
                    handleCombatEnd("你成功逃脱了战斗！");
                    return;
                } else {
                    eventTextP.textContent += "\n逃跑失败！你被怪物拦住了去路。";
                }
                break;
        }

        updateUI();
        if (monstersInCombat.every(m => m.hp <= 0)) {
            let totalExp = 0;
            monstersInCombat.forEach(m => {
                totalExp += gameData.monsters[m.name].exp;
                const monsterData = gameData.monsters[m.name];
                
                // 击败有技能的怪物后，有小概率获得带技能的武器
                if (monsterData.skills && monsterData.skills.length > 0 && Math.random() < 0.1) {
                    const skill = monsterData.skills[0]; // 简化处理，只取第一个技能
                    const newWeaponName = `${skill.name}武器`;
                    // 动态创建新武器物品数据
                    const newWeapon = {
                        "name": newWeaponName,
                        "type": "weapon",
                        "description": `一把从${monsterData.name}身上获得的，附带${skill.name}效果的武器。`,
                        "staminaCost": 12,
                        "skillEffect": skill
                    };
                    gameData.items[newWeaponName] = newWeapon;
                    
                    eventTextP.textContent += `\n你从 ${monsterData.name} 身上获得了一件独特的战利品：${newWeaponName}！`;
                    handleItem({type: "item", item: newWeaponName});
                } else if (monsterData.lootChance && Math.random() < monsterData.lootChance) {
                    handleItem({type: "item", item: monsterData.loot});
                }
            });
            handleCombatEnd(`你击败了所有怪物！总共获得了 ${totalExp} 点经验。`);
            gainExp(totalExp);
        } else {
            renderCombatInfo();
            renderCombatChoices();
        }
    };
    
    // 怪物攻击逻辑
    monstersInCombat.forEach(monster => {
        const attackIntervalMap = {
            '极强': 1300, // 800 + 500
            '强': 1500, // 1000 + 500
            '中': 1700, // 1200 + 500
            '弱': 2200, // 1700 + 500
        };
        const monsterAttackInterval = attackIntervalMap[monster.attackDesire] || 1700; // 1200 + 500

        const monsterAttack = () => {
            if (monster.hp <= 0 || game.gameOver) return;
            // 怪物被眩晕时跳过攻击
            if (monster.statusEffects && monster.statusEffects.stun) {
                return;
            }

            const elapsedTime = (Date.now() - combatStartTime) / 1000;
            const exhaustionStart = monster.attackCycleDuration - monster.exhaustionDuration;
            const isInExhaustion = (elapsedTime % monster.attackCycleDuration >= exhaustionStart);
            
            if (!isInExhaustion) {
                const monsterDamage = Math.max(1, monster.strength / 10);
                game.player.currentHP -= monsterDamage;
                eventTextP.textContent += `\n${monster.name} 对你造成了 ${monsterDamage.toFixed(0)} 点伤害。`;
                updateUI();

                // 检查怪物是否有特殊技能并触发
                if (monster.skills && monster.skills.length > 0) {
                    monster.skills.forEach(skill => {
                        if (Math.random() < skill.chance) {
                             eventTextP.textContent += `\n【${monster.name} 技能】${skill.description}`;
                             if (skill.effect === 'bleed' && !game.statusEffects.bleed) {
                                 game.statusEffects.bleed = true;
                                 bleedTimer = setInterval(() => {
                                     if (game.statusEffects.bleed) {
                                         game.player.currentHP -= 1; // 每秒流失1点血
                                         eventTextP.textContent += `\n【流血】你流失了 1 点生命。`;
                                         updateUI();
                                         if (game.player.currentHP <= 0) {
                                             handleCombatEnd(`你因失血过多而死亡...`);
                                             endGame(game.stage <= 2 ? 5 : 6);
                                         }
                                     }
                                 }, 1000);
                             } else if (skill.effect === 'weakness' && !game.statusEffects.weakness) {
                                 game.statusEffects.weakness = true;
                                 weaknessTimer = setTimeout(() => {
                                     game.statusEffects.weakness = false;
                                     eventTextP.textContent += `\n虚弱效果消失了。`;
                                     updateUI();
                                 }, 5000);
                             } else if (skill.effect === 'stun' && !game.statusEffects.stun) {
                                 game.statusEffects.stun = true;
                                 stunTimer = setTimeout(() => {
                                     game.statusEffects.stun = false;
                                     eventTextP.textContent += `\n你从眩晕中恢复了！`;
                                     updateUI();
                                 }, 3000);
                             }
                        }
                    });
                }
            }

            if (game.player.currentHP <= 0) {
                handleCombatEnd(`你被 ${monster.name} 击败了...`);
                endGame(game.stage <= 2 ? 5 : 6);
            }
        };

        const timer = setInterval(monsterAttack, monsterAttackInterval);
        monsterAttackTimers.push(timer);
    });

    renderCombatInfo();
    renderCombatChoices();
}


/**
 * 启动Boss战斗（已重构为时间制）。
 * @param {object} bossMonster Boss怪物对象。
 */
function startBossCombat(bossMonster) {
    const currentBoss = { ...bossMonster };
    eventTextP.textContent = `你遭遇了强大的 ${currentBoss.name}！进入Boss战斗阶段！`;
    
    const attackIntervalMap = {
        '极强': 1300, // 800 + 500
        '强': 1500, // 1000 + 500
        '中': 1700, // 1200 + 500
        '弱': 2200, // 1700 + 500
    };
    const bossAttackInterval = attackIntervalMap[currentBoss.attackDesire] || 1700; // 1200 + 500

    let combatStartTime = Date.now();
    let combatTimer;
    let bossAttackTimer;

    let bleedTimer = null;
    let weaknessTimer = null;
    let stunTimer = null;

    const clearTimers = () => {
        clearInterval(combatTimer);
        clearInterval(bossAttackTimer);
        if (bleedTimer) {
            clearInterval(bleedTimer);
            game.statusEffects.bleed = false;
        }
        if (weaknessTimer) {
            clearInterval(weaknessTimer);
            game.statusEffects.weakness = false;
        }
        if (stunTimer) {
            clearInterval(stunTimer);
            game.statusEffects.stun = false;
        }
    };

    const handleBossCombatEnd = (message, endingId) => {
        clearTimers();
        eventTextP.textContent += `\n${message}`;
        endGame(endingId);
    };

    const renderBossChoices = () => {
        clearChoices(choicesArea);
        if (game.statusEffects.stun) {
            const button = document.createElement('button');
            button.textContent = "眩晕中，无法行动...";
            button.disabled = true;
            choicesArea.appendChild(button);
            return;
        }

        const choices = [{
            text: "普通攻击",
            type: "boss_attack"
        }];

        const playerWeapon = game.player.equippedWeapon;
        if (playerWeapon && game.stamina >= gameData.items[playerWeapon].staminaCost) {
            choices.push({
                text: `武器反击 (${gameData.items[playerWeapon].staminaCost}体力)`,
                type: "boss_counter",
                item: playerWeapon,
                staminaCost: gameData.items[playerWeapon].staminaCost
            });
        }
        choices.push({
            text: "尝试逃跑",
            type: "boss_escape",
            check: {
                attribute: "体态",
                value: 40
            }
        });

        choices.forEach(choice => {
            const button = document.createElement('button');
            button.textContent = choice.text;
            button.addEventListener('click', () => handleBossAction(choice));
            choicesArea.appendChild(button);
        });
    };

    const handleBossAction = (choice) => {
        let playerDamage = 0;
        let successRateMultiplier = 1;
        let damageMultiplier = 1;
        const elapsedTime = (Date.now() - combatStartTime) / 1000;

        const exhaustionStart = currentBoss.attackCycleDuration - currentBoss.exhaustionDuration;
        const isInExhaustion = (elapsedTime % currentBoss.attackCycleDuration >= exhaustionStart);

        if (isInExhaustion) {
            eventTextP.textContent += `\n【${currentBoss.name} 力竭！】玩家攻击成功率翻倍，伤害增加1.5倍！`;
            successRateMultiplier = 2;
            damageMultiplier = 1.5;
        }

        switch (choice.type) {
            case 'boss_attack':
                const checkPassed = performCheck('力量', currentBoss.strength, game.player.attributes, game.stage, null, null, 1, game.stamina);
                if (checkPassed) {
                    playerDamage = calculateCombatDamage(game.player.attributes.力量, currentBoss.strength, game.player.attributes.体力, game.stage) * damageMultiplier;
                    if (game.statusEffects.weakness) {
                        playerDamage = playerDamage * 0.5;
                    }
                    currentBoss.hp -= playerDamage;
                    eventTextP.textContent += `\n你对 ${currentBoss.name} 造成了 ${playerDamage.toFixed(0)} 点伤害。`;
                } else {
                    eventTextP.textContent += `\n你的攻击落空了。`;
                }
                break;
            case 'boss_counter':
                const weapon = gameData.items[choice.item];
                if (weapon && game.stamina >= weapon.staminaCost) {
                    game.stamina -= weapon.staminaCost;
                    playerDamage = game.player.attributes.力量 + Math.floor(Math.random() * 11) - 5;
                    if (game.statusEffects.weakness) {
                         playerDamage = playerDamage * 0.5;
                    }
                    currentBoss.hp -= playerDamage;
                    eventTextP.textContent += `\n你用 ${choice.item} 对 ${currentBoss.name} 进行了反击，造成了 ${playerDamage.toFixed(0)} 点伤害！`;
                } else {
                    eventTextP.textContent += `\n你的体力不足以使用反击！`;
                }
                break;
            case 'boss_escape':
                const escapeSuccess = performCheck(choice.check.attribute, choice.check.value, game.player.attributes, game.stage, null, null, 1, game.stamina);
                if (escapeSuccess) {
                    handleBossCombatEnd("你成功从Boss战中逃脱了！", game.stage <= 2 ? 5 : 6);
                } else {
                    eventTextP.textContent += "\n你没能逃脱Boss的追击，继续战斗！";
                }
                break;
        }

        updateUI();
        if (currentBoss.hp <= 0) {
            let endingId;
            if (currentBoss.isFinalBoss) {
                endingId = currentBoss.name === "镜中之王 (自我)" ? 2 : 1;
            } else {
                endingId = 1;
            }
            handleBossCombatEnd(`你击败了 ${currentBoss.name}！`, endingId);
            gainExp(currentBoss.exp * 1.2);
            if (currentBoss.lootChance && Math.random() < currentBoss.lootChance * 1.2) {
                handleItem({type: "item", item: currentBoss.loot});
            }
        }
    };

    const bossAttack = () => {
        if (game.gameOver) return;
        const elapsedTime = (Date.now() - combatStartTime) / 1000;
        const exhaustionStart = currentBoss.attackCycleDuration - currentBoss.exhaustionDuration;
        const isInExhaustion = (elapsedTime % currentBoss.attackCycleDuration >= exhaustionStart);

        if (!isInExhaustion) {
            const bossDamage = Math.max(1, currentBoss.strength / 8);
            game.player.currentHP -= bossDamage;
            eventTextP.textContent += `\n${currentBoss.name} 对你造成了 ${bossDamage.toFixed(0)} 点伤害。`;
            updateUI();
        }

        if (game.player.currentHP <= 0) {
            handleBossCombatEnd(`你被 ${currentBoss.name} 击败了...`, currentBoss.isFinalBoss ? 3 : 6);
        }

        // Boss技能
        if (currentBoss.skills && currentBoss.skills.length > 0) {
            currentBoss.skills.forEach(skill => {
                 if (Math.random() < skill.chance) {
                     eventTextP.textContent += `\n【${currentBoss.name} 技能】${skill.description}`;
                     if (skill.effect === 'bleed' && !game.statusEffects.bleed) {
                         game.statusEffects.bleed = true;
                         bleedTimer = setInterval(() => {
                             if (game.statusEffects.bleed) {
                                 game.player.currentHP -= 1;
                                 eventTextP.textContent += `\n【流血】你流失了 1 点生命。`;
                                 updateUI();
                                 if (game.player.currentHP <= 0) {
                                     handleBossCombatEnd(`你因失血过多而死亡...`, 6);
                                 }
                             }
                         }, 1000);
                     } else if (skill.effect === 'stun' && !game.statusEffects.stun) {
                         game.statusEffects.stun = true;
                         stunTimer = setTimeout(() => {
                             game.statusEffects.stun = false;
                             eventTextP.textContent += `\n你从眩晕中恢复了！`;
                             updateUI();
                         }, 3000);
                     }
                 }
            });
        }
    };
    
    eventTextP.textContent += `\n怪物的攻击欲望为：${currentBoss.attackDesire}`;
    renderBossChoices();
    bossAttackTimer = setInterval(bossAttack, bossAttackInterval);
}

/**
 * 玩家获得经验值并处理升级。
 * @param {number} amount 获得的经验值数量。
 */
function gainExp(amount) {
    game.player.exp += amount;
    if (game.player.exp >= game.player.nextLevelExp) {
        levelUp();
    }
    updateUI();
}

/**
 * 玩家等级提升。
 */
function levelUp() {
    game.player.level++;
    game.player.exp = game.player.exp - game.player.nextLevelExp;
    game.player.nextLevelExp += 15; // 每升一级所需经验增加15
    game.player.maxHP += 10; // 每升一级生命值上限增加10
    game.player.currentHP = game.player.maxHP;
    game.stamina = game.maxStamina;

    game.maxStamina = 100 + Math.floor((game.player.attributes.体力 + game.player.attributes.耐力) / 5);


    if (game.job) {
        if (game.job === '弓手') {
            game.player.attributes.感知 = Math.min(100, game.player.attributes.感知 + 5);
            game.player.attributes.精神 = Math.min(100, game.player.attributes.精神 + 3);
            game.player.attributes.体态 = Math.min(100, game.player.attributes.体态 + 1);
        }
    } else {
        Object.keys(game.player.attributes).forEach(attr => {
            game.player.attributes[attr] = Math.min(100, game.player.attributes[attr] + 1);
        });
    }
    eventTextP.textContent += `\n你升级了！现在你是Lv.${game.player.level}！所有属性得到提升。`;
}

/**
 * 结束游戏并显示结局画面。
 * @param {number} endingId 结局ID。
 */
function endGame(endingId) {
    game.gameOver = true;
    let title, text;
    switch (endingId) {
        case 1:
            title = "结局一：新生之王";
            text = "你击败了被异化扭曲的先祖，王国在你的带领下迎来了新生。你成为了这片土地的守护者。";
            break;
        case 2:
            title = "结局二：自由之魂";
            text = "你击败了镜中由你潜能所创造的终极Boss——你自己，成功挣脱了“镜”的束缚，获得了真正的自由。你放弃了王权的荣耀，选择将自己的故事传扬下去，成为一个象征，一个不受任何力量束缚的传说。";
            break;
        case 3:
            title = "结局三：镜中之王";
            text = "你败给了镜中由你潜能所创造的终极Boss——你自己，你的意识被“镜”完全吞噬，成为了新的“镜中之王”。没有人知道这个“你”早已不是原来的你。";
            break;
        case 4:
            title = "结局四：异化共生者";
            text = "你与先祖的意识融合，成为了一个全新的、能够完美驾驭异化之力的存在。你将“镜”的力量用于净化，而非统治，王国成为一个异化与生命和谐共存的乌托邦。";
            break;
        case 5:
            title = "结局五：被遗忘的血脉";
            text = "你的冒险过早地结束了。你的血脉和秘密随你一同埋葬在历史的尘埃中。你的死亡没有引起任何波澜，只是千千万万个普通生命终结中的一个。";
            break;
        case 6:
            title = "结局六：悲剧的终结";
            text = "你在游戏的中后期，死于一场无法挽回的事件。你的死亡虽然悲壮，但却未能完成使命。王国最终依然被异化力量所吞噬。你的名字最终被人遗忘，成为一个悲惨的英雄传说。";
            break;
        case 7:
            title = "结局七：永恒的循环";
            text = "你无数次地经历着相同的旅程，不断地回到零岁，不断地成长，却始终无法摆脱这个循环。你最终意识到，这才是“镜”的真正诅咒——一个永无止境的，为了寻找完美容器而进行的循环。你带着这份痛苦的觉醒，开始了新一轮的旅程，但这次，你知道你永远也无法真正逃离。";
            break;
        default:
            title = "游戏结束";
            text = "你达成了某个未知的结局。";
            break;
    }
    document.getElementById('ending-title').textContent = title;
    document.getElementById('ending-text').textContent = text;
    switchScreen('ending-screen');
}

/**
 * 渲染选项按钮并绑定事件。
 * @param {HTMLElement} choicesAreaElement 选项按钮的父元素。
 * @param {Array} choices 选项数组。
 * @param {Function} clickHandler 选项点击事件处理函数。
 */
function renderChoices(choicesAreaElement, choices, clickHandler) {
    clearChoices(choicesAreaElement);
    choices.forEach(choice => {
        const button = document.createElement('button');
        button.textContent = choice.text;
        button.addEventListener('click', () => clickHandler(choice));
        choicesAreaElement.appendChild(button);
    });
}

/**
 * 处理对话事件 (简化版)。
 * @param {object} choice 对话选项。
 */
function handleDialogue(choice) {
    eventTextP.textContent = choice.dialogueText;
    if (choice.effect) {
        applyEffect(choice.effect);
    }
    game.month++;
    renderContinueButton();
}

/**
 * 应用事件效果（属性改变、文本更新、HP变化等）。
 * @param {object} effect 效果对象。
 */
function applyEffect(effect) {
    if (effect.text) {
        eventTextP.textContent = effect.text;
    }
    if (effect.attribute && typeof effect.change !== 'undefined') {
        game.player.attributes[effect.attribute] = Math.min(100, Math.max(0, game.player.attributes[effect.attribute] + effect.change));
    }
    if (effect.attribute2 && typeof effect.change2 !== 'undefined') {
        game.player.attributes[effect.attribute2] = Math.min(100, Math.max(0, game.player.attributes[effect.attribute2] + effect.change2));
    }
    if (effect.hpChange) {
        game.player.currentHP = Math.min(game.player.maxHP, game.player.currentHP + effect.hpChange);
        if (game.player.currentHP <= 0) {
            endGame(game.stage <= 2 ? 5 : 6);
        }
    }
    updateUI();
}

// 事件监听器
newGameBtn.addEventListener('click', () => {
    switchScreen('attribute-screen');
    renderAttributeScreen();
});

loadGameBtn.addEventListener('click', () => {
    const savedGame = loadGameData();
    if (savedGame) {
        game = savedGame;
        game.gameOver = false;
        switchScreen('game-screen');
        startGame();
        eventTextP.textContent = "游戏已载入，继续你的冒险...";
        renderContinueButton(); // 载入后显示继续按钮
    } else {
        alert("没有找到存档。");
        loadGameBtn.disabled = true;
    }
});

confirmAttributesBtn.addEventListener('click', () => {
    if (game.player.pointsLeft === 0) {
        switchScreen('game-screen');
        startGame();
    } else {
        alert("请分配完所有属性点。");
    }
});

saveGameBtn.addEventListener('click', () => {
    saveGameData(game);
    alert('游戏已保存！');
    loadGameBtn.disabled = false;
});

returnToMenuBtn.addEventListener('click', () => {
    initGame();
});

toggleSidebarBtn.addEventListener('click', () => {
    sidebar.classList.toggle('visible');
    if (sidebar.classList.contains('visible')) {
        toggleSidebarBtn.textContent = '返回';
    } else {
        toggleSidebarBtn.textContent = '角色';
    }
});

initGame();