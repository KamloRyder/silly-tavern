// 事件记录服务 - 自动记录副本内的重要事件

import { useInstanceStore } from '../stores/instanceStore';
import type { ImportantEvent } from '../types/instance';

/**
 * 事件重要性等级
 */
type EventImportance = 'low' | 'medium' | 'high';

/**
 * 事件记录服务类
 * 负责从 AI 输出中提取并记录重要事件
 */
class EventRecordService {
  private initialized = false;
  private eventKeywords = ['发现', '战斗', '死亡', '获得', '失去', '决定', '揭示', '遇见'];

  /**
   * 初始化服务
   */
  initialize(): void {
    if (this.initialized) {
      console.log('[Event Record Service] 服务已初始化，跳过');
      return;
    }

    console.log('[Event Record Service] 初始化事件记录服务');
    this.initialized = true;
  }

  /**
   * 从 AI 输出中提取并记录事件
   * @param instanceId 副本 ID
   * @param aiOutput AI 输出文本
   * @param currentNPCs 当前场景中的 NPC ID 列表
   */
  async recordEventFromAIOutput(instanceId: string, aiOutput: string, currentNPCs: string[]): Promise<void> {
    try {
      // 检测是否包含重要事件
      if (!this.containsImportantEvent(aiOutput)) {
        return;
      }

      // 生成事件概括
      const summary = this.generateEventSummary(aiOutput);

      // 检测事件重要性
      const importance = this.detectImportance(aiOutput);

      // 创建事件记录
      const event: ImportantEvent = {
        id: this.generateEventId(),
        summary,
        timestamp: Date.now(),
        involvedCharacters: currentNPCs,
      };

      // 添加到副本的事件列表
      const instanceStore = useInstanceStore();
      const instance = instanceStore.getInstance(instanceId);

      if (!instance) {
        console.error(`[Event Record Service] 副本不存在: ${instanceId}`);
        return;
      }

      // 添加事件到副本
      instance.events.push(event);

      // 更新副本
      await instanceStore.updateInstance(instanceId, {
        events: instance.events,
      });

      console.log(`[Event Record Service] 事件已记录: ${summary} (重要性: ${importance})`);
    } catch (error) {
      console.error('[Event Record Service] 记录事件失败:', error);
      // 不抛出错误，避免影响主流程
    }
  }

  /**
   * 检测文本是否包含重要事件
   * @param text 文本内容
   * @returns 是否包含重要事件
   */
  containsImportantEvent(text: string): boolean {
    return this.eventKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * 生成事件概括（一句话）
   * @param text AI 输出文本
   * @returns 事件概括
   */
  generateEventSummary(text: string): string {
    // 将文本按句子分割
    const sentences = text.split(/[。！？\n]/);

    // 查找包含关键词的句子
    for (const sentence of sentences) {
      const trimmed = sentence.trim();

      // 跳过太短或太长的句子
      if (trimmed.length < 10 || trimmed.length > 100) {
        continue;
      }

      // 检查是否包含事件关键词
      if (this.eventKeywords.some(keyword => trimmed.includes(keyword))) {
        return trimmed;
      }
    }

    // 如果没有找到合适的句子，返回第一个合适长度的句子
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.length >= 10 && trimmed.length <= 100) {
        return trimmed;
      }
    }

    // 如果还是没有，返回前 50 个字符
    return text.substring(0, 50).trim() + '...';
  }

  /**
   * 检测事件重要性
   * @param text AI 输出文本
   * @returns 事件重要性等级
   */
  detectImportance(text: string): EventImportance {
    // 高重要性关键词
    const highKeywords = ['死亡', '揭示', '决定'];
    // 中等重要性关键词
    const mediumKeywords = ['战斗', '发现', '获得'];
    // 低重要性关键词
    const lowKeywords = ['遇见', '失去'];

    // 检测高重要性
    if (highKeywords.some(keyword => text.includes(keyword))) {
      return 'high';
    }

    // 检测中等重要性
    if (mediumKeywords.some(keyword => text.includes(keyword))) {
      return 'medium';
    }

    // 检测低重要性
    if (lowKeywords.some(keyword => text.includes(keyword))) {
      return 'low';
    }

    // 默认为低重要性
    return 'low';
  }

  /**
   * 生成事件 ID
   * @returns 事件 ID
   */
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 获取副本的所有事件
   * @param instanceId 副本 ID
   * @returns 事件列表
   */
  getInstanceEvents(instanceId: string): ImportantEvent[] {
    const instanceStore = useInstanceStore();
    const instance = instanceStore.getInstance(instanceId);

    if (!instance) {
      console.error(`[Event Record Service] 副本不存在: ${instanceId}`);
      return [];
    }

    return instance.events || [];
  }

  /**
   * 获取副本的重要事件（仅高重要性）
   * @param instanceId 副本 ID
   * @returns 重要事件列表
   */
  getImportantEvents(instanceId: string): ImportantEvent[] {
    const events = this.getInstanceEvents(instanceId);

    // 由于 ImportantEvent 接口中没有 importance 字段，
    // 我们通过事件概括中的关键词来判断重要性
    return events.filter(event => {
      const highKeywords = ['死亡', '揭示', '决定'];
      return highKeywords.some(keyword => event.summary.includes(keyword));
    });
  }
}

// 导出单例
export const eventRecordService = new EventRecordService();
