// 互动室数据 Store - 管理角色互动室状态

import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { mvuService } from '../services/mvuService';
import type { DialogueDataType } from '../types/schemas';

/**
 * 互动室模式
 */
export type InteractionMode = 'main' | 'room';

/**
 * 互动室数据 Store
 */
export const useInteractionStore = defineStore('interaction', () => {
  // ==================== 状态 ====================
  const mode = ref<InteractionMode>('main');
  const selectedNPCs = ref<string[]>([]);
  const roomDialogues = ref<DialogueDataType[]>([]);
  const isActive = ref(false);

  // ==================== 计算属性 ====================
  const isInRoom = computed(() => mode.value === 'room' && isActive.value);

  const hasSelectedNPCs = computed(() => selectedNPCs.value.length > 0);

  const dialogueCount = computed(() => roomDialogues.value.length);

  const isSingleNPCMode = computed(() => selectedNPCs.value.length === 1);

  const isGroupMode = computed(() => selectedNPCs.value.length > 1);

  // ==================== 方法 ====================

  /**
   * 从 MVU 加载互动室数据
   */
  async function loadFromMVU(): Promise<void> {
    try {
      console.log('[Interaction Store] 从 MVU 加载互动室数据...');

      const gameData = await mvuService.loadGameData();

      // 加载对话记录
      if (gameData.interaction.dialogues) {
        roomDialogues.value = gameData.interaction.dialogues;
        console.log(`[Interaction Store] 加载了 ${roomDialogues.value.length} 条对话记录`);
      }
    } catch (error) {
      console.error('[Interaction Store] 加载互动室数据失败:', error);
      toastr.error('加载互动室数据失败');
      throw error;
    }
  }

  /**
   * 设置活跃的 NPC 列表
   */
  function setActiveNPCs(npcIds: string[]): void {
    selectedNPCs.value = npcIds;
    console.log('[Interaction Store] 选中的 NPC:', npcIds);
  }

  /**
   * 添加 NPC 到选择列表
   */
  function addNPC(npcId: string): void {
    if (!selectedNPCs.value.includes(npcId)) {
      selectedNPCs.value.push(npcId);
      console.log(`[Interaction Store] NPC ${npcId} 加入互动室`);
    }
  }

  /**
   * 从选择列表移除 NPC
   */
  function removeNPC(npcId: string): void {
    selectedNPCs.value = selectedNPCs.value.filter(id => id !== npcId);
    console.log(`[Interaction Store] NPC ${npcId} 离开互动室`);
  }

  /**
   * 切换 NPC 选择状态
   */
  function toggleNPC(npcId: string): void {
    if (selectedNPCs.value.includes(npcId)) {
      removeNPC(npcId);
    } else {
      addNPC(npcId);
    }
  }

  /**
   * 进入互动室
   */
  async function enterRoom(): Promise<void> {
    if (selectedNPCs.value.length === 0) {
      toastr.warning('请至少选择一个 NPC');
      return;
    }

    try {
      mode.value = 'room';
      isActive.value = true;

      console.log('[Interaction Store] 进入互动室，选中的 NPC:', selectedNPCs.value);

      const npcCount = selectedNPCs.value.length;
      const modeText = npcCount === 1 ? '一对一互动' : `群聊模式（${npcCount}人）`;
      toastr.success(`进入互动室 - ${modeText}`);
    } catch (error) {
      console.error('[Interaction Store] 进入互动室失败:', error);
      toastr.error('进入互动室失败');
      throw error;
    }
  }

  /**
   * 退出互动室
   */
  async function exitRoom(): Promise<void> {
    try {
      mode.value = 'main';
      isActive.value = false;

      // 保存对话记录到 MVU
      await saveDialogues();

      console.log('[Interaction Store] 退出互动室');
      toastr.info('已退出互动室');
    } catch (error) {
      console.error('[Interaction Store] 退出互动室失败:', error);
      toastr.error('退出互动室失败');
      throw error;
    }
  }

  /**
   * 添加对话记录
   */
  function addDialogue(dialogue: DialogueDataType): void {
    roomDialogues.value.push(dialogue);
    console.log('[Interaction Store] 对话记录已添加:', dialogue);
  }

  /**
   * 批量添加对话记录
   */
  function addDialogues(dialogues: DialogueDataType[]): void {
    roomDialogues.value.push(...dialogues);
    console.log(`[Interaction Store] 添加了 ${dialogues.length} 条对话记录`);
  }

  /**
   * 清除对话记录
   */
  async function clearDialogues(): Promise<void> {
    try {
      roomDialogues.value = [];
      await saveDialogues();
      console.log('[Interaction Store] 对话记录已清除');
      toastr.info('对话记录已清除');
    } catch (error) {
      console.error('[Interaction Store] 清除对话记录失败:', error);
      toastr.error('清除对话记录失败');
      throw error;
    }
  }

  /**
   * 保存对话记录到 MVU
   */
  async function saveDialogues(): Promise<void> {
    try {
      const gameData = await mvuService.loadGameData();
      gameData.interaction.dialogues = roomDialogues.value;
      await mvuService.saveGameData(gameData);
      console.log('[Interaction Store] 对话记录已保存到 MVU');
    } catch (error) {
      console.error('[Interaction Store] 保存对话记录失败:', error);
      throw error;
    }
  }

  /**
   * 获取指定 NPC 的对话记录
   */
  function getDialoguesByNPC(npcId: string): DialogueDataType[] {
    return roomDialogues.value.filter(dialogue => dialogue.characterId === npcId);
  }

  /**
   * 获取最近的对话记录
   */
  function getRecentDialogues(count: number = 10): DialogueDataType[] {
    return roomDialogues.value.slice(-count);
  }

  /**
   * 获取对话统计信息
   */
  function getDialogueStats() {
    const stats: Record<string, number> = {};

    roomDialogues.value.forEach(dialogue => {
      if (dialogue.characterId) {
        stats[dialogue.characterId] = (stats[dialogue.characterId] || 0) + 1;
      }
    });

    return {
      total: roomDialogues.value.length,
      byCharacter: stats,
    };
  }

  /**
   * 检查 NPC 是否被选中
   */
  function isNPCSelected(npcId: string): boolean {
    return selectedNPCs.value.includes(npcId);
  }

  /**
   * 清空选择的 NPC
   */
  function clearSelectedNPCs(): void {
    selectedNPCs.value = [];
    console.log('[Interaction Store] 已清空选中的 NPC');
  }

  /**
   * 重置互动室状态
   */
  async function reset(): Promise<void> {
    mode.value = 'main';
    isActive.value = false;
    selectedNPCs.value = [];
    roomDialogues.value = [];
    console.log('[Interaction Store] 互动室状态已重置');
  }

  /**
   * 导出对话记录
   * 返回格式化的对话文本
   */
  function exportDialogues(): string {
    if (roomDialogues.value.length === 0) {
      return '暂无对话记录';
    }

    return roomDialogues.value
      .map(dialogue => {
        const time = new Date(dialogue.timestamp).toLocaleString();
        return `[${time}] ${dialogue.speaker}: ${dialogue.content}`;
      })
      .join('\n');
  }

  // ==================== 返回 ====================
  return {
    // 状态
    mode,
    selectedNPCs,
    roomDialogues,
    isActive,

    // 计算属性
    isInRoom,
    hasSelectedNPCs,
    dialogueCount,
    isSingleNPCMode,
    isGroupMode,

    // 方法
    loadFromMVU,
    setActiveNPCs,
    addNPC,
    removeNPC,
    toggleNPC,
    enterRoom,
    exitRoom,
    addDialogue,
    addDialogues,
    clearDialogues,
    saveDialogues,
    getDialoguesByNPC,
    getRecentDialogues,
    getDialogueStats,
    isNPCSelected,
    clearSelectedNPCs,
    reset,
    exportDialogues,
  };
});
