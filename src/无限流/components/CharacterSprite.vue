<template>
  <div class="sprite-layer">
    <div
      v-for="sprite in visibleSprites"
      :key="sprite.characterId"
      :ref="el => setSpriteRef(sprite.characterId, el)"
      class="character-sprite"
      :class="getSpritePositionClass(sprite)"
      :style="getSpriteStyle(sprite)"
    >
      <img :src="sprite.url" :alt="`${sprite.characterId} 立绘`" class="sprite-image" />
    </div>
  </div>
</template>

<script setup lang="ts">
import gsap from 'gsap';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useGameStore } from '../stores/gameStore';
import type { SpriteData } from '../types/character';
import { clearAnimationOptimization, optimizeForAnimation } from '../utils/animation';

// ==================== Store ====================
const gameStore = useGameStore();

// ==================== 状态 ====================
const spriteRefs = ref<Map<string, HTMLElement>>(new Map());
const visibleSprites = ref<SpriteData[]>([]);
const preloadedImages = new Map<string, HTMLImageElement>();

// ==================== 图片预加载 ====================

/**
 * 预加载立绘图片
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
      console.log('[CharacterSprite] 立绘预加载成功:', url);
      resolve(img);
    };
    img.onerror = () => {
      console.error('[CharacterSprite] 立绘预加载失败:', url);
      reject(new Error(`Failed to preload sprite: ${url}`));
    };
    img.src = url;
  });
}

// ==================== 方法 ====================

/**
 * 设置立绘元素引用
 */
function setSpriteRef(characterId: string, el: any): void {
  if (el) {
    spriteRefs.value.set(characterId, el as HTMLElement);
    // 优化动画性能
    optimizeForAnimation(el as HTMLElement, ['opacity', 'transform']);
  }
}

/**
 * 获取立绘位置类名
 */
function getSpritePositionClass(sprite: SpriteData): string {
  if (sprite.position === 'custom') {
    return 'position-custom';
  }
  return `position-${sprite.position}`;
}

/**
 * 获取立绘样式
 */
function getSpriteStyle(sprite: SpriteData): Record<string, string> {
  const style: Record<string, string> = {
    opacity: (sprite.opacity ?? 1).toString(),
    transform: `scale(${sprite.scale ?? 1})`,
  };

  // 自定义位置
  if (sprite.position === 'custom' && sprite.x !== undefined && sprite.y !== undefined) {
    style.left = `${sprite.x}px`;
    style.top = `${sprite.y}px`;
  }

  return style;
}

/**
 * 添加新立绘（淡入动画）
 */
async function addSprite(sprite: SpriteData): Promise<void> {
  // 预加载图片
  try {
    await preloadImage(sprite.url);
  } catch (error) {
    console.error('[CharacterSprite] 预加载立绘失败，使用默认加载:', error);
  }

  visibleSprites.value.push(sprite);

  // 等待 DOM 更新后执行动画
  setTimeout(() => {
    const el = spriteRefs.value.get(sprite.characterId);
    if (el) {
      gsap.fromTo(
        el,
        { opacity: 0 },
        {
          opacity: sprite.opacity ?? 1,
          duration: 0.5,
          ease: 'power2.out',
        },
      );
    }
  }, 50);
}

/**
 * 移除立绘（淡出动画）
 */
function removeSprite(characterId: string): void {
  const el = spriteRefs.value.get(characterId);
  if (el) {
    gsap.to(el, {
      opacity: 0,
      duration: 0.5,
      ease: 'power2.in',
      onComplete: () => {
        visibleSprites.value = visibleSprites.value.filter(s => s.characterId !== characterId);
        spriteRefs.value.delete(characterId);
      },
    });
  } else {
    visibleSprites.value = visibleSprites.value.filter(s => s.characterId !== characterId);
  }
}

/**
 * 更新立绘（交叉淡入淡出）
 */
async function updateSprite(sprite: SpriteData): Promise<void> {
  const index = visibleSprites.value.findIndex(s => s.characterId === sprite.characterId);
  if (index === -1) return;

  // 预加载新图片
  try {
    await preloadImage(sprite.url);
  } catch (error) {
    console.error('[CharacterSprite] 预加载立绘失败，使用默认加载:', error);
  }

  const el = spriteRefs.value.get(sprite.characterId);
  if (el) {
    // 淡出
    gsap.to(el, {
      opacity: 0,
      duration: 0.3,
      ease: 'power2.in',
      onComplete: () => {
        // 更新数据
        visibleSprites.value[index] = sprite;

        // 淡入
        setTimeout(() => {
          gsap.to(el, {
            opacity: sprite.opacity ?? 1,
            duration: 0.3,
            ease: 'power2.out',
          });
        }, 50);
      },
    });
  } else {
    visibleSprites.value[index] = sprite;
  }
}

// ==================== 监听场景变化 ====================
watch(
  () => gameStore.currentScene.sprites,
  (newSprites, oldSprites) => {
    if (!oldSprites) {
      // 初始化，直接显示所有立绘
      visibleSprites.value = [...newSprites];
      return;
    }

    // 找出新增、移除和更新的立绘
    const oldIds = new Set(oldSprites.map(s => s.characterId));
    const newIds = new Set(newSprites.map(s => s.characterId));

    // 移除不再显示的立绘
    oldSprites.forEach(sprite => {
      if (!newIds.has(sprite.characterId)) {
        removeSprite(sprite.characterId);
      }
    });

    // 添加新立绘或更新现有立绘
    newSprites.forEach(sprite => {
      if (!oldIds.has(sprite.characterId)) {
        // 新立绘
        addSprite(sprite);
      } else {
        // 检查是否需要更新
        const oldSprite = oldSprites.find(s => s.characterId === sprite.characterId);
        if (oldSprite && oldSprite.url !== sprite.url) {
          updateSprite(sprite);
        }
      }
    });
  },
  { deep: true },
);

// ==================== 生命周期 ====================
onMounted(() => {
  // 初始化立绘
  if (gameStore.currentScene.sprites.length > 0) {
    visibleSprites.value = [...gameStore.currentScene.sprites];
  }
});

onBeforeUnmount(() => {
  // 清理动画优化
  spriteRefs.value.forEach(el => {
    clearAnimationOptimization(el);
  });
});
</script>

<style lang="scss" scoped>
@import '../styles/global.scss';

.sprite-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: $z-index-sprite;
  pointer-events: none;
}

.character-sprite {
  position: absolute;
  bottom: 0;
  height: 80%;
  transition: transform $transition-base;

  &.position-left {
    left: 10%;
  }

  &.position-center {
    left: 50%;
    transform: translateX(-50%);
  }

  &.position-right {
    right: 10%;
  }

  &.position-custom {
    // 自定义位置通过内联样式设置
    position: absolute;
  }
}

.sprite-image {
  height: 100%;
  width: auto;
  object-fit: contain;
  object-position: bottom;
}
</style>
