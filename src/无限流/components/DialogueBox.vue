<template>
  <div>
    <div v-if="!isClosed" class="dialogue-box" @click="handleBoxClick">
      <!-- 对话显示 -->
      <div ref="dialogueDisplayRef" class="dialogue-display">
        <div v-if="currentText" class="dialogue-content">
          <div ref="dialogueTextRef" class="dialogue-text">{{ displayText }}</div>
          <div v-if="currentParagraphIndex < paragraphs.length - 1" class="continue-hint">点击继续</div>
        </div>
        <div v-else class="dialogue-placeholder">
          <p>欢迎来到无限流世界</p>
          <p class="hint">正在加载最新消息...</p>
        </div>
      </div>

      <!-- 自定义输入框 - 只在 AI 输出完成且所有段落显示完毕后显示 -->
      <div v-if="showInputBox" class="custom-input-container">
        <textarea
          ref="customInputRef"
          v-model="customUserInput"
          class="custom-input-field"
          placeholder="输入你的回复..."
          @keydown.enter.ctrl="handleCustomSend"
        ></textarea>
        <button
          class="custom-send-button"
          :disabled="!customUserInput.trim() || isCustomSending"
          @click="handleCustomSend"
        >
          <span v-if="!isCustomSending">发送</span>
          <span v-else>发送中...</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { npcAnalysisService } from '../services/npcAnalysisService';
import { streamService } from '../services/streamService';
import { useCharacterStore } from '../stores/characterStore';
import { useGameStore } from '../stores/gameStore';
import { useInstanceStore } from '../stores/instanceStore';
import { parseTextIntoParagraphs, type Paragraph } from '../utils/textParser';

// ==================== Store ====================
const gameStore = useGameStore();
const characterStore = useCharacterStore();
const instanceStore = useInstanceStore();

// ==================== Emits ====================
const emit = defineEmits<{
  newMessage: [];
}>();

// ==================== 状态 ====================
const isClosed = ref(false);
const currentText = ref('');
const displayText = ref('');
const dialogueTextRef = ref<HTMLElement | null>(null);
const dialogueDisplayRef = ref<HTMLElement | null>(null);
const customUserInput = ref('');
const isCustomSending = ref(false);
const customInputRef = ref<HTMLTextAreaElement | null>(null);

// 控制输入框显示：只有在 AI 输出完成且所有段落显示完毕后才显示
const showInputBox = ref(false);

// 段落相关状态
const paragraphs = ref<Paragraph[]>([]);
const currentParagraphIndex = ref(0);

// 历史记录保存（用于关闭后恢复）
const savedState = ref<{
  currentText: string;
  displayText: string;
  paragraphs: Paragraph[];
  currentParagraphIndex: number;
} | null>(null);

// ==================== 计算属性 ====================
// const hasDialogue = computed(() => currentDialogue.value !== null);

// ==================== 方法 ====================

// 移除了 closeDialogue 函数，现在通过外部按钮控制显示/隐藏

/**
 * 打开对话框
 * 恢复之前保存的状态
 */
function openDialogue(): void {
  isClosed.value = false;

  // 如果有保存的状态，恢复它
  if (savedState.value) {
    currentText.value = savedState.value.currentText;
    displayText.value = savedState.value.displayText;
    paragraphs.value = savedState.value.paragraphs;
    currentParagraphIndex.value = savedState.value.currentParagraphIndex;

    console.log('[DialogueBox] 打开对话框，已恢复状态');
  }
}

/**
 * 处理对话框点击
 * 如果还有未显示的段落，显示下一段
 * 如果所有段落都显示完毕，显示输入框
 */
function handleBoxClick(): void {
  if (gameStore.isStreaming) {
    return;
  }

  // 如果还有未显示的段落，显示下一段
  if (currentParagraphIndex.value < paragraphs.value.length - 1) {
    currentParagraphIndex.value++;
    showCurrentParagraph();
  } else {
    // 所有段落都显示完毕，显示输入框
    showInputBox.value = true;
    // 聚焦输入框
    nextTick(() => {
      customInputRef.value?.focus();
    });
  }
}

// 暴露方法给父组件
defineExpose({
  openDialogue,
});

/**
 * 滚动到对话框底部
 */
function scrollToBottom(): void {
  // 使用 nextTick 确保 DOM 更新完成
  nextTick(() => {
    // 再次使用 nextTick 确保所有渲染完成
    nextTick(() => {
      if (dialogueDisplayRef.value) {
        dialogueDisplayRef.value.scrollTop = dialogueDisplayRef.value.scrollHeight;
        console.log('[DialogueBox] 滚动到底部，scrollHeight:', dialogueDisplayRef.value.scrollHeight);
      }
    });
  });
}

/**
 * 显示当前段落（立即显示，无动画）
 */
function showCurrentParagraph(): void {
  if (currentParagraphIndex.value >= paragraphs.value.length) {
    return;
  }

  const paragraph = paragraphs.value[currentParagraphIndex.value];

  // 立即显示文本内容
  if (paragraph.content) {
    displayText.value = paragraph.content;
    // 滚动到底部
    scrollToBottom();
  }
}

/**
 * 处理AI的NPC创建指令
 * AI通过{{NPC_CREATE:角色名}}标记来创建NPC
 */
async function processNPCCreation(text: string): Promise<void> {
  if (!text) return;

  // 提取NPC创建指令
  const npcCreatePattern = /\{\{NPC_CREATE:([^}]+)\}\}/g;
  const npcNames: string[] = [];
  let match;

  while ((match = npcCreatePattern.exec(text)) !== null) {
    npcNames.push(match[1].trim());
  }

  if (npcNames.length === 0) return;

  const isInInstance = gameStore.currentInstanceId !== undefined;

  for (const name of npcNames) {
    try {
      const existingNPC = characterStore.npcList.find(npc => npc.name === name);

      if (existingNPC) {
        // 复用现有NPC
        if (isInInstance && gameStore.currentInstanceId) {
          const instance = instanceStore.getInstance(gameStore.currentInstanceId);
          const inInstance = instance?.characters.some(c => c.characterId === existingNPC.id);
          if (!inInstance) {
            await instanceStore.addCharacterToInstance(gameStore.currentInstanceId, existingNPC, false);
            toastr.info(`${name} 加入场景`);
          }
        }
      } else {
        // 生成新NPC
        const npcData = npcAnalysisService.generateNPC(text, name);

        const newNPC: import('../types/character').NPCCharacter = {
          id: `npc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          type: 'npc',
          name,
          age: npcData.age,
          occupation: npcData.occupation,
          background: npcData.background,
          relationship: npcData.relationship,
          attributes: npcData.attributes,
          derivedStats: npcData.derivedStats,
          skills: npcData.skills,
          bodyParts: [],
          inventory: [],
          affection: 50,
          isImportant: false,
          events: [],
        };

        await characterStore.addNPC(newNPC);

        if (isInInstance && gameStore.currentInstanceId) {
          await instanceStore.addCharacterToInstance(gameStore.currentInstanceId, newNPC, false);
        }

        const info = [npcData.occupation, `${npcData.age}岁`];
        if (npcData.relationship) info.push(npcData.relationship);
        toastr.success(`新角色 ${name}（${info.join('，')}）已生成`);
      }
    } catch (error) {
      console.error(`[DialogueBox] 处理角色 ${name} 失败:`, error);
      toastr.error(`处理角色 ${name} 失败`);
    }
  }
}
/**
 * 显示文本内容（立即显示，无动画）
 * 解析文本为段落，并显示第一段
 */
async function showText(text: string): Promise<void> {
  // 隐藏输入框（新内容到来时）
  showInputBox.value = false;

  // 保存原始文本（包含代码块和命令）
  currentText.value = text;

  // 处理NPC创建指令（使用原始文本）- 等待完成
  await processNPCCreation(text);

  // 解析文本为段落（会过滤掉代码块和命令，只显示给用户看的内容）
  paragraphs.value = parseTextIntoParagraphs(text);
  currentParagraphIndex.value = 0;

  // 调试日志
  console.log('[DialogueBox] 原始内容:', text.substring(0, 100) + '...');
  console.log('[DialogueBox] 解析段落数:', paragraphs.value.length);
  paragraphs.value.forEach((p, i) => {
    console.log(`[DialogueBox] 段落 ${i + 1}:`, p.content.substring(0, 50) + (p.content.length > 50 ? '...' : ''));
  });

  // 显示第一段
  if (paragraphs.value.length > 0) {
    showCurrentParagraph();
    // 滚动到底部
    scrollToBottom();
  } else {
    console.warn('[DialogueBox] 解析后没有段落可显示');
  }
}

/**
 * 立即显示完整文本
 * 解析文本为段落，并显示第一段
 */
async function showTextInstantly(text: string): Promise<void> {
  // 隐藏输入框（新内容到来时）
  showInputBox.value = false;

  // 保存原始文本（包含代码块和命令）
  currentText.value = text;

  // 处理NPC创建指令（使用原始文本）- 等待完成
  await processNPCCreation(text);

  // 解析文本为段落（会过滤掉代码块和命令，只显示给用户看的内容）
  paragraphs.value = parseTextIntoParagraphs(text);
  currentParagraphIndex.value = 0;

  // 调试日志
  console.log('[DialogueBox] 原始内容:', text.substring(0, 100) + '...');
  console.log('[DialogueBox] 解析段落数:', paragraphs.value.length);
  paragraphs.value.forEach((p, i) => {
    console.log(`[DialogueBox] 段落 ${i + 1}:`, p.content.substring(0, 50) + (p.content.length > 50 ? '...' : ''));
  });

  // 立即显示第一段
  if (paragraphs.value.length > 0) {
    const paragraph = paragraphs.value[0];
    displayText.value = paragraph.content;

    // 滚动到底部
    scrollToBottom();

    // 如果只有一段，直接显示输入框
    if (paragraphs.value.length === 1) {
      showInputBox.value = true;
      nextTick(() => {
        customInputRef.value?.focus();
      });
    }
  } else {
    console.warn('[DialogueBox] 解析后没有段落可显示');
    displayText.value = '';
  }
}

/**
 * 加载最新的 AI 消息
 */
async function loadLatestMessage(): Promise<void> {
  try {
    console.log('[DialogueBox] 开始加载最新消息...');

    // 获取最后一条消息
    const lastMessages = getChatMessages(-1);

    if (lastMessages && lastMessages.length > 0) {
      const lastMessage = lastMessages[0];

      console.log('[DialogueBox] 最后一条消息:', {
        role: lastMessage.role,
        message_id: lastMessage.message_id,
        content: lastMessage.message.substring(0, 50) + '...',
      });

      // 检查是否是 AI 消息（assistant 或 system）
      if ((lastMessage.role === 'assistant' || lastMessage.role === 'system') && lastMessage.message) {
        console.log('[DialogueBox] 显示最新的 AI 消息');
        // 直接显示消息内容 - 等待 NPC 创建完成
        await showTextInstantly(lastMessage.message);
      } else if (lastMessage.role === 'user') {
        // 如果最后一条是用户消息，显示占位文本
        console.log('[DialogueBox] 最后一条是用户消息，等待 AI 回复');
        currentText.value = '等待 AI 回复...';
        displayText.value = '等待 AI 回复...';
      }
    } else {
      console.log('[DialogueBox] 未找到任何消息，显示欢迎信息');
      currentText.value = '欢迎来到无限流世界';
      displayText.value = '欢迎来到无限流世界';
    }

    // 滚动到底部
    scrollToBottom();
  } catch (error) {
    console.error('[DialogueBox] 加载最新消息失败:', error);
  }
}

/**
 * 设置流式传输回调
 * 这个函数可以被多次调用以重新注册回调
 */
function setupStreamCallbacks(): void {
  console.log('[DialogueBox] 设置流式传输回调');

  streamService.setCallbacks({
    onIncremental: async (text: string) => {
      console.log('[DialogueBox] 接收到增量文本，长度:', text.length);
      // 流式传输中，实时显示文本
      if (text && text.trim()) {
        await showText(text);
        // 通知父组件有新消息
        emit('newMessage');
        // 如果对话框被关闭，自动打开以显示新消息
        if (isClosed.value) {
          console.log('[DialogueBox] 对话框已关闭，自动打开以显示新消息');
          isClosed.value = false;
        }
      }
    },
    onComplete: async (text: string) => {
      console.log('[DialogueBox] 流式传输完成，文本长度:', text.length);
      // 流式传输完成，显示完整文本
      if (text && text.trim()) {
        await showTextInstantly(text);
        // 通知父组件有新消息
        emit('newMessage');
        // 如果对话框被关闭，自动打开以显示新消息
        if (isClosed.value) {
          console.log('[DialogueBox] 对话框已关闭，自动打开以显示新消息');
          isClosed.value = false;
        }
      }
    },
    onError: (error: Error) => {
      console.error('[DialogueBox] 流式传输错误:', error);
      toastr.error('接收对话失败');
    },
  });
}

/**
 * 处理自定义输入框的发送
 * 将内容同步到酒馆输入框并触发发送
 */
async function handleCustomSend(): Promise<void> {
  if (!customUserInput.value.trim() || isCustomSending.value) return;

  const message = customUserInput.value.trim();

  try {
    isCustomSending.value = true;

    console.log('[DialogueBox] 用户输入:', message);

    // 查找酒馆的输入框和发送按钮
    const $tavernTextarea = $('#send_textarea', window.parent.document);
    const $sendButton = $('#send_but', window.parent.document);

    if ($tavernTextarea.length > 0 && $sendButton.length > 0) {
      // 1. 将内容设置到酒馆的输入框
      $tavernTextarea.val(message);

      // 触发 input 事件，确保酒馆知道内容已更改
      $tavernTextarea.trigger('input');

      console.log('[DialogueBox] 已将内容同步到酒馆输入框');

      // 2. 清空自定义输入框并隐藏
      customUserInput.value = '';
      showInputBox.value = false;

      // 3. 显示等待提示
      currentText.value = '等待 AI 回复...';
      displayText.value = '等待 AI 回复...';

      // 4. 触发酒馆的发送按钮点击
      $sendButton.trigger('click');

      console.log('[DialogueBox] 已触发酒馆发送按钮');
    } else {
      console.error('[DialogueBox] 未找到酒馆输入框或发送按钮');
      toastr.error('无法发送消息：未找到酒馆输入框');
      // 恢复输入内容
      customUserInput.value = message;
    }
  } catch (error) {
    console.error('[DialogueBox] 发送消息失败:', error);
    toastr.error('发送消息失败');
    // 恢复输入内容
    customUserInput.value = message;
  } finally {
    isCustomSending.value = false;
  }
}

// ==================== 流式传输监听 ====================
onMounted(async () => {
  console.log('[DialogueBox] 组件开始挂载');

  // 设置流式传输回调
  setupStreamCallbacks();

  // 加载最新的消息
  await loadLatestMessage();

  console.log('[DialogueBox] 组件挂载完成');
});

// 监听游戏模式变化，当从其他模式返回主游戏时重新设置回调
watch(
  () => gameStore.mode,
  (newMode, oldMode) => {
    console.log('[DialogueBox] 游戏模式变化:', oldMode, '->', newMode);
    if (newMode === 'main' && oldMode !== 'main') {
      console.log('[DialogueBox] 返回主游戏模式，重新设置流式传输回调');
      setupStreamCallbacks();
    }
  },
);

// ==================== 清理 ====================
onBeforeUnmount(() => {
  console.log('[DialogueBox] 组件即将卸载');

  // 注意：不清除 streamService 回调，因为：
  // 1. DialogueBox 可能只是被隐藏而不是真正卸载
  // 2. 其他组件（如 SanctuaryView）可能会清除回调
  // 3. 我们希望在重新打开时仍能接收消息
  console.log('[DialogueBox] 组件卸载完成（保留流式传输回调）');
});
</script>

<style lang="scss" scoped>
@import '../styles/global.scss';

.dialogue-box {
  position: fixed;
  bottom: var(--dialogue-bottom-offset);
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - var(--dialogue-side-margin));
  max-width: 800px;
  min-height: 120px;
  max-height: var(--dialogue-max-height);
  background: $color-bg-overlay;
  border: 2px solid $color-border-gold;
  border-radius: $border-radius-lg;
  padding: $spacing-lg;
  z-index: $z-index-dialogue;
  box-shadow: $shadow-lg, $shadow-gold;
  cursor: pointer;
  transition: all $transition-base;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;

  @include mobile {
    min-height: 100px;
    padding: $spacing-md;
    border-width: 1px;
    border-radius: $border-radius-md;
  }

  @include small-screen {
    padding: $spacing-sm;
  }

  &:hover {
    border-color: $color-secondary-gold;
    box-shadow:
      $shadow-lg,
      0 0 30px rgba(212, 175, 55, 0.5);
  }
}

// 移除了关闭按钮样式，现在通过外部切换按钮控制

.dialogue-display {
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto; // 内容超出时显示滚动条
  min-height: 0; // 允许 flex 子元素缩小
}

.dialogue-content {
  flex: 1;
  min-height: 0; // 允许 flex 子元素缩小
}

.dialogue-text {
  font-size: $font-size-base;
  color: $color-text-primary;
  line-height: 1.8;
  white-space: pre-wrap;
  word-wrap: break-word;

  @include mobile {
    font-size: $font-size-sm;
    line-height: 1.6;
  }
}

.continue-hint {
  margin-top: $spacing-md;
  font-size: $font-size-sm;
  color: $color-text-muted;
  text-align: right;
  font-style: italic;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}

.dialogue-placeholder {
  font-size: $font-size-base;
  color: $color-text-secondary;
  text-align: center;
  padding: $spacing-xl 0;

  p {
    margin: $spacing-sm 0;
  }

  .hint {
    font-size: $font-size-sm;
    color: $color-text-muted;
    font-style: italic;
  }
}

.custom-input-container {
  margin-top: $spacing-md;
  padding-top: $spacing-md;
  border-top: 1px solid rgba(212, 175, 55, 0.3);
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  width: 100%;
  box-sizing: border-box;
  flex-shrink: 0;

  @include mobile {
    margin-top: $spacing-sm;
    padding-top: $spacing-sm;
    gap: $spacing-xs;
  }

  @include small-screen {
    margin-top: $spacing-xs;
    padding-top: $spacing-xs;
    gap: 4px;
  }
}

.custom-input-field {
  width: 100%;
  min-height: 80px;
  max-height: 120px;
  padding: $spacing-md;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid $color-border-light;
  border-radius: $border-radius-md;
  color: $color-text-primary;
  font-size: $font-size-base;
  font-family: $font-family-primary;
  resize: vertical;
  outline: none;
  transition: border-color $transition-base;
  box-sizing: border-box;

  @include mobile {
    min-height: 50px;
    max-height: 80px;
    padding: $spacing-sm;
    font-size: 16px; // 防止 iOS 自动缩放
  }

  @include small-screen {
    min-height: 40px;
    max-height: 60px;
    padding: $spacing-xs;
  }

  &:focus {
    border-color: $color-primary-gold;
  }

  &::placeholder {
    color: $color-text-muted;
  }
}

.custom-send-button {
  align-self: flex-end;
  padding: $spacing-sm $spacing-lg;
  background: linear-gradient(135deg, $color-primary-gold, $color-dark-gold);
  border: none;
  border-radius: $border-radius-md;
  color: $color-primary-black;
  font-size: $font-size-base;
  font-weight: $font-weight-bold;
  cursor: pointer;
  transition: all $transition-base;
  box-shadow: $shadow-sm;
  white-space: nowrap;
  flex-shrink: 0;

  @include mobile {
    padding: $spacing-xs $spacing-md;
    font-size: $font-size-sm;
  }

  @include small-screen {
    padding: $spacing-xs $spacing-sm;
    font-size: $font-size-xs;
  }

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, $color-secondary-gold, $color-primary-gold);
    box-shadow: $shadow-md, $shadow-gold;
    transform: translateY(-2px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: $shadow-sm;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
</style>
