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
            <span v-if="instance.status === 'draft'" class="draft-badge">草稿</span>
            <span v-else-if="instance.status === 'active'" class="active-badge">进行中</span>
            <span v-else-if="instance.status === 'completed'" class="completed-badge">已完成</span>
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
            <span v-if="instance.mementos && instance.mementos.length > 0" class="stat-item">
              {{ instance.mementos.length }} 纪念品
            </span>
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
              <span class="info-value status-badge" :class="`status-${currentInstanceData.status}`">
                {{ getStatusText(currentInstanceData.status) }}
              </span>
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
                  <span v-if="charInInstance.importance" class="importance-badge">
                    {{ '★'.repeat(charInInstance.importance) }}
                  </span>
                  <span v-else-if="charInInstance.isImportant" class="important-badge">重要</span>
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

        <!-- 纪念品 -->
        <section v-if="currentInstanceData.mementos && currentInstanceData.mementos.length > 0" class="detail-section">
          <h3 class="section-title">纪念品 ({{ currentInstanceData.mementos.length }})</h3>
          <div class="mementos-list">
            <div v-for="memento in currentInstanceData.mementos" :key="memento.id" class="memento-item">
              <div class="memento-header">
                <span class="memento-name">{{ memento.name }}</span>
                <span class="memento-time">{{ formatTime(memento.obtainedAt) }}</span>
              </div>
              <p class="memento-description">{{ memento.description }}</p>
            </div>
          </div>
        </section>

        <!-- 结局 -->
        <section v-if="currentInstanceData.ending" class="detail-section">
          <h3 class="section-title">副本结局</h3>
          <p class="ending-text">{{ currentInstanceData.ending }}</p>
        </section>

        <!-- 操作按钮 -->
        <section class="detail-section action-section">
          <div class="action-buttons">
            <button class="action-button plot-review-button" @click="openPlotReview">
              <span class="button-icon">📜</span>
              <span class="button-text">剧情回顾</span>
            </button>

            <button
              v-if="currentInstanceData.status === 'active'"
              class="action-button end-instance-button"
              @click="confirmEndInstance"
            >
              <span class="button-icon">🏁</span>
              <span class="button-text">副本结束</span>
            </button>

            <button class="action-button close-instance-button" @click="closeInstancePage">
              <span class="button-icon">💾</span>
              <span class="button-text">关闭副本页面</span>
            </button>
          </div>
        </section>
      </div>
    </div>

    <!-- 剧情回顾弹窗 -->
    <div v-if="showPlotReview" class="modal-overlay" @click.self="showPlotReview = false">
      <div class="plot-review-modal">
        <PlotReview :instance-id="selectedInstance || undefined" @close="showPlotReview = false" />
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
import { apiConfigService } from '../services/apiConfigService';
import { useInstanceStore } from '../stores/instanceStore';
import type { NPCCharacter } from '../types/character';
import type { InstanceRecord, InstanceStatus } from '../types/instance';
import CharacterCreator from './CharacterCreator.vue';
import PlotReview from './PlotReview.vue';

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
const showPlotReview = ref(false);

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
async function handleCharacterCreated(
  character: NPCCharacter | import('../types/character').PlayerCharacter,
): Promise<void> {
  if (!selectedInstance.value) return;

  // 只处理 NPC 角色
  if (character.type !== 'npc') {
    console.warn('[InstanceRecord] 只能添加 NPC 角色到副本');
    return;
  }

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
    await instanceStore.addCharacterToInstance(selectedInstance.value, character as NPCCharacter, false);
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

  const charInInstance = currentInstanceData.value.characters.find((c: any) => c.characterId === characterId);
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

/**
 * 获取状态文本
 */
function getStatusText(status: InstanceStatus): string {
  const statusMap: Record<InstanceStatus, string> = {
    draft: '草稿',
    active: '进行中',
    completed: '已完成',
  };
  return statusMap[status] || status;
}

/**
 * 打开剧情回顾
 */
function openPlotReview(): void {
  showPlotReview.value = true;
}

/**
 * 确认结束副本
 * 显示确认对话框，确认后完成副本并清理数据
 */
async function confirmEndInstance(): Promise<void> {
  if (!selectedInstance.value) return;

  // 显示确认对话框（使用浏览器原生 confirm）
  const confirmed = confirm(
    '确定要结束这个副本吗？\n\n结束后将：\n- 清除副本的 NPC 数据\n- 清除副本的地图数据\n- 保留事件记录\n- 保留纪念品\n\n此操作不可撤销！',
  );
  if (!confirmed) return;

  try {
    // 调用 completeInstance() 完成副本
    await instanceStore.completeInstance(selectedInstance.value);

    // 切换回现实世界 API
    apiConfigService.switchToRealWorld();

    // 切换世界书
    const { worldBookService } = await import('../services/worldBookService');
    await worldBookService.activateRealWorldEntries();

    // 显示副本完成提示
    toastr.success('副本已完成！事件记录和纪念品已保留。');

    // 返回列表视图
    selectedInstance.value = null;
  } catch (error) {
    console.error('[InstanceRecord] 结束副本失败:', error);
    toastr.error('结束副本失败');
  }
}

/**
 * 关闭副本页面
 * 保存副本进度并返回现实世界
 */
async function closeInstancePage(): Promise<void> {
  if (!selectedInstance.value) return;

  try {
    // 切换回现实世界 API
    apiConfigService.switchToRealWorld();

    // 切换世界书
    const { worldBookService } = await import('../services/worldBookService');
    await worldBookService.activateRealWorldEntries();

    // 清除当前副本
    const { useGameStore } = await import('../stores/gameStore');
    const gameStore = useGameStore();
    await gameStore.setCurrentInstance(null);

    toastr.info('已关闭副本页面，进度已保存');

    // 返回列表视图
    selectedInstance.value = null;
  } catch (error) {
    console.error('[InstanceRecord] 关闭副本页面失败:', error);
    toastr.error('关闭副本页面失败');
  }
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

.draft-badge,
.active-badge,
.completed-badge {
  padding: $spacing-xs $spacing-sm;
  border-radius: $border-radius-sm;
  font-size: $font-size-xs;
  font-weight: $font-weight-medium;
}

.draft-badge {
  background: rgba(255, 193, 7, 0.2);
  color: #ffc107;
  border: 1px solid #ffc107;
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

.important-badge,
.importance-badge {
  padding: $spacing-xs $spacing-sm;
  background: rgba(212, 175, 55, 0.2);
  border: 1px solid $color-border-gold;
  border-radius: $border-radius-sm;
  font-size: $font-size-xs;
  color: $color-text-gold;
}

.importance-badge {
  font-weight: $font-weight-bold;
  letter-spacing: 2px;
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

.status-badge {
  padding: $spacing-xs $spacing-sm;
  border-radius: $border-radius-sm;
  font-size: $font-size-xs;
  font-weight: $font-weight-medium;

  &.status-draft {
    background: rgba(255, 193, 7, 0.2);
    color: #ffc107;
    border: 1px solid #ffc107;
  }

  &.status-active {
    background: rgba(76, 175, 80, 0.2);
    color: #4caf50;
    border: 1px solid #4caf50;
  }

  &.status-completed {
    background: rgba(158, 158, 158, 0.2);
    color: #9e9e9e;
    border: 1px solid #9e9e9e;
  }
}

.mementos-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.memento-item {
  padding: $spacing-md;
  background: rgba(0, 0, 0, 0.3);
  border-left: 3px solid $color-primary-gold;
  border-radius: $border-radius-sm;
}

.memento-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $spacing-xs;
}

.memento-name {
  font-size: $font-size-base;
  font-weight: $font-weight-bold;
  color: $color-text-gold;
}

.memento-time {
  font-size: $font-size-xs;
  color: $color-text-muted;
}

.memento-description {
  font-size: $font-size-sm;
  color: $color-text-secondary;
  line-height: 1.5;
  margin: 0;
}

.action-section {
  background: rgba(0, 0, 0, 0.5);
  border: 2px solid $color-border-gold;
}

.action-buttons {
  display: flex;
  gap: $spacing-md;
  flex-wrap: wrap;

  @include mobile {
    flex-direction: column;
    gap: $spacing-sm;
  }
}

.action-button {
  flex: 1;
  min-width: 150px;
  padding: $spacing-md $spacing-lg;
  border-radius: $border-radius-md;
  font-size: $font-size-base;
  font-weight: $font-weight-bold;
  cursor: pointer;
  transition: all $transition-fast;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $spacing-sm;

  @include mobile {
    min-width: unset;
    padding: $spacing-sm $spacing-md;
    font-size: $font-size-sm;
  }

  .button-icon {
    font-size: $font-size-xl;

    @include mobile {
      font-size: $font-size-lg;
    }
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  &:active {
    transform: translateY(0);
  }
}

.plot-review-button {
  background: linear-gradient(135deg, rgba(138, 43, 226, 0.3), rgba(75, 0, 130, 0.3));
  border: 2px solid rgba(138, 43, 226, 0.5);
  color: $color-text-gold;

  &:hover {
    background: linear-gradient(135deg, rgba(138, 43, 226, 0.5), rgba(75, 0, 130, 0.5));
    border-color: rgba(138, 43, 226, 0.8);
    box-shadow: 0 4px 12px rgba(138, 43, 226, 0.4);
  }
}

.end-instance-button {
  background: linear-gradient(135deg, rgba(244, 67, 54, 0.3), rgba(139, 0, 0, 0.3));
  border: 2px solid rgba(244, 67, 54, 0.5);
  color: #fff;

  &:hover {
    background: linear-gradient(135deg, rgba(244, 67, 54, 0.5), rgba(139, 0, 0, 0.5));
    border-color: rgba(244, 67, 54, 0.8);
    box-shadow: 0 4px 12px rgba(244, 67, 54, 0.4);
  }
}

.close-instance-button {
  background: linear-gradient(135deg, rgba(33, 150, 243, 0.3), rgba(13, 71, 161, 0.3));
  border: 2px solid rgba(33, 150, 243, 0.5);
  color: #fff;

  &:hover {
    background: linear-gradient(135deg, rgba(33, 150, 243, 0.5), rgba(13, 71, 161, 0.5));
    border-color: rgba(33, 150, 243, 0.8);
    box-shadow: 0 4px 12px rgba(33, 150, 243, 0.4);
  }
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

.plot-review-modal {
  width: 90%;
  max-width: 500px;
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
</style>
