<template>
  <div class="instance-creation-panel-overlay" @click="$emit('close')">
    <div class="instance-creation-panel" @click.stop>
      <button class="close-btn" @click="$emit('close')">×</button>

      <h2 class="panel-title">创建副本</h2>

      <!-- 副本基础配置 -->
      <div class="basic-config">
        <div class="config-section">
          <h3 class="section-title">基础设置</h3>

          <div class="form-group">
            <label class="form-label">副本类型</label>
            <select v-model="instanceType" class="form-select">
              <option v-for="type in instanceTypes" :key="type" :value="type">{{ type }}</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">难度等级</label>
            <div class="difficulty-selector">
              <button
                v-for="level in 5"
                :key="level"
                class="difficulty-btn"
                :class="{ active: difficulty === level }"
                @click="difficulty = level as 1 | 2 | 3 | 4 | 5"
              >
                {{ level }}
              </button>
            </div>
            <p class="difficulty-hint">难度 {{ difficulty }}: 将生成 {{ calculateNPCCount() }} 个 NPC</p>
          </div>
        </div>

        <!-- NPC 管理 -->
        <div class="npc-section">
          <div class="section-header">
            <h3 class="section-title">NPC 列表 ({{ allNPCs.length }})</h3>
            <button class="btn-action btn-add-npc" @click="showNPCCreationModal = true">
              <span class="btn-icon">➕</span>
              <span>添加自定义 NPC</span>
            </button>
          </div>

          <!-- 随机生成的 NPC -->
          <div v-if="randomNPCs.length > 0" class="npc-group">
            <div class="npc-group-header">
              <h4 class="npc-group-title">随机生成 ({{ randomNPCs.length }})</h4>
              <button class="btn-regenerate" :disabled="regenerating" @click="handleRegenerateRandom">
                <span class="btn-icon">🔄</span>
                <span>{{ regenerating ? '生成中...' : '重新生成' }}</span>
              </button>
            </div>

            <div class="npc-list">
              <div v-for="npc in randomNPCs" :key="npc.id" class="npc-item random-npc">
                <div class="npc-avatar">👤</div>
                <div class="npc-info">
                  <div class="npc-name">{{ npc.name }}</div>
                  <div class="npc-details">{{ npc.occupation || '未知职业' }}</div>
                </div>
                <div class="npc-badge random">随机</div>
              </div>
            </div>
          </div>

          <!-- 自定义 NPC -->
          <div v-if="customNPCs.length > 0" class="npc-group">
            <div class="npc-group-header">
              <h4 class="npc-group-title">自定义 ({{ customNPCs.length }})</h4>
            </div>

            <div class="npc-list">
              <div v-for="npc in customNPCs" :key="npc.id" class="npc-item custom-npc">
                <div class="npc-avatar">⭐</div>
                <div class="npc-info">
                  <div class="npc-name">{{ npc.name }}</div>
                  <div class="npc-details">{{ npc.occupation || '未知职业' }}</div>
                  <div class="npc-source">{{ npc.source === 'custom-quick' ? '一句话创建' : '详细创建' }}</div>
                </div>
                <div class="npc-badge custom">自定义</div>
                <button class="btn-remove" title="删除" @click="handleRemoveNPC(npc.id)">×</button>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-if="allNPCs.length === 0" class="empty-state">
            <p class="empty-icon">👥</p>
            <p class="empty-text">暂无 NPC</p>
            <p class="empty-hint">点击"添加自定义 NPC"或创建副本时自动生成</p>
          </div>
        </div>
      </div>

      <!-- 进度显示 -->
      <div v-if="generating || regenerating" class="progress-info">
        <div class="spinner"></div>
        <p>{{ progressMessage }}</p>
      </div>

      <!-- 错误提示 -->
      <div v-if="error" class="error-message">
        <span class="error-icon">⚠️</span>
        <span>{{ error }}</span>
      </div>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <button class="btn-action btn-cancel" :disabled="generating" @click="$emit('close')">取消</button>
        <button class="btn-action btn-create" :disabled="generating || regenerating" @click="handleCreateInstance">
          {{ generating ? '创建中...' : '创建副本' }}
        </button>
      </div>

      <!-- NPC 创建模态框 -->
      <NPCCreationModal
        v-if="showNPCCreationModal"
        :instance-type="instanceType"
        @close="showNPCCreationModal = false"
        @created="handleNPCCreated"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { npcGenerationCoordinator } from '../services/npcGenerationCoordinator';
import { useGameStore } from '../stores/gameStore';
import type { NPCCharacter } from '../types/character';
import type { CharacterInInstance } from '../types/instance';
import NPCCreationModal from './NPCCreationModal.vue';

// ==================== Emits ====================
const emit = defineEmits<{
  close: [];
  created: [instanceId: string];
}>();

// ==================== Stores ====================
const gameStore = useGameStore();

// ==================== 状态 ====================
// 副本配置
const instanceTypes = ['恐怖', '修仙', '现代', '科幻', '奇幻', '武侠', '末日', '推理'];
const instanceType = ref(instanceTypes[0]);
const difficulty = ref<1 | 2 | 3 | 4 | 5>(3);

// NPC 列表
interface NPCWithSource extends NPCCharacter {
  source: 'random' | 'custom-quick' | 'custom-detailed';
}

const npcs = ref<NPCWithSource[]>([]);

// UI 状态
const showNPCCreationModal = ref(false);
const generating = ref(false);
const regenerating = ref(false);
const error = ref('');
const progressMessage = ref('');

// ==================== 计算属性 ====================
const randomNPCs = computed(() => npcs.value.filter(npc => npc.source === 'random'));
const customNPCs = computed(() => npcs.value.filter(npc => npc.source !== 'random'));
const allNPCs = computed(() => npcs.value);

// ==================== 方法 ====================

/**
 * 计算 NPC 数量
 */
function calculateNPCCount(): number {
  return npcGenerationCoordinator.calculateNPCCount(difficulty.value);
}

/**
 * 处理 NPC 创建完成
 */
function handleNPCCreated(npc: NPCCharacter, source: 'custom-quick' | 'custom-detailed'): void {
  console.log('[InstanceCreationPanel] NPC 创建完成:', npc.name, source);

  // 添加到自定义 NPC 列表
  npcs.value.push({
    ...npc,
    source,
  });

  toastr.success(`NPC ${npc.name} 已添加`);
}

/**
 * 处理删除 NPC
 */
function handleRemoveNPC(npcId: string): void {
  const npc = npcs.value.find(n => n.id === npcId);
  if (!npc) return;

  // 只能删除自定义 NPC
  if (npc.source === 'random') {
    toastr.warning('随机生成的 NPC 不能单独删除，请使用"重新生成"功能');
    return;
  }

  npcs.value = npcs.value.filter(n => n.id !== npcId);
  console.log('[InstanceCreationPanel] NPC 已删除:', npc.name);
  toastr.info(`NPC ${npc.name} 已删除`);
}

/**
 * 处理重新生成随机 NPC
 */
async function handleRegenerateRandom(): Promise<void> {
  regenerating.value = true;
  error.value = '';

  try {
    console.log('[InstanceCreationPanel] 开始重新生成随机 NPC...');

    // 移除所有随机生成的 NPC
    npcs.value = npcs.value.filter(npc => npc.source !== 'random');

    // 重新生成随机 NPC
    const customNPCList = customNPCs.value.map(npc => {
      const { source, ...npcData } = npc;
      return npcData;
    });

    const newRandomNPCs = await npcGenerationCoordinator.regenerateRandomNPCs(
      difficulty.value,
      instanceType.value,
      customNPCList,
      (current, total) => {
        progressMessage.value = `正在生成第 ${current}/${total} 个随机 NPC...`;
      },
    );

    // 添加新生成的随机 NPC
    npcs.value.push(
      ...newRandomNPCs.map(npc => ({
        ...npc,
        source: 'random' as const,
      })),
    );

    console.log('[InstanceCreationPanel] 随机 NPC 重新生成完成');
    toastr.success(`成功生成 ${newRandomNPCs.length} 个随机 NPC`);
  } catch (err) {
    console.error('[InstanceCreationPanel] 重新生成失败:', err);
    error.value = '重新生成失败: ' + (err as Error).message;
    toastr.error('随机 NPC 重新生成失败');
  } finally {
    regenerating.value = false;
    progressMessage.value = '';
  }
}

/**
 * 处理创建副本
 */
async function handleCreateInstance(): Promise<void> {
  generating.value = true;
  error.value = '';

  try {
    console.log('[InstanceCreationPanel] 开始创建副本...');

    // 如果没有 NPC，先生成随机 NPC
    if (npcs.value.length === 0) {
      const npcCount = calculateNPCCount();
      progressMessage.value = `正在生成 ${npcCount} 个随机 NPC...`;

      const randomNPCList = await npcGenerationCoordinator.generateRandomNPCs(
        npcCount,
        instanceType.value,
        undefined,
        (current, total) => {
          progressMessage.value = `正在生成第 ${current}/${total} 个随机 NPC...`;
        },
      );

      npcs.value.push(
        ...randomNPCList.map(npc => ({
          ...npc,
          source: 'random' as const,
        })),
      );
    }

    // 构建 NPC 数据
    const npcData: Array<CharacterInInstance & { id: string }> = npcs.value.map(npc => {
      // 根据来源设置重要程度
      let importance: 1 | 2 | 3 | 4 | 5;
      if (npc.source === 'random') {
        importance = (Math.floor(Math.random() * 3) + 1) as 1 | 2 | 3; // 随机 1-3
      } else {
        importance = 3; // 自定义 NPC 默认重要程度为 3
      }

      return {
        id: npc.id,
        characterId: npc.id,
        character: npc,
        isImportant: importance >= 3,
        importance,
        appearanceCount: 0,
      };
    });

    // 调用 gameStore 创建副本
    progressMessage.value = '正在生成副本地图和世界观...';
    const instanceId = await gameStore.generateInstance({
      type: instanceType.value,
      difficulty: difficulty.value,
      npcs: npcData,
    });

    console.log('[InstanceCreationPanel] 副本创建成功:', instanceId);
    toastr.success('副本创建成功！');

    // 通知父组件
    emit('created', instanceId);
    emit('close');
  } catch (err) {
    console.error('[InstanceCreationPanel] 创建副本失败:', err);
    error.value = '创建失败: ' + (err as Error).message;
    toastr.error('副本创建失败');
  } finally {
    generating.value = false;
    progressMessage.value = '';
  }
}
</script>

<style lang="scss" scoped>
@import '../styles/global.scss';

.instance-creation-panel-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: $z-index-modal + 10;
  backdrop-filter: blur(4px);
  padding: $spacing-md;

  @include mobile {
    padding: $spacing-sm;
  }
}

.instance-creation-panel {
  @include modal-container;
  max-width: 900px;
  position: relative;
}

.close-btn {
  @include modal-close-button;
}

.panel-title {
  @include modal-title;
}

// ==================== 基础配置 ====================
.basic-config {
  display: flex;
  flex-direction: column;
  gap: $spacing-xl;

  @include mobile {
    gap: $spacing-lg;
  }
}

.config-section {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.section-title {
  font-size: $font-size-xl;
  color: $color-text-gold;
  margin-bottom: $spacing-sm;
  border-bottom: 2px solid $color-border-gold;
  padding-bottom: $spacing-sm;

  @include mobile {
    font-size: $font-size-lg;
    border-width: 1px;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.form-label {
  font-size: $font-size-base;
  font-weight: $font-weight-bold;
  color: $color-text-gold;

  @include mobile {
    font-size: $font-size-sm;
  }
}

.form-select {
  @include form-control;
  cursor: pointer;

  option {
    background: $color-bg-secondary;
    color: $color-text-primary;
  }
}

// ==================== 难度选择器 ====================
.difficulty-selector {
  display: flex;
  gap: $spacing-sm;
}

.difficulty-btn {
  flex: 1;
  padding: $spacing-md;
  background: rgba(0, 0, 0, 0.6);
  border: 2px solid $color-border-dark;
  border-radius: $border-radius-md;
  color: $color-text-secondary;
  font-size: $font-size-lg;
  font-weight: $font-weight-bold;
  cursor: pointer;
  transition: all $transition-base;

  @include mobile {
    padding: $spacing-sm;
    font-size: $font-size-base;
    border-width: 1px;
  }

  &:hover {
    border-color: $color-border-gold;
    transform: translateY(-2px);
  }

  &.active {
    background: rgba(212, 175, 55, 0.3);
    border-color: $color-border-gold;
    color: $color-text-gold;
    box-shadow: $shadow-gold;
  }
}

.difficulty-hint {
  font-size: $font-size-sm;
  color: $color-text-secondary;
  margin: 0;

  @include mobile {
    font-size: $font-size-xs;
  }
}

// ==================== NPC 管理 ====================
.npc-section {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: $spacing-md;

  @include mobile {
    flex-direction: column;
    align-items: stretch;
  }
}

.btn-add-npc {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-sm $spacing-lg;
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.3), rgba(76, 175, 80, 0.5));
  border: 2px solid $color-success;
  border-radius: $border-radius-md;
  color: $color-success;
  font-size: $font-size-base;
  font-weight: $font-weight-bold;
  cursor: pointer;
  transition: all $transition-base;
  white-space: nowrap;

  @include mobile {
    padding: $spacing-sm $spacing-md;
    font-size: $font-size-sm;
    border-width: 1px;
    width: 100%;
    justify-content: center;
  }

  &:hover {
    background: linear-gradient(135deg, rgba(76, 175, 80, 0.5), rgba(76, 175, 80, 0.7));
    box-shadow: 0 0 20px rgba(76, 175, 80, 0.3);
    transform: translateY(-2px);
  }
}

.btn-icon {
  font-size: $font-size-lg;

  @include mobile {
    font-size: $font-size-base;
  }
}

// ==================== NPC 组 ====================
.npc-group {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
  padding: $spacing-lg;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid $color-border-dark;
  border-radius: $border-radius-md;

  @include mobile {
    padding: $spacing-md;
    gap: $spacing-sm;
  }
}

.npc-group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: $spacing-md;

  @include mobile {
    flex-direction: column;
    align-items: stretch;
  }
}

.npc-group-title {
  font-size: $font-size-lg;
  color: $color-text-primary;
  margin: 0;

  @include mobile {
    font-size: $font-size-base;
  }
}

.btn-regenerate {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-xs $spacing-md;
  background: rgba(33, 150, 243, 0.3);
  border: 1px solid $color-info;
  border-radius: $border-radius-sm;
  color: $color-info;
  font-size: $font-size-sm;
  cursor: pointer;
  transition: all $transition-base;

  @include mobile {
    padding: $spacing-xs $spacing-sm;
    font-size: $font-size-xs;
    width: 100%;
    justify-content: center;
  }

  &:hover:not(:disabled) {
    background: rgba(33, 150, 243, 0.5);
    box-shadow: 0 0 15px rgba(33, 150, 243, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

// ==================== NPC 列表 ====================
.npc-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.npc-item {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-md;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid $color-border-dark;
  border-radius: $border-radius-md;
  transition: all $transition-base;

  @include mobile {
    padding: $spacing-sm;
    gap: $spacing-sm;
  }

  &:hover {
    border-color: $color-border-gold;
    transform: translateX(4px);
  }

  &.random-npc {
    border-left: 3px solid $color-info;
  }

  &.custom-npc {
    border-left: 3px solid $color-warning;
  }
}

.npc-avatar {
  font-size: $font-size-2xl;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;

  @include mobile {
    font-size: $font-size-xl;
    width: 32px;
    height: 32px;
  }
}

.npc-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
  min-width: 0;
}

.npc-name {
  font-size: $font-size-base;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  @include mobile {
    font-size: $font-size-sm;
  }
}

.npc-details {
  font-size: $font-size-sm;
  color: $color-text-secondary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  @include mobile {
    font-size: $font-size-xs;
  }
}

.npc-source {
  font-size: $font-size-xs;
  color: $color-text-muted;

  @include mobile {
    font-size: 10px;
  }
}

.npc-badge {
  padding: $spacing-xs $spacing-sm;
  border-radius: $border-radius-sm;
  font-size: $font-size-xs;
  font-weight: $font-weight-bold;
  white-space: nowrap;

  @include mobile {
    font-size: 10px;
    padding: 2px $spacing-xs;
  }

  &.random {
    background: rgba(33, 150, 243, 0.2);
    color: $color-info;
    border: 1px solid $color-info;
  }

  &.custom {
    background: rgba(255, 152, 0, 0.2);
    color: $color-warning;
    border: 1px solid $color-warning;
  }
}

.btn-remove {
  width: 28px;
  height: 28px;
  padding: 0;
  background: rgba(244, 67, 54, 0.2);
  border: 1px solid $color-danger;
  border-radius: $border-radius-sm;
  color: $color-danger;
  font-size: $font-size-lg;
  cursor: pointer;
  transition: all $transition-fast;
  flex-shrink: 0;

  @include mobile {
    width: 24px;
    height: 24px;
    font-size: $font-size-base;
  }

  &:hover {
    background: rgba(244, 67, 54, 0.4);
    transform: scale(1.1);
  }
}

// ==================== 空状态 ====================
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-2xl;
  text-align: center;

  @include mobile {
    padding: $spacing-xl;
    gap: $spacing-sm;
  }
}

.empty-icon {
  font-size: 4rem;
  margin: 0;

  @include mobile {
    font-size: 3rem;
  }
}

.empty-text {
  font-size: $font-size-lg;
  color: $color-text-secondary;
  margin: 0;

  @include mobile {
    font-size: $font-size-base;
  }
}

.empty-hint {
  font-size: $font-size-sm;
  color: $color-text-muted;
  margin: 0;

  @include mobile {
    font-size: $font-size-xs;
  }
}

// ==================== 进度和错误 ====================
.progress-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-xl;
  background: rgba(33, 150, 243, 0.1);
  border: 1px solid rgba(33, 150, 243, 0.3);
  border-radius: $border-radius-md;

  @include mobile {
    padding: $spacing-lg;
    gap: $spacing-sm;
  }

  p {
    color: $color-info;
    font-size: $font-size-base;
    margin: 0;

    @include mobile {
      font-size: $font-size-sm;
    }
  }
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(33, 150, 243, 0.2);
  border-top-color: $color-info;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @include mobile {
    width: 30px;
    height: 30px;
    border-width: 3px;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-message {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-md;
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid rgba(244, 67, 54, 0.3);
  border-radius: $border-radius-md;
  color: $color-danger;
  font-size: $font-size-base;

  @include mobile {
    padding: $spacing-sm;
    font-size: $font-size-sm;
  }
}

.error-icon {
  font-size: $font-size-xl;

  @include mobile {
    font-size: $font-size-lg;
  }
}

// ==================== 操作按钮 ====================
.action-buttons {
  display: flex;
  gap: $spacing-md;
  justify-content: flex-end;
  margin-top: $spacing-lg;

  @include mobile {
    gap: $spacing-sm;
    flex-direction: column-reverse;
  }
}

.btn-action {
  padding: $spacing-sm $spacing-xl;
  border: 2px solid;
  border-radius: $border-radius-md;
  font-size: $font-size-base;
  font-weight: $font-weight-bold;
  cursor: pointer;
  transition: all $transition-base;
  min-width: 120px;

  @include mobile {
    padding: $spacing-sm $spacing-lg;
    font-size: $font-size-sm;
    border-width: 1px;
    min-width: 100px;
    width: 100%;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
  }

  &.btn-cancel {
    background: rgba(158, 158, 158, 0.3);
    border-color: #9e9e9e;
    color: #9e9e9e;

    &:hover:not(:disabled) {
      background: rgba(158, 158, 158, 0.5);
      box-shadow: 0 0 20px rgba(158, 158, 158, 0.3);
      transform: translateY(-2px);
    }

    &:active:not(:disabled) {
      transform: translateY(0);
    }
  }

  &.btn-create {
    background: linear-gradient(135deg, rgba(212, 175, 55, 0.3), rgba(212, 175, 55, 0.5));
    border-color: $color-border-gold;
    color: $color-text-gold;

    &:hover:not(:disabled) {
      background: linear-gradient(135deg, rgba(212, 175, 55, 0.5), rgba(212, 175, 55, 0.7));
      box-shadow: $shadow-gold;
      transform: translateY(-2px);
    }

    &:active:not(:disabled) {
      transform: translateY(0);
    }
  }
}
</style>
