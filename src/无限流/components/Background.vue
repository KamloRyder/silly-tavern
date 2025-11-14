<template>
  <div ref="backgroundRef" class="background-layer">
    <img v-if="currentBackground" :src="currentBackground" alt="场景背景" class="background-image" />
  </div>
</template>

<script setup lang="ts">
import gsap from 'gsap';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useGameStore } from '../stores/gameStore';
import { clearAnimationOptimization, optimizeForAnimation } from '../utils/animation';

// ==================== Store ====================
const gameStore = useGameStore();

// ==================== 状态 ====================
const backgroundRef = ref<HTMLElement | null>(null);
const currentBackground = ref<string>('');
const preloadedImages = new Map<string, HTMLImageElement>();

// ==================== 图片预加载 ====================

/**
 * 预加载图片
 * @param url 图片 URL
 * @returns Promise<HTMLImageElement>
 */
function preloadImage(url: string): Promise<HTMLImageElement> {
  // 如果已经预加载过，直接返回
  if (preloadedImages.has(url)) {
    return Promise.resolve(preloadedImages.get(url)!);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      preloadedImages.set(url, img);
      console.log('[Background] 图片预加载成功:', url);
      resolve(img);
    };
    img.onerror = () => {
      console.error('[Background] 图片预加载失败:', url);
      reject(new Error(`Failed to preload image: ${url}`));
    };
    img.src = url;
  });
}

// ==================== 生命周期 ====================
onMounted(() => {
  // 初始化背景
  if (gameStore.currentScene.background) {
    currentBackground.value = gameStore.currentScene.background;
  }

  // 优化动画性能
  if (backgroundRef.value) {
    optimizeForAnimation(backgroundRef.value, ['opacity']);
  }
});

// ==================== 监听场景变化 ====================
watch(
  () => gameStore.currentScene.background,
  async (newBackground, oldBackground) => {
    if (newBackground === oldBackground) return;

    // 如果没有新背景，清空
    if (!newBackground) {
      currentBackground.value = '';
      return;
    }

    // 预加载新背景
    try {
      await preloadImage(newBackground);
    } catch (error) {
      console.error('[Background] 预加载背景失败，使用默认加载:', error);
    }

    // 如果没有旧背景，直接显示新背景
    if (!oldBackground || !currentBackground.value) {
      currentBackground.value = newBackground;
      return;
    }

    // 使用 GSAP 实现淡入淡出切换
    if (backgroundRef.value) {
      gsap.to(backgroundRef.value, {
        opacity: 0,
        duration: 0.5,
        ease: 'power2.in',
        onComplete: () => {
          // 切换背景
          currentBackground.value = newBackground;

          // 淡入新背景
          gsap.to(backgroundRef.value, {
            opacity: 1,
            duration: 0.5,
            ease: 'power2.out',
          });
        },
      });
    }
  },
);

// ==================== 清理 ====================
onBeforeUnmount(() => {
  if (backgroundRef.value) {
    clearAnimationOptimization(backgroundRef.value);
  }
});
</script>

<style lang="scss" scoped>
@import '../styles/global.scss';

.background-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: $z-index-background;
  overflow: hidden;
}

.background-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}
</style>
