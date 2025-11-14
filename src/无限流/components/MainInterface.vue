<template>
  <div class="main-interface">
    <!-- ==================== 背景层 ==================== -->
    <div class="layer layer-background">
      <Background :background-url="currentBackground" />
    </div>

    <!-- ==================== 立绘层 ==================== -->
    <div class="layer layer-sprite">
      <CharacterSprite v-for="sprite in activeSprites" :key="sprite.characterId" :sprite-data="sprite" />
    </div>

    <!-- ==================== UI 层 ==================== -->
    <div v-show="!uiHidden" class="layer layer-ui">
      <!-- 主游戏模式 UI -->
      <template v-if="gameStore.mode === 'main'">
        <!-- 状态栏 -->
        <StatusBar v-show="characterStore.hasPlayer" />

        <!-- 对话框 -->
        <DialogueBox v-show="!dialogueClosed" ref="dialogueBoxRef" @closed="dialogueClosed = true" />
      </template>

      <!-- 战斗模式 UI -->
      <template v-if="gameStore.mode === 'combat'">
        <CombatPanel @close="exitCombatMode" />
      </template>

      <!-- 互动室模式 UI -->
      <template v-if="gameStore.mode === 'interaction'">
        <InteractionRoom @close="exitInteractionMode" />
      </template>

      <!-- 角色创建模式 UI -->
      <template v-if="gameStore.mode === 'creation'">
        <CharacterCreator
          :sync-to-tavern="true"
          character-type="player"
          @created="handleCharacterCreated"
          @cancelled="exitCreationMode"
        />
      </template>
    </div>

    <!-- ==================== 控制面板（常驻） ==================== -->
    <div v-if="!uiHidden && gameStore.mode === 'main'" class="control-panel">
      <button
        class="control-btn"
        :class="{ active: showCharacterPanel }"
        title="角色管理"
        @click="toggleCharacterPanel"
      >
        👥
      </button>
      <button
        class="control-btn"
        :class="{ active: showCharacterCreator }"
        title="创建角色"
        @click="toggleCharacterCreator"
      >
        ✨
      </button>
      <button
        class="control-btn"
        :class="{ active: showInstanceGenerator }"
        title="副本生成器"
        @click="toggleInstanceGenerator"
      >
        🎭
      </button>
      <button
        class="control-btn"
        :class="{ active: showInstanceRecord }"
        title="副本记录"
        @click="toggleInstanceRecord"
      >
        📖
      </button>
      <button
        class="control-btn"
        :class="{ active: (gameStore.mode as string) === 'interaction' }"
        title="互动室"
        @click="toggleInteractionRoom"
      >
        💬
      </button>
      <button class="control-btn" title="测试功能" @click="testFeatures">🧪</button>
      <button class="control-btn" :class="{ active: showDiceRoller }" title="投骰器" @click="toggleDiceRoller">
        🎲
      </button>
      <button
        class="control-btn"
        :class="{ active: (gameStore.mode as string) === 'combat' }"
        title="战斗面板"
        @click="toggleCombatPanel"
      >
        ⚔️
      </button>
      <button class="control-btn" :class="{ active: showMapPanel }" title="地图" @click="toggleMapPanel">🗺️</button>
    </div>

    <!-- UI恢复按钮（左下角，常驻） -->
    <button
      class="ui-toggle-btn"
      :class="{ 'ui-hidden': uiHidden }"
      :title="uiHidden ? '显示UI' : '隐藏UI'"
      @click="toggleUI"
    >
      {{ uiHidden ? '👁️' : '🙈' }}
    </button>

    <!-- 恢复对话框按钮（右下角） -->
    <button
      v-if="dialogueClosed && !uiHidden && gameStore.mode === 'main'"
      class="restore-dialogue-btn"
      title="恢复对话框"
      @click="restoreDialogue"
    >
      💬
    </button>

    <!-- 全屏按钮（右上角） -->
    <button
      v-if="!uiHidden"
      class="fullscreen-btn"
      :title="isFullscreen ? '退出全屏' : '全屏显示'"
      @click="toggleFullscreen"
    >
      {{ isFullscreen ? '🗗' : '⛶' }}
    </button>

    <!-- 角色面板（模态框） -->
    <div v-if="showCharacterPanel && !uiHidden" class="modal-overlay" @click="toggleCharacterPanel">
      <div @click.stop>
        <CharacterPanel @close="toggleCharacterPanel" @edit="handleEditCharacter" />
      </div>
    </div>

    <!-- 角色创建器（模态框） -->
    <div v-if="showCharacterCreator && !uiHidden" class="modal-overlay" @click="toggleCharacterCreator">
      <div @click.stop>
        <CharacterCreator
          :sync-to-tavern="true"
          :character-type="editingCharacter?.type || 'player'"
          :editing-character="editingCharacter"
          @created="handleCharacterCreated"
          @cancelled="toggleCharacterCreator"
        />
      </div>
    </div>

    <!-- 投骰器（模态框） -->
    <div v-if="showDiceRoller && !uiHidden" class="modal-overlay" @click="toggleDiceRoller">
      <div @click.stop>
        <DiceRoller @close="toggleDiceRoller" />
      </div>
    </div>

    <!-- 地图面板（模态框） -->
    <div v-if="showMapPanel && !uiHidden" class="modal-overlay" @click="toggleMapPanel">
      <div @click.stop>
        <MapPanel />
      </div>
    </div>

    <!-- 副本生成器（模态框） -->
    <div v-if="showInstanceGenerator && !uiHidden" class="modal-overlay" @click="toggleInstanceGenerator">
      <div @click.stop>
        <InstanceGenerator @close="toggleInstanceGenerator" />
      </div>
    </div>

    <!-- 副本记录（模态框） -->
    <div v-if="showInstanceRecord && !uiHidden" class="modal-overlay" @click="toggleInstanceRecord">
      <div @click.stop>
        <InstanceRecord />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { mvuService } from '../services/mvuService';
import { tavernService } from '../services/tavernService';
import { useCharacterStore } from '../stores/characterStore';
import { useGameStore } from '../stores/gameStore';
import type { Character } from '../types/character';
import Background from './Background.vue';
import CharacterCreator from './CharacterCreator.vue';
import CharacterPanel from './CharacterPanel.vue';
import CharacterSprite from './CharacterSprite.vue';
import CombatPanel from './CombatPanel.vue';
import DialogueBox from './DialogueBox.vue';
import DiceRoller from './DiceRoller.vue';
import InstanceGenerator from './InstanceGenerator.vue';
import InstanceRecord from './InstanceRecord.vue';
import InteractionRoom from './InteractionRoom.vue';
import MapPanel from './MapPanel.vue';
import StatusBar from './StatusBar.vue';

// ==================== Store ====================
const characterStore = useCharacterStore();
const gameStore = useGameStore();

// ==================== 状态 ====================
const showCharacterPanel = ref(false);
const showCharacterCreator = ref(false);
const showDiceRoller = ref(false);
const showMapPanel = ref(false);
const showInstanceGenerator = ref(false);
const showInstanceRecord = ref(false);
const dialogueClosed = ref(false);
const uiHidden = ref(false);
const isFullscreen = ref(false);
const dialogueBoxRef = ref<InstanceType<typeof DialogueBox> | null>(null);
const editingCharacter = ref<any>(undefined);

// ==================== 计算属性 ====================
const currentBackground = computed(() => {
  return gameStore.currentScene?.background || '';
});

const activeSprites = computed(() => {
  return gameStore.currentScene?.sprites || [];
});

// ==================== 方法 ====================

/**
 * 切换角色面板
 */
function toggleCharacterPanel(): void {
  showCharacterPanel.value = !showCharacterPanel.value;
}

/**
 * 切换角色创建器
 */
function toggleCharacterCreator(): void {
  showCharacterCreator.value = !showCharacterCreator.value;
}

/**
 * 切换投骰器
 */
function toggleDiceRoller(): void {
  showDiceRoller.value = !showDiceRoller.value;
}

/**
 * 进入战斗模式
 */
function toggleCombatPanel(): void {
  if (gameStore.mode === 'combat') {
    exitCombatMode();
  } else {
    gameStore.setMode('combat');
  }
}

/**
 * 退出战斗模式
 */
function exitCombatMode(): void {
  gameStore.setMode('main');
}

/**
 * 切换地图面板
 */
function toggleMapPanel(): void {
  showMapPanel.value = !showMapPanel.value;
}

/**
 * 切换副本生成器
 */
function toggleInstanceGenerator(): void {
  showInstanceGenerator.value = !showInstanceGenerator.value;
}

/**
 * 切换副本记录
 */
function toggleInstanceRecord(): void {
  showInstanceRecord.value = !showInstanceRecord.value;
}

/**
 * 进入互动室模式
 */
function toggleInteractionRoom(): void {
  if (gameStore.mode === 'interaction') {
    exitInteractionMode();
  } else {
    gameStore.setMode('interaction');
  }
}

/**
 * 退出互动室模式
 */
function exitInteractionMode(): void {
  gameStore.setMode('main');
}

/**
 * 退出角色创建模式
 */
function exitCreationMode(): void {
  gameStore.setMode('main');
}

/**
 * 处理角色创建完成
 */
function handleCharacterCreated(character: Character): void {
  console.log('[MainInterface] 角色创建完成:', character.name);
  showCharacterCreator.value = false;
  editingCharacter.value = undefined;

  // 如果在创建模式，退出到主模式
  if (gameStore.mode === 'creation') {
    exitCreationMode();
  }

  toastr.success(`角色 ${character.name} 创建成功！`);
}

/**
 * 处理编辑角色
 */
function handleEditCharacter(character: Character): void {
  editingCharacter.value = character;
  showCharacterPanel.value = false;
  showCharacterCreator.value = true;
}

/**
 * 恢复对话框
 */
function restoreDialogue(): void {
  dialogueClosed.value = false;
  // 调用 DialogueBox 组件的 openDialogue 方法
  dialogueBoxRef.value?.openDialogue();
}

/**
 * 切换UI显示/隐藏
 */
function toggleUI(): void {
  uiHidden.value = !uiHidden.value;
}

/**
 * 切换全屏
 */
function toggleFullscreen(): void {
  const element = document.documentElement;

  if (!isFullscreen.value) {
    // 进入全屏
    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if ((element as any).webkitRequestFullscreen) {
      (element as any).webkitRequestFullscreen();
    } else if ((element as any).msRequestFullscreen) {
      (element as any).msRequestFullscreen();
    }
  } else if (document.exitFullscreen) {
    // 退出全屏
    document.exitFullscreen();
  } else if ((document as any).webkitExitFullscreen) {
    (document as any).webkitExitFullscreen();
  } else if ((document as any).msExitFullscreen) {
    (document as any).msExitFullscreen();
  }
}

/**
 * 监听全屏状态变化
 */
function handleFullscreenChange(): void {
  isFullscreen.value = !!(
    document.fullscreenElement ||
    (document as any).webkitFullscreenElement ||
    (document as any).msFullscreenElement
  );
}

/**
 * 测试功能
 */
async function testFeatures(): Promise<void> {
  try {
    console.log('=== 开始测试功能 ===');

    // 测试 1: 检查 MVU 服务
    console.log('测试 1: 加载游戏数据');
    const gameData = await mvuService.loadGameData();
    console.log('游戏数据:', gameData);

    // 测试 2: 检查角色数据
    console.log('测试 2: 角色数据');
    console.log('主控角色:', characterStore.player);
    console.log('NPC 数量:', characterStore.npcCount);
    console.log('NPC 列表:', characterStore.npcList);

    // 测试 3: 检查酒馆服务
    console.log('测试 3: 酒馆服务');
    const chatId = tavernService.getCurrentChatId();
    console.log('当前聊天 ID:', chatId);

    // 测试 4: 检查游戏状态
    console.log('测试 4: 游戏状态');
    console.log('当前场景:', gameStore.currentScene);
    console.log('游戏模式:', gameStore.mode);

    toastr.success('功能测试完成，请查看控制台');
    console.log('=== 测试完成 ===');
  } catch (error) {
    console.error('[MainInterface] 测试失败:', error);
    toastr.error('测试失败，请查看控制台');
  }
}

/**
 * 初始化
 */
async function initialize(): Promise<void> {
  try {
    console.log('[MainInterface] 开始初始化...');

    // 初始化 MVU 服务
    await mvuService.initialize();

    // 初始化酒馆服务
    tavernService.initialize();
    tavernService.setupEventListeners();

    // 加载角色数据
    await characterStore.loadFromMVU();

    // 初始化游戏状态
    await gameStore.initialize();

    console.log('[MainInterface] 初始化完成');
    toastr.success('无限流系统初始化完成');
  } catch (error) {
    console.error('[MainInterface] 初始化失败:', error);
    toastr.error('初始化失败，请刷新页面重试');
  }
}

// ==================== 生命周期 ====================
onMounted(() => {
  initialize();

  // 监听全屏状态变化
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
  document.addEventListener('msfullscreenchange', handleFullscreenChange);
});

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
  document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
  document.removeEventListener('msfullscreenchange', handleFullscreenChange);
});
</script>

<style lang="scss" scoped>
@import '../styles/global.scss';

.main-interface {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9; // 使用 aspect-ratio 控制高度，不使用 vh
  overflow: hidden;
}

// ==================== 层级结构 ====================
.layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none; // 默认不接收事件

  // 子元素可以接收事件
  > * {
    pointer-events: auto;
  }
}

.layer-background {
  z-index: $z-index-background;
}

.layer-sprite {
  z-index: $z-index-sprite;
}

.layer-ui {
  z-index: $z-index-ui;
}

.control-panel {
  position: fixed;
  top: calc($spacing-lg + 50px + $spacing-md); // 全屏按钮高度 + 间距
  right: $spacing-lg;
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  z-index: $z-index-ui;
}

.control-btn {
  width: 40px;
  height: 40px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(20, 20, 20, 0.9);
  border: 2px solid $color-border-gold;
  border-radius: $border-radius-md;
  color: $color-text-gold;
  font-size: $font-size-xl;
  cursor: pointer;
  transition: all $transition-fast;
  box-shadow: $shadow-md;

  &:hover {
    background: rgba(212, 175, 55, 0.2);
    border-color: $color-secondary-gold;
    transform: translateX(-4px);
    box-shadow: $shadow-lg, $shadow-gold;
  }

  &:active {
    transform: translateX(-2px);
  }

  &.active {
    background: rgba(212, 175, 55, 0.3);
    border-color: $color-secondary-gold;
  }
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: $z-index-modal;
  backdrop-filter: blur(4px);
}

// 通用圆形按钮样式
@mixin round-button {
  width: 50px;
  height: 50px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(20, 20, 20, 0.9);
  border: 2px solid $color-border-gold;
  border-radius: 50%;
  color: $color-text-gold;
  font-size: $font-size-2xl;
  cursor: pointer;
  transition: all $transition-fast;
  box-shadow: $shadow-lg, $shadow-gold;
  z-index: $z-index-ui;

  &:hover {
    background: rgba(212, 175, 55, 0.2);
    border-color: $color-secondary-gold;
    transform: scale(1.1);
    box-shadow:
      $shadow-lg,
      0 0 30px rgba(212, 175, 55, 0.5);
  }

  &:active {
    transform: scale(1.05);
  }
}

.ui-toggle-btn {
  @include round-button;
  position: fixed;
  bottom: $spacing-lg;
  left: $spacing-lg;

  // UI 隐藏时半透明
  &.ui-hidden {
    opacity: 0.5;
    background: rgba(20, 20, 20, 0.6);

    &:hover {
      opacity: 0.8;
    }
  }
}

.restore-dialogue-btn {
  @include round-button;
  position: fixed;
  bottom: $spacing-lg;
  right: $spacing-lg;
}

.fullscreen-btn {
  @include round-button;
  position: fixed;
  top: $spacing-lg;
  right: $spacing-lg;
}
</style>
