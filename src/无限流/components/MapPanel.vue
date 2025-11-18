<template>
  <div class="map-panel">
    <div class="map-header">
      <h2>地图</h2>
      <div class="map-tabs">
        <button class="tab-btn" :class="{ active: currentTab === 'realworld' }" @click="currentTab = 'realworld'">
          现实世界
        </button>
        <button
          v-if="instanceStore.currentInstance"
          class="tab-btn"
          :class="{ active: currentTab === 'instance' }"
          @click="currentTab = 'instance'"
        >
          副本地图
        </button>
      </div>
      <div v-if="currentTab === 'instance' && instanceStore.currentInstance" class="instance-name">
        {{ instanceStore.currentInstance.name }}
      </div>
    </div>

    <!-- 现实世界地图 -->
    <div v-if="currentTab === 'realworld'">
      <div v-if="!realWorldMap" class="no-map">
        <p>现实世界地图尚未生成</p>
        <button class="btn-generate" @click="generateRealWorldMap">生成地图</button>
      </div>
      <div v-else>
        <div v-if="currentRealWorldArea" class="current-area">
          <h3>当前位置</h3>
          <div class="area-card current">
            <div class="area-name">{{ currentRealWorldArea.name }}</div>
            <div v-if="currentRealWorldArea.description" class="area-description">
              {{ currentRealWorldArea.description }}
            </div>
            <button class="btn-view-details" @click="viewRealWorldAreaDetails">查看详情</button>
          </div>
        </div>

        <div v-if="connectedRealWorldAreas.length > 0" class="connected-areas">
          <h3>可前往的区域</h3>
          <div class="areas-list">
            <div
              v-for="area in connectedRealWorldAreas"
              :key="area.id"
              class="area-card"
              :class="{ discovered: area.isDiscovered, selected: selectedRealWorldArea?.id === area.id }"
              @click="selectRealWorldArea(area)"
            >
              <div class="area-name">
                {{ area.isDiscovered ? area.name : '???' }}
              </div>
              <div v-if="area.isDiscovered && area.description" class="area-description">
                {{ area.description }}
              </div>
            </div>
          </div>

          <!-- 前进和确认按钮 -->
          <div v-if="selectedRealWorldArea" class="action-buttons">
            <button class="btn-action btn-move" @click="moveToRealWorldArea">前进</button>
            <button class="btn-action btn-confirm" @click="confirmMoveToRealWorld">确认</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 副本地图 -->
    <div v-if="currentTab === 'instance'">
      <div v-if="!instanceStore.currentInstance" class="no-map">
        <p>当前没有活跃的副本</p>
      </div>
      <div v-else>
        <div v-if="instanceStore.currentArea" class="current-area">
          <h3>当前位置</h3>
          <div class="area-card current">
            <div class="area-name">{{ instanceStore.currentArea.name }}</div>
            <div v-if="instanceStore.currentArea.description" class="area-description">
              {{ instanceStore.currentArea.description }}
            </div>
            <button class="btn-view-details" @click="viewInstanceAreaDetails">查看详情</button>
          </div>
        </div>

        <div v-if="instanceStore.connectedAreas.length > 0" class="connected-areas">
          <h3>可前往的区域</h3>
          <div class="areas-list">
            <div
              v-for="area in instanceStore.connectedAreas"
              :key="area.id"
              class="area-card"
              :class="{ discovered: area.isDiscovered, selected: selectedInstanceArea?.id === area.id }"
              @click="selectInstanceArea(area)"
            >
              <div class="area-name">
                {{ area.isDiscovered ? area.name : '???' }}
              </div>
              <div v-if="area.isDiscovered && area.description" class="area-description">
                {{ area.description }}
              </div>
            </div>
          </div>

          <!-- 前进和确认按钮 -->
          <div v-if="selectedInstanceArea" class="action-buttons">
            <button class="btn-action btn-move" @click="moveToInstanceArea">前进</button>
            <button class="btn-action btn-confirm" @click="confirmMoveToInstance">确认</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 区域详情模态框 -->
    <AreaDetailsModal
      v-if="showAreaDetails && areaToView"
      :area="areaToView"
      :is-real-world="isViewingRealWorld"
      @close="closeAreaDetails"
      @item-picked-up="handleItemPickedUp"
      @details-generated="handleDetailsGenerated"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useCharacterStore } from '../stores/characterStore';
import { useInstanceStore } from '../stores/instanceStore';
import { useInventoryStore } from '../stores/inventoryStore';
import type { Area, MapData } from '../types/instance';
import AreaDetailsModal from './AreaDetailsModal.vue';

// ==================== Emits ====================
const emit = defineEmits<{
  close: [];
}>();

const instanceStore = useInstanceStore();
const characterStore = useCharacterStore();
const inventoryStore = useInventoryStore();
const isMoving = ref(false);
const currentTab = ref<'realworld' | 'instance'>('realworld');
const realWorldMap = ref<MapData | null>(null);
const selectedRealWorldArea = ref<Area | null>(null);
const selectedInstanceArea = ref<Area | null>(null);
const showAreaDetails = ref(false);
const areaToView = ref<Area | null>(null);
const isViewingRealWorld = ref(false);

// 计算当前现实世界区域
const currentRealWorldArea = computed(() => {
  if (!realWorldMap.value) return null;
  const playerLocation = realWorldMap.value.playerLocation;
  return realWorldMap.value.areas.get(playerLocation) || null;
});

// 计算连接的现实世界区域
const connectedRealWorldAreas = computed(() => {
  if (!currentRealWorldArea.value) return [];
  return currentRealWorldArea.value.connectedAreas
    .map(areaId => realWorldMap.value?.areas.get(areaId))
    .filter((area): area is Area => area !== undefined);
});

// 加载现实世界地图
async function loadRealWorldMap(): Promise<void> {
  try {
    const { realWorldMapService } = await import('../services/realWorldMapService');
    realWorldMap.value = await realWorldMapService.loadMap();
    console.log('[MapPanel] 现实世界地图加载完成:', realWorldMap.value ? '成功' : '未找到');
  } catch (error) {
    console.error('[MapPanel] 加载现实世界地图失败:', error);
  }
}

// 生成现实世界地图
async function generateRealWorldMap(): Promise<void> {
  if (!characterStore.player) {
    toastr.error('请先创建主控角色');
    return;
  }

  try {
    toastr.info('正在生成现实世界地图...');
    const { realWorldMapService } = await import('../services/realWorldMapService');
    realWorldMap.value = await realWorldMapService.generateMap(characterStore.player);
    toastr.success('现实世界地图生成成功！');
  } catch (error) {
    console.error('[MapPanel] 生成现实世界地图失败:', error);
    toastr.error('生成现实世界地图失败');
  }
}

// 选择现实世界区域
function selectRealWorldArea(area: Area): void {
  if (area.id === currentRealWorldArea.value?.id) {
    toastr.info('你已经在这个区域了');
    return;
  }
  selectedRealWorldArea.value = area;
  selectedInstanceArea.value = null; // 清除副本选择
  console.log(`[Map Panel] 选择现实世界区域: ${area.name}`);
}

// 选择副本区域
function selectInstanceArea(area: Area): void {
  if (area.id === instanceStore.currentArea?.id) {
    toastr.info('你已经在这个区域了');
    return;
  }
  selectedInstanceArea.value = area;
  selectedRealWorldArea.value = null; // 清除现实世界选择
  console.log(`[Map Panel] 选择副本区域: ${area.name}`);
}

// 移动到现实世界区域（不发送消息）
async function moveToRealWorldArea(): Promise<void> {
  if (!selectedRealWorldArea.value || isMoving.value) return;

  const targetArea = selectedRealWorldArea.value;

  try {
    isMoving.value = true;

    // 更新地图中的玩家位置
    const { realWorldMapService } = await import('../services/realWorldMapService');
    await realWorldMapService.updatePlayerLocation(targetArea.id);

    // 重新加载地图以更新状态
    await loadRealWorldMap();

    // 清除选择
    selectedRealWorldArea.value = null;

    toastr.success(`已移动到: ${targetArea.name}`);
    console.log(`[Map Panel] 已移动到现实世界区域: ${targetArea.name}`);
  } catch (error) {
    console.error('[Map Panel] 移动失败:', error);
    toastr.error('移动失败');
  } finally {
    isMoving.value = false;
  }
}

// 确认移动到现实世界区域（发送消息并关闭地图）
async function confirmMoveToRealWorld(): Promise<void> {
  if (isMoving.value) return;

  const playerName = characterStore.player?.name || '主控';
  const currentLocation = currentRealWorldArea.value?.name || '当前位置';

  try {
    isMoving.value = true;

    // 在对话框中输入并发送移动指令
    const message = `${playerName}在${currentLocation}`;
    console.log(`[Map Panel] 发送确认消息: ${message}`);

    // 使用 generate 发送消息并触发 AI 生成
    await generate({ user_input: message });

    toastr.success('已发送位置信息');

    // 关闭地图面板
    emit('close');
  } catch (error) {
    console.error('[Map Panel] 发送消息失败:', error);
    toastr.error('发送消息失败');
  } finally {
    isMoving.value = false;
  }
}

// 移动到副本区域（不发送消息）
async function moveToInstanceArea(): Promise<void> {
  if (!selectedInstanceArea.value || isMoving.value) return;

  const targetArea = selectedInstanceArea.value;

  try {
    isMoving.value = true;

    // 更新副本中的玩家位置
    await instanceStore.updatePlayerLocation(targetArea.id);

    if (!targetArea.isDiscovered) {
      await instanceStore.discoverArea(targetArea.id);
    }

    // 清除选择
    selectedInstanceArea.value = null;

    toastr.success(`已移动到: ${targetArea.name}`);
    console.log(`[Map Panel] 已移动到副本区域: ${targetArea.name}`);
  } catch (error) {
    console.error('[Map Panel] 移动失败:', error);
    toastr.error('移动失败');
  } finally {
    isMoving.value = false;
  }
}

// 确认移动到副本区域（发送消息并关闭地图）
async function confirmMoveToInstance(): Promise<void> {
  if (isMoving.value) return;

  const playerName = characterStore.player?.name || '主控';
  const currentLocation = instanceStore.currentArea?.name || '当前位置';

  try {
    isMoving.value = true;

    // 在对话框中输入并发送移动指令
    const message = `${playerName}在${currentLocation}`;
    console.log(`[Map Panel] 发送确认消息: ${message}`);

    // 使用 generate 发送消息并触发 AI 生成
    await generate({ user_input: message });

    toastr.success('已发送位置信息');

    // 关闭地图面板
    emit('close');
  } catch (error) {
    console.error('[Map Panel] 发送消息失败:', error);
    toastr.error('发送消息失败');
  } finally {
    isMoving.value = false;
  }
}

// 查看现实世界区域详情
function viewRealWorldAreaDetails(): void {
  if (!currentRealWorldArea.value) return;
  viewAreaDetails(currentRealWorldArea.value, true);
}

// 查看副本区域详情
function viewInstanceAreaDetails(): void {
  if (!instanceStore.currentArea) return;
  viewAreaDetails(instanceStore.currentArea, false);
}

// 通用的查看区域详情方法
function viewAreaDetails(area: Area, isRealWorld: boolean): void {
  areaToView.value = area;
  isViewingRealWorld.value = isRealWorld;
  showAreaDetails.value = true;
}

// 关闭区域详情
function closeAreaDetails(): void {
  showAreaDetails.value = false;
  areaToView.value = null;
}

// 处理详细信息生成
async function handleDetailsGenerated(details: import('../types/instance').AreaDetails): Promise<void> {
  if (!areaToView.value) return;

  try {
    // 保存详细信息到区域数据
    areaToView.value.details = details;

    // 保存地图数据
    if (isViewingRealWorld.value) {
      const { realWorldMapService } = await import('../services/realWorldMapService');
      if (realWorldMap.value) {
        await realWorldMapService.saveMap(realWorldMap.value);
      }
    } else {
      await instanceStore.saveToMVU();
    }
    console.log('[MapPanel] 区域详细信息已保存');
  } catch (error) {
    console.error('[MapPanel] 保存区域详细信息失败:', error);
  }
}

// 处理道具拾取
async function handleItemPickedUp(): Promise<void> {
  try {
    // 保存地图数据
    if (isViewingRealWorld.value) {
      const { realWorldMapService } = await import('../services/realWorldMapService');
      if (realWorldMap.value) {
        await realWorldMapService.saveMap(realWorldMap.value);
      }
    } else {
      await instanceStore.saveToMVU();
    }
    console.log('[MapPanel] 地图数据已保存');
  } catch (error) {
    console.error('[MapPanel] 保存地图数据失败:', error);
  }
}

onMounted(async () => {
  try {
    await loadRealWorldMap();
    await inventoryStore.loadFromGlobal();
  } catch (error) {
    console.error('[MapPanel] 初始化失败:', error);
    // 不阻塞界面显示
  }
});
</script>

<style lang="scss" scoped>
@import '../styles/global.scss';

.map-panel {
  @include modal-container;
  width: 100%;
  max-width: 800px;
}

.map-header {
  text-align: center;
  margin-bottom: $spacing-lg;

  @include mobile {
    margin-bottom: $spacing-md;
  }

  h2 {
    @include modal-title;
    margin: 0;
    margin-bottom: $spacing-md;
  }
}

.map-tabs {
  display: flex;
  gap: $spacing-sm;
  justify-content: center;
  margin-bottom: $spacing-md;

  @include mobile {
    gap: $spacing-xs;
    margin-bottom: $spacing-sm;
  }
}

.tab-btn {
  padding: $spacing-sm $spacing-lg;
  background: rgba(0, 0, 0, 0.6);
  border: 2px solid $color-border-dark;
  border-radius: $border-radius-md;
  color: $color-text-secondary;
  font-size: $font-size-base;
  cursor: pointer;
  transition: all $transition-fast;

  @include mobile {
    padding: $spacing-xs $spacing-md;
    font-size: $font-size-sm;
    border-width: 1px;
  }

  &:hover {
    border-color: $color-border-gold;
    color: $color-text-gold;
  }

  &.active {
    background: rgba(212, 175, 55, 0.2);
    border-color: $color-border-gold;
    color: $color-text-gold;
    box-shadow: $shadow-gold;
  }
}

.instance-name {
  font-size: $font-size-base;
  color: $color-text-secondary;
  margin-top: $spacing-sm;

  @include mobile {
    font-size: $font-size-sm;
  }
}

.no-map {
  text-align: center;
  padding: $spacing-2xl;
  color: $color-text-secondary;

  @include mobile {
    padding: $spacing-xl;
  }

  p {
    margin-bottom: $spacing-lg;
    font-size: $font-size-lg;

    @include mobile {
      font-size: $font-size-base;
      margin-bottom: $spacing-md;
    }
  }
}

.btn-generate {
  padding: $spacing-md $spacing-xl;
  background: linear-gradient(135deg, rgba(212, 175, 55, 0.3), rgba(212, 175, 55, 0.5));
  border: 2px solid $color-border-gold;
  border-radius: $border-radius-md;
  color: $color-text-gold;
  font-size: $font-size-base;
  font-weight: $font-weight-bold;
  cursor: pointer;
  transition: all $transition-base;

  @include mobile {
    padding: $spacing-sm $spacing-lg;
    font-size: $font-size-sm;
    border-width: 1px;
  }

  &:hover {
    background: linear-gradient(135deg, rgba(212, 175, 55, 0.5), rgba(212, 175, 55, 0.7));
    box-shadow: $shadow-gold;
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }
}

.current-area,
.connected-areas {
  margin-bottom: $spacing-lg;

  @include mobile {
    margin-bottom: $spacing-md;
  }

  h3 {
    font-size: $font-size-lg;
    color: $color-text-gold;
    margin-bottom: $spacing-md;

    @include mobile {
      font-size: $font-size-base;
      margin-bottom: $spacing-sm;
    }
  }
}

.areas-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.area-card {
  padding: $spacing-md;
  background: rgba(0, 0, 0, 0.6);
  border: 2px solid $color-border-dark;
  border-radius: $border-radius-md;
  cursor: pointer;
  transition: all $transition-fast;

  @include mobile {
    padding: $spacing-sm;
    border-width: 1px;
  }

  &:hover {
    border-color: $color-border-gold;
    transform: translateY(-2px);
    box-shadow: $shadow-gold;
  }

  &.current {
    border-color: $color-primary-gold;
    cursor: default;
    background: rgba(212, 175, 55, 0.1);

    &:hover {
      transform: none;
    }
  }

  &.discovered {
    border-color: $color-border-gold;
  }

  &.selected {
    border-color: $color-secondary-gold;
    background: rgba(212, 175, 55, 0.2);
    box-shadow: $shadow-gold;
  }
}

.action-buttons {
  display: flex;
  gap: $spacing-md;
  margin-top: $spacing-lg;
  justify-content: center;

  @include mobile {
    gap: $spacing-sm;
    margin-top: $spacing-md;
  }
}

.btn-action {
  padding: $spacing-md $spacing-xl;
  border: 2px solid;
  border-radius: $border-radius-md;
  font-size: $font-size-base;
  font-weight: $font-weight-bold;
  cursor: pointer;
  transition: all $transition-base;
  min-width: 100px;

  @include mobile {
    padding: $spacing-sm $spacing-lg;
    font-size: $font-size-sm;
    border-width: 1px;
    min-width: 80px;
  }

  &.btn-move {
    background: linear-gradient(135deg, rgba(33, 150, 243, 0.3), rgba(33, 150, 243, 0.5));
    border-color: $color-info;
    color: $color-info;

    &:hover {
      background: linear-gradient(135deg, rgba(33, 150, 243, 0.5), rgba(33, 150, 243, 0.7));
      box-shadow: 0 0 20px rgba(33, 150, 243, 0.3);
      transform: translateY(-2px);
    }

    &:active {
      transform: translateY(0);
    }
  }

  &.btn-confirm {
    background: linear-gradient(135deg, rgba(76, 175, 80, 0.3), rgba(76, 175, 80, 0.5));
    border-color: $color-success;
    color: $color-success;

    &:hover {
      background: linear-gradient(135deg, rgba(76, 175, 80, 0.5), rgba(76, 175, 80, 0.7));
      box-shadow: 0 0 20px rgba(76, 175, 80, 0.3);
      transform: translateY(-2px);
    }

    &:active {
      transform: translateY(0);
    }
  }
}

.area-name {
  font-size: $font-size-lg;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
  margin-bottom: $spacing-xs;

  @include mobile {
    font-size: $font-size-base;
  }
}

.area-description {
  color: $color-text-secondary;
  font-size: $font-size-sm;
  line-height: 1.5;

  @include mobile {
    font-size: $font-size-xs;
  }
}

.btn-view-details {
  margin-top: $spacing-md;
  padding: $spacing-sm $spacing-lg;
  background: linear-gradient(135deg, rgba(33, 150, 243, 0.3), rgba(33, 150, 243, 0.5));
  border: 2px solid $color-info;
  border-radius: $border-radius-md;
  color: $color-info;
  font-size: $font-size-base;
  font-weight: $font-weight-bold;
  cursor: pointer;
  transition: all $transition-base;
  width: 100%;

  @include mobile {
    padding: $spacing-xs $spacing-md;
    font-size: $font-size-sm;
    border-width: 1px;
    margin-top: $spacing-sm;
  }

  &:hover {
    background: linear-gradient(135deg, rgba(33, 150, 243, 0.5), rgba(33, 150, 243, 0.7));
    box-shadow: 0 0 20px rgba(33, 150, 243, 0.3);
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }
}
</style>
