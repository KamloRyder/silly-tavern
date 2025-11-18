<template>
  <div class="inventory-panel">
    <button class="close-btn" @click="$emit('close')">×</button>

    <h2 class="panel-title">背包</h2>

    <!-- 标签页切换 -->
    <div class="inventory-tabs">
      <button class="tab-btn" :class="{ active: currentTab === 'realworld' }" @click="currentTab = 'realworld'">
        现实世界
      </button>
      <button class="tab-btn" :class="{ active: currentTab === 'instance' }" @click="currentTab = 'instance'">
        副本背包
      </button>
    </div>

    <!-- 现实世界背包 -->
    <div v-if="currentTab === 'realworld'" class="inventory-content">
      <div v-if="inventoryStore.realWorldInventory.items.length === 0" class="empty-inventory">
        <p>背包是空的</p>
      </div>
      <div v-else class="items-grid">
        <div
          v-for="item in inventoryStore.realWorldInventory.items"
          :key="item.id"
          class="item-card"
          @click="selectItem(item)"
        >
          <div class="item-header">
            <span class="item-name">{{ item.name }}</span>
            <span v-if="item.type" class="item-type">{{ item.type }}</span>
          </div>
          <p class="item-description">{{ item.description }}</p>
          <div v-if="item.fromArea" class="item-meta">
            <span class="item-source">来源: {{ item.fromArea }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 副本背包 -->
    <div v-if="currentTab === 'instance'" class="inventory-content">
      <div v-if="inventoryStore.instanceInventory.items.length === 0" class="empty-inventory">
        <p>背包是空的</p>
      </div>
      <div v-else class="items-grid">
        <div
          v-for="item in inventoryStore.instanceInventory.items"
          :key="item.id"
          class="item-card"
          @click="selectItem(item)"
        >
          <div class="item-header">
            <span class="item-name">{{ item.name }}</span>
            <span v-if="item.type" class="item-type">{{ item.type }}</span>
          </div>
          <p class="item-description">{{ item.description }}</p>
          <div v-if="item.fromArea" class="item-meta">
            <span class="item-source">来源: {{ item.fromArea }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 道具详情模态框 -->
    <div v-if="selectedItem" class="item-detail-overlay" @click="selectedItem = null">
      <div class="item-detail-modal" @click.stop>
        <h3>{{ selectedItem.name }}</h3>
        <p v-if="selectedItem.type" class="detail-type">类型: {{ selectedItem.type }}</p>
        <p class="detail-description">{{ selectedItem.description }}</p>
        <div v-if="selectedItem.fromArea" class="detail-meta">
          <p>来源: {{ selectedItem.fromArea }}</p>
          <p v-if="selectedItem.obtainedAt">获得时间: {{ new Date(selectedItem.obtainedAt).toLocaleString() }}</p>
        </div>
        <div class="detail-actions">
          <button class="btn-action btn-use" @click="useItem">使用</button>
          <button class="btn-action btn-discard" @click="discardItem">丢弃</button>
          <button class="btn-action btn-close-detail" @click="selectedItem = null">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useInventoryStore } from '../stores/inventoryStore';
import type { Item } from '../types/instance';

// ==================== Emits ====================
const emit = defineEmits<{
  close: [];
}>();

// ==================== 状态 ====================
const inventoryStore = useInventoryStore();
const currentTab = ref<'realworld' | 'instance'>('realworld');
const selectedItem = ref<Item | null>(null);

// ==================== 方法 ====================

/**
 * 选择道具
 */
function selectItem(item: Item): void {
  selectedItem.value = item;
}

/**
 * 使用道具
 */
function useItem(): void {
  if (!selectedItem.value) return;

  toastr.info(`使用了 ${selectedItem.value.name}`);
  // TODO: 实现道具使用逻辑
  selectedItem.value = null;
}

/**
 * 丢弃道具
 */
async function discardItem(): Promise<void> {
  if (!selectedItem.value) return;

  const item = selectedItem.value;
  const itemName = item.name;

  try {
    // 从对应的背包中移除
    if (currentTab.value === 'realworld') {
      inventoryStore.removeFromRealWorld(item.id);
    } else {
      inventoryStore.removeFromInstance(item.id);
    }

    // 保存背包数据
    await inventoryStore.saveToGlobal();

    toastr.success(`已丢弃: ${itemName}`);
    selectedItem.value = null;
  } catch (error) {
    console.error('[InventoryPanel] 丢弃道具失败:', error);
    toastr.error('丢弃道具失败');
  }
}
</script>

<style lang="scss" scoped>
@import '../styles/global.scss';

.inventory-panel {
  @include modal-container;
  max-width: 900px;
  position: relative;
}

.close-btn {
  @include modal-close-button;
}

.panel-title {
  @include modal-title;
}

.inventory-tabs {
  display: flex;
  gap: $spacing-sm;
  justify-content: center;
  margin-bottom: $spacing-lg;

  @include mobile {
    gap: $spacing-xs;
    margin-bottom: $spacing-md;
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

.inventory-content {
  min-height: 300px;

  @include mobile {
    min-height: 200px;
  }
}

.empty-inventory {
  text-align: center;
  padding: $spacing-2xl;
  color: $color-text-muted;

  @include mobile {
    padding: $spacing-xl;
  }

  p {
    font-size: $font-size-lg;
    margin: 0;

    @include mobile {
      font-size: $font-size-base;
    }
  }
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: $spacing-md;

  @include mobile {
    grid-template-columns: 1fr;
    gap: $spacing-sm;
  }
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
  margin: 0 0 $spacing-xs 0;

  @include mobile {
    font-size: $font-size-xs;
  }
}

.item-meta {
  margin-top: $spacing-xs;
}

.item-source {
  font-size: $font-size-xs;
  color: $color-text-muted;

  @include mobile {
    font-size: 10px;
  }
}

// 道具详情模态框
.item-detail-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  backdrop-filter: blur(4px);
}

.item-detail-modal {
  background: $color-bg-card;
  border: 2px solid $color-border-gold;
  border-radius: $border-radius-lg;
  padding: $spacing-xl;
  max-width: 500px;
  width: 90%;
  box-shadow: $shadow-lg, $shadow-gold;

  @include mobile {
    padding: $spacing-lg;
    border-width: 1px;
  }

  h3 {
    font-size: $font-size-2xl;
    color: $color-text-gold;
    margin: 0 0 $spacing-md 0;

    @include mobile {
      font-size: $font-size-xl;
    }
  }
}

.detail-type {
  font-size: $font-size-base;
  color: $color-text-gold;
  margin: 0 0 $spacing-sm 0;

  @include mobile {
    font-size: $font-size-sm;
  }
}

.detail-description {
  font-size: $font-size-base;
  color: $color-text-secondary;
  line-height: 1.6;
  margin: 0 0 $spacing-md 0;

  @include mobile {
    font-size: $font-size-sm;
  }
}

.detail-meta {
  margin-bottom: $spacing-md;

  p {
    font-size: $font-size-sm;
    color: $color-text-muted;
    margin: $spacing-xs 0;

    @include mobile {
      font-size: $font-size-xs;
    }
  }
}

.detail-actions {
  display: flex;
  gap: $spacing-sm;
  justify-content: center;
  flex-wrap: wrap;
}

.btn-action {
  padding: $spacing-sm $spacing-lg;
  border: 2px solid;
  border-radius: $border-radius-md;
  font-size: $font-size-base;
  font-weight: $font-weight-bold;
  cursor: pointer;
  transition: all $transition-base;
  min-width: 80px;

  @include mobile {
    padding: $spacing-xs $spacing-md;
    font-size: $font-size-sm;
    border-width: 1px;
    min-width: 70px;
  }

  &.btn-use {
    background: linear-gradient(135deg, rgba(76, 175, 80, 0.3), rgba(76, 175, 80, 0.5));
    border-color: $color-success;
    color: $color-success;

    &:hover {
      background: linear-gradient(135deg, rgba(76, 175, 80, 0.5), rgba(76, 175, 80, 0.7));
      box-shadow: 0 0 20px rgba(76, 175, 80, 0.3);
      transform: translateY(-2px);
    }
  }

  &.btn-discard {
    background: linear-gradient(135deg, rgba(244, 67, 54, 0.3), rgba(244, 67, 54, 0.5));
    border-color: $color-danger;
    color: $color-danger;

    &:hover {
      background: linear-gradient(135deg, rgba(244, 67, 54, 0.5), rgba(244, 67, 54, 0.7));
      box-shadow: 0 0 20px rgba(244, 67, 54, 0.3);
      transform: translateY(-2px);
    }
  }

  &.btn-close-detail {
    background: linear-gradient(135deg, rgba(100, 100, 100, 0.3), rgba(100, 100, 100, 0.5));
    border-color: $color-text-muted;
    color: $color-text-secondary;

    &:hover {
      background: linear-gradient(135deg, rgba(100, 100, 100, 0.5), rgba(100, 100, 100, 0.7));
      box-shadow: 0 0 20px rgba(100, 100, 100, 0.3);
      transform: translateY(-2px);
    }
  }

  &:active {
    transform: translateY(0);
  }
}
</style>
