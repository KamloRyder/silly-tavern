// 战斗相关的 TypeScript 接口定义

import type { Character } from './character';

/**
 * 战斗状态
 */
export type CombatStatus = 'active' | 'victory' | 'defeat' | 'escaped';

/**
 * 攻击类型
 */
export type AttackType = 'melee' | 'ranged' | 'magic' | 'special';

/**
 * 投骰结果等级
 */
export type RollResult =
  | 'critical_success' // 大成功
  | 'extreme_success' // 极难成功
  | 'hard_success' // 困难成功
  | 'success' // 成功
  | 'failure' // 失败
  | 'critical_failure'; // 大失败

/**
 * 投骰数据
 */
export interface DiceRoll {
  roll: number; // 投骰结果 (1-100)
  skill: number; // 技能值
  result: RollResult; // 结果等级
  skillName?: string; // 技能名称
  timestamp: number; // 投骰时间戳
}

/**
 * 战斗行动
 */
export interface CombatAction {
  type: 'attack' | 'dodge' | 'escape' | 'special';
  actorId: string; // 行动者 ID
  targetId?: string; // 目标 ID
  attackType?: AttackType;
  skillUsed?: string; // 使用的技能
  roll?: DiceRoll; // 投骰数据
  damage?: number; // 造成的伤害
  bodyPartHit?: string; // 命中的肢体部位
  description?: string; // 行动描述
}

/**
 * 战斗回合
 */
export interface CombatRound {
  roundNumber: number;
  actions: CombatAction[];
  timestamp: number;
}

/**
 * 敌人数据
 */
export interface Enemy {
  id: string;
  name: string;
  description?: string;
  attributes: import('./character').COC7Attributes;
  derivedStats: import('./character').DerivedStats;
  skills: Map<string, number>;
  bodyParts: import('./character').BodyPartStatus[];
  portrait?: string; // 敌人图片 URL
  attackPattern?: string; // 攻击模式描述
  loot?: import('./character').Item[]; // 战利品
}

/**
 * 战斗参与者
 */
export interface CombatParticipant {
  id: string;
  character?: Character;
  enemy?: Enemy;
  isPlayer: boolean;
  currentHP: number;
  currentMP: number;
  currentSAN: number;
  statusEffects: StatusEffect[];
  initiative: number; // 先攻值
}

/**
 * 状态效果
 */
export interface StatusEffect {
  id: string;
  name: string;
  type: 'buff' | 'debuff';
  description: string;
  duration: number; // 持续回合数，-1 表示永久
  effect: {
    attribute?: keyof import('./character').COC7Attributes;
    modifier?: number; // 属性修正值
    damagePerRound?: number; // 每回合伤害
  };
}

/**
 * 战斗结果
 */
export interface CombatResult {
  status: CombatStatus;
  rounds: CombatRound[];
  winner?: string; // 胜利者 ID
  loser?: string; // 失败者 ID
  rewards?: {
    experience?: number;
    items?: import('./character').Item[];
    gold?: number;
  };
  casualties?: {
    characterId: string;
    injuries: string[]; // 受伤描述
  }[];
  endTime: number;
}

/**
 * 战斗状态数据
 */
export interface CombatState {
  id: string;
  participants: CombatParticipant[];
  currentRound: number;
  currentTurn: number; // 当前回合中的行动顺序
  status: CombatStatus;
  rounds: CombatRound[];
  startTime: number;
  environment?: string; // 战斗环境描述
}

/**
 * 逃跑检定结果
 */
export interface EscapeAttempt {
  success: boolean;
  roll: DiceRoll;
  consequence?: string; // 逃跑失败的后果
}
