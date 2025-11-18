// 战斗数据 Store - 管理战斗状态

import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { Character } from '../types/character';
import type { CombatAction, CombatParticipant, CombatState, CombatStatus, Enemy, StatusEffect } from '../types/combat';

/**
 * 战斗数据 Store
 */
export const useCombatStore = defineStore('combat', () => {
  // ==================== 状态 ====================
  const currentCombat = ref<CombatState | undefined>(undefined);
  const isInCombat = ref(false);
  const combatHistory = ref<CombatState[]>([]);

  // ==================== 计算属性 ====================
  const combatId = computed(() => currentCombat.value?.id);

  const currentRound = computed(() => currentCombat.value?.currentRound || 0);

  const currentTurn = computed(() => currentCombat.value?.currentTurn || 0);

  const status = computed(() => currentCombat.value?.status || 'active');

  const participants = computed(() => currentCombat.value?.participants || []);

  const playerParticipants = computed(() => participants.value.filter(p => p.isPlayer));

  const enemyParticipants = computed(() => participants.value.filter(p => !p.isPlayer));

  const currentParticipant = computed(() => {
    if (!currentCombat.value) return undefined;
    return participants.value[currentCombat.value.currentTurn];
  });

  const isPlayerTurn = computed(() => currentParticipant.value?.isPlayer || false);

  const rounds = computed(() => currentCombat.value?.rounds || []);

  const latestRound = computed(() => {
    if (rounds.value.length === 0) return undefined;
    return rounds.value[rounds.value.length - 1];
  });

  const isActive = computed(() => status.value === 'active');

  const isVictory = computed(() => status.value === 'victory');

  const isDefeat = computed(() => status.value === 'defeat');

  const isEscaped = computed(() => status.value === 'escaped');

  // ==================== 方法 ====================

  /**
   * 开始战斗
   */
  function startCombat(player: Character, enemies: Enemy[], environment?: string): void {
    try {
      // 创建战斗参与者
      const participants: CombatParticipant[] = [];

      // 添加玩家
      participants.push({
        id: player.id,
        character: player,
        isPlayer: true,
        currentHP: player.derivedStats.HP,
        currentMP: player.derivedStats.MP,
        currentSAN: player.derivedStats.SAN,
        statusEffects: [],
        initiative: calculateInitiative(player.attributes.DEX),
      });

      // 添加敌人
      enemies.forEach(enemy => {
        participants.push({
          id: enemy.id,
          enemy,
          isPlayer: false,
          currentHP: enemy.derivedStats.HP,
          currentMP: enemy.derivedStats.MP,
          currentSAN: enemy.derivedStats.SAN,
          statusEffects: [],
          initiative: calculateInitiative(enemy.attributes.DEX),
        });
      });

      // 按先攻值排序
      participants.sort((a, b) => b.initiative - a.initiative);

      // 创建战斗状态
      currentCombat.value = {
        id: `combat_${Date.now()}`,
        participants,
        currentRound: 1,
        currentTurn: 0,
        status: 'active',
        rounds: [],
        startTime: Date.now(),
        environment,
      };

      isInCombat.value = true;

      console.log('[Combat Store] 战斗开始:', currentCombat.value.id);
      toastr.warning('战斗开始！');
    } catch (error) {
      console.error('[Combat Store] 开始战斗失败:', error);
      toastr.error('开始战斗失败');
      throw error;
    }
  }

  /**
   * 计算先攻值
   */
  function calculateInitiative(dex: number): number {
    // 基础先攻 = 敏捷 + 1d10
    return dex + Math.floor(Math.random() * 10) + 1;
  }

  /**
   * 执行战斗行动
   */
  function executeAction(action: CombatAction): void {
    if (!currentCombat.value) {
      throw new Error('当前没有进行中的战斗');
    }

    try {
      // 获取当前回合
      let currentRoundData = rounds.value.find(r => r.roundNumber === currentRound.value);

      if (!currentRoundData) {
        // 创建新回合
        currentRoundData = {
          roundNumber: currentRound.value,
          actions: [],
          timestamp: Date.now(),
        };
        currentCombat.value.rounds.push(currentRoundData);
      }

      // 添加行动
      currentRoundData.actions.push(action);

      console.log('[Combat Store] 执行行动:', action.type);

      // 处理行动效果
      processActionEffects(action);

      // 下一个回合
      nextTurn();
    } catch (error) {
      console.error('[Combat Store] 执行行动失败:', error);
      toastr.error('执行行动失败');
      throw error;
    }
  }

  /**
   * 处理行动效果
   */
  function processActionEffects(action: CombatAction): void {
    if (!currentCombat.value) return;

    // 处理伤害
    if (action.damage && action.targetId) {
      const target = participants.value.find(p => p.id === action.targetId);
      if (target) {
        target.currentHP = Math.max(0, target.currentHP - action.damage);
        console.log(`[Combat Store] ${action.targetId} 受到 ${action.damage} 点伤害`);

        // 检查是否死亡
        if (target.currentHP === 0) {
          console.log(`[Combat Store] ${action.targetId} 已被击败`);
        }
      }
    }

    // 检查战斗是否结束
    checkCombatEnd();
  }

  /**
   * 检查战斗是否结束
   */
  function checkCombatEnd(): void {
    if (!currentCombat.value) return;

    const playersAlive = playerParticipants.value.some(p => p.currentHP > 0);
    const enemiesAlive = enemyParticipants.value.some(p => p.currentHP > 0);

    if (!playersAlive) {
      endCombat('defeat');
    } else if (!enemiesAlive) {
      endCombat('victory');
    }
  }

  /**
   * 下一个回合
   */
  function nextTurn(): void {
    if (!currentCombat.value) return;

    currentCombat.value.currentTurn++;

    // 如果所有参与者都行动过，进入下一轮
    if (currentCombat.value.currentTurn >= participants.value.length) {
      nextRound();
    }
  }

  /**
   * 下一轮
   */
  function nextRound(): void {
    if (!currentCombat.value) return;

    currentCombat.value.currentRound++;
    currentCombat.value.currentTurn = 0;

    // 处理状态效果
    processStatusEffects();

    console.log(`[Combat Store] 进入第 ${currentCombat.value.currentRound} 回合`);
    toastr.info(`第 ${currentCombat.value.currentRound} 回合`);
  }

  /**
   * 处理状态效果
   */
  function processStatusEffects(): void {
    if (!currentCombat.value) return;

    participants.value.forEach(participant => {
      // 处理每回合伤害
      participant.statusEffects.forEach(effect => {
        if (effect.effect.damagePerRound) {
          participant.currentHP = Math.max(0, participant.currentHP - effect.effect.damagePerRound);
          console.log(`[Combat Store] ${participant.id} 受到 ${effect.name} 的 ${effect.effect.damagePerRound} 点伤害`);
        }

        // 减少持续时间
        if (effect.duration > 0) {
          effect.duration--;
        }
      });

      // 移除过期的状态效果
      participant.statusEffects = participant.statusEffects.filter(effect => effect.duration !== 0);
    });

    // 检查战斗是否结束
    checkCombatEnd();
  }

  /**
   * 添加状态效果
   */
  function addStatusEffect(participantId: string, effect: StatusEffect): void {
    const participant = participants.value.find(p => p.id === participantId);
    if (!participant) {
      throw new Error(`参与者 ${participantId} 不存在`);
    }

    participant.statusEffects.push(effect);
    console.log(`[Combat Store] ${participantId} 获得状态效果: ${effect.name}`);

    const effectType = effect.type === 'buff' ? '增益' : '减益';
    toastr.info(`${effectType}：${effect.name}`);
  }

  /**
   * 移除状态效果
   */
  function removeStatusEffect(participantId: string, effectId: string): void {
    const participant = participants.value.find(p => p.id === participantId);
    if (!participant) {
      throw new Error(`参与者 ${participantId} 不存在`);
    }

    const effect = participant.statusEffects.find(e => e.id === effectId);
    if (effect) {
      participant.statusEffects = participant.statusEffects.filter(e => e.id !== effectId);
      console.log(`[Combat Store] ${participantId} 失去状态效果: ${effect.name}`);
    }
  }

  /**
   * 尝试逃跑
   */
  function attemptEscape(): boolean {
    if (!currentCombat.value) {
      throw new Error('当前没有进行中的战斗');
    }

    // 简单的逃跑判定：50% 成功率
    const success = Math.random() < 0.5;

    if (success) {
      endCombat('escaped');
      toastr.success('成功逃脱！');
    } else {
      toastr.warning('逃跑失败！');
    }

    return success;
  }

  /**
   * 结束战斗
   */
  function endCombat(finalStatus: CombatStatus): void {
    if (!currentCombat.value) return;

    try {
      currentCombat.value.status = finalStatus;
      isInCombat.value = false;

      // 添加到历史记录
      combatHistory.value.push(currentCombat.value);

      console.log('[Combat Store] 战斗结束:', finalStatus);

      // 显示结果
      switch (finalStatus) {
        case 'victory':
          toastr.success('战斗胜利！');
          break;
        case 'defeat':
          toastr.error('战斗失败...');
          break;
        case 'escaped':
          toastr.info('成功逃脱');
          break;
      }
    } catch (error) {
      console.error('[Combat Store] 结束战斗失败:', error);
      throw error;
    }
  }

  /**
   * 获取参与者
   */
  function getParticipant(participantId: string): CombatParticipant | undefined {
    return participants.value.find(p => p.id === participantId);
  }

  /**
   * 更新参与者状态
   */
  function updateParticipant(participantId: string, updates: Partial<CombatParticipant>): void {
    const participant = participants.value.find(p => p.id === participantId);
    if (!participant) {
      throw new Error(`参与者 ${participantId} 不存在`);
    }

    Object.assign(participant, updates);
    console.log(`[Combat Store] 参与者 ${participantId} 状态已更新`);
  }

  /**
   * 获取战斗统计
   */
  function getCombatStats() {
    if (!currentCombat.value) return null;

    return {
      roundCount: currentRound.value,
      actionCount: rounds.value.reduce((sum, round) => sum + round.actions.length, 0),
      duration: Date.now() - currentCombat.value.startTime,
      playerHP: playerParticipants.value.map(p => ({
        id: p.id,
        current: p.currentHP,
        max: p.character?.derivedStats.maxHP || 0,
      })),
      enemyHP: enemyParticipants.value.map(p => ({
        id: p.id,
        current: p.currentHP,
        max: p.enemy?.derivedStats.maxHP || 0,
      })),
    };
  }

  /**
   * 重置战斗状态
   */
  function reset(): void {
    currentCombat.value = undefined;
    isInCombat.value = false;
    console.log('[Combat Store] 战斗状态已重置');
  }

  /**
   * 清除历史记录
   */
  function clearHistory(): void {
    combatHistory.value = [];
    console.log('[Combat Store] 战斗历史已清除');
  }

  // ==================== 返回 ====================
  return {
    // 状态
    currentCombat,
    isInCombat,
    combatHistory,

    // 计算属性
    combatId,
    currentRound,
    currentTurn,
    status,
    participants,
    playerParticipants,
    enemyParticipants,
    currentParticipant,
    isPlayerTurn,
    rounds,
    latestRound,
    isActive,
    isVictory,
    isDefeat,
    isEscaped,

    // 方法
    startCombat,
    executeAction,
    nextTurn,
    nextRound,
    addStatusEffect,
    removeStatusEffect,
    attemptEscape,
    endCombat,
    getParticipant,
    updateParticipant,
    getCombatStats,
    reset,
    clearHistory,
  };
});
