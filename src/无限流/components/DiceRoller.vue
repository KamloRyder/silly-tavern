<template>
  <div class="dice-roller" :class="{ 'is-rolling': isRolling }">
    <!-- 投骰器标题 -->
    <div class="roller-header">
      <h3>技能检定</h3>
    </div>

    <!-- 技能选择 -->
    <div class="skill-selection">
      <label for="skill-select">选择技能：</label>
      <select id="skill-select" v-model="selectedSkill" :disabled="isRolling">
        <option v-for="skill in availableSkills" :key="skill.name" :value="skill.name">
          {{ skill.name }} ({{ skill.value }})
        </option>
      </select>
    </div>

    <!-- 投骰按钮 -->
    <div class="roll-actions">
      <button ref="rollButtonRef" class="btn-roll" :disabled="!selectedSkill || isRolling" @click="performRoll">
        {{ isRolling ? '投骰中...' : '投骰' }}
      </button>

      <button v-if="lastRoll" ref="rerollButtonRef" class="btn-reroll" :disabled="isRolling" @click="reroll">
        重新投掷
      </button>
    </div>

    <!-- 投骰结果显示 -->
    <transition name="fade">
      <div v-if="lastRoll" class="roll-result">
        <div ref="diceDisplayRef" class="dice-display">
          <div class="dice-value">{{ lastRoll.roll }}</div>
        </div>

        <div class="result-info">
          <div class="result-level" :class="`result-${lastRoll.result}`">
            {{ getRollResultText(lastRoll.result) }}
          </div>
          <div class="result-details">
            <span>技能值: {{ lastRoll.skill }}</span>
            <span>投骰: {{ lastRoll.roll }}</span>
          </div>
        </div>

        <!-- 生成剧情按钮 -->
        <button ref="generateButtonRef" class="btn-generate" :disabled="isGenerating" @click="generatePlot">
          {{ isGenerating ? '生成中...' : '根据结果生成剧情' }}
        </button>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { coc7Service } from '../services/coc7Service';
import { streamService } from '../services/streamService';
import { useCharacterStore } from '../stores/characterStore';
import type { DiceRoll } from '../types/combat';
import * as animation from '../utils/animation';
import { getRollResultText } from '../utils/coc7Rules';

// ==================== Stores ====================
const characterStore = useCharacterStore();

// ==================== 状态 ====================
const selectedSkill = ref<string>('');
const lastRoll = ref<DiceRoll | null>(null);
const isRolling = ref(false);
const isGenerating = ref(false);
const userAction = ref<string>(''); // 玩家行动描述

// ==================== Refs ====================
const rollButtonRef = ref<HTMLButtonElement>();
const rerollButtonRef = ref<HTMLButtonElement>();
const generateButtonRef = ref<HTMLButtonElement>();
const diceDisplayRef = ref<HTMLDivElement>();

// ==================== 计算属性 ====================

/**
 * 可用技能列表
 * 从主控角色的技能中获取
 */
const availableSkills = computed(() => {
  if (!characterStore.player) {
    return [];
  }

  const skills: Array<{ name: string; value: number }> = [];

  // 从角色的技能 Map 中提取
  if (characterStore.player.skills instanceof Map) {
    characterStore.player.skills.forEach((value, name) => {
      skills.push({ name, value });
    });
  } else if (characterStore.player.skills && typeof characterStore.player.skills === 'object') {
    // 如果是普通对象，转换为数组
    Object.entries(characterStore.player.skills).forEach(([name, value]) => {
      skills.push({ name, value: value as number });
    });
  }

  // 如果没有技能，添加一些默认技能
  if (skills.length === 0) {
    skills.push(
      { name: '侦查', value: 50 },
      { name: '聆听', value: 50 },
      { name: '图书馆使用', value: 50 },
      { name: '说服', value: 50 },
      { name: '格斗', value: 50 },
      { name: '闪避', value: 50 },
    );
  }

  // 按技能名称排序
  return skills.sort((a, b) => a.name.localeCompare(b.name));
});

// ==================== 方法 ====================

/**
 * 执行投骰
 */
async function performRoll(): Promise<void> {
  if (!selectedSkill.value || isRolling.value) {
    return;
  }

  try {
    isRolling.value = true;

    // 获取技能值
    const skillValue = availableSkills.value.find(s => s.name === selectedSkill.value)?.value || 50;

    // 按钮点击反馈
    if (rollButtonRef.value) {
      animation.buttonClickFeedback(rollButtonRef.value);
    }

    // 投骰动画 - 骰子旋转效果
    if (diceDisplayRef.value) {
      // 快速旋转数字
      const animationDuration = 1;
      const frameCount = 20;
      const frameDuration = animationDuration / frameCount;

      for (let i = 0; i < frameCount; i++) {
        await new Promise(resolve => setTimeout(resolve, frameDuration * 1000));
        if (diceDisplayRef.value) {
          const randomValue = Math.floor(Math.random() * 100) + 1;
          diceDisplayRef.value.querySelector('.dice-value')!.textContent = randomValue.toString();
        }
      }
    }

    // 执行实际投骰
    const roll = coc7Service.performSkillCheck(selectedSkill.value, skillValue);
    lastRoll.value = roll;

    // 显示最终结果
    if (diceDisplayRef.value) {
      const diceValue = diceDisplayRef.value.querySelector('.dice-value');
      if (diceValue) {
        diceValue.textContent = roll.roll.toString();

        // 根据结果添加震动效果
        if (roll.result === 'critical_success') {
          animation.shake(diceDisplayRef.value, 15, 0.5);
        } else if (roll.result === 'critical_failure') {
          animation.shake(diceDisplayRef.value, 20, 0.8);
        }
      }
    }

    console.log('[Dice Roller] 投骰结果:', roll);
    toastr.info(`${selectedSkill.value} 检定: ${getRollResultText(roll.result)}`);
  } catch (error) {
    console.error('[Dice Roller] 投骰失败:', error);
    toastr.error('投骰失败');
  } finally {
    isRolling.value = false;
  }
}

/**
 * 重新投掷
 */
async function reroll(): Promise<void> {
  if (rerollButtonRef.value) {
    animation.buttonClickFeedback(rerollButtonRef.value);
  }

  // 清除上次结果
  lastRoll.value = null;

  // 等待动画完成后重新投骰
  await new Promise(resolve => setTimeout(resolve, 200));
  await performRoll();
}

/**
 * 根据投骰结果生成剧情
 */
async function generatePlot(): Promise<void> {
  if (!lastRoll.value || isGenerating.value) {
    return;
  }

  try {
    isGenerating.value = true;

    if (generateButtonRef.value) {
      animation.buttonClickFeedback(generateButtonRef.value);
    }

    // 构建剧情生成提示
    const resultText = getRollResultText(lastRoll.value.result);
    const skillName = lastRoll.value.skillName || selectedSkill.value;

    // 根据投骰结果生成剧情
    await streamService.generatePlotBasedOnRoll(resultText, skillName, userAction.value || '进行检定');

    console.log('[Dice Roller] 开始生成剧情');
    toastr.success('开始生成剧情，返回主界面');

    // 等待一小段时间让用户看到提示
    await new Promise(resolve => setTimeout(resolve, 500));

    // 触发关闭事件，返回主界面
    emit('close');
  } catch (error) {
    console.error('[Dice Roller] 生成剧情失败:', error);
    toastr.error('生成剧情失败');
  } finally {
    isGenerating.value = false;
  }
}

// ==================== Emits ====================
const emit = defineEmits<{
  close: [];
}>();

// ==================== 初始化 ====================

// 如果有可用技能，默认选择第一个
if (availableSkills.value.length > 0) {
  selectedSkill.value = availableSkills.value[0].name;
}
</script>

<style lang="scss" scoped>
@import '../styles/global.scss';

.dice-roller {
  @include modal-container;
  max-width: 400px;
  width: 100%;
  position: relative;

  &.is-rolling {
    pointer-events: none;
  }
}

.roller-header {
  text-align: center;
  margin-bottom: $spacing-lg;

  @include mobile {
    margin-bottom: $spacing-md;
  }

  h3 {
    @include modal-title;
    margin: 0;
    margin-bottom: 0;
  }
}

.skill-selection {
  margin-bottom: $spacing-lg;

  @include mobile {
    margin-bottom: $spacing-md;
  }

  label {
    display: block;
    color: $color-text-gold;
    font-size: $font-size-sm;
    margin-bottom: $spacing-sm;

    @include mobile {
      font-size: $font-size-xs;
    }
  }

  select {
    @include form-control;
    width: 100%;
    cursor: pointer;

    &:hover:not(:disabled) {
      border-color: $color-secondary-gold;
      box-shadow: $shadow-gold;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    option {
      background: $color-primary-black;
      color: $color-text-primary;
    }
  }
}

.roll-actions {
  @include button-group;
  margin-bottom: $spacing-lg;

  button {
    flex: 1;
    padding: $spacing-sm $spacing-lg;
    background: linear-gradient(135deg, $color-primary-gold, $color-dark-gold);
    border: none;
    border-radius: $border-radius-sm;
    color: $color-primary-black;
    font-size: $font-size-base;
    font-weight: $font-weight-bold;
    cursor: pointer;
    transition: all $transition-base;
    text-shadow: 0 1px 2px rgba(255, 255, 255, 0.3);

    @include mobile {
      padding: $spacing-xs $spacing-md;
      font-size: $font-size-sm;
    }

    &:hover:not(:disabled) {
      background: linear-gradient(135deg, $color-secondary-gold, $color-primary-gold);
      box-shadow: $shadow-md, $shadow-gold;
      transform: translateY(-2px);
    }

    &:active:not(:disabled) {
      transform: translateY(0);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .btn-reroll {
    background: linear-gradient(135deg, #888888, #666666);

    &:hover:not(:disabled) {
      background: linear-gradient(135deg, #aaaaaa, #888888);
    }
  }
}

.roll-result {
  padding: $spacing-lg;
  background: rgba(212, 175, 55, 0.1);
  border: 1px solid $color-border-gold;
  border-radius: $border-radius-sm;

  @include mobile {
    padding: $spacing-md;
  }
}

.dice-display {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: $spacing-lg;

  @include mobile {
    margin-bottom: $spacing-md;
  }

  .dice-value {
    width: 80px;
    height: 80px;
    display: flex;
    justify-content: center;
    align-items: center;
    background: linear-gradient(135deg, $color-primary-gold, $color-dark-gold);
    border: 3px solid $color-secondary-gold;
    border-radius: $border-radius-md;
    color: $color-primary-black;
    font-size: $font-size-3xl;
    font-weight: $font-weight-bold;
    box-shadow: $shadow-md, $shadow-gold;
    text-shadow: 0 2px 4px rgba(255, 255, 255, 0.3);

    @include mobile {
      width: 60px;
      height: 60px;
      font-size: $font-size-2xl;
      border-width: 2px;
    }
  }
}

.result-info {
  text-align: center;
  margin-bottom: $spacing-md;

  @include mobile {
    margin-bottom: $spacing-sm;
  }
}

.result-level {
  font-size: $font-size-2xl;
  font-weight: $font-weight-bold;
  margin-bottom: $spacing-sm;
  text-shadow: 0 0 10px currentColor;

  @include mobile {
    font-size: $font-size-xl;
  }

  &.result-critical_success {
    color: $color-success;
  }

  &.result-extreme_success {
    color: darken($color-success, 10%);
  }

  &.result-hard_success {
    color: lighten($color-success, 20%);
  }

  &.result-success {
    color: lighten($color-success, 30%);
  }

  &.result-failure {
    color: lighten($color-danger, 30%);
  }

  &.result-critical_failure {
    color: $color-danger;
  }
}

.result-details {
  display: flex;
  justify-content: space-around;
  color: $color-text-gold;
  font-size: $font-size-sm;
  gap: $spacing-xs;
  flex-wrap: wrap;

  @include mobile {
    font-size: $font-size-xs;
  }

  span {
    padding: $spacing-xs $spacing-sm;
    background: rgba(0, 0, 0, 0.5);
    border-radius: $border-radius-sm;

    @include mobile {
      padding: 4px $spacing-xs;
    }
  }
}

.btn-generate {
  width: 100%;
  padding: $spacing-sm $spacing-lg;
  background: linear-gradient(135deg, $color-info, darken($color-info, 10%));
  border: none;
  border-radius: $border-radius-sm;
  color: $color-text-primary;
  font-size: $font-size-base;
  font-weight: $font-weight-bold;
  cursor: pointer;
  transition: all $transition-base;

  @include mobile {
    padding: $spacing-xs $spacing-md;
    font-size: $font-size-sm;
  }

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, lighten($color-info, 10%), $color-info);
    box-shadow:
      $shadow-md,
      0 0 15px rgba(33, 150, 243, 0.5);
    transform: translateY(-2px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

// 过渡动画
.fade-enter-active,
.fade-leave-active {
  transition: opacity $transition-base;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
