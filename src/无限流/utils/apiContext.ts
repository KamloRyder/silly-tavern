// API 上下文管理工具
// 提供临时切换 API 上下文的功能，确保特定服务使用正确的 API

import { apiConfigService, type WorldType } from '../services/apiConfigService';

/**
 * 日志配置
 */
const LOG_CONFIG = {
  /** 日志前缀 */
  PREFIX: '[API Context]',
  /** 慢操作阈值（毫秒） */
  SLOW_THRESHOLD: 1000,
  /** 是否启用调试模式 */
  DEBUG_MODE: false,
};

/**
 * 操作类型枚举
 */
enum OperationType {
  SWITCH = '切换',
  RESTORE = '恢复',
  COMPLETE = '完成',
  FAILED = '失败',
  SKIP = '跳过',
  ENTER = '进入',
  EXIT = '退出',
}

/**
 * 统一日志记录器
 *
 * 提供统一格式的日志输出，包含操作类型、世界类型、方向等信息。
 */
class ContextLogger {
  /**
   * 记录上下文切换开始
   */
  logSwitchStart(level: number, from: WorldType, to: WorldType): void {
    console.log(`${LOG_CONFIG.PREFIX} L${level}: ${OperationType.SWITCH} ${from} → ${to}`);

    if (LOG_CONFIG.DEBUG_MODE) {
      console.debug(`${LOG_CONFIG.PREFIX} [DEBUG] L${level}: 开始切换到 ${to}`);
    }
  }

  /**
   * 记录上下文切换完成
   */
  logSwitchComplete(level: number, world: WorldType): void {
    console.log(`${LOG_CONFIG.PREFIX} L${level}: ${OperationType.COMPLETE} 切换，当前世界: ${world}`);

    if (LOG_CONFIG.DEBUG_MODE) {
      console.debug(`${LOG_CONFIG.PREFIX} [DEBUG] L${level}: 切换完成，配置已应用`);
    }
  }

  /**
   * 记录跳过不必要的切换
   */
  logSkipSwitch(level: number, world: WorldType): void {
    console.log(`${LOG_CONFIG.PREFIX} L${level}: ${OperationType.SKIP} 切换，已在目标世界 ${world}`);

    if (LOG_CONFIG.DEBUG_MODE) {
      console.debug(`${LOG_CONFIG.PREFIX} [DEBUG] L${level}: 优化：跳过不必要的切换`);
    }
  }

  /**
   * 记录上下文恢复开始
   */
  logRestoreStart(level: number, from: WorldType, to: WorldType): void {
    console.log(`${LOG_CONFIG.PREFIX} L${level}: ${OperationType.RESTORE} ${from} → ${to}`);

    if (LOG_CONFIG.DEBUG_MODE) {
      console.debug(`${LOG_CONFIG.PREFIX} [DEBUG] L${level}: 开始恢复到 ${to}`);
    }
  }

  /**
   * 记录上下文恢复完成
   */
  logRestoreComplete(level: number, world: WorldType): void {
    console.log(`${LOG_CONFIG.PREFIX} L${level}: ${OperationType.COMPLETE} 恢复，当前世界: ${world}`);

    if (LOG_CONFIG.DEBUG_MODE) {
      console.debug(`${LOG_CONFIG.PREFIX} [DEBUG] L${level}: 恢复完成，配置已应用`);
    }
  }

  /**
   * 记录进入上下文
   */
  logEnter(level: number, from: WorldType, to: WorldType): void {
    console.log(`${LOG_CONFIG.PREFIX} L${level}: ${OperationType.ENTER} 上下文 ${from} → ${to}`);

    if (LOG_CONFIG.DEBUG_MODE) {
      console.debug(`${LOG_CONFIG.PREFIX} [DEBUG] L${level}: 上下文栈深度: ${level}`);
    }
  }

  /**
   * 记录退出上下文
   */
  logExit(level: number, from: WorldType, to: WorldType): void {
    console.log(`${LOG_CONFIG.PREFIX} L${level}: ${OperationType.EXIT} 上下文 ${from} → ${to}`);

    if (LOG_CONFIG.DEBUG_MODE) {
      console.debug(`${LOG_CONFIG.PREFIX} [DEBUG] L${level}: 上下文栈深度: ${level - 1}`);
    }
  }

  /**
   * 记录回调执行成功（含性能信息）
   */
  logCallbackSuccess(level: number, duration: number): void {
    const isSlow = duration > LOG_CONFIG.SLOW_THRESHOLD;
    const slowMarker = isSlow ? ' ⚠️ 慢操作' : '';

    console.log(
      `${LOG_CONFIG.PREFIX} L${level}: ${OperationType.COMPLETE} 回调执行 (耗时: ${duration.toFixed(2)}ms)${slowMarker}`,
    );

    if (LOG_CONFIG.DEBUG_MODE) {
      console.debug(`${LOG_CONFIG.PREFIX} [DEBUG] L${level}: 性能统计 - 执行时长: ${duration.toFixed(2)}ms`);
    }

    if (isSlow) {
      console.warn(
        `${LOG_CONFIG.PREFIX} L${level}: 检测到慢操作，耗时 ${duration.toFixed(2)}ms 超过阈值 ${LOG_CONFIG.SLOW_THRESHOLD}ms`,
      );
    }
  }

  /**
   * 记录回调执行失败（含性能信息）
   */
  logCallbackError(level: number, duration: number, error: unknown): void {
    console.error(
      `${LOG_CONFIG.PREFIX} L${level}: ${OperationType.FAILED} 回调执行 (耗时: ${duration.toFixed(2)}ms):`,
      error,
    );

    if (error instanceof Error && error.stack) {
      console.error(`${LOG_CONFIG.PREFIX} L${level}: 错误堆栈:`, error.stack);
    }

    if (LOG_CONFIG.DEBUG_MODE) {
      console.debug(`${LOG_CONFIG.PREFIX} [DEBUG] L${level}: 错误详情:`, {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        duration: `${duration.toFixed(2)}ms`,
      });
    }
  }

  /**
   * 记录严重错误
   */
  logCriticalError(level: number, message: string, error?: unknown): void {
    console.error(`${LOG_CONFIG.PREFIX} L${level}: [严重错误] ${message}`, error || '');

    if (error instanceof Error && error.stack) {
      console.error(`${LOG_CONFIG.PREFIX} L${level}: 错误堆栈:`, error.stack);
    }

    if (LOG_CONFIG.DEBUG_MODE) {
      console.debug(`${LOG_CONFIG.PREFIX} [DEBUG] L${level}: 严重错误详情:`, {
        message,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 记录警告
   */
  logWarning(level: number, message: string, details?: unknown): void {
    console.warn(`${LOG_CONFIG.PREFIX} L${level}: ${message}`, details || '');

    if (LOG_CONFIG.DEBUG_MODE) {
      console.debug(`${LOG_CONFIG.PREFIX} [DEBUG] L${level}: 警告详情:`, details);
    }
  }

  /**
   * 记录调试信息（仅在调试模式下）
   */
  logDebug(level: number, message: string, data?: unknown): void {
    if (LOG_CONFIG.DEBUG_MODE) {
      console.debug(`${LOG_CONFIG.PREFIX} [DEBUG] L${level}: ${message}`, data || '');
    }
  }

  /**
   * 记录上下文栈状态（仅在调试模式下）
   */
  logStackState(stack: WorldType[]): void {
    if (LOG_CONFIG.DEBUG_MODE) {
      console.debug(`${LOG_CONFIG.PREFIX} [DEBUG] 上下文栈状态:`, {
        depth: stack.length,
        stack: [...stack],
      });
    }
  }
}

// 创建日志记录器单例
const logger = new ContextLogger();

/**
 * 切换到指定世界的辅助函数
 *
 * 根据世界类型调用 apiConfigService 的相应切换方法。
 * 这是一个内部辅助函数，用于简化世界切换逻辑。
 *
 * @param world 目标世界类型
 * @throws 如果 apiConfigService 不可用或切换失败
 *
 * @internal
 *
 * @example
 * switchToWorld('realWorld'); // 调用 apiConfigService.switchToRealWorld()
 * switchToWorld('innerWorld'); // 调用 apiConfigService.switchToInnerWorld()
 * switchToWorld('sanctuary'); // 调用 apiConfigService.switchToSanctuary()
 */
function switchToWorld(world: WorldType): void {
  // 9.1: 捕获切换方法调用失败
  try {
    switch (world) {
      case 'realWorld':
        apiConfigService.switchToRealWorld();
        break;
      case 'innerWorld':
        apiConfigService.switchToInnerWorld();
        break;
      case 'sanctuary':
        apiConfigService.switchToSanctuary();
        break;
    }
  } catch (error) {
    // 使用统一日志格式记录错误
    console.error(`${LOG_CONFIG.PREFIX} 切换到 ${world} 失败:`, error);
    // 9.1: 显示用户友好的错误提示
    toastr.error(`无法切换到 ${world} API，请检查 API 配置`);
    throw error;
  }
}

/**
 * 安全地获取当前世界类型
 *
 * 尝试从 apiConfigService 获取当前世界，如果失败则返回默认值。
 *
 * @returns 当前世界类型，失败时返回 'realWorld'
 *
 * @internal
 */
function safeGetCurrentWorld(): WorldType {
  // 9.1: 捕获 getCurrentWorld 调用失败
  try {
    return apiConfigService.getCurrentWorld();
  } catch (error) {
    // 使用统一日志格式记录警告
    console.warn(`${LOG_CONFIG.PREFIX} 获取当前世界失败，使用默认值 realWorld:`, error);
    // 9.1: 显示用户友好的错误提示
    toastr.warning('无法获取当前 API 配置，使用默认配置');
    return 'realWorld';
  }
}

/**
 * API 上下文管理器类
 *
 * 提供嵌套的 API 上下文切换功能，使用栈结构管理多层调用。
 * 确保每次上下文切换都能安全地恢复到之前的状态。
 *
 * 核心特性：
 * - 支持嵌套调用，内层恢复到外层而非最初状态
 * - 自动性能优化，跳过不必要的切换
 * - 完善的错误处理，确保上下文始终能恢复
 * - 详细的日志记录，便于调试和监控
 */
class APIContextManager {
  /**
   * 上下文栈，用于存储嵌套调用时的世界类型
   *
   * 每次进入新的上下文时，当前世界会被推入栈中。
   * 退出上下文时，从栈中弹出并恢复到该世界。
   *
   * @private
   */
  private contextStack: WorldType[] = [];

  /**
   * 在指定的 API 上下文中执行回调函数
   *
   * 该方法提供了安全的上下文切换机制：
   * 1. 将当前世界推入上下文栈
   * 2. 切换到目标世界的 API 配置
   * 3. 执行回调函数
   * 4. 在 finally 块中从栈弹出并恢复世界（确保始终执行）
   *
   * 性能优化：
   * - 如果当前已在目标世界且栈为空，跳过切换直接执行
   * - 记录执行时长，便于性能分析
   *
   * 错误处理：
   * - 回调函数的错误会被捕获、记录并重新抛出
   * - 上下文恢复失败时会尝试恢复到默认世界（realWorld）
   * - 所有错误都会被正确传播到调用者
   *
   * @template T 回调函数的返回值类型，可以是任意类型
   * @param targetWorld 目标世界类型，必须是 'realWorld' | 'innerWorld' | 'sanctuary' 之一
   * @param callback 要执行的回调函数，可以是同步函数或返回 Promise 的异步函数
   * @returns Promise<T> 返回回调函数的执行结果
   *
   * @throws 如果回调函数抛出错误，该错误会在恢复上下文后重新抛出
   *
   * @example
   * // 基本用法
   * const result = await apiContextManager.withContext('realWorld', async () => {
   *   return await generate({ user_input: 'test' });
   * });
   *
   * @example
   * // 嵌套调用（两层）
   * await apiContextManager.withContext('realWorld', async () => {
   *   console.log('L1: realWorld');
   *
   *   await apiContextManager.withContext('innerWorld', async () => {
   *     console.log('L2: innerWorld');
   *   });
   *
   *   console.log('L1: 恢复到 realWorld');
   * });
   *
   * @example
   * // 多层嵌套
   * await apiContextManager.withContext('realWorld', async () => {
   *   await apiContextManager.withContext('innerWorld', async () => {
   *     await apiContextManager.withContext('sanctuary', async () => {
   *       console.log('L3: sanctuary');
   *     });
   *     console.log('L2: 恢复到 innerWorld');
   *   });
   *   console.log('L1: 恢复到 realWorld');
   * });
   */
  async withContext<T>(targetWorld: WorldType, callback: () => Promise<T> | T): Promise<T> {
    // 9.1: 使用安全的方法获取当前世界
    const currentWorld = safeGetCurrentWorld();

    // 7.2: 在切换前将当前世界推入栈
    this.contextStack.push(currentWorld);
    // 7.2: 添加栈深度日志
    const level = this.contextStack.length;

    // 记录上下文栈状态（调试模式）
    logger.logStackState(this.contextStack);

    // 检查当前世界是否已经是目标世界（优化）
    if (currentWorld === targetWorld && level === 1) {
      // 11.1: 使用统一日志格式记录跳过切换
      logger.logSkipSwitch(level, targetWorld);

      const startTime = performance.now();

      try {
        const result = await callback();
        // 11.2: 记录性能信息
        const duration = performance.now() - startTime;
        logger.logCallbackSuccess(level, duration);

        return result;
      } catch (error) {
        // 11.2: 记录性能信息和错误
        const duration = performance.now() - startTime;
        logger.logCallbackError(level, duration, error);
        // 7.3: 正确传播错误到最外层
        throw error;
      } finally {
        // 7.2: 在恢复时从栈中弹出世界
        this.contextStack.pop();
        logger.logStackState(this.contextStack);
      }
    }

    // 11.1: 使用统一日志格式记录进入上下文
    logger.logEnter(level, currentWorld, targetWorld);

    const startTime = performance.now();

    try {
      // 11.1: 使用统一日志格式记录切换开始
      logger.logSwitchStart(level, currentWorld, targetWorld);
      // 切换到目标世界
      switchToWorld(targetWorld);
      // 11.1: 使用统一日志格式记录切换完成
      logger.logSwitchComplete(level, targetWorld);

      // 11.3: 调试模式下显示配置应用详情
      logger.logDebug(level, '配置已应用', { targetWorld, currentConfig: apiConfigService.getCurrentWorld() });

      // 执行回调函数
      const result = await callback();

      // 11.2: 记录性能信息
      const duration = performance.now() - startTime;
      logger.logCallbackSuccess(level, duration);

      return result;
    } catch (error) {
      // 11.2: 记录性能信息和错误
      const duration = performance.now() - startTime;
      logger.logCallbackError(level, duration, error);
      // 7.3: 正确传播错误到最外层
      throw error;
    } finally {
      // 7.2: 在恢复时从栈中弹出世界
      const restoreWorld = this.contextStack.pop();

      if (restoreWorld) {
        // 11.1: 使用统一日志格式记录退出上下文
        logger.logExit(level, targetWorld, restoreWorld);

        // 9.2: 在 finally 块中捕获恢复错误
        try {
          // 11.1: 使用统一日志格式记录恢复开始
          logger.logRestoreStart(level, targetWorld, restoreWorld);
          // 7.3: 确保内层错误不影响外层恢复
          switchToWorld(restoreWorld);
          // 11.1: 使用统一日志格式记录恢复完成
          logger.logRestoreComplete(level, restoreWorld);

          // 11.3: 调试模式下显示配置应用详情
          logger.logDebug(level, '恢复配置已应用', { restoreWorld, currentConfig: apiConfigService.getCurrentWorld() });
        } catch (restoreError) {
          // 9.2: 记录严重错误日志
          logger.logCriticalError(level, `恢复到 ${restoreWorld} 失败`, restoreError);

          // 9.2: 尝试恢复到默认世界 (realWorld)
          try {
            logger.logWarning(level, '尝试恢复到默认世界 realWorld');
            switchToWorld('realWorld');
            logger.logRestoreComplete(level, 'realWorld');
            toastr.warning('API 上下文恢复失败，已切换到默认配置');
          } catch (fallbackError) {
            // 9.2: 记录严重错误日志
            logger.logCriticalError(level, '无法恢复到默认世界', fallbackError);
            toastr.error('API 上下文恢复失败，请刷新页面');
          }
        }
      } else {
        // 记录严重错误
        logger.logCriticalError(level, '上下文栈为空，无法恢复！');
      }

      // 记录上下文栈状态（调试模式）
      logger.logStackState(this.contextStack);
    }
  }

  /**
   * 获取当前上下文栈的深度
   *
   * 返回当前嵌套调用的层级数。栈深度为 0 表示没有活动的上下文切换。
   *
   * @returns 上下文栈深度（0 表示无嵌套，1 表示一层嵌套，以此类推）
   *
   * @example
   * console.log(apiContextManager.getStackDepth()); // 0
   *
   * await apiContextManager.withContext('realWorld', async () => {
   *   console.log(apiContextManager.getStackDepth()); // 1
   *
   *   await apiContextManager.withContext('innerWorld', async () => {
   *     console.log(apiContextManager.getStackDepth()); // 2
   *   });
   * });
   */
  getStackDepth(): number {
    return this.contextStack.length;
  }
}

// 7.4: 创建 apiContextManager 单例
const apiContextManager = new APIContextManager();

/**
 * 启用调试模式
 *
 * 启用后会输出详细的上下文切换日志，包括：
 * - 上下文栈状态
 * - 配置应用详情
 * - 性能统计信息
 * - 错误详情
 *
 * @example
 * enableDebugMode();
 * await withAPIContext('realWorld', async () => {
 *   // 会输出详细的调试日志
 * });
 */
export function enableDebugMode(): void {
  LOG_CONFIG.DEBUG_MODE = true;
  console.log(`${LOG_CONFIG.PREFIX} 调试模式已启用`);
}

/**
 * 禁用调试模式
 *
 * @example
 * disableDebugMode();
 */
export function disableDebugMode(): void {
  LOG_CONFIG.DEBUG_MODE = false;
  console.log(`${LOG_CONFIG.PREFIX} 调试模式已禁用`);
}

/**
 * 设置慢操作阈值
 *
 * 当回调函数执行时间超过此阈值时，会在日志中标记为慢操作。
 *
 * @param threshold 阈值（毫秒），默认为 1000ms
 *
 * @example
 * setSlowThreshold(500); // 设置为 500ms
 */
export function setSlowThreshold(threshold: number): void {
  LOG_CONFIG.SLOW_THRESHOLD = threshold;
  console.log(`${LOG_CONFIG.PREFIX} 慢操作阈值已设置为 ${threshold}ms`);
}

/**
 * 获取当前日志配置
 *
 * @returns 当前日志配置的只读副本
 *
 * @example
 * const config = getLogConfig();
 * console.log('调试模式:', config.DEBUG_MODE);
 * console.log('慢操作阈值:', config.SLOW_THRESHOLD);
 */
export function getLogConfig(): Readonly<typeof LOG_CONFIG> {
  return { ...LOG_CONFIG };
}

/**
 * 在指定的 API 上下文中执行回调函数
 *
 * 该函数提供了一个安全的方式来临时切换 API 上下文。它会：
 * 1. 保存当前的世界类型
 * 2. 切换到目标世界的 API 配置
 * 3. 执行回调函数
 * 4. 无论成功或失败，都会恢复到原始的世界配置
 *
 * 支持嵌套调用，内层上下文结束时会恢复到外层上下文而非最初上下文。
 *
 * @template T 回调函数的返回值类型，支持任意类型包括 Promise
 * @param targetWorld 目标世界类型，可选值：'realWorld' | 'innerWorld' | 'sanctuary'
 * @param callback 要执行的回调函数，支持同步函数和异步函数（返回 Promise）
 * @returns Promise，解析为回调函数的返回值
 *
 * @throws 如果回调函数抛出错误，该错误会在恢复上下文后重新抛出
 *
 * @example
 * // 基本用法：在现实世界 API 上下文中生成地图
 * const map = await withAPIContext('realWorld', async () => {
 *   const text = await generate({
 *     user_input: '生成一个现代城市地图',
 *     should_stream: false
 *   });
 *   return parseMapData(text);
 * });
 *
 * @example
 * // 嵌套上下文调用
 * await withAPIContext('realWorld', async () => {
 *   console.log('使用 realWorld API');
 *
 *   await withAPIContext('innerWorld', async () => {
 *     console.log('临时切换到 innerWorld API');
 *   });
 *
 *   console.log('恢复到 realWorld API');
 * });
 *
 * @example
 * // 错误处理：即使回调失败，上下文也会正确恢复
 * try {
 *   await withAPIContext('innerWorld', async () => {
 *     throw new Error('生成失败');
 *   });
 * } catch (error) {
 *   console.error('捕获到错误，但上下文已恢复');
 * }
 *
 * @example
 * // 同步回调函数也支持
 * const result = await withAPIContext('sanctuary', () => {
 *   return '同步返回值';
 * });
 */
export const withAPIContext = apiContextManager.withContext.bind(apiContextManager);

/**
 * API 上下文管理器实例
 *
 * 提供对上下文管理器的直接访问，主要用于调试和高级用途。
 *
 * @example
 * // 获取当前上下文栈深度
 * const depth = apiContextManager.getStackDepth();
 * console.log(`当前嵌套层级: ${depth}`);
 */
export { apiContextManager };

/**
 * 世界类型
 *
 * 定义了系统中三种可用的世界类型，每种世界可以配置独立的 API。
 *
 * - `realWorld`: 现实世界，通常使用逻辑型 AI（如 GPT-4）
 * - `innerWorld`: 里世界，通常使用创意型 AI（如 Claude）
 * - `sanctuary`: 归所，通常使用平衡型 AI
 *
 * @see {@link apiConfigService} 用于配置和切换世界
 */
export type { WorldType };

// ============================================================================
// 使用文档
// ============================================================================

/**
 * # API 上下文管理工具使用指南
 *
 * ## 概述
 *
 * `withAPIContext` 是一个用于临时切换 API 上下文的工具函数。它确保特定的服务
 * 始终使用最适合该任务的 AI 模型，无论玩家当前身处哪个世界。
 *
 * **核心理念：用对的 AI 做对的事**
 * - 现实世界地图 → 使用逻辑型 AI（realWorld）
 * - 里世界地图 → 使用创意型 AI（innerWorld）
 * - 归所 NPC → 使用平衡型 AI（sanctuary）
 *
 * ---
 *
 * ## 基本用法
 *
 * ### 示例 1：在服务中使用固定的 API 上下文
 *
 * ```typescript
 * // realWorldMapService.ts
 * import { withAPIContext } from '../utils/apiContext';
 * import { generate } from '../api/generate';
 *
 * class RealWorldMapService {
 *   async generateMap(character: PlayerCharacter): Promise<MapData> {
 *     // 确保始终使用 realWorld API 生成现实世界地图
 *     return await withAPIContext('realWorld', async () => {
 *       console.log('[RealWorldMapService] 开始生成地图...');
 *
 *       const prompt = this.buildPrompt(character);
 *
 *       // 此时的 generate() 会自动路由到 realWorld API
 *       const text = await generate({
 *         user_input: prompt,
 *         should_stream: false,
 *       });
 *
 *       return this.parseMapData(text);
 *     });
 *   }
 *
 *   private buildPrompt(character: PlayerCharacter): string {
 *     return `生成一个适合 ${character.name} 的现代城市地图...`;
 *   }
 *
 *   private parseMapData(text: string): MapData {
 *     // 解析 AI 返回的地图数据
 *     return JSON.parse(text);
 *   }
 * }
 * ```
 *
 * ### 示例 2：根据条件动态选择 API 上下文
 *
 * ```typescript
 * // npcGenerationCoordinator.ts
 * import { withAPIContext, type WorldType } from '../utils/apiContext';
 * import { generate } from '../api/generate';
 *
 * class NPCGenerationCoordinator {
 *   async generateNPC(config: NPCGenerationConfig): Promise<NPC> {
 *     // 根据 NPC 所在世界动态选择 API
 *     const targetWorld = this.determineWorldType(config);
 *
 *     return await withAPIContext(targetWorld, async () => {
 *       console.log(`[NPCCoordinator] 生成 ${targetWorld} NPC...`);
 *
 *       const prompt = this.buildPrompt(config);
 *
 *       const text = await generate({
 *         user_input: prompt,
 *         should_stream: false,
 *       });
 *
 *       return this.parseNPC(text);
 *     });
 *   }
 *
 *   private determineWorldType(config: NPCGenerationConfig): WorldType {
 *     // 根据 NPC 配置判断应该使用哪个世界的 API
 *     if (config.location?.is_sanctuary) {
 *       return 'sanctuary';
 *     } else if (config.location?.is_inner_world) {
 *       return 'innerWorld';
 *     } else {
 *       return 'realWorld';
 *     }
 *   }
 *
 *   private buildPrompt(config: NPCGenerationConfig): string {
 *     return `生成一个 NPC，名字：${config.name}，职业：${config.occupation}...`;
 *   }
 *
 *   private parseNPC(text: string): NPC {
 *     return JSON.parse(text);
 *   }
 * }
 * ```
 *
 * ---
 *
 * ## 错误处理
 *
 * ### 示例 3：正确处理生成失败的情况
 *
 * ```typescript
 * import { withAPIContext } from '../utils/apiContext';
 * import { generate } from '../api/generate';
 *
 * async function generateMapWithRetry(prompt: string): Promise<MapData> {
 *   const maxRetries = 3;
 *   let lastError: Error | null = null;
 *
 *   for (let i = 0; i < maxRetries; i++) {
 *     try {
 *       // withAPIContext 会确保即使失败也能恢复上下文
 *       return await withAPIContext('realWorld', async () => {
 *         const text = await generate({
 *           user_input: prompt,
 *           should_stream: false,
 *         });
 *
 *         if (!text || text.trim() === '') {
 *           throw new Error('AI 返回了空内容');
 *         }
 *
 *         return parseMapData(text);
 *       });
 *     } catch (error) {
 *       lastError = error as Error;
 *       console.warn(`生成失败 (尝试 ${i + 1}/${maxRetries}):`, error);
 *
 *       // 等待一段时间后重试
 *       if (i < maxRetries - 1) {
 *         await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
 *       }
 *     }
 *   }
 *
 *   // 所有重试都失败
 *   toastr.error('地图生成失败，请稍后重试');
 *   throw lastError || new Error('地图生成失败');
 * }
 * ```
 *
 * ### 示例 4：处理 API 配置不可用的情况
 *
 * ```typescript
 * import { withAPIContext } from '../utils/apiContext';
 * import { generate } from '../api/generate';
 *
 * async function safeGenerate(prompt: string): Promise<string | null> {
 *   try {
 *     return await withAPIContext('realWorld', async () => {
 *       return await generate({
 *         user_input: prompt,
 *         should_stream: false,
 *       });
 *     });
 *   } catch (error) {
 *     // withAPIContext 内部已经处理了上下文恢复
 *     // 这里只需要处理业务逻辑错误
 *
 *     if (error instanceof Error) {
 *       if (error.message.includes('API 配置')) {
 *         toastr.error('API 配置错误，请检查设置');
 *         console.error('API 配置错误:', error);
 *       } else if (error.message.includes('网络')) {
 *         toastr.error('网络错误，请检查连接');
 *         console.error('网络错误:', error);
 *       } else {
 *         toastr.error('生成失败，请重试');
 *         console.error('未知错误:', error);
 *       }
 *     }
 *
 *     return null;
 *   }
 * }
 * ```
 *
 * ---
 *
 * ## 嵌套上下文
 *
 * ### 示例 5：嵌套调用（两层）
 *
 * ```typescript
 * import { withAPIContext } from '../utils/apiContext';
 * import { generate } from '../api/generate';
 *
 * async function generateComplexScene(): Promise<Scene> {
 *   // 外层：使用 realWorld API 生成现实场景
 *   return await withAPIContext('realWorld', async () => {
 *     console.log('L1: 生成现实场景框架');
 *
 *     const realWorldPrompt = '生成一个现代城市场景框架';
 *     const framework = await generate({
 *       user_input: realWorldPrompt,
 *       should_stream: false,
 *     });
 *
 *     // 内层：临时切换到 innerWorld API 生成奇幻元素
 *     const fantasyElements = await withAPIContext('innerWorld', async () => {
 *       console.log('L2: 生成奇幻元素');
 *
 *       const innerWorldPrompt = '为场景添加神秘的奇幻元素';
 *       return await generate({
 *         user_input: innerWorldPrompt,
 *         should_stream: false,
 *       });
 *     });
 *
 *     console.log('L1: 恢复到 realWorld，合并结果');
 *
 *     // 此时已恢复到 realWorld API
 *     return {
 *       framework: parseFramework(framework),
 *       fantasyElements: parseElements(fantasyElements),
 *     };
 *   });
 * }
 * ```
 *
 * ### 示例 6：多层嵌套（三层）
 *
 * ```typescript
 * import { withAPIContext } from '../utils/apiContext';
 * import { generate } from '../api/generate';
 *
 * async function generateMultiLayerContent(): Promise<Content> {
 *   return await withAPIContext('realWorld', async () => {
 *     console.log('L1: realWorld - 生成基础内容');
 *     const base = await generate({ user_input: '基础内容' });
 *
 *     const enhanced = await withAPIContext('innerWorld', async () => {
 *       console.log('L2: innerWorld - 增强内容');
 *       const middle = await generate({ user_input: '增强内容' });
 *
 *       const special = await withAPIContext('sanctuary', async () => {
 *         console.log('L3: sanctuary - 添加特殊元素');
 *         return await generate({ user_input: '特殊元素' });
 *       });
 *
 *       console.log('L2: 恢复到 innerWorld');
 *       return { middle, special };
 *     });
 *
 *     console.log('L1: 恢复到 realWorld');
 *     return { base, enhanced };
 *   });
 * }
 * ```
 *
 * ---
 *
 * ## 性能优化
 *
 * ### 示例 7：批量生成时的性能优化
 *
 * ```typescript
 * import { withAPIContext } from '../utils/apiContext';
 * import { generate } from '../api/generate';
 *
 * async function batchGenerateNPCs(configs: NPCConfig[]): Promise<NPC[]> {
 *   // 按世界类型分组，减少上下文切换次数
 *   const groupedConfigs = _.groupBy(configs, config => {
 *     if (config.is_sanctuary) return 'sanctuary';
 *     if (config.is_inner_world) return 'innerWorld';
 *     return 'realWorld';
 *   });
 *
 *   const results: NPC[] = [];
 *
 *   // 为每个世界类型执行一次上下文切换
 *   for (const [worldType, worldConfigs] of Object.entries(groupedConfigs)) {
 *     const worldNPCs = await withAPIContext(worldType as WorldType, async () => {
 *       console.log(`批量生成 ${worldConfigs.length} 个 ${worldType} NPC`);
 *
 *       // 在同一个上下文中并发生成多个 NPC
 *       return await Promise.all(
 *         worldConfigs.map(async config => {
 *           const text = await generate({
 *             user_input: buildNPCPrompt(config),
 *             should_stream: false,
 *           });
 *           return parseNPC(text);
 *         })
 *       );
 *     });
 *
 *     results.push(...worldNPCs);
 *   }
 *
 *   return results;
 * }
 * ```
 *
 * ### 示例 8：使用调试模式分析性能
 *
 * ```typescript
 * import { withAPIContext, enableDebugMode, setSlowThreshold } from '../utils/apiContext';
 * import { generate } from '../api/generate';
 *
 * async function debugPerformance(): Promise<void> {
 *   // 启用调试模式，查看详细日志
 *   enableDebugMode();
 *
 *   // 设置慢操作阈值为 500ms
 *   setSlowThreshold(500);
 *
 *   await withAPIContext('realWorld', async () => {
 *     console.log('开始性能测试...');
 *
 *     // 如果这个操作超过 500ms，会在日志中标记为慢操作
 *     const result = await generate({
 *       user_input: '生成一个复杂的场景',
 *       should_stream: false,
 *     });
 *
 *     console.log('性能测试完成');
 *     return result;
 *   });
 *
 *   // 测试完成后可以禁用调试模式
 *   // disableDebugMode();
 * }
 * ```
 *
 * ---
 *
 * ## 最佳实践
 *
 * ### 何时使用 withAPIContext
 *
 * **应该使用的场景：**
 * 1. ✅ 服务方法需要使用特定的 AI 模型
 *    - 地图生成服务（realWorldMapService、instanceMapService）
 *    - NPC 生成服务（npcGenerationCoordinator）
 *    - 场景描述生成服务
 *
 * 2. ✅ 需要确保 AI 输出的一致性
 *    - 同一类型的内容应该由同一个 AI 生成
 *    - 避免因玩家切换世界导致生成风格变化
 *
 * 3. ✅ 需要根据内容类型动态选择 AI
 *    - 根据 NPC 所在世界选择 API
 *    - 根据任务类型选择 API
 *
 * **不应该使用的场景：**
 * 1. ❌ 玩家主动触发的对话生成
 *    - 应该使用玩家当前世界的 API
 *    - 让 apiAutoSwitchService 自动处理
 *
 * 2. ❌ 不需要特定 AI 的简单操作
 *    - 数据解析、格式转换等
 *    - 不涉及 AI 生成的操作
 *
 * 3. ❌ 已经在正确上下文中的操作
 *    - 如果当前世界已经是目标世界，withAPIContext 会自动优化
 *    - 但如果确定不需要切换，可以直接调用 generate
 *
 * ### 如何选择目标世界
 *
 * **选择原则：**
 * - `realWorld`: 需要逻辑性、真实性的内容
 *   - 现实世界地图、现代城市场景
 *   - 科学解释、历史事件
 *   - 现实世界的 NPC（普通人）
 *
 * - `innerWorld`: 需要创意性、奇幻性的内容
 *   - 里世界地图、奇幻场景
 *   - 魔法系统、神秘事件
 *   - 里世界的 NPC（怪物、魔法师）
 *
 * - `sanctuary`: 需要平衡性的内容
 *   - 归所场景、过渡区域
 *   - 中立 NPC、商人
 *   - 系统提示、教程内容
 *
 * **动态选择示例：**
 * ```typescript
 * function selectWorldForContent(content: Content): WorldType {
 *   // 根据内容标签选择
 *   if (content.tags.includes('fantasy') || content.tags.includes('magic')) {
 *     return 'innerWorld';
 *   }
 *
 *   if (content.tags.includes('realistic') || content.tags.includes('modern')) {
 *     return 'realWorld';
 *   }
 *
 *   // 根据内容位置选择
 *   if (content.location?.world_type) {
 *     return content.location.world_type;
 *   }
 *
 *   // 默认使用归所
 *   return 'sanctuary';
 * }
 * ```
 *
 * ### 错误处理建议
 *
 * **1. 信任 withAPIContext 的上下文恢复**
 * ```typescript
 * // ✅ 好的做法：只处理业务逻辑错误
 * try {
 *   const result = await withAPIContext('realWorld', async () => {
 *     return await generate({ user_input: prompt });
 *   });
 *   return result;
 * } catch (error) {
 *   // withAPIContext 已经恢复了上下文
 *   // 这里只需要处理业务错误
 *   handleBusinessError(error);
 * }
 *
 * // ❌ 不好的做法：尝试手动恢复上下文
 * try {
 *   const result = await withAPIContext('realWorld', async () => {
 *     return await generate({ user_input: prompt });
 *   });
 *   return result;
 * } catch (error) {
 *   // 不需要手动切换回原世界，withAPIContext 已经处理了
 *   // apiConfigService.switchToSanctuary(); // ❌ 多余的操作
 *   handleBusinessError(error);
 * }
 * ```
 *
 * **2. 提供有意义的错误信息**
 * ```typescript
 * // ✅ 好的做法：区分不同类型的错误
 * try {
 *   return await withAPIContext('realWorld', async () => {
 *     return await generate({ user_input: prompt });
 *   });
 * } catch (error) {
 *   if (error instanceof NetworkError) {
 *     toastr.error('网络连接失败，请检查网络');
 *     throw new Error('网络错误：无法连接到 AI 服务');
 *   } else if (error instanceof APIError) {
 *     toastr.error('AI 服务暂时不可用，请稍后重试');
 *     throw new Error('API 错误：' + error.message);
 *   } else {
 *     toastr.error('生成失败，请重试');
 *     throw error;
 *   }
 * }
 * ```
 *
 * **3. 实现重试机制**
 * ```typescript
 * // ✅ 好的做法：在 withAPIContext 外部实现重试
 * async function generateWithRetry(prompt: string, maxRetries = 3): Promise<string> {
 *   for (let i = 0; i < maxRetries; i++) {
 *     try {
 *       return await withAPIContext('realWorld', async () => {
 *         return await generate({ user_input: prompt });
 *       });
 *     } catch (error) {
 *       if (i === maxRetries - 1) throw error;
 *       await delay(1000 * (i + 1)); // 指数退避
 *     }
 *   }
 *   throw new Error('所有重试都失败');
 * }
 * ```
 *
 * ### 性能优化建议
 *
 * **1. 批量操作时减少上下文切换**
 * ```typescript
 * // ✅ 好的做法：按世界类型分组
 * async function batchGenerate(items: Item[]): Promise<Result[]> {
 *   const grouped = _.groupBy(items, item => item.worldType);
 *   const results: Result[] = [];
 *
 *   for (const [worldType, worldItems] of Object.entries(grouped)) {
 *     // 每个世界类型只切换一次
 *     const worldResults = await withAPIContext(worldType as WorldType, async () => {
 *       return await Promise.all(worldItems.map(item => generateItem(item)));
 *     });
 *     results.push(...worldResults);
 *   }
 *
 *   return results;
 * }
 *
 * // ❌ 不好的做法：每个项目都切换一次
 * async function batchGenerate(items: Item[]): Promise<Result[]> {
 *   return await Promise.all(
 *     items.map(item =>
 *       // 每个项目都会触发上下文切换
 *       withAPIContext(item.worldType, async () => generateItem(item))
 *     )
 *   );
 * }
 * ```
 *
 * **2. 避免不必要的嵌套**
 * ```typescript
 * // ✅ 好的做法：扁平化调用
 * async function generateContent(): Promise<Content> {
 *   const part1 = await withAPIContext('realWorld', async () => generatePart1());
 *   const part2 = await withAPIContext('innerWorld', async () => generatePart2());
 *   return { part1, part2 };
 * }
 *
 * // ❌ 不好的做法：不必要的嵌套
 * async function generateContent(): Promise<Content> {
 *   return await withAPIContext('realWorld', async () => {
 *     const part1 = await generatePart1();
 *     // 不需要嵌套，因为 part2 不依赖 realWorld 上下文
 *     const part2 = await withAPIContext('innerWorld', async () => generatePart2());
 *     return { part1, part2 };
 *   });
 * }
 * ```
 *
 * **3. 使用调试模式分析性能瓶颈**
 * ```typescript
 * import { enableDebugMode, setSlowThreshold, getLogConfig } from '../utils/apiContext';
 *
 * // 开发环境启用调试
 * if (process.env.NODE_ENV === 'development') {
 *   enableDebugMode();
 *   setSlowThreshold(500); // 500ms 以上标记为慢操作
 * }
 *
 * // 生产环境可以动态启用
 * function enablePerformanceMonitoring(): void {
 *   enableDebugMode();
 *   console.log('性能监控已启用:', getLogConfig());
 * }
 * ```
 *
 * ---
 *
 * ## 常见问题
 *
 * ### Q1: withAPIContext 会影响玩家手动切换世界吗？
 * A: 不会。withAPIContext 只在服务方法执行期间临时切换上下文，执行完成后会
 *    立即恢复。玩家的手动切换操作不受影响。
 *
 * ### Q2: 可以在 withAPIContext 回调中再次调用 withAPIContext 吗？
 * A: 可以。系统支持嵌套调用，内层上下文结束时会恢复到外层上下文。
 *
 * ### Q3: 如果回调函数抛出错误，上下文会恢复吗？
 * A: 会。withAPIContext 使用 try-finally 模式，确保无论成功或失败都会恢复上下文。
 *
 * ### Q4: withAPIContext 的性能开销大吗？
 * A: 很小。如果当前已在目标世界，会自动跳过切换。切换操作本身也很轻量，
 *    通常在 50ms 以内完成。
 *
 * ### Q5: 可以在前端界面中使用 withAPIContext 吗？
 * A: 可以，但通常不推荐。前端界面应该使用玩家当前世界的 API。withAPIContext
 *    主要用于后台服务，确保特定任务使用特定的 AI。
 *
 * ### Q6: 如何调试上下文切换问题？
 * A: 使用 `enableDebugMode()` 启用详细日志，可以看到每次切换的详细信息，
 *    包括上下文栈状态、配置应用详情、性能统计等。
 *
 * ---
 *
 * ## 相关接口
 *
 * - {@link withAPIContext} - 主要函数，用于临时切换 API 上下文
 * - {@link apiContextManager} - 上下文管理器实例，用于高级用途
 * - {@link enableDebugMode} - 启用调试模式
 * - {@link disableDebugMode} - 禁用调试模式
 * - {@link setSlowThreshold} - 设置慢操作阈值
 * - {@link getLogConfig} - 获取当前日志配置
 * - {@link WorldType} - 世界类型定义
 *
 * @see {@link apiConfigService} - API 配置管理服务
 * @see {@link apiAutoSwitchService} - API 自动切换服务
 */
