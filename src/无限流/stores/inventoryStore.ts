// 背包系统 Store - 管理现实世界和副本背包

import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Inventory, Item } from '../types/instance';

/**
 * 背包 Store
 */
export const useInventoryStore = defineStore('inventory', () => {
  // ==================== 状态 ====================
  const realWorldInventory = ref<Inventory>({ items: [] }); // 现实世界背包
  const instanceInventory = ref<Inventory>({ items: [] }); // 副本背包

  // ==================== 方法 ====================

  /**
   * 添加道具到现实世界背包
   */
  function addToRealWorld(item: Item): void {
    realWorldInventory.value.items.push(item);
    console.log(`[Inventory Store] 道具已添加到现实世界背包: ${item.name}`);
  }

  /**
   * 添加道具到副本背包
   */
  function addToInstance(item: Item): void {
    instanceInventory.value.items.push(item);
    console.log(`[Inventory Store] 道具已添加到副本背包: ${item.name}`);
  }

  /**
   * 从现实世界背包移除道具
   */
  function removeFromRealWorld(itemId: string): void {
    const index = realWorldInventory.value.items.findIndex(item => item.id === itemId);
    if (index !== -1) {
      const item = realWorldInventory.value.items[index];
      realWorldInventory.value.items.splice(index, 1);
      console.log(`[Inventory Store] 道具已从现实世界背包移除: ${item.name}`);
    }
  }

  /**
   * 从副本背包移除道具
   */
  function removeFromInstance(itemId: string): void {
    const index = instanceInventory.value.items.findIndex(item => item.id === itemId);
    if (index !== -1) {
      const item = instanceInventory.value.items[index];
      instanceInventory.value.items.splice(index, 1);
      console.log(`[Inventory Store] 道具已从副本背包移除: ${item.name}`);
    }
  }

  /**
   * 清空副本背包
   */
  function clearInstanceInventory(): void {
    const itemCount = instanceInventory.value.items.length;
    instanceInventory.value.items = [];
    console.log(`[Inventory Store] 副本背包已清空 (清空了 ${itemCount} 个道具)`);
  }

  /**
   * 清空现实世界背包
   */
  function clearRealWorldInventory(): void {
    const itemCount = realWorldInventory.value.items.length;
    realWorldInventory.value.items = [];
    console.log(`[Inventory Store] 现实世界背包已清空 (清空了 ${itemCount} 个道具)`);
    saveToGlobal();
  }

  /**
   * 清空所有背包（现实世界和副本）
   */
  function clearAllInventories(): void {
    const realWorldCount = realWorldInventory.value.items.length;
    const instanceCount = instanceInventory.value.items.length;
    const totalCount = realWorldCount + instanceCount;

    realWorldInventory.value.items = [];
    instanceInventory.value.items = [];

    console.log(
      `[Inventory Store] 所有背包已清空 (现实世界: ${realWorldCount} 个道具, 副本: ${instanceCount} 个道具, 总计: ${totalCount} 个道具)`,
    );

    saveToGlobal();
  }

  /**
   * 将副本背包中的道具转移到现实世界背包
   */
  function transferToRealWorld(itemIds: string[]): void {
    itemIds.forEach(itemId => {
      const item = instanceInventory.value.items.find(i => i.id === itemId);
      if (item) {
        addToRealWorld(item);
        removeFromInstance(itemId);
      }
    });
    console.log(`[Inventory Store] ${itemIds.length} 个道具已转移到现实世界背包`);
  }

  /**
   * 保存背包数据到全局变量
   */
  async function saveToGlobal(): Promise<void> {
    try {
      const data = {
        realWorldInventory: realWorldInventory.value,
        instanceInventory: instanceInventory.value,
      };
      insertOrAssignVariables({ inventory: data }, { type: 'global' });
      console.log('[Inventory Store] 背包数据已保存');
    } catch (error) {
      console.error('[Inventory Store] 保存背包数据失败:', error);
      toastr.error('保存背包数据失败');
    }
  }

  /**
   * 从全局变量加载背包数据
   */
  async function loadFromGlobal(): Promise<void> {
    try {
      const variables = getVariables({ type: 'global' });
      const data = variables.inventory as any;

      if (data) {
        if (data.realWorldInventory) {
          realWorldInventory.value = data.realWorldInventory;
        }
        if (data.instanceInventory) {
          instanceInventory.value = data.instanceInventory;
        }
        console.log('[Inventory Store] 背包数据已加载');
      }
    } catch (error) {
      console.error('[Inventory Store] 加载背包数据失败:', error);
    }
  }

  /**
   * 重置 store
   */
  function reset(): void {
    realWorldInventory.value = { items: [] };
    instanceInventory.value = { items: [] };
    console.log('[Inventory Store] Store 已重置');
  }

  // ==================== 返回 ====================
  return {
    // 状态
    realWorldInventory,
    instanceInventory,

    // 方法
    addToRealWorld,
    addToInstance,
    removeFromRealWorld,
    removeFromInstance,
    clearInstanceInventory,
    clearRealWorldInventory,
    clearAllInventories,
    transferToRealWorld,
    saveToGlobal,
    loadFromGlobal,
    reset,
  };
});
