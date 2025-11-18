<template>
  <div class="npc-creation-modal-overlay" @click="$emit('close')">
    <div class="npc-creation-modal" @click.stop>
      <button class="close-btn" @click="$emit('close')">×</button>

      <h2 class="modal-title">创建 NPC</h2>

      <!-- 创建方式选择 -->
      <div v-if="!creationMode" class="mode-selector">
        <p class="mode-hint">选择创建方式：</p>
        <div class="mode-buttons">
          <button class="mode-btn quick-mode" @click="selectMode('quick')">
            <span class="mode-icon">✍️</span>
            <span class="mode-name">一句话创建</span>
            <span class="mode-desc">快速描述，AI 自动生成</span>
          </button>
          <button class="mode-btn detailed-mode" @click="selectMode('detailed')">
            <span class="mode-icon">📝</span>
            <span class="mode-name">详细创建</span>
            <span class="mode-desc">手动配置所有属性</span>
          </button>
        </div>
      </div>

      <!-- 一句话创建界面 -->
      <div v-else-if="creationMode === 'quick'" class="quick-creation">
        <div class="form-group">
          <label class="form-label">描述你想要的 NPC</label>
          <textarea
            v-model="quickDescription"
            class="form-textarea"
            placeholder="例如：一个30岁左右的侦探，擅长推理和观察，性格冷静理智..."
            rows="5"
            :disabled="generating"
          ></textarea>
        </div>

        <!-- 进度显示 -->
        <div v-if="generating" class="progress-info">
          <div class="spinner"></div>
          <p>正在生成 NPC，请稍候...</p>
        </div>

        <!-- 错误提示 -->
        <div v-if="error" class="error-message">
          <span class="error-icon">⚠️</span>
          <span>{{ error }}</span>
        </div>

        <div class="action-buttons">
          <button class="btn-action btn-back" @click="backToModeSelection" :disabled="generating">返回</button>
          <button
            class="btn-action btn-generate"
            @click="handleQuickCreate"
            :disabled="!quickDescription.trim() || generating"
          >
            {{ generating ? '生成中...' : '生成 NPC' }}
          </button>
        </div>
      </div>

      <!-- 详细创建界面 -->
      <div v-else-if="creationMode === 'detailed'" class="detailed-creation">
        <p class="detailed-hint">将打开角色创建器，完成后自动返回</p>

        <!-- 进度显示 -->
        <div v-if="generating" class="progress-info">
          <div class="spinner"></div>
          <p>等待角色创建完成...</p>
        </div>

        <!-- 错误提示 -->
        <div v-if="error" class="error-message">
          <span class="error-icon">⚠️</span>
          <span>{{ error }}</span>
        </div>

        <div class="action-buttons">
          <button class="btn-action btn-back" @click="backToModeSelection" :disabled="generating">返回</button>
          <button class="btn-action btn-open-creator" @click="handleDetailedCreate" :disabled="generating">
            {{ generating ? '创建中...' : '打开角色创建器' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { npcGenerationCoordinator } from '../services/npcGenerationCoordinator';
import type { NPCCharacter } from '../types/character';

// ==================== Props ====================
const props = defineProps<{
  instanceType: string;
}>();

// ==================== Emits ====================
const emit = defineEmits<{
  close: [];
  created: [npc: NPCCharacter, source: 'custom-quick' | 'custom-detailed'];
}>();

// ==================== 状态 ====================
const creationMode = ref<'quick' | 'detailed' | null>(null);
const quickDescription = ref('');
const generating = ref(false);
const error = ref('');

// ==================== 方法 ====================

/**
 * 选择创建方式
 */
function selectMode(mode: 'quick' | 'detailed'): void {
  creationMode.value = mode;
  error.value = '';
  console.log(`[NPCCreationModal] 选择创建方式: ${mode}`);
}

/**
 * 返回创建方式选择
 */
function backToModeSelection(): void {
  creationMode.value = null;
  quickDescription.value = '';
  error.value = '';
  console.log('[NPCCreationModal] 返回创建方式选择');
}

/**
 * 处理一句话创建
 */
async function handleQuickCreate(): Promise<void> {
  if (!quickDescription.value.trim()) {
    error.value = '请输入 NPC 描述';
    return;
  }

  generating.value = true;
  error.value = '';

  try {
    console.log('[NPCCreationModal] 开始一句话创建 NPC...');
    const npc = await npcGenerationCoordinator.generateQuickNPC(quickDescription.value, props.instanceType);

    console.log('[NPCCreationModal] NPC 创建成功:', npc.name);
    toastr.success(`NPC ${npc.name} 创建成功！`);

    // 通知父组件
    emit('created', npc, 'custom-quick');
    emit('close');
  } catch (err) {
    console.error('[NPCCreationModal] 一句话创建失败:', err);
    error.value = '创建失败: ' + (err as Error).message;
    toastr.error('NPC 创建失败');
  } finally {
    generating.value = false;
  }
}

/**
 * 处理详细创建
 */
async function handleDetailedCreate(): Promise<void> {
  generating.value = true;
  error.value = '';

  try {
    console.log('[NPCCreationModal] 打开详细创建界面...');
    const npc = await npcGenerationCoordinator.openDetailedCreation();

    if (npc) {
      console.log('[NPCCreationModal] NPC 创建成功:', npc.name);
      toastr.success(`NPC ${npc.name} 创建成功！`);

      // 通知父组件
      emit('created', npc, 'custom-detailed');
      emit('close');
    } else {
      console.log('[NPCCreationModal] 用户取消了创建');
      // 用户取消，返回模式选择
      backToModeSelection();
    }
  } catch (err) {
    console.error('[NPCCreationModal] 详细创建失败:', err);
    error.value = '创建失败: ' + (err as Error).message;
    toastr.error('NPC 创建失败');
  } finally {
    generating.value = false;
  }
}
</script>

<style lang="scss" scoped>
@import '../styles/global.scss';

.npc-creation-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: $z-index-modal + 20;
  backdrop-filter: blur(4px);
  padding: $spacing-md;

  @include mobile {
    padding: $spacing-sm;
  }
}

.npc-creation-modal {
  @include modal-container;
  max-width: 600px;
  position: relative;
}

.close-btn {
  @include modal-close-button;
}

.modal-title {
  @include modal-title;
}

// ==================== 创建方式选择 ====================
.mode-selector {
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;
}

.mode-hint {
  text-align: center;
  color: $color-text-secondary;
  font-size: $font-size-base;
  margin: 0;

  @include mobile {
    font-size: $font-size-sm;
  }
}

.mode-buttons {
  display: flex;
  gap: $spacing-md;

  @include mobile {
    flex-direction: column;
    gap: $spacing-sm;
  }
}

.mode-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-xl;
  background: rgba(0, 0, 0, 0.6);
  border: 2px solid $color-border-dark;
  border-radius: $border-radius-lg;
  cursor: pointer;
  transition: all $transition-base;

  @include mobile {
    padding: $spacing-lg;
    border-width: 1px;
  }

  &:hover {
    border-color: $color-border-gold;
    transform: translateY(-4px);
    box-shadow: $shadow-gold;
  }

  &:active {
    transform: translateY(-2px);
  }

  &.quick-mode {
    &:hover {
      background: rgba(33, 150, 243, 0.2);
      border-color: $color-info;
    }
  }

  &.detailed-mode {
    &:hover {
      background: rgba(156, 39, 176, 0.2);
      border-color: #9c27b0;
    }
  }
}

.mode-icon {
  font-size: 3rem;

  @include mobile {
    font-size: 2rem;
  }
}

.mode-name {
  font-size: $font-size-xl;
  font-weight: $font-weight-bold;
  color: $color-text-primary;

  @include mobile {
    font-size: $font-size-lg;
  }
}

.mode-desc {
  font-size: $font-size-sm;
  color: $color-text-secondary;
  text-align: center;

  @include mobile {
    font-size: $font-size-xs;
  }
}

// ==================== 一句话创建 ====================
.quick-creation,
.detailed-creation {
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;

  @include mobile {
    gap: $spacing-md;
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

.form-textarea {
  padding: $spacing-md;
  background: rgba(0, 0, 0, 0.6);
  border: 2px solid $color-border-dark;
  border-radius: $border-radius-md;
  color: $color-text-primary;
  font-size: $font-size-base;
  font-family: inherit;
  resize: vertical;
  transition: border-color $transition-fast;

  @include mobile {
    padding: $spacing-sm;
    font-size: $font-size-sm;
    border-width: 1px;
  }

  &:focus {
    outline: none;
    border-color: $color-border-gold;
    box-shadow: $shadow-gold;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &::placeholder {
    color: $color-text-muted;
  }
}

// ==================== 详细创建 ====================
.detailed-hint {
  text-align: center;
  color: $color-text-secondary;
  font-size: $font-size-base;
  padding: $spacing-md;
  background: rgba(156, 39, 176, 0.1);
  border: 1px solid rgba(156, 39, 176, 0.3);
  border-radius: $border-radius-md;
  margin: 0;

  @include mobile {
    font-size: $font-size-sm;
    padding: $spacing-sm;
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

  &.btn-back {
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

  &.btn-generate,
  &.btn-open-creator {
    background: linear-gradient(135deg, rgba(76, 175, 80, 0.3), rgba(76, 175, 80, 0.5));
    border-color: $color-success;
    color: $color-success;

    &:hover:not(:disabled) {
      background: linear-gradient(135deg, rgba(76, 175, 80, 0.5), rgba(76, 175, 80, 0.7));
      box-shadow: 0 0 20px rgba(76, 175, 80, 0.3);
      transform: translateY(-2px);
    }

    &:active:not(:disabled) {
      transform: translateY(0);
    }
  }
}
</style>
