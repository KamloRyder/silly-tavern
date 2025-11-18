// COC7 规则服务 - 封装 COC7 规则逻辑

import type { Character, COC7Attributes, DerivedStats } from '../types/character';
import type {
  CombatAction,
  CombatParticipant,
  CombatResult,
  CombatRound,
  DiceRoll,
  Enemy,
  EscapeAttempt,
  RollResult,
} from '../types/combat';
import * as coc7Rules from '../utils/coc7Rules';

/**
 * COC7 规则服务类
 * 封装 COC7 规则的业务逻辑，包括投骰、战斗、属性计算等
 */
class COC7Service {
  // ==================== 投骰相关 ====================

  /**
   * 投骰 1d100
   */
  rollDice(): number {
    return coc7Rules.rollDice();
  }

  /**
   * 评估投骰结果
   * @param roll 投骰结果 (1-100)
   * @param skill 技能值 (0-100)
   */
  evaluateRoll(roll: number, skill: number): RollResult {
    return coc7Rules.evaluateRoll(roll, skill);
  }

  /**
   * 执行技能检定
   * @param skillName 技能名称
   * @param skillValue 技能值
   */
  performSkillCheck(skillName: string, skillValue: number): DiceRoll {
    return coc7Rules.performSkillCheck(skillName, skillValue);
  }

  /**
   * 获取投骰结果的中文描述
   */
  getRollResultText(result: RollResult): string {
    return coc7Rules.getRollResultText(result);
  }

  /**
   * 执行对抗检定
   * @param attacker 攻击者技能值
   * @param defender 防御者技能值
   */
  resolveOpposedRoll(attacker: number, defender: number) {
    return coc7Rules.resolveOpposedRoll(attacker, defender);
  }

  // ==================== 属性计算相关 ====================

  /**
   * 计算衍生属性
   * @param attributes COC7 基础属性
   */
  calculateDerivedStats(attributes: COC7Attributes): DerivedStats {
    return coc7Rules.calculateDerivedStats(attributes);
  }

  /**
   * 计算移动力
   */
  calculateMovement(attributes: COC7Attributes): number {
    return coc7Rules.calculateMovement(attributes);
  }

  /**
   * 计算伤害加值和体格
   */
  calculateDamageBonus(attributes: COC7Attributes): { DB: string; BUILD: number } {
    return coc7Rules.calculateDamageBonus(attributes);
  }

  /**
   * 随机生成 COC7 属性
   * @param method 生成方法
   */
  generateRandomAttributes(method: '3d6x5' | '2d6+6x5' = '3d6x5'): COC7Attributes {
    return coc7Rules.generateRandomAttributes(method);
  }

  // ==================== 战斗相关 ====================

  /**
   * 计算伤害（考虑护甲）
   * @param baseDamage 基础伤害
   * @param armor 护甲值
   */
  calculateDamage(baseDamage: number, armor: number = 0): number {
    return coc7Rules.calculateDamage(baseDamage, armor);
  }

  /**
   * 解析伤害加值骰子（如 "+1d4"）
   * @param db 伤害加值字符串
   */
  private rollDamageBonus(db: string): number {
    if (db === '0' || db === '-1' || db === '-2') {
      return parseInt(db);
    }

    // 解析 "+XdY" 格式
    const match = db.match(/\+?(\d+)d(\d+)/);
    if (match) {
      const count = parseInt(match[1]);
      const sides = parseInt(match[2]);
      let total = 0;
      for (let i = 0; i < count; i++) {
        total += Math.floor(Math.random() * sides) + 1;
      }
      return total;
    }

    return 0;
  }

  /**
   * 计算攻击伤害
   * @param attacker 攻击者
   * @param weaponDamage 武器基础伤害
   * @param armor 目标护甲
   */
  calculateAttackDamage(attacker: Character | Enemy, weaponDamage: number, armor: number = 0): number {
    const dbBonus = this.rollDamageBonus(attacker.derivedStats.DB);
    const totalDamage = weaponDamage + dbBonus;
    return this.calculateDamage(totalDamage, armor);
  }

  /**
   * 计算先攻值
   * @param participant 战斗参与者
   */
  calculateInitiative(participant: Character | Enemy): number {
    // 先攻 = DEX + 1d10
    const dexBonus = participant.attributes.DEX;
    const roll = Math.floor(Math.random() * 10) + 1;
    return dexBonus + roll;
  }

  /**
   * 执行单次攻击
   * @param attacker 攻击者
   * @param defender 防御者
   * @param attackSkill 攻击技能值
   * @param dodgeSkill 闪避技能值
   * @param weaponDamage 武器伤害
   */
  executeAttack(
    attacker: CombatParticipant,
    defender: CombatParticipant,
    attackSkill: number,
    dodgeSkill: number,
    weaponDamage: number,
  ): CombatAction {
    // 执行对抗检定
    const opposed = this.resolveOpposedRoll(attackSkill, dodgeSkill);

    const action: CombatAction = {
      type: 'attack',
      actorId: attacker.id,
      targetId: defender.id,
      attackType: 'melee',
      skillUsed: '格斗',
      roll: opposed.attackerRoll,
    };

    // 判断攻击是否命中
    if (opposed.result === 'attacker_wins') {
      // 计算伤害
      const entity = attacker.character || attacker.enemy;
      if (entity) {
        const damage = this.calculateAttackDamage(entity, weaponDamage);
        action.damage = damage;
        action.description = `${attacker.id} 攻击命中，造成 ${damage} 点伤害`;

        // 更新防御者 HP
        defender.currentHP = Math.max(0, defender.currentHP - damage);
      }
    } else if (opposed.result === 'defender_wins') {
      action.description = `${defender.id} 成功闪避攻击`;
    } else {
      action.description = `攻击与闪避势均力敌`;
    }

    return action;
  }

  /**
   * 尝试逃跑
   * @param escaper 逃跑者
   * @param chaser 追击者
   */
  attemptEscape(escaper: CombatParticipant, chaser: CombatParticipant): EscapeAttempt {
    // 逃跑检定通常使用 DEX 对抗
    const escaperDEX = escaper.character?.attributes.DEX || escaper.enemy?.attributes.DEX || 50;
    const chaserDEX = chaser.character?.attributes.DEX || chaser.enemy?.attributes.DEX || 50;

    const opposed = this.resolveOpposedRoll(escaperDEX, chaserDEX);

    const success = opposed.result === 'attacker_wins';

    return {
      success,
      roll: opposed.attackerRoll,
      consequence: success ? undefined : '逃跑失败，敌人获得一次攻击机会',
    };
  }

  /**
   * 解决完整的战斗
   * @param player 玩家角色
   * @param enemy 敌人
   * @param maxRounds 最大回合数
   */
  resolveCombat(player: Character, enemy: Enemy, maxRounds: number = 10): CombatResult {
    try {
      console.log('[COC7 Service] 开始战斗:', player.name, 'vs', enemy.name);

      // 验证输入
      if (!player || !enemy) {
        throw new Error('战斗参与者数据无效');
      }

      if (maxRounds <= 0) {
        throw new Error('最大回合数必须大于 0');
      }

      // 初始化战斗参与者
      const playerParticipant: CombatParticipant = {
        id: player.id,
        character: player,
        isPlayer: true,
        currentHP: player.derivedStats.HP,
        currentMP: player.derivedStats.MP,
        currentSAN: player.derivedStats.SAN,
        statusEffects: [],
        initiative: this.calculateInitiative(player),
      };

      const enemyParticipant: CombatParticipant = {
        id: enemy.id,
        enemy,
        isPlayer: false,
        currentHP: enemy.derivedStats.HP,
        currentMP: enemy.derivedStats.MP,
        currentSAN: enemy.derivedStats.SAN,
        statusEffects: [],
        initiative: this.calculateInitiative(enemy),
      };

      const rounds: CombatRound[] = [];
      let currentRound = 1;
      let status: 'active' | 'victory' | 'defeat' | 'escaped' = 'active';

      // 战斗循环
      while (currentRound <= maxRounds && status === 'active') {
        const actions: CombatAction[] = [];

        // 确定行动顺序（先攻高的先行动）
        const order =
          playerParticipant.initiative >= enemyParticipant.initiative
            ? [playerParticipant, enemyParticipant]
            : [enemyParticipant, playerParticipant];

        // 执行行动
        for (const actor of order) {
          const target = actor === playerParticipant ? enemyParticipant : playerParticipant;

          // 检查是否已经死亡
          if (actor.currentHP <= 0 || target.currentHP <= 0) {
            break;
          }

          // 获取技能值
          const attackSkill = actor.character?.skills.get('格斗') || actor.enemy?.skills.get('格斗') || 50;
          const dodgeSkill = target.character?.skills.get('闪避') || target.enemy?.skills.get('闪避') || 50;

          // 执行攻击
          const action = this.executeAttack(actor, target, attackSkill, dodgeSkill, 6); // 假设武器伤害为 1d6
          actions.push(action);
        }

        // 记录回合
        rounds.push({
          roundNumber: currentRound,
          actions,
          timestamp: Date.now(),
        });

        // 检查战斗是否结束
        if (playerParticipant.currentHP <= 0) {
          status = 'defeat';
        } else if (enemyParticipant.currentHP <= 0) {
          status = 'victory';
        }

        currentRound++;
      }

      // 如果达到最大回合数仍未分出胜负，判定为平局（视为失败）
      if (status === 'active') {
        status = 'defeat';
        console.log('[COC7 Service] 达到最大回合数，战斗结束');
      }

      const result: CombatResult = {
        status,
        rounds,
        winner: status === 'victory' ? player.id : status === 'defeat' ? enemy.id : undefined,
        loser: status === 'victory' ? enemy.id : status === 'defeat' ? player.id : undefined,
        endTime: Date.now(),
      };

      // 如果胜利，添加战利品
      if (status === 'victory' && enemy.loot) {
        result.rewards = {
          items: enemy.loot,
          experience: enemy.derivedStats.HP * 10, // 简单的经验值计算
        };
      }

      console.log('[COC7 Service] 战斗结束:', status);
      return result;
    } catch (error) {
      console.error('[COC7 Service] 战斗解决失败:', error);
      toastr.error('战斗系统错误');
      throw error;
    }
  }

  // ==================== 理智相关 ====================

  /**
   * 判断是否陷入疯狂
   * @param currentSAN 当前理智值
   * @param sanLoss 理智损失
   */
  checkInsanity(currentSAN: number, sanLoss: number) {
    return coc7Rules.checkInsanity(currentSAN, sanLoss);
  }

  /**
   * 执行理智检定
   * @param character 角色
   * @param sanLoss 理智损失（成功/失败）
   */
  performSanityCheck(
    character: Character,
    sanLoss: { success: number; failure: number },
  ): {
    roll: DiceRoll;
    actualLoss: number;
    insanity: ReturnType<typeof coc7Rules.checkInsanity>;
  } {
    const roll = this.performSkillCheck('理智', character.derivedStats.SAN);
    const actualLoss = roll.result === 'failure' ? sanLoss.failure : sanLoss.success;
    const insanity = this.checkInsanity(character.derivedStats.SAN, actualLoss);

    return { roll, actualLoss, insanity };
  }

  // ==================== 技能相关 ====================

  /**
   * 获取角色的技能值
   * @param character 角色
   * @param skillName 技能名称
   * @param defaultValue 默认值
   */
  getSkillValue(character: Character | Enemy, skillName: string, defaultValue: number = 50): number {
    return character.skills.get(skillName) || defaultValue;
  }

  /**
   * 设置角色的技能值
   * @param character 角色
   * @param skillName 技能名称
   * @param value 技能值
   */
  setSkillValue(character: Character | Enemy, skillName: string, value: number): void {
    character.skills.set(skillName, Math.max(0, Math.min(100, value)));
  }

  /**
   * 技能成长检定
   * @param currentValue 当前技能值
   */
  skillImprovement(currentValue: number): { improved: boolean; newValue: number } {
    // 投 1d100，如果结果大于当前技能值，则技能提升 1d10
    const roll = this.rollDice();

    if (roll > currentValue) {
      const improvement = Math.floor(Math.random() * 10) + 1;
      const newValue = Math.min(100, currentValue + improvement);
      return { improved: true, newValue };
    }

    return { improved: false, newValue: currentValue };
  }
}

// 导出单例
export const coc7Service = new COC7Service();
