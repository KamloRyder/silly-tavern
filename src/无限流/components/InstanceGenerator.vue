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
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useGameStore } from '../stores/gameStore';
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

// Button refs
const closeButtonRef = ref<HTMLButtonElement | null>(null);
const randomButtonRef = ref<HTMLButtonElement | null>(null);
const customButtonRef = ref<HTMLButtonElement | null>(null);
const enterButtonRef = ref<HTMLButtonElement | null>(null);

// ==================== 方法 ====================

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
}

.generator-container {
  position: relative;
  width: 100%;
  max-width: 600px;
  background: $color-bg-card;
  border: 2px solid $color-border-gold;
  border-radius: $border-radius-lg;
  padding: $spacing-xl;
  box-shadow: $shadow-lg, $shadow-gold;
}

.close-btn {
  position: absolute;
  top: $spacing-md;
  right: $spacing-md;
  width: 32px;
  height: 32px;
  padding: 0;
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid $color-border-gold;
  border-radius: $border-radius-sm;
  color: $color-text-gold;
  font-size: $font-size-lg;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    background: rgba(244, 67, 54, 0.3);
    border-color: $color-danger;
    color: $color-danger;
  }
}

.generator-title {
  font-size: $font-size-3xl;
  color: $color-text-gold;
  text-align: center;
  margin-bottom: $spacing-xl;
  text-shadow: 0 0 10px rgba(212, 175, 55, 0.5);
}

.generator-content {
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;

  label {
    font-size: $font-size-base;
    color: $color-text-gold;
    font-weight: $font-weight-medium;
  }
}

.difficulty-selector {
  display: flex;
  gap: $spacing-sm;
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
  padding: $spacing-md;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid $color-border-gold;
  color: $color-text-primary;
  font-size: $font-size-base;
  font-family: $font-family-primary;
  border-radius: $border-radius-sm;
  transition: all $transition-base;

  &:focus {
    outline: none;
    border-color: $color-primary-gold;
    box-shadow: $shadow-gold;
  }

  &::placeholder {
    color: $color-text-muted;
  }
}

textarea.form-control {
  resize: vertical;
  min-height: 100px;
}

.button-group {
  display: flex;
  gap: $spacing-md;
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
</style>
