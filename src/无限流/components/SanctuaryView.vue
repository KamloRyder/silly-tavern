<template>
  <div class="sanctuary-view">
    <!-- 归所视图 -->
    <div v-if="currentView === 'sanctuary'" class="sanctuary-container">
      <!-- 背景图层 -->
      <div class="sanctuary-background" :style="backgroundStyle">
        <!-- 家具图层 -->
        <div
          v-for="furniture in sanctuary?.furniture || []"
          :key="furniture.id"
          class="furniture-item"
          :style="getItemStyle(furniture.position)"
          @click="handleItemClick(furniture.id, furniture.name)"
        >
          <img v-if="furniture.imageUrl" :src="furniture.imageUrl" :alt="furniture.name" />
          <div v-else class="placeholder-item">{{ furniture.name }}</div>
        </div>

        <!-- 纪念品图层 -->
        <div
          v-for="memento in sanctuary?.mementos || []"
          :key="memento.mementoId"
          class="memento-item"
          :style="getMementoStyle(memento)"
          @click="handleMementoClick(memento.mementoId)"
        >
          <div class="memento-placeholder">纪念品</div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="sanctuary-actions">
        <button class="action-btn" @click="toggleArrangeMode">
          <span>{{ arrangeMode ? '完成整理' : '整理' }}</span>
        </button>
        <button class="action-btn" @click="showInviteDialog = true">
          <span>邀请 NPC</span>
        </button>
        <button class="action-btn" @click="showJournalDialog = true">
          <span>日志</span>
        </button>
        <button class="action-btn close-btn" @click="closeSanctuary">
          <span>返回</span>
        </button>
      </div>
    </div>

    <!-- 聊天室视图 -->
    <div v-else-if="currentView === 'chat'" class="chat-container">
      <!-- 聊天界面头部 -->
      <div class="chat-header">
        <div class="chat-title">
          <span>与 {{ invitedNPCNames }} 的对话</span>
        </div>
        <button class="back-btn" @click="returnToSanctuary">
          <span>返回归所</span>
        </button>
      </div>

      <!-- 聊天消息区域 -->
      <div ref="chatMessagesRef" class="chat-messages">
        <div v-if="chatMessages.length === 0" class="no-messages">
          <p>开始与 NPC 对话吧...</p>
        </div>
        <div v-for="(message, index) in chatMessages" :key="index" class="message-item" :class="message.role">
          <div class="message-content">
            <div class="message-author">{{ message.author }}</div>
            <div class="message-text">{{ message.content }}</div>
          </div>
        </div>
      </div>

      <!-- 聊天输入区域 -->
      <div class="chat-input-container">
        <textarea
          v-model="chatInput"
          class="chat-input"
          placeholder="输入你的消息... (Ctrl+Enter 发送)"
          @keydown.ctrl.enter="sendChatMessage"
        ></textarea>
        <button class="send-btn" :disabled="!chatInput.trim() || isSending" @click="sendChatMessage">
          <span v-if="!isSending">发送</span>
          <span v-else>发送中...</span>
        </button>
      </div>
    </div>

    <!-- NPC 邀请对话框 -->
    <div v-if="showInviteDialog" class="modal-overlay" @click.self="showInviteDialog = false">
      <div class="invite-dialog">
        <h3>邀请 NPC</h3>
        <div class="npc-list">
          <div v-for="npc in availableNPCs" :key="npc.id" class="npc-option">
            <label>
              <input v-model="selectedNPCs" type="checkbox" :value="npc.id" />
              <span class="npc-name">{{ npc.name }}</span>
              <span class="npc-info">{{ npc.occupation }}</span>
            </label>
          </div>
        </div>
        <div class="dialog-actions">
          <button class="btn-primary" :disabled="selectedNPCs.length === 0" @click="inviteSelectedNPCs">
            确认邀请 ({{ selectedNPCs.length }})
          </button>
          <button class="btn-secondary" @click="showInviteDialog = false">取消</button>
        </div>
      </div>
    </div>

    <!-- 日志对话框 -->
    <Teleport to="body">
      <div v-if="showJournalDialog" class="modal-overlay" @click.self="showJournalDialog = false">
        <div class="journal-modal-container">
          <JournalView @close="showJournalDialog = false" />
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { apiConfigService } from '../services/apiConfigService';
import type { MementoDisplay, SanctuaryData } from '../services/sanctuaryService';
import { sanctuaryService } from '../services/sanctuaryService';
import { useInstanceStore } from '../stores/instanceStore';
import JournalView from './JournalView.vue';

const instanceStore = useInstanceStore();

// Emits
const emit = defineEmits<{
  close: [];
}>();

// 视图状态
const currentView = ref<'sanctuary' | 'chat'>('sanctuary');

// 归所状态
const sanctuary = ref<SanctuaryData | null>(null);
const showInviteDialog = ref(false);
const showJournalDialog = ref(false);
const selectedNPCs = ref<string[]>([]);
const arrangeMode = ref(false);
const isLoading = ref(false);

// 聊天状态
const chatInput = ref('');
const isSending = ref(false);
const chatMessages = ref<Array<{ role: 'user' | 'assistant'; author: string; content: string }>>([]);
const chatMessagesRef = ref<HTMLElement | null>(null);
const currentInvitedNPCs = ref<string[]>([]);

// 计算属性
const backgroundStyle = computed(() => {
  if (!sanctuary.value) return {};
  return {
    backgroundImage: `url(${sanctuary.value.backgroundImage})`,
  };
});

const availableNPCs = computed(() => {
  const allInstances = instanceStore.getAllInstances();
  const npcs: Array<{ id: string; name: string; occupation: string }> = [];

  for (const instance of allInstances) {
    for (const charInInstance of instance.characters) {
      if (charInInstance.character) {
        npcs.push({
          id: charInInstance.characterId,
          name: charInInstance.character.name,
          occupation: charInInstance.character.occupation || '未知',
        });
      }
    }
  }

  return npcs;
});

const invitedNPCNames = computed(() => {
  if (currentInvitedNPCs.value.length === 0) return '';

  const names = currentInvitedNPCs.value.map(npcId => {
    const npc = availableNPCs.value.find(n => n.id === npcId);
    return npc ? npc.name : npcId;
  });

  return names.join('、');
});

// 方法
function getItemStyle(position: { x: number; y: number }) {
  return {
    left: `${position.x}px`,
    top: `${position.y}px`,
  };
}

function getMementoStyle(memento: MementoDisplay) {
  return {
    left: `${memento.position.x}px`,
    top: `${memento.position.y}px`,
    transform: `scale(${memento.scale})`,
  };
}

function toggleArrangeMode() {
  arrangeMode.value = !arrangeMode.value;
  if (arrangeMode.value) {
    toastr.info('整理模式已开启，点击物品进行互动');
  } else {
    toastr.success('整理完成');
  }
}

async function handleItemClick(itemId: string, itemName: string) {
  if (!arrangeMode.value) return;

  try {
    const description = await sanctuaryService.interactWithItem(itemId);
    toastr.info(`${itemName}: ${description}`);
  } catch (error) {
    console.error('[SanctuaryView] 物品互动失败:', error);
  }
}

async function handleMementoClick(mementoId: string) {
  if (!arrangeMode.value) return;

  try {
    const description = await sanctuaryService.interactWithItem(mementoId);
    toastr.info(`纪念品: ${description}`);
  } catch (error) {
    console.error('[SanctuaryView] 纪念品互动失败:', error);
  }
}

async function inviteSelectedNPCs() {
  if (selectedNPCs.value.length === 0) {
    toastr.warning('请至少选择一位 NPC');
    return;
  }

  try {
    isLoading.value = true;
    await sanctuaryService.inviteNPC(selectedNPCs.value);

    // 保存当前邀请的 NPC
    currentInvitedNPCs.value = [...selectedNPCs.value];

    // 关闭邀请对话框
    showInviteDialog.value = false;
    selectedNPCs.value = [];

    // 加载历史对话（需求 8.3）
    await loadConversationHistory();

    // 切换到聊天视图
    currentView.value = 'chat';

    toastr.success('NPC 已邀请到归所，开始对话');
  } catch (error) {
    console.error('[SanctuaryView] 邀请 NPC 失败:', error);
    toastr.error('邀请失败');
  } finally {
    isLoading.value = false;
  }
}

/**
 * 返回归所视图
 * 退出聊天时切换回现实世界 API（需求 8.2）
 */
async function returnToSanctuary() {
  // 保存对话历史（需求 8.3）
  if (currentInvitedNPCs.value.length > 0 && chatMessages.value.length > 0) {
    try {
      await sanctuaryService.saveConversation(currentInvitedNPCs.value, chatMessages.value);
      console.log('[SanctuaryView] 对话历史已保存');
    } catch (error) {
      console.error('[SanctuaryView] 保存对话历史失败:', error);
    }
  }

  // 切换回现实世界 API
  apiConfigService.switchToRealWorld();
  console.log('[SanctuaryView] 已切换回现实世界 API');

  // 切换视图
  currentView.value = 'sanctuary';

  // 清空当前邀请的 NPC
  currentInvitedNPCs.value = [];

  toastr.info('已返回归所');
}

/**
 * 发送聊天消息
 */
async function sendChatMessage() {
  if (!chatInput.value.trim() || isSending.value) return;

  const message = chatInput.value.trim();

  try {
    isSending.value = true;

    // 添加用户消息到聊天记录
    chatMessages.value.push({
      role: 'user',
      author: '你',
      content: message,
    });

    // 清空输入框
    chatInput.value = '';

    // 滚动到底部
    await nextTick();
    scrollChatToBottom();

    console.log('[SanctuaryView] 发送消息到归所:', message);

    // 获取归所 API 配置
    const apiConfig = apiConfigService.getCurrentAPI();

    let response: string;
    if (apiConfig) {
      // 使用自定义归所 API
      response = await generateRaw({
        ordered_prompts: [{ role: 'user', content: message }],
        custom_api: {
          apiurl: apiConfig.apiurl,
          key: apiConfig.key,
          model: apiConfig.model,
          temperature: apiConfig.temperature,
          max_tokens: apiConfig.max_tokens,
        },
      });
    } else {
      // 使用酒馆默认 API
      response = await generate({ user_input: message });
    }

    // 添加 AI 回复到聊天记录
    chatMessages.value.push({
      role: 'assistant',
      author: invitedNPCNames.value || 'NPC',
      content: response,
    });

    // 滚动到底部
    await nextTick();
    scrollChatToBottom();

    console.log('[SanctuaryView] 收到 AI 回复');
  } catch (error) {
    console.error('[SanctuaryView] 发送消息失败:', error);
    toastr.error('发送消息失败');
  } finally {
    isSending.value = false;
  }
}

/**
 * 滚动聊天消息到底部
 */
function scrollChatToBottom() {
  if (chatMessagesRef.value) {
    chatMessagesRef.value.scrollTop = chatMessagesRef.value.scrollHeight;
  }
}

/**
 * 加载对话历史
 * 在进入聊天时加载历史对话并显示（需求 8.3）
 */
async function loadConversationHistory() {
  try {
    if (currentInvitedNPCs.value.length === 0) {
      chatMessages.value = [];
      return;
    }

    const history = await sanctuaryService.getConversationHistory(currentInvitedNPCs.value);

    if (history && history.messages && history.messages.length > 0) {
      chatMessages.value = history.messages;
      console.log('[SanctuaryView] 已加载对话历史，消息数:', history.messages.length);

      // 滚动到底部
      await nextTick();
      scrollChatToBottom();

      toastr.info(`已加载 ${history.messages.length} 条历史消息`);
    } else {
      chatMessages.value = [];
      console.log('[SanctuaryView] 无历史对话，开始新对话');
    }
  } catch (error) {
    console.error('[SanctuaryView] 加载对话历史失败:', error);
    chatMessages.value = [];
  }
}

/**
 * 关闭归所，返回主界面
 */
function closeSanctuary() {
  emit('close');
  toastr.info('返回主界面');
}

// 生命周期
onMounted(async () => {
  try {
    await sanctuaryService.initialize();
    sanctuary.value = await sanctuaryService.getSanctuary();
    console.log('[SanctuaryView] 归所数据已加载');
  } catch (error) {
    console.error('[SanctuaryView] 加载归所数据失败:', error);
    toastr.error('加载归所失败');
  }
});
</script>

<style lang="scss" scoped>
@import '../styles/global.scss';

.sanctuary-view {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.sanctuary-container,
.chat-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.sanctuary-background {
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  position: relative;
  background-color: #2a2a2a;
}

.furniture-item,
.memento-item {
  position: absolute;
  cursor: pointer;
  transition: transform $transition-fast;

  &:hover {
    transform: scale(1.05);
  }

  img {
    max-width: 100px;
    max-height: 100px;
    object-fit: contain;
  }
}

.placeholder-item,
.memento-placeholder {
  padding: $spacing-sm $spacing-md;
  background: rgba(0, 0, 0, 0.7);
  border: 2px solid $color-border-gold;
  border-radius: $border-radius-sm;
  color: $color-text-gold;
  font-size: $font-size-sm;
  white-space: nowrap;
}

.sanctuary-actions {
  position: absolute;
  bottom: $spacing-lg;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: $spacing-md;
  z-index: 10;

  @include mobile {
    bottom: $spacing-md;
    gap: $spacing-sm;
    flex-wrap: wrap;
    justify-content: center;
  }
}

.action-btn {
  padding: $spacing-sm $spacing-lg;
  background: rgba(0, 0, 0, 0.8);
  border: 2px solid $color-border-gold;
  color: $color-text-gold;
  font-size: $font-size-base;
  cursor: pointer;
  transition: all $transition-fast;
  font-family: $font-family-primary;

  @include mobile {
    padding: $spacing-xs $spacing-md;
    font-size: $font-size-sm;
  }

  &:hover {
    background: rgba(212, 175, 55, 0.2);
    border-color: $color-primary-gold;
    transform: translateY(-2px);
    box-shadow: $shadow-gold;
  }

  &.close-btn {
    border-color: $color-border-dark;
    color: $color-text-secondary;

    &:hover {
      border-color: $color-text-secondary;
      background: rgba(255, 255, 255, 0.1);
    }
  }
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.invite-dialog {
  @include modal-container;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;

  h3 {
    @include modal-title;
    margin-bottom: $spacing-lg;
  }
}

.journal-modal-container {
  width: 90%;
  max-width: 1200px;
  height: 85vh;
  max-height: 800px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);

  @include mobile {
    width: 95%;
    height: 90vh;
  }
}

.npc-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  margin-bottom: $spacing-lg;
  max-height: 400px;
  overflow-y: auto;
}

.npc-option {
  label {
    display: flex;
    align-items: center;
    gap: $spacing-md;
    padding: $spacing-md;
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid $color-border-dark;
    border-radius: $border-radius-sm;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
      border-color: $color-border-gold;
      background: rgba(212, 175, 55, 0.1);
    }

    input[type='checkbox'] {
      width: 20px;
      height: 20px;
      cursor: pointer;
    }
  }
}

.npc-name {
  font-weight: $font-weight-bold;
  color: $color-text-primary;
  flex: 0 0 auto;
}

.npc-info {
  color: $color-text-secondary;
  font-size: $font-size-sm;
  flex: 1;
}

.dialog-actions {
  display: flex;
  gap: $spacing-md;
  justify-content: flex-end;

  @include mobile {
    flex-direction: column;
  }
}

.btn-primary,
.btn-secondary {
  padding: $spacing-sm $spacing-lg;
  font-size: $font-size-base;
  cursor: pointer;
  transition: all $transition-fast;
  font-family: $font-family-primary;

  @include mobile {
    padding: $spacing-sm $spacing-md;
    font-size: $font-size-sm;
  }
}

.btn-primary {
  background: $color-primary-gold;
  color: $color-primary-black;
  border: 2px solid $color-primary-gold;

  &:hover:not(:disabled) {
    background: lighten($color-primary-gold, 10%);
    transform: translateY(-2px);
    box-shadow: $shadow-gold;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.btn-secondary {
  background: transparent;
  color: $color-text-secondary;
  border: 2px solid $color-border-dark;

  &:hover {
    border-color: $color-text-secondary;
    color: $color-text-primary;
  }
}

.placeholder-text {
  color: $color-text-secondary;
  text-align: center;
  padding: $spacing-xl;
  font-size: $font-size-base;
}

// ==================== 聊天室样式 ====================

.chat-container {
  display: flex;
  flex-direction: column;
  background: $color-bg-primary;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-md $spacing-lg;
  background: rgba(0, 0, 0, 0.8);
  border-bottom: 2px solid $color-border-gold;

  @include mobile {
    padding: $spacing-sm $spacing-md;
  }
}

.chat-title {
  font-size: $font-size-lg;
  font-weight: $font-weight-bold;
  color: $color-text-gold;

  @include mobile {
    font-size: $font-size-base;
  }
}

.back-btn {
  padding: $spacing-xs $spacing-md;
  background: transparent;
  border: 2px solid $color-border-dark;
  color: $color-text-secondary;
  font-size: $font-size-sm;
  cursor: pointer;
  transition: all $transition-fast;
  font-family: $font-family-primary;

  &:hover {
    border-color: $color-text-secondary;
    color: $color-text-primary;
    background: rgba(255, 255, 255, 0.1);
  }
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: $spacing-lg;
  display: flex;
  flex-direction: column;
  gap: $spacing-md;

  @include mobile {
    padding: $spacing-md;
    gap: $spacing-sm;
  }
}

.no-messages {
  text-align: center;
  color: $color-text-secondary;
  padding: $spacing-xl;
  font-size: $font-size-base;
}

.message-item {
  display: flex;
  animation: fadeIn 0.3s ease-in-out;

  &.user {
    justify-content: flex-end;

    .message-content {
      background: rgba(212, 175, 55, 0.2);
      border-color: $color-border-gold;
    }
  }

  &.assistant {
    justify-content: flex-start;

    .message-content {
      background: rgba(0, 0, 0, 0.6);
      border-color: $color-border-light;
    }
  }
}

.message-content {
  max-width: 70%;
  padding: $spacing-md;
  border: 1px solid;
  border-radius: $border-radius-md;
  word-wrap: break-word;

  @include mobile {
    max-width: 85%;
    padding: $spacing-sm;
  }
}

.message-author {
  font-size: $font-size-sm;
  font-weight: $font-weight-bold;
  color: $color-text-gold;
  margin-bottom: $spacing-xs;
}

.message-text {
  font-size: $font-size-base;
  color: $color-text-primary;
  line-height: 1.6;
  white-space: pre-wrap;

  @include mobile {
    font-size: $font-size-sm;
  }
}

.chat-input-container {
  padding: $spacing-md $spacing-lg;
  background: rgba(0, 0, 0, 0.8);
  border-top: 2px solid $color-border-gold;
  display: flex;
  gap: $spacing-md;
  align-items: flex-end;

  @include mobile {
    padding: $spacing-sm $spacing-md;
    gap: $spacing-sm;
  }
}

.chat-input {
  flex: 1;
  min-height: 60px;
  max-height: 120px;
  padding: $spacing-sm;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid $color-border-light;
  border-radius: $border-radius-sm;
  color: $color-text-primary;
  font-size: $font-size-base;
  font-family: $font-family-primary;
  resize: vertical;
  outline: none;
  transition: border-color $transition-fast;

  @include mobile {
    min-height: 50px;
    max-height: 80px;
    font-size: 16px; // 防止 iOS 自动缩放
  }

  &:focus {
    border-color: $color-primary-gold;
  }

  &::placeholder {
    color: $color-text-muted;
  }
}

.send-btn {
  padding: $spacing-sm $spacing-lg;
  background: $color-primary-gold;
  color: $color-primary-black;
  border: 2px solid $color-primary-gold;
  font-size: $font-size-base;
  font-weight: $font-weight-bold;
  cursor: pointer;
  transition: all $transition-fast;
  white-space: nowrap;
  font-family: $font-family-primary;

  @include mobile {
    padding: $spacing-xs $spacing-md;
    font-size: $font-size-sm;
  }

  &:hover:not(:disabled) {
    background: lighten($color-primary-gold, 10%);
    transform: translateY(-2px);
    box-shadow: $shadow-gold;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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
</style>
