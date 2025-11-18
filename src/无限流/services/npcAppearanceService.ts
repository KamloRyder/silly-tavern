// NPC 出场控制服务 - 管理 NPC 智能出场系统

import type { CharacterInInstance } from '../types/instance';

/**
 * NPC 出场控制服务类
 * 负责根据 NPC 重要程度智能控制出场频率
 */
class NPCAppearanceService {
  /**
   * 根据重要程度生成 NPC 出场提示词
   * @param npcs 副本中的 NPC 列表
   * @returns 格式化的提示词字符串
   */
  generateAppearancePrompt(npcs: CharacterInInstance[]): string {
    if (!npcs || npcs.length === 0) {
      return '';
    }

    // 按重要程度排序（从高到低）
    const sortedNPCs = [...npcs].sort((a, b) => {
      const importanceA = a.importance || (a.isImportant ? 3 : 2);
      const importanceB = b.importance || (b.isImportant ? 3 : 2);
      return importanceB - importanceA;
    });

    let prompt = '当前场景中的角色：\n';

    for (const npcData of sortedNPCs) {
      const importance = npcData.importance || (npcData.isImportant ? 3 : 2);
      const frequency = this.getFrequencyDescription(importance);
      const character = npcData.character;

      prompt += `- ${character.name}（${character.occupation || '未知职业'}）：${frequency}\n`;
      prompt += `  背景：${character.background || '无背景信息'}\n`;
    }

    prompt += '\n请根据角色的重要程度合理安排他们的出场和互动。重要程度越高的角色应该越频繁地出现并推动剧情发展。';

    return prompt;
  }

  /**
   * 根据重要程度获取频率描述
   * @param importance 重要程度（1-5）
   * @returns 频率描述文本
   */
  private getFrequencyDescription(importance: number): string {
    const descriptions: Record<number, string> = {
      1: '次要角色，仅在必要时出现',
      2: '普通角色，偶尔出现',
      3: '重要角色，经常出现',
      4: '核心角色，频繁出现并推动剧情',
      5: '主要角色，贯穿整个剧情',
    };

    return descriptions[importance] || descriptions[2];
  }

  /**
   * 根据重要程度决定是否让 NPC 出场
   * @param npcData NPC 数据
   * @param sceneContext 场景上下文（用于检测是否提到该 NPC）
   * @returns 是否应该出场
   */
  shouldNPCAppear(npcData: CharacterInInstance, sceneContext: string): boolean {
    const importance = npcData.importance || (npcData.isImportant ? 3 : 2);
    const character = npcData.character;

    // 基础概率：重要程度越高，出场概率越高
    // 1=15%, 2=30%, 3=45%, 4=60%, 5=75%
    const baseProbability = importance * 0.15;

    // 如果场景中提到了该 NPC，增加 30% 概率
    const mentionBonus = sceneContext.includes(character.name) ? 0.3 : 0;

    // 如果该 NPC 最近没出现，增加缺席加成
    const absenceBonus = this.calculateAbsenceBonus(npcData);

    // 计算总概率（最高 100%）
    const totalProbability = Math.min(1, baseProbability + mentionBonus + absenceBonus);

    // 随机判断是否出场
    return Math.random() < totalProbability;
  }

  /**
   * 计算缺席加成
   * 如果 NPC 出场次数低于预期，增加出场概率
   * @param npcData NPC 数据
   * @returns 缺席加成概率（0-0.2）
   */
  calculateAbsenceBonus(npcData: CharacterInInstance): number {
    const importance = npcData.importance || (npcData.isImportant ? 3 : 2);
    const appearanceCount = npcData.appearanceCount || 0;

    // 根据重要程度计算预期出场次数
    // 重要程度 1: 预期 5 次，2: 预期 10 次，3: 预期 15 次，4: 预期 20 次，5: 预期 25 次
    const expectedAppearances = importance * 5;

    // 如果实际出场次数低于预期的 50%，给予 20% 的加成
    if (appearanceCount < expectedAppearances * 0.5) {
      return 0.2;
    }

    // 如果实际出场次数低于预期的 75%，给予 10% 的加成
    if (appearanceCount < expectedAppearances * 0.75) {
      return 0.1;
    }

    return 0;
  }

  /**
   * 生成简化版的 NPC 出场提示词（仅包含名称和重要程度）
   * @param npcs NPC 列表
   * @returns 简化的提示词
   */
  generateSimpleAppearancePrompt(npcs: CharacterInInstance[]): string {
    if (!npcs || npcs.length === 0) {
      return '';
    }

    const sortedNPCs = [...npcs].sort((a, b) => {
      const importanceA = a.importance || (a.isImportant ? 3 : 2);
      const importanceB = b.importance || (b.isImportant ? 3 : 2);
      return importanceB - importanceA;
    });

    const npcList = sortedNPCs
      .map(npcData => {
        const importance = npcData.importance || (npcData.isImportant ? 3 : 2);
        const stars = '★'.repeat(importance);
        return `${npcData.character.name}(${stars})`;
      })
      .join('、');

    return `场景角色：${npcList}。请根据星级（★）合理安排出场频率。`;
  }
}

// 导出单例
export const npcAppearanceService = new NPCAppearanceService();
