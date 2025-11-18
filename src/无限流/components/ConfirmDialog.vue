<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="show" class="confirm-dialog-overlay" @click="handleOverlayClick">
        <Transition name="scale">
          <div v-if="show" class="confirm-dialog" @click.stop>
            <h2 class="dialog-title">{{ title }}</h2>
            <p class="dialog-message">{{ message }}</p>
            <div class="dialog-buttons">
              <button class="btn-dialog btn-cancel" @click="handleCancel">
                {{ cancelText }}
              </button>
              <button class="btn-dialog btn-confirm" :class="{ 'btn-danger': dangerMode }" @click="handleConfirm">
                {{ confirmText }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';

// ==================== Props ====================
interface Props {
  show: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  dangerMode?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  confirmText: '确认',
  cancelText: '取消',
  dangerMode: false,
});

// ==================== Emits ====================
const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

// ==================== Methods ====================
/**
 * 处理确认按钮点击
 */
function handleConfirm(): void {
  emit('confirm');
}

/**
 * 处理取消按钮点击
 */
function handleCancel(): void {
  emit('cancel');
}

/**
 * 处理覆盖层点击（点击外部关闭）
 */
function handleOverlayClick(): void {
  emit('cancel');
}

/**
 * 处理 ESC 键关闭
 */
function handleEscKey(event: KeyboardEvent): void {
  if (event.key === 'Escape' && props.show) {
    emit('cancel');
  }
}

// ==================== Lifecycle ====================
onMounted(() => {
  window.addEventListener('keydown', handleEscKey);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleEscKey);
});
</script>

<style lang="scss" scoped>
@import '../styles/global.scss';

// ==================== 动画 ====================
.fade-enter-active,
.fade-leave-active {
  transition: opacity $transition-base;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.scale-enter-active,
.scale-leave-active {
  transition: all $transition-base;
}

.scale-enter-from,
.scale-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

// ==================== 覆盖层 ====================
.confirm-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: calc(#{$z-index-welcome} + 10); // 高于欢迎页面
  backdrop-filter: blur(5px);
  padding: $spacing-md;

  @include mobile {
    padding: $spacing-sm;
  }
}

// ==================== 对话框 ====================
.confirm-dialog {
  background: linear-gradient(135deg, rgba(20, 20, 30, 0.98), rgba(40, 40, 60, 0.98));
  border: 2px solid $color-border-gold;
  border-radius: $border-radius-lg;
  padding: $spacing-2xl;
  box-shadow:
    0 0 50px rgba(212, 175, 55, 0.4),
    $shadow-lg;
  max-width: 500px;
  width: 100%;
  animation: pulse-glow 2s ease-in-out infinite;

  @include mobile {
    padding: $spacing-xl;
    border-width: 1px;
    max-width: 95%;
  }

  @include small-screen {
    padding: $spacing-lg;
    border-radius: $border-radius-md;
  }
}

@keyframes pulse-glow {
  0%,
  100% {
    box-shadow:
      0 0 50px rgba(212, 175, 55, 0.4),
      $shadow-lg;
  }
  50% {
    box-shadow:
      0 0 60px rgba(212, 175, 55, 0.6),
      $shadow-lg;
  }
}

// ==================== 标题 ====================
.dialog-title {
  font-size: $font-size-2xl;
  font-weight: $font-weight-bold;
  color: $color-text-gold;
  text-align: center;
  margin: 0 0 $spacing-lg 0;
  text-shadow: $text-shadow-gold;

  @include mobile {
    font-size: $font-size-xl;
    margin-bottom: $spacing-md;
  }

  @include small-screen {
    font-size: $font-size-lg;
    margin-bottom: $spacing-sm;
  }
}

// ==================== 消息 ====================
.dialog-message {
  font-size: $font-size-base;
  color: $color-text-secondary;
  text-align: center;
  line-height: 1.8;
  margin: 0 0 $spacing-xl 0;
  white-space: pre-line;

  @include mobile {
    font-size: $font-size-sm;
    margin-bottom: $spacing-lg;
    line-height: 1.6;
  }

  @include small-screen {
    font-size: $font-size-xs;
    margin-bottom: $spacing-md;
  }
}

// ==================== 按钮组 ====================
.dialog-buttons {
  display: flex;
  gap: $spacing-md;
  justify-content: center;

  @include mobile {
    gap: $spacing-sm;
    flex-direction: column-reverse;
  }
}

// ==================== 按钮样式 ====================
.btn-dialog {
  padding: $spacing-md $spacing-xl;
  border: 2px solid;
  border-radius: $border-radius-md;
  font-size: $font-size-base;
  font-weight: $font-weight-bold;
  cursor: pointer;
  transition: all $transition-base;
  min-width: 120px;
  text-shadow: 0 0 10px rgba(0, 0, 0, 0.5);

  @include mobile {
    padding: $spacing-sm $spacing-lg;
    font-size: $font-size-sm;
    border-width: 1px;
    min-width: 100px;
  }

  @include small-screen {
    padding: $spacing-sm $spacing-md;
    font-size: $font-size-xs;
    min-width: 80px;
  }

  &:active {
    transform: scale(0.98);
  }
}

// 取消按钮
.btn-cancel {
  background: linear-gradient(135deg, rgba(128, 128, 128, 0.3), rgba(128, 128, 128, 0.5));
  border-color: $color-text-muted;
  color: $color-text-secondary;
  box-shadow: 0 0 20px rgba(128, 128, 128, 0.2);

  &:hover {
    background: linear-gradient(135deg, rgba(128, 128, 128, 0.5), rgba(128, 128, 128, 0.7));
    box-shadow: 0 0 30px rgba(128, 128, 128, 0.4);
    transform: translateY(-2px);

    @include mobile {
      transform: translateY(-1px);
    }
  }
}

// 确认按钮（普通模式）
.btn-confirm {
  background: linear-gradient(135deg, rgba(33, 150, 243, 0.3), rgba(33, 150, 243, 0.5));
  border-color: $color-info;
  color: $color-info;
  box-shadow: 0 0 20px rgba(33, 150, 243, 0.3);

  &:hover {
    background: linear-gradient(135deg, rgba(33, 150, 243, 0.5), rgba(33, 150, 243, 0.7));
    box-shadow: 0 0 30px rgba(33, 150, 243, 0.5);
    transform: translateY(-2px);

    @include mobile {
      transform: translateY(-1px);
    }
  }

  // 危险模式（红色）
  &.btn-danger {
    background: linear-gradient(135deg, rgba(244, 67, 54, 0.3), rgba(244, 67, 54, 0.5));
    border-color: $color-danger;
    color: $color-danger;
    box-shadow: 0 0 20px rgba(244, 67, 54, 0.3);

    &:hover {
      background: linear-gradient(135deg, rgba(244, 67, 54, 0.5), rgba(244, 67, 54, 0.7));
      box-shadow: 0 0 30px rgba(244, 67, 54, 0.5);
      transform: translateY(-2px);

      @include mobile {
        transform: translateY(-1px);
      }
    }
  }
}
</style>
