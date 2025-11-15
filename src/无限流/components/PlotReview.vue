<template>
  <div class="plot-review">
    <div class="plot-review-header">
      <h2 class="plot-review-title">📜 剧情回顾</h2>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>

    <div class="plot-review-content">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>加载中...</p>
      </div>

      <!-- 空状态 -->
      <div v-else-if="messages.length === 0" class="empty-state">
        <p>📭</p>
        <p>暂无历史记录</p>
      </div>

      <!-- 消息列表 -->
      <div v-else class="messages-list">
        <div
          v-for="(message, index) in messages"
          :key="index"
          class="message-item"
          :class="{ 'is-user': message.is_user, 'is-system': message.is_system }"
        >
          <div class="message-header">
            <span class="message-name">{{ message.name }}</span>
            <span class="message-index">#{{ index + 1 }}</span>
          </div>
          <div
            class="message-content"
            :class="{ 'is-collapsed': !expandedMessages.has(index) }"
            @click="toggleExpand(index)"
          >
            {{ cleanMessageContent(message.mes) }}
          </div>
        </div>
      </div>
    </div>

    <div class="plot-review-footer">
      <button class="action-btn" @click="refreshMessages">
        <span>🔄</span>
        <span>刷新</span>
      </button>
      <button class="action-btn" @click="scrollToTop">
        <span>⬆️</span>
        <span>回到顶部</span>
      </button>
      <button class="action-btn" @click="scrollToBottom">
        <span>⬇️</span>
        <span>回到底部</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';

// ==================== Props & Emits ====================
defineEmits<{
  close: [];
}>();

// ==================== 接口定义 ====================
interface ChatMessage {
  name: string;
  is_user: boolean;
  is_system: boolean;
  mes: string;
  send_date?: number;
}

// ==================== 状态 ====================
const messages = ref<ChatMessage[]>([]);
const loading = ref(false);
const expandedMessages = ref<Set<number>>(new Set());

// ==================== 方法 ====================

/**
 * 获取聊天消息
 */
async function loadMessages(): Promise<void> {
  loading.value = true;
  try {
    console.log('[PlotReview] 开始加载消息...');

    // 方法1：尝试使用模板字符串
    let chatMessages = getChatMessages('0-{{lastMessageId}}');
    console.log('[PlotReview] 方法1 获取到', chatMessages.length, '条消息');

    // 如果方法1失败，尝试方法2：使用负数索引获取所有消息
    if (chatMessages.length === 0) {
      console.log('[PlotReview] 方法1 失败，尝试方法2...');
      // 获取最后一条消息的 ID
      const lastMsg = getChatMessages(-1);
      if (lastMsg && lastMsg.length > 0) {
        const lastId = lastMsg[0].message_id;
        console.log('[PlotReview] 最后一条消息 ID:', lastId);
        // 使用具体的范围
        chatMessages = getChatMessages(`0-${lastId}`);
        console.log('[PlotReview] 方法2 获取到', chatMessages.length, '条消息');
      }
    }

    // 转换为组件需要的格式
    messages.value = chatMessages.map(msg => ({
      name: msg.name,
      is_user: msg.role === 'user',
      is_system: msg.role === 'system',
      mes: msg.message,
      send_date: undefined,
    }));

    console.log('[PlotReview] 成功加载', messages.value.length, '条消息');

    // 打印前几条消息的信息用于调试
    messages.value.slice(0, 3).forEach((msg, i) => {
      console.log(
        `[PlotReview] 消息 ${i}:`,
        msg.name,
        msg.is_user ? '(用户)' : '(AI)',
        msg.mes.substring(0, 50) + '...',
      );
    });
  } catch (error) {
    console.error('[PlotReview] 加载消息失败:', error);
    toastr.error('加载历史记录失败');
    messages.value = [];
  } finally {
    loading.value = false;
  }
}

/**
 * 清理消息内容，移除代码块和特殊标记
 */
function cleanMessageContent(content: string): string {
  if (!content) return '';

  let cleaned = content;

  // 移除 HTML/XML 标签（如 <StatusPlaceHolderImpl/>、<div>...</div>）
  cleaned = cleaned.replace(/<[^>]+>/g, '');

  // 移除 MVU 命令（{{...}}）
  cleaned = cleaned.replace(/\{\{[^}]+\}\}/g, '');

  // 移除 NPC 创建标记
  cleaned = cleaned.replace(/\{\{NPC_CREATE:[^}]+\}\}/g, '');

  // 移除代码块（```...```）
  cleaned = cleaned.replace(/```[\s\S]*?```/g, '');

  // 移除行内代码（`...`）
  cleaned = cleaned.replace(/`[^`]+`/g, '');

  // 移除 Markdown 标题标记
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');

  // 移除 Markdown 粗体和斜体标记
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
  cleaned = cleaned.replace(/__([^_]+)__/g, '$1');
  cleaned = cleaned.replace(/_([^_]+)_/g, '$1');

  // 移除方括号标记（如 [互动室模式]、[注意：...]）
  cleaned = cleaned.replace(/\[([^\]]+)\]/g, '');

  // 移除多余的空行（保留单个换行）
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // 移除首尾空白
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * 刷新消息列表
 */
async function refreshMessages(): Promise<void> {
  await loadMessages();
  toastr.success('已刷新历史记录');
}

/**
 * 滚动到顶部
 */
function scrollToTop(): void {
  const content = document.querySelector('.messages-list');
  if (content) {
    content.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

/**
 * 滚动到底部
 */
function scrollToBottom(): void {
  const content = document.querySelector('.messages-list');
  if (content) {
    content.scrollTo({ top: content.scrollHeight, behavior: 'smooth' });
  }
}

/**
 * 切换消息展开/折叠状态
 */
function toggleExpand(index: number): void {
  if (expandedMessages.value.has(index)) {
    expandedMessages.value.delete(index);
  } else {
    expandedMessages.value.add(index);
  }
}

// ==================== 生命周期 ====================
onMounted(() => {
  loadMessages();
});
</script>

<style lang="scss" scoped>
@import '../styles/global.scss';

.plot-review {
  position: fixed;
  top: 0;
  left: 0;
  width: 400px;
  height: 100%;
  background: linear-gradient(135deg, rgba(20, 20, 30, 0.98), rgba(30, 20, 40, 0.98));
  border-right: 2px solid $color-border-gold;
  box-shadow:
    $shadow-lg,
    4px 0 20px rgba(212, 175, 55, 0.3);
  display: flex;
  flex-direction: column;
  z-index: $z-index-modal;
  animation: slideInLeft 0.3s ease-out;

  // 移动端适配
  @include mobile {
    width: 85%;
    max-width: 320px;
    border-right-width: 1px;
  }
}

@keyframes slideInLeft {
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.plot-review-header {
  padding: $spacing-lg;
  border-bottom: 1px solid rgba(212, 175, 55, 0.3);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(0, 0, 0, 0.3);

  @include mobile {
    padding: $spacing-md;
  }
}

.plot-review-title {
  margin: 0;
  font-size: $font-size-xl;
  color: $color-text-gold;
  text-shadow: $text-shadow-gold;
  font-family: $font-family-title;

  @include mobile {
    font-size: $font-size-lg;
  }
}

.close-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  background: rgba(139, 0, 0, 0.3);
  border: 1px solid rgba(220, 20, 60, 0.5);
  border-radius: $border-radius-sm;
  color: $color-danger;
  font-size: $font-size-lg;
  cursor: pointer;
  transition: all $transition-fast;
  flex-shrink: 0;

  @include mobile {
    width: 28px;
    height: 28px;
    font-size: $font-size-base;
  }

  &:hover {
    background: rgba(220, 20, 60, 0.3);
    border-color: $color-danger;
    transform: scale(1.1);
  }
}

.plot-review-content {
  flex: 1;
  overflow-y: auto;
  padding: $spacing-md;

  @include mobile {
    padding: $spacing-sm;
  }

  &::-webkit-scrollbar {
    width: 8px;

    @include mobile {
      width: 4px;
    }
  }

  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.3);
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(212, 175, 55, 0.3);
    border-radius: 4px;

    &:hover {
      background: rgba(212, 175, 55, 0.5);
    }
  }
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: $color-text-secondary;
  font-size: $font-size-lg;
  gap: $spacing-md;

  p:first-child {
    font-size: 48px;
    margin: 0;
  }

  p:last-child {
    margin: 0;
  }
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(212, 175, 55, 0.2);
  border-top-color: $color-border-gold;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;

  @include mobile {
    gap: $spacing-sm;
  }
}

.message-item {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(212, 175, 55, 0.2);
  border-radius: $border-radius-md;
  padding: $spacing-md;
  transition: all $transition-fast;

  @include mobile {
    padding: $spacing-sm;
  }

  &:hover {
    border-color: rgba(212, 175, 55, 0.4);
    background: rgba(0, 0, 0, 0.5);
    box-shadow: 0 2px 8px rgba(212, 175, 55, 0.2);
  }

  &.is-user {
    border-left: 3px solid $color-info;
  }

  &.is-system {
    border-left: 3px solid $color-warning;
    background: rgba(255, 193, 7, 0.05);
  }
}

.message-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $spacing-sm;
  padding-bottom: $spacing-xs;
  border-bottom: 1px solid rgba(212, 175, 55, 0.2);
}

.message-name {
  font-weight: bold;
  color: $color-text-gold;
  font-size: $font-size-base;

  @include mobile {
    font-size: $font-size-sm;
  }
}

.message-index {
  font-size: $font-size-sm;
  color: $color-text-secondary;
  font-family: monospace;

  @include mobile {
    font-size: $font-size-xs;
  }
}

.message-content {
  color: $color-text-primary;
  font-size: $font-size-base;
  line-height: 1.6;
  word-wrap: break-word;
  white-space: pre-wrap;
  cursor: pointer;
  transition: all $transition-fast;
  position: relative;

  @include mobile {
    font-size: $font-size-sm;
    line-height: 1.5;
  }

  &.is-collapsed {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;

    &::after {
      content: '...';
      position: absolute;
      bottom: 0;
      right: 0;
      padding-left: 20px;
      background: linear-gradient(to right, transparent, rgba(0, 0, 0, 0.4) 20%);
    }
  }

  &:hover {
    color: $color-text-gold;
  }
}

.plot-review-footer {
  padding: $spacing-md;
  border-top: 1px solid rgba(212, 175, 55, 0.3);
  display: flex;
  gap: $spacing-sm;
  background: rgba(0, 0, 0, 0.3);

  @include mobile {
    padding: $spacing-sm;
    gap: $spacing-xs;
  }
}

.action-btn {
  flex: 1;
  padding: $spacing-sm $spacing-md;
  background: rgba(20, 20, 20, 0.8);
  border: 1px solid $color-border-gold;
  border-radius: $border-radius-sm;
  color: $color-text-gold;
  font-size: $font-size-sm;
  cursor: pointer;
  transition: all $transition-fast;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;

  @include mobile {
    padding: $spacing-xs $spacing-sm;
    font-size: $font-size-xs;
    gap: 2px;
  }

  span:first-child {
    font-size: $font-size-lg;

    @include mobile {
      font-size: $font-size-base;
    }
  }

  &:hover {
    background: rgba(212, 175, 55, 0.2);
    border-color: $color-secondary-gold;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(212, 175, 55, 0.3);
  }

  &:active {
    transform: translateY(0);
  }
}
</style>
