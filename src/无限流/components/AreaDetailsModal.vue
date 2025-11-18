<template>
  <div class="area-details-modal-overlay" @click="$emit('close')">
    <div class="area-details-modal" @click.stop>
      <button class="close-btn" @click="$emit('close')">×</button>

      <h2 class="modal-title">{{ area.name }}</h2>

      <div v-if="loading" class="loading">
        <p>正在生成区域详细信息...</p>
      </div>

      <div v-else-if="details" class="details-content">
        <!-- 环境描述 -->
        <div class="detail-section">
          <h3>环境</h3>
          <p>{{ details.environment }}</p>
        </div>

        <!-- 氛围描述 -->
        <div class="detail-section">
          <h3>氛围</h3>
          <p>{{ details.atmosphere }}</p>
        </div>

        <!-- 可获取道具 -->
        <div v-if="details.items && details.items.length > 0" class="detail-section">
          <h3>可获取道具</h3>
          <div class="items-list">
            <div
              v-for="item in details.items"
              :key="item.id"
              class="item-card"
              :class="{ selected: selectedItem?.id === item.id }"
              @click="selectItem(item)"
            >
              <div class="item-header">
                <span class="item-name">{{ item.name }}</span>
                <span v-if="item.type" class="item-type">{{ item.type }}</span>
              </div>
              <p class="item-description">{{ item.description }}</p>
            </div>
          </div>

          <!-- 拾取和取消按钮 -->
          <div v-if="selectedItem" class="item-actions">
            <button class="btn-action btn-pickup" @click="pickupItem">拾取</button>
            <button class="btn-action btn-cancel-item" @click="selectedItem = null">取消</button>
          </div>
        </div>

        <div v-else class="no-items">
          <p>这里没有可获取的道具</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useInventoryStore } from '../stores/inventoryStore';
import type { Area, AreaDetails, Item } from '../types/instance';

// ==================== Props ====================
const props = defineProps<{
  area: Area;
  isRealWorld: boolean;
}>();

// ==================== Emits ====================
const emit = defineEmits<{
  close: [];
  itemPickedUp: [itemId: string];
  detailsGenerated: [details: AreaDetails];
}>();

// ==================== 状态 ====================
const inventoryStore = useInventoryStore();
const loading = ref(false);
const details = ref<AreaDetails | null>(null);
const selectedItem = ref<Item | null>(null);

// ==================== 方法 ====================

/**
 * 加载区域详细信息
 */
async function loadDetails(): Promise<void> {
  // 如果已有详细信息，直接使用
  if (props.area.details) {
    details.value = props.area.details;
    return;
  }

  // 否则生成新的详细信息
  loading.value = true;
  try {
    const { areaDetailsService } = await import('../services/areaDetailsService');
    const generated = await areaDetailsService.generateDetails(props.area, props.isRealWorld);
    details.value = generated;

    // 通知父组件保存详细信息到区域数据
    emit('detailsGenerated', generated);
  } catch (error) {
    console.error('[AreaDetailsModal] 加载详细信息失败:', error);
    toastr.error('加载详细信息失败');
  } finally {
    loading.value = false;
  }
}

/**
 * 选择道具
 */
function selectItem(item: Item): void {
  selectedItem.value = item;
  console.log(`[AreaDetailsModal] 选择道具: ${item.name}`);
}

/**
 * 拾取道具
 */
async function pickupItem(): Promise<void> {
  if (!selectedItem.value || !details.value) return;

  const item = selectedItem.value;

  try {
    // 添加获取时间和来源信息
    item.obtainedAt = Date.now();
    item.fromArea = props.area.name;

    // 添加到对应的背包
    if (props.isRealWorld) {
      inventoryStore.addToRealWorld(item);
    } else {
      inventoryStore.addToInstance(item);
    }

    // 从区域道具列表中移除
    const index = details.value.items.findIndex(i => i.id === item.id);
    if (index !== -1) {
      details.value.items.splice(index, 1);
    }

    // 保存背包数据
    await inventoryStore.saveToGlobal();

    // 通知父组件保存地图
    emit('itemPickedUp', item.id);

    toastr.success(`已拾取: ${item.name}`);
    selectedItem.value = null;
  } catch (error) {
    console.error('[AreaDetailsModal] 拾取道具失败:', error);
    toastr.error('拾取道具失败');
  }
}

// ==================== 生命周期 ====================
onMounted(() => {
  loadDetails();
});
</script>

<style lang="scss" scoped>
@import '../styles/global.scss';

.area-details-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: $z-index-modal + 10;
  backdrop-filter: blur(4px);
  padding: $spacing-md;

  @include mobile {
    padding: $spacing-sm;
  }
}

.area-details-modal {
  @include modal-container;
  max-width: 700px;
  position: relative;
}

.close-btn {
  @include modal-close-button;
}

.modal-title {
  @include modal-title;
}

.loading {
  text-align: center;
  padding: $spacing-2xl;
  color: $color-text-secondary;

  @include mobile {
    padding: $spacing-xl;
  }
}

.details-content {
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;

  @include mobile {
    gap: $spacing-md;
  }
}

.detail-section {
  h3 {
    font-size: $font-size-lg;
    color: $color-text-gold;
    margin-bottom: $spacing-sm;

    @include mobile {
      font-size: $font-size-base;
    }
  }

  p {
    color: $color-text-secondary;
    font-size: $font-size-base;
    line-height: 1.6;

    @include mobile {
      font-size: $font-size-sm;
    }
  }
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.item-card {
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

  &.selected {
    border-color: $color-secondary-gold;
    background: rgba(212, 175, 55, 0.2);
    box-shadow: $shadow-gold;
  }
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $spacing-xs;
}

.item-name {
  font-size: $font-size-lg;
  font-weight: $font-weight-bold;
  color: $color-text-primary;

  @include mobile {
    font-size: $font-size-base;
  }
}

.item-type {
  font-size: $font-size-sm;
  color: $color-text-gold;
  padding: 2px 8px;
  background: rgba(212, 175, 55, 0.2);
  border-radius: $border-radius-sm;

  @include mobile {
    font-size: $font-size-xs;
    padding: 1px 6px;
  }
}

.item-description {
  color: $color-text-secondary;
  font-size: $font-size-sm;
  line-height: 1.5;
  margin: 0;

  @include mobile {
    font-size: $font-size-xs;
  }
}

.item-actions {
  display: flex;
  gap: $spacing-md;
  margin-top: $spacing-md;
  justify-content: center;

  @include mobile {
    gap: $spacing-sm;
  }
}

.btn-action {
  padding: $spacing-sm $spacing-lg;
  border: 2px solid;
  border-radius: $border-radius-md;
  font-size: $font-size-base;
  font-weight: $font-weight-bold;
  cursor: pointer;
  transition: all $transition-base;
  min-width: 100px;

  @include mobile {
    padding: $spacing-xs $spacing-md;
    font-size: $font-size-sm;
    border-width: 1px;
    min-width: 80px;
  }

  &.btn-pickup {
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

  &.btn-cancel-item {
    background: linear-gradient(135deg, rgba(244, 67, 54, 0.3), rgba(244, 67, 54, 0.5));
    border-color: $color-danger;
    color: $color-danger;

    &:hover {
      background: linear-gradient(135deg, rgba(244, 67, 54, 0.5), rgba(244, 67, 54, 0.7));
      box-shadow: 0 0 20px rgba(244, 67, 54, 0.3);
      transform: translateY(-2px);
    }

    &:active {
      transform: translateY(0);
    }
  }
}

.no-items {
  text-align: center;
  padding: $spacing-xl;
  color: $color-text-muted;

  @include mobile {
    padding: $spacing-lg;
  }

  p {
    margin: 0;
    font-size: $font-size-base;

    @include mobile {
      font-size: $font-size-sm;
    }
  }
}
</style>
