// 角色相关的 TypeScript 接口定义

/**
 * COC7 规则的八项基础属性
 */
export interface COC7Attributes {
  STR: number; // 力量 (Strength)
  CON: number; // 体质 (Constitution)
  SIZ: number; // 体型 (Size)
  DEX: number; // 敏捷 (Dexterity)
  APP: number; // 外貌 (Appearance)
  INT: number; // 智力 (Intelligence)
  POW: number; // 意志 (Power)
  EDU: number; // 教育 (Education)
  LUK: number; // 幸运 (Luck)
}

/**
 * COC7 衍生属性
 */
export interface DerivedStats {
  HP: number; // 生命值 (Hit Points)
  maxHP: number; // 最大生命值
  MP: number; // 魔法值 (Magic Points)
  maxMP: number; // 最大魔法值
  SAN: number; // 理智值 (Sanity)
  maxSAN: number; // 最大理智值
  MOV: number; // 移动力 (Movement)
  DB: string; // 伤害加值 (Damage Bonus)
  BUILD: number; // 体格 (Build)
}

/**
 * 肢体部位 Debuff
 */
export interface BodyPartDebuff {
  type: string; // debuff 类型，如 "无法弯曲"、"敏感度+50%"
  value: number; // debuff 数值
  description?: string; // 描述
}

/**
 * 肢体部位状态
 */
export interface BodyPartStatus {
  id: string; // 部位唯一标识
  name: string; // 部位名称
  parent?: string; // 父级部位 ID（用于层级结构）
  damage: number; // 损伤程度 (0-100%)
  debuffs: BodyPartDebuff[]; // 该部位的 debuff 列表
  children?: BodyPartStatus[]; // 子部位（如头部包含眼睛、嘴巴等）
}

/**
 * 技能数据
 */
export interface Skill {
  name: string; // 技能名称
  value: number; // 技能值 (0-100)
  isOccupational?: boolean; // 是否为职业技能
}

/**
 * 物品数据
 */
export interface Item {
  id: string;
  name: string;
  description: string;
  quantity: number;
  type?: string; // 物品类型，如 "武器"、"道具"
}

/**
 * 基础角色数据
 */
export interface BaseCharacter {
  id: string;
  name: string;
  age?: number;
  occupation?: string; // 职业
  background?: string; // 背景故事
  attributes: COC7Attributes;
  derivedStats: DerivedStats;
  skills: Map<string, number>; // 技能名 -> 技能值
  bodyParts: BodyPartStatus[]; // 肢体状态
  inventory: Item[]; // 物品栏
  portrait?: string; // 立绘 URL
}

/**
 * 主控角色（玩家角色）
 */
export interface PlayerCharacter extends BaseCharacter {
  type: 'player';
}

/**
 * NPC 角色
 */
export interface NPCCharacter extends BaseCharacter {
  type: 'npc';
  affection: number; // 好感度 (0-100)
  isImportant: boolean; // 是否为重要 NPC
  events: string[]; // 该 NPC 的重要事件记录
  relationship?: string; // 与主控角色的关系
}

/**
 * 通用角色类型（可以是主控或 NPC）
 */
export type Character = PlayerCharacter | NPCCharacter;

/**
 * 角色创建数据（用于车卡）
 */
export interface CharacterCreationData {
  name: string;
  age?: number;
  occupation?: string;
  background?: string;
  attributes: COC7Attributes;
  selectedSkills?: { name: string; value: number }[];
}

/**
 * 角色状态更新数据
 */
export interface CharacterStatusUpdate {
  attributes?: Partial<COC7Attributes>;
  derivedStats?: Partial<DerivedStats>;
  bodyParts?: BodyPartStatus[];
  affection?: number;
}

/**
 * 立绘数据
 */
export interface SpriteData {
  characterId: string;
  url: string;
  position: 'left' | 'center' | 'right' | 'custom';
  x?: number; // 自定义位置 x 坐标
  y?: number; // 自定义位置 y 坐标
  scale?: number; // 缩放比例
  opacity?: number; // 透明度
}
