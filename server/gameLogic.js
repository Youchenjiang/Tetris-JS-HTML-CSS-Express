/**
 * 遊戲邏輯模組
 * 負責所有遊戲核心邏輯：方塊移動、旋轉、碰撞檢測、消行等
 */

const config = require('./config');
const gameState = require('./gameState');

/**
 * 初始化地面方塊
 * @param {number} level - 玩家等級
 * @returns {Array} 初始地面方塊陣列
 */
function getInitialGroundBlocks(level) {
    const tmp = [];
    for (let line = 0; line < 2; line++) {
        let rand_1 = Math.floor(Date.now() * Math.random()) % config.BOARD_SIZE_WIDTH;
        let rand_2 = Math.floor(Date.now() * Math.random()) % config.BOARD_SIZE_WIDTH;
        if (rand_1 === rand_2) {
            rand_2 = Math.floor(Date.now() * Math.random()) % config.BOARD_SIZE_WIDTH;
        }
        for (let i = 0; i < config.BOARD_SIZE_WIDTH; i++) {
            if (i !== rand_1 && i !== rand_2) {
                tmp.push({
                    x: i,
                    y: config.BOARD_SIZE_HEIGHT - line,
                });
            }
        }
    }
    return tmp;
}

/**
 * 檢查遊戲是否結束
 * @param {Array} groundBlock - 地面方塊陣列
 * @returns {string} 遊戲狀態 (GAME 或 LOSE)
 */
function isGameOver(groundBlock) {
    let state = config.GAME;
    if (groundBlock) {
        for (let block of groundBlock) {
            if (block.y === 1) {
                state = config.LOSE;
                break;
            }
        }
    }
    return state;
}

/**
 * 檢查碰撞
 * @param {Array} blockBody - 當前方塊
 * @param {Array} groundBlock - 地面方塊
 * @returns {boolean} 是否發生碰撞
 */
function checkCollision(blockBody, groundBlock) {
    for (let block of blockBody) {
        // 檢查邊界（完整的四邊檢查）
        if (block.x < 1 || block.x > config.BOARD_SIZE_WIDTH ||
            block.y < 1 || block.y > config.BOARD_SIZE_HEIGHT) {
            return true;
        }
        // 檢查與地面方塊的碰撞
        for (let ground of groundBlock) {
            if (block.x === ground.x && block.y === ground.y) {
                return true;
            }
        }
    }
    return false;
}

/**
 * 方塊下移
 * @param {Object} player - 玩家對象
 * @returns {Object} 更新後的玩家對象
 */
function moveBlockDown(player) {
    const tmpBlockBody = player.itemBlockBody.map(block => ({
        x: block.x,
        y: block.y + 1
    }));

    // 檢查是否碰撞
    if (checkCollision(tmpBlockBody, player.itemGroundBlock)) {
        // 碰撞了,需要固定方塊並生成新方塊
        const newDomino = gameState.getRandomDomino();
        return {
            ...player,
            itemGroundBlock: [...player.itemGroundBlock, ...player.itemBlockBody],
            itemBlockBody: player.itemPreBody,
            itemBlockType: player.itemPreType,
            itemPreBody: newDomino.blocks,
            itemPreType: newDomino.type,
            actionTime: config.ACTION_INIT_TIME,
        };
    }

    // 沒碰撞,繼續下移
    return {
        ...player,
        itemBlockBody: tmpBlockBody,
        actionTime: config.ACTION_INIT_TIME,
    };
}

/**
 * 方塊左移
 * @param {Object} player - 玩家對象
 * @returns {Object} 更新後的玩家對象
 */
function moveBlockLeft(player) {
    const tmpBlockBody = player.itemBlockBody.map(block => ({
        x: block.x - 1,
        y: block.y
    }));

    if (!checkCollision(tmpBlockBody, player.itemGroundBlock)) {
        return {
            ...player,
            itemBlockBody: tmpBlockBody
        };
    }
    return player;
}

/**
 * 方塊右移
 * @param {Object} player - 玩家對象
 * @returns {Object} 更新後的玩家對象
 */
function moveBlockRight(player) {
    const tmpBlockBody = player.itemBlockBody.map(block => ({
        x: block.x + 1,
        y: block.y
    }));

    if (!checkCollision(tmpBlockBody, player.itemGroundBlock)) {
        return {
            ...player,
            itemBlockBody: tmpBlockBody
        };
    }
    return player;
}

/**
 * 方塊旋轉
 * @param {Object} player - 玩家對象
 * @returns {Object} 更新後的玩家對象
 */
function rotateBlock(player) {
    if (!player.itemBlockBody || player.itemBlockBody.length === 0) {
        return player;
    }

    // 計算旋轉中心點（第一個方塊）
    const center = player.itemBlockBody[0];

    // 旋轉其他方塊
    const rotatedBlock = player.itemBlockBody.map(block => {
        const relativeX = block.x - center.x;
        const relativeY = block.y - center.y;
        return {
            x: center.x - relativeY,
            y: center.y + relativeX
        };
    });

    // 檢查旋轉後是否碰撞
    if (!checkCollision(rotatedBlock, player.itemGroundBlock)) {
        return {
            ...player,
            itemBlockBody: rotatedBlock
        };
    }
    return player;
}

/**
 * 消除完整的行並返回消除的行數
 * @param {Object} player - 玩家對象
 * @returns {Object} 包含更新後的 itemGroundBlock 和消除的行數
 */
function clearLines(player) {
    const tmpNumber = new Array(config.BOARD_SIZE_HEIGHT + 1).fill(0);
    const clearedLines = [];

    // 計算每一行有多少個方塊
    if (player.itemGroundBlock) {
        for (let block of player.itemGroundBlock) {
            tmpNumber[block.y]++;
        }
    }

    // 找出完整的行
    for (let i = 0; i < tmpNumber.length; i++) {
        if (tmpNumber[i] === config.BOARD_SIZE_WIDTH) {
            clearedLines.push(i);
        }
    }

    if (clearedLines.length === 0) {
        return { itemGroundBlock: player.itemGroundBlock, linesCleared: 0 };
    }

    console.log(`🎯 檢測到消行！玩家: ${player.userName}, 消除行數: ${clearedLines.length}, 行號: ${clearedLines.join(', ')}`);

    // 移除完整的行
    let newBoard = player.itemGroundBlock.filter(block => !clearedLines.includes(block.y));

    // 下移上方的方塊
    for (let line of clearedLines) {
        newBoard = newBoard.map(block =>
            block.y < line ? { x: block.x, y: block.y + 1 } : block
        );
    }

    return {
        itemGroundBlock: newBoard,
        linesCleared: clearedLines.length,
        clearedLineNumbers: clearedLines  // 返回被消除的行號
    };
}

/**
 * 方塊快速下落
 * @param {Object} player - 玩家對象
 * @returns {Object} 更新後的玩家對象
 */
function dropBlock(player) {
    let currentPlayer = player;

    // 持續下移直到碰撞
    while (true) {
        const tmpBlockBody = currentPlayer.itemBlockBody.map(block => ({
            x: block.x,
            y: block.y + 1
        }));

        if (checkCollision(tmpBlockBody, currentPlayer.itemGroundBlock)) {
            // 固定方塊並生成新方塊
            const newDomino = gameState.getRandomDomino();
            return {
                ...currentPlayer,
                itemGroundBlock: [...currentPlayer.itemGroundBlock, ...currentPlayer.itemBlockBody],
                itemBlockBody: currentPlayer.itemPreBody,
                itemBlockType: currentPlayer.itemPreType,
                itemPreBody: newDomino.blocks,
                itemPreType: newDomino.type,
                actionTime: config.ACTION_INIT_TIME,
            };
        }

        currentPlayer = {
            ...currentPlayer,
            itemBlockBody: tmpBlockBody
        };
    }
}

/**
 * 插入方塊到地面
 * @param {Array} ground - 地面方塊陣列
 * @param {Array} block - 要插入的方塊
 * @returns {Array} 更新後的地面方塊陣列
 */
function insertBlockToGround(ground, block) {
    return [...ground, ...block];
}

/**
 * 生成垃圾行
 * @param {number} lineCount - 垃圾行數量
 * @param {number} startY - 開始的 Y 座標（底部）
 * @returns {Array} 垃圾方塊陣列
 */
function generateGarbageLines(lineCount, startY = config.BOARD_SIZE_HEIGHT) {
    const garbageBlocks = [];

    for (let line = 0; line < lineCount; line++) {
        // 隨機選擇缺口位置（1-2個缺口）
        const holePositions = [];
        for (let i = 0; i < config.GARBAGE_HOLE_COUNT; i++) {
            let hole = Math.floor(Math.random() * config.BOARD_SIZE_WIDTH) + 1;
            while (holePositions.includes(hole)) {
                hole = Math.floor(Math.random() * config.BOARD_SIZE_WIDTH) + 1;
            }
            holePositions.push(hole);
        }

        // 創建垃圾行（除了缺口位置）
        for (let x = 1; x <= config.BOARD_SIZE_WIDTH; x++) {
            if (!holePositions.includes(x)) {
                garbageBlocks.push({
                    x: x,
                    y: startY - line
                });
            }
        }
    }

    return garbageBlocks;
}

/**
 * 添加垃圾行到玩家棋盤（從底部推上來）
 * @param {Array} groundBlock - 玩家的地面方塊
 * @param {number} garbageLineCount - 要添加的垃圾行數
 * @returns {Array} 更新後的地面方塊
 */
function addGarbageLines(groundBlock, garbageLineCount) {
    if (garbageLineCount <= 0) {
        return groundBlock;
    }

    // 將現有方塊向上移動
    const movedBlocks = groundBlock.map(block => ({
        x: block.x,
        y: block.y - garbageLineCount
    }));

    // 生成垃圾行（在底部）
    const garbageBlocks = generateGarbageLines(garbageLineCount);

    return [...movedBlocks, ...garbageBlocks];
}

/**
 * 計算攻擊力
 * @param {number} linesCleared - 消除的行數
 * @param {number} level - 玩家等級
 * @param {number} combo - 當前 Combo 數
 * @returns {number} 攻擊行數
 */
function calculateAttackPower(linesCleared, level, combo) {
    // 基礎攻擊 = 消行數 - 1
    let baseAttack = Math.max(0, linesCleared - 1);

    // 等級加成 = 每 3 級增加 1 行
    const levelBonus = Math.floor(level / 3);

    // Combo 加成 = Combo 越高，攻擊越強
    let comboBonus = 0;
    if (combo >= 2) comboBonus = 1;
    if (combo >= 4) comboBonus = 2;
    if (combo >= 6) comboBonus = 3;
    if (combo >= 8) comboBonus = 4;

    const totalAttack = baseAttack + levelBonus + comboBonus;

    console.log(`💥 攻擊力計算: 基礎=${baseAttack}, 等級加成=${levelBonus}, Combo加成=${comboBonus} → 總計=${totalAttack}行`);

    return totalAttack;
}

/**
 * 更新 Combo
 * @param {Object} player - 玩家對象
 * @param {number} linesCleared - 消除的行數
 * @returns {number} 新的 Combo 數
 */
function updateCombo(player, linesCleared) {
    const now = Date.now();
    const lastClearTime = player.lastClearTime;

    // 檢查是否超時（3秒內沒消行）
    if (lastClearTime && (now - lastClearTime) > config.COMBO_TIMEOUT) {
        // Combo 重置
        return 1;
    }

    // 增加 Combo
    return (player.combo || 0) + 1;
}

/**
 * 檢測幸運事件
 * @returns {Object} { type: 事件類型, multiplier: 經驗倍數, name: 事件名稱 }
 */
function checkLuckyEvent() {
    const rand = Math.random();

    // 1% 機率：鑽石寶箱
    if (rand < config.LUCKY_EVENT_DIAMOND) {
        return { type: 'diamond', multiplier: 3.0, name: '💎 鑽石寶箱', color: '#00FFFF' };
    }

    // 5% 機率：幸運星
    if (rand < config.LUCKY_EVENT_STAR) {
        return { type: 'star', multiplier: 2.0, name: '⭐ 幸運星', color: '#FFD700' };
    }

    // 10% 機率：小驚喜
    if (rand < config.LUCKY_EVENT_GIFT) {
        return { type: 'gift', multiplier: 1.5, name: '🎁 小驚喜', color: '#FF69B4' };
    }

    // 無幸運事件
    return null;
}

/**
 * 計算獲得的經驗值（帶隨機性）
 * @param {number} linesCleared - 消除的行數
 * @param {number} combo - Combo 數
 * @returns {Object} { exp: 經驗值, luckyEvent: 幸運事件 }
 */
function calculateExp(linesCleared, combo) {
    // 基礎經驗（根據消行數）
    const baseExpMap = {
        1: 100,
        2: 200,
        3: 300,
        4: 400
    };
    const baseExp = baseExpMap[linesCleared] || linesCleared * 100;

    // 隨機係數（50-150% 浮動）
    const randomFactor = 0.5 + Math.random(); // 0.5 ~ 1.5
    let randomExp = Math.floor(baseExp * randomFactor);

    // Combo 加成
    let comboMultiplier = 1.0;
    if (combo >= 2) comboMultiplier = 1.5;
    if (combo >= 4) comboMultiplier = 2.0;

    let finalExp = Math.floor(randomExp * comboMultiplier);

    // 檢測幸運事件
    const luckyEvent = checkLuckyEvent();

    if (luckyEvent) {
        finalExp = Math.floor(finalExp * luckyEvent.multiplier);
        console.log(`🎉 幸運事件觸發！${luckyEvent.name} 經驗 × ${luckyEvent.multiplier}！`);
    }

    console.log(`📊 經驗計算: 基礎=${baseExp}, 隨機係數=${randomFactor.toFixed(2)}, Combo倍數=${comboMultiplier}, 最終=${finalExp}`);

    return { exp: finalExp, luckyEvent };
}

/**
 * 檢查並處理升級
 * @param {number} currentLevel - 當前等級
 * @param {number} currentExp - 當前經驗值
 * @returns {Object} { newLevel: 新等級, expToNextLevel: 升級所需經驗, leveledUp: 是否升級 }
 */
function checkLevelUp(currentLevel, currentExp) {
    let newLevel = currentLevel;
    let leveledUp = false;

    // 檢查是否可以升級
    while (newLevel < config.EXP_LEVEL_THRESHOLDS.length &&
        currentExp >= config.EXP_LEVEL_THRESHOLDS[newLevel]) {
        newLevel++;
        leveledUp = true;
    }

    // 計算升級所需經驗
    const expToNextLevel = newLevel < config.EXP_LEVEL_THRESHOLDS.length
        ? config.EXP_LEVEL_THRESHOLDS[newLevel]
        : 999999; // 已達最高等級

    return { newLevel, expToNextLevel, leveledUp };
}

/**
 * 主遊戲循環處理單個玩家
 * @param {Object} player - 玩家對象
 * @returns {Object} 更新後的玩家對象
 */
function processPlayerTick(player) {
    // 如果玩家已經失敗或被淘汰,不處理
    if (player.state === config.LOSE || player.state === config.ELIMINATED) {
        return player;
    }

    // 減少動作時間
    if (player.actionTime > 0) {
        return {
            ...player,
            actionTime: player.actionTime - 1
        };
    }

    // 時間到了 (actionTime === 0),方塊自動下移
    const movedPlayer = moveBlockDown(player);

    // 檢查是否需要消行
    const { itemGroundBlock, linesCleared, clearedLineNumbers } = clearLines(movedPlayer);

    // 如果沒有消行,直接返回
    if (linesCleared === 0) {
        return movedPlayer;
    }

    // 更新 Combo
    const newCombo = updateCombo(player, linesCleared);
    const now = Date.now();

    // 計算獲得的經驗值（帶隨機性和幸運事件）
    const { exp: gainedExp, luckyEvent } = calculateExp(linesCleared, newCombo);

    // 更新總經驗
    const newTotalExp = (movedPlayer.exp || 0) + gainedExp;

    // 檢查升級
    const { newLevel, expToNextLevel, leveledUp } = checkLevelUp(movedPlayer.level, newTotalExp);

    // 更新分數
    const baseScore = linesCleared * 100;
    const comboBonus = newCombo > 1 ? (newCombo - 1) * 50 : 0; // Combo 獎勵分數
    const newScore = (movedPlayer.score || 0) + baseScore + comboBonus;

    // 計算對其他玩家的攻擊力
    const attackPower = calculateAttackPower(linesCleared, newLevel, newCombo);

    if (leveledUp) {
        console.log(`🎊 玩家 ${player.userName} 升級了！Level ${movedPlayer.level} → ${newLevel}`);
    }

    console.log(`🎯 玩家 ${player.userName} 消除了 ${linesCleared} 行！Combo: ${newCombo}, 經驗: +${gainedExp} (總: ${newTotalExp}/${expToNextLevel}), 分數: ${newScore}, 等級: ${newLevel}, 攻擊力: ${attackPower}`);

    return {
        ...movedPlayer,
        itemGroundBlock,
        level: newLevel,
        score: newScore,
        exp: newTotalExp,
        expToNextLevel,
        combo: newCombo,
        lastClearTime: now,
        clearedLineNumbers,  // 保存消除的行號，用於動畫
        attackPower,         // 保存攻擊力，用於攻擊其他玩家
        linesCleared,        // 保存消行數，用於顯示
        gainedExp,           // 保存獲得的經驗，用於顯示
        luckyEvent,          // 保存幸運事件，用於顯示
        leveledUp            // 保存是否升級，用於特效
    };
}

module.exports = {
    getInitialGroundBlocks,
    isGameOver,
    checkCollision,
    moveBlockDown,
    moveBlockLeft,
    moveBlockRight,
    rotateBlock,
    clearLines,
    dropBlock,
    insertBlockToGround,
    generateGarbageLines,
    addGarbageLines,
    calculateAttackPower,
    updateCombo,
    calculateExp,
    checkLevelUp,
    checkLuckyEvent,
    processPlayerTick,
};
