<template>
  <div>
    <div v-if="!isClosed" class="dialogue-box" :class="{ 'input-mode': isInputMode }" @click="handleBoxClick">
      <!-- 关闭按钮 -->
      <button class="close-button" title="关闭对话框" @click.stop="closeDialogue">✕</button>

      <!-- 对话显示模式 -->
      <div v-if="!isInputMode" class="dialogue-display">
        <div v-if="currentDialogue" class="dialogue-content">
          <div ref="dialogueTextRef" class="dialogue-text">{{ displayText }}</div>
          <div v-if="currentParagraphIndex < paragraphs.length - 1" class="continue-hint">
            点击继续 ({{ currentParagraphIndex + 1 }}/{{ paragraphs.length }})
          </div>
        </div>
        <div v-else class="dialogue-placeholder">
          <p>欢迎来到无限流世界</p>
          <p class="hint">正在加载初始消息...</p>
        </div>
      </div>

      <!-- 用户输入模式 -->
      <div v-else class="dialogue-input">
        <textarea
          ref="inputRef"
          v-model="userInput"
          class="input-field"
          placeholder="输入你的回复..."
          @keydown.enter.ctrl="handleSend"
          @click.stop
        ></textarea>
        <button class="send-button" :disabled="!userInput.trim() || isSending" @click.stop="handleSend">
          <span v-if="!isSending">发送</span>
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
import type { DialogueDataType } from '../types/schemas';
import { typewriter } from '../utils/animation';
import { parseTextIntoParagraphs, type Paragraph } from '../utils/textParser';

// ==================== Store ====================
const gameStore = useGameStore();
const characterStore = useCharacterStore();
const instanceStore = useInstanceStore();

// ==================== Emits ====================
const emit = defineEmits<{
  closed: [];
  continue: [];
}>();

// ==================== 状态 ====================
const isInputMode = ref(false);
const isClosed = ref(false);
const userInput = ref('');
const isSending = ref(false);
const currentDialogue = ref<DialogueDataType | null>(null);
const displayText = ref('');
const dialogueTextRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLTextAreaElement | null>(null);
const currentTypewriterTween = ref<gsap.core.Tween | null>(null);

// 段落相关状态
const paragraphs = ref<Paragraph[]>([]);
const currentParagraphIndex = ref(0);

// ==================== 计算属性 ====================
// const hasDialogue = computed(() => currentDialogue.value !== null);

// ==================== 方法 ====================

/**
 * 关闭对话框
 */
function closeDialogue(): void {
  isClosed.value = true;
  emit('closed');
}

/**
 * 打开对话框
 */
function openDialogue(): void {
  isClosed.value = false;
}

/**
 * 处理对话框点击
 * 如果还有未显示的段落，显示下一段
 * 如果所有段落都显示完毕，切换到输入模式
 */
function handleBoxClick(): void {
  if (isInputMode.value || gameStore.isStreaming) {
    return;
  }

  // 如果还有未显示的段落，显示下一段
  if (currentParagraphIndex.value < paragraphs.value.length - 1) {
    currentParagraphIndex.value++;
    showCurrentParagraph();
  } else {
    // 所有段落都显示完毕，切换到输入模式
    isInputMode.value = true;
    // 等待 DOM 更新后聚焦输入框
    nextTick(() => {
      inputRef.value?.focus();
    });
  }
}

// 暴露方法给父组件
defineExpose({
  openDialogue,
});

/**
 * 处理发送按钮点击
 */
async function handleSend(): Promise<void> {
  if (!userInput.value.trim() || isSending.value) return;

  try {
    isSending.value = true;
    const message = userInput.value.trim();

    // 清空输入
    userInput.value = '';

    // 切换回显示模式
    isInputMode.value = false;

    // 发送消息
    await streamService.sendMessage(message);
  } catch (error) {
    console.error('[DialogueBox] 发送消息失败:', error);
    toastr.error('发送消息失败');
  } finally {
    isSending.value = false;
  }
}

/**
 * 显示当前段落
 */
function showCurrentParagraph(): void {
  if (currentParagraphIndex.value >= paragraphs.value.length) {
    return;
  }

  const paragraph = paragraphs.value[currentParagraphIndex.value];

  // 停止之前的打字机动画
  if (currentTypewriterTween.value) {
    currentTypewriterTween.value.kill();
  }

  // 等待 DOM 更新
  nextTick(() => {
    if (dialogueTextRef.value && paragraph.content) {
      // 使用打字机效果显示文本
      displayText.value = '';
      currentTypewriterTween.value = typewriter(
        dialogueTextRef.value,
        paragraph.content,
        30, // 30 字符/秒
        () => {
          currentTypewriterTween.value = null;
        },
      );
    }
  });
}

/**
 * 处理AI的NPC创建指令
 * AI通过{{NPC_CREATE:角色名}}标记来创建NPC
 */
async function processNPCCreation(): Promise<void> {
  if (!currentDialogue.value?.content) return;

  // 提取NPC创建指令
  const npcCreatePattern = /\{\{NPC_CREATE:([^}]+)\}\}/g;
  const npcNames: string[] = [];
  let match;

  while ((match = npcCreatePattern.exec(currentDialogue.value.content)) !== null) {
    npcNames.push(match[1].trim());
  }

  if (npcNames.length === 0) return;

  const isInInstance = gameStore.currentInstanceId !== undefined;
  const fullText = currentDialogue.value.content;

  for (const name of npcNames) {
    try {
      const existingNPC = characterStore.npcList.find(npc => npc.name === name);

      if (existingNPC) {
        // 复用现有NPC
        if (isInInstance && gameStore.currentInstanceId) {
          const inInstance = instanceStore.getCharacterInInstance(gameStore.currentInstanceId, existingNPC.id);
          if (!inInstance) {
            await instanceStore.addCharacterToInstance(gameStore.currentInstanceId, existingNPC, false);
            toastr.info(`${name} 加入场景`);
          }
        }
      } else {
        // 生成新NPC
        const npcData = npcAnalysisService.generateNPC(fullText, name);

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
 * 显示对话内容（带打字机效果）
 * 解析文本为段落，并显示第一段
 */
function showDialogue(dialogue: DialogueDataType): void {
  currentDialogue.value = dialogue;

  // 解析文本为段落
  paragraphs.value = parseTextIntoParagraphs(dialogue.content);
  currentParagraphIndex.value = 0;

  // 调试日志
  console.log('[DialogueBox] 原始内容:', dialogue.content);
  console.log('[DialogueBox] 解析段落数:', paragraphs.value.length);
  paragraphs.value.forEach((p, i) => {
    console.log(`[DialogueBox] 段落 ${i + 1}:`, p.content.substring(0, 50) + (p.content.length > 50 ? '...' : ''));
  });

  // 处理NPC创建指令
  processNPCCreation();

  // 显示第一段
  if (paragraphs.value.length > 0) {
    showCurrentParagraph();
  }
}

/**
 * 立即显示完整对话（跳过打字机效果）
 * 解析文本为段落，并显示第一段
 */
function showDialogueInstantly(dialogue: DialogueDataType): void {
  currentDialogue.value = dialogue;

  // 解析文本为段落
  paragraphs.value = parseTextIntoParagraphs(dialogue.content);
  currentParagraphIndex.value = 0;

  // 调试日志
  console.log('[DialogueBox] 原始内容:', dialogue.content);
  console.log('[DialogueBox] 解析段落数:', paragraphs.value.length);
  paragraphs.value.forEach((p, i) => {
    console.log(`[DialogueBox] 段落 ${i + 1}:`, p.content.substring(0, 50) + (p.content.length > 50 ? '...' : ''));
  });

  // 处理NPC创建指令
  processNPCCreation();

  // 立即显示第一段（不使用打字机效果）
  if (paragraphs.value.length > 0) {
    const paragraph = paragraphs.value[0];
    displayText.value = paragraph.content;
  }
}

/**
 * 加载第 0 楼消息
 */
async function loadInitialMessage(): Promise<void> {
  try {
    // 获取第 0 楼消息
    const messages = getChatMessages('0-0');

    if (messages && messages.length > 0) {
      const firstMessage = messages[0];

      // 检查是否是 AI 消息（assistant 或 system）
      if ((firstMessage.role === 'assistant' || firstMessage.role === 'system') && firstMessage.message) {
        console.log('[DialogueBox] 加载第 0 楼消息:', firstMessage.message.substring(0, 50) + '...');

        // 解析消息内容
        const dialogue = streamService.parseDialogue(firstMessage.message);

        if (dialogue) {
          // 显示对话
          showDialogueInstantly(dialogue);
        } else {
          // 如果解析失败，直接显示消息内容
          showDialogueInstantly({
            speaker: firstMessage.name || 'AI',
            content: firstMessage.message,
            timestamp: Date.now(),
          });
        }
      }
    } else {
      console.log('[DialogueBox] 未找到第 0 楼消息');
    }
  } catch (error) {
    console.error('[DialogueBox] 加载第 0 楼消息失败:', error);
  }
}

// ==================== 流式传输监听 ====================
onMounted(async () => {
  // 设置流式传输回调
  streamService.setCallbacks({
    onIncremental: (_text: string, dialogue: DialogueDataType | null) => {
      // 只显示格式完整的对话
      if (dialogue) {
        showDialogue(dialogue);
      }
    },
    onComplete: (_text: string, dialogue: DialogueDataType | null) => {
      // 流式传输完成，显示完整对话
      if (dialogue) {
        showDialogueInstantly(dialogue);
      }
    },
    onError: (error: Error) => {
      console.error('[DialogueBox] 流式传输错误:', error);
      toastr.error('接收对话失败');
    },
  });

  console.log('[DialogueBox] 组件已挂载');

  // 加载第 0 楼消息
  await loadInitialMessage();
});

// ==================== 监听 gameStore 的对话状态 ====================
watch(
  () => gameStore.streamingDialogue,
  dialogue => {
    if (dialogue) {
      showDialogue(dialogue);
    }
  },
);

watch(
  () => gameStore.finalDialogue,
  dialogue => {
    if (dialogue) {
      showDialogueInstantly(dialogue);
    }
  },
);

// ==================== 清理 ====================
onBeforeUnmount(() => {
  // 停止打字机动画
  if (currentTypewriterTween.value) {
    currentTypewriterTween.value.kill();
  }

  // 清除回调
  streamService.clearCallbacks();
});
</script>

<style lang="scss" scoped>
@import '../styles/global.scss';

.dialogue-box {
  position: fixed;
  bottom: $spacing-lg;
  left: 50%;
  transform: translateX(-50%);
  width: 80%;
  max-width: 800px;
  min-height: 150px;
  background: $color-bg-overlay;
  border: 2px solid $color-border-gold;
  border-radius: $border-radius-lg;
  padding: $spacing-lg;
  z-index: $z-index-dialogue;
  box-shadow: $shadow-lg, $shadow-gold;
  cursor: pointer;
  transition: all $transition-base;

  &:hover {
    border-color: $color-secondary-gold;
    box-shadow:
      $shadow-lg,
      0 0 30px rgba(212, 175, 55, 0.5);
  }

  &.input-mode {
    cursor: default;
  }
}

.close-button {
  position: absolute;
  top: $spacing-sm;
  right: $spacing-sm;
  width: 28px;
  height: 28px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid $color-border-gold;
  border-radius: $border-radius-sm;
  color: $color-text-gold;
  font-size: $font-size-base;
  cursor: pointer;
  transition: all $transition-fast;
  z-index: 1;

  &:hover {
    background: rgba(244, 67, 54, 0.3);
    border-color: $color-danger;
    color: $color-danger;
  }
}

.dialogue-display {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.dialogue-content {
  flex: 1;
}

.dialogue-text {
  font-size: $font-size-base;
  color: $color-text-primary;
  line-height: 1.8;
  white-space: pre-wrap;
  word-wrap: break-word;
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

.dialogue-input {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.input-field {
  width: 100%;
  min-height: 100px;
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

  &:focus {
    border-color: $color-primary-gold;
  }

  &::placeholder {
    color: $color-text-muted;
  }
}

.send-button {
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
