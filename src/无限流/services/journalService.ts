/**
 * 心象风景日志服务
 * 负责生成、保存和管理角色的内省式日志
 */

import { klona } from 'klona';
import { useInstanceStore } from '../stores/instanceStore';
import type { ImportantEvent } from '../types/instance';
import type { MemoryEvent } from './memoryFragmentService';
import { memoryFragmentService } from './memoryFragmentService';

/**
 * 日志条目
 */
export interface JournalEntry {
  id: string;
  authorId: string; // 主控角色 ID 或 NPC ID
  authorName: string;
  content: string; // 日志内容
  relatedEvents: string[]; // 相关事件 ID
  relatedMemories: string[]; // 相关记忆 ID
  createdAt: number;
  editedAt?: number;
}

/**
 * 心象风景日志服务类
 */
class JournalService {
  private initialized = false;

  /**
   * 初始化服务
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[Journal Service] 服务已初始化');
      return;
    }

    console.log('[Journal Service] 初始化服务...');

    // 确保全局变量存在
    const entries = await this.getAllJournals();
    if (!entries) {
      await this.saveAllJournals([]);
    }

    this.initialized = true;
    console.log('[Journal Service] 服务初始化完成');
  }

  /**
   * 生成日志草稿
   * @param authorId 作者 ID（主控角色或 NPC）
   * @param authorName 作者名称
   * @param isPlayerCharacter 是否为主控角色
   * @returns 生成的日志内容
   */
  async generateJournalDraft(authorId: string, authorName: string, isPlayerCharacter: boolean): Promise<string> {
    // 使用 withAPIContext 确保使用 sanctuary API（归所）
    // 日志生成等不触发 AI 对话的功能统一使用归所 API
    return await withAPIContext('sanctuary', async () => {
      try {
        console.log(`[Journal Service] 为 ${authorName} 生成日志草稿...`);

        // 获取相关事件
        const events = await this.getRelevantEvents(authorId, isPlayerCharacter);

        // 获取相关记忆
        const memories = await this.getRelevantMemories(authorId, isPlayerCharacter);

        // 构建提示词
        const prompt = this.buildJournalPrompt(authorName, events, memories, isPlayerCharacter);

        const requestParams: any = {
          ordered_prompts: [{ role: 'user', content: prompt }],
        };

        // 注意：不再使用 custom_api，让 withAPIContext 处理 API 切换
        console.log('[Journal Service] 使用归所 API 配置');

        // 使用 generateRaw 生成日志内容
        const journalContent = await generateRaw(requestParams);

        console.log(`[Journal Service] 日志草稿生成完成，长度: ${journalContent.length}`);
        return journalContent;
      } catch (error) {
        console.error('[Journal Service] 生成日志草稿失败:', error);
        throw error;
      }
    });
  }

  /**
   * 构建日志生成提示词
   */
  private buildJournalPrompt(
    authorName: string,
    events: ImportantEvent[],
    memories: MemoryEvent[],
    _isPlayerCharacter: boolean,
  ): string {
    let prompt = `你是 ${authorName}，请以第一人称写一篇内省式的日志。\n\n`;

    prompt += `**写作要求：**\n`;
    prompt += `1. 使用"留白"美学，通过场景描写和心象风景表达内心状态，避免直接定义情绪\n`;
    prompt += `2. 不要使用"我感到..."、"我觉得..."等直接表达情感的句式\n`;
    prompt += `3. 通过具体的意象、场景、感官细节来暗示内心世界\n`;
    prompt += `4. 保持简洁，字数控制在 200-500 字之间\n`;
    prompt += `5. 不要总结或解释情感，让读者自己体会\n\n`;

    // 添加相关事件
    if (events.length > 0) {
      prompt += `**最近经历的事件：**\n`;
      events.slice(0, 5).forEach((event, index) => {
        prompt += `${index + 1}. ${event.summary}\n`;
      });
      prompt += `\n`;
    }

    // 添加相关记忆
    if (memories.length > 0) {
      prompt += `**重要的记忆：**\n`;
      memories.slice(0, 5).forEach((memory, index) => {
        prompt += `${index + 1}. ${memory.description}\n`;
      });
      prompt += `\n`;
    }

    if (events.length === 0 && memories.length === 0) {
      prompt += `目前还没有特别的经历或记忆，请写一篇关于当下状态的日志。\n\n`;
    }

    prompt += `现在，请以 ${authorName} 的视角，写一篇内省式的日志：`;

    return prompt;
  }

  /**
   * 获取相关事件
   * @param authorId 作者 ID
   * @param isPlayerCharacter 是否为主控角色
   * @returns 相关事件列表
   */
  async getRelevantEvents(authorId: string, isPlayerCharacter: boolean): Promise<ImportantEvent[]> {
    try {
      const instanceStore = useInstanceStore();
      const allInstances = instanceStore.getAllInstances();

      if (isPlayerCharacter) {
        // 主控角色：获取所有副本的事件
        const allEvents: ImportantEvent[] = [];
        for (const instance of allInstances) {
          if (instance.events && instance.events.length > 0) {
            allEvents.push(...instance.events);
          }
        }
        // 按时间倒序排序
        return allEvents.sort((a, b) => b.timestamp - a.timestamp);
      } else {
        // NPC：仅获取该 NPC 所在副本的事件
        const npcInstances = allInstances.filter(instance =>
          instance.characters.some(char => char.characterId === authorId),
        );

        const npcEvents: ImportantEvent[] = [];
        for (const instance of npcInstances) {
          if (instance.events && instance.events.length > 0) {
            // 筛选出该 NPC 参与的事件
            const relevantEvents = instance.events.filter(
              event => event.involvedCharacters && event.involvedCharacters.includes(authorId),
            );
            npcEvents.push(...relevantEvents);
          }
        }

        // 按时间倒序排序
        return npcEvents.sort((a, b) => b.timestamp - a.timestamp);
      }
    } catch (error) {
      console.error('[Journal Service] 获取相关事件失败:', error);
      return [];
    }
  }

  /**
   * 获取相关记忆
   * @param authorId 作者 ID
   * @param isPlayerCharacter 是否为主控角色
   * @returns 相关记忆列表
   */
  async getRelevantMemories(authorId: string, isPlayerCharacter: boolean): Promise<MemoryEvent[]> {
    try {
      if (isPlayerCharacter) {
        // 主控角色：获取所有 NPC 的记忆
        const allArchives = await memoryFragmentService.getAllArchives();
        const allMemories: MemoryEvent[] = [];

        for (const archive of allArchives) {
          if (archive.memories && archive.memories.length > 0) {
            allMemories.push(...archive.memories);
          }
        }

        // 按时间倒序排序
        return allMemories.sort((a, b) => b.timestamp - a.timestamp);
      } else {
        // NPC：获取该 NPC 的记忆
        const archive = await memoryFragmentService.getArchive(authorId);
        if (archive && archive.memories) {
          // 按时间倒序排序
          return [...archive.memories].sort((a, b) => b.timestamp - a.timestamp);
        }
        return [];
      }
    } catch (error) {
      console.error('[Journal Service] 获取相关记忆失败:', error);
      return [];
    }
  }

  /**
   * 保存日志
   * @param entry 日志条目
   */
  async saveJournal(entry: JournalEntry): Promise<void> {
    try {
      const entries = await this.getAllJournals();
      entries.push(entry);
      await this.saveAllJournals(entries);
      console.log(`[Journal Service] 日志已保存: ${entry.authorName} - ${entry.id}`);
      toastr.success('日志已保存');
    } catch (error) {
      console.error('[Journal Service] 保存日志失败:', error);
      toastr.error('保存日志失败');
      throw error;
    }
  }

  /**
   * 更新日志
   * @param journalId 日志 ID
   * @param content 新内容
   */
  async updateJournal(journalId: string, content: string): Promise<void> {
    try {
      const entries = await this.getAllJournals();
      const entry = entries.find(e => e.id === journalId);

      if (!entry) {
        throw new Error(`日志不存在: ${journalId}`);
      }

      entry.content = content;
      entry.editedAt = Date.now();

      await this.saveAllJournals(entries);
      console.log(`[Journal Service] 日志已更新: ${journalId}`);
      toastr.success('日志已更新');
    } catch (error) {
      console.error('[Journal Service] 更新日志失败:', error);
      toastr.error('更新日志失败');
      throw error;
    }
  }

  /**
   * 删除日志
   * @param journalId 日志 ID
   */
  async deleteJournal(journalId: string): Promise<void> {
    try {
      const entries = await this.getAllJournals();
      const filteredEntries = entries.filter(e => e.id !== journalId);

      if (filteredEntries.length === entries.length) {
        throw new Error(`日志不存在: ${journalId}`);
      }

      await this.saveAllJournals(filteredEntries);
      console.log(`[Journal Service] 日志已删除: ${journalId}`);
      toastr.success('日志已删除');
    } catch (error) {
      console.error('[Journal Service] 删除日志失败:', error);
      toastr.error('删除日志失败');
      throw error;
    }
  }

  /**
   * 获取指定作者的所有日志
   * @param authorId 作者 ID
   * @returns 日志列表
   */
  async getJournalsByAuthor(authorId: string): Promise<JournalEntry[]> {
    try {
      const entries = await this.getAllJournals();
      return entries.filter(e => e.authorId === authorId).sort((a, b) => b.createdAt - a.createdAt); // 按创建时间倒序
    } catch (error) {
      console.error('[Journal Service] 获取作者日志失败:', error);
      return [];
    }
  }

  /**
   * 获取所有日志
   * @returns 所有日志列表
   */
  async getAllJournals(): Promise<JournalEntry[]> {
    try {
      const allVars = getVariables({ type: 'global' });
      const data = allVars.journal_entries;
      return data || [];
    } catch (error) {
      console.error('[Journal Service] 获取所有日志失败:', error);
      return [];
    }
  }

  /**
   * 保存所有日志
   * @param entries 日志列表
   */
  private async saveAllJournals(entries: JournalEntry[]): Promise<void> {
    try {
      // 使用 klona 去除 Vue Proxy 层
      const cleanEntries = klona(entries);
      await insertOrAssignVariables({ journal_entries: cleanEntries }, { type: 'global' });
    } catch (error) {
      console.error('[Journal Service] 保存所有日志失败:', error);
      throw error;
    }
  }

  /**
   * 生成唯一 ID
   */
  generateId(): string {
    return `journal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// 导出单例
export const journalService = new JournalService();
