// 消息楼层服务 - 管理酒馆消息楼层的后台操作

/**
 * 消息类型
 */
interface MessageData {
  name?: string;
  role: 'system' | 'assistant' | 'user';
  is_hidden?: boolean;
  message: string;
  data?: Record<string, any>;
  extra?: Record<string, any>;
}

/**
 * 消息楼层服务类
 * 负责管理酒馆消息楼层的创建、更新和删除
 * 使用 { refresh: 'none' } 参数确保后台操作不刷新前端界面
 */
class MessageService {
  /**
   * 记录剧情到消息楼层
   * 使用 { refresh: 'none' } 在后台记录，不刷新显示
   * @param content 剧情内容
   * @param isUser 是否为用户消息
   * @param name 发言者名称（可选）
   */
  async recordPlot(content: string, isUser: boolean = false, name?: string): Promise<void> {
    try {
      if (!content || content.trim().length === 0) {
        console.warn('[Message Service] 尝试记录空内容，已跳过');
        return;
      }

      const message: MessageData = {
        name: name || (isUser ? 'User' : 'AI'),
        role: isUser ? 'user' : 'assistant',
        message: content,
        is_hidden: false,
      };

      await createChatMessages([message], { refresh: 'none' });

      console.log('[Message Service] 剧情记录成功（后台）');
    } catch (error) {
      console.error('[Message Service] 记录剧情失败:', error);
      // 不显示错误提示，因为这是后台操作，但记录错误
      throw error;
    }
  }

  /**
   * 批量记录多条剧情
   * @param messages 消息列表
   */
  async recordMultiplePlots(messages: MessageData[]): Promise<void> {
    try {
      await createChatMessages(messages, { refresh: 'none' });

      console.log(`[Message Service] 批量记录 ${messages.length} 条剧情成功（后台）`);
    } catch (error) {
      console.error('[Message Service] 批量记录剧情失败:', error);
      throw error;
    }
  }

  /**
   * 更新指定消息楼层的内容
   * @param messageId 消息楼层 ID
   * @param content 新的消息内容
   */
  async updateMessage(messageId: number, content: string): Promise<void> {
    try {
      if (messageId < 0) {
        throw new Error(`无效的消息 ID: ${messageId}`);
      }

      if (!content || content.trim().length === 0) {
        console.warn('[Message Service] 尝试更新为空内容，已跳过');
        return;
      }

      await setChatMessages([{ message_id: messageId, message: content }], { refresh: 'none' });

      console.log(`[Message Service] 消息楼层 ${messageId} 更新成功（后台）`);
    } catch (error) {
      console.error(`[Message Service] 更新消息楼层 ${messageId} 失败:`, error);
      throw error;
    }
  }

  /**
   * 更新消息的多个字段
   * @param messageId 消息楼层 ID
   * @param updates 要更新的字段
   */
  async updateMessageFields(messageId: number, updates: Partial<MessageData>): Promise<void> {
    try {
      await setChatMessages([{ message_id: messageId, ...updates }], { refresh: 'none' });

      console.log(`[Message Service] 消息楼层 ${messageId} 字段更新成功（后台）`);
    } catch (error) {
      console.error(`[Message Service] 更新消息楼层 ${messageId} 字段失败:`, error);
      throw error;
    }
  }

  /**
   * 删除指定的消息楼层
   * @param messageId 消息楼层 ID
   */
  async deleteMessage(messageId: number): Promise<void> {
    try {
      if (messageId < 0) {
        throw new Error(`无效的消息 ID: ${messageId}`);
      }

      await deleteChatMessages([messageId], { refresh: 'none' });

      console.log(`[Message Service] 消息楼层 ${messageId} 删除成功（后台）`);
    } catch (error) {
      console.error(`[Message Service] 删除消息楼层 ${messageId} 失败:`, error);
      throw error;
    }
  }

  /**
   * 批量删除消息楼层
   * @param messageIds 消息楼层 ID 列表
   */
  async deleteMultipleMessages(messageIds: number[]): Promise<void> {
    try {
      await deleteChatMessages(messageIds, { refresh: 'none' });

      console.log(`[Message Service] 批量删除 ${messageIds.length} 条消息成功（后台）`);
    } catch (error) {
      console.error('[Message Service] 批量删除消息失败:', error);
      throw error;
    }
  }

  /**
   * 获取当前聊天的所有消息
   */
  async getAllMessages(): Promise<any[]> {
    try {
      const messages = getChatMessages('0-{{lastMessageId}}');
      return messages;
    } catch (error) {
      console.error('[Message Service] 获取消息列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取指定消息楼层的内容
   * @param messageId 消息楼层 ID
   */
  async getMessage(messageId: number): Promise<any> {
    try {
      const messages = await this.getAllMessages();
      return messages[messageId];
    } catch (error) {
      console.error(`[Message Service] 获取消息楼层 ${messageId} 失败:`, error);
      throw error;
    }
  }

  /**
   * 记录对话到消息楼层
   * 专门用于记录对话内容，包含发言者信息
   * @param speaker 发言者名称
   * @param content 对话内容
   * @param isUser 是否为用户发言
   */
  async recordDialogue(speaker: string, content: string, isUser: boolean = false): Promise<void> {
    const formattedContent = `${speaker}: ${content}`;
    await this.recordPlot(formattedContent, isUser, speaker);
  }

  /**
   * 记录系统提示或旁白
   * @param content 提示内容
   */
  async recordSystemMessage(content: string): Promise<void> {
    await this.recordPlot(`[系统] ${content}`, false, 'System');
  }

  /**
   * 记录战斗日志
   * @param log 战斗日志内容
   */
  async recordCombatLog(log: string): Promise<void> {
    await this.recordPlot(`[战斗] ${log}`, false, 'Combat');
  }

  /**
   * 记录投骰结果
   * @param skillName 技能名称
   * @param roll 投骰点数
   * @param result 结果描述
   */
  async recordDiceRoll(skillName: string, roll: number, result: string): Promise<void> {
    const log = `投骰检定 [${skillName}]: ${roll} - ${result}`;
    await this.recordPlot(log, false, 'Dice');
  }

  /**
   * 记录重要事件
   * @param event 事件描述
   */
  async recordImportantEvent(event: string): Promise<void> {
    await this.recordPlot(`[重要事件] ${event}`, false, 'Event');
  }

  /**
   * 清空当前聊天的所有消息（慎用）
   */
  async clearAllMessages(): Promise<void> {
    try {
      const messages = await this.getAllMessages();
      const messageIds = messages.map((_, index) => index);

      if (messageIds.length > 0) {
        await this.deleteMultipleMessages(messageIds);
        console.log('[Message Service] 所有消息已清空');
      }
    } catch (error) {
      console.error('[Message Service] 清空消息失败:', error);
      throw error;
    }
  }

  /**
   * 获取最后一条消息
   */
  async getLastMessage(): Promise<any> {
    try {
      const messages = await this.getAllMessages();
      return messages[messages.length - 1];
    } catch (error) {
      console.error('[Message Service] 获取最后一条消息失败:', error);
      throw error;
    }
  }

  /**
   * 获取消息总数
   */
  async getMessageCount(): Promise<number> {
    try {
      const messages = await this.getAllMessages();
      return messages.length;
    } catch (error) {
      console.error('[Message Service] 获取消息总数失败:', error);
      return 0;
    }
  }
}

// 导出单例
export const messageService = new MessageService();
