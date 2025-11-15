<template>
  <div class="instance-record">
    <!-- 右上角退出按钮 -->
    <button class="floating-exit-btn" title="关闭" @click="emit('close')">✕</button>

    <!-- 副本列表视图 -->
    <div v-if="!selectedInstance" class="instance-list-view">
      <div class="record-header">
        <h2 class="record-title">副本记录</h2>
        <p class="record-subtitle">查看已进入的副本信息和历史记录</p>
      </div>

      <div v-if="instanceStore.instanceCount === 0" class="empty-state">
        <p class="empty-text">暂无副本记录</p>
        <p class="empty-hint">开始游戏后，副本记录将显示在这里</p>
      </div>

      <div v-else class="instance-list">
        <div
          v-for="instance in instanceStore.instanceList"
          :key="instance.id"
          class="instance-card"
          :class="{ active: instance.isActive }"
          @click="selectInstance(instance.id)"
        >
          <div class="instance-card-header">
            <h3 class="instance-name">{{ instance.name }}</h3>
            <span v-if="instance.isActive" class="active-badge">进行中</span>
            <span v-else-if="instance.ending" class="completed-badge">已完成</span>
          </div>

          <div class="instance-info">
            <span class="info-item">
              <span class="info-label">类型:</span>
              <span class="info-value">{{ instance.type }}</span>
            </span>
            <span class="info-item">
              <span class="info-label">难度:</span>
              <span class="info-value">{{ '★'.repeat(instance.difficulty) }}</span>
            </span>
          </div>

          <div class="instance-stats">
            <span class="stat-item">{{ instance.characters.length }} 人物</span>
            <span class="stat-item">{{ instance.events.length }} 事件</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 副本详情视图 -->
    <div v-else-if="currentInstanceData" class="instance-detail-view">
      <div class="detail-header">
        <button class="btn-back" @click="selectedInstance = null">
          <span class="back-icon">←</span>
          返回列表
        </button>
        <h2 class="detail-title">{{ currentInstanceData.name }}</h2>
      </div>

      <div class="detail-content">
        <!-- 基本信息 -->
        <section class="detail-section">
          <h3 class="section-title">基本信息</h3>
          <div class="info-grid">
            <div class="info-row">
              <span class="info-label">类型:</span>
              <span class="info-value">{{ currentInstanceData.type }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">难度:</span>
              <span class="info-value">{{ '★'.repeat(currentInstanceData.difficulty) }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">状态:</span>
              <span class="info-value">{{ currentInstanceData.isActive ? '进行中' : '已完成' }}</span>
            </div>
          </div>
        </section>

        <!-- 世界观与背景 -->
        <section class="detail-section">
          <h3 class="section-title">世界观与背景</h3>
          <p class="world-setting">{{ currentInstanceData.worldSetting }}</p>
        </section>

        <!-- 出场人物 -->
        <section class="detail-section">
          <div class="section-header">
            <h3 class="section-title">出场人物 ({{ currentInstanceData.characters.length }})</h3>
            <button class="btn-add" @click="showCharacterCreator = true">
              <span class="add-icon">+</span>
              添加人物
            </button>
          </div>

          <div v-if="currentInstanceData.characters.length === 0" class="empty-characters">
            <p class="empty-text">暂无出场人物</p>
          </div>

          <div v-else class="characters-list">
            <div
              v-for="charInInstance in currentInstanceData.characters"
              :key="charInInstance.characterId"
              class="character-item"
              :class="{ important: charInInstance.isImportant }"
            >
              <div class="character-header" @click="toggleCharacterExpand(charInInstance.characterId)">
                <div class="character-basic">
                  <span class="character-name">{{ charInInstance.character.name }}</span>
                  <span v-if="charInInstance.isImportant" class="important-badge">重要</span>
                </div>
                <span class="expand-icon">{{ expandedCharacters.has(charInInstance.characterId) ? '▼' : '▶' }}</span>
              </div>

              <div v-if="expandedCharacters.has(charInInstance.characterId)" class="character-details">
                <div class="character-info">
                  <p v-if="charInInstance.character.occupation" class="char-occupation">
                    职业: {{ charInInstance.character.occupation }}
                  </p>
                  <p v-if="charInInstance.character.background" class="char-background">
                    {{ charInInstance.character.background }}
                  </p>
                  <p v-if="charInInstance.firstAppearance" class="char-appearance">
                    首次出场: {{ charInInstance.firstAppearance }}
                  </p>
                </div>

                <div class="character-actions">
                  <button class="btn-toggle-important" @click="toggleImportant(charInInstance.characterId)">
                    {{ charInInstance.isImportant ? '取消重要' : '设为重要' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- 重要事件 -->
        <section class="detail-section">
          <h3 class="section-title">重要事件 ({{ currentInstanceData.events.length }})</h3>

          <div v-if="currentInstanceData.events.length === 0" class="empty-events">
            <p class="empty-text">暂无重要事件记录</p>
          </div>

          <div v-else class="events-list">
            <div v-for="event in sortedEvents" :key="event.id" class="event-item">
              <div class="event-header">
                <span class="event-time">{{ formatTime(event.timestamp) }}</span>
                <span v-if="event.location" class="event-location">{{ event.location }}</span>
              </div>
              <p class="event-summary">{{ event.summary }}</p>
              <div v-if="event.involvedCharacters.length > 0" class="event-characters">
                <span class="involved-label">涉及人物:</span>
                <span v-for="charId in event.involvedCharacters" :key="charId" class="involved-character">
                  {{ getCharacterName(charId) }}
                </span>
              </div>
            </div>
          </div>
        </section>

        <!-- 结局 -->
        <section v-if="currentInstanceData.ending" class="detail-section">
          <h3 class="section-title">副本结局</h3>
          <p class="ending-text">{{ currentInstanceData.ending }}</p>
        </section>
      </div>
    </div>

    <!-- 角色创建弹窗 -->
    <div v-if="showCharacterCreator" class="modal-overlay" @click.self="showCharacterCreator = false">
      <div class="modal-content">
        <CharacterCreator
          :sync-to-tavern="false"
          character-type="npc"
          @created="handleCharacterCreated"
          @cancelled="showCharacterCreator = false"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useInstanceStore } from '../stores/instanceStore';
import type { NPCCharacter } from '../types/character';
import type { InstanceRecord } from '../types/instance';

// ==================== Emits ====================
const emit = defineEmits<{
  close: [];
}>();

// ==================== Store ====================
const instanceStore = useInstanceStore();

// ==================== 状态 ====================
const selectedInstance = ref<string | null>(null);
const expandedCharacters = ref<Set<string>>(new Set());
const showCharacterCreator = ref(false);

// ==================== 计算属性 ====================
const currentInstanceData = computed(() => {
  if (!selectedInstance.value) return null;
  return instanceStore.instances.get(selectedInstance.value);
});

const sortedEvents = computed(() => {
  if (!currentInstanceData.value) return [];
  return [...currentInstanceData.value.events].sort((a, b) => a.timestamp - b.timestamp);
});

// ==================== 方法 ====================

/**
 * 选择副本
 */
function selectInstance(instanceId: string): void {
  selectedInstance.value = instanceId;
  expandedCharacters.value.clear();
}

/**
 * 切换角色展开状态
 */
function toggleCharacterExpand(characterId: string): void {
  if (expandedCharacters.value.has(characterId)) {
    expandedCharacters.value.delete(characterId);
  } else {
    expandedCharacters.value.add(characterId);
  }
}

/**
 * 切换角色重要性
 */
async function toggleImportant(characterId: string): Promise<void> {
  if (!selectedInstance.value) return;

  try {
    await instanceStore.toggleImportantNPC(selectedInstance.value, characterId);
  } catch (error) {
    console.error('[InstanceRecord] 切换角色重要性失败:', error);
  }
}

/**
 * 处理角色创建完成
 */
async function handleCharacterCreated(character: NPCCharacter): Promise<void> {
  if (!selectedInstance.value) return;

  try {
    // 检查是否需要继承设定
    const instance = currentInstanceData.value;
    if (instance) {
      const previousInstances = instanceStore.getInstancesByWorldSetting(instance.worldSetting);
      const inheritedCharacter = findInheritedCharacter(character.name, previousInstances);

      if (inheritedCharacter) {
        // 继承之前的设定
        console.log(`[InstanceRecord] 继承角色 ${character.name} 的设定`);
        toastr.info(`继承了 ${character.name} 在其他副本中的设定`);
        // 可以在这里合并属性、事件等
      }
    }

    // 添加到副本
    await instanceStore.addCharacterToInstance(selectedInstance.value, character, false);
    showCharacterCreator.value = false;
  } catch (error) {
    console.error('[InstanceRecord] 添加角色到副本失败:', error);
  }
}

/**
 * 查找继承的角色
 */
function findInheritedCharacter(characterName: string, instances: InstanceRecord[]) {
  for (const instance of instances) {
    const found = instance.characters.find(c => c.character.name === characterName);
    if (found) {
      return found.character;
    }
  }
  return null;
}

/**
 * 获取角色名称
 */
function getCharacterName(characterId: string): string {
  if (!currentInstanceData.value) return '未知';

  const charInInstance = currentInstanceData.value.characters.find(c => c.characterId === characterId);
  return charInInstance?.character.name || '未知';
}

/**
 * 格式化时间
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  // 如果是今天
  if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }

  // 如果是今年
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  // 完整日期
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
</script>

<style lang="scss" scoped>
@import '../styles/global.scss';

.instance-record {
  @include modal-container;
  position: relative;
  width: 100%;
  max-width: 700px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.floating-exit-btn {
  @include modal-close-button;
  background: rgba(244, 67, 54, 0.9);
  border-color: $color-danger;
  color: white;

  &:hover {
    background: rgba(244, 67, 54, 1);
    box-shadow: 0 0 20px rgba(244, 67, 54, 0.6);
  }
}

// ==================== 列表视图 ====================
.instance-list-view {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: $spacing-lg;
  overflow-y: auto;
}

.record-header {
  text-align: center;
  margin-bottom: $spacing-lg;
  padding-bottom: $spacing-md;
  border-bottom: 1px solid $color-border-dark;
}

.record-title {
  font-size: $font-size-2xl;
  font-weight: $font-weight-bold;
  color: $color-text-gold;
  margin-bottom: $spacing-xs;
  text-shadow: 0 0 10px rgba(212, 175, 55, 0.5);
}

.record-subtitle {
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

.instance-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: $spacing-md;
}

.instance-card {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid $color-border-dark;
  border-radius: $border-radius-md;
  padding: $spacing-md;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    border-color: $color-border-gold;
    transform: translateY(-2px);
    box-shadow: $shadow-gold;
  }

  &.active {
    border-color: $color-primary-gold;
    background: rgba(212, 175, 55, 0.1);
  }
}

.instance-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $spacing-sm;
}

.instance-name {
  font-size: $font-size-lg;
  font-weight: $font-weight-bold;
  color: $color-text-gold;
}

.active-badge,
.completed-badge {
  padding: $spacing-xs $spacing-sm;
  border-radius: $border-radius-sm;
  font-size: $font-size-xs;
  font-weight: $font-weight-medium;
}

.active-badge {
  background: rgba(76, 175, 80, 0.2);
  color: #4caf50;
  border: 1px solid #4caf50;
}

.completed-badge {
  background: rgba(158, 158, 158, 0.2);
  color: #9e9e9e;
  border: 1px solid #9e9e9e;
}

.instance-info {
  display: flex;
  gap: $spacing-md;
  margin-bottom: $spacing-sm;
}

.info-item {
  font-size: $font-size-sm;
}

.info-label {
  color: $color-text-secondary;
  margin-right: $spacing-xs;
}

.info-value {
  color: $color-text-gold;
  font-weight: $font-weight-medium;
}

.instance-stats {
  display: flex;
  gap: $spacing-md;
  padding-top: $spacing-sm;
  border-top: 1px solid $color-border-dark;
}

.stat-item {
  font-size: $font-size-xs;
  color: $color-text-muted;
}

// ==================== 详情视图 ====================
.instance-detail-view {
  display: flex;
  flex-direction: column;
  width: 100%;
  overflow-y: auto;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-lg;
  background: rgba(0, 0, 0, 0.5);
  border-bottom: 1px solid $color-border-dark;
}

.btn-back {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  padding: $spacing-sm $spacing-md;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid $color-border-dark;
  border-radius: $border-radius-sm;
  color: $color-text-secondary;
  font-size: $font-size-sm;
  cursor: pointer;
  transition: all $transition-fast;

  @include mobile {
    padding: $spacing-xs $spacing-sm;
    font-size: $font-size-xs;
    min-height: 32px;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    color: $color-text-primary;
    border-color: $color-border-gold;
  }
}

.back-icon {
  font-size: $font-size-lg;
}

.detail-title {
  font-size: $font-size-xl;
  font-weight: $font-weight-bold;
  color: $color-text-gold;
  text-shadow: 0 0 10px rgba(212, 175, 55, 0.5);
}

.detail-content {
  padding: $spacing-lg;
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;
}

.detail-section {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid $color-border-dark;
  border-radius: $border-radius-md;
  padding: $spacing-md;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $spacing-md;
}

.section-title {
  font-size: $font-size-lg;
  font-weight: $font-weight-bold;
  color: $color-text-gold;
  margin-bottom: $spacing-md;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: $spacing-md;
}

.info-row {
  display: flex;
  gap: $spacing-sm;
}

.world-setting {
  font-size: $font-size-sm;
  color: $color-text-primary;
  line-height: 1.6;
  white-space: pre-wrap;
}

.btn-add {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  padding: $spacing-sm $spacing-md;
  background: rgba(212, 175, 55, 0.2);
  border: 1px solid $color-border-gold;
  border-radius: $border-radius-sm;
  color: $color-text-gold;
  font-size: $font-size-sm;
  cursor: pointer;
  transition: all $transition-fast;

  @include mobile {
    padding: $spacing-xs $spacing-sm;
    font-size: $font-size-xs;
    min-height: 32px;
  }

  &:hover {
    background: rgba(212, 175, 55, 0.3);
    transform: translateY(-1px);
  }
}

.add-icon {
  font-size: $font-size-lg;
  font-weight: $font-weight-bold;
}

.empty-characters,
.empty-events {
  padding: $spacing-lg;
  text-align: center;
  color: $color-text-muted;
}

.characters-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.character-item {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid $color-border-dark;
  border-radius: $border-radius-sm;
  overflow: hidden;
  transition: border-color $transition-fast;

  &.important {
    border-color: $color-primary-gold;
  }
}

.character-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-sm $spacing-md;
  cursor: pointer;
  transition: background $transition-fast;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
}

.character-basic {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.character-name {
  font-size: $font-size-base;
  font-weight: $font-weight-medium;
  color: $color-text-primary;
}

.important-badge {
  padding: $spacing-xs $spacing-sm;
  background: rgba(212, 175, 55, 0.2);
  border: 1px solid $color-border-gold;
  border-radius: $border-radius-sm;
  font-size: $font-size-xs;
  color: $color-text-gold;
}

.expand-icon {
  font-size: $font-size-xs;
  color: $color-text-muted;
}

.character-details {
  padding: $spacing-md;
  border-top: 1px solid $color-border-dark;
  background: rgba(0, 0, 0, 0.2);
}

.character-info {
  margin-bottom: $spacing-md;

  p {
    font-size: $font-size-sm;
    color: $color-text-secondary;
    margin-bottom: $spacing-xs;
    line-height: 1.5;
  }
}

.char-occupation {
  color: $color-text-gold;
  font-weight: $font-weight-medium;
}

.character-actions {
  display: flex;
  gap: $spacing-sm;
}

.btn-toggle-important {
  padding: $spacing-xs $spacing-md;
  background: rgba(212, 175, 55, 0.2);
  border: 1px solid $color-border-gold;
  border-radius: $border-radius-sm;
  color: $color-text-gold;
  font-size: $font-size-xs;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    background: rgba(212, 175, 55, 0.3);
  }
}

.events-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.event-item {
  padding: $spacing-md;
  background: rgba(0, 0, 0, 0.3);
  border-left: 3px solid $color-border-gold;
  border-radius: $border-radius-sm;
}

.event-header {
  display: flex;
  gap: $spacing-md;
  margin-bottom: $spacing-xs;
}

.event-time {
  font-size: $font-size-xs;
  color: $color-text-muted;
}

.event-location {
  font-size: $font-size-xs;
  color: $color-text-gold;
  padding: 2px $spacing-xs;
  background: rgba(212, 175, 55, 0.1);
  border-radius: $border-radius-sm;
}

.event-summary {
  font-size: $font-size-sm;
  color: $color-text-primary;
  margin-bottom: $spacing-sm;
  line-height: 1.5;
}

.event-characters {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-xs;
  align-items: center;
}

.involved-label {
  font-size: $font-size-xs;
  color: $color-text-muted;
}

.involved-character {
  font-size: $font-size-xs;
  color: $color-text-gold;
  padding: 2px $spacing-xs;
  background: rgba(212, 175, 55, 0.1);
  border-radius: $border-radius-sm;
}

.ending-text {
  font-size: $font-size-base;
  color: $color-text-primary;
  line-height: 1.6;
  padding: $spacing-md;
  background: rgba(212, 175, 55, 0.1);
  border-radius: $border-radius-sm;
  border-left: 3px solid $color-primary-gold;
}

// ==================== 弹窗 ====================
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
  z-index: 1000;
}

.modal-content {
  max-width: 90%;
  max-height: 90%;
  overflow: auto;
}
</style>
