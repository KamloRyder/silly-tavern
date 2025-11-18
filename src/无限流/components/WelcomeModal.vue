<template>
  <div class="welcome-modal-overlay">
    <div class="welcome-modal">
      <div class="welcome-content">
        <h1 class="welcome-title">欢迎使用无限流前端</h1>
        <div class="button-group">
          <button class="btn-action btn-update" @click="handleUpdateCharacter">开始游戏</button>
          <button class="btn-action btn-continue" @click="handleContinue">继续游戏</button>
        </div>
      </div>
    </div>

    <!-- 确认对话框 -->
    <ConfirmDialog
      :show="showConfirmDialog"
      title="确认开始新游戏"
      :message="confirmMessage"
      confirm-text="确认"
      cancel-text="取消"
      :danger-mode="true"
      @confirm="handleConfirmReset"
      @cancel="handleCancelReset"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { gameResetService } from '../services/gameResetService';
import ConfirmDialog from './ConfirmDialog.vue';

// ==================== State ====================
const showConfirmDialog = ref(false);

// 确认消息
const confirmMessage = `开始新游戏将会清空以下数据：

• 所有 MVU 变量（消息楼层变量）
• 所有全局变量
• 所有聊天变量
• 背包中的所有物品

此操作不可撤销，确定要继续吗？`;

// ==================== Emits ====================
const emit = defineEmits<{
  updateCharacter: [];
  continue: [];
}>();

/**
 * 处理更新主控按钮点击
 * 显示确认对话框
 */
function handleUpdateCharacter(): void {
  showConfirmDialog.value = true;
}

/**
 * 处理确认重置
 * 调用 gameResetService 清空所有数据，然后触发角色创建
 */
async function handleConfirmReset(): Promise<void> {
  showConfirmDialog.value = false;

  try {
    // 清空所有游戏数据
    await gameResetService.clearAllGameData();

    // 触发角色创建事件
    emit('updateCharacter');
  } catch (error) {
    console.error('[WelcomeModal] 重置游戏数据失败:', error);
    toastr.error('重置游戏数据失败，请查看控制台了解详情');
  }
}

/**
 * 处理取消重置
 * 关闭确认对话框
 */
function handleCancelReset(): void {
  showConfirmDialog.value = false;
}

/**
 * 处理继续游戏按钮点击
 */
function handleContinue(): void {
  emit('continue');
}
</script>

<style lang="scss" scoped>
@import '../styles/global.scss';

.welcome-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: $z-index-welcome; // 使用最高的 z-index
  backdrop-filter: blur(10px);
  padding: $spacing-md;

  @include mobile {
    padding: $spacing-sm;
  }
}

.welcome-modal {
  background: linear-gradient(135deg, rgba(20, 20, 30, 0.95), rgba(40, 40, 60, 0.95));
  border: 2px solid $color-border-gold;
  border-radius: $border-radius-lg;
  padding: $spacing-2xl;
  box-shadow:
    0 0 50px rgba(212, 175, 55, 0.3),
    $shadow-lg;
  text-align: center;
  animation: fadeInScale 0.5s ease-out;
  max-width: 600px;
  width: 100%;

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

@keyframes fadeInScale {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.welcome-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-xl;

  @include mobile {
    gap: $spacing-lg;
  }

  @include small-screen {
    gap: $spacing-md;
  }
}

.welcome-title {
  font-size: 3rem;
  font-weight: $font-weight-bold;
  color: $color-text-gold;
  text-shadow:
    0 0 20px rgba(212, 175, 55, 0.8),
    0 0 40px rgba(212, 175, 55, 0.4);
  margin: 0;
  letter-spacing: 2px;

  @include mobile {
    font-size: 2rem;
    letter-spacing: 1px;
  }

  @include small-screen {
    font-size: 1.5rem;
    letter-spacing: 0.5px;
  }
}

.welcome-subtitle {
  font-size: $font-size-lg;
  color: $color-text-secondary;
  margin: 0;
  letter-spacing: 1px;

  @include mobile {
    font-size: $font-size-base;
    letter-spacing: 0.5px;
  }

  @include small-screen {
    font-size: $font-size-sm;
  }
}

.button-group {
  display: flex;
  gap: $spacing-md;
  width: 100%;
  justify-content: center;

  @include mobile {
    gap: $spacing-sm;
    flex-direction: column;
  }
}

.btn-action {
  padding: $spacing-md $spacing-xl;
  border: 2px solid;
  border-radius: $border-radius-md;
  font-size: $font-size-lg;
  font-weight: $font-weight-bold;
  cursor: pointer;
  transition: all $transition-base;
  min-width: 140px;
  text-shadow: 0 0 10px rgba(0, 0, 0, 0.5);

  @include mobile {
    padding: $spacing-sm $spacing-lg;
    font-size: $font-size-base;
    border-width: 1px;
    min-width: 120px;
  }

  @include small-screen {
    padding: $spacing-sm $spacing-md;
    font-size: $font-size-sm;
    min-width: 100px;
  }

  &.btn-update {
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

    &:active {
      transform: translateY(0);
    }
  }

  &.btn-continue {
    background: linear-gradient(135deg, rgba(76, 175, 80, 0.3), rgba(76, 175, 80, 0.5));
    border-color: $color-success;
    color: $color-success;
    box-shadow: 0 0 20px rgba(76, 175, 80, 0.3);

    &:hover {
      background: linear-gradient(135deg, rgba(76, 175, 80, 0.5), rgba(76, 175, 80, 0.7));
      box-shadow: 0 0 30px rgba(76, 175, 80, 0.5);
      transform: translateY(-2px);

      @include mobile {
        transform: translateY(-1px);
      }
    }

    &:active {
      transform: translateY(0);
    }
  }
}
</style>
