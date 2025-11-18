// 副本数据 Store - 管理副本实例状态

import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { InstanceRecord } from '../types/instance';

/**
 * 副本数据 Store
 */
export const useInstanceStore = defineStore('instance', () => {
  // ==================== 状态 ====================
  const currentInstanceId = ref<string | null>(null);
  const instances = ref<Map<string, InstanceRecord>>(new Map());

  // ==================== 计算属性 ====================
  const currentInstance = computed(() => {
    if (!currentInstanceId.value) return null;
    return instances.value.get(currentInstanceId.value) || null;
  });

  const hasActiveInstance = computed(() => {
    return currentInstance.value?.status === 'active';
  });

  const instanceCount = computed(() => {
    return instances.value.size;
  });

  const instanceList = computed(() => {
    return Array.from(instances.value.values());
  });

  const currentArea = computed(() => {
    if (!currentInstance.value) return null;
    const playerLocation = currentInstance.value.map.playerLocation;
    return currentInstance.value.map.areas.get(playerLocation) || null;
  });

  const connectedAreas = computed(() => {
    if (!currentArea.value) return [];
    return currentArea.value.connectedAreas
      .map(areaId => currentInstance.value?.map.areas.get(areaId))
      .filter((area): area is import('../types/instance').Area => area !== undefined);
  });

  // ==================== 方法 ====================

  /**
   * 设置当前副本
   */
  function setCurrentInstance(instanceId: string | null): void {
    currentInstanceId.value = instanceId;
    console.log('[Instance Store] 当前副本已设置:', instanceId);
  }

  /**
   * 添加副本
   */
  function addInstance(instance: InstanceRecord): void {
    instances.value.set(instance.id, instance);
    console.log(`[Instance Store] 副本已添加: ${instance.name} (${instance.id})`);
  }

  /**
   * 更新副本
   */
  async function updateInstance(instanceId: string, updates: Partial<InstanceRecord>): Promise<void> {
    const instance = instances.value.get(instanceId);
    if (!instance) {
      console.error(`[Instance Store] 副本不存在: ${instanceId}`);
      return;
    }

    Object.assign(instance, updates);
    instances.value.set(instanceId, instance);
    console.log(`[Instance Store] 副本已更新: ${instanceId}`);
  }

  /**
   * 获取副本
   */
  function getInstance(instanceId: string): InstanceRecord | null {
    return instances.value.get(instanceId) || null;
  }

  /**
   * 获取所有副本
   */
  function getAllInstances(): InstanceRecord[] {
    return Array.from(instances.value.values());
  }

  /**
   * 删除副本
   */
  function removeInstance(instanceId: string): void {
    instances.value.delete(instanceId);
    if (currentInstanceId.value === instanceId) {
      currentInstanceId.value = null;
    }
    console.log(`[Instance Store] 副本已删除: ${instanceId}`);
  }

  /**
   * 切换角色重要性
   */
  async function toggleImportantNPC(instanceId: string, characterId: string): Promise<void> {
    const instance = instances.value.get(instanceId);
    if (!instance) {
      console.error(`[Instance Store] 副本不存在: ${instanceId}`);
      return;
    }

    const charInInstance = instance.characters.find(c => c.characterId === characterId);
    if (!charInInstance) {
      console.error(`[Instance Store] 角色不存在于副本中: ${characterId}`);
      return;
    }

    // 切换重要性标记
    charInInstance.isImportant = !charInInstance.isImportant;
    console.log(`[Instance Store] 角色重要性已切换: ${characterId} -> ${charInInstance.isImportant}`);
  }

  /**
   * 根据世界观设定获取副本列表
   */
  function getInstancesByWorldSetting(worldSetting: string): InstanceRecord[] {
    return Array.from(instances.value.values()).filter(instance => instance.worldSetting === worldSetting);
  }

  /**
   * 添加纪念品到副本
   */
  async function addMemento(instanceId: string, memento: import('../types/instance').Memento): Promise<void> {
    const instance = instances.value.get(instanceId);
    if (!instance) {
      console.error(`[Instance Store] 副本不存在: ${instanceId}`);
      return;
    }

    // 检查纪念品是否已存在
    const exists = instance.mementos.some(m => m.id === memento.id);
    if (exists) {
      console.warn(`[Instance Store] 纪念品已存在: ${memento.id}`);
      return;
    }

    instance.mementos.push(memento);
    console.log(`[Instance Store] 纪念品已添加: ${memento.name} (${memento.id})`);

    // 使用 mvuService 保存更新
    await saveToMVU();
  }

  /**
   * 更新 NPC 重要程度
   */
  async function updateNPCImportance(
    instanceId: string,
    characterId: string,
    importance: 1 | 2 | 3 | 4 | 5,
  ): Promise<void> {
    const instance = instances.value.get(instanceId);
    if (!instance) {
      console.error(`[Instance Store] 副本不存在: ${instanceId}`);
      return;
    }

    const charInInstance = instance.characters.find(c => c.characterId === characterId);
    if (!charInInstance) {
      console.error(`[Instance Store] 角色不存在于副本中: ${characterId}`);
      return;
    }

    charInInstance.importance = importance;
    console.log(`[Instance Store] NPC 重要程度已更新: ${characterId} -> ${importance}`);

    // 使用 mvuService 保存更新
    await saveToMVU();
  }

  /**
   * 更新 NPC 出场次数
   */
  async function updateNPCAppearanceCount(instanceId: string, characterId: string, count?: number): Promise<void> {
    const instance = instances.value.get(instanceId);
    if (!instance) {
      console.error(`[Instance Store] 副本不存在: ${instanceId}`);
      return;
    }

    const charInInstance = instance.characters.find(c => c.characterId === characterId);
    if (!charInInstance) {
      console.error(`[Instance Store] 角色不存在于副本中: ${characterId}`);
      return;
    }

    if (count !== undefined) {
      charInInstance.appearanceCount = count;
    } else {
      charInInstance.appearanceCount = (charInInstance.appearanceCount || 0) + 1;
    }

    console.log(`[Instance Store] NPC 出场次数已更新: ${characterId} -> ${charInInstance.appearanceCount}`);

    // 使用 mvuService 保存更新
    await saveToMVU();
  }

  /**
   * 更新副本状态
   */
  async function updateInstanceStatus(
    instanceId: string,
    status: import('../types/instance').InstanceStatus,
  ): Promise<void> {
    const instance = instances.value.get(instanceId);
    if (!instance) {
      console.error(`[Instance Store] 副本不存在: ${instanceId}`);
      return;
    }

    instance.status = status;

    // 根据状态更新时间戳
    if (status === 'active' && !instance.startTime) {
      instance.startTime = Date.now();
    } else if (status === 'completed' && !instance.endTime) {
      instance.endTime = Date.now();
    }

    console.log(`[Instance Store] 副本状态已更新: ${instanceId} -> ${status}`);

    // 使用 mvuService 保存更新
    await saveToMVU();
  }

  /**
   * 添加事件到副本
   */
  async function addEvent(instanceId: string, event: import('../types/instance').ImportantEvent): Promise<void> {
    const instance = instances.value.get(instanceId);
    if (!instance) {
      console.error(`[Instance Store] 副本不存在: ${instanceId}`);
      return;
    }

    // 检查事件是否已存在
    const exists = instance.events.some(e => e.id === event.id);
    if (exists) {
      console.warn(`[Instance Store] 事件已存在: ${event.id}`);
      return;
    }

    instance.events.push(event);
    console.log(`[Instance Store] 事件已添加: ${event.summary} (${event.id})`);

    // 使用 mvuService 保存更新
    await saveToMVU();
  }

  /**
   * 结束副本并清理数据
   * 将副本状态设置为 completed，清空 NPC 和地图数据，保留事件记录和纪念品
   */
  async function endInstance(instanceId: string): Promise<void> {
    const instance = instances.value.get(instanceId);
    if (!instance) {
      console.error(`[Instance Store] 副本不存在: ${instanceId}`);
      return;
    }

    // 设置状态为已完成
    instance.status = 'completed';
    instance.endTime = Date.now();

    // 清空 NPC 数据
    instance.characters = [];

    // 清空地图数据（保留基本结构）
    instance.map.areas.clear();
    instance.map.connections = [];
    instance.map.playerLocation = '';
    instance.map.startArea = '';

    // 保留事件记录和纪念品
    console.log(`[Instance Store] 副本已结束: ${instanceId}`);
    console.log(`[Instance Store] 保留 ${instance.events.length} 条事件记录`);
    console.log(`[Instance Store] 保留 ${instance.mementos.length} 个纪念品`);

    // 使用 mvuService 保存更新
    await saveToMVU();
  }

  /**
   * 完成副本
   * 将副本状态设置为 completed，清空 NPC 和地图数据，保留事件记录和纪念品
   * 这是 endInstance 的别名方法，用于符合任务规范
   */
  async function completeInstance(instanceId: string): Promise<void> {
    const instance = instances.value.get(instanceId);
    if (!instance) {
      console.error(`[Instance Store] 副本不存在: ${instanceId}`);
      return;
    }

    // 设置状态为已完成
    instance.status = 'completed';
    instance.endTime = Date.now();

    // 清空 NPC 数据（characters 数组）
    instance.characters = [];

    // 清空地图数据（map.areas 和 connections）
    instance.map.areas.clear();
    instance.map.connections = [];
    instance.map.playerLocation = '';
    instance.map.startArea = '';

    // 保留事件记录（events 数组）
    // 保留纪念品数据（mementos 数组）
    console.log(`[Instance Store] 副本已完成: ${instanceId}`);
    console.log(`[Instance Store] 保留 ${instance.events.length} 条事件记录`);
    console.log(`[Instance Store] 保留 ${instance.mementos.length} 个纪念品`);

    // 使用 mvuService 保存更新
    await saveToMVU();
  }

  /**
   * 保存所有副本数据到 MVU
   */
  async function saveToMVU(): Promise<void> {
    try {
      const { mvuService } = await import('../services/mvuService');
      const data = await mvuService.loadGameData();

      // 将 Map 转换为普通对象以便保存
      const instancesObj: Record<string, any> = {};
      for (const [id, instance] of instances.value.entries()) {
        // 使用 klona 去除 Vue Proxy 层
        const { klona } = await import('klona');
        const cleanInstance = klona(instance);

        // 将 Map 类型的 areas 转换为对象
        const areasObj: Record<string, any> = {};
        for (const [areaId, area] of instance.map.areas.entries()) {
          areasObj[areaId] = klona(area);
        }
        cleanInstance.map.areas = areasObj as any;

        instancesObj[id] = cleanInstance;
      }

      data.instances = instancesObj;
      await mvuService.saveGameData(data);

      console.log('[Instance Store] 数据已保存到 MVU');
    } catch (error) {
      console.error('[Instance Store] 保存到 MVU 失败:', error);
      toastr.error('保存副本数据失败');
    }
  }

  /**
   * 添加角色到副本
   */
  async function addCharacterToInstance(
    instanceId: string,
    character: import('../types/character').Character,
    isImportant: boolean = false,
  ): Promise<void> {
    const instance = instances.value.get(instanceId);
    if (!instance) {
      console.error(`[Instance Store] 副本不存在: ${instanceId}`);
      return;
    }

    // 检查角色是否已存在
    const exists = instance.characters.some(c => c.characterId === character.id);
    if (exists) {
      console.warn(`[Instance Store] 角色已存在于副本中: ${character.id}`);
      return;
    }

    // 添加角色
    instance.characters.push({
      characterId: character.id,
      character,
      isImportant,
      importance: isImportant ? 3 : 2,
      appearanceCount: 0,
    });

    console.log(`[Instance Store] 角色已添加到副本: ${character.name} (${character.id})`);
  }

  /**
   * 更新玩家位置
   */
  async function updatePlayerLocation(areaId: string): Promise<void> {
    if (!currentInstance.value) {
      console.error('[Instance Store] 没有当前副本');
      return;
    }

    const area = currentInstance.value.map.areas.get(areaId);
    if (!area) {
      console.error(`[Instance Store] 区域不存在: ${areaId}`);
      return;
    }

    currentInstance.value.map.playerLocation = areaId;
    console.log(`[Instance Store] 玩家位置已更新: ${area.name}`);
  }

  /**
   * 发现区域
   */
  async function discoverArea(areaId: string): Promise<void> {
    if (!currentInstance.value) {
      console.error('[Instance Store] 没有当前副本');
      return;
    }

    const area = currentInstance.value.map.areas.get(areaId);
    if (!area) {
      console.error(`[Instance Store] 区域不存在: ${areaId}`);
      return;
    }

    area.isDiscovered = true;
    console.log(`[Instance Store] 区域已发现: ${area.name}`);
  }

  /**
   * 重置 store
   */
  function reset(): void {
    currentInstanceId.value = null;
    instances.value.clear();
    console.log('[Instance Store] Store 已重置');
  }

  // ==================== 返回 ====================
  return {
    // 状态
    currentInstanceId,
    instances,

    // 计算属性
    currentInstance,
    hasActiveInstance,
    instanceCount,
    instanceList,
    currentArea,
    connectedAreas,

    // 方法
    setCurrentInstance,
    addInstance,
    updateInstance,
    getInstance,
    getAllInstances,
    removeInstance,
    toggleImportantNPC,
    getInstancesByWorldSetting,
    addCharacterToInstance,
    updatePlayerLocation,
    discoverArea,
    reset,

    // 新增方法
    addMemento,
    updateNPCImportance,
    updateNPCAppearanceCount,
    updateInstanceStatus,
    addEvent,
    endInstance,
    completeInstance,
    saveToMVU,
  };
});
