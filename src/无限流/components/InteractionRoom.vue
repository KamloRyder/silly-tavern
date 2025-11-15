<template>
  <div class="interaction-room">
    <!-- NPC 选择界面 -->
    <div v-if="!interactionStore.isInRoom" class="npc-selection-view">
      <div class="selection-header">
        <h2 class="selection-title">角色互动室</h2>
        <p class="selection-subtitle">选择要互动的 NPC，支持单人或多人群聊模式</p>
      </div>

      <div v-if="characterStore.npcCount === 0" class="empty-state">
        <p class="empty-text">暂无可互动的 NPC</p>
        <p class="empty-hint">在主线剧情中遇到 NPC 后，他们将出现在这里</p>
      </div>

      <div v-else class="npc-list">
        <div
          v-for="npc in characterStore.npcList"
          :key="npc.id"
          class="npc-card"
          :class="{ selected: interactionStore.isNPCSelected(npc.id) }"
          @click="interactionStore.toggleNPC(npc.id)"
        >
          <div class="npc-avatar">
            <img v-if="npc.portrait" :src="npc.portrait" :alt="npc.name" class="avatar-image" />
            <div v-else class="avatar-placeholder">{{ npc.name.charAt(0) }}</div>
          </div>

          <div class="npc-info">
            <h3 class="npc-name">{{ npc.name }}</h3>
            <p v-if="npc.occupation" class="npc-occupation">{{ npc.occupation }}</p>
            <div class="npc-stats">
              <span class="stat-item">好感度: {{ npc.affection }}%</span>
              <span v-if="npc.isImportant" class="important-badge">重要</span>
            </div>
          </div>

          <div class="selection-indicator">
            <span class="checkbox" :class="{ checked: interactionStore.isNPCSelected(npc.id) }">
              {{ interactionStore.isNPCSelected(npc.id) ? '✓' : '' }}
            </span>
          </div>
        </div>
      </div>

      <div class="selection-actions">
        <div class="selection-info">
          <span class="info-text">已选择 {{ interactionStore.selectedNPCs.length }} 个 NPC</span>
          <span v-if="interactionStore.selectedNPCs.length > 0" class="mode-hint">
            {{ interactionStore.selectedNPCs.length === 1 ? '一对一互动模式' : '群聊模式' }}
          </span>
        </div>
        <button class="btn-enter" :disabled="!interactionStore.hasSelectedNPCs" @click="enterRoom">进入互动室</button>
      </div>
    </div>

    <!-- 互动室聊天界面 -->
    <div v-else class="chat-room-view">
      <div class="chat-header">
        <div class="header-left">
          <h2 class="room-title">互动室</h2>
          <div class="participants">
            <span v-for="npcId in interactionStore.selectedNPCs" :key="npcId" class="participant-tag">
              {{ getCharacterName(npcId) }}
            </span>
          </div>
        </div>
        <div class="header-actions">
          <button class="btn-clear" @click="clearDialogues">清空记录</button>
          <button class="btn-exit" @click="exitRoom">退出互动室</button>
        </div>
      </div>

      <div ref="chatContentRef" class="chat-content">
        <div v-if="interactionStore.dialogueCount === 0" class="empty-chat">
          <p class="empty-text">开始与 NPC 互动吧！</p>
          <p class="empty-hint">在下方输入框中输入你想说的话</p>
        </div>

        <div v-else class="messages-list">
          <div
            v-for="(dialogue, index) in displayedDialogues"
            :key="index"
            class="message-item"
            :class="{ 'user-message': dialogue.speaker === '玩家', 'npc-message': dialogue.speaker !== '玩家' }"
          >
            <div class="message-header">
              <span class="message-speaker">{{ dialogue.speaker }}</span>
              <span class="message-time">{{ formatTime(dialogue.timestamp) }}</span>
            </div>
            <div class="message-content">{{ dialogue.content }}</div>
          </div>

          <!-- 流式传输中的消息 -->
          <div v-if="isStreaming && streamingDialogue" class="message-item npc-message streaming">
            <div class="message-header">
              <span class="message-speaker">{{ streamingDialogue.speaker }}</span>
              <span class="streaming-indicator">输入中...</span>
            </div>
            <div class="message-content">{{ streamingDialogue.content }}</div>
          </div>
        </div>
      </div>

      <div class="chat-input-area">
        <textarea
          v-model="userInput"
          class="chat-input"
          placeholder="输入你想说的话..."
          rows="3"
          @keydown.enter.exact.prevent="sendMessage"
          @keydown.enter.shift.exact="userInput += '\n'"
        ></textarea>
        <div class="input-actions">
          <span class="input-hint">Enter 发送 | Shift+Enter 换行</span>
          <button class="btn-send" :disabled="!canSend" @click="sendMessage">
            <span class="send-icon">➤</span>
            发送
          </button>
        </div>
      </div>

      <!-- 右上角退出按钮（互动中） -->
      <button class="floating-exit-btn-top" title="退出互动室" @click="exitRoom">✕</button>
    </div>

    <!-- 右上角退出按钮（NPC 选择界面） -->
    <button v-if="!interactionStore.isInRoom" class="floating-exit-btn-top" title="返回主界面" @click="emit('close')">
      ✕
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue';
import { streamService } from '../services/streamService';
import { useCharacterStore } from '../stores/characterStore';
import { useInteractionStore } from '../stores/interactionStore';
import type { DialogueDataType } from '../types/schemas';

// ==================== Emits ====================
const emit = defineEmits<{
  close: [];
}>();

// ==================== Store ====================
const characterStore = useCharacterStore();
const interactionStore = useInteractionStore();

// ==================== 状态 ====================
const userInput = ref('');
const isStreaming = ref(false);
const streamingDialogue = ref<DialogueDataType | null>(null);
const chatContentRef = ref<HTMLElement | null>(null);

// ==================== 计算属性 ====================
const canSend = computed(() => {
  return userInput.value.trim().length > 0 && !isStreaming.value;
});

const displayedDialogues = computed(() => {
  return interactionStore.roomDialogues;
});

// ==================== 方法 ====================

/**
 * 获取角色名称
 */
function getCharacterName(characterId: string): string {
  const character = characterStore.getCharacter(characterId);
  return character?.name || '未知';
}

/**
 * 进入互动室
 */
async function enterRoom(): Promise<void> {
  try {
    await interactionStore.enterRoom();

    // 切换流式传输上下文
    streamService.setContext('interaction_room');

    // 设置流式传输回调
    setupStreamCallbacks();

    console.log('[InteractionRoom] 进入互动室成功');
  } catch (error) {
    console.error('[InteractionRoom] 进入互动室失败:', error);
  }
}

/**
 * 退出互动室
 */
async function exitRoom(): Promise<void> {
  try {
    await interactionStore.exitRoom();

    // 切换回主线剧情上下文
    streamService.setContext('main_plot');

    // 清除流式传输回调
    streamService.clearCallbacks();

    console.log('[InteractionRoom] 退出互动室成功');

    // 触发 close 事件，通知父组件
    emit('close');
  } catch (error) {
    console.error('[InteractionRoom] 退出互动室失败:', error);
  }
}

/**
 * 发送消息
 */
async function sendMessage(): Promise<void> {
  if (!canSend.value) return;

  const message = userInput.value.trim();
  if (!message) return;

  try {
    // 添加用户消息到对话记录
    const userDialogue: DialogueDataType = {
      speaker: '玩家',
      content: message,
      timestamp: Date.now(),
    };
    interactionStore.addDialogue(userDialogue);

    // 清空输入框
    userInput.value = '';

    // 滚动到底部
    await nextTick();
    scrollToBottom();

    // 发送消息触发 AI 生成
    await streamService.sendMessage(message);
  } catch (error) {
    console.error('[InteractionRoom] 发送消息失败:', error);
    toastr.error('发送消息失败');
  }
}

/**
 * 清空对话记录
 */
async function clearDialogues(): Promise<void> {
  if (interactionStore.dialogueCount === 0) {
    toastr.info('对话记录已经是空的');
    return;
  }

  // 确认对话框
  if (!confirm('确定要清空所有对话记录吗？此操作不可恢复。')) {
    return;
  }

  try {
    await interactionStore.clearDialogues();
  } catch (error) {
    console.error('[InteractionRoom] 清空对话记录失败:', error);
  }
}

/**
 * 设置流式传输回调
 */
function setupStreamCallbacks(): void {
  streamService.setCallbacks({
    onIncremental: (text: string) => {
      isStreaming.value = true;
      // 创建临时对话对象用于显示流式内容
      streamingDialogue.value = {
        speaker: 'AI',
        content: text,
        timestamp: Date.now(),
      };
      scrollToBottom();
    },
    onComplete: (text: string) => {
      isStreaming.value = false;

      // 创建完整的对话对象
      const dialogue: DialogueDataType = {
        speaker: 'AI',
        content: text,
        timestamp: Date.now(),
      };

      // 添加到对话记录
      interactionStore.addDialogue(dialogue);

      // 保存到 MVU
      interactionStore.saveDialogues();

      streamingDialogue.value = null;
      scrollToBottom();
    },
    onError: (error: Error) => {
      isStreaming.value = false;
      streamingDialogue.value = null;
      console.error('[InteractionRoom] 流式传输错误:', error);
      toastr.error('AI 响应失败');
    },
  });
}

/**
 * 滚动到底部
 */
function scrollToBottom(): void {
  nextTick(() => {
    if (chatContentRef.value) {
      chatContentRef.value.scrollTop = chatContentRef.value.scrollHeight;
    }
  });
}

/**
 * 格式化时间
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

// ==================== 监听 ====================

// 监听对话记录变化，自动滚动到底部
watch(
  () => interactionStore.dialogueCount,
  () => {
    scrollToBottom();
  },
);

// 组件卸载时清理
onUnmounted(() => {
  if (interactionStore.isInRoom) {
    streamService.setContext('main_plot');
    streamService.clearCallbacks();
  }
});
</script>

<style lang="scss" scoped>
@import '../styles/global.scss';

.interaction-room {
  width: 100%;
  aspect-ratio: 16 / 9;
  background: $color-bg-card;
  border: 2px solid $color-border-gold;
  border-radius: $border-radius-lg;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

// ==================== NPC 选择界面 ====================
.npc-selection-view {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: $spacing-lg;
  overflow-y: auto;
}

.selection-header {
  text-align: center;
  margin-bottom: $spacing-lg;
  padding-bottom: $spacing-md;
  border-bottom: 1px solid $color-border-dark;
}

.selection-title {
  font-size: $font-size-2xl;
  font-weight: $font-weight-bold;
  color: $color-text-gold;
  margin-bottom: $spacing-xs;
  text-shadow: 0 0 10px rgba(212, 175, 55, 0.5);
}

.selection-subtitle {
  font-size: $font-size-sm;
  color: $color-text-secondary;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: $spacing-2xl;
  text-align: center;
}

.empty-text {
  font-size: $font-size-lg;
  color: $color-text-secondary;
  margin-bottom: $spacing-sm;
}

.empty-hint {
  font-size: $font-size-sm;
  color: $color-text-muted;
}

.npc-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: $spacing-md;
  margin-bottom: $spacing-lg;
}

.npc-card {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-md;
  background: rgba(0, 0, 0, 0.4);
  border: 2px solid $color-border-dark;
  border-radius: $border-radius-md;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    border-color: $color-border-gold;
    transform: translateY(-2px);
    box-shadow: $shadow-gold;
  }

  &.selected {
    border-color: $color-primary-gold;
    background: rgba(212, 175, 55, 0.15);
  }
}

.npc-avatar {
  flex-shrink: 0;
  width: 60px;
  aspect-ratio: 1;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid $color-border-gold;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, $color-primary-gold, $color-secondary-gold);
  color: $color-primary-black;
  font-size: $font-size-xl;
  font-weight: $font-weight-bold;
}

.npc-info {
  flex: 1;
  min-width: 0;
}

.npc-name {
  font-size: $font-size-base;
  font-weight: $font-weight-bold;
  color: $color-text-gold;
  margin-bottom: $spacing-xs;
}

.npc-occupation {
  font-size: $font-size-sm;
  color: $color-text-secondary;
  margin-bottom: $spacing-xs;
}

.npc-stats {
  display: flex;
  gap: $spacing-sm;
  align-items: center;
}

.stat-item {
  font-size: $font-size-xs;
  color: $color-text-muted;
}

.important-badge {
  padding: 2px $spacing-xs;
  background: rgba(212, 175, 55, 0.2);
  border: 1px solid $color-border-gold;
  border-radius: $border-radius-sm;
  font-size: $font-size-xs;
  color: $color-text-gold;
}

.selection-indicator {
  flex-shrink: 0;
}

.checkbox {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 2px solid $color-border-dark;
  border-radius: $border-radius-sm;
  color: transparent;
  transition: all $transition-fast;

  &.checked {
    background: $color-primary-gold;
    border-color: $color-primary-gold;
    color: $color-primary-black;
  }
}

.selection-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-md;
  background: rgba(0, 0, 0, 0.3);
  border-radius: $border-radius-md;
  border: 1px solid $color-border-dark;
}

.selection-info {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.info-text {
  font-size: $font-size-sm;
  color: $color-text-secondary;
}

.mode-hint {
  font-size: $font-size-xs;
  color: $color-text-gold;
  font-weight: $font-weight-medium;
}

.btn-enter {
  padding: $spacing-sm $spacing-xl;
  background: linear-gradient(135deg, $color-primary-gold, $color-secondary-gold);
  border: none;
  border-radius: $border-radius-sm;
  color: $color-primary-black;
  font-size: $font-size-base;
  font-weight: $font-weight-bold;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: $shadow-gold;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

// ==================== 聊天室界面 ====================
.chat-room-view {
  display: flex;
  flex-direction: column;
  width: 100%;
  overflow: hidden;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-md $spacing-lg;
  background: rgba(0, 0, 0, 0.5);
  border-bottom: 1px solid $color-border-dark;
}

.header-left {
  display: flex;
  align-items: center;
  gap: $spacing-md;
}

.room-title {
  font-size: $font-size-lg;
  font-weight: $font-weight-bold;
  color: $color-text-gold;
}

.participants {
  display: flex;
  gap: $spacing-xs;
  flex-wrap: wrap;
}

.participant-tag {
  padding: $spacing-xs $spacing-sm;
  background: rgba(212, 175, 55, 0.2);
  border: 1px solid $color-border-gold;
  border-radius: $border-radius-sm;
  font-size: $font-size-xs;
  color: $color-text-gold;
}

.header-actions {
  display: flex;
  gap: $spacing-sm;
}

.btn-clear,
.btn-exit {
  padding: $spacing-xs $spacing-md;
  border: 1px solid $color-border-dark;
  border-radius: $border-radius-sm;
  font-size: $font-size-sm;
  cursor: pointer;
  transition: all $transition-fast;
}

.btn-clear {
  background: rgba(255, 152, 0, 0.2);
  color: #ff9800;
  border-color: #ff9800;

  &:hover {
    background: rgba(255, 152, 0, 0.3);
  }
}

.btn-exit {
  background: rgba(244, 67, 54, 0.2);
  color: $color-danger;
  border-color: $color-danger;

  &:hover {
    background: rgba(244, 67, 54, 0.3);
  }
}

.chat-content {
  flex: 1;
  overflow-y: auto;
  padding: $spacing-md;
  background: rgba(0, 0, 0, 0.2);
}

.empty-chat {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.message-item {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
  padding: $spacing-sm $spacing-md;
  border-radius: $border-radius-md;
  max-width: 80%;
  animation: fadeIn 0.3s ease-in-out;

  &.user-message {
    align-self: flex-end;
    background: rgba(33, 150, 243, 0.2);
    border: 1px solid rgba(33, 150, 243, 0.4);
  }

  &.npc-message {
    align-self: flex-start;
    background: rgba(76, 175, 80, 0.2);
    border: 1px solid rgba(76, 175, 80, 0.4);
  }

  &.streaming {
    opacity: 0.8;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: $spacing-sm;
}

.message-speaker {
  font-size: $font-size-sm;
  font-weight: $font-weight-bold;
  color: $color-text-gold;
}

.message-time {
  font-size: $font-size-xs;
  color: $color-text-muted;
}

.streaming-indicator {
  font-size: $font-size-xs;
  color: $color-text-gold;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.message-content {
  font-size: $font-size-sm;
  color: $color-text-primary;
  line-height: 1.5;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.chat-input-area {
  padding: $spacing-md;
  background: rgba(0, 0, 0, 0.4);
  border-top: 1px solid $color-border-dark;
}

.chat-input {
  width: 100%;
  padding: $spacing-sm;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid $color-border-dark;
  border-radius: $border-radius-sm;
  color: $color-text-primary;
  font-size: $font-size-sm;
  font-family: $font-family-primary;
  resize: none;
  transition: border-color $transition-fast;

  &:focus {
    outline: none;
    border-color: $color-primary-gold;
  }

  &::placeholder {
    color: $color-text-muted;
  }
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: $spacing-sm;
}

.input-hint {
  font-size: $font-size-xs;
  color: $color-text-muted;
}

.btn-send {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  padding: $spacing-sm $spacing-lg;
  background: linear-gradient(135deg, $color-primary-gold, $color-secondary-gold);
  border: none;
  border-radius: $border-radius-sm;
  color: $color-primary-black;
  font-size: $font-size-sm;
  font-weight: $font-weight-bold;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: $shadow-gold;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.send-icon {
  font-size: $font-size-base;
}

// ==================== 浮动退出按钮（右上角） ====================
.floating-exit-btn-top {
  position: fixed;
  top: $spacing-lg;
  right: $spacing-lg;
  width: 50px;
  height: 50px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(244, 67, 54, 0.9);
  border: 2px solid $color-danger;
  border-radius: 50%;
  color: white;
  font-size: $font-size-2xl;
  font-weight: $font-weight-bold;
  cursor: pointer;
  transition: all $transition-fast;
  box-shadow: $shadow-lg;
  z-index: 10000; // 确保在最上层

  &:hover {
    background: rgba(244, 67, 54, 1);
    transform: scale(1.1);
    box-shadow:
      $shadow-lg,
      0 0 20px rgba(244, 67, 54, 0.6);
  }

  &:active {
    transform: scale(1.05);
  }
}
</style>
