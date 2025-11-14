// COC7 规则工具函数

import type { COC7Attributes, DerivedStats } from '../types/character';
import type { DiceRoll, RollResult } from '../types/combat';

/**
 * 投骰 1d100
 */
export function rollDice(): number {
  return Math.floor(Math.random() * 100) + 1;
}

/**
 * 评估投骰结果
 * @param roll 投骰结果 (1-100)
 * @param skill 技能值 (0-100)
 * @returns 投骰结果等级
 */
export function evaluateRoll(roll: number, skill: number): RollResult {
  // 大成功：投出 1
  if (roll === 1) {
    return 'critical_success';
  }

  // 大失败：投出 100，或投出 96-99 且技能值小于 50
  if (roll === 100 || (roll >= 96 && skill < 50)) {
    return 'critical_failure';
  }

  // 极难成功：投骰结果 ≤ 技能值/5
  if (roll <= skill / 5) {
    return 'extreme_success';
  }

  // 困难成功：投骰结果 ≤ 技能值/2
  if (roll <= skill / 2) {
    return 'hard_success';
  }

  // 成功：投骰结果 ≤ 技能值
  if (roll <= skill) {
    return 'success';
  }

  // 失败
  return 'failure';
}

/**
 * 执行技能检定
 * @param skillName 技能名称
 * @param skillValue 技能值
 * @returns 投骰数据
 */
export function performSkillCheck(skillName: string, skillValue: number): DiceRoll {
  const roll = rollDice();
  const result = evaluateRoll(roll, skillValue);

  return {
    roll,
    skill: skillValue,
    result,
    skillName,
    timestamp: Date.now(),
  };
}

/**
 * 计算移动力 (MOV)
 * @param attributes COC7 属性
 * @returns 移动力
 */
export function calculateMovement(attributes: COC7Attributes): number {
  const { STR, DEX, SIZ } = attributes;

  // 如果 STR 和 DEX 都小于 SIZ
  if (STR < SIZ && DEX < SIZ) {
    return 7;
  }

  // 如果 STR 或 DEX 大于等于 SIZ，但都小于 2×SIZ
  if ((STR >= SIZ || DEX >= SIZ) && STR < 2 * SIZ && DEX < 2 * SIZ) {
    return 8;
  }

  // 如果 STR 和 DEX 都大于等于 2×SIZ
  if (STR >= 2 * SIZ && DEX >= 2 * SIZ) {
    return 9;
  }

  return 8; // 默认值
}

/**
 * 计算伤害加值 (DB) 和体格 (BUILD)
 * @param attributes COC7 属性
 * @returns { DB, BUILD }
 */
export function calculateDamageBonus(attributes: COC7Attributes): { DB: string; BUILD: number } {
  const sum = attributes.STR + attributes.SIZ;

  if (sum <= 64) {
    return { DB: '-2', BUILD: -2 };
  } else if (sum <= 84) {
    return { DB: '-1', BUILD: -1 };
  } else if (sum <= 124) {
    return { DB: '0', BUILD: 0 };
  } else if (sum <= 164) {
    return { DB: '+1d4', BUILD: 1 };
  } else if (sum <= 204) {
    return { DB: '+1d6', BUILD: 2 };
  } else if (sum <= 284) {
    return { DB: '+2d6', BUILD: 3 };
  } else if (sum <= 364) {
    return { DB: '+3d6', BUILD: 4 };
  } else if (sum <= 444) {
    return { DB: '+4d6', BUILD: 5 };
  } else {
    return { DB: '+5d6', BUILD: 6 };
  }
}

/**
 * 计算衍生属性
 * @param attributes COC7 基础属性
 * @returns 衍生属性
 */
export function calculateDerivedStats(attributes: COC7Attributes): DerivedStats {
  const { CON, SIZ, POW } = attributes;

  // 生命值 HP = (CON + SIZ) / 10，向下取整
  const maxHP = Math.floor((CON + SIZ) / 10);

  // 魔法值 MP = POW / 5，向下取整
  const maxMP = Math.floor(POW / 5);

  // 理智值 SAN = POW
  const maxSAN = POW;

  // 移动力 MOV
  const MOV = calculateMovement(attributes);

  // 伤害加值 DB 和体格 BUILD
  const { DB, BUILD } = calculateDamageBonus(attributes);

  return {
    HP: maxHP,
    maxHP,
    MP: maxMP,
    maxMP,
    SAN: maxSAN,
    maxSAN,
    MOV,
    DB,
    BUILD,
  };
}

/**
 * 随机生成 COC7 属性
 * @param method 生成方法：'3d6x5' 或 '2d6+6x5'
 * @returns COC7 属性
 */
export function generateRandomAttributes(method: '3d6x5' | '2d6+6x5' = '3d6x5'): COC7Attributes {
  const rollAttribute = (): number => {
    if (method === '3d6x5') {
      // 3d6 × 5
      const roll =
        Math.floor(Math.random() * 6) + 1 + (Math.floor(Math.random() * 6) + 1) + (Math.floor(Math.random() * 6) + 1);
      return roll * 5;
    } else {
      // (2d6 + 6) × 5
      const roll = Math.floor(Math.random() * 6) + 1 + (Math.floor(Math.random() * 6) + 1) + 6;
      return roll * 5;
    }
  };

  return {
    STR: rollAttribute(),
    CON: rollAttribute(),
    SIZ: rollAttribute(),
    DEX: rollAttribute(),
    APP: rollAttribute(),
    INT: rollAttribute(),
    POW: rollAttribute(),
    EDU: rollAttribute(),
    LUK: rollAttribute(),
  };
}

/**
 * 计算对抗检定结果
 * @param attacker 攻击者技能值
 * @param defender 防御者技能值
 * @returns 对抗结果：'attacker_wins' | 'defender_wins' | 'tie'
 */
export function resolveOpposedRoll(
  attacker: number,
  defender: number,
): { result: 'attacker_wins' | 'defender_wins' | 'tie'; attackerRoll: DiceRoll; defenderRoll: DiceRoll } {
  const attackerRoll = performSkillCheck('攻击', attacker);
  const defenderRoll = performSkillCheck('防御', defender);

  // 成功等级权重
  const successLevels: Record<RollResult, number> = {
    critical_success: 5,
    extreme_success: 4,
    hard_success: 3,
    success: 2,
    failure: 1,
    critical_failure: 0,
  };

  const attackerLevel = successLevels[attackerRoll.result];
  const defenderLevel = successLevels[defenderRoll.result];

  let result: 'attacker_wins' | 'defender_wins' | 'tie';
  if (attackerLevel > defenderLevel) {
    result = 'attacker_wins';
  } else if (defenderLevel > attackerLevel) {
    result = 'defender_wins';
  } else {
    result = 'tie';
  }

  return { result, attackerRoll, defenderRoll };
}

/**
 * 计算伤害（考虑护甲）
 * @param baseDamage 基础伤害
 * @param armor 护甲值
 * @returns 实际伤害
 */
export function calculateDamage(baseDamage: number, armor: number = 0): number {
  const damage = Math.max(0, baseDamage - armor);
  return damage;
}

/**
 * 判断是否陷入疯狂
 * @param currentSAN 当前理智值
 * @param sanLoss 理智损失
 * @returns 是否陷入疯狂
 */
export function checkInsanity(
  currentSAN: number,
  sanLoss: number,
): {
  isInsane: boolean;
  type?: 'temporary' | 'indefinite' | 'permanent';
} {
  const newSAN = currentSAN - sanLoss;

  // 一次性损失 5+ 理智：临时疯狂
  if (sanLoss >= 5) {
    return { isInsane: true, type: 'temporary' };
  }

  // 理智值降至 0：永久疯狂
  if (newSAN <= 0) {
    return { isInsane: true, type: 'permanent' };
  }

  // 理智值低于 POW 的 1/5：不定疯狂
  // 注意：这里需要传入 POW 值，暂时简化处理
  if (newSAN < 20) {
    return { isInsane: true, type: 'indefinite' };
  }

  return { isInsane: false };
}

/**
 * 获取投骰结果的中文描述
 * @param result 投骰结果
 * @returns 中文描述
 */
export function getRollResultText(result: RollResult): string {
  const texts: Record<RollResult, string> = {
    critical_success: '大成功',
    extreme_success: '极难成功',
    hard_success: '困难成功',
    success: '成功',
    failure: '失败',
    critical_failure: '大失败',
  };
  return texts[result];
}
