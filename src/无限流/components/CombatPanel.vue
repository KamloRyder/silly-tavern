<template>
  <div class="combat-panel" :class="{ 'combat-ended': !combatStore.isActive }">
    <div class="combat-header">
      <h2>战斗 - 第 {{ combatStore.currentRound }} 回合</h2>
      <div class="combat-status">
        <span v-if="combatStore.isActive">进行中</span>
        <span v-else-if="combatStore.isVictory" class="victory">胜利</span>
        <span v-else-if="combatStore.isDefeat" class="defeat">失败</span>
        <span v-else-if="combatStore.isEscaped" class="escaped">已逃脱</span>
      </div>
    </div>

    <div class="enemies-area">
      <h3>敌人</h3>
      <div class="participants-list">
        <div
          v-for="enemy in combatStore.enemyParticipants"
          :key="enemy.id"
          class="participant enemy"
          :class="{ dead: enemy.currentHP <= 0, active: isCurrentParticipant(enemy) }"
        >
          <div class="participant-name">{{ enemy.enemy?.name || enemy.id }}</div>
          <div class="participant-stats">
            <div class="stat-bar hp-bar">
              <label>HP</label>
              <div class="bar-container">
                <div class="bar-fill hp" :style="{ width: getHPPercentage(enemy) + '%' }"></div>
                <span class="bar-text">{{ enemy.currentHP }} / {{ enemy.enemy?.derivedStats.maxHP }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="players-area">
      <h3>玩家</h3>
      <div class="participants-list">
        <div
          v-for="player in combatStore.playerParticipants"
          :key="player.id"
          class="participant player"
          :class="{ dead: player.currentHP <= 0, active: isCurrentParticipant(player) }"
        >
          <div class="participant-name">{{ player.character?.name || player.id }}</div>
        </div>
      </div>
    </div>

    <div v-if="combatStore.isActive" class="combat-actions">
      <button class="btn-attack" :disabled="isProcessing || !combatStore.isPlayerTurn" @click="performAttack">
        {{ isProcessing ? '处理中...' : '攻击' }}
      </button>

      <button class="btn-escape" :disabled="isProcessing" @click="emit('close')">逃跑</button>
    </div>

    <div v-else class="combat-end-actions">
      <button class="btn-close" @click="emit('close')">关闭战斗面板</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { coc7Service } from '../services/coc7Service';
import { mvuService } from '../services/mvuService';
import { useCombatStore } from '../stores/combatStore';
import type { CombatParticipant } from '../types/combat';

const combatStore = useCombatStore();
const isProcessing = ref(false);

function getHPPercentage(participant: CombatParticipant): number {
  const maxHP = participant.character?.derivedStats.maxHP || participant.enemy?.derivedStats.maxHP || 1;
  return Math.max(0, Math.min(100, (participant.currentHP / maxHP) * 100));
}

function isCurrentParticipant(participant: CombatParticipant): boolean {
  return combatStore.currentParticipant?.id === participant.id;
}

async function performAttack(): Promise<void> {
  if (!combatStore.currentCombat || isProcessing.value) return;

  try {
    isProcessing.value = true;
    const player = combatStore.playerParticipants[0];
    const enemy = combatStore.enemyParticipants.find(e => e.currentHP > 0);

    if (!player || !enemy || !player.character || !enemy.enemy) {
      toastr.error('战斗参与者数据异常');
      return;
    }

    const attackSkill = coc7Service.getSkillValue(player.character, '格斗', 50);
    const dodgeSkill = coc7Service.getSkillValue(enemy.enemy, '闪避', 50);
    const action = coc7Service.executeAttack(player, enemy, attackSkill, dodgeSkill, 6);

    combatStore.executeAction(action);

    if (!combatStore.isActive) {
      await updateMVUAfterCombat();
    }
  } catch (error) {
    console.error('[Combat Panel] 攻击失败:', error);
    toastr.error('攻击失败');
  } finally {
    isProcessing.value = false;
  }
}

async function updateMVUAfterCombat(): Promise<void> {
  try {
    const player = combatStore.playerParticipants[0];
    if (!player || !player.character) return;

    await mvuService.updateCharacterStatus('player', {
      derivedStats: {
        HP: player.currentHP,
        MP: player.currentMP,
        SAN: player.currentSAN,
        maxHP: player.character.derivedStats.maxHP,
        maxMP: player.character.derivedStats.maxMP,
        maxSAN: player.character.derivedStats.maxSAN,
        MOV: player.character.derivedStats.MOV,
        DB: player.character.derivedStats.DB,
        BUILD: player.character.derivedStats.BUILD,
      },
    });
  } catch (error) {
    console.error('[Combat Panel] 更新 MVU 变量失败:', error);
  }
}

const emit = defineEmits<{ close: [] }>();
</script>

<style lang="scss" scoped>
.combat-panel {
  width: 100%;
  max-width: 800px;
  padding: 20px;
  background: rgba(0, 0, 0, 0.9);
  border: 2px solid #d4af37;
  border-radius: 8px;
}

.combat-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;

  h2 {
    color: #d4af37;
    font-size: 24px;
    margin: 0;
  }
}

.participants-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.participant {
  padding: 15px;
  background: rgba(0, 0, 0, 0.6);
  border: 2px solid #666666;
  border-radius: 4px;

  &.player {
    border-color: #4a90e2;
  }

  &.enemy {
    border-color: #e24a4a;
  }

  &.dead {
    opacity: 0.5;
  }
}

.stat-bar {
  display: flex;
  align-items: center;
  gap: 10px;

  .bar-container {
    flex: 1;
    height: 20px;
    background: rgba(0, 0, 0, 0.8);
    border: 1px solid #666666;
    border-radius: 4px;
    position: relative;
  }

  .bar-fill {
    height: 100%;
    transition: width 0.5s ease;

    &.hp {
      background: linear-gradient(90deg, #ff0000 0%, #ff6666 100%);
    }
  }

  .bar-text {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    color: #ffffff;
    font-size: 12px;
    z-index: 1;
  }
}

.combat-actions,
.combat-end-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;

  button {
    flex: 1;
    padding: 12px 24px;
    border: none;
    border-radius: 4px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover:not(:disabled) {
      transform: translateY(-2px);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}

.btn-attack {
  background: linear-gradient(135deg, #e24a4a 0%, #b83838 100%);
  color: #ffffff;
}

.btn-escape {
  background: linear-gradient(135deg, #888888 0%, #666666 100%);
  color: #ffffff;
}

.btn-close {
  background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
  color: #ffffff;
}
</style>
