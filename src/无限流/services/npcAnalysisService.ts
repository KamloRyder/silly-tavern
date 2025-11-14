// NPC 分析服务 - 根据剧情描写分析 NPC 信息并生成 COC7 属性

import type { COC7Attributes, DerivedStats } from '../types/character';

/**
 * NPC 生成结果
 */
export interface NPCGenerationResult {
  attributes: COC7Attributes; // 生成的属性
  derivedStats: DerivedStats; // 衍生属性
  occupation: string; // 职业
  age: number; // 年龄
  background: string; // 背景信息
  skills: Map<string, number>; // 生成的技能
  relationship?: string; // 与主控角色的关系
}

/**
 * NPC 分析服务类
 */
class NPCAnalysisService {
  /**
   * 根据描写推断年龄
   */
  private inferAge(text: string, characterName: string): number | undefined {
    // 检查明确的年龄描述
    const agePattern = new RegExp(`${characterName}.*?(\\d+)岁`);
    const ageMatch = text.match(agePattern);
    if (ageMatch) {
      return parseInt(ageMatch[1]);
    }

    // 根据年龄段关键词推断
    const ageKeywords: Record<string, number> = {
      幼儿: 5,
      儿童: 10,
      少年: 15,
      少女: 16,
      青年: 25,
      中年: 45,
      老年: 65,
      老人: 70,
      小孩: 10,
      孩子: 12,
    };

    for (const [keyword, age] of Object.entries(ageKeywords)) {
      const pattern = new RegExp(`${keyword}.*?${characterName}|${characterName}.*?${keyword}`);
      if (pattern.test(text)) {
        return age;
      }
    }

    return undefined;
  }

  /**
   * 根据描写推断职业
   */
  private inferOccupation(text: string, characterName: string): string | undefined {
    const occupations = [
      '医生',
      '护士',
      '教师',
      '学生',
      '警察',
      '军人',
      '商人',
      '工人',
      '农民',
      '记者',
      '作家',
      '艺术家',
      '科学家',
      '工程师',
      '律师',
      '法官',
      '侦探',
      '间谍',
      '杀手',
      '盗贼',
      '僧侣',
      '道士',
      '巫师',
      '猎人',
      '渔夫',
      '厨师',
      '服务员',
      '司机',
      '飞行员',
      '船长',
    ];

    for (const occupation of occupations) {
      const pattern = new RegExp(`${characterName}.*?${occupation}|${occupation}.*?${characterName}`);
      if (pattern.test(text)) {
        return occupation;
      }
    }

    return undefined;
  }

  /**
   * 根据描写推断属性值
   * 使用COC7规则：属性范围通常是15-90，平均值50
   */
  private inferAttributes(text: string, characterName: string, age?: number): COC7Attributes {
    const attributes: COC7Attributes = {
      STR: 50, // 力量
      CON: 50, // 体质
      SIZ: 50, // 体型
      DEX: 50, // 敏捷
      APP: 50, // 外貌
      INT: 50, // 智力
      POW: 50, // 意志
      EDU: 50, // 教育
      LUK: 50, // 幸运
    };

    // 力量相关关键词
    const strKeywords = {
      high: ['强壮', '有力', '魁梧', '健壮', '肌肉', '力大', '孔武'],
      low: ['瘦弱', '虚弱', '无力', '纤细', '柔弱'],
    };

    // 体质相关关键词
    const conKeywords = {
      high: ['健康', '强健', '结实', '精力充沛', '体格好'],
      low: ['虚弱', '病弱', '苍白', '憔悴', '体弱'],
    };

    // 体型相关关键词
    const sizKeywords = {
      high: ['高大', '魁梧', '壮硕', '肥胖', '巨大'],
      low: ['瘦小', '矮小', '娇小', '纤细', '苗条'],
    };

    // 敏捷相关关键词
    const dexKeywords = {
      high: ['敏捷', '灵活', '迅速', '快速', '身手矫健', '动作敏捷'],
      low: ['笨拙', '迟缓', '缓慢', '行动不便'],
    };

    // 外貌相关关键词
    const appKeywords = {
      high: ['英俊', '美丽', '漂亮', '俊美', '清秀', '俏丽', '帅气', '迷人'],
      low: ['丑陋', '难看', '相貌平平', '其貌不扬'],
    };

    // 智力相关关键词
    const intKeywords = {
      high: ['聪明', '智慧', '机智', '睿智', '博学', '精明'],
      low: ['愚笨', '迟钝', '愚蠢', '呆滞'],
    };

    // 意志相关关键词
    const powKeywords = {
      high: ['坚定', '果断', '意志坚强', '冷静', '镇定', '沉着'],
      low: ['软弱', '胆小', '懦弱', '犹豫', '慌张'],
    };

    // 教育相关关键词
    const eduKeywords = {
      high: ['博学', '学识渊博', '知识丰富', '教授', '学者', '专家'],
      low: ['无知', '文盲', '没文化'],
    };

    // 检查并调整属性
    const checkAndAdjust = (attr: keyof COC7Attributes, keywords: { high: string[]; low: string[] }) => {
      const pattern = new RegExp(`${characterName}.*?|.*?${characterName}`);
      const relevantText = text.match(pattern)?.[0] || text;

      for (const keyword of keywords.high) {
        if (relevantText.includes(keyword)) {
          attributes[attr] = Math.min(90, attributes[attr] + 20);
          break;
        }
      }

      for (const keyword of keywords.low) {
        if (relevantText.includes(keyword)) {
          attributes[attr] = Math.max(15, attributes[attr] - 20);
          break;
        }
      }
    };

    checkAndAdjust('STR', strKeywords);
    checkAndAdjust('CON', conKeywords);
    checkAndAdjust('SIZ', sizKeywords);
    checkAndAdjust('DEX', dexKeywords);
    checkAndAdjust('APP', appKeywords);
    checkAndAdjust('INT', intKeywords);
    checkAndAdjust('POW', powKeywords);
    checkAndAdjust('EDU', eduKeywords);

    // 根据年龄调整属性
    if (age !== undefined) {
      if (age < 15) {
        // 儿童：力量、体型、教育较低
        attributes.STR = Math.max(15, attributes.STR - 20);
        attributes.SIZ = Math.max(15, attributes.SIZ - 20);
        attributes.EDU = Math.max(15, attributes.EDU - 30);
      } else if (age >= 60) {
        // 老年：力量、敏捷、体质下降，教育可能较高
        attributes.STR = Math.max(15, attributes.STR - 15);
        attributes.DEX = Math.max(15, attributes.DEX - 15);
        attributes.CON = Math.max(15, attributes.CON - 10);
        attributes.EDU = Math.min(90, attributes.EDU + 10);
      }
    }

    // 幸运值随机生成（40-60之间）
    attributes.LUK = 40 + Math.floor(Math.random() * 21);

    return attributes;
  }

  /**
   * 计算衍生属性
   */
  private calculateDerivedStats(attributes: COC7Attributes): DerivedStats {
    // HP = (CON + SIZ) / 10
    const maxHP = Math.floor((attributes.CON + attributes.SIZ) / 10);

    // MP = POW / 5
    const maxMP = Math.floor(attributes.POW / 5);

    // SAN = POW
    const maxSAN = 99;
    const SAN = attributes.POW;

    // MOV (移动力)
    let MOV = 8;
    if (attributes.DEX < attributes.SIZ && attributes.STR < attributes.SIZ) {
      MOV = 7;
    } else if (attributes.DEX >= attributes.SIZ && attributes.STR >= attributes.SIZ) {
      MOV = 9;
    }

    // DB (伤害加值) 和 BUILD (体格)
    const sum = attributes.STR + attributes.SIZ;
    let DB = '0';
    let BUILD = 0;

    if (sum <= 64) {
      DB = '-2';
      BUILD = -2;
    } else if (sum <= 84) {
      DB = '-1';
      BUILD = -1;
    } else if (sum <= 124) {
      DB = '0';
      BUILD = 0;
    } else if (sum <= 164) {
      DB = '+1d4';
      BUILD = 1;
    } else if (sum <= 204) {
      DB = '+1d6';
      BUILD = 2;
    } else {
      DB = '+2d6';
      BUILD = 3;
    }

    return {
      HP: maxHP,
      maxHP,
      MP: maxMP,
      maxMP,
      SAN,
      maxSAN,
      MOV,
      DB,
      BUILD,
    };
  }

  /**
   * 根据职业生成技能
   */
  private generateSkillsByOccupation(occupation?: string, attributes?: COC7Attributes): Map<string, number> {
    const skills = new Map<string, number>();

    // 基础技能（所有角色都有）
    const baseSkills = ['闪避', '母语', '聆听', '侦察', '说服', '心理学', '图书馆使用', '急救'];

    // 为基础技能分配初始值
    baseSkills.forEach(skill => {
      let value = 20; // 默认基础值

      // 根据属性调整技能值
      if (attributes) {
        if (skill === '闪避' && attributes.DEX) {
          value = Math.floor(attributes.DEX / 2);
        } else if (skill === '母语' && attributes.EDU) {
          value = attributes.EDU;
        } else if (skill === '聆听' && attributes.INT) {
          value = 20 + Math.floor((attributes.INT - 50) / 5);
        } else if (skill === '侦察' && attributes.INT) {
          value = 25 + Math.floor((attributes.INT - 50) / 5);
        }
      }

      skills.set(skill, Math.max(1, Math.min(99, value)));
    });

    // 根据职业添加专业技能
    if (occupation) {
      const occupationSkills = this.getOccupationSkills(occupation);
      occupationSkills.forEach(skill => {
        // 职业技能值较高（40-70）
        const value = 40 + Math.floor(Math.random() * 31);
        skills.set(skill, value);
      });
    }

    return skills;
  }

  /**
   * 获取职业对应的技能列表
   */
  private getOccupationSkills(occupation: string): string[] {
    const occupationSkillsMap: Record<string, string[]> = {
      医生: ['医学', '急救', '生物学', '心理学', '说服', '科学（药学）'],
      护士: ['急救', '医学', '心理学', '说服', '聆听'],
      教师: ['教育学', '心理学', '说服', '图书馆使用', '母语'],
      学生: ['图书馆使用', '母语', '聆听', '侦察'],
      警察: ['射击', '格斗', '法律', '侦察', '聆听', '追踪'],
      军人: ['射击', '格斗', '生存', '急救', '驾驶'],
      商人: ['说服', '心理学', '会计', '估价', '谈判'],
      记者: ['说服', '心理学', '摄影', '图书馆使用', '聆听'],
      侦探: ['侦察', '聆听', '追踪', '心理学', '法律', '图书馆使用'],
      科学家: ['科学', '图书馆使用', '母语', '计算机使用'],
      工程师: ['机械维修', '电气维修', '计算机使用', '科学'],
      律师: ['法律', '说服', '心理学', '图书馆使用', '母语'],
      艺术家: ['艺术', '历史', '心理学', '说服'],
      作家: ['母语', '图书馆使用', '心理学', '历史'],
      厨师: ['烹饪', '化学', '生物学'],
      司机: ['驾驶', '机械维修', '导航'],
      猎人: ['射击', '追踪', '生存', '聆听', '侦察', '潜行'],
    };

    return occupationSkillsMap[occupation] || ['说服', '心理学', '聆听'];
  }

  /**
   * 推断角色关系
   */
  private inferRelationship(text: string, characterName: string): string | undefined {
    const relationshipKeywords: Record<string, string> = {
      朋友: '朋友',
      好友: '好友',
      同事: '同事',
      同学: '同学',
      老师: '老师',
      学生: '学生',
      上司: '上司',
      下属: '下属',
      敌人: '敌人',
      对手: '对手',
      陌生人: '陌生人',
      家人: '家人',
      亲人: '亲人',
      父亲: '父亲',
      母亲: '母亲',
      兄弟: '兄弟',
      姐妹: '姐妹',
    };

    for (const [keyword, relationship] of Object.entries(relationshipKeywords)) {
      const pattern = new RegExp(`${characterName}.*?${keyword}|${keyword}.*?${characterName}`);
      if (pattern.test(text)) {
        return relationship;
      }
    }

    return undefined;
  }

  /**
   * 生成完整的NPC（包括所有信息）
   * @param text 包含该NPC的文本段落
   * @param characterName NPC名字
   * @returns 完整的NPC生成结果
   */
  generateNPC(text: string, characterName: string): NPCGenerationResult {
    // 1. 推断基本信息
    const age = this.inferAge(text, characterName) || 25 + Math.floor(Math.random() * 30); // 默认25-55岁
    const occupation = this.inferOccupation(text, characterName) || '普通人';

    // 2. 推断属性
    const attributes = this.inferAttributes(text, characterName, age);

    // 3. 计算衍生属性
    const derivedStats = this.calculateDerivedStats(attributes);

    // 4. 生成技能
    const skills = this.generateSkillsByOccupation(occupation, attributes);

    // 5. 推断关系
    const relationship = this.inferRelationship(text, characterName);

    // 6. 生成背景信息
    let background = `${characterName}，年龄${age}岁，职业是${occupation}`;
    if (relationship) background += `，与主角的关系是${relationship}`;
    background += '。';

    return {
      attributes,
      derivedStats,
      occupation,
      age,
      background,
      skills,
      relationship,
    };
  }
}

// 导出单例
export const npcAnalysisService = new NPCAnalysisService();
