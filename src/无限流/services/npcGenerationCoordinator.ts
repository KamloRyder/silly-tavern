// NPC 生成协调器服务 - 协调整个 NPC 生成流程

import type { NPCCharacter } from '../types/character';
import { withAPIContext, type WorldType } from '../utils/apiContext';
import { npcGenerationService } from './npcGenerationService';

/**
 * NPC 生成进度回调函数类型
 */
export type NPCGenerationProgressCallback = (current: number, total: number) => void;

/**
 * NPC 生成错误类型
 */
export enum NPCGenerationErrorType {
  AI_SERVICE_UNAVAILABLE = 'AI_SERVICE_UNAVAILABLE',
  PARSE_ERROR = 'PARSE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * NPC 生成错误信息
 */
export interface NPCGenerationError {
  type: NPCGenerationErrorType;
  message: string;
  originalError?: Error;
  index?: number;
}

/**
 * NPC 生成结果
 */
export interface NPCGenerationResult {
  npcs: NPCCharacter[];
  errors: NPCGenerationError[];
  successCount: number;
  failureCount: number;
}

/**
 * NPC 生成协调器
 * 负责协调整个 NPC 生成流程，包括数量计算、批量生成、进度管理和错误处理
 */
class NPCGenerationCoordinator {
  /**
   * 判断 NPC 应该使用的世界类型
   *
   * 根据 NPC 的生成上下文判断应该使用哪个世界的 API：
   * - 副本中的 NPC 使用 innerWorld API（里世界，创意型 AI）
   * - 归所中的 NPC 使用 sanctuary API（归所，平衡型 AI）
   * - 现实世界的 NPC 使用 realWorld API（现实世界，逻辑型 AI）
   *
   * @param context 生成上下文，可以是副本类型或特殊标识
   * @returns 世界类型
   */
  private determineWorldType(context?: string): WorldType {
    // 如果没有上下文，默认使用 innerWorld（副本场景）
    if (!context) {
      console.log('[NPC Generation Coordinator] 无上下文信息，默认使用 innerWorld');
      return 'innerWorld';
    }

    // 检查是否为归所
    if (context === 'sanctuary' || context.includes('归所')) {
      console.log('[NPC Generation Coordinator] 检测到归所上下文，使用 sanctuary API');
      return 'sanctuary';
    }

    // 检查是否为现实世界
    if (context === 'realWorld' || context.includes('现实世界') || context.includes('现代')) {
      console.log('[NPC Generation Coordinator] 检测到现实世界上下文，使用 realWorld API');
      return 'realWorld';
    }

    // 其他情况（恐怖、修仙、科幻、奇幻等副本类型）都使用 innerWorld
    console.log(`[NPC Generation Coordinator] 副本类型 "${context}"，使用 innerWorld API`);
    return 'innerWorld';
  }

  /**
   * 根据副本难度计算 NPC 数量
   * 公式：difficulty + random(0, 1)
   * @param difficulty 副本难度 (1-5)
   * @returns NPC 数量
   */
  calculateNPCCount(difficulty: number): number {
    if (difficulty < 1 || difficulty > 5) {
      console.warn('[NPC Generation Coordinator] 难度值超出范围 (1-5)，使用默认值 3');
      difficulty = 3;
    }

    // 基础数量 = 难度值
    // 随机增量 = 0 或 1
    const randomIncrement = Math.floor(Math.random() * 2);
    const count = difficulty + randomIncrement;

    console.log(`[NPC Generation Coordinator] 难度 ${difficulty} -> NPC 数量: ${count}`);
    return count;
  }

  /**
   * 分类错误类型
   * @param error 错误对象
   * @returns 错误类型
   */
  private classifyError(error: Error): NPCGenerationErrorType {
    const errorMessage = error.message.toLowerCase();

    if (errorMessage.includes('ai') || errorMessage.includes('service') || errorMessage.includes('unavailable')) {
      return NPCGenerationErrorType.AI_SERVICE_UNAVAILABLE;
    }

    if (errorMessage.includes('parse') || errorMessage.includes('json') || errorMessage.includes('format')) {
      return NPCGenerationErrorType.PARSE_ERROR;
    }

    if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('fetch')) {
      return NPCGenerationErrorType.NETWORK_ERROR;
    }

    return NPCGenerationErrorType.UNKNOWN_ERROR;
  }

  /**
   * 获取用户友好的错误消息
   * @param errorType 错误类型
   * @returns 用户友好的错误消息
   */
  private getUserFriendlyErrorMessage(errorType: NPCGenerationErrorType): string {
    switch (errorType) {
      case NPCGenerationErrorType.AI_SERVICE_UNAVAILABLE:
        return 'AI 服务暂时不可用，请检查网络连接或稍后重试';
      case NPCGenerationErrorType.PARSE_ERROR:
        return 'AI 返回的数据格式错误，请重试';
      case NPCGenerationErrorType.NETWORK_ERROR:
        return '网络连接失败，请检查网络设置';
      case NPCGenerationErrorType.UNKNOWN_ERROR:
        return '生成失败，请重试';
      default:
        return '未知错误';
    }
  }

  /**
   * 生成基础随机 NPC（降级方案）
   * 当 AI 服务不可用时使用
   * @param instanceType 副本类型
   * @returns 基础 NPC
   */
  private async generateBasicFallbackNPC(instanceType: string): Promise<NPCCharacter> {
    console.log('[NPC Generation Coordinator] 使用降级方案生成基础 NPC...');

    // 导入角色创建工具
    const { generateRandomAttributes, calculateDerivedStats } = await import('../utils/coc7Rules');

    // 生成基础属性
    const attributes = generateRandomAttributes();
    const derivedStats = calculateDerivedStats(attributes);

    // 基础职业列表
    const occupations = ['调查员', '记者', '医生', '警察', '学者', '商人', '艺术家', '工程师'];
    const occupation = occupations[Math.floor(Math.random() * occupations.length)];

    // 生成基础技能
    const skills = new Map<string, number>();
    skills.set('侦察', 25);
    skills.set('聆听', 25);
    skills.set('图书馆使用', 25);
    skills.set('母语', 80);
    skills.set('闪避', Math.floor(attributes.DEX / 2));

    // 生成默认肢体部位
    const bodyParts = [
      { id: 'head', name: '头部', damage: 0, debuffs: [] },
      { id: 'torso', name: '躯干', damage: 0, debuffs: [] },
      { id: 'left_arm', name: '左臂', damage: 0, debuffs: [] },
      { id: 'right_arm', name: '右臂', damage: 0, debuffs: [] },
      { id: 'left_leg', name: '左腿', damage: 0, debuffs: [] },
      { id: 'right_leg', name: '右腿', damage: 0, debuffs: [] },
    ];

    // 构建基础 NPC
    const npc: NPCCharacter = {
      id: `npc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type: 'npc',
      name: `${occupation}${Math.floor(Math.random() * 100)}`,
      age: Math.floor(Math.random() * 40) + 20,
      occupation,
      background: `一位普通的${occupation}，在${instanceType}副本中遇到了不寻常的事件。`,
      attributes,
      derivedStats,
      skills,
      bodyParts,
      inventory: [],
      affection: 50,
      isImportant: false,
      events: [],
    };

    console.log('[NPC Generation Coordinator] 基础 NPC 生成成功:', npc.name);
    return npc;
  }

  /**
   * 批量生成随机 NPC（增强版，包含完善的错误处理）
   * @param count NPC 数量
   * @param instanceType 副本类型
   * @param customNPCs 已有的自定义 NPC（用于生成关联角色）
   * @param onProgress 进度回调函数
   * @returns 生成结果，包含成功的 NPC 和错误信息
   */
  async generateRandomNPCs(
    count: number,
    instanceType: string,
    _customNPCs?: NPCCharacter[],
    onProgress?: NPCGenerationProgressCallback,
  ): Promise<NPCCharacter[]> {
    console.log(`[NPC Generation Coordinator] 开始批量生成 ${count} 个随机 NPC...`);
    console.log(`[NPC Generation Coordinator] 副本类型: ${instanceType}`);

    // 判断目标世界类型
    const targetWorld = this.determineWorldType(instanceType);

    const results: NPCCharacter[] = [];
    const errors: NPCGenerationError[] = [];
    let consecutiveFailures = 0;
    const MAX_CONSECUTIVE_FAILURES = 3;

    // 逐个生成 NPC
    for (let i = 0; i < count; i++) {
      try {
        console.log(`[NPC Generation Coordinator] 正在生成第 ${i + 1}/${count} 个 NPC...`);

        // 在开始生成前调用进度回调
        if (onProgress) {
          onProgress(i + 1, count);
        }

        // 使用 withAPIContext 确保使用 sanctuary API（归所）
        // NPC 生成等不触发 AI 对话的功能统一使用归所 API
        const npc = await withAPIContext('sanctuary', async () => {
          return await npcGenerationService.generateRandom(instanceType);
        });

        results.push(npc);
        consecutiveFailures = 0; // 重置连续失败计数

        console.log(`[NPC Generation Coordinator] ✅ 第 ${i + 1} 个 NPC 生成成功: ${npc.name}`);
      } catch (error) {
        // 单个 NPC 生成失败时记录错误
        const err = error as Error;
        const errorType = this.classifyError(err);
        consecutiveFailures++;

        console.error(`[NPC Generation Coordinator] ❌ 第 ${i + 1} 个 NPC 生成失败:`, error);

        errors.push({
          type: errorType,
          message: this.getUserFriendlyErrorMessage(errorType),
          originalError: err,
          index: i + 1,
        });

        // 如果连续失败次数过多，尝试使用降级方案
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          console.warn(`[NPC Generation Coordinator] 连续失败 ${consecutiveFailures} 次，尝试使用降级方案...`);
          toastr.warning('AI 服务可能不稳定，尝试使用基础生成方案...', 'NPC 生成', { timeOut: 3000 });

          try {
            const fallbackNPC = await this.generateBasicFallbackNPC(instanceType);
            results.push(fallbackNPC);
            consecutiveFailures = 0; // 重置连续失败计数
            console.log(`[NPC Generation Coordinator] ✅ 使用降级方案生成成功: ${fallbackNPC.name}`);
          } catch (fallbackError) {
            console.error('[NPC Generation Coordinator] 降级方案也失败了:', fallbackError);
            // 降级方案失败，继续尝试下一个
          }
        }
      }
    }

    // 处理生成结果
    console.log(`[NPC Generation Coordinator] 生成完成: 成功 ${results.length}/${count}`);

    // 如果所有 NPC 都生成失败
    if (results.length === 0 && errors.length > 0) {
      const errorMessage = '所有 NPC 生成失败';
      console.error(`[NPC Generation Coordinator] ${errorMessage}`);

      // 显示详细的错误信息和操作建议
      const errorTypes = new Set(errors.map(e => e.type));
      let suggestion = '';

      if (errorTypes.has(NPCGenerationErrorType.AI_SERVICE_UNAVAILABLE)) {
        suggestion = '请检查 AI 服务配置或稍后重试';
      } else if (errorTypes.has(NPCGenerationErrorType.NETWORK_ERROR)) {
        suggestion = '请检查网络连接';
      } else {
        suggestion = '请重试或联系管理员';
      }

      toastr.error(`${errorMessage}。${suggestion}`, 'NPC 生成失败', {
        timeOut: 5000,
        closeButton: true,
      });

      throw new Error(errorMessage);
    }

    // 如果部分 NPC 生成失败
    if (errors.length > 0) {
      const warningMessage = `${errors.length} 个 NPC 生成失败，已成功生成 ${results.length} 个`;
      console.warn(`[NPC Generation Coordinator] ${warningMessage}`);

      // 统计错误类型
      const errorTypeCounts = new Map<NPCGenerationErrorType, number>();
      errors.forEach(error => {
        errorTypeCounts.set(error.type, (errorTypeCounts.get(error.type) || 0) + 1);
      });

      // 构建详细的警告消息
      let detailedMessage = warningMessage;
      if (errorTypeCounts.size > 0) {
        const errorDetails = Array.from(errorTypeCounts.entries())
          .map(([type, count]) => `${this.getUserFriendlyErrorMessage(type)} (${count}次)`)
          .join('；');
        detailedMessage += `\n原因：${errorDetails}`;
      }

      toastr.warning(detailedMessage, 'NPC 生成', {
        timeOut: 4000,
        closeButton: true,
      });
    } else {
      // 全部成功时显示成功提示
      toastr.success(`成功生成 ${results.length} 个 NPC`, 'NPC 生成', { timeOut: 2000 });
    }

    console.log(`[NPC Generation Coordinator] ✅ 批量生成完成，返回 ${results.length} 个 NPC`);
    return results;
  }

  /**
   * 通过一句话描述生成 NPC（增强版，包含错误处理和降级方案）
   * @param description 用户描述
   * @param instanceType 副本类型
   * @returns 生成的 NPC
   */
  async generateQuickNPC(description: string, instanceType: string): Promise<NPCCharacter> {
    console.log('[NPC Generation Coordinator] 开始一句话创建 NPC...');
    console.log('[NPC Generation Coordinator] 描述:', description);

    // 判断目标世界类型
    const targetWorld = this.determineWorldType(instanceType);

    try {
      // 使用 withAPIContext 确保使用 sanctuary API（归所）
      // NPC 生成等不触发 AI 对话的功能统一使用归所 API
      const npc = await withAPIContext('sanctuary', async () => {
        return await npcGenerationService.generateCustom(description, instanceType);
      });

      console.log('[NPC Generation Coordinator] ✅ 一句话创建成功:', npc.name);
      toastr.success(`成功创建 NPC：${npc.name}`, 'NPC 创建', { timeOut: 2000 });
      return npc;
    } catch (error) {
      const err = error as Error;
      const errorType = this.classifyError(err);

      console.error('[NPC Generation Coordinator] ❌ 一句话创建失败:', error);

      // 显示用户友好的错误消息
      const errorMessage = this.getUserFriendlyErrorMessage(errorType);
      toastr.error(`创建失败：${errorMessage}`, 'NPC 创建', {
        timeOut: 4000,
        closeButton: true,
      });

      // 如果是 AI 服务不可用，提供降级方案选项
      if (errorType === NPCGenerationErrorType.AI_SERVICE_UNAVAILABLE) {
        console.log('[NPC Generation Coordinator] AI 服务不可用，提供降级方案...');
        toastr.info('您可以尝试使用"详细创建"手动配置 NPC', 'NPC 创建', {
          timeOut: 4000,
          closeButton: true,
        });
      }

      throw new Error(errorMessage);
    }
  }

  /**
   * 打开详细创建界面
   * 通过事件触发 UI 显示角色创建器，并等待用户完成或取消
   * @returns 创建的 NPC（如果用户取消则返回 null）
   */
  async openDetailedCreation(): Promise<NPCCharacter | null> {
    console.log('[NPC Generation Coordinator] 打开详细创建界面...');

    return new Promise<NPCCharacter | null>(resolve => {
      // 创建一次性事件监听器
      const handleCreated = (character: NPCCharacter) => {
        console.log('[NPC Generation Coordinator] 详细创建完成:', character.name);
        // 清理事件监听
        eventRemoveListener('npc_detailed_creation_completed', handleCreated);
        eventRemoveListener('npc_detailed_creation_cancelled', handleCancelled);
        resolve(character);
      };

      const handleCancelled = () => {
        console.log('[NPC Generation Coordinator] 详细创建已取消');
        // 清理事件监听
        eventRemoveListener('npc_detailed_creation_completed', handleCreated);
        eventRemoveListener('npc_detailed_creation_cancelled', handleCancelled);
        resolve(null);
      };

      // 注册事件监听
      eventOn('npc_detailed_creation_completed', handleCreated);
      eventOn('npc_detailed_creation_cancelled', handleCancelled);

      // 触发打开详细创建界面的事件
      console.log('[NPC Generation Coordinator] 发送 npc_detailed_creation_requested 事件');
      eventEmit('npc_detailed_creation_requested');
    });
  }

  /**
   * 重新生成随机 NPC（增强版，包含完善的错误处理）
   * @param difficulty 副本难度
   * @param instanceType 副本类型
   * @param customNPCs 保留的自定义 NPC
   * @param onProgress 进度回调函数
   * @returns 新生成的随机 NPC 列表
   */
  async regenerateRandomNPCs(
    difficulty: number,
    instanceType: string,
    customNPCs: NPCCharacter[],
    onProgress?: NPCGenerationProgressCallback,
  ): Promise<NPCCharacter[]> {
    console.log('[NPC Generation Coordinator] 开始重新生成随机 NPC...');
    console.log('[NPC Generation Coordinator] 保留的自定义 NPC 数量:', customNPCs.length);

    // 计算需要生成的随机 NPC 数量
    const totalCount = this.calculateNPCCount(difficulty);
    const randomCount = totalCount - customNPCs.length;

    console.log(
      `[NPC Generation Coordinator] 总数: ${totalCount}, 自定义: ${customNPCs.length}, 需生成: ${randomCount}`,
    );

    if (randomCount <= 0) {
      console.log('[NPC Generation Coordinator] 无需生成新的随机 NPC');
      toastr.info('自定义 NPC 数量已达上限，无需生成随机 NPC', 'NPC 重新生成', { timeOut: 2000 });
      return [];
    }

    const results: NPCCharacter[] = [];
    const errors: NPCGenerationError[] = [];
    let consecutiveFailures = 0;
    const MAX_CONSECUTIVE_FAILURES = 3;

    // 如果存在自定义 NPC，生成关联角色
    const hasCustomNPCs = customNPCs.length > 0;

    // 判断目标世界类型
    const targetWorld = this.determineWorldType(instanceType);

    for (let i = 0; i < randomCount; i++) {
      try {
        console.log(`[NPC Generation Coordinator] 正在生成第 ${i + 1}/${randomCount} 个随机 NPC...`);

        // 在开始生成前调用进度回调
        if (onProgress) {
          onProgress(i + 1, randomCount);
        }

        // 使用 withAPIContext 确保使用 sanctuary API（归所）
        // NPC 生成等不触发 AI 对话的功能统一使用归所 API
        const npc = await withAPIContext('sanctuary', async () => {
          // 如果有自定义 NPC，生成关联角色
          if (hasCustomNPCs) {
            console.log('[NPC Generation Coordinator] 基于自定义 NPC 生成关联角色...');
            return await npcGenerationService.generateRelatedNPC(instanceType, customNPCs);
          } else {
            // 否则生成普通随机 NPC
            return await npcGenerationService.generateRandom(instanceType);
          }
        });

        results.push(npc);
        consecutiveFailures = 0; // 重置连续失败计数
        console.log(`[NPC Generation Coordinator] ✅ 第 ${i + 1} 个 NPC 生成成功: ${npc.name}`);
      } catch (error) {
        // 单个 NPC 生成失败时记录错误
        const err = error as Error;
        const errorType = this.classifyError(err);
        consecutiveFailures++;

        console.error(`[NPC Generation Coordinator] ❌ 第 ${i + 1} 个 NPC 生成失败:`, error);

        errors.push({
          type: errorType,
          message: this.getUserFriendlyErrorMessage(errorType),
          originalError: err,
          index: i + 1,
        });

        // 如果连续失败次数过多，尝试使用降级方案
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          console.warn(`[NPC Generation Coordinator] 连续失败 ${consecutiveFailures} 次，尝试使用降级方案...`);
          toastr.warning('AI 服务可能不稳定，尝试使用基础生成方案...', 'NPC 重新生成', { timeOut: 3000 });

          try {
            const fallbackNPC = await this.generateBasicFallbackNPC(instanceType);
            results.push(fallbackNPC);
            consecutiveFailures = 0; // 重置连续失败计数
            console.log(`[NPC Generation Coordinator] ✅ 使用降级方案生成成功: ${fallbackNPC.name}`);
          } catch (fallbackError) {
            console.error('[NPC Generation Coordinator] 降级方案也失败了:', fallbackError);
            // 降级方案失败，继续尝试下一个
          }
        }
      }
    }

    // 处理生成结果
    console.log(`[NPC Generation Coordinator] 重新生成完成: 成功 ${results.length}/${randomCount}`);

    // 如果所有 NPC 都生成失败
    if (results.length === 0 && errors.length > 0) {
      const errorMessage = '所有随机 NPC 重新生成失败';
      console.error(`[NPC Generation Coordinator] ${errorMessage}`);

      // 显示详细的错误信息和操作建议
      const errorTypes = new Set(errors.map(e => e.type));
      let suggestion = '';

      if (errorTypes.has(NPCGenerationErrorType.AI_SERVICE_UNAVAILABLE)) {
        suggestion = '请检查 AI 服务配置或稍后重试';
      } else if (errorTypes.has(NPCGenerationErrorType.NETWORK_ERROR)) {
        suggestion = '请检查网络连接';
      } else {
        suggestion = '请重试或使用"添加自定义 NPC"手动创建';
      }

      toastr.error(`${errorMessage}。${suggestion}`, 'NPC 重新生成失败', {
        timeOut: 5000,
        closeButton: true,
      });

      throw new Error(errorMessage);
    }

    // 如果部分 NPC 生成失败
    if (errors.length > 0) {
      const warningMessage = `${errors.length} 个随机 NPC 生成失败，已成功生成 ${results.length} 个`;
      console.warn(`[NPC Generation Coordinator] ${warningMessage}`);

      // 统计错误类型
      const errorTypeCounts = new Map<NPCGenerationErrorType, number>();
      errors.forEach(error => {
        errorTypeCounts.set(error.type, (errorTypeCounts.get(error.type) || 0) + 1);
      });

      // 构建详细的警告消息
      let detailedMessage = warningMessage;
      if (errorTypeCounts.size > 0) {
        const errorDetails = Array.from(errorTypeCounts.entries())
          .map(([type, count]) => `${this.getUserFriendlyErrorMessage(type)} (${count}次)`)
          .join('；');
        detailedMessage += `\n原因：${errorDetails}`;
      }

      toastr.warning(detailedMessage, 'NPC 重新生成', {
        timeOut: 4000,
        closeButton: true,
      });
    } else {
      // 全部成功时显示成功提示
      toastr.success(`成功重新生成 ${results.length} 个随机 NPC`, 'NPC 重新生成', { timeOut: 2000 });
    }

    console.log(`[NPC Generation Coordinator] ✅ 重新生成完成，生成了 ${results.length} 个随机 NPC`);
    return results;
  }
}

// 导出单例
export const npcGenerationCoordinator = new NPCGenerationCoordinator();
