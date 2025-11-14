// 流式传输服务 - 管理 AI 流式传输和对话生成

import YAML from 'yaml';
import type { DialogueDataType } from '../types/schemas';
import { mvuService } from './mvuService';

/**
 * 流式传输上下文类型
 */
type StreamContext = 'main_plot' | 'interaction_room';

/**
 * 流式传输事件回调
 */
interface StreamCallbacks {
  onIncremental?: (text: string, dialogue: DialogueDataType | null) => void;
  onComplete?: (text: string, dialogue: DialogueDataType | null) => void;
  onError?: (error: Error) => void;
}

/**
 * 流式传输服务类
 * 负责管理 AI 流式传输、对话解析和上下文切换
 */
class StreamService {
  private context: StreamContext = 'main_plot';
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
   * 在流式传输过程中实时更新
   */
  private handleIncrementalText(text: string): void {
    this.isStreaming = true;
    this.currentStreamText = text;

    // 尝试解析对话内容
    const dialogue = this.parseDialogue(text);

    // 调用回调函数
    if (this.callbacks.onIncremental) {
      this.callbacks.onIncremental(text, dialogue);
    }

    console.log('[Stream Service] 接收增量文本:', text.substring(0, 50) + '...');
  }

  /**
   * 处理完整文本
   * 流式传输完成后的处理
   */
  private async handleFullText(text: string): Promise<void> {
    try {
      this.isStreaming = false;
      this.currentStreamText = text;

      console.log('[Stream Service] 流式传输完成，文本长度:', text.length);

      // 解析完整的对话内容
      const dialogue = this.parseDialogue(text);

      // 调用回调函数
      if (this.callbacks.onComplete) {
        this.callbacks.onComplete(text, dialogue);
      }

      // 如果包含 MVU 命令，解析并更新变量
      if (this.containsMVUCommands(text)) {
        try {
          await mvuService.parseAndUpdateFromMessage(text);
          console.log('[Stream Service] MVU 命令解析成功');
        } catch (error) {
          console.error('[Stream Service] 解析 MVU 命令失败:', error);
          toastr.warning('解析数据更新命令失败');
          if (this.callbacks.onError) {
            this.callbacks.onError(error as Error);
          }
        }
      }
    } catch (error) {
      console.error('[Stream Service] 处理完整文本失败:', error);
      toastr.error('处理 AI 输出失败');
      if (this.callbacks.onError) {
        this.callbacks.onError(error as Error);
      }
    }
  }

  /**
   * 发送消息触发 AI 生成
   * @param message 用户输入的消息
   * @param options 生成选项
   */
  async sendMessage(message: string, options?: { raw?: boolean }): Promise<void> {
    try {
      console.log('[Stream Service] 发送消息:', message);

      // 根据上下文添加前缀或特殊标记
      let userInput = message;
      if (this.context === 'interaction_room') {
        userInput = `[互动室模式] ${message}`;
      }

      // 使用 generate 或 generateRaw 触发 AI 生成
      if (options?.raw) {
        await generateRaw({ user_input: userInput });
      } else {
        await generate({ user_input: userInput });
      }
    } catch (error) {
      console.error('[Stream Service] 发送消息失败:', error);
      toastr.error('发送消息失败');
      if (this.callbacks.onError) {
        this.callbacks.onError(error as Error);
      }
      throw error;
    }
  }

  /**
   * 解析 YAML 格式的对话内容
   * 只返回格式完整的对话，如果格式不完整则返回 null
   * @param text 文本内容
   */
  parseDialogue(text: string): DialogueDataType | null {
    try {
      // 尝试解析 YAML 格式
      const parsed = YAML.parse(text);

      // 验证必需字段
      if (parsed && typeof parsed === 'object' && parsed.speaker && parsed.content) {
        return {
          speaker: parsed.speaker,
          content: parsed.content,
          timestamp: Date.now(),
          characterId: parsed.characterId,
        };
      }

      // 如果不是 YAML 格式，尝试作为纯文本对话
      if (text && text.trim().length > 0) {
        // 检查是否是简单的对话格式 "角色名: 对话内容"
        const simpleDialogueMatch = text.match(/^([^:：]+)[：:]\s*(.+)$/s);
        if (simpleDialogueMatch) {
          return {
            speaker: simpleDialogueMatch[1].trim(),
            content: simpleDialogueMatch[2].trim(),
            timestamp: Date.now(),
          };
        }
      }
    } catch (error) {
      // 解析失败，可能是格式不完整或不是 YAML
      console.log('[Stream Service] 对话解析失败（可能格式不完整）:', error);
    }

    return null;
  }

  /**
   * 设置流式传输上下文
   * @param context 上下文类型
   */
  setContext(context: StreamContext): void {
    this.context = context;
    console.log(`[Stream Service] 上下文切换为: ${context}`);
  }

  /**
   * 获取当前上下文
   */
  getContext(): StreamContext {
    return this.context;
  }

  /**
   * 设置回调函数
   * @param callbacks 回调函数集合
   */
  setCallbacks(callbacks: StreamCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * 清除回调函数
   */
  clearCallbacks(): void {
    this.callbacks = {};
  }

  /**
   * 检查是否正在流式传输
   */
  isCurrentlyStreaming(): boolean {
    return this.isStreaming;
  }

  /**
   * 获取当前流式传输的文本
   */
  getCurrentStreamText(): string {
    return this.currentStreamText;
  }

  /**
   * 检查文本中是否包含 MVU 命令
   */
  private containsMVUCommands(text: string): boolean {
    return text.includes('{{') && text.includes('}}');
  }

  /**
   * 停止当前的流式传输
   */
  stopStreaming(): void {
    // 酒馆助手可能提供停止流式传输的接口
    // 这里先记录日志
    console.log('[Stream Service] 请求停止流式传输');
    this.isStreaming = false;
  }

  /**
   * 重新生成最后一条消息
   */
  async regenerate(): Promise<void> {
    try {
      console.log('[Stream Service] 重新生成最后一条消息');
      // 使用酒馆助手的重新生成接口
      // 注意：regenerate 功能可能需要通过其他方式实现
      await generate({});
    } catch (error) {
      console.error('[Stream Service] 重新生成失败:', error);
      toastr.error('重新生成失败');
      throw error;
    }
  }

  /**
   * 触发特定场景的剧情生成
   * @param scenario 场景描述
   * @param context 额外上下文信息
   */
  async generateScenario(scenario: string, context?: Record<string, any>): Promise<void> {
    try {
      let prompt = scenario;

      // 如果有额外上下文，添加到提示中
      if (context) {
        const contextStr = Object.entries(context)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n');
        prompt = `${scenario}\n\n上下文信息:\n${contextStr}`;
      }

      await this.sendMessage(prompt);
    } catch (error) {
      console.error('[Stream Service] 生成场景剧情失败:', error);
      toastr.error('生成剧情失败');
      throw error;
    }
  }

  /**
   * 根据投骰结果生成剧情
   * @param rollResult 投骰结果
   * @param skillName 技能名称
   * @param action 玩家行动描述
   */
  async generatePlotBasedOnRoll(rollResult: string, skillName: string, action: string): Promise<void> {
    try {
      // 获取当前副本和区域信息作为上下文
      const gameData = await mvuService.loadGameData();
      let contextInfo = '';

      // 添加当前副本信息
      if (gameData.game.currentInstanceId) {
        const instance = gameData.instances[gameData.game.currentInstanceId];
        if (instance) {
          contextInfo += `当前副本: ${instance.name}\n`;

          // 添加当前区域信息
          if (gameData.game.currentArea && instance.map) {
            const area = instance.map.areas.get(gameData.game.currentArea);
            if (area) {
              contextInfo += `当前位置: ${area.name}\n`;
              if (area.description) {
                contextInfo += `区域描述: ${area.description}\n`;
              }
            }
          }
        }
      }

      // 添加角色信息
      if (gameData.characters.player) {
        contextInfo += `主控角色: ${gameData.characters.player.name}\n`;
      }

      // 构建完整的提示
      const prompt = `${contextInfo ? contextInfo + '\n' : ''}玩家尝试进行 ${skillName} 检定: ${action}\n检定结果: ${rollResult}\n\n请根据检定结果和当前情境继续剧情发展。`;

      console.log('[Stream Service] 生成剧情提示:', prompt);
      await this.sendMessage(prompt);
    } catch (error) {
      console.error('[Stream Service] 生成剧情失败:', error);
      // 如果获取上下文失败，使用简化版本
      const prompt = `玩家尝试进行 ${skillName} 检定: ${action}\n检定结果: ${rollResult}\n请根据检定结果继续剧情发展。`;
      await this.sendMessage(prompt);
    }
  }

  /**
   * 生成区域事件
   * @param areaId 区域 ID
   * @param areaName 区域名称
   */
  async generateAreaEvent(areaName: string): Promise<void> {
    const prompt = `玩家进入了新区域: ${areaName}\n请描述该区域的情况和可能发生的事件。`;
    await this.sendMessage(prompt);
  }
}

// 导出单例
export const streamService = new StreamService();
