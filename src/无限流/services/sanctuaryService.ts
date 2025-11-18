/**
 * 归所服务
 * 负责管理玩家的持久化个人空间，包括装饰、纪念品和 NPC 互动
 */

import { klona } from 'klona';
import type { Memento } from '../types/instance';
import { memoryFragmentService } from './memoryFragmentService';

/**
 * 家具类型
 */
export type FurnitureType = 'sofa' | 'table' | 'bookshelf' | 'plant' | 'other';

/**
 * 家具项
 */
export interface FurnitureItem {
  id: string;
  name: string;
  type: FurnitureType;
  position: { x: number; y: number };
  imageUrl?: string;
}

/**
 * 纪念品展示
 */
export interface MementoDisplay {
  mementoId: string;
  position: { x: number; y: number };
  scale: number;
}

/**
 * 装饰品
 */
export interface DecorationItem {
  id: string;
  name: string;
  type: string;
  position: { x: number; y: number };
  imageUrl?: string;
}

/**
 * 对话记录
 */
export interface ConversationRecord {
  id: string;
  npcIds: string[]; // 参与的 NPC ID 列表
  messages: any[]; // 消息列表
  startedAt: number;
  endedAt?: number;
}

/**
 * 归所数据
 */
export interface SanctuaryData {
  backgroundImage: string; // 归所背景图
  furniture: FurnitureItem[]; // 家具列表
  mementos: MementoDisplay[]; // 展示的纪念品
  decorations: DecorationItem[]; // 装饰品
  conversationHistory: ConversationRecord[]; // 对话历史
}

/**
 * 归所服务类
 */
class SanctuaryService {
  private initialized = false;

  /**
   * 初始化归所
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[SanctuaryService] 服务已初始化');
      return;
    }

    console.log('[SanctuaryService] 初始化服务...');

    let sanctuary = await this.getSanctuary();

    if (!sanctuary) {
      // 创建默认归所
      sanctuary = {
        backgroundImage: 'default_apartment.jpg',
        furniture: [],
        mementos: [],
        decorations: [],
        conversationHistory: [],
      };
      await this.saveSanctuary(sanctuary);
      console.log('[SanctuaryService] 已创建默认归所');
    }

    this.initialized = true;
    console.log('[SanctuaryService] 服务初始化完成');
  }

  /**
   * 获取归所数据
   */
  async getSanctuary(): Promise<SanctuaryData | null> {
    try {
      const allVars = getVariables({ type: 'global' });
      return (allVars.sanctuary_data as SanctuaryData) || null;
    } catch (error) {
      console.error('[SanctuaryService] 获取归所数据失败:', error);
      return null;
    }
  }

  /**
   * 保存归所数据
   */
  async saveSanctuary(sanctuary: SanctuaryData): Promise<void> {
    try {
      // 使用 klona 去除 Vue Proxy 层
      const cleanSanctuary = klona(sanctuary);
      insertOrAssignVariables({ sanctuary_data: cleanSanctuary }, { type: 'global' });
      console.log('[SanctuaryService] 归所数据已保存');
    } catch (error) {
      console.error('[SanctuaryService] 保存归所数据失败:', error);
      throw error;
    }
  }

  /**
   * 邀请 NPC 到归所
   */
  async inviteNPC(npcIds: string[]): Promise<void> {
    try {
      console.log('[SanctuaryService] 邀请 NPC 到归所:', npcIds);

      const sanctuary = await this.getSanctuary();
      if (!sanctuary) {
        throw new Error('归所数据不存在');
      }

      // 创建新的对话记录
      const conversation: ConversationRecord = {
        id: this.generateId(),
        npcIds,
        messages: [],
        startedAt: Date.now(),
      };

      sanctuary.conversationHistory.push(conversation);
      await this.saveSanctuary(sanctuary);

      // 切换到归所世界书
      // 注意：API 配置会由 apiAutoSwitchService 根据 MVU 变量自动切换
      const { worldBookService } = await import('./worldBookService');
      await worldBookService.activateInteractionRoomEntries();
      console.log('[SanctuaryService] 已切换到归所世界书');

      // 注入归所环境描述和 NPC 记忆
      await this.setupConversationContext(npcIds);

      toastr.success(`已邀请 ${npcIds.length} 位 NPC 到归所`);
    } catch (error) {
      console.error('[SanctuaryService] 邀请 NPC 失败:', error);
      toastr.error('邀请 NPC 失败');
      throw error;
    }
  }

  /**
   * 设置对话上下文
   * 注入归所环境描述和 NPC 记忆
   */
  private async setupConversationContext(npcIds: string[]): Promise<void> {
    try {
      const sanctuary = await this.getSanctuary();
      if (!sanctuary) {
        throw new Error('归所数据不存在');
      }

      // 构建归所环境描述
      let environmentPrompt = `当前场景：归所\n`;
      environmentPrompt += `环境描述：这是一个温馨的个人空间，${this.describeEnvironment(sanctuary)}\n\n`;

      // 为每个 NPC 注入记忆
      for (const npcId of npcIds) {
        const memoryPrompt = await memoryFragmentService.injectMemoryPrompt(npcId);
        if (memoryPrompt) {
          environmentPrompt += `\n--- ${npcId} 的记忆 ---\n`;
          environmentPrompt += memoryPrompt + '\n';
        }
      }

      // 注入提示词
      injectPrompts([
        {
          id: 'sanctuary_context',
          content: environmentPrompt,
          position: 'in_chat',
          depth: 0,
          role: 'system',
        },
      ]);

      console.log('[SanctuaryService] 对话上下文已设置');
    } catch (error) {
      console.error('[SanctuaryService] 设置对话上下文失败:', error);
      throw error;
    }
  }

  /**
   * 与归所物品互动
   */
  async interactWithItem(itemId: string): Promise<string> {
    try {
      const sanctuary = await this.getSanctuary();
      if (!sanctuary) {
        throw new Error('归所数据不存在');
      }

      const item = this.findItem(sanctuary, itemId);
      if (!item) {
        return '找不到该物品';
      }

      console.log('[SanctuaryService] 与物品互动:', item.name);

      // 使用 withAPIContext 确保使用 sanctuary API（归所）
      const response = await withAPIContext('sanctuary', async () => {
        const prompt = `玩家正在与归所中的「${item.name}」互动。请生成一段简短的互动描述。`;

        return await generateRaw({
          ordered_prompts: [{ role: 'user', content: prompt }],
        });
      });

      console.log('[SanctuaryService] 物品互动描述已生成');
      return response;
    } catch (error) {
      console.error('[SanctuaryService] 与物品互动失败:', error);
      return '互动失败，请稍后再试';
    }
  }

  /**
   * 添加纪念品到归所
   */
  async addMemento(memento: Memento, position: { x: number; y: number }): Promise<void> {
    try {
      const sanctuary = await this.getSanctuary();
      if (!sanctuary) {
        throw new Error('归所数据不存在');
      }

      sanctuary.mementos.push({
        mementoId: memento.id,
        position,
        scale: 1.0,
      });

      await this.saveSanctuary(sanctuary);
      toastr.success(`「${memento.name}」已添加到归所`);
      console.log('[SanctuaryService] 纪念品已添加:', memento.name);
    } catch (error) {
      console.error('[SanctuaryService] 添加纪念品失败:', error);
      toastr.error('添加纪念品失败');
      throw error;
    }
  }

  /**
   * 生成环境描述
   */
  private describeEnvironment(sanctuary: SanctuaryData): string {
    const items: string[] = [];

    // 添加家具描述
    items.push(...sanctuary.furniture.map(f => f.name));

    // 添加纪念品描述
    items.push(...sanctuary.mementos.map(m => `纪念品「${m.mementoId}」`));

    if (items.length === 0) {
      return '空间还很空旷，等待着被装饰';
    }

    return `摆放着${items.slice(0, 3).join('、')}${items.length > 3 ? '等物品' : ''}`;
  }

  /**
   * 查找物品（家具或纪念品）
   */
  private findItem(sanctuary: SanctuaryData, itemId: string): { name: string } | null {
    // 在家具中查找
    const furniture = sanctuary.furniture.find(f => f.id === itemId);
    if (furniture) {
      return { name: furniture.name };
    }

    // 在纪念品中查找
    const memento = sanctuary.mementos.find(m => m.mementoId === itemId);
    if (memento) {
      return { name: memento.mementoId };
    }

    return null;
  }

  /**
   * 保存对话到归所历史
   * @param npcIds 参与对话的 NPC ID 列表
   * @param messages 对话消息列表
   */
  async saveConversation(npcIds: string[], messages: any[]): Promise<void> {
    try {
      const sanctuary = await this.getSanctuary();
      if (!sanctuary) {
        throw new Error('归所数据不存在');
      }

      // 查找是否已有相同 NPC 组合的对话记录
      const sortedNpcIds = [...npcIds].sort();
      const existingConversation = sanctuary.conversationHistory.find(conv => {
        const sortedConvNpcIds = [...conv.npcIds].sort();
        return JSON.stringify(sortedConvNpcIds) === JSON.stringify(sortedNpcIds);
      });

      if (existingConversation) {
        // 更新现有对话记录
        existingConversation.messages = messages;
        existingConversation.endedAt = Date.now();
        console.log('[SanctuaryService] 已更新对话记录:', existingConversation.id);
      } else {
        // 创建新的对话记录
        const newConversation: ConversationRecord = {
          id: this.generateId(),
          npcIds,
          messages,
          startedAt: Date.now(),
          endedAt: Date.now(),
        };
        sanctuary.conversationHistory.push(newConversation);
        console.log('[SanctuaryService] 已创建新对话记录:', newConversation.id);
      }

      await this.saveSanctuary(sanctuary);
      console.log('[SanctuaryService] 对话历史已保存');
    } catch (error) {
      console.error('[SanctuaryService] 保存对话失败:', error);
      throw error;
    }
  }

  /**
   * 获取指定 NPC 组合的对话历史
   * @param npcIds 参与对话的 NPC ID 列表
   * @returns 对话记录，如果不存在则返回 null
   */
  async getConversationHistory(npcIds: string[]): Promise<ConversationRecord | null> {
    try {
      const sanctuary = await this.getSanctuary();
      if (!sanctuary) {
        return null;
      }

      // 按 NPC ID 排序以匹配
      const sortedNpcIds = [...npcIds].sort();
      const conversation = sanctuary.conversationHistory.find(conv => {
        const sortedConvNpcIds = [...conv.npcIds].sort();
        return JSON.stringify(sortedConvNpcIds) === JSON.stringify(sortedNpcIds);
      });

      if (conversation) {
        console.log('[SanctuaryService] 找到对话历史:', conversation.id, '消息数:', conversation.messages.length);
      } else {
        console.log('[SanctuaryService] 未找到对话历史');
      }

      return conversation || null;
    } catch (error) {
      console.error('[SanctuaryService] 获取对话历史失败:', error);
      return null;
    }
  }

  /**
   * 退出归所，返回现实世界
   */
  async exitSanctuary(): Promise<void> {
    try {
      console.log('[SanctuaryService] 退出归所...');

      // 切换回现实世界世界书
      // 注意：API 配置会由 apiAutoSwitchService 根据 MVU 变量自动切换
      const { worldBookService } = await import('./worldBookService');
      await worldBookService.activateRealWorldEntries();
      console.log('[SanctuaryService] 已切换回现实世界世界书');

      toastr.success('已返回现实世界');
    } catch (error) {
      console.error('[SanctuaryService] 退出归所失败:', error);
      toastr.error('退出归所失败');
      throw error;
    }
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `sanctuary_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

// 导出单例
export const sanctuaryService = new SanctuaryService();
