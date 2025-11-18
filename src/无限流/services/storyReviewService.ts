// 剧情回顾服务 - 生成现实世界和副本世界的剧情回顾

import type { APIConfig } from '../types/api';
import { apiConfigService } from './apiConfigService';

/**
 * 剧情回顾服务类
 * 负责生成现实世界和副本世界的剧情回顾
 */
class StoryReviewService {
  private initialized = false;

  /**
   * 初始化服务
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[Story Review Service] 已经初始化，跳过');
      return;
    }

    try {
      console.log('[Story Review Service] 开始初始化...');
      // 确保 API 配置服务已初始化
      await apiConfigService.initialize();
      this.initialized = true;
      console.log('[Story Review Service] 初始化完成');
    } catch (error) {
      console.error('[Story Review Service] 初始化失败:', error);
      throw error;
    }
  }

  /**
   * 回顾现实世界剧情
   * 使用现实世界 API 配置生成回顾内容
   */
  async reviewRealWorldStory(): Promise<string> {
    try {
      console.log('[Story Review Service] 开始回顾现实世界剧情...');

      // 获取聊天历史
      const messages = this.getChatHistory();
      if (messages.length === 0) {
        return '暂无现实世界剧情记录。';
      }

      // 清理消息内容
      const cleanedMessages = messages.map(msg => ({
        role: msg.role,
        content: this.cleanMessages(msg.message),
      }));

      // 构建回顾提示词
      const prompt = this.buildReviewPrompt(cleanedMessages, '现实世界');

      // 生成回顾内容
      // 注意：使用现实世界的 API 配置
      // 如果需要强制使用特定世界的 API，可以在请求中指定 custom_api
      const allConfigs = apiConfigService.getAllConfigs();
      const realWorldConfig = allConfigs.realWorld;
      const review = await this.generateReview(prompt, realWorldConfig);

      console.log('[Story Review Service] 现实世界剧情回顾生成完成');
      return review;
    } catch (error) {
      console.error('[Story Review Service] 回顾现实世界剧情失败:', error);
      throw error;
    }
  }

  /**
   * 回顾副本剧情
   * 使用里世界 API 配置生成回顾内容
   * @param instanceId 副本 ID（可选，如果不提供则回顾所有副本）
   */
  async reviewInstanceStory(instanceId?: string): Promise<string> {
    try {
      console.log('[Story Review Service] 开始回顾副本剧情...', instanceId);

      // 获取聊天历史
      const messages = this.getChatHistory();
      if (messages.length === 0) {
        return '暂无副本剧情记录。';
      }

      // 清理消息内容
      const cleanedMessages = messages.map(msg => ({
        role: msg.role,
        content: this.cleanMessages(msg.message),
      }));

      // 构建回顾提示词
      const worldName = instanceId ? `副本 ${instanceId}` : '里世界副本';
      const prompt = this.buildReviewPrompt(cleanedMessages, worldName);

      // 生成回顾内容
      // 注意：使用里世界的 API 配置
      // 如果需要强制使用特定世界的 API，可以在请求中指定 custom_api
      const allConfigs = apiConfigService.getAllConfigs();
      const innerWorldConfig = allConfigs.innerWorld;
      const review = await this.generateReview(prompt, innerWorldConfig);

      console.log('[Story Review Service] 副本剧情回顾生成完成');
      return review;
    } catch (error) {
      console.error('[Story Review Service] 回顾副本剧情失败:', error);
      throw error;
    }
  }

  /**
   * 在剧情中搜索关键词
   * @param keyword 搜索关键词
   * @returns 包含关键词的消息列表
   */
  searchInStory(keyword: string): Array<{ index: number; role: string; content: string }> {
    try {
      console.log('[Story Review Service] 搜索关键词:', keyword);

      if (!keyword || keyword.trim() === '') {
        return [];
      }

      const messages = this.getChatHistory();
      const results: Array<{ index: number; role: string; content: string }> = [];

      messages.forEach((msg, index) => {
        const cleanedContent = this.cleanMessages(msg.message);
        if (cleanedContent.toLowerCase().includes(keyword.toLowerCase())) {
          results.push({
            index,
            role: msg.role,
            content: cleanedContent,
          });
        }
      });

      console.log(`[Story Review Service] 找到 ${results.length} 条匹配结果`);
      return results;
    } catch (error) {
      console.error('[Story Review Service] 搜索失败:', error);
      return [];
    }
  }

  /**
   * 获取聊天历史
   * 使用 getChatMessages() 获取所有消息
   */
  private getChatHistory(): Array<{ role: string; message: string }> {
    try {
      // 获取所有消息（使用模板字符串获取从第一条到最后一条）
      const allMessages = getChatMessages('0-{{lastMessageId}}');

      return allMessages.map(msg => ({
        role: msg.role,
        message: msg.message,
      }));
    } catch (error) {
      console.error('[Story Review Service] 获取聊天历史失败:', error);
      return [];
    }
  }

  /**
   * 清理消息内容
   * 移除代码块、HTML 标签、MVU 标签等
   */
  cleanMessages(content: string): string {
    if (!content) return '';

    let cleaned = content;

    // 移除 HTML/XML 标签（如 <StatusPlaceHolderImpl/>、<div>...</div>）
    cleaned = cleaned.replace(/<[^>]+>/g, '');

    // 移除 MVU 命令（{{...}}）
    cleaned = cleaned.replace(/\{\{[^}]+\}\}/g, '');

    // 移除代码块（```...```）
    cleaned = cleaned.replace(/```[\s\S]*?```/g, '');

    // 移除行内代码（`...`）
    cleaned = cleaned.replace(/`[^`]+`/g, '');

    // 移除 Markdown 标题标记
    cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');

    // 移除 Markdown 粗体和斜体标记
    cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
    cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
    cleaned = cleaned.replace(/__([^_]+)__/g, '$1');
    cleaned = cleaned.replace(/_([^_]+)_/g, '$1');

    // 移除方括号标记（如 [互动室模式]、[注意：...]）
    cleaned = cleaned.replace(/\[([^\]]+)\]/g, '');

    // 移除记忆事件标签
    cleaned = cleaned.replace(/\[memory_event[^\]]*\][\s\S]*?\[\/memory_event\]/g, '');

    // 移除多余的空行（保留单个换行）
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    // 移除首尾空白
    cleaned = cleaned.trim();

    return cleaned;
  }

  /**
   * 构建回顾提示词
   */
  private buildReviewPrompt(messages: Array<{ role: string; content: string }>, worldName: string): string {
    let prompt = `请根据以下${worldName}的剧情记录，生成一份简洁的剧情回顾。\n\n`;
    prompt += `要求：\n`;
    prompt += `1. 按时间顺序梳理主要剧情发展\n`;
    prompt += `2. 突出关键事件和转折点\n`;
    prompt += `3. 保持客观叙述，不添加主观评价\n`;
    prompt += `4. 使用简洁明了的语言\n\n`;
    prompt += `剧情记录：\n\n`;

    // 添加消息内容（限制长度以避免超出 token 限制）
    const maxMessages = 50; // 最多处理最近 50 条消息
    const recentMessages = messages.slice(-maxMessages);

    recentMessages.forEach((msg, index) => {
      const speaker = msg.role === 'user' ? '玩家' : 'AI';
      prompt += `[${index + 1}] ${speaker}：${msg.content}\n\n`;
    });

    prompt += `\n请生成剧情回顾：`;

    return prompt;
  }

  /**
   * 使用 AI 生成回顾内容
   * @param prompt 提示词
   * @param config API 配置（可选，如果提供则使用指定配置）
   */
  private async generateReview(prompt: string, config?: APIConfig | null): Promise<string> {
    // 使用 withAPIContext 确保使用 sanctuary API（归所）
    // 剧情回顾等不触发 AI 对话的功能统一使用归所 API
    return await withAPIContext('sanctuary', async () => {
      try {
        console.log('[Story Review Service] 开始生成回顾内容...');

        const requestParams: any = {
          ordered_prompts: [{ role: 'user', content: prompt }],
        };

        // 注意：不再使用 custom_api，让 withAPIContext 处理 API 切换
        console.log('[Story Review Service] 使用归所 API 配置');

        const response = await generateRaw(requestParams);

        return response;
      } catch (error) {
        console.error('[Story Review Service] 生成回顾内容失败:', error);
        throw error;
      }
    });
  }
}

// 导出单例
export const storyReviewService = new StoryReviewService();
