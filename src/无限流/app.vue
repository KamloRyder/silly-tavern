<template>
  <div class="infinite-flow-game">
    <!-- 加载提示 -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <p>{{ loadingMessage }}</p>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-else-if="hasError" class="error-overlay">
      <div class="error-content">
        <h2>⚠️ 初始化失败</h2>
        <p>{{ errorMessage }}</p>
        <button class="retry-button" @click="retry">重试</button>
      </div>
    </div>

    <!-- 游戏界面 -->
    <MainInterface v-else />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import MainInterface from './components/MainInterface.vue';

// ==================== 状态 ====================
const isLoading = ref(true);
const hasError = ref(false);
const errorMessage = ref('');
const loadingMessage = ref('正在初始化...');

// ==================== 方法 ====================
async function initialize() {
  isLoading.value = true;
  hasError.value = false;
  errorMessage.value = '';

  try {
    loadingMessage.value = '等待 MVU 初始化...';
    console.log('[App] 主应用容器已挂载');

    // MVU 初始化在 MainInterface 中完成
    console.log('[App] 准备加载主界面');

    isLoading.value = false;
  } catch (error) {
    console.error('[App] 游戏初始化失败:', error);
    hasError.value = true;
    errorMessage.value = error instanceof Error ? error.message : '未知错误';
    toastr.error('游戏初始化失败');
    isLoading.value = false;
  }
}

function retry() {
  initialize();
}

// ==================== 生命周期 ====================
onMounted(() => {
  initialize();
});
</script>

<style lang="scss" scoped>
@import './styles/global.scss';

// 加载覆盖层
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: $color-bg-primary;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: $z-index-modal;
}

.loading-content {
  text-align: center;
  color: $color-text-gold;

  p {
    margin-top: $spacing-lg;
    font-size: $font-size-lg;
  }
}

.loading-spinner {
  width: 60px;
  height: 60px;
  border: 4px solid $color-border-dark;
  border-top-color: $color-primary-gold;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

// 错误覆盖层
.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: $color-bg-primary;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: $z-index-modal;
}

.error-content {
  text-align: center;
  color: $color-text-primary;
  max-width: 500px;
  padding: $spacing-xl;

  h2 {
    color: $color-danger;
    margin-bottom: $spacing-lg;
    font-size: $font-size-2xl;
  }

  p {
    margin-bottom: $spacing-xl;
    font-size: $font-size-base;
    line-height: 1.6;
  }
}

.retry-button {
  padding: $spacing-md $spacing-xl;
  background: linear-gradient(135deg, $color-primary-gold, $color-dark-gold);
  border: none;
  border-radius: $border-radius-md;
  color: $color-primary-black;
  font-size: $font-size-base;
  font-weight: $font-weight-bold;
  cursor: pointer;
  transition: all $transition-base;

  &:hover {
    background: linear-gradient(135deg, $color-secondary-gold, $color-primary-gold);
    transform: translateY(-2px);
    box-shadow: $shadow-gold;
  }
}

.infinite-flow-game {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background-color: $color-bg-primary;
}
</style>
