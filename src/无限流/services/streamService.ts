// 流式传输服务 - 管理 AI 流式传输和对话解析
// 简化版本 - 仅包含基本功能

import { useInstanceStore } from '../stores/instanceStore';
import { eventRecordService } from './eventRecordService';
import { mvuService } from './mvuService';
import { npcAppearanceService } from './npcAppearanceService';

/**
 * 流式传输事件回调
 */
interface StreamCallbacks {
  onIncremental?: (text: string) => void;
  onComplete?: (text: string) => void;
  onError?: (error: Error) => void;
}

/**
 * 流式传输服务类
 * 负责管理 AI 流式传输
 */
class StreamService {
  private callbacks: StreamCallbacks = {};
  private isStreaming = false;
  private currentStreamText = '';

  /**
   * 设置流式传输监听器
   * 监听酒馆助手的流式传输事件
   */
  setupStreamListeners(): void {
    // 监听增量文本（流式传输中）
    eventOn(iframe_events.STREAM_TOKEN_RECEIVED_INCREMENTALLY, (text: string) => {
      this.handleIncrementalText(text);
    });

    // 监听完整文本（流式传输完成）
    eventOn(iframe_events.STREAM_TOKEN_RECEIVED_FULLY, (text: string) => {
      this.handleFullText(text);
    });

    console.log('[Stream Service] 流式传输监听器已设置');
  }

  /**
   * 处理增量文本
   */
  private handleIncrementalText(text: string): void {
    this.isStreaming = true;
    this.currentStreamText = text;

    // 调用回调函数
    if (this.callbacks.onIncremental) {
      this.callbacks.onIncremental(text);
    }
  }

  /**
   * 处理完整文本
   */
  private async handleFullText(text: string): Promise<void> {
    try {
      this.isStreaming = false;
      this.currentStreamText = text;

      // 更新 NPC 出场次数
      await this.updateNPCAppearanceCounts(text);

      // 记录事件
      await this.recordEvents(text);

      // 调用回调函数
      if (this.callbacks.onComplete) {
        this.callbacks.onComplete(text);
      }
    } catch (error) {
      console.error('[Stream Service] 处理完整文本失败:', error);
      if (this.callbacks.onError) {
        this.callbacks.onError(error as Error);
      }
    }
  }

  /**
   * 更新 NPC 出场次数
   * 在 AI 输出完成后，检测哪些 NPC 在文本中出现，并更新其出场次数
   */
  private async updateNPCAppearanceCounts(text: string): Promise<void> {
    try {
      const instanceStore = useInstanceStore();
      const currentInstance = instanceStore.currentInstance;

      if (!currentInstance || currentInstance.status !== 'active') {
        return;
      }

      // 遍历所有 NPC，检测是否在文本中出现
      for (const npcData of currentInstance.characters) {
        const character = npcData.character;

        // 如果文本中提到了该 NPC 的名字，增加出场次数
        if (text.includes(character.name)) {
          const currentCount = npcData.appearanceCount || 0;
          npcData.appearanceCount = currentCount + 1;

          console.log(`[Stream Service] NPC ${character.name} 出场次数更新: ${npcData.appearanceCount}`);
        }
      }

      // 保存更新到 instanceStore
      await instanceStore.updateInstance(currentInstance.id, {
        characters: currentInstance.characters,
      });

      // 保存到 MVU（如果 MVU 已初始化）
      try {
        if (mvuService) {
          const gameData = await mvuService.loadGameData();
          if (gameData.instances[currentInstance.id]) {
            gameData.instances[currentInstance.id].characters = currentInstance.characters;
            await mvuService.saveGameData(gameData);
          }
        }
      } catch (mvuError) {
        console.warn('[Stream Service] 保存到 MVU 失败（可能未初始化）:', mvuError);
      }
    } catch (error) {
      console.error('[Stream Service] 更新 NPC 出场次数失败:', error);
      // 不抛出错误，避免影响主流程
    }
  }

  /**
   * 记录事件
   * 在 AI 输出完成后，从文本中提取并记录重要事件
   */
  private async recordEvents(text: string): Promise<void> {
    try {
      const instanceStore = useInstanceStore();
      const currentInstance = instanceStore.currentInstance;

      if (!currentInstance || currentInstance.status !== 'active') {
        return;
      }

      // 获取当前场景中的 NPC ID 列表
      const currentNPCs = currentInstance.characters
        .filter(npcData => text.includes(npcData.character.name))
        .map(npcData => npcData.characterId);

      // 记录事件
      await eventRecordService.recordEventFromAIOutput(currentInstance.id, text, currentNPCs);

      // 保存到 MVU（如果 MVU 已初始化）
      try {
        if (mvuService) {
          const gameData = await mvuService.loadGameData();
          if (gameData.instances[currentInstance.id]) {
            gameData.instances[currentInstance.id].events = currentInstance.events;
            await mvuService.saveGameData(gameData);
          }
        }
      } catch (mvuError) {
        console.warn('[Stream Service] 保存事件到 MVU 失败（可能未初始化）:', mvuError);
      }
    } catch (error) {
      console.error('[Stream Service] 记录事件失败:', error);
      // 不抛出错误，避免影响主流程
    }
  }

  /**
   * 发送消息
   * @param message 用户消息
   */
  async sendMessage(message: string): Promise<void> {
    try {
      console.log('[Stream Service] 发送消息:', message);

      // 在生成 AI 响应前注入 NPC 出场提示词
      await this.injectNPCAppearancePrompt();

      // 使用 generate 触发 AI 生成
      await generate({
        user_input: message,
        should_stream: true,
      });

      console.log('[Stream Service] 消息已发送，等待 AI 回复');
    } catch (error) {
      console.error('[Stream Service] 发送消息失败:', error);
      toastr.error('发送消息失败');
      if (this.callbacks.onError) {
        this.callbacks.onError(error as Error);
      }
    }
  }

  /**
   * 注入 NPC 出场提示词
   * 在生成 AI 响应前调用，将 NPC 出场控制信息注入到提示词系统
   */
  private async injectNPCAppearancePrompt(): Promise<void> {
    try {
      const instanceStore = useInstanceStore();
      const currentInstance = instanceStore.currentInstance;

      // 只在副本进行中时注入
      if (!currentInstance || currentInstance.status !== 'active') {
        return;
      }

      // 如果没有 NPC，跳过
      if (!currentInstance.characters || currentInstance.characters.length === 0) {
        return;
      }

      // 生成 NPC 出场提示词
      const appearancePrompt = npcAppearanceService.generateAppearancePrompt(currentInstance.characters);

      if (!appearancePrompt) {
        return;
      }

      console.log('[Stream Service] 注入 NPC 出场提示词');

      // 使用 injectPrompts 注入提示词
      injectPrompts(
        [
          {
            id: 'npc_appearance_control',
            content: appearancePrompt,
            position: 'in_chat',
            depth: 4,
            role: 'system',
          },
        ],
        { once: true },
      );
    } catch (error) {
      console.error('[Stream Service] 注入 NPC 出场提示词失败:', error);
      // 不抛出错误，避免影响主流程
    }
  }

  /**
   * 设置回调函数
   */
  setCallbacks(callbacks: StreamCallbacks): void {
    this.callbacks = callbacks;
    console.log('[Stream Service] 回调函数已设置');
  }

  /**
   * 清除回调函数
   */
  clearCallbacks(): void {
    this.callbacks = {};
    console.log('[Stream Service] 回调函数已清除');
  }

  /**
   * 获取当前流式传输状态
   */
  getIsStreaming(): boolean {
    return this.isStreaming;
  }

  /**
   * 获取当前流式传输文本
   */
  getCurrentText(): string {
    return this.currentStreamText;
  }

  /**
   * 生成基于投骰结果的剧情
   */
  async generatePlotBasedOnRoll(rollResult: string, skillName: string, action: string): Promise<void> {
    try {
      const prompt = `玩家进行了${action}，使用技能：${skillName}，投骰结果：${rollResult}。请根据这个结果生成后续剧情发展。`;

      await this.sendMessage(prompt);
    } catch (error) {
      console.error('[Stream Service] 生成剧情失败:', error);
      toastr.error('生成剧情失败');
    }
  }

  /**
   * 生成区域事件
   */
  async generateAreaEvent(areaName: string): Promise<void> {
    try {
      const prompt = `玩家进入了「${areaName}」，请描述这个区域的情况和可能发生的事件。`;

      await this.sendMessage(prompt);
    } catch (error) {
      console.error('[Stream Service] 生成区域事件失败:', error);
      toastr.error('生成区域事件失败');
    }
  }
}

// 导出单例
export const streamService = new StreamService();
