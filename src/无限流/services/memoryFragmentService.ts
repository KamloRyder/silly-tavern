/**
 * 记忆碎片服务
 * 负责捕获、存储和管理 NPC 记忆事件
 */

import { klona } from 'klona';

/**
 * 记忆事件类型
 */
export type MemoryEventType = 'positive' | 'negative' | 'neutral';

/**
 * 记忆事件
 */
export interface MemoryEvent {
  id: string;
  description: string; // 事件描述
  type: MemoryEventType; // 事件类型
  timestamp: number; // 时间戳
  sourceInstance: string; // 来源副本 ID
  location?: string; // 发生地点
}

/**
 * NPC 记忆档案
 */
export interface NPCMemoryArchive {
  npcId: string;
  npcName: string;
  relationshipScore: number; // 关系分数（-100 到 100）
  memories: MemoryEvent[]; // 记忆事件列表
  lastInteraction: number; // 最后互动时间
}

/**
 * 记忆碎片服务类
 */
class MemoryFragmentService {
  private initialized = false;
  private listening = false;

  /**
   * 初始化服务
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[MemoryFragmentService] 服务已初始化');
      return;
    }

    console.log('[MemoryFragmentService] 初始化服务...');

    // 确保全局变量存在
    const archives = await this.getAllArchives();
    if (!archives) {
      await this.saveArchives([]);
    }

    this.initialized = true;
    console.log('[MemoryFragmentService] 服务初始化完成');
  }

  /**
   * 开始监听 AI 输出
   */
  startListening(): void {
    if (this.listening) {
      console.log('[MemoryFragmentService] 已在监听中');
      return;
    }

    console.log('[MemoryFragmentService] 开始监听 AI 输出...');

    eventOn(iframe_events.STREAM_TOKEN_RECEIVED_FULLY, async (fullText, _id) => {
      try {
        const aiOutput = fullText || '';
        await this.captureMemoryEvents(aiOutput);
      } catch (error) {
        console.error('[MemoryFragmentService] 捕获记忆事件失败:', error);
      }
    });

    this.listening = true;
    console.log('[MemoryFragmentService] 监听已启动');
  }

  /**
   * 从 AI 输出中捕获记忆事件
   * 标签格式：[memory_event type="positive" target="NPC_ID"]事件描述[/memory_event]
   */
  private async captureMemoryEvents(text: string): Promise<void> {
    const regex = /\[memory_event\s+type="(positive|negative|neutral)"\s+target="([^"]+)"\](.*?)\[\/memory_event\]/g;
    let match;
    let capturedCount = 0;

    while ((match = regex.exec(text)) !== null) {
      const [, type, npcId, description] = match;

      const event: MemoryEvent = {
        id: this.generateId(),
        description: description.trim(),
        type: type as MemoryEventType,
        timestamp: Date.now(),
        sourceInstance: await this.getCurrentInstanceId(),
      };

      await this.addMemoryToNPC(npcId, event);
      capturedCount++;
    }

    if (capturedCount > 0) {
      console.log(`[MemoryFragmentService] 捕获了 ${capturedCount} 个记忆事件`);
    }
  }

  /**
   * 添加记忆到 NPC 档案
   */
  async addMemoryToNPC(npcId: string, event: MemoryEvent): Promise<void> {
    const archives = await this.getAllArchives();
    let archive = archives.find(a => a.npcId === npcId);

    if (!archive) {
      // 创建新档案
      archive = {
        npcId,
        npcName: await this.getNPCName(npcId),
        relationshipScore: 0,
        memories: [],
        lastInteraction: Date.now(),
      };
      archives.push(archive);
    }

    // 添加记忆
    archive.memories.push(event);
    archive.lastInteraction = Date.now();

    // 更新关系分数
    if (event.type === 'positive') {
      archive.relationshipScore = Math.min(100, archive.relationshipScore + 5);
    } else if (event.type === 'negative') {
      archive.relationshipScore = Math.max(-100, archive.relationshipScore - 5);
    }

    await this.saveArchives(archives);

    console.log(
      `[MemoryFragmentService] 为 NPC ${archive.npcName} 添加了 ${event.type} 记忆，关系分数: ${archive.relationshipScore}`,
    );
  }

  /**
   * 获取所有记忆档案
   */
  async getAllArchives(): Promise<NPCMemoryArchive[]> {
    try {
      const allGlobalVars = getVariables({ type: 'global' });
      const data = allGlobalVars.npc_memory_archives;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('[MemoryFragmentService] 获取记忆档案失败:', error);
      return [];
    }
  }

  /**
   * 获取单个 NPC 的记忆档案
   */
  async getArchive(npcId: string): Promise<NPCMemoryArchive | null> {
    const archives = await this.getAllArchives();
    return archives.find(a => a.npcId === npcId) || null;
  }

  /**
   * 保存记忆档案
   */
  private async saveArchives(archives: NPCMemoryArchive[]): Promise<void> {
    try {
      // 使用 klona 去除 Vue Proxy 层
      const cleanArchives = klona(archives);
      await insertOrAssignVariables({ npc_memory_archives: cleanArchives }, { type: 'global' });
    } catch (error) {
      console.error('[MemoryFragmentService] 保存记忆档案失败:', error);
      throw error;
    }
  }

  /**
   * 获取当前副本 ID
   */
  private async getCurrentInstanceId(): Promise<string> {
    try {
      // 从游戏状态获取当前副本 ID
      const variables = getVariables({ type: 'global' });
      return variables.current_instance_id || 'unknown';
    } catch (error) {
      console.error('[MemoryFragmentService] 获取当前副本 ID 失败:', error);
      return 'unknown';
    }
  }

  /**
   * 获取 NPC 名称
   */
  private async getNPCName(npcId: string): Promise<string> {
    try {
      // 从副本数据中查找 NPC 名称
      const allGlobalVars = getVariables({ type: 'global' });
      const instances = allGlobalVars.instances || [];
      for (const instance of Array.isArray(instances) ? instances : []) {
        const npc = instance.characters?.find((c: any) => c.characterId === npcId);
        if (npc) {
          return npc.character?.name || npcId;
        }
      }
      return npcId;
    } catch (error) {
      console.error('[MemoryFragmentService] 获取 NPC 名称失败:', error);
      return npcId;
    }
  }

  /**
   * 为 NPC 互动注入记忆提示词
   */
  async injectMemoryPrompt(npcId: string): Promise<string> {
    const archive = await this.getArchive(npcId);
    if (!archive || archive.memories.length === 0) {
      return '';
    }

    // 按时间倒序，取最近的 5 条记忆
    const recentMemories = [...archive.memories].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);

    let prompt = `你记得你们之间的这些经历：\n`;
    for (const memory of recentMemories) {
      prompt += `- ${memory.description}\n`;
    }

    prompt += `\n当前关系状态：${this.getRelationshipDescription(archive.relationshipScore)}`;
    prompt += `\n请基于这些具体记忆做出真实、微妙的反应，而不是机械地提及好感度数字。`;

    return prompt;
  }

  /**
   * 根据关系分数描述关系状态
   */
  private getRelationshipDescription(score: number): string {
    if (score > 70) return '非常亲密';
    if (score > 40) return '友好';
    if (score > 10) return '熟悉';
    if (score > -10) return '普通';
    if (score > -40) return '疏远';
    if (score > -70) return '冷淡';
    return '敌对';
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `memory_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

// 导出单例
export const memoryFragmentService = new MemoryFragmentService();
