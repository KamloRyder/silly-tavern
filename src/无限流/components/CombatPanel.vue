<template>
  <div class="combat-panel" :class="{ 'combat-ended': !combatStore.isActive }">
    <!-- 顶部状态栏 -->
    <div class="combat-status-bar">
      <div class="combat-status">
        <span v-if="combatStore.isActive" class="status-active">进行中</span>
        <span v-else-if="combatStore.isVictory" class="status-victory">胜利</span>
        <span v-else-if="combatStore.isDefeat" class="status-defeat">失败</span>
        <span v-else-if="combatStore.isEscaped" class="status-escaped">已逃脱</span>
      </div>
    </div>

    <!-- 右上角退出按钮 -->
    <button class="floating-exit-btn-top" title="退出战斗" @click="emit('close')">✕</button>

    <div class="combat-header">
      <h2>战斗 - 第 {{ combatStore.currentRound }} 回合</h2>
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
@import '../styles/global.scss';

.combat-panel {
  @include modal-container;
  position: relative;
  padding-top: 60px; // 为顶部状态栏留出空间
  background: rgba(0, 0, 0, 0.9);
  width: 100%;

  @include mobile {
    padding-top: 50px;
  }

  @include small-screen {
    padding-top: 45px;
  }
}

// 顶部状态栏
.combat-status-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 12px 20px;
  background: rgba(0, 0, 0, 0.8);
  border-bottom: 2px solid #d4af37;
  border-radius: 8px 8px 0 0;

  @include mobile {
    padding: 10px 15px;
    border-bottom-width: 1px;
  }

  @include small-screen {
    padding: 8px 10px;
  }
}

.combat-status {
  span {
    padding: 6px 20px;
    border-radius: 20px;
    font-size: 16px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1px;

    @include mobile {
      padding: 4px 15px;
      font-size: 14px;
      letter-spacing: 0.5px;
    }

    @include small-screen {
      padding: 3px 10px;
      font-size: 12px;
    }
  }

  .status-active {
    background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
    color: #ffffff;
    box-shadow: 0 0 15px rgba(74, 144, 226, 0.5);
  }

  .status-victory {
    background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%);
    color: #ffffff;
    box-shadow: 0 0 15px rgba(76, 175, 80, 0.5);
  }

  .status-defeat {
    background: linear-gradient(135deg, #e24a4a 0%, #b83838 100%);
    color: #ffffff;
    box-shadow: 0 0 15px rgba(226, 74, 74, 0.5);
  }

  .status-escaped {
    background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
    color: #ffffff;
    box-shadow: 0 0 15px rgba(255, 152, 0, 0.5);
  }
}

// 右上角退出按钮
.floating-exit-btn-top {
  @include modal-close-button;
  background: rgba(244, 67, 54, 0.9);
  border-color: #f44336;
  color: white;

  &:hover {
    background: rgba(244, 67, 54, 1);
    box-shadow: 0 0 20px rgba(244, 67, 54, 0.6);
  }
}

.combat-header {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;

  @include mobile {
    margin-bottom: 15px;
  }

  h2 {
    color: #d4af37;
    font-size: 24px;
    margin: 0;

    @include mobile {
      font-size: 18px;
    }

    @include small-screen {
      font-size: 16px;
    }
  }
}

.enemies-area,
.players-area {
  margin-bottom: 20px;

  @include mobile {
    margin-bottom: 15px;
  }

  h3 {
    color: #d4af37;
    font-size: 18px;
    margin-bottom: 10px;

    @include mobile {
      font-size: 16px;
      margin-bottom: 8px;
    }

    @include small-screen {
      font-size: 14px;
    }
  }
}

.participants-list {
  display: flex;
  flex-direction: column;
  gap: 10px;

  @include mobile {
    gap: 8px;
  }

  @include small-screen {
    gap: 6px;
  }
}

.participant {
  padding: 15px;
  background: rgba(0, 0, 0, 0.6);
  border: 2px solid #666666;
  border-radius: 4px;

  @include mobile {
    padding: 10px;
    border-width: 1px;
  }

  @include small-screen {
    padding: 8px;
  }

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

.participant-name {
  font-size: 16px;
  font-weight: bold;
  color: #d4af37;
  margin-bottom: 8px;

  @include mobile {
    font-size: 14px;
    margin-bottom: 6px;
  }

  @include small-screen {
    font-size: 12px;
  }
}

.participant-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;

  @include mobile {
    gap: 6px;
  }
}

.stat-bar {
  display: flex;
  align-items: center;
  gap: 10px;

  @include mobile {
    gap: 8px;
  }

  label {
    min-width: 30px;
    font-size: 14px;
    color: #d4af37;

    @include mobile {
      min-width: 25px;
      font-size: 12px;
    }
  }

  .bar-container {
    flex: 1;
    height: 20px;
    background: rgba(0, 0, 0, 0.8);
    border: 1px solid #666666;
    border-radius: 4px;
    position: relative;

    @include mobile {
      height: 16px;
    }
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

    @include mobile {
      font-size: 10px;
    }
  }
}

.combat-actions,
.combat-end-actions {
  @include button-group;
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

    @include mobile {
      padding: 8px 16px;
      font-size: 14px;
    }

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
