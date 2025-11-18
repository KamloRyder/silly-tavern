// NPC 生成服务 - 使用 AI 生成 NPC 角色

import type { NPCCharacter } from '../types/character';
import { calculateDerivedStats, generateRandomAttributes } from '../utils/coc7Rules';

/**
 * NPC 生成服务
 */
class NPCGenerationService {
  /**
   * 随机生成 NPC
   * @param instanceType 副本类型（可选，用于生成符合主题的 NPC）
   */
  async generateRandom(instanceType?: string): Promise<NPCCharacter> {
    try {
      console.log('[NPC Generation Service] 开始随机生成 NPC...');

      // 构建 AI 生成提示
      let prompt = '请生成一个 NPC 角色，包含以下信息：\n\n';

      if (instanceType) {
        prompt += `副本类型：${instanceType}\n`;
        prompt += `请生成一个符合${instanceType}主题的 NPC。\n\n`;
      }

      prompt += `请按照以下 JSON 格式输出：
\`\`\`json
{
  "name": "角色姓名",
  "age": 年龄（数字）,
  "occupation": "职业",
  "background": "背景故事（100-200字）",
  "personality": "性格特点（50-100字）",
  "relationship": "与主控角色的关系（可选）"
}
\`\`\`

要求：
- 姓名要符合主题设定
- 年龄要合理
- 职业要有特色
- 背景故事要有深度
- 性格要鲜明`;

      // 使用 generate 生成 NPC 数据
      let response: string;
      try {
        response = await generate({
          user_input: prompt,
          should_stream: false,
        });
      } catch (error) {
        console.error('[NPC Generation Service] AI 服务调用失败:', error);
        throw new Error('AI 服务不可用，请检查网络连接或稍后重试');
      }

      // 解析 JSON 格式的 NPC 数据
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
      if (!jsonMatch) {
        console.error('[NPC Generation Service] AI 返回的数据格式错误:', response);
        throw new Error('AI 返回的数据格式错误，请重试');
      }

      let npcData: any;
      try {
        npcData = JSON.parse(jsonMatch[1]);
      } catch (error) {
        console.error('[NPC Generation Service] JSON 解析失败:', error);
        throw new Error('AI 返回的 JSON 格式无效，请重试');
      }

      // 验证必需字段
      if (!npcData.name || !npcData.occupation) {
        console.error('[NPC Generation Service] NPC 数据缺少必需字段:', npcData);
        throw new Error('AI 返回的 NPC 数据不完整，请重试');
      }

      // 使用角色创建系统完善NPC数据
      const npc = await this.enhanceWithCharacterSystem({
        name: npcData.name,
        age: npcData.age,
        occupation: npcData.occupation,
        background: npcData.background,
        personality: npcData.personality,
      });

      // 设置关系信息
      if (npcData.relationship) {
        npc.relationship = npcData.relationship;
      }

      console.log('[NPC Generation Service] NPC 生成成功:', npc.name);
      return npc;
    } catch (error) {
      console.error('[NPC Generation Service] 随机生成 NPC 失败:', error);
      // 重新抛出错误，保留原始错误信息
      throw error;
    }
  }

  /**
   * 根据用户输入生成自定义 NPC
   * @param customPrompt 用户输入的 NPC 描述
   * @param instanceType 副本类型（可选）
   */
  async generateCustom(customPrompt: string, instanceType?: string): Promise<NPCCharacter> {
    try {
      console.log('[NPC Generation Service] 开始生成自定义 NPC...');

      // 构建 AI 生成提示
      let prompt = `请根据以下描述生成一个 NPC 角色：\n\n${customPrompt}\n\n`;

      if (instanceType) {
        prompt += `副本类型：${instanceType}\n`;
      }

      prompt += `请按照以下 JSON 格式输出：
\`\`\`json
{
  "name": "角色姓名",
  "age": 年龄（数字）,
  "occupation": "职业",
  "background": "背景故事（100-200字）",
  "personality": "性格特点（50-100字）",
  "relationship": "与主控角色的关系（可选）"
}
\`\`\`

要求：
- 严格按照用户描述生成
- 补充合理的细节
- 背景故事要有深度
- 性格要鲜明`;

      // 使用 generate 生成 NPC 数据
      let response: string;
      try {
        response = await generate({
          user_input: prompt,
          should_stream: false,
        });
      } catch (error) {
        console.error('[NPC Generation Service] AI 服务调用失败:', error);
        throw new Error('AI 服务不可用，请检查网络连接或稍后重试');
      }

      // 解析 JSON 格式的 NPC 数据
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
      if (!jsonMatch) {
        console.error('[NPC Generation Service] AI 返回的数据格式错误:', response);
        throw new Error('AI 返回的数据格式错误，请重试');
      }

      let npcData: any;
      try {
        npcData = JSON.parse(jsonMatch[1]);
      } catch (error) {
        console.error('[NPC Generation Service] JSON 解析失败:', error);
        throw new Error('AI 返回的 JSON 格式无效，请重试');
      }

      // 验证必需字段
      if (!npcData.name || !npcData.occupation) {
        console.error('[NPC Generation Service] NPC 数据缺少必需字段:', npcData);
        throw new Error('AI 返回的 NPC 数据不完整，请重试');
      }

      // 使用角色创建系统完善NPC数据
      const npc = await this.enhanceWithCharacterSystem({
        name: npcData.name,
        age: npcData.age,
        occupation: npcData.occupation,
        background: npcData.background,
        personality: npcData.personality,
      });

      // 设置关系信息
      if (npcData.relationship) {
        npc.relationship = npcData.relationship;
      }

      console.log('[NPC Generation Service] 自定义 NPC 生成成功:', npc.name);
      return npc;
    } catch (error) {
      console.error('[NPC Generation Service] 生成自定义 NPC 失败:', error);
      // 重新抛出错误，保留原始错误信息
      throw error;
    }
  }

  /**
   * 根据已有NPC生成关联角色
   * @param instanceType 副本类型
   * @param relatedNPCs 已有的NPC列表
   * @returns 生成的关联NPC
   */
  async generateRelatedNPC(instanceType: string, relatedNPCs: NPCCharacter[]): Promise<NPCCharacter> {
    try {
      console.log('[NPC Generation Service] 开始生成关联NPC...');

      // 构建关联信息
      const relatedInfo = relatedNPCs
        .map(
          npc =>
            `- ${npc.name}（${npc.occupation || '未知职业'}）：${npc.background?.substring(0, 100) || '无背景信息'}`,
        )
        .join('\n');

      // 构建 AI 生成提示
      let prompt = `请生成一个与以下角色有关联的 NPC：\n\n${relatedInfo}\n\n`;
      prompt += `副本类型：${instanceType}\n\n`;
      prompt += `请生成一个与上述角色有关联的新 NPC（如同事、家人、朋友、敌人等），确保新角色与已有角色有合理的关系。\n\n`;
      prompt += `请按照以下 JSON 格式输出：
\`\`\`json
{
  "name": "角色姓名",
  "age": 年龄（数字）,
  "occupation": "职业",
  "background": "背景故事（100-200字，需要说明与已有角色的关系）",
  "personality": "性格特点（50-100字）",
  "relationship": "与已有角色的关系描述"
}
\`\`\`

要求：
- 新角色必须与已有角色有明确的关系
- 背景故事要体现这种关系
- 性格要与关系相符
- 符合${instanceType}主题`;

      // 使用 generate 生成 NPC 数据
      let response: string;
      try {
        response = await generate({
          user_input: prompt,
          should_stream: false,
        });
      } catch (error) {
        console.error('[NPC Generation Service] AI 服务调用失败:', error);
        throw new Error('AI 服务不可用，请检查网络连接或稍后重试');
      }

      // 解析 JSON 格式的 NPC 数据
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
      if (!jsonMatch) {
        console.error('[NPC Generation Service] AI 返回的数据格式错误:', response);
        throw new Error('AI 返回的数据格式错误，请重试');
      }

      let npcData: any;
      try {
        npcData = JSON.parse(jsonMatch[1]);
      } catch (error) {
        console.error('[NPC Generation Service] JSON 解析失败:', error);
        throw new Error('AI 返回的 JSON 格式无效，请重试');
      }

      // 验证必需字段
      if (!npcData.name || !npcData.occupation) {
        console.error('[NPC Generation Service] NPC 数据缺少必需字段:', npcData);
        throw new Error('AI 返回的 NPC 数据不完整，请重试');
      }

      // 使用角色创建系统完善NPC数据
      const npc = await this.enhanceWithCharacterSystem({
        name: npcData.name,
        age: npcData.age,
        occupation: npcData.occupation,
        background: npcData.background,
        personality: npcData.personality,
      });

      // 设置关系信息
      npc.relationship = npcData.relationship;

      console.log('[NPC Generation Service] 关联NPC生成成功:', npc.name);
      return npc;
    } catch (error) {
      console.error('[NPC Generation Service] 生成关联NPC失败:', error);
      // 重新抛出错误，保留原始错误信息
      throw error;
    }
  }

  /**
   * 使用角色创建系统完善NPC数据
   * @param basicInfo 基础信息（姓名、年龄、职业、背景）
   * @returns 完整的NPC数据
   */
  async enhanceWithCharacterSystem(basicInfo: {
    name: string;
    age?: number;
    occupation?: string;
    background?: string;
    personality?: string;
  }): Promise<NPCCharacter> {
    try {
      console.log('[NPC Generation Service] 使用角色创建系统完善NPC数据...');

      // 生成COC7属性
      const attributes = generateRandomAttributes();
      console.log('[NPC Generation Service] 生成的属性:', attributes);

      // 计算衍生属性
      const derivedStats = calculateDerivedStats(attributes);
      console.log('[NPC Generation Service] 计算的衍生属性:', derivedStats);

      // 生成技能（基于职业）
      const skills = await this.generateSkillsForOccupation(basicInfo.occupation);
      console.log('[NPC Generation Service] 生成的技能数量:', skills.size);

      // 构建完整的NPC对象
      const npc: NPCCharacter = {
        id: `npc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        type: 'npc',
        name: basicInfo.name,
        age: basicInfo.age,
        occupation: basicInfo.occupation,
        background: basicInfo.background,
        attributes,
        derivedStats,
        skills,
        bodyParts: this.generateDefaultBodyParts(),
        inventory: [],
        affection: 50, // 默认好感度
        isImportant: false,
        events: [],
      };

      console.log('[NPC Generation Service] NPC数据完善成功:', npc.name);
      return npc;
    } catch (error) {
      console.error('[NPC Generation Service] 完善NPC数据失败:', error);
      throw new Error('完善NPC数据失败');
    }
  }

  /**
   * 根据职业生成技能
   * @param occupation 职业名称
   * @returns 技能Map
   */
  private async generateSkillsForOccupation(occupation?: string): Promise<Map<string, number>> {
    const skills = new Map<string, number>();

    // 基础技能（所有角色都有）
    const baseSkills = [
      { name: '侦察', value: 25 },
      { name: '聆听', value: 25 },
      { name: '图书馆使用', value: 25 },
      { name: '母语', value: 80 },
      { name: '闪避', value: Math.floor(generateRandomAttributes().DEX / 2) },
    ];

    baseSkills.forEach(skill => {
      skills.set(skill.name, skill.value);
    });

    // 如果有职业，生成职业技能
    if (occupation) {
      try {
        const prompt = `请为职业"${occupation}"生成5-8个相关的COC7技能。

请按照以下JSON格式输出：
\`\`\`json
{
  "skills": [
    {"name": "技能名称", "value": 技能值（20-80之间的数字）}
  ]
}
\`\`\`

要求：
- 技能要符合职业特点
- 技能值要合理（一般在30-70之间）
- 不要重复基础技能（侦察、聆听、图书馆使用、母语、闪避）`;

        const response = await generate({
          user_input: prompt,
          should_stream: false,
        });

        const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          const skillData = JSON.parse(jsonMatch[1]);
          if (skillData.skills && Array.isArray(skillData.skills)) {
            skillData.skills.forEach((skill: { name: string; value: number }) => {
              if (!skills.has(skill.name)) {
                skills.set(skill.name, skill.value);
              }
            });
          }
        }
      } catch (error) {
        console.warn('[NPC Generation Service] 生成职业技能失败，使用默认技能:', error);
      }
    }

    return skills;
  }

  /**
   * 生成默认的肢体部位
   */
  private generateDefaultBodyParts(): import('../types/character').BodyPartStatus[] {
    return [
      {
        id: 'head',
        name: '头部',
        damage: 0,
        debuffs: [],
      },
      {
        id: 'torso',
        name: '躯干',
        damage: 0,
        debuffs: [],
      },
      {
        id: 'left_arm',
        name: '左臂',
        damage: 0,
        debuffs: [],
      },
      {
        id: 'right_arm',
        name: '右臂',
        damage: 0,
        debuffs: [],
      },
      {
        id: 'left_leg',
        name: '左腿',
        damage: 0,
        debuffs: [],
      },
      {
        id: 'right_leg',
        name: '右腿',
        damage: 0,
        debuffs: [],
      },
    ];
  }
}

// 导出单例
export const npcGenerationService = new NPCGenerationService();
