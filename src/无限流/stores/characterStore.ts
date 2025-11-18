// 角色数据 Store - 管理主控角色和 NPC 数据

import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { mvuService } from '../services/mvuService';
import type { Character, CharacterStatusUpdate, NPCCharacter, PlayerCharacter } from '../types/character';

/**
 * 角色数据 Store
 */
export const useCharacterStore = defineStore('character', () => {
  // ==================== 状态 ====================
  const player = ref<PlayerCharacter | undefined>(undefined);
  const npcs = ref<Map<string, NPCCharacter>>(new Map());
  const activeCharacters = ref<string[]>([]); // 当前场景中的角色 ID

  // ==================== 计算属性 ====================
  const hasPlayer = computed(() => player.value !== undefined);

  const npcList = computed(() => Array.from(npcs.value.values()));

  const npcCount = computed(() => npcs.value.size);

  const activeNPCs = computed(() => {
    return activeCharacters.value.map(id => npcs.value.get(id)).filter((npc): npc is NPCCharacter => npc !== undefined);
  });

  const importantNPCs = computed(() => {
    return npcList.value.filter(npc => npc.isImportant);
  });

  // ==================== 方法 ====================

  /**
   * 从 MVU 加载角色数据
   */
  async function loadFromMVU(): Promise<void> {
    try {
      console.log('[Character Store] 从 MVU 加载角色数据...');

      // 优先从全局变量加载主控角色
      try {
        const globalVars = getVariables({ type: 'global' });
        if (globalVars.player_character) {
          player.value = globalVars.player_character as PlayerCharacter;
          console.log('[Character Store] 从全局变量加载主控角色成功:', player.value.name);
        }
      } catch (globalError) {
        console.warn('[Character Store] 从全局变量加载失败，尝试从 MVU 加载:', globalError);
      }

      // 如果全局变量没有，再从 MVU 加载
      if (!player.value) {
        const gameData = await mvuService.loadGameData();

        // 加载主控角色
        if (gameData.characters.player) {
          player.value = gameData.characters.player;
          console.log('[Character Store] 从 MVU 加载主控角色成功:', player.value.name);

          // 同步到全局变量
          try {
            insertOrAssignVariables({ player_character: player.value }, { type: 'global' });
            console.log('[Character Store] 主控角色已同步到全局变量');
          } catch (syncError) {
            console.warn('[Character Store] 同步到全局变量失败:', syncError);
          }
        }
      }

      // 加载 NPC（从 MVU）
      const gameData = await mvuService.loadGameData();
      npcs.value.clear();
      Object.entries(gameData.characters.npcs).forEach(([id, npc]) => {
        npcs.value.set(id, npc);
      });

      console.log(`[Character Store] 加载了 ${npcs.value.size} 个 NPC`);
    } catch (error) {
      console.error('[Character Store] 加载角色数据失败:', error);
      toastr.error('加载角色数据失败');
      throw error;
    }
  }

  /**
   * 设置主控角色
   */
  async function setPlayer(character: PlayerCharacter): Promise<void> {
    try {
      player.value = character;

      // 保存到 MVU（消息楼层变量）
      await mvuService.saveCharacter(character);

      // 同时保存到全局变量作为备份
      try {
        insertOrAssignVariables({ player_character: character }, { type: 'global' });
        console.log('[Character Store] 主控角色已保存到全局变量');
      } catch (globalError) {
        console.warn('[Character Store] 保存到全局变量失败:', globalError);
      }

      console.log('[Character Store] 主控角色设置成功:', character.name);
      toastr.success(`主控角色 ${character.name} 创建成功`);
    } catch (error) {
      console.error('[Character Store] 设置主控角色失败:', error);
      toastr.error('设置主控角色失败');
      throw error;
    }
  }

  /**
   * 更新主控角色状态
   */
  async function updatePlayer(updates: CharacterStatusUpdate): Promise<void> {
    if (!player.value) {
      throw new Error('主控角色不存在');
    }

    try {
      // 本地更新
      if (updates.attributes) {
        Object.assign(player.value.attributes, updates.attributes);
      }
      if (updates.derivedStats) {
        Object.assign(player.value.derivedStats, updates.derivedStats);
      }
      if (updates.bodyParts) {
        player.value.bodyParts = updates.bodyParts;
      }

      // 同步到 MVU
      await mvuService.updateCharacterStatus('player', updates);

      // 同步到全局变量
      try {
        insertOrAssignVariables({ player_character: player.value }, { type: 'global' });
        console.log('[Character Store] 主控角色状态已同步到全局变量');
      } catch (globalError) {
        console.warn('[Character Store] 同步到全局变量失败:', globalError);
      }

      console.log('[Character Store] 主控角色状态更新成功');
    } catch (error) {
      console.error('[Character Store] 更新主控角色状态失败:', error);
      toastr.error('更新角色状态失败');
      throw error;
    }
  }

  /**
   * 添加 NPC
   */
  async function addNPC(npc: NPCCharacter): Promise<void> {
    try {
      npcs.value.set(npc.id, npc);
      await mvuService.saveCharacter(npc);
      console.log('[Character Store] NPC 添加成功:', npc.name);
      toastr.success(`NPC ${npc.name} 添加成功`);
    } catch (error) {
      console.error('[Character Store] 添加 NPC 失败:', error);
      toastr.error('添加 NPC 失败');
      throw error;
    }
  }

  /**
   * 更新 NPC 状态
   */
  async function updateNPC(npcId: string, updates: CharacterStatusUpdate): Promise<void> {
    const npc = npcs.value.get(npcId);
    if (!npc) {
      throw new Error(`NPC ${npcId} 不存在`);
    }

    try {
      // 本地更新
      if (updates.attributes) {
        Object.assign(npc.attributes, updates.attributes);
      }
      if (updates.derivedStats) {
        Object.assign(npc.derivedStats, updates.derivedStats);
      }
      if (updates.bodyParts) {
        npc.bodyParts = updates.bodyParts;
      }
      if (updates.affection !== undefined) {
        npc.affection = updates.affection;
      }

      // 同步到 MVU
      await mvuService.updateCharacterStatus(npcId, updates);
      console.log(`[Character Store] NPC ${npc.name} 状态更新成功`);
    } catch (error) {
      console.error(`[Character Store] 更新 NPC ${npcId} 状态失败:`, error);
      toastr.error('更新 NPC 状态失败');
      throw error;
    }
  }

  /**
   * 删除 NPC
   * 注意：删除 NPC 会保留剧情记录，只是从角色列表中移除
   */
  async function deleteNPC(npcId: string): Promise<void> {
    const npc = npcs.value.get(npcId);
    if (!npc) {
      throw new Error(`NPC ${npcId} 不存在`);
    }

    try {
      const npcName = npc.name;

      // 从本地移除
      npcs.value.delete(npcId);

      // 从活跃角色列表中移除
      activeCharacters.value = activeCharacters.value.filter(id => id !== npcId);

      // 从 MVU 中删除
      await mvuService.deleteNPC(npcId);

      console.log(`[Character Store] NPC ${npcName} 删除成功`);
      toastr.info(`NPC ${npcName} 已删除（剧情记录已保留）`);
    } catch (error) {
      console.error(`[Character Store] 删除 NPC ${npcId} 失败:`, error);
      toastr.error('删除 NPC 失败');
      throw error;
    }
  }

  /**
   * 获取角色（主控或 NPC）
   */
  function getCharacter(characterId: string): Character | undefined {
    if (characterId === 'player' || (player.value && player.value.id === characterId)) {
      return player.value;
    }
    return npcs.value.get(characterId);
  }

  /**
   * 设置活跃角色列表
   * 用于标记当前场景中出现的角色
   */
  function setActiveCharacters(characterIds: string[]): void {
    activeCharacters.value = characterIds;
    console.log('[Character Store] 活跃角色列表已更新:', characterIds);
  }

  /**
   * 添加活跃角色
   */
  function addActiveCharacter(characterId: string): void {
    if (!activeCharacters.value.includes(characterId)) {
      activeCharacters.value.push(characterId);
      console.log(`[Character Store] 角色 ${characterId} 加入场景`);
    }
  }

  /**
   * 移除活跃角色
   */
  function removeActiveCharacter(characterId: string): void {
    activeCharacters.value = activeCharacters.value.filter(id => id !== characterId);
    console.log(`[Character Store] 角色 ${characterId} 离开场景`);
  }

  /**
   * 更新 NPC 好感度
   */
  async function updateAffection(npcId: string, affection: number): Promise<void> {
    const npc = npcs.value.get(npcId);
    if (!npc) {
      throw new Error(`NPC ${npcId} 不存在`);
    }

    try {
      // 限制好感度范围 0-100
      const clampedAffection = Math.max(0, Math.min(100, affection));

      npc.affection = clampedAffection;
      await mvuService.updateCharacterStatus(npcId, { affection: clampedAffection });

      console.log(`[Character Store] NPC ${npc.name} 好感度更新为: ${clampedAffection}`);
    } catch (error) {
      console.error(`[Character Store] 更新 NPC ${npcId} 好感度失败:`, error);
      toastr.error('更新好感度失败');
      throw error;
    }
  }

  /**
   * 设置 NPC 为重要角色
   */
  async function setNPCImportant(npcId: string, isImportant: boolean): Promise<void> {
    const npc = npcs.value.get(npcId);
    if (!npc) {
      throw new Error(`NPC ${npcId} 不存在`);
    }

    try {
      npc.isImportant = isImportant;
      await mvuService.saveCharacter(npc);

      const status = isImportant ? '重要' : '普通';
      console.log(`[Character Store] NPC ${npc.name} 设置为${status}角色`);
      toastr.info(`${npc.name} 已设置为${status}角色`);
    } catch (error) {
      console.error(`[Character Store] 设置 NPC ${npcId} 重要性失败:`, error);
      toastr.error('设置角色重要性失败');
      throw error;
    }
  }

  /**
   * 添加 NPC 事件记录
   */
  async function addNPCEvent(npcId: string, event: string): Promise<void> {
    const npc = npcs.value.get(npcId);
    if (!npc) {
      throw new Error(`NPC ${npcId} 不存在`);
    }

    try {
      npc.events.push(event);
      await mvuService.saveCharacter(npc);
      console.log(`[Character Store] NPC ${npc.name} 事件记录已添加`);
    } catch (error) {
      console.error(`[Character Store] 添加 NPC ${npcId} 事件记录失败:`, error);
      throw error;
    }
  }

  /**
   * 重置角色数据
   */
  function reset(): void {
    player.value = undefined;
    npcs.value.clear();
    activeCharacters.value = [];
    console.log('[Character Store] 角色数据已重置');
  }

  // ==================== 返回 ====================
  return {
    // 状态
    player,
    npcs,
    activeCharacters,

    // 计算属性
    hasPlayer,
    npcList,
    npcCount,
    activeNPCs,
    importantNPCs,

    // 方法
    loadFromMVU,
    setPlayer,
    updatePlayer,
    addNPC,
    updateNPC,
    deleteNPC,
    getCharacter,
    setActiveCharacters,
    addActiveCharacter,
    removeActiveCharacter,
    updateAffection,
    setNPCImportant,
    addNPCEvent,
    reset,
  };
});
