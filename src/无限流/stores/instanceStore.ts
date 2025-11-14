// 副本数据 Store - 管理副本记录和地图数据

import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { mvuService } from '../services/mvuService';
import type { Character } from '../types/character';
import type { Area, CharacterInInstance, ImportantEvent, InstanceRecord, MapData } from '../types/instance';

/**
 * 副本数据 Store
 */
export const useInstanceStore = defineStore('instance', () => {
  // ==================== 状态 ====================
  const instances = ref<Map<string, InstanceRecord>>(new Map());
  const currentInstance = ref<InstanceRecord | undefined>(undefined);
  const map = ref<MapData | undefined>(undefined);

  // ==================== 计算属性 ====================
  const instanceList = computed(() => Array.from(instances.value.values()));

  const instanceCount = computed(() => instances.value.size);

  const activeInstance = computed(() => {
    return instanceList.value.find(instance => instance.isActive);
  });

  const currentArea = computed(() => {
    if (!map.value || !map.value.playerLocation) return undefined;
    return map.value.areas.get(map.value.playerLocation);
  });

  const connectedAreas = computed(() => {
    if (!map.value || !currentArea.value) return [];

    return map.value.connections
      .filter(conn => conn.from === currentArea.value!.id)
      .map(conn => map.value!.areas.get(conn.to))
      .filter((area): area is Area => area !== undefined);
  });

  // ==================== 方法 ====================

  /**
   * 从 MVU 加载副本数据
   */
  async function loadFromMVU(): Promise<void> {
    try {
      console.log('[Instance Store] 从 MVU 加载副本数据...');

      const gameData = await mvuService.loadGameData();

      // 加载所有副本
      instances.value.clear();
      Object.entries(gameData.instances).forEach(([id, instance]) => {
        instances.value.set(id, instance as InstanceRecord);
      });

      // 设置当前副本
      if (gameData.game.currentInstanceId) {
        const instance = instances.value.get(gameData.game.currentInstanceId);
        if (instance) {
          currentInstance.value = instance;
          map.value = instance.map;
          console.log('[Instance Store] 当前副本:', instance.name);
        }
      }

      console.log(`[Instance Store] 加载了 ${instances.value.size} 个副本`);
    } catch (error) {
      console.error('[Instance Store] 加载副本数据失败:', error);
      toastr.error('加载副本数据失败');
      throw error;
    }
  }

  /**
   * 添加副本记录
   */
  async function addInstance(instance: InstanceRecord): Promise<void> {
    try {
      instances.value.set(instance.id, instance);

      // 保存到 MVU
      const gameData = await mvuService.loadGameData();
      gameData.instances[instance.id] = instance;
      await mvuService.saveGameData(gameData);

      console.log('[Instance Store] 副本添加成功:', instance.name);
      toastr.success(`副本 ${instance.name} 创建成功`);
    } catch (error) {
      console.error('[Instance Store] 添加副本失败:', error);
      toastr.error('添加副本失败');
      throw error;
    }
  }

  /**
   * 更新副本记录
   */
  async function updateInstance(instanceId: string, updates: Partial<InstanceRecord>): Promise<void> {
    const instance = instances.value.get(instanceId);
    if (!instance) {
      throw new Error(`副本 ${instanceId} 不存在`);
    }

    try {
      // 本地更新
      Object.assign(instance, updates);

      // 保存到 MVU
      const gameData = await mvuService.loadGameData();
      gameData.instances[instanceId] = instance;
      await mvuService.saveGameData(gameData);

      console.log(`[Instance Store] 副本 ${instance.name} 更新成功`);
    } catch (error) {
      console.error(`[Instance Store] 更新副本 ${instanceId} 失败:`, error);
      toastr.error('更新副本失败');
      throw error;
    }
  }

  /**
   * 设置当前副本
   */
  async function setCurrentInstance(instanceId: string): Promise<void> {
    const instance = instances.value.get(instanceId);
    if (!instance) {
      throw new Error(`副本 ${instanceId} 不存在`);
    }

    try {
      currentInstance.value = instance;
      map.value = instance.map;

      // 更新 MVU
      await mvuService.setCurrentInstance(instanceId);

      console.log(`[Instance Store] 当前副本设置为: ${instance.name}`);
    } catch (error) {
      console.error(`[Instance Store] 设置当前副本失败:`, error);
      toastr.error('切换副本失败');
      throw error;
    }
  }

  /**
   * 添加角色到副本
   */
  async function addCharacterToInstance(
    instanceId: string,
    character: Character,
    isImportant: boolean = false,
  ): Promise<void> {
    const instance = instances.value.get(instanceId);
    if (!instance) {
      throw new Error(`副本 ${instanceId} 不存在`);
    }

    try {
      const characterInInstance: CharacterInInstance = {
        characterId: character.id,
        character,
        isImportant,
        firstAppearance: currentArea.value?.name,
        lastSeen: currentArea.value?.name,
      };

      instance.characters.push(characterInInstance);

      // 保存到 MVU
      await updateInstance(instanceId, { characters: instance.characters });

      console.log(`[Instance Store] 角色 ${character.name} 添加到副本 ${instance.name}`);
      toastr.success(`${character.name} 加入副本`);
    } catch (error) {
      console.error(`[Instance Store] 添加角色到副本失败:`, error);
      toastr.error('添加角色到副本失败');
      throw error;
    }
  }

  /**
   * 切换 NPC 重要性
   */
  async function toggleImportantNPC(instanceId: string, characterId: string): Promise<void> {
    const instance = instances.value.get(instanceId);
    if (!instance) {
      throw new Error(`副本 ${instanceId} 不存在`);
    }

    try {
      const characterInInstance = instance.characters.find(c => c.characterId === characterId);
      if (!characterInInstance) {
        throw new Error(`角色 ${characterId} 不在副本中`);
      }

      characterInInstance.isImportant = !characterInInstance.isImportant;

      // 保存到 MVU
      await updateInstance(instanceId, { characters: instance.characters });

      const status = characterInInstance.isImportant ? '重要' : '普通';
      console.log(`[Instance Store] 角色 ${characterId} 设置为${status}角色`);
      toastr.info(`${characterInInstance.character.name} 已设置为${status}角色`);
    } catch (error) {
      console.error(`[Instance Store] 切换角色重要性失败:`, error);
      toastr.error('切换角色重要性失败');
      throw error;
    }
  }

  /**
   * 根据世界观获取副本列表
   * 用于人物设定继承
   */
  function getInstancesByWorldSetting(worldSetting: string): InstanceRecord[] {
    return instanceList.value.filter(instance => instance.worldSetting === worldSetting);
  }

  /**
   * 获取角色在副本中的信息
   */
  function getCharacterInInstance(instanceId: string, characterId: string): CharacterInInstance | undefined {
    const instance = instances.value.get(instanceId);
    if (!instance) return undefined;

    return instance.characters.find(c => c.characterId === characterId);
  }

  /**
   * 添加重要事件
   */
  async function addEvent(instanceId: string, event: ImportantEvent): Promise<void> {
    const instance = instances.value.get(instanceId);
    if (!instance) {
      throw new Error(`副本 ${instanceId} 不存在`);
    }

    try {
      instance.events.push(event);

      // 保存到 MVU
      await updateInstance(instanceId, { events: instance.events });

      console.log(`[Instance Store] 事件添加到副本 ${instance.name}:`, event.summary);
    } catch (error) {
      console.error(`[Instance Store] 添加事件失败:`, error);
      toastr.error('添加事件失败');
      throw error;
    }
  }

  /**
   * 更新地图数据
   */
  async function updateMap(instanceId: string, mapData: MapData): Promise<void> {
    const instance = instances.value.get(instanceId);
    if (!instance) {
      throw new Error(`副本 ${instanceId} 不存在`);
    }

    try {
      instance.map = mapData;

      if (currentInstance.value?.id === instanceId) {
        map.value = mapData;
      }

      // 保存到 MVU
      await updateInstance(instanceId, { map: mapData });

      console.log(`[Instance Store] 副本 ${instance.name} 地图更新成功`);
    } catch (error) {
      console.error(`[Instance Store] 更新地图失败:`, error);
      toastr.error('更新地图失败');
      throw error;
    }
  }

  /**
   * 更新玩家位置
   */
  async function updatePlayerLocation(areaId: string): Promise<void> {
    if (!currentInstance.value || !map.value) {
      throw new Error('当前没有活跃的副本');
    }

    const area = map.value.areas.get(areaId);
    if (!area) {
      throw new Error(`区域 ${areaId} 不存在`);
    }

    try {
      map.value.playerLocation = areaId;
      currentInstance.value.map.playerLocation = areaId;

      // 标记区域为已探索
      area.isDiscovered = true;

      // 保存到 MVU
      await mvuService.updatePlayerLocation(areaId);

      console.log(`[Instance Store] 玩家移动到: ${area.name}`);
      toastr.info(`进入 ${area.name}`);
    } catch (error) {
      console.error(`[Instance Store] 更新玩家位置失败:`, error);
      toastr.error('移动失败');
      throw error;
    }
  }

  /**
   * 发现新区域
   */
  async function discoverArea(areaId: string): Promise<void> {
    if (!map.value) {
      throw new Error('当前没有活跃的副本');
    }

    const area = map.value.areas.get(areaId);
    if (!area) {
      throw new Error(`区域 ${areaId} 不存在`);
    }

    try {
      area.isDiscovered = true;

      if (currentInstance.value) {
        await updateMap(currentInstance.value.id, map.value);
      }

      console.log(`[Instance Store] 发现新区域: ${area.name}`);
      toastr.success(`发现新区域：${area.name}`);
    } catch (error) {
      console.error(`[Instance Store] 发现区域失败:`, error);
      throw error;
    }
  }

  /**
   * 结束副本
   */
  async function endInstance(instanceId: string, ending: string): Promise<void> {
    const instance = instances.value.get(instanceId);
    if (!instance) {
      throw new Error(`副本 ${instanceId} 不存在`);
    }

    try {
      instance.isActive = false;
      instance.endTime = Date.now();
      instance.ending = ending;

      // 保存到 MVU
      await updateInstance(instanceId, {
        isActive: false,
        endTime: instance.endTime,
        ending,
      });

      console.log(`[Instance Store] 副本 ${instance.name} 已结束`);
      toastr.success(`副本完成：${instance.name}`);
    } catch (error) {
      console.error(`[Instance Store] 结束副本失败:`, error);
      toastr.error('结束副本失败');
      throw error;
    }
  }

  /**
   * 获取副本统计信息
   */
  function getInstanceStats(instanceId: string) {
    const instance = instances.value.get(instanceId);
    if (!instance) return null;

    return {
      characterCount: instance.characters.length,
      importantNPCCount: instance.characters.filter(c => c.isImportant).length,
      eventCount: instance.events.length,
      areaCount: instance.map.areas.size,
      discoveredAreaCount: Array.from(instance.map.areas.values()).filter(a => a.isDiscovered).length,
      duration: instance.endTime ? instance.endTime - instance.startTime : Date.now() - instance.startTime,
    };
  }

  /**
   * 重置副本数据
   */
  function reset(): void {
    instances.value.clear();
    currentInstance.value = undefined;
    map.value = undefined;
    console.log('[Instance Store] 副本数据已重置');
  }

  // ==================== 返回 ====================
  return {
    // 状态
    instances,
    currentInstance,
    map,

    // 计算属性
    instanceList,
    instanceCount,
    activeInstance,
    currentArea,
    connectedAreas,

    // 方法
    loadFromMVU,
    addInstance,
    updateInstance,
    setCurrentInstance,
    addCharacterToInstance,
    toggleImportantNPC,
    getInstancesByWorldSetting,
    getCharacterInInstance,
    addEvent,
    updateMap,
    updatePlayerLocation,
    discoverArea,
    endInstance,
    getInstanceStats,
    reset,
  };
});
