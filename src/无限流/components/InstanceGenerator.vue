<template>
  <div class="instance-generator">
    <div class="generator-container">
      <button ref="closeButtonRef" class="close-btn" title="关闭" @click="handleClose">✕</button>
      <h2 class="generator-title">副本生成器</h2>

      <div class="generator-content">
        <!-- 难度选择 -->
        <div class="form-group">
          <label for="difficulty">难度选择</label>
          <div class="difficulty-selector">
            <button
              v-for="level in 5"
              :key="level"
              :class="['difficulty-btn', { active: difficulty === level }]"
              @click="difficulty = level"
            >
              {{ level }}
            </button>
          </div>
        </div>

        <!-- 副本类型 -->
        <div class="form-group">
          <label for="type">副本类型（可选）</label>
          <select id="type" v-model="instanceType" class="form-control">
            <option value="">随机</option>
            <option value="恐怖">恐怖</option>
            <option value="修仙">修仙</option>
            <option value="现代">现代</option>
            <option value="科幻">科幻</option>
            <option value="奇幻">奇幻</option>
            <option value="武侠">武侠</option>
            <option value="末日">末日</option>
            <option value="推理">推理</option>
          </select>
        </div>

        <!-- 自定义提示词 -->
        <div class="form-group">
          <label for="customPrompt">自定义提示词（可选）</label>
          <textarea
            id="customPrompt"
            v-model="customPrompt"
            class="form-control"
            rows="4"
            placeholder="例如：一个发生在废弃医院的恐怖副本，充满了诡异的医疗器械和未知的生物..."
          ></textarea>
        </div>

        <!-- NPC 管理区域 -->
        <div class="form-group npc-management">
          <label>副本 NPC</label>
          <div class="npc-list">
            <div v-if="npcs.length === 0" class="npc-empty">
              <p>暂无 NPC，点击下方按钮添加</p>
            </div>
            <div v-for="(npc, index) in npcs" :key="npc.id" class="npc-item">
              <div class="npc-info">
                <span class="npc-name">{{ npc.character.name }}</span>
                <span class="npc-occupation">{{ npc.character.occupation || '未知职业' }}</span>
              </div>
              <div class="npc-controls">
                <label class="importance-label">重要程度：</label>
                <select v-model="npc.importance" class="importance-selector">
                  <option :value="1">1 - 次要</option>
                  <option :value="2">2 - 普通</option>
                  <option :value="3">3 - 重要</option>
                  <option :value="4">4 - 核心</option>
                  <option :value="5">5 - 主角</option>
                </select>
                <button class="btn-delete" title="删除" @click="removeNPC(index)">✕</button>
              </div>
            </div>
          </div>
          <div class="npc-actions">
            <button
              ref="randomNPCButtonRef"
              class="btn btn-secondary"
              :disabled="isGenerating || isGeneratingNPC"
              @click="addRandomNPC"
            >
              <span v-if="!isGeneratingNPC">随机生成 NPC</span>
              <span v-else>生成中...</span>
            </button>
            <button
              ref="customNPCButtonRef"
              class="btn btn-secondary"
              :disabled="isGenerating || isGeneratingNPC"
              @click="showCustomNPCDialog"
            >
              自定义 NPC
            </button>
          </div>
        </div>

        <!-- 生成按钮 -->
        <div class="button-group">
          <button
            ref="randomButtonRef"
            class="btn btn-primary"
            :disabled="isGenerating"
            @click="generateRandomInstance"
          >
            <span v-if="!isGenerating">随机生成副本</span>
            <span v-else>生成中...</span>
          </button>

          <button
            v-if="customPrompt"
            ref="customButtonRef"
            class="btn btn-secondary"
            :disabled="isGenerating"
            @click="generateCustomInstance"
          >
            <span v-if="!isGenerating">使用提示词生成</span>
            <span v-else>生成中...</span>
          </button>
        </div>

        <!-- 生成进度 -->
        <div v-if="isGenerating" class="generation-progress">
          <div class="progress-bar">
            <div class="progress-fill"></div>
          </div>
          <p class="progress-text">{{ progressText }}</p>
        </div>

        <!-- 生成结果 -->
        <div v-if="generatedInstanceId && !isGenerating" class="generation-result">
          <div class="result-success">
            <i class="icon-check"></i>
            <p>副本生成成功！</p>
            <button ref="enterButtonRef" class="btn btn-success" @click="enterInstance">进入副本</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 自定义 NPC 对话框 -->
    <div v-if="showCustomDialog" class="custom-npc-dialog">
      <div class="dialog-content">
        <h3>自定义 NPC</h3>
        <textarea
          v-model="customNPCPrompt"
          class="form-control"
          rows="4"
          placeholder="描述你想要的 NPC，例如：一个神秘的老人，精通古代魔法，性格古怪但心地善良..."
        ></textarea>
        <div class="dialog-actions">
          <button class="btn btn-primary" :disabled="!customNPCPrompt.trim() || isGeneratingNPC" @click="addCustomNPC">
            <span v-if="!isGeneratingNPC">生成</span>
            <span v-else>生成中...</span>
          </button>
          <button class="btn btn-secondary" @click="closeCustomNPCDialog">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { npcGenerationService } from '../services/npcGenerationService';
import { useGameStore } from '../stores/gameStore';
import type { CharacterInInstance } from '../types/instance';
import * as animation from '../utils/animation';

// ==================== Props & Emits ====================
const emit = defineEmits<{
  close: [];
}>();

// ==================== 状态 ====================
const gameStore = useGameStore();

const difficulty = ref<number>(3);
const instanceType = ref<string>('');
const customPrompt = ref<string>('');
const isGenerating = ref<boolean>(false);
const progressText = ref<string>('');
const generatedInstanceId = ref<string>('');

// NPC 管理状态
const npcs = ref<Array<CharacterInInstance & { id: string }>>([]);
const isGeneratingNPC = ref<boolean>(false);
const showCustomDialog = ref<boolean>(false);
const customNPCPrompt = ref<string>('');

// Button refs
const closeButtonRef = ref<HTMLButtonElement | null>(null);
const randomButtonRef = ref<HTMLButtonElement | null>(null);
const customButtonRef = ref<HTMLButtonElement | null>(null);
const enterButtonRef = ref<HTMLButtonElement | null>(null);
const randomNPCButtonRef = ref<HTMLButtonElement | null>(null);
const customNPCButtonRef = ref<HTMLButtonElement | null>(null);

// ==================== 方法 ====================

/**
 * 随机生成 NPC
 */
async function addRandomNPC(): Promise<void> {
  if (randomNPCButtonRef.value) {
    animation.buttonClickFeedback(randomNPCButtonRef.value);
  }

  try {
    isGeneratingNPC.value = true;

    // 生成随机 NPC
    const npc = await npcGenerationService.generateRandom(instanceType.value || undefined);

    // 添加到 NPC 列表
    npcs.value.push({
      id: npc.id,
      characterId: npc.id,
      character: npc,
      importance: 2, // 默认普通重要程度
      appearanceCount: 0,
      isImportant: false, // 兼容旧字段
    });

    toastr.success(`NPC ${npc.name} 生成成功`);
  } catch (error) {
    console.error('[Instance Generator] 生成 NPC 失败:', error);
    toastr.error('生成 NPC 失败，请重试');
  } finally {
    isGeneratingNPC.value = false;
  }
}

/**
 * 显示自定义 NPC 对话框
 */
function showCustomNPCDialog(): void {
  if (customNPCButtonRef.value) {
    animation.buttonClickFeedback(customNPCButtonRef.value);
  }
  showCustomDialog.value = true;
  customNPCPrompt.value = '';
}

/**
 * 关闭自定义 NPC 对话框
 */
function closeCustomNPCDialog(): void {
  showCustomDialog.value = false;
  customNPCPrompt.value = '';
}

/**
 * 添加自定义 NPC
 */
async function addCustomNPC(): Promise<void> {
  if (!customNPCPrompt.value.trim()) {
    toastr.warning('请输入 NPC 描述');
    return;
  }

  try {
    isGeneratingNPC.value = true;

    // 根据用户输入生成 NPC
    const npc = await npcGenerationService.generateCustom(customNPCPrompt.value, instanceType.value || undefined);

    // 添加到 NPC 列表
    npcs.value.push({
      id: npc.id,
      characterId: npc.id,
      character: npc,
      importance: 2, // 默认普通重要程度
      appearanceCount: 0,
      isImportant: false, // 兼容旧字段
    });

    toastr.success(`NPC ${npc.name} 生成成功`);
    closeCustomNPCDialog();
  } catch (error) {
    console.error('[Instance Generator] 生成自定义 NPC 失败:', error);
    toastr.error('生成 NPC 失败，请重试');
  } finally {
    isGeneratingNPC.value = false;
  }
}

/**
 * 删除 NPC
 */
function removeNPC(index: number): void {
  const npc = npcs.value[index];
  if (npc) {
    npcs.value.splice(index, 1);
    toastr.info(`已删除 NPC ${npc.character.name}`);
  }
}

/**
 * 随机生成副本
 */
async function generateRandomInstance(): Promise<void> {
  if (randomButtonRef.value) {
    animation.buttonClickFeedback(randomButtonRef.value);
  }

  try {
    isGenerating.value = true;
    progressText.value = '正在生成副本...';
    generatedInstanceId.value = '';

    const config: any = {
      difficulty: difficulty.value,
      npcs: npcs.value, // 传递 NPC 列表
    };

    // 如果选择了类型，添加到配置中
    if (instanceType.value) {
      config.type = instanceType.value;
    }

    // 调用 gameStore 的生成方法
    const instanceId = await gameStore.generateInstance(config);

    generatedInstanceId.value = instanceId;
    progressText.value = '副本生成完成！';
  } catch (error) {
    console.error('[Instance Generator] 生成副本失败:', error);
    toastr.error('生成副本失败，请重试');
  } finally {
    isGenerating.value = false;
  }
}

/**
 * 使用自定义提示词生成副本
 */
async function generateCustomInstance(): Promise<void> {
  if (!customPrompt.value.trim()) {
    toastr.warning('请输入自定义提示词');
    return;
  }

  if (customButtonRef.value) {
    animation.buttonClickFeedback(customButtonRef.value);
  }

  try {
    isGenerating.value = true;
    progressText.value = '正在根据提示词生成副本...';
    generatedInstanceId.value = '';

    const config: any = {
      difficulty: difficulty.value,
      customPrompt: customPrompt.value,
      npcs: npcs.value, // 传递 NPC 列表
    };

    // 如果选择了类型，添加到配置中
    if (instanceType.value) {
      config.type = instanceType.value;
    }

    // 调用 gameStore 的生成方法
    const instanceId = await gameStore.generateInstance(config);

    generatedInstanceId.value = instanceId;
    progressText.value = '副本生成完成！';
  } catch (error) {
    console.error('[Instance Generator] 生成副本失败:', error);
    toastr.error('生成副本失败，请重试');
  } finally {
    isGenerating.value = false;
  }
}

/**
 * 进入生成的副本
 */
async function enterInstance(): Promise<void> {
  if (!generatedInstanceId.value) {
    return;
  }

  if (enterButtonRef.value) {
    animation.buttonClickFeedback(enterButtonRef.value);
  }

  try {
    // 切换到主游戏模式
    await gameStore.setMode('main');
    toastr.success('已进入副本');

    // 清空表单
    resetForm();

    // 关闭生成器
    emit('close');
  } catch (error) {
    console.error('[Instance Generator] 进入副本失败:', error);
    toastr.error('进入副本失败');
  }
}

function handleClose(): void {
  if (closeButtonRef.value) {
    animation.buttonClickFeedback(closeButtonRef.value);
  }
  emit('close');
}

// 优化动画性能
onMounted(() => {
  const buttons = document.querySelectorAll('.btn, .difficulty-btn');
  buttons.forEach(btn => {
    animation.optimizeForAnimation(btn as HTMLElement, ['transform', 'box-shadow']);
  });
});

/**
 * 重置表单
 */
function resetForm(): void {
  difficulty.value = 3;
  instanceType.value = '';
  customPrompt.value = '';
  generatedInstanceId.value = '';
  progressText.value = '';
  npcs.value = [];
  showCustomDialog.value = false;
  customNPCPrompt.value = '';
}
</script>

<style lang="scss" scoped>
@import '../styles/global.scss';

.instance-generator {
  width: 100%;
  aspect-ratio: 16 / 9;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $spacing-xl;
  background: linear-gradient(135deg, $color-bg-primary 0%, $color-bg-secondary 100%);

  @include mobile {
    padding: $spacing-md;
    aspect-ratio: auto;
    min-height: 100vh;
  }

  @include small-screen {
    padding: $spacing-sm;
  }
}

.generator-container {
  @include modal-container;
  position: relative;
  max-width: 600px;
  width: 100%;
}

.close-btn {
  @include modal-close-button;
}

.generator-title {
  @include modal-title;
}

.generator-content {
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

  label {
    font-size: $font-size-base;
    color: $color-text-gold;
    font-weight: $font-weight-medium;

    @include mobile {
      font-size: $font-size-sm;
    }
  }
}

.difficulty-selector {
  display: flex;
  gap: $spacing-sm;

  @include mobile {
    gap: 4px;
  }
}

.difficulty-btn {
  flex: 1;
  padding: $spacing-md;
  background: rgba(212, 175, 55, 0.1);
  border: 2px solid $color-border-gold;
  color: $color-text-gold;
  font-size: $font-size-lg;
  font-weight: $font-weight-bold;
  cursor: pointer;
  transition: all $transition-base;
  border-radius: $border-radius-sm;

  @include mobile {
    padding: $spacing-sm;
    font-size: $font-size-base;
    border-width: 1px;
  }

  @include small-screen {
    padding: $spacing-xs;
    font-size: $font-size-sm;
  }

  &:hover {
    background: rgba(212, 175, 55, 0.2);
    transform: translateY(-2px);
  }

  &.active {
    background: $color-primary-gold;
    color: $color-primary-black;
    box-shadow: $shadow-gold;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.form-control {
  @include form-control;
}

textarea.form-control {
  resize: vertical;
  min-height: 100px;

  @include mobile {
    min-height: 80px;
  }
}

.button-group {
  @include button-group;
  margin-top: $spacing-md;
}

.btn {
  flex: 1;
  padding: $spacing-md;
  font-size: $font-size-lg;
  font-weight: $font-weight-bold;
  border: none;
  border-radius: $border-radius-sm;
  cursor: pointer;
  transition: all $transition-base;
  text-transform: uppercase;
  letter-spacing: 1px;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.btn-primary {
  background: linear-gradient(135deg, $color-primary-gold, $color-secondary-gold);
  color: $color-primary-black;
  box-shadow: $shadow-md, $shadow-gold;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: $shadow-lg, $shadow-gold;
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }
}

.btn-secondary {
  background: rgba(212, 175, 55, 0.2);
  color: $color-text-gold;
  border: 2px solid $color-border-gold;

  &:hover:not(:disabled) {
    background: rgba(212, 175, 55, 0.3);
    transform: translateY(-2px);
  }
}

.btn-success {
  background: linear-gradient(135deg, $color-success, lighten($color-success, 10%));
  color: $color-text-primary;
  box-shadow:
    $shadow-md,
    0 0 15px rgba(76, 175, 80, 0.4);

  &:hover {
    transform: translateY(-2px);
    box-shadow:
      $shadow-lg,
      0 0 20px rgba(76, 175, 80, 0.6);
  }
}

.generation-progress {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
  padding: $spacing-md;
  background: rgba(212, 175, 55, 0.1);
  border: 1px solid $color-border-gold;
  border-radius: $border-radius-sm;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: $border-radius-sm;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, $color-primary-gold 0%, $color-secondary-gold 50%, $color-primary-gold 100%);
  background-size: 200% 100%;
  animation: progress-animation 2s linear infinite;
}

@keyframes progress-animation {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.progress-text {
  text-align: center;
  color: $color-text-gold;
  font-size: $font-size-base;
  margin: 0;
}

.generation-result {
  padding: $spacing-lg;
  background: rgba(76, 175, 80, 0.1);
  border: 2px solid $color-success;
  border-radius: $border-radius-sm;
}

.result-success {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-md;

  .icon-check {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: $color-success;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: $font-size-3xl;
    color: $color-text-primary;

    &::before {
      content: '✓';
    }
  }

  p {
    font-size: $font-size-lg;
    color: $color-success;
    margin: 0;
    font-weight: $font-weight-bold;
  }
}

// NPC 管理样式
.npc-management {
  .npc-list {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
    margin-bottom: $spacing-md;
    max-height: 300px;
    overflow-y: auto;
    padding: $spacing-sm;
    background: rgba(0, 0, 0, 0.3);
    border-radius: $border-radius-sm;

    @include mobile {
      max-height: 200px;
    }
  }

  .npc-empty {
    text-align: center;
    padding: $spacing-lg;
    color: rgba($color-text-gold, 0.6);
    font-size: $font-size-sm;
  }

  .npc-item {
    display: flex;
    flex-direction: column;
    gap: $spacing-xs;
    padding: $spacing-sm;
    background: rgba(212, 175, 55, 0.1);
    border: 1px solid $color-border-gold;
    border-radius: $border-radius-sm;
    transition: all $transition-base;

    &:hover {
      background: rgba(212, 175, 55, 0.15);
    }

    @include mobile {
      padding: $spacing-xs;
    }
  }

  .npc-info {
    display: flex;
    gap: $spacing-md;
    align-items: center;

    @include mobile {
      flex-direction: column;
      gap: $spacing-xs;
      align-items: flex-start;
    }
  }

  .npc-name {
    font-size: $font-size-base;
    color: $color-text-gold;
    font-weight: $font-weight-bold;

    @include mobile {
      font-size: $font-size-sm;
    }
  }

  .npc-occupation {
    font-size: $font-size-sm;
    color: rgba($color-text-gold, 0.7);

    @include mobile {
      font-size: $font-size-xs;
    }
  }

  .npc-controls {
    display: flex;
    gap: $spacing-sm;
    align-items: center;

    @include mobile {
      flex-wrap: wrap;
    }
  }

  .importance-label {
    font-size: $font-size-sm;
    color: $color-text-gold;
    white-space: nowrap;

    @include mobile {
      font-size: $font-size-xs;
    }
  }

  .importance-selector {
    flex: 1;
    padding: $spacing-xs $spacing-sm;
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid $color-border-gold;
    color: $color-text-gold;
    font-size: $font-size-sm;
    border-radius: $border-radius-sm;
    cursor: pointer;
    transition: all $transition-base;

    &:hover {
      background: rgba(0, 0, 0, 0.7);
    }

    &:focus {
      outline: none;
      border-color: $color-primary-gold;
    }

    @include mobile {
      font-size: $font-size-xs;
      padding: 4px $spacing-xs;
    }
  }

  .btn-delete {
    padding: $spacing-xs $spacing-sm;
    background: rgba(244, 67, 54, 0.2);
    border: 1px solid rgba(244, 67, 54, 0.5);
    color: #f44336;
    font-size: $font-size-base;
    font-weight: $font-weight-bold;
    border-radius: $border-radius-sm;
    cursor: pointer;
    transition: all $transition-base;

    &:hover {
      background: rgba(244, 67, 54, 0.3);
      transform: scale(1.1);
    }

    @include mobile {
      font-size: $font-size-sm;
      padding: 4px $spacing-xs;
    }
  }

  .npc-actions {
    display: flex;
    gap: $spacing-sm;

    @include mobile {
      flex-direction: column;
    }

    .btn {
      flex: 1;
      padding: $spacing-sm $spacing-md;
      font-size: $font-size-base;

      @include mobile {
        font-size: $font-size-sm;
        padding: $spacing-xs $spacing-sm;
      }
    }
  }
}

// 自定义 NPC 对话框
.custom-npc-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: $spacing-md;

  .dialog-content {
    background: linear-gradient(135deg, rgba(26, 26, 26, 0.98), rgba(38, 38, 38, 0.98));
    border: 2px solid $color-border-gold;
    border-radius: $border-radius-md;
    padding: $spacing-xl;
    max-width: 500px;
    width: 100%;
    box-shadow: $shadow-lg, $shadow-gold;

    @include mobile {
      padding: $spacing-md;
      max-width: 90%;
    }

    h3 {
      color: $color-text-gold;
      font-size: $font-size-xl;
      margin: 0 0 $spacing-md 0;
      text-align: center;

      @include mobile {
        font-size: $font-size-lg;
      }
    }

    .form-control {
      margin-bottom: $spacing-md;
    }

    .dialog-actions {
      display: flex;
      gap: $spacing-sm;

      @include mobile {
        flex-direction: column;
      }

      .btn {
        flex: 1;
        padding: $spacing-sm $spacing-md;
        font-size: $font-size-base;

        @include mobile {
          font-size: $font-size-sm;
        }
      }
    }
  }
}
</style>
