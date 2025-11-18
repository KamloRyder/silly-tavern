<template>
  <div v-if="player" class="status-bar">
    <!-- 角色名称 -->
    <div class="character-name">{{ player.name }}</div>

    <!-- 状态条 -->
    <div class="status-bars">
      <!-- HP 条 -->
      <div class="stat-row">
        <span class="stat-label">HP</span>
        <div class="progress-bar hp-bar">
          <div ref="hpFillRef" class="progress-fill" :style="{ width: hpPercentage + '%' }"></div>
          <span ref="hpValueRef" class="stat-value"
            >{{ player.derivedStats.HP }} / {{ player.derivedStats.maxHP }}</span
          >
        </div>
      </div>

      <!-- MP 条 -->
      <div class="stat-row">
        <span class="stat-label">MP</span>
        <div class="progress-bar mp-bar">
          <div ref="mpFillRef" class="progress-fill" :style="{ width: mpPercentage + '%' }"></div>
          <span ref="mpValueRef" class="stat-value"
            >{{ player.derivedStats.MP }} / {{ player.derivedStats.maxMP }}</span
          >
        </div>
      </div>

      <!-- SAN 条 -->
      <div class="stat-row">
        <span class="stat-label">SAN</span>
        <div class="progress-bar san-bar">
          <div ref="sanFillRef" class="progress-fill" :style="{ width: sanPercentage + '%' }"></div>
          <span ref="sanValueRef" class="stat-value"
            >{{ player.derivedStats.SAN }} / {{ player.derivedStats.maxSAN }}</span
          >
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import gsap from 'gsap';
import { computed, onMounted, ref, watch } from 'vue';
import { useCharacterStore } from '../stores/characterStore';
import { highlightFlash } from '../utils/animation';

// ==================== Store ====================
const characterStore = useCharacterStore();

// ==================== 状态 ====================
const hpFillRef = ref<HTMLElement | null>(null);
const mpFillRef = ref<HTMLElement | null>(null);
const sanFillRef = ref<HTMLElement | null>(null);
const hpValueRef = ref<HTMLElement | null>(null);
const mpValueRef = ref<HTMLElement | null>(null);
const sanValueRef = ref<HTMLElement | null>(null);

// 记录上一次的值，用于动画
const previousHP = ref(0);
const previousMP = ref(0);
const previousSAN = ref(0);

// ==================== 计算属性 ====================
const player = computed(() => characterStore.player);

const hpPercentage = computed(() => {
  if (!player.value) return 0;
  return (player.value.derivedStats.HP / player.value.derivedStats.maxHP) * 100;
});

const mpPercentage = computed(() => {
  if (!player.value) return 0;
  return (player.value.derivedStats.MP / player.value.derivedStats.maxMP) * 100;
});

const sanPercentage = computed(() => {
  if (!player.value) return 0;
  return (player.value.derivedStats.SAN / player.value.derivedStats.maxSAN) * 100;
});

// ==================== 方法 ====================

/**
 * 高亮状态变化
 */
function highlightStatChange(element: HTMLElement | null, isIncrease: boolean): void {
  if (!element) return;

  const color = isIncrease ? '#4caf50' : '#f44336'; // 绿色表示增加，红色表示减少
  highlightFlash(element, color, 0.5);
}

/**
 * 动画更新数值
 */
function animateStatValue(element: HTMLElement | null, from: number, to: number, max: number): void {
  if (!element) return;

  const obj = { value: from };
  gsap.to(obj, {
    value: to,
    duration: 0.8,
    ease: 'power2.out',
    onUpdate: () => {
      element.textContent = `${Math.round(obj.value)} / ${max}`;
    },
  });
}

// ==================== 监听状态变化 ====================
watch(
  () => player.value?.derivedStats.HP,
  (newHP, oldHP) => {
    if (newHP === undefined || oldHP === undefined) return;
    if (newHP === oldHP) return;

    // 高亮变化
    highlightStatChange(hpFillRef.value, newHP > oldHP);

    // 动画更新数值
    if (hpValueRef.value && player.value) {
      animateStatValue(hpValueRef.value, oldHP, newHP, player.value.derivedStats.maxHP);
    }

    previousHP.value = newHP;
  },
);

watch(
  () => player.value?.derivedStats.MP,
  (newMP, oldMP) => {
    if (newMP === undefined || oldMP === undefined) return;
    if (newMP === oldMP) return;

    // 高亮变化
    highlightStatChange(mpFillRef.value, newMP > oldMP);

    // 动画更新数值
    if (mpValueRef.value && player.value) {
      animateStatValue(mpValueRef.value, oldMP, newMP, player.value.derivedStats.maxMP);
    }

    previousMP.value = newMP;
  },
);

watch(
  () => player.value?.derivedStats.SAN,
  (newSAN, oldSAN) => {
    if (newSAN === undefined || oldSAN === undefined) return;
    if (newSAN === oldSAN) return;

    // 高亮变化
    highlightStatChange(sanFillRef.value, newSAN > oldSAN);

    // 动画更新数值
    if (sanValueRef.value && player.value) {
      animateStatValue(sanValueRef.value, oldSAN, newSAN, player.value.derivedStats.maxSAN);
    }

    previousSAN.value = newSAN;
  },
);

// ==================== 生命周期 ====================
onMounted(() => {
  if (player.value) {
    previousHP.value = player.value.derivedStats.HP;
    previousMP.value = player.value.derivedStats.MP;
    previousSAN.value = player.value.derivedStats.SAN;
  }
});
</script>

<style lang="scss" scoped>
@import '../styles/global.scss';

.status-bar {
  position: fixed;
  top: calc($spacing-lg + 50px + $spacing-md); // 为剧情回顾按钮留出空间
  left: $spacing-lg;
  width: 220px;
  background: $color-bg-card;
  border: 2px solid $color-border-gold;
  border-radius: $border-radius-lg;
  padding: $spacing-sm $spacing-md;
  z-index: $z-index-ui;
  box-shadow: $shadow-md;

  // 移动端适配
  @include mobile {
    top: calc($spacing-sm + 36px + $spacing-xs); // 移动端按钮更小
    left: $spacing-sm;
    width: 160px;
    padding: $spacing-xs $spacing-sm;
    border-width: 1px;
  }
}

.character-name {
  font-size: $font-size-base;
  font-weight: $font-weight-bold;
  color: $color-text-gold;
  text-align: center;
  margin-bottom: $spacing-sm;
  text-shadow: 0 0 10px rgba(212, 175, 55, 0.5);

  @include mobile {
    font-size: $font-size-sm;
    margin-bottom: $spacing-xs;
  }
}

.status-bars {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.stat-row {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.stat-label {
  font-size: $font-size-xs;
  font-weight: $font-weight-bold;
  color: $color-text-secondary;
  width: 32px;
  text-align: right;
}

.progress-bar {
  position: relative;
  flex: 1;
  height: 20px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid $color-border-dark;
  border-radius: $border-radius-sm;
  overflow: hidden;

  @include mobile {
    height: 16px;
  }
}

.progress-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  transition: width $transition-base;

  .hp-bar & {
    background: linear-gradient(90deg, darken($color-hp, 10%), $color-hp);
  }

  .mp-bar & {
    background: linear-gradient(90deg, darken($color-mp, 10%), $color-mp);
  }

  .san-bar & {
    background: linear-gradient(90deg, darken($color-san, 10%), $color-san);
  }
}

.stat-value {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: $font-size-xs;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
  z-index: 1;
}
</style>
