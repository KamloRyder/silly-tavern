<template>
  <div class="journal-view">
    <!-- 面板头部 -->
    <div class="panel-header">
      <h2 class="panel-title">心象风景日志</h2>
      <button class="btn-close" @click="close">×</button>
    </div>

    <!-- 面板内容 -->
    <div class="panel-content">
      <!-- 左侧：日志列表 -->
      <div class="journal-list">
        <!-- 作者选择器 -->
        <div class="author-selector">
          <label for="author-select">选择作者：</label>
          <select id="author-select" v-model="selectedAuthorId" @change="onAuthorChange">
            <option value="">-- 请选择 --</option>
            <optgroup label="主控角色">
              <option v-if="playerCharacter" :value="playerCharacter.id">
                {{ playerCharacter.name }}
              </option>
            </optgroup>
            <optgroup v-if="availableNPCs.length > 0" label="NPC">
              <option v-for="npc in availableNPCs" :key="npc.id" :value="npc.id">
                {{ npc.name }}
              </option>
            </optgroup>
          </select>
        </div>

        <!-- 历史日志列表 -->
        <div class="history-section">
          <h3 class="section-title">历史日志 ({{ authorJournals.length }})</h3>
          <div v-if="authorJournals.length > 0" class="journal-items">
            <div
              v-for="journal in authorJournals"
              :key="journal.id"
              class="journal-item"
              :class="{ active: selectedJournalId === journal.id }"
              @click="selectJournal(journal.id)"
            >
              <div class="journal-header">
                <span class="journal-date">{{ formatDate(journal.createdAt) }}</span>
                <span v-if="journal.editedAt" class="journal-edited">(已编辑)</span>
              </div>
              <div class="journal-preview">
                {{ getPreview(journal.content) }}
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <p>暂无日志</p>
          </div>
        </div>
      </div>

      <!-- 右侧：日志编辑器 -->
      <div class="journal-editor">
        <div v-if="selectedAuthorId" class="editor-content">
          <!-- 编辑器头部 -->
          <div class="editor-header">
            <h3 class="editor-title">{{ selectedJournalId ? '编辑日志' : '新建日志' }}</h3>
            <div class="editor-actions">
              <button class="btn-generate" :disabled="isGenerating" @click="generateDraft">
                {{ isGenerating ? '沉思中...' : '🌙 沉思' }}
              </button>
              <button class="btn-save" :disabled="!journalContent.trim() || isSaving" @click="saveJournal">
                {{ isSaving ? '保存中...' : '💾 保存' }}
              </button>
              <button v-if="selectedJournalId" class="btn-delete" @click="confirmDelete">🗑️ 删除</button>
              <button class="btn-new" @click="createNew">✨ 新建</button>
            </div>
          </div>

          <!-- 文本编辑器 -->
          <div class="editor-body">
            <textarea
              v-model="journalContent"
              class="journal-textarea"
              :placeholder="placeholderText"
              :disabled="isGenerating"
            ></textarea>
          </div>

          <!-- 提示信息 -->
          <div class="editor-footer">
            <p class="editor-hint">
              💡 提示：心象风景日志使用"留白"美学，通过场景描写和意象表达内心状态，避免直接定义情绪。
            </p>
          </div>
        </div>

        <div v-else class="empty-editor">
          <p>请先选择一个作者</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { journalService, type JournalEntry } from '../services/journalService';
import { useCharacterStore } from '../stores/characterStore';
import { useInstanceStore } from '../stores/instanceStore';

// ==================== Props & Emits ====================
const emit = defineEmits<{
  close: [];
}>();

// ==================== Stores ====================
const characterStore = useCharacterStore();
const instanceStore = useInstanceStore();

// ==================== 状态 ====================
const selectedAuthorId = ref<string>('');
const selectedJournalId = ref<string>('');
const journalContent = ref<string>('');
const authorJournals = ref<JournalEntry[]>([]);
const isGenerating = ref(false);
const isSaving = ref(false);

// ==================== 计算属性 ====================
const playerCharacter = computed(() => characterStore.player);

const placeholderText = computed(() => {
  return '在这里写下你的心象风景...\n\n或点击"沉思"按钮，让 AI 帮你生成一篇内省式的日志。';
});

const availableNPCs = computed(() => {
  // 获取所有副本中的 NPC
  const allInstances = instanceStore.getAllInstances();
  const npcMap = new Map();

  for (const instance of allInstances) {
    for (const charInInstance of instance.characters) {
      if (charInInstance.character && !npcMap.has(charInInstance.characterId)) {
        npcMap.set(charInInstance.characterId, {
          id: charInInstance.characterId,
          name: charInInstance.character.name,
        });
      }
    }
  }

  return Array.from(npcMap.values());
});

// ==================== 方法 ====================

/**
 * 初始化
 */
onMounted(async () => {
  await journalService.initialize();

  // 如果有主控角色，默认选择主控角色
  if (playerCharacter.value) {
    selectedAuthorId.value = playerCharacter.value.id;
    await loadAuthorJournals();
  }
});

/**
 * 监听作者变化
 */
watch(selectedAuthorId, async () => {
  await loadAuthorJournals();
  // 清空当前编辑内容
  selectedJournalId.value = '';
  journalContent.value = '';
});

/**
 * 作者改变时的处理
 */
async function onAuthorChange() {
  await loadAuthorJournals();
}

/**
 * 加载作者的所有日志
 */
async function loadAuthorJournals() {
  if (!selectedAuthorId.value) {
    authorJournals.value = [];
    return;
  }

  try {
    authorJournals.value = await journalService.getJournalsByAuthor(selectedAuthorId.value);
  } catch (error) {
    console.error('[JournalView] 加载日志失败:', error);
    toastr.error('加载日志失败');
  }
}

/**
 * 选择日志
 */
function selectJournal(journalId: string) {
  const journal = authorJournals.value.find(j => j.id === journalId);
  if (journal) {
    selectedJournalId.value = journal.id;
    journalContent.value = journal.content;
  }
}

/**
 * 生成日志草稿
 */
async function generateDraft() {
  if (!selectedAuthorId.value) {
    toastr.warning('请先选择作者');
    return;
  }

  try {
    isGenerating.value = true;

    // 获取作者名称
    const authorName = getAuthorName();
    const isPlayerCharacter = selectedAuthorId.value === playerCharacter.value?.id;

    // 生成日志草稿
    const draft = await journalService.generateJournalDraft(selectedAuthorId.value, authorName, isPlayerCharacter);

    journalContent.value = draft;
    toastr.success('日志草稿已生成');
  } catch (error) {
    console.error('[JournalView] 生成日志草稿失败:', error);
    toastr.error('生成日志草稿失败');
  } finally {
    isGenerating.value = false;
  }
}

/**
 * 保存日志
 */
async function saveJournal() {
  if (!selectedAuthorId.value) {
    toastr.warning('请先选择作者');
    return;
  }

  if (!journalContent.value.trim()) {
    toastr.warning('日志内容不能为空');
    return;
  }

  try {
    isSaving.value = true;

    if (selectedJournalId.value) {
      // 更新现有日志
      await journalService.updateJournal(selectedJournalId.value, journalContent.value);
    } else {
      // 创建新日志
      const newJournal: JournalEntry = {
        id: journalService.generateId(),
        authorId: selectedAuthorId.value,
        authorName: getAuthorName(),
        content: journalContent.value,
        relatedEvents: [],
        relatedMemories: [],
        createdAt: Date.now(),
      };

      await journalService.saveJournal(newJournal);
      selectedJournalId.value = newJournal.id;
    }

    // 重新加载日志列表
    await loadAuthorJournals();
  } catch (error) {
    console.error('[JournalView] 保存日志失败:', error);
  } finally {
    isSaving.value = false;
  }
}

/**
 * 确认删除日志
 */
function confirmDelete() {
  if (!selectedJournalId.value) {
    return;
  }

  if (confirm('确定要删除这篇日志吗？此操作不可撤销。')) {
    deleteJournal();
  }
}

/**
 * 删除日志
 */
async function deleteJournal() {
  if (!selectedJournalId.value) {
    return;
  }

  try {
    await journalService.deleteJournal(selectedJournalId.value);

    // 清空编辑器
    selectedJournalId.value = '';
    journalContent.value = '';

    // 重新加载日志列表
    await loadAuthorJournals();
  } catch (error) {
    console.error('[JournalView] 删除日志失败:', error);
  }
}

/**
 * 创建新日志
 */
function createNew() {
  selectedJournalId.value = '';
  journalContent.value = '';
}

/**
 * 获取作者名称
 */
function getAuthorName(): string {
  if (selectedAuthorId.value === playerCharacter.value?.id) {
    return playerCharacter.value.name;
  }

  const npc = availableNPCs.value.find(n => n.id === selectedAuthorId.value);
  return npc?.name || '未知';
}

/**
 * 格式化日期
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * 获取日志预览
 */
function getPreview(content: string): string {
  const maxLength = 60;
  if (content.length <= maxLength) {
    return content;
  }
  return content.substring(0, maxLength) + '...';
}

/**
 * 关闭面板
 */
function close() {
  emit('close');
}
</script>

<style lang="scss" scoped>
.journal-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: #e0e0e0;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

// ==================== 面板头部 ====================
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  .panel-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: #f0f0f0;
    margin: 0;
  }

  .btn-close {
    background: none;
    border: none;
    color: #e0e0e0;
    font-size: 2rem;
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s;

    &:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }
  }
}

// ==================== 面板内容 ====================
.panel-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

// ==================== 左侧：日志列表 ====================
.journal-list {
  width: 300px;
  background: rgba(0, 0, 0, 0.2);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.author-selector {
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
    color: #b0b0b0;
  }

  select {
    width: 100%;
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    color: #e0e0e0;
    font-size: 0.9rem;
    cursor: pointer;

    &:focus {
      outline: none;
      border-color: #4a9eff;
    }

    option {
      background: #1a1a2e;
      color: #e0e0e0;
    }

    optgroup {
      background: #16213e;
      color: #b0b0b0;
      font-weight: 600;
    }
  }
}

.history-section {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;

  .section-title {
    font-size: 1rem;
    font-weight: 600;
    color: #b0b0b0;
    margin: 0 0 1rem 0;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
}

.journal-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.journal-item {
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.2);
  }

  &.active {
    background: rgba(74, 158, 255, 0.2);
    border-color: #4a9eff;
  }

  .journal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;

    .journal-date {
      font-size: 0.8rem;
      color: #b0b0b0;
    }

    .journal-edited {
      font-size: 0.75rem;
      color: #ffa500;
    }
  }

  .journal-preview {
    font-size: 0.85rem;
    color: #d0d0d0;
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
  }
}

.empty-state {
  text-align: center;
  padding: 2rem 1rem;
  color: #808080;
  font-size: 0.9rem;
}

// ==================== 右侧：日志编辑器 ====================
.journal-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.editor-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.editor-header {
  padding: 1rem 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;

  .editor-title {
    font-size: 1.1rem;
    font-weight: 600;
    color: #f0f0f0;
    margin: 0;
  }

  .editor-actions {
    display: flex;
    gap: 0.5rem;

    button {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 4px;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.2s;

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .btn-generate {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;

      &:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      }
    }

    .btn-save {
      background: linear-gradient(135deg, #4a9eff 0%, #2563eb 100%);
      color: white;

      &:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(74, 158, 255, 0.4);
      }
    }

    .btn-delete {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: white;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
      }
    }

    .btn-new {
      background: rgba(255, 255, 255, 0.1);
      color: #e0e0e0;

      &:hover {
        background: rgba(255, 255, 255, 0.15);
      }
    }
  }
}

.editor-body {
  flex: 1;
  padding: 1.5rem;
  overflow: hidden;

  .journal-textarea {
    width: 100%;
    height: 100%;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    color: #e0e0e0;
    font-size: 1rem;
    line-height: 1.8;
    font-family: 'Microsoft YaHei', sans-serif;
    resize: none;

    &:focus {
      outline: none;
      border-color: #4a9eff;
      background: rgba(0, 0, 0, 0.4);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    &::placeholder {
      color: #808080;
    }
  }
}

.editor-footer {
  padding: 1rem 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-top: 1px solid rgba(255, 255, 255, 0.1);

  .editor-hint {
    margin: 0;
    font-size: 0.85rem;
    color: #b0b0b0;
    line-height: 1.5;
  }
}

.empty-editor {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #808080;
  font-size: 1.1rem;
}
</style>
