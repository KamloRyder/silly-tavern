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
        <DialogueBox v-show="!dialogueClosed" ref="dialogueBoxRef" @new-message="handleNewMessage" />
      </template>
    </div>

    <!-- ==================== 战斗模式（模态框） ==================== -->
    <div v-if="gameStore.mode === 'combat' && !uiHidden" class="modal-overlay" @click="exitCombatMode">
      <div @click.stop>
        <CombatPanel @close="exitCombatMode" />
      </div>
    </div>

    <!-- ==================== 归所模式（模态框） ==================== -->
    <div v-if="gameStore.mode === 'sanctuary' && !uiHidden" class="modal-overlay sanctuary-modal">
      <div class="sanctuary-container" @click.stop>
        <SanctuaryView @close="exitSanctuaryMode" />
      </div>
    </div>

    <!-- ==================== 角色创建模式（模态框） ==================== -->
    <div v-if="gameStore.mode === 'creation' && !uiHidden" class="modal-overlay character-creation-overlay">
      <div @click.stop>
        <CharacterCreator :sync-to-tavern="true" character-type="player" @created="handleCharacterCreated" />
      </div>
    </div>

    <!-- ==================== 欢迎页面（模态框） ==================== -->
    <WelcomeModal v-if="showWelcome" @update-character="handleUpdateCharacter" @continue="handleContinue" />

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
      <!-- 角色创建按钮已移除，只能通过角色管理面板编辑 -->
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
        :class="{ active: (gameStore.mode as string) === 'sanctuary' }"
        title="归所"
        @click="toggleSanctuary"
      >
        🏠
      </button>
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
      <button class="control-btn" :class="{ active: showInventory }" title="背包" @click="toggleInventory">🎒</button>
      <button class="control-btn" :class="{ active: showAPIConfig }" title="API 配置" @click="toggleAPIConfig">
        ⚙️
      </button>
      <button class="control-btn" :class="{ active: showTestPanel }" title="集成测试" @click="toggleTestPanel">
        🧪
      </button>
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

    <!-- 切换对话框按钮（右下角） -->
    <button
      v-if="!uiHidden && gameStore.mode === 'main'"
      class="toggle-dialogue-btn"
      :class="{ active: !dialogueClosed }"
      :title="dialogueClosed ? '显示对话框' : '隐藏对话框'"
      @click="toggleDialogue"
    >
      💬
    </button>

    <!-- 全屏按钮（右上角） -->
    <button
      v-if="!uiHidden && gameStore.mode !== 'sanctuary'"
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
    <div v-if="showCharacterCreator && !uiHidden" class="modal-overlay">
      <div @click.stop>
        <CharacterCreator
          :sync-to-tavern="true"
          :character-type="editingCharacter?.type || 'player'"
          :editing-character="editingCharacter"
          @created="handleCharacterCreated"
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

    <!-- 背包面板（模态框） -->
    <div v-if="showInventory && !uiHidden" class="modal-overlay" @click="toggleInventory">
      <div @click.stop>
        <InventoryPanel @close="toggleInventory" />
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
        <InstanceRecord @close="toggleInstanceRecord" />
      </div>
    </div>

    <!-- API 配置面板（模态框） -->
    <div v-if="showAPIConfig && !uiHidden" class="modal-overlay" @click="toggleAPIConfig">
      <div @click.stop>
        <APIConfigPanel @close="toggleAPIConfig" />
      </div>
    </div>

    <!-- 集成测试面板（模态框） -->
    <div v-if="showTestPanel && !uiHidden" class="modal-overlay" @click="toggleTestPanel">
      <div @click.stop>
        <TestPanel @close="toggleTestPanel" />
      </div>
    </div>

    <!-- 剧情回顾面板（左侧，仅在主模式显示） -->
    <PlotReview v-if="showPlotReview && !uiHidden && gameStore.mode === 'main'" @close="togglePlotReview" />

    <!-- 剧情回顾按钮（左上角，仅在主模式显示） -->
    <button
      v-if="!uiHidden && gameStore.mode === 'main'"
      class="plot-review-btn"
      :class="{ active: showPlotReview }"
      title="剧情回顾"
      @click="togglePlotReview"
    >
      📜
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { memoryFragmentService } from '../services/memoryFragmentService';
import { mvuService } from '../services/mvuService';
import { tavernService } from '../services/tavernService';
import { useCharacterStore } from '../stores/characterStore';
import { useGameStore } from '../stores/gameStore';
import type { Character } from '../types/character';
import APIConfigPanel from './APIConfigPanel.vue';
import Background from './Background.vue';
import CharacterCreator from './CharacterCreator.vue';
import CharacterPanel from './CharacterPanel.vue';
import CharacterSprite from './CharacterSprite.vue';
import CombatPanel from './CombatPanel.vue';
import DialogueBox from './DialogueBox.vue';
import DiceRoller from './DiceRoller.vue';
import InstanceGenerator from './InstanceGenerator.vue';
import InstanceRecord from './InstanceRecord.vue';
import InventoryPanel from './InventoryPanel.vue';
import MapPanel from './MapPanel.vue';
import PlotReview from './PlotReview.vue';
import SanctuaryView from './SanctuaryView.vue';
import StatusBar from './StatusBar.vue';
import TestPanel from './TestPanel.vue';
import WelcomeModal from './WelcomeModal.vue';

// ==================== Store ====================
const characterStore = useCharacterStore();
const gameStore = useGameStore();

// ==================== 状态 ====================
const showWelcome = ref(true); // 每次刷新都显示欢迎页面
const showCharacterPanel = ref(false);
const showCharacterCreator = ref(false);
const showDiceRoller = ref(false);
const showMapPanel = ref(false);
const showInventory = ref(false);
const showInstanceGenerator = ref(false);
const showInstanceRecord = ref(false);
const showPlotReview = ref(false);
const showAPIConfig = ref(false);
const showTestPanel = ref(false);
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

// ==================== 监听器 ====================

// 当模式切换时，自动关闭剧情回顾面板
watch(
  () => gameStore.mode,
  newMode => {
    if (newMode !== 'main' && showPlotReview.value) {
      showPlotReview.value = false;
    }
  },
);

// ==================== 方法 ====================

/**
 * 切换角色面板
 */
function toggleCharacterPanel(): void {
  showCharacterPanel.value = !showCharacterPanel.value;
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
 * 切换背包面板
 */
function toggleInventory(): void {
  showInventory.value = !showInventory.value;
}

/**
 * 切换副本生成器
 */
function toggleInstanceGenerator(): void {
  showInstanceGenerator.value = !showInstanceGenerator.value;
}

/**
 * 切换剧情回顾
 */
function togglePlotReview(): void {
  showPlotReview.value = !showPlotReview.value;
}

/**
 * 切换副本记录
 */
function toggleInstanceRecord(): void {
  showInstanceRecord.value = !showInstanceRecord.value;
}

/**
 * 切换 API 配置面板
 */
function toggleAPIConfig(): void {
  showAPIConfig.value = !showAPIConfig.value;
}

/**
 * 切换集成测试面板
 */
function toggleTestPanel(): void {
  showTestPanel.value = !showTestPanel.value;
}

/**
 * 进入归所模式
 */
function toggleSanctuary(): void {
  if (gameStore.mode === 'sanctuary') {
    exitSanctuaryMode();
  } else {
    gameStore.setMode('sanctuary');
  }
}

/**
 * 退出归所模式
 */
function exitSanctuaryMode(): void {
  gameStore.setMode('main');
}

/**
 * 退出角色创建模式
 */
function exitCreationMode(): void {
  gameStore.setMode('main');
}

/**
 * 处理更新主控按钮
 */
function handleUpdateCharacter(): void {
  console.log('[MainInterface] 关闭欢迎页面，进入角色创建');
  showWelcome.value = false;
  // 触发角色创建模式
  gameStore.setMode('creation');
}

/**
 * 处理继续游戏按钮
 */
function handleContinue(): void {
  console.log('[MainInterface] 关闭欢迎页面，继续游戏');
  showWelcome.value = false;
  // 保持在主模式
}

/**
 * 处理角色创建完成
 */
async function handleCharacterCreated(character: Character): Promise<void> {
  console.log('[MainInterface] 角色创建完成:', character.name);
  showCharacterCreator.value = false;
  editingCharacter.value = undefined;

  // 如果在创建模式，退出到主模式
  if (gameStore.mode === 'creation') {
    exitCreationMode();
  }

  toastr.success(`角色 ${character.name} 创建成功！`);

  // 如果是主控角色，调用 characterInitializer 处理后续流程
  if (character.type === 'player') {
    console.log('[MainInterface] 检测到主控角色创建，调用 characterInitializer.onCharacterCreated()');
    try {
      const { characterInitializer } = await import('../services/characterInitializer');
      await characterInitializer.onCharacterCreated(character as any);
      console.log('[MainInterface] ✅ 主控角色创建后处理完成');
    } catch (error) {
      console.error('[MainInterface] ❌ 主控角色创建后处理失败:', error);
      toastr.error('角色创建后处理失败，请查看控制台');
    }
  }
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
 * 处理新消息到达
 * 自动显示对话框
 */
function handleNewMessage(): void {
  console.log('[MainInterface] 收到新消息，自动显示对话框');
  if (dialogueClosed.value) {
    dialogueClosed.value = false;
    dialogueBoxRef.value?.openDialogue();
  }
}

/**
 * 切换对话框显示/隐藏
 */
function toggleDialogue(): void {
  if (dialogueClosed.value) {
    // 显示对话框
    dialogueClosed.value = false;
    dialogueBoxRef.value?.openDialogue();
  } else {
    // 隐藏对话框
    dialogueClosed.value = true;
  }
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
 * 初始化
 */
async function initialize(): Promise<void> {
  try {
    console.log('[MainInterface] 开始初始化...');

    // 初始化 MVU 服务
    console.log('[MainInterface] 1/9 初始化 MVU 服务...');
    await mvuService.initialize();

    // 初始化酒馆服务
    console.log('[MainInterface] 2/9 初始化酒馆服务...');
    tavernService.initialize();
    tavernService.setupEventListeners();

    // 加载角色数据
    console.log('[MainInterface] 3/9 加载角色数据...');
    await characterStore.loadFromMVU();
    console.log('[MainInterface] 角色数据加载完成，hasPlayer:', characterStore.hasPlayer);

    // 初始化游戏状态
    console.log('[MainInterface] 4/9 初始化游戏状态...');
    await gameStore.initialize();

    // 初始化记忆碎片服务
    console.log('[MainInterface] 5/9 初始化记忆碎片服务...');
    await memoryFragmentService.initialize();
    memoryFragmentService.startListening();

    // 初始化事件记录服务
    console.log('[MainInterface] 6/9 初始化事件记录服务...');
    const { eventRecordService } = await import('../services/eventRecordService');
    eventRecordService.initialize();

    // 初始化 API 配置服务
    console.log('[MainInterface] 7/9 初始化 API 配置服务...');
    const { apiConfigService } = await import('../services/apiConfigService');
    await apiConfigService.initialize();

    // 初始化归所服务
    console.log('[MainInterface] 8/10 初始化归所服务...');
    const { sanctuaryService } = await import('../services/sanctuaryService');
    await sanctuaryService.initialize();

    // 初始化背包系统
    console.log('[MainInterface] 9/10 初始化背包系统...');
    try {
      const { useInventoryStore } = await import('../stores/inventoryStore');
      const inventoryStore = useInventoryStore();
      await inventoryStore.loadFromGlobal();
      console.log('[MainInterface] 背包系统初始化完成');
    } catch (error) {
      console.error('[MainInterface] 背包系统初始化失败:', error);
      // 不阻塞主流程，继续初始化
    }

    // 检查并初始化主控角色（第 0 楼自动初始化）
    console.log('[MainInterface] 10/10 检查主控角色初始化...');
    const { characterInitializer } = await import('../services/characterInitializer');
    const needsInit = await characterInitializer.checkAndInitialize();
    if (needsInit) {
      console.log('[MainInterface] ✅ 需要初始化主控角色，等待欢迎页面显示');
    } else {
      console.log('[MainInterface] ℹ️ 无需初始化主控角色');
    }

    console.log('[MainInterface] ✅ 初始化完成');
    toastr.success('无限流系统初始化完成');
  } catch (error) {
    console.error('[MainInterface] ❌ 初始化失败:', error);
    toastr.error('初始化失败，请刷新页面重试');
  }
}

// ==================== 生命周期 ====================
onMounted(() => {
  // 先注册事件监听器，再执行初始化
  console.log('[MainInterface] 注册事件监听器...');

  // 监听全屏状态变化
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
  document.addEventListener('msfullscreenchange', handleFullscreenChange);

  // 欢迎页面现在每次刷新都显示，不需要监听初始化事件

  // 监听角色创建完成事件（用于从创建模式返回）
  eventOn('character_created', async () => {
    console.log('[MainInterface] 角色创建完成，同步到酒馆并生成现实世界地图');

    try {
      // 同步到酒馆角色卡
      const { characterInitializer } = await import('../services/characterInitializer');
      await characterInitializer.syncToSillyTavern();

      // 生成现实世界地图
      const { realWorldMapService } = await import('../services/realWorldMapService');
      const characterStore = useCharacterStore();
      if (characterStore.player) {
        // 检查是否已有地图
        const hasMap = await realWorldMapService.hasMap();
        if (!hasMap) {
          console.log('[MainInterface] 开始生成现实世界地图...');
          await realWorldMapService.generateMap(characterStore.player);
          console.log('[MainInterface] 现实世界地图生成成功');
        } else {
          console.log('[MainInterface] 现实世界地图已存在，跳过生成');
        }
      }
    } catch (error) {
      console.error('[MainInterface] 角色创建后处理失败:', error);
      toastr.error('角色创建后处理失败，请检查控制台');
    } finally {
      // 如果在创建模式，返回主模式
      if (gameStore.mode === 'creation') {
        gameStore.setMode('main');
      }
    }
  });

  console.log('[MainInterface] 事件监听器注册完成，开始初始化...');

  // 在下一个事件循环中执行初始化，确保事件监听器已注册
  setTimeout(() => {
    initialize();
  }, 0);
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
  @include control-panel-position;

  // 添加底部渐变遮罩，提示可以滚动
  &::after {
    content: '';
    position: sticky;
    bottom: 0;
    left: 0;
    right: 0;
    height: 20px;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.5), transparent);
    pointer-events: none;
    opacity: 0;
    transition: opacity $transition-base;
  }

  // 当内容超出时显示渐变
  &:hover::after {
    opacity: 1;
  }

  @include mobile {
    // 移动端始终显示渐变提示
    &::after {
      opacity: 0.7;
    }
  }
}

.control-btn {
  @include control-button;
  flex-shrink: 0; // 防止按钮被压缩
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

  // 角色创建页面使用更高的 z-index
  &.character-creation-overlay {
    z-index: $z-index-character-creation;
    background: rgba(0, 0, 0, 0.9);
  }

  &.sanctuary-modal {
    .sanctuary-container {
      width: 90vw;
      max-width: 1400px;
      height: 80vh;
      max-height: 800px;
      background: $color-bg-card;
      border: 2px solid $color-border-gold;
      border-radius: $border-radius-lg;
      overflow: hidden;
      box-shadow: $shadow-lg, $shadow-gold;
    }
  }
}

.ui-toggle-btn {
  @include round-button;
  @include fixed-bottom-left;

  // UI 隐藏时半透明
  &.ui-hidden {
    opacity: 0.5;
    background: rgba(20, 20, 20, 0.6);

    &:hover {
      opacity: 0.8;
    }
  }
}

.toggle-dialogue-btn {
  @include round-button;
  @include fixed-bottom-right;

  &.active {
    background: rgba(212, 175, 55, 0.3);
    border-color: $color-secondary-gold;
    box-shadow: $shadow-gold;
  }
}

.fullscreen-btn {
  @include round-button;
  @include fixed-top-right;
}

.plot-review-btn {
  @include round-button;
  @include fixed-top-left;

  &.active {
    background: rgba(212, 175, 55, 0.3);
    border-color: $color-secondary-gold;
    box-shadow: $shadow-gold;
  }
}
</style>
