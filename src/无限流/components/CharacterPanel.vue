<template>
  <div class="character-panel">
    <!-- 面板头部 -->
    <div class="panel-header">
      <h2 class="panel-title">角色管理</h2>
      <button class="btn-close" @click="close">×</button>
    </div>

    <!-- 面板内容 -->
    <div class="panel-content">
      <!-- 主控角色详情 -->
      <div class="character-detail">
        <div v-if="characterStore.player" class="detail-content">
          <!-- 角色基本信息 -->
          <section class="detail-section">
            <div class="detail-header">
              <h3 class="detail-title">{{ characterStore.player.name }}</h3>

              <div class="detail-actions">
                <button class="btn-edit" @click="editCharacter">✏️ 编辑</button>
              </div>
            </div>

            <div class="basic-info">
              <div class="info-item">
                <span class="info-label">年龄:</span>
                <span class="info-value">{{ characterStore.player.age || '-' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">职业:</span>
                <span class="info-value">{{ characterStore.player.occupation || '-' }}</span>
              </div>
            </div>

            <div class="background-text">
              <p class="info-label">背景故事:</p>
              <p class="background-content">{{ characterStore.player.background || '暂无背景故事' }}</p>
            </div>
          </section>

          <!-- COC7 属性 -->
          <section class="detail-section">
            <h4 class="subsection-title">COC7 属性</h4>
            <div class="attributes-grid">
              <div v-for="(value, key) in characterStore.player.attributes" :key="key" class="attribute-item">
                <span class="attribute-label">{{ getAttributeName(key) }}</span>
                <span class="attribute-value">{{ value }}</span>
              </div>
            </div>
          </section>

          <!-- 衍生属性 -->
          <section class="detail-section">
            <h4 class="subsection-title">衍生属性</h4>
            <div class="derived-grid">
              <div class="derived-item">
                <span class="derived-label">生命值 (HP)</span>
                <span class="derived-value"
                  >{{ characterStore.player.derivedStats.HP }} / {{ characterStore.player.derivedStats.maxHP }}</span
                >
              </div>
              <div class="derived-item">
                <span class="derived-label">魔法值 (MP)</span>
                <span class="derived-value"
                  >{{ characterStore.player.derivedStats.MP }} / {{ characterStore.player.derivedStats.maxMP }}</span
                >
              </div>
              <div class="derived-item">
                <span class="derived-label">理智值 (SAN)</span>
                <span class="derived-value"
                  >{{ characterStore.player.derivedStats.SAN }} / {{ characterStore.player.derivedStats.maxSAN }}</span
                >
              </div>
              <div class="derived-item">
                <span class="derived-label">移动力 (MOV)</span>
                <span class="derived-value">{{ characterStore.player.derivedStats.MOV }}</span>
              </div>
              <div class="derived-item">
                <span class="derived-label">伤害加值 (DB)</span>
                <span class="derived-value">{{ characterStore.player.derivedStats.DB }}</span>
              </div>
              <div class="derived-item">
                <span class="derived-label">体格 (BUILD)</span>
                <span class="derived-value">{{ characterStore.player.derivedStats.BUILD }}</span>
              </div>
            </div>
          </section>

          <!-- 肢体状态 -->
          <section class="detail-section">
            <h4 class="subsection-title">肢体状态</h4>
            <div class="body-parts">
              <div v-for="part in characterStore.player.bodyParts" :key="part.id" class="body-part-group">
                <div class="body-part-header" @click="toggleBodyPart(part.id)">
                  <span class="expand-icon">{{ expandedParts.has(part.id) ? '▼' : '▶' }}</span>
                  <span class="part-name">{{ part.name }}</span>
                  <span class="part-damage" :class="getDamageClass(part.damage)"> 损伤: {{ part.damage }}% </span>
                </div>

                <!-- 子部位 -->
                <div v-if="expandedParts.has(part.id) && part.children" class="body-part-children">
                  <div v-for="child in part.children" :key="child.id" class="body-part-child">
                    <span class="child-name">{{ child.name }}</span>
                    <span class="child-damage" :class="getDamageClass(child.damage)"> {{ child.damage }}% </span>
                    <div v-if="child.debuffs && child.debuffs.length > 0" class="debuffs">
                      <span v-for="(debuff, index) in child.debuffs" :key="index" class="debuff-tag">
                        {{ debuff.type }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- 部位 debuff -->
                <div v-if="part.debuffs && part.debuffs.length > 0" class="part-debuffs">
                  <span v-for="(debuff, index) in part.debuffs" :key="index" class="debuff-tag">
                    {{ debuff.type }}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div v-else class="empty-detail">
          <p>暂无主控角色</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useCharacterStore } from '../stores/characterStore';
import type { Character } from '../types/character';

// ==================== Emits ====================
const emit = defineEmits<{
  close: [];
  edit: [character: Character];
}>();

// ==================== Store ====================
const characterStore = useCharacterStore();

// ==================== 状态 ====================
const expandedParts = ref<Set<string>>(new Set());

// ==================== 方法 ====================

/**
 * 编辑角色
 */
function editCharacter(): void {
  if (!characterStore.player) return;
  emit('edit', characterStore.player);
}

/**
 * 关闭面板
 */
function close(): void {
  emit('close');
}

/**
 * 获取属性中文名称
 */
function getAttributeName(key: string): string {
  const names: Record<string, string> = {
    STR: '力量',
    CON: '体质',
    SIZ: '体型',
    DEX: '敏捷',
    APP: '外貌',
    INT: '智力',
    POW: '意志',
    EDU: '教育',
    LUK: '幸运',
  };
  return names[key] || key;
}

/**
 * 切换肢体部位展开状态
 */
function toggleBodyPart(partId: string): void {
  if (expandedParts.value.has(partId)) {
    expandedParts.value.delete(partId);
  } else {
    expandedParts.value.add(partId);
  }
}

/**
 * 获取损伤等级样式类
 */
function getDamageClass(damage: number): string {
  if (damage === 0) return 'damage-none';
  if (damage < 25) return 'damage-light';
  if (damage < 50) return 'damage-moderate';
  if (damage < 75) return 'damage-heavy';
  return 'damage-critical';
}
</script>

<style lang="scss" scoped>
@import '../styles/global.scss';

.character-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90%;
  max-width: 1200px;
  aspect-ratio: 16 / 9;
  background: $color-bg-card;
  border: 2px solid $color-border-gold;
  border-radius: $border-radius-lg;
  box-shadow: $shadow-lg;
  z-index: $z-index-panel;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-md $spacing-lg;
  border-bottom: 1px solid $color-border-dark;
}

.panel-title {
  font-size: $font-size-xl;
  font-weight: $font-weight-bold;
  color: $color-text-gold;
  text-shadow: 0 0 10px rgba(212, 175, 55, 0.5);
}

.btn-close {
  width: 32px;
  height: 32px;
  padding: 0;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid $color-border-dark;
  border-radius: $border-radius-sm;
  color: $color-text-secondary;
  font-size: $font-size-2xl;
  line-height: 1;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    background: rgba(244, 67, 54, 0.2);
    border-color: $color-danger;
    color: $color-danger;
  }
}

.panel-content {
  flex: 1;
  padding: $spacing-lg;
  overflow: hidden;
}

.character-detail {
  height: 100%;
  overflow-y: auto;
  padding-right: $spacing-sm;
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;
}

.detail-section {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid $color-border-dark;
  border-radius: $border-radius-md;
  padding: $spacing-md;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $spacing-md;
  padding-bottom: $spacing-sm;
  border-bottom: 1px solid $color-border-dark;
}

.detail-title {
  font-size: $font-size-xl;
  font-weight: $font-weight-bold;
  color: $color-text-gold;
}

.detail-actions {
  display: flex;
  gap: $spacing-sm;
}

.btn-edit,
.btn-danger {
  padding: $spacing-xs $spacing-md;
  border: 1px solid;
  border-radius: $border-radius-sm;
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
  cursor: pointer;
  transition: all $transition-fast;
}

.btn-edit {
  background: rgba(33, 150, 243, 0.2);
  border-color: $color-info;
  color: $color-info;

  &:hover {
    background: rgba(33, 150, 243, 0.3);
  }
}

.btn-danger {
  background: rgba(244, 67, 54, 0.2);
  border-color: $color-danger;
  color: $color-danger;

  &:hover {
    background: rgba(244, 67, 54, 0.3);
  }
}

.basic-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: $spacing-md;
  margin-bottom: $spacing-md;
}

.info-item {
  display: flex;
  gap: $spacing-xs;
  align-items: center;
}

.info-label {
  font-size: $font-size-sm;
  color: $color-text-secondary;
  font-weight: $font-weight-medium;
}

.info-value {
  font-size: $font-size-sm;
  color: $color-text-primary;
}

.affection-value {
  color: $color-text-gold;
  font-weight: $font-weight-bold;
}

.background-text {
  margin-top: $spacing-sm;
  padding-top: $spacing-sm;
  border-top: 1px solid $color-border-dark;
}

.background-content {
  margin-top: $spacing-xs;
  font-size: $font-size-sm;
  color: $color-text-secondary;
  line-height: 1.6;
}

.subsection-title {
  font-size: $font-size-base;
  font-weight: $font-weight-bold;
  color: $color-text-gold;
  margin-bottom: $spacing-md;
}

.attributes-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $spacing-md;
}

.attribute-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-sm;
  background: rgba(0, 0, 0, 0.3);
  border-radius: $border-radius-sm;
}

.attribute-label {
  font-size: $font-size-sm;
  color: $color-text-secondary;
}

.attribute-value {
  font-size: $font-size-sm;
  font-weight: $font-weight-bold;
  color: $color-text-gold;
}

.derived-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: $spacing-md;
}

.derived-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-sm;
  background: rgba(0, 0, 0, 0.3);
  border-radius: $border-radius-sm;
}

.derived-label {
  font-size: $font-size-sm;
  color: $color-text-secondary;
}

.derived-value {
  font-size: $font-size-sm;
  font-weight: $font-weight-bold;
  color: $color-text-gold;
}

.body-parts {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.body-part-group {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid $color-border-dark;
  border-radius: $border-radius-sm;
  overflow: hidden;
}

.body-part-header {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-sm;
  cursor: pointer;
  transition: background $transition-fast;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
}

.expand-icon {
  font-size: $font-size-xs;
  color: $color-text-secondary;
  width: 12px;
}

.part-name {
  flex: 1;
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
  color: $color-text-primary;
}

.part-damage {
  font-size: $font-size-xs;
  font-weight: $font-weight-bold;
  padding: 2px $spacing-xs;
  border-radius: $border-radius-sm;
}

.damage-none {
  color: $color-success;
}

.damage-light {
  color: $color-info;
}

.damage-moderate {
  color: $color-warning;
}

.damage-heavy {
  color: #ff5722;
}

.damage-critical {
  color: $color-danger;
}

.body-part-children {
  padding: $spacing-xs $spacing-md $spacing-sm;
  background: rgba(0, 0, 0, 0.2);
  border-top: 1px solid $color-border-dark;
}

.body-part-child {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-xs;
  margin-bottom: $spacing-xs;

  &:last-child {
    margin-bottom: 0;
  }
}

.child-name {
  flex: 1;
  font-size: $font-size-xs;
  color: $color-text-secondary;
}

.child-damage {
  font-size: $font-size-xs;
  font-weight: $font-weight-bold;
}

.debuffs,
.part-debuffs {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-xs;
  padding: $spacing-xs $spacing-sm;
}

.debuff-tag {
  padding: 2px $spacing-xs;
  background: rgba(244, 67, 54, 0.2);
  border: 1px solid $color-danger;
  border-radius: $border-radius-sm;
  font-size: $font-size-xs;
  color: $color-danger;
}

.empty-detail {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: $color-text-muted;
  font-size: $font-size-base;
}
</style>
