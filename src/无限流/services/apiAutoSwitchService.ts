// API 自动切换服务 - 根据当前世界自动切换 API 配置

import type { APIConfig } from '../types/api';
import type { WorldType } from './apiConfigService';
import { apiConfigService } from './apiConfigService';

/**
 * 拦截器状态
 */
export interface InterceptorState {
  /** 拦截器是否启用 */
  enabled: boolean;
  /** 当前世界类型 */
  currentWorld: WorldType;
  /** 上次世界切换时间戳 */
  lastWorldChange: number;
  /** 请求计数 */
  requestCount: number;
  /** 错误计数 */
  errorCount: number;
}

/**
 * 日志条目
 */
export interface LogEntry {
  /** 时间戳 */
  timestamp: number;
  /** 日志级别 */
  level: 'info' | 'warn' | 'error';
  /** 日志消息 */
  message: string;
  /** 世界类型（可选） */
  world?: WorldType;
  /** API 配置摘要（可选） */
  apiConfig?: Partial<APIConfig>;
  /** 错误对象（可选） */
  error?: Error;
}

/**
 * 世界检测结果
 */
export interface WorldDetectionResult {
  /** 检测到的世界类型 */
  world: WorldType;
  /** 检测置信度 */
  confidence: 'high' | 'medium' | 'low';
  /** 检测来源 */
  source: 'mvu' | 'service' | 'default';
}

/**
 * 世界检测器类
 * 负责从不同来源检测当前世界类型
 */
class WorldDetector {
  /**
   * 从 MVU 变量检测世界
   * 读取 Mvu.getMvuData({ type: 'chat' }) 中的 current_area
   * 根据区域类型判断世界（sanctuary/innerWorld/realWorld）
   * 7.4 实现世界检测错误处理
   * - 捕获 MVU 读取失败
   * - 回退到默认世界
   * - 记录警告日志
   */
  async detectFromMVU(): Promise<WorldDetectionResult> {
    try {
      // 检查 Mvu 是否可用
      if (typeof Mvu === 'undefined') {
        console.warn('[World Detector] MVU 变量框架不可用，回退到默认世界');
        return {
          world: 'realWorld',
          confidence: 'low',
          source: 'default',
        };
      }

      // 等待 MVU 初始化完成
      try {
        await waitGlobalInitialized('Mvu');
      } catch (error) {
        console.warn('[World Detector] 等待 MVU 初始化失败:', error);
        return {
          world: 'realWorld',
          confidence: 'low',
          source: 'default',
        };
      }

      // 从 MVU 变量读取聊天数据
      let mvuData: any;
      try {
        mvuData = Mvu.getMvuData({ type: 'chat' });
      } catch (error) {
        // 捕获 MVU 读取失败
        console.warn('[World Detector] MVU 读取失败:', error);
        return {
          world: 'realWorld',
          confidence: 'low',
          source: 'default',
        };
      }

      if (!mvuData || !mvuData.stat_data) {
        console.warn('[World Detector] MVU 数据不可用，回退到默认世界');
        return {
          world: 'realWorld',
          confidence: 'low',
          source: 'default',
        };
      }

      // 从 stat_data 中读取 current_area
      const currentArea = mvuData.stat_data.current_area;

      if (!currentArea) {
        console.warn('[World Detector] MVU 数据中未找到 current_area，回退到默认世界');
        return {
          world: 'realWorld',
          confidence: 'low',
          source: 'default',
        };
      }

      const area = currentArea as { type?: string; is_inner_world?: boolean; [key: string]: any };

      // 根据区域类型判断世界
      // 1. 如果区域类型是 sanctuary，则为归所
      if (area.type === 'sanctuary') {
        console.log('[World Detector] 从 MVU 检测到世界: sanctuary');
        return {
          world: 'sanctuary',
          confidence: 'high',
          source: 'mvu',
        };
      }

      // 2. 如果区域标记为里世界，则为里世界副本
      if (area.is_inner_world === true) {
        console.log('[World Detector] 从 MVU 检测到世界: innerWorld');
        return {
          world: 'innerWorld',
          confidence: 'high',
          source: 'mvu',
        };
      }

      // 3. 否则为现实世界
      console.log('[World Detector] 从 MVU 检测到世界: realWorld');
      return {
        world: 'realWorld',
        confidence: 'high',
        source: 'mvu',
      };
    } catch (error) {
      // 捕获所有未预期的错误
      console.error('[World Detector] 从 MVU 检测世界时发生未预期的错误:', error);

      // 回退到默认世界
      return {
        world: 'realWorld',
        confidence: 'low',
        source: 'default',
      };
    }
  }

  /**
   * 从 apiConfigService 检测世界
   * 作为 MVU 检测失败时的备用方案
   */
  detectFromService(): WorldDetectionResult {
    try {
      // 调用 apiConfigService.getCurrentWorld() 获取当前世界
      const currentWorld = apiConfigService.getCurrentWorld();

      if (currentWorld) {
        console.log(`[World Detector] 从 Service 检测到世界: ${currentWorld}`);
        return {
          world: currentWorld,
          confidence: 'medium',
          source: 'service',
        };
      }

      // 如果没有获取到世界，返回默认值
      console.warn('[World Detector] Service 未返回世界类型，使用默认值');
      return {
        world: 'realWorld',
        confidence: 'low',
        source: 'default',
      };
    } catch (error) {
      console.error('[World Detector] 从 Service 检测世界失败:', error);
      return {
        world: 'realWorld',
        confidence: 'low',
        source: 'default',
      };
    }
  }

  /**
   * 综合检测（优先级：MVU > Service > Default）
   * 按优先级尝试不同检测方法，实现错误处理和日志记录
   */
  async detect(): Promise<WorldDetectionResult> {
    console.log('[World Detector] 开始综合检测世界...');

    // 1. 优先尝试从 MVU 变量检测（最高优先级）
    try {
      const mvuResult = await this.detectFromMVU();

      // 如果 MVU 检测成功且置信度高，直接返回结果
      if (mvuResult.source === 'mvu' && mvuResult.confidence === 'high') {
        console.log(`[World Detector] MVU 检测成功: ${mvuResult.world} (置信度: ${mvuResult.confidence})`);
        return mvuResult;
      }

      // 如果 MVU 检测失败（返回默认值），记录警告并继续尝试其他方法
      if (mvuResult.source === 'default') {
        console.warn('[World Detector] MVU 检测失败，尝试备用方案');
      }
    } catch (error) {
      console.error('[World Detector] MVU 检测过程中发生异常:', error);
    }

    // 2. 尝试从 apiConfigService 检测（中等优先级）
    try {
      const serviceResult = this.detectFromService();

      // 如果 Service 检测成功，返回结果
      if (serviceResult.source === 'service' && serviceResult.confidence === 'medium') {
        console.log(`[World Detector] Service 检测成功: ${serviceResult.world} (置信度: ${serviceResult.confidence})`);
        return serviceResult;
      }

      // 如果 Service 检测失败，记录警告
      if (serviceResult.source === 'default') {
        console.warn('[World Detector] Service 检测失败，使用默认世界');
      }
    } catch (error) {
      console.error('[World Detector] Service 检测过程中发生异常:', error);
    }

    // 3. 所有检测方法都失败，返回默认世界（最低优先级）
    console.warn('[World Detector] 所有检测方法都失败，回退到默认世界: realWorld');
    return {
      world: 'realWorld',
      confidence: 'low',
      source: 'default',
    };
  }
}

/**
 * 配置解析器类
 * 负责获取和缓存 API 配置，提高性能
 */
class ConfigResolver {
  /** 配置缓存 Map，键为世界类型，值为 API 配置或 null */
  private cache = new Map<WorldType, APIConfig | null>();

  /** 缓存时间戳 Map，键为世界类型，值为缓存时间戳 */
  private cacheTimestamp = new Map<WorldType, number>();

  /** 缓存有效期（毫秒），默认 5 分钟 */
  private cacheTTL = 5 * 60 * 1000;

  /**
   * 获取配置（带缓存）
   * 检查缓存是否有效，如果有效则返回缓存，否则从 apiConfigService 加载
   * 7.2 实现配置错误处理
   * - 捕获配置加载失败
   * - 捕获配置验证失败
   * - 回退到默认 API
   */
  getConfig(world: WorldType): APIConfig | null {
    try {
      // 检查缓存是否有效
      const timestamp = this.cacheTimestamp.get(world);
      const now = Date.now();

      if (timestamp && now - timestamp < this.cacheTTL) {
        // 缓存有效，返回缓存的配置
        const cached = this.cache.get(world);
        console.log(`[Config Resolver] 使用缓存配置: ${world}`);
        return cached ?? null;
      }

      // 缓存无效或不存在，从 apiConfigService 加载配置
      let config: APIConfig | null = null;

      try {
        config = apiConfigService.getWorldAPI(world);
      } catch (error) {
        // 捕获配置加载失败
        console.error(`[Config Resolver] 加载 ${world} 配置失败:`, error);
        toastr.warning(`加载 ${world} API 配置失败，将使用默认 API`);

        // 回退到默认 API（返回 null）
        config = null;
      }

      // 如果配置存在，验证配置有效性
      if (config) {
        try {
          const validation = apiConfigService.validateConfig(config);

          if (!validation.valid) {
            // 捕获配置验证失败
            console.error(`[Config Resolver] ${world} 配置验证失败:`, validation.errors);
            toastr.error(`${world} API 配置无效: ${validation.errors.join('; ')}，将使用默认 API`);

            // 回退到默认 API（返回 null）
            config = null;
          }
        } catch (error) {
          console.error(`[Config Resolver] 验证 ${world} 配置时发生错误:`, error);
          toastr.warning(`验证 ${world} API 配置时发生错误，将使用默认 API`);

          // 回退到默认 API（返回 null）
          config = null;
        }
      }

      // 更新缓存和时间戳
      this.cache.set(world, config);
      this.cacheTimestamp.set(world, now);

      console.log(`[Config Resolver] 加载并缓存配置: ${world}`, config ? '有自定义配置' : '使用默认 API');
      return config;
    } catch (error) {
      // 捕获所有未预期的错误
      console.error(`[Config Resolver] 获取 ${world} 配置时发生未预期的错误:`, error);
      toastr.error(`获取 ${world} API 配置失败，将使用默认 API`);

      // 回退到默认 API（返回 null）
      return null;
    }
  }

  /**
   * 清除缓存
   * @param world 可选，指定要清除的世界类型。如果不指定，则清除所有缓存
   */
  clearCache(world?: WorldType): void {
    if (world) {
      // 清除指定世界的缓存
      this.cache.delete(world);
      this.cacheTimestamp.delete(world);
      console.log(`[Config Resolver] 清除缓存: ${world}`);
    } else {
      // 清除所有缓存
      this.cache.clear();
      this.cacheTimestamp.clear();
      console.log('[Config Resolver] 清除所有缓存');
    }
  }

  /**
   * 预加载所有配置
   * 在初始化时预加载所有世界的配置，提高首次请求的响应速度
   */
  async preloadConfigs(): Promise<void> {
    console.log('[Config Resolver] 开始预加载所有世界的配置...');

    const worlds: WorldType[] = ['realWorld', 'innerWorld', 'sanctuary'];

    for (const world of worlds) {
      try {
        // 调用 getConfig 会自动缓存配置
        const config = this.getConfig(world);
        console.log(`[Config Resolver] 预加载 ${world} 配置:`, config ? '有自定义配置' : '使用默认 API');
      } catch (error) {
        console.error(`[Config Resolver] 预加载 ${world} 配置失败:`, error);
        // 继续预加载其他世界的配置
      }
    }

    console.log('[Config Resolver] 配置预加载完成');
  }
}

/**
 * 请求修改器类
 * 负责将 API 配置应用到请求中
 */
class RequestModifier {
  /**
   * 应用配置到 generate 请求
   * 检查是否有自定义配置，验证配置有效性，构建 custom_api 对象，保留原始请求参数
   */
  applyToGenerate(config: GenerateConfig, apiConfig: APIConfig | null): GenerateConfig {
    // 如果请求中已经有 custom_api，说明是手动指定的（如 testConnection），不覆盖
    if (config.custom_api) {
      console.log('[Request Modifier] 请求已有 custom_api，保留原始配置');
      return config;
    }

    // 如果没有自定义配置，直接返回原始配置
    if (!apiConfig) {
      console.log('[Request Modifier] 无自定义配置，使用默认 API');
      return config;
    }

    // 验证配置有效性
    const validation = apiConfigService.validateConfig(apiConfig);
    if (!validation.valid) {
      console.error('[Request Modifier] 配置无效:', validation.errors);
      toastr.error(`API 配置无效: ${validation.errors.join('; ')}`);
      // 配置无效时返回原始配置，使用默认 API
      return config;
    }

    // 构建 custom_api 对象，应用自定义配置
    const modifiedConfig: GenerateConfig = {
      ...config, // 保留原始请求参数
      custom_api: {
        apiurl: apiConfig.apiurl,
        key: apiConfig.key,
        model: apiConfig.model,
        temperature: apiConfig.temperature,
        max_tokens: apiConfig.max_tokens,
        source: 'openai', // 默认使用 OpenAI 格式
      },
    };

    console.log('[Request Modifier] 已应用自定义 API 配置到 generate 请求:', {
      model: apiConfig.model,
      apiurl: apiConfig.apiurl.substring(0, 30) + '...',
      temperature: apiConfig.temperature,
      max_tokens: apiConfig.max_tokens,
    });

    return modifiedConfig;
  }

  /**
   * 应用配置到 generateRaw 请求
   * 与 generate 类似的逻辑，处理 ordered_prompts 等特殊参数
   */
  applyToGenerateRaw(config: GenerateRawConfig, apiConfig: APIConfig | null): GenerateRawConfig {
    // 如果请求中已经有 custom_api，说明是手动指定的（如 testConnection），不覆盖
    if (config.custom_api) {
      console.log('[Request Modifier] 请求已有 custom_api，保留原始配置');
      return config;
    }

    // 如果没有自定义配置，直接返回原始配置
    if (!apiConfig) {
      console.log('[Request Modifier] 无自定义配置，使用默认 API');
      return config;
    }

    // 验证配置有效性
    const validation = apiConfigService.validateConfig(apiConfig);
    if (!validation.valid) {
      console.error('[Request Modifier] 配置无效:', validation.errors);
      toastr.error(`API 配置无效: ${validation.errors.join('; ')}`);
      // 配置无效时返回原始配置，使用默认 API
      return config;
    }

    // 构建 custom_api 对象，应用自定义配置
    // 保留原始请求参数，包括 ordered_prompts 等特殊参数
    const modifiedConfig: GenerateRawConfig = {
      ...config, // 保留所有原始请求参数（包括 ordered_prompts）
      custom_api: {
        apiurl: apiConfig.apiurl,
        key: apiConfig.key,
        model: apiConfig.model,
        temperature: apiConfig.temperature,
        max_tokens: apiConfig.max_tokens,
        source: 'openai', // 默认使用 OpenAI 格式
      },
    };

    console.log('[Request Modifier] 已应用自定义 API 配置到 generateRaw 请求:', {
      model: apiConfig.model,
      apiurl: apiConfig.apiurl.substring(0, 30) + '...',
      temperature: apiConfig.temperature,
      max_tokens: apiConfig.max_tokens,
      has_ordered_prompts: !!config.ordered_prompts,
    });

    return modifiedConfig;
  }

  /**
   * 验证修改后的配置
   * 调用 apiConfigService.validateConfig() 处理验证失败情况
   */
  validate(config: GenerateConfig | GenerateRawConfig): boolean {
    // 如果没有 custom_api，说明使用默认 API，无需验证
    if (!config.custom_api) {
      console.log('[Request Modifier] 使用默认 API，无需验证');
      return true;
    }

    // 构建 APIConfig 对象用于验证
    const apiConfig: APIConfig = {
      apiurl: config.custom_api.apiurl,
      key: config.custom_api.key || '',
      model: config.custom_api.model,
      temperature: config.custom_api.temperature || 1.0,
      max_tokens: config.custom_api.max_tokens || 2000,
    };

    // 调用 apiConfigService.validateConfig() 验证配置
    const validation = apiConfigService.validateConfig(apiConfig);

    if (!validation.valid) {
      console.error('[Request Modifier] 配置验证失败:', validation.errors);
      toastr.error(`API 配置验证失败: ${validation.errors.join('; ')}`);
      return false;
    }

    console.log('[Request Modifier] 配置验证通过');
    return true;
  }
}

/**
 * API 自动切换服务类
 * 负责拦截 AI 生成请求并根据当前世界自动应用对应的 API 配置
 */
class APIAutoSwitchService {
  /** 服务是否已初始化 */
  private initialized = false;

  /** 当前世界类型 */
  private currentWorld: WorldType = 'realWorld';

  /** 拦截器状态 */
  private state: InterceptorState = {
    enabled: false,
    currentWorld: 'realWorld',
    lastWorldChange: Date.now(),
    requestCount: 0,
    errorCount: 0,
  };

  /** 原始 generate 函数引用 */
  private originalGenerate: typeof generate | null = null;

  /** 原始 generateRaw 函数引用 */
  private originalGenerateRaw: typeof generateRaw | null = null;

  /** 世界检测器实例 */
  private worldDetector = new WorldDetector();

  /** 配置解析器实例 */
  private configResolver = new ConfigResolver();

  /** 请求修改器实例 */
  private requestModifier = new RequestModifier();

  /** MVU 事件监听器清理函数 */
  private mvuEventCleanup: (() => void) | null = null;

  /** 12.3 调试模式开关 */
  private debugMode = false;

  /**
   * 初始化服务
   * 7.1 实现初始化错误处理
   * - 捕获 apiConfigService 初始化失败
   * - 捕获 MVU 不可用错误
   * - 显示用户友好的错误提示
   * - 不阻止应用启动
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[API Auto Switch] 已经初始化，跳过');
      return;
    }

    try {
      console.log('[API Auto Switch] 开始初始化...');

      // 初始化 apiConfigService
      try {
        await apiConfigService.initialize();
        console.log('[API Auto Switch] apiConfigService 初始化完成');
      } catch (error) {
        // 捕获 apiConfigService 初始化失败
        console.error('[API Auto Switch] apiConfigService 初始化失败:', error);
        toastr.warning('API 配置服务初始化失败，将使用默认 API');

        this.log({
          level: 'error',
          message: 'apiConfigService 初始化失败',
          error: error instanceof Error ? error : new Error(String(error)),
        });

        // 不阻止应用启动，继续初始化其他组件
      }

      // 10.3 懒加载优化：初始化时检测一次当前世界
      try {
        this.currentWorld = await this.detectCurrentWorld();
        this.state.currentWorld = this.currentWorld;
        console.log(`[API Auto Switch] 初始世界检测完成: ${this.currentWorld}`);
      } catch (error) {
        console.error('[API Auto Switch] 初始世界检测失败:', error);
        // 使用默认世界
        this.currentWorld = 'realWorld';
        this.state.currentWorld = 'realWorld';
      }

      // 预加载所有世界的配置
      try {
        await this.configResolver.preloadConfigs();
        console.log('[API Auto Switch] 配置预加载完成');
      } catch (error) {
        console.error('[API Auto Switch] 配置预加载失败:', error);
        toastr.warning('API 配置预加载失败，将在首次使用时加载');

        this.log({
          level: 'warn',
          message: '配置预加载失败',
          error: error instanceof Error ? error : new Error(String(error)),
        });

        // 不阻止应用启动，配置将在首次使用时加载
      }

      // 设置拦截器
      try {
        this.setupInterceptors();
        console.log('[API Auto Switch] 拦截器设置完成');
      } catch (error) {
        console.error('[API Auto Switch] 拦截器设置失败:', error);
        toastr.error('API 自动切换拦截器设置失败');

        this.log({
          level: 'error',
          message: '拦截器设置失败',
          error: error instanceof Error ? error : new Error(String(error)),
        });

        // 拦截器设置失败是严重错误，但仍不阻止应用启动
        // 只是禁用自动切换功能
        this.state.enabled = false;
      }

      // 设置世界变更监听
      try {
        this.watchWorldChanges();
        console.log('[API Auto Switch] 世界变更监听设置完成');
      } catch (error) {
        // 捕获 MVU 不可用错误
        console.error('[API Auto Switch] 世界变更监听设置失败:', error);

        // 检查是否是 MVU 不可用导致的错误
        if (typeof Mvu === 'undefined') {
          console.warn('[API Auto Switch] MVU 变量框架不可用，自动切换功能将受限');
          toastr.info('MVU 变量框架不可用，API 自动切换功能将受限');
        } else {
          toastr.warning('世界变更监听设置失败，需要手动切换世界');
        }

        this.log({
          level: 'warn',
          message: '世界变更监听设置失败',
          error: error instanceof Error ? error : new Error(String(error)),
        });

        // 不阻止应用启动，用户可以手动切换世界
      }

      this.initialized = true;
      this.state.enabled = true;
      console.log('[API Auto Switch] 初始化完成');
      toastr.success('API 自动切换服务已启动');
    } catch (error) {
      // 捕获所有未预期的错误
      console.error('[API Auto Switch] 初始化过程中发生未预期的错误:', error);
      toastr.error('API 自动切换服务初始化失败，请检查控制台');

      this.log({
        level: 'error',
        message: '初始化过程中发生未预期的错误',
        error: error instanceof Error ? error : new Error(String(error)),
      });

      // 不阻止应用启动
      this.state.enabled = false;
    }
  }

  /**
   * 设置请求拦截器
   * 保存原始函数引用并用拦截函数覆盖全局函数
   */
  setupInterceptors(): void {
    console.log('[API Auto Switch] 开始设置请求拦截器...');

    // 5.1 保存原始函数引用
    // 在初始化时保存 window.generate 和 window.generateRaw
    // 确保引用不丢失
    if (typeof window.generate === 'function') {
      this.originalGenerate = window.generate;
      console.log('[API Auto Switch] 已保存原始 generate 函数引用');
    } else {
      console.warn('[API Auto Switch] window.generate 不可用');
    }

    if (typeof window.generateRaw === 'function') {
      this.originalGenerateRaw = window.generateRaw;
      console.log('[API Auto Switch] 已保存原始 generateRaw 函数引用');
    } else {
      console.warn('[API Auto Switch] window.generateRaw 不可用');
    }

    // 5.4 覆盖全局函数
    // 用拦截函数覆盖 window.generate 和 window.generateRaw
    if (this.originalGenerate) {
      window.generate = this.interceptGenerate.bind(this);
      console.log('[API Auto Switch] 已覆盖 window.generate');
    }

    if (this.originalGenerateRaw) {
      window.generateRaw = this.interceptGenerateRaw.bind(this);
      console.log('[API Auto Switch] 已覆盖 window.generateRaw');
    }

    console.log('[API Auto Switch] 请求拦截器设置完成');
  }

  /**
   * 恢复原始函数（清理时使用）
   */
  restoreOriginalFunctions(): void {
    console.log('[API Auto Switch] 开始恢复原始函数...');

    // 恢复原始 generate 函数
    if (this.originalGenerate) {
      window.generate = this.originalGenerate;
      console.log('[API Auto Switch] 已恢复原始 generate 函数');
      this.originalGenerate = null;
    }

    // 恢复原始 generateRaw 函数
    if (this.originalGenerateRaw) {
      window.generateRaw = this.originalGenerateRaw;
      console.log('[API Auto Switch] 已恢复原始 generateRaw 函数');
      this.originalGenerateRaw = null;
    }

    console.log('[API Auto Switch] 原始函数恢复完成');
  }

  /**
   * 检测当前世界
   * 使用 WorldDetector 综合检测当前世界类型（MVU > Service > Default）
   * 7.4 实现世界检测错误处理
   * - 捕获 MVU 读取失败
   * - 回退到默认世界
   * - 记录警告日志
   */
  async detectCurrentWorld(): Promise<WorldType> {
    try {
      const result = await this.worldDetector.detect();

      // 根据检测结果的置信度选择日志级别
      const logLevel = result.confidence === 'low' ? 'warn' : 'info';

      // 如果检测失败（使用默认值），记录警告
      if (result.source === 'default') {
        console.warn('[API Auto Switch] 世界检测失败，回退到默认世界: realWorld');

        this.log({
          level: 'warn',
          message: `世界检测失败，回退到默认世界: ${result.world} (来源: ${result.source}, 置信度: ${result.confidence})`,
          world: result.world,
        });
      } else {
        this.log({
          level: logLevel,
          message: `检测到世界: ${result.world} (来源: ${result.source}, 置信度: ${result.confidence})`,
          world: result.world,
        });
      }

      return result.world;
    } catch (error) {
      // 捕获所有未预期的错误
      console.error('[API Auto Switch] 世界检测过程中发生未预期的错误:', error);

      this.log({
        level: 'error',
        message: '世界检测过程中发生未预期的错误，回退到默认世界: realWorld',
        error: error instanceof Error ? error : new Error(String(error)),
      });

      // 回退到默认世界
      return 'realWorld';
    }
  }

  /**
   * 监听世界变更
   * 6.1 监听 MVU 变量变更事件
   * 6.2 实现世界切换处理逻辑
   * 6.3 实现手动世界切换支持
   */
  watchWorldChanges(): void {
    console.log('[API Auto Switch] 开始设置世界变更监听...');

    // 6.1 监听 MVU 变量变更事件
    // 使用 eventOn(Mvu.events.VARIABLE_UPDATE_ENDED) 监听
    // 检测 current_area 字段变更
    try {
      // 检查 MVU 是否可用
      if (typeof Mvu === 'undefined') {
        console.warn('[API Auto Switch] MVU 变量框架不可用，无法监听世界变更');
        return;
      }

      // 监听 MVU 变量更新结束事件
      // 当变量更新结束时，检查是否有世界切换
      const eventHandler = async (variables: Mvu.MvuData) => {
        // 检查 stat_data 中是否有 current_area
        if (variables.stat_data && variables.stat_data.current_area) {
          console.log('[API Auto Switch] 检测到 MVU 变量更新，检查世界变更');

          // 6.2 实现世界切换处理逻辑
          await this.handleWorldChange();
        }
      };

      // 注册事件监听器
      eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, eventHandler);
      console.log('[API Auto Switch] 已注册 MVU 变量变更监听器');

      // 保存清理函数，用于在服务清理时移除监听器
      this.mvuEventCleanup = () => {
        eventRemoveListener(Mvu.events.VARIABLE_UPDATE_ENDED, eventHandler);
        console.log('[API Auto Switch] 已移除 MVU 变量变更监听器');
      };
    } catch (error) {
      console.error('[API Auto Switch] 设置 MVU 变量变更监听失败:', error);
    }

    // 6.3 实现手动世界切换支持
    // 监听 apiConfigService 的切换方法调用
    // 同步更新 apiAutoSwitchService 状态
    try {
      // 保存原始的切换方法
      const originalSwitchToRealWorld = apiConfigService.switchToRealWorld.bind(apiConfigService);
      const originalSwitchToInnerWorld = apiConfigService.switchToInnerWorld.bind(apiConfigService);
      const originalSwitchToSanctuary = apiConfigService.switchToSanctuary.bind(apiConfigService);

      // 覆盖切换方法以监听手动切换
      apiConfigService.switchToRealWorld = async () => {
        console.log('[API Auto Switch] 检测到手动切换到现实世界');
        originalSwitchToRealWorld();
        await this.handleWorldChange();
      };

      apiConfigService.switchToInnerWorld = async () => {
        console.log('[API Auto Switch] 检测到手动切换到里世界');
        originalSwitchToInnerWorld();
        await this.handleWorldChange();
      };

      apiConfigService.switchToSanctuary = async () => {
        console.log('[API Auto Switch] 检测到手动切换到归所');
        originalSwitchToSanctuary();
        await this.handleWorldChange();
      };

      console.log('[API Auto Switch] 已设置手动世界切换监听');
    } catch (error) {
      console.error('[API Auto Switch] 设置手动世界切换监听失败:', error);
    }

    console.log('[API Auto Switch] 世界变更监听设置完成');
  }

  /**
   * 处理世界切换
   * 6.2 实现世界切换处理逻辑
   * - 比较新旧世界类型
   * - 更新 currentWorld 状态
   * - 清除配置缓存
   * - 触发切换事件
   * 12.2 添加 API 切换成功提示
   * - 在世界切换时显示 toastr 提示
   * - 显示切换到的世界和 API
   */
  private async handleWorldChange(): Promise<void> {
    try {
      console.log('[API Auto Switch] 开始处理世界切换...');

      // 保存旧世界类型
      const oldWorld = this.currentWorld;

      // 重新检测当前世界
      const newWorld = await this.detectCurrentWorld();

      // 比较新旧世界类型
      if (oldWorld === newWorld) {
        console.log(`[API Auto Switch] 世界未变更，仍为: ${newWorld}`);
        return;
      }

      console.log(`[API Auto Switch] 世界切换: ${oldWorld} → ${newWorld}`);

      // 更新 currentWorld 状态
      this.currentWorld = newWorld;
      this.state.currentWorld = newWorld;
      this.state.lastWorldChange = Date.now();

      // 清除配置缓存
      // 清除所有缓存以确保下次请求时重新加载配置
      this.configResolver.clearCache();
      console.log('[API Auto Switch] 已清除配置缓存');

      // 获取新世界的 API 配置
      const newConfig = this.configResolver.getConfig(newWorld);

      // 触发切换事件 - 记录日志
      this.log({
        level: 'info',
        message: `世界切换完成: ${oldWorld} → ${newWorld}`,
        world: newWorld,
        apiConfig: newConfig
          ? {
              model: newConfig.model,
              apiurl: newConfig.apiurl,
            }
          : undefined,
      });

      // 12.2 显示用户提示 - 包含世界和 API 信息
      const worldName = this.getWorldDisplayName(newWorld);
      const apiInfo = newConfig ? `自定义 API (${newConfig.model})` : '酒馆默认 API';

      toastr.success(`世界已切换到: ${worldName}<br>使用 API: ${apiInfo}`, '世界切换成功', {
        timeOut: 5000,
        extendedTimeOut: 2000,
        closeButton: true,
        progressBar: true,
      });

      console.log('[API Auto Switch] 世界切换处理完成');
    } catch (error) {
      console.error('[API Auto Switch] 处理世界切换失败:', error);

      this.log({
        level: 'error',
        message: '处理世界切换失败',
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  /**
   * 获取世界的显示名称
   */
  private getWorldDisplayName(world: WorldType): string {
    const displayNames: Record<WorldType, string> = {
      realWorld: '现实世界',
      innerWorld: '里世界副本',
      sanctuary: '归所',
    };
    return displayNames[world] || world;
  }

  /**
   * 获取当前世界的 API 配置
   * 使用 ConfigResolver 获取配置（带缓存）
   * 10.3 懒加载优化：避免不必要的日志记录
   */
  getCurrentAPIConfig(): APIConfig | null {
    try {
      // 使用 ConfigResolver 获取当前世界的配置（内部有缓存机制）
      const config = this.configResolver.getConfig(this.currentWorld);

      // 10.3 懒加载优化：只在配置实际加载时记录详细日志
      // ConfigResolver 内部已经记录了缓存命中/未命中的日志
      // 这里只记录简单的信息级别日志
      if (config) {
        console.log(`[API Auto Switch] 使用 ${this.currentWorld} 的自定义 API 配置`);
      } else {
        console.log(`[API Auto Switch] ${this.currentWorld} 使用默认 API`);
      }

      return config;
    } catch (error) {
      this.log({
        level: 'error',
        message: `获取 ${this.currentWorld} 的 API 配置失败`,
        world: this.currentWorld,
        error: error instanceof Error ? error : new Error(String(error)),
      });

      // 返回 null，使用默认 API
      return null;
    }
  }

  /**
   * 5.2 拦截 generate 函数
   * 检测当前世界、获取 API 配置、应用配置到请求、调用原始函数、处理错误和日志
   * 7.3 实现请求错误处理
   * - 捕获 API 请求失败
   * - 记录详细错误信息
   * - 向上抛出错误让调用者处理
   * 10.3 懒加载优化
   * - 只在需要时检测世界（使用缓存的 currentWorld）
   * - 只在需要时加载配置（使用 ConfigResolver 的缓存）
   * 12.3 调试模式支持
   * - 在控制台显示拦截的请求信息
   * - 显示配置应用详情
   */
  private async interceptGenerate(config: GenerateConfig): Promise<string> {
    try {
      // 增加请求计数
      this.state.requestCount++;

      // 10.3 懒加载优化：减少不必要的日志记录，只在关键点记录
      console.log(`[API Auto Switch] 拦截 generate 请求 #${this.state.requestCount}`);

      // 12.3 调试模式：显示原始请求信息
      if (this.debugMode) {
        console.group(`[API Auto Switch Debug] generate 请求 #${this.state.requestCount}`);
        console.log('原始请求配置:', {
          user_input:
            config.user_input?.substring(0, 100) + (config.user_input && config.user_input.length > 100 ? '...' : ''),
          should_stream: config.should_stream,
          has_custom_api: !!config.custom_api,
        });
      }

      // 1. 使用缓存的当前世界（懒加载优化：避免每次请求都重新检测）
      // 世界检测只在初始化和世界变更时进行
      // 这里直接使用 this.currentWorld，它会在 handleWorldChange() 中更新
      this.state.currentWorld = this.currentWorld;

      // 12.3 调试模式：显示当前世界
      if (this.debugMode) {
        console.log('当前世界:', this.currentWorld);
      }

      // 2. 获取 API 配置（懒加载优化：ConfigResolver 内部有缓存机制）
      const apiConfig = this.getCurrentAPIConfig();

      // 12.3 调试模式：显示 API 配置
      if (this.debugMode) {
        if (apiConfig) {
          console.log('应用自定义 API 配置:', {
            model: apiConfig.model,
            apiurl: apiConfig.apiurl.substring(0, 50) + '...',
            temperature: apiConfig.temperature,
            max_tokens: apiConfig.max_tokens,
          });
        } else {
          console.log('使用酒馆默认 API');
        }
      }

      // 3. 应用配置到请求（懒加载优化：只在有配置时才修改）
      let modifiedConfig = config;
      if (apiConfig) {
        modifiedConfig = this.applyAPIConfigToGenerate(config, apiConfig);

        // 验证修改后的配置
        if (!this.validateRequestConfig(modifiedConfig)) {
          console.warn('[API Auto Switch] 配置验证失败，使用原始配置');
          modifiedConfig = config;

          // 12.3 调试模式：显示验证失败信息
          if (this.debugMode) {
            console.warn('配置验证失败，回退到原始配置');
          }
        } else if (this.debugMode) {
          // 12.3 调试模式：显示修改后的配置
          console.log('配置应用成功，修改后的 custom_api:', {
            model: modifiedConfig.custom_api?.model,
            apiurl: modifiedConfig.custom_api?.apiurl?.substring(0, 50) + '...',
            temperature: modifiedConfig.custom_api?.temperature,
            max_tokens: modifiedConfig.custom_api?.max_tokens,
          });
        }
      }

      // 4. 调用原始函数
      let result: string;
      try {
        // 12.3 调试模式：记录请求开始时间
        const startTime = this.debugMode ? Date.now() : 0;

        result = await this.originalGenerate!(modifiedConfig);

        // 10.3 懒加载优化：成功时只记录简单日志
        console.log(`[API Auto Switch] generate 请求成功 #${this.state.requestCount}`);

        // 12.3 调试模式：显示请求结果
        if (this.debugMode) {
          const duration = Date.now() - startTime;
          console.log('请求成功:', {
            duration: `${duration}ms`,
            response_length: result.length,
            response_preview: result.substring(0, 100) + (result.length > 100 ? '...' : ''),
          });
          console.groupEnd();
        }
      } catch (error) {
        // 捕获 API 请求失败
        this.state.errorCount++;

        // 记录详细错误信息
        const errorMessage = error instanceof Error ? error.message : String(error);

        console.error(`[API Auto Switch] generate 请求失败 #${this.state.errorCount}:`, errorMessage);

        // 12.3 调试模式：显示详细错误信息
        if (this.debugMode) {
          console.error('请求失败详情:', {
            error: error,
            world: this.currentWorld,
            apiConfig: apiConfig
              ? {
                  model: apiConfig.model,
                  apiurl: apiConfig.apiurl.substring(0, 50) + '...',
                }
              : '默认 API',
          });
          console.groupEnd();
        }

        this.log({
          level: 'error',
          message: `generate 请求失败 (错误 #${this.state.errorCount}): ${errorMessage}`,
          world: this.currentWorld,
          error: error instanceof Error ? error : new Error(String(error)),
          apiConfig: apiConfig
            ? {
                model: apiConfig.model,
                apiurl: apiConfig.apiurl.substring(0, 30) + '...',
              }
            : undefined,
        });

        // 显示用户友好的错误提示
        toastr.error(`AI 生成请求失败: ${errorMessage}`);

        // 向上抛出错误让调用者处理
        throw error;
      }

      return result;
    } catch (error) {
      // 5. 处理拦截过程中的其他错误
      this.state.errorCount++;

      // 记录详细错误信息
      const errorMessage = error instanceof Error ? error.message : String(error);

      console.error(`[API Auto Switch] generate 拦截过程中发生错误 #${this.state.errorCount}:`, errorMessage);

      // 12.3 调试模式：显示拦截错误
      if (this.debugMode) {
        console.error('拦截过程错误:', error);
        console.groupEnd();
      }

      this.log({
        level: 'error',
        message: `generate 拦截过程中发生错误 (错误 #${this.state.errorCount}): ${errorMessage}`,
        world: this.currentWorld,
        error: error instanceof Error ? error : new Error(String(error)),
      });

      // 向上抛出错误让调用者处理
      throw error;
    }
  }

  /**
   * 5.3 拦截 generateRaw 函数
   * 与 generate 拦截类似的逻辑，处理 ordered_prompts 等特殊参数
   * 7.3 实现请求错误处理
   * - 捕获 API 请求失败
   * - 记录详细错误信息
   * - 向上抛出错误让调用者处理
   * 10.3 懒加载优化
   * - 只在需要时检测世界（使用缓存的 currentWorld）
   * - 只在需要时加载配置（使用 ConfigResolver 的缓存）
   * 12.3 调试模式支持
   * - 在控制台显示拦截的请求信息
   * - 显示配置应用详情
   */
  private async interceptGenerateRaw(config: GenerateRawConfig): Promise<string> {
    try {
      // 增加请求计数
      this.state.requestCount++;

      // 10.3 懒加载优化：减少不必要的日志记录，只在关键点记录
      console.log(`[API Auto Switch] 拦截 generateRaw 请求 #${this.state.requestCount}`);

      // 12.3 调试模式：显示原始请求信息
      if (this.debugMode) {
        console.group(`[API Auto Switch Debug] generateRaw 请求 #${this.state.requestCount}`);
        console.log('原始请求配置:', {
          ordered_prompts_count: config.ordered_prompts?.length || 0,
          has_custom_api: !!config.custom_api,
        });
        if (config.ordered_prompts && config.ordered_prompts.length > 0) {
          const firstPrompt = config.ordered_prompts[0];
          // 检查是否为 RolePrompt（有 role 和 content 属性）
          if (typeof firstPrompt === 'object' && 'role' in firstPrompt && 'content' in firstPrompt) {
            console.log('第一条 prompt:', {
              role: firstPrompt.role,
              content: firstPrompt.content.substring(0, 100) + (firstPrompt.content.length > 100 ? '...' : ''),
            });
          } else {
            // BuiltinPrompt（字符串类型）
            console.log('第一条 prompt:', firstPrompt);
          }
        }
      }

      // 1. 使用缓存的当前世界（懒加载优化：避免每次请求都重新检测）
      // 世界检测只在初始化和世界变更时进行
      // 这里直接使用 this.currentWorld，它会在 handleWorldChange() 中更新
      this.state.currentWorld = this.currentWorld;

      // 12.3 调试模式：显示当前世界
      if (this.debugMode) {
        console.log('当前世界:', this.currentWorld);
      }

      // 2. 获取 API 配置（懒加载优化：ConfigResolver 内部有缓存机制）
      const apiConfig = this.getCurrentAPIConfig();

      // 12.3 调试模式：显示 API 配置
      if (this.debugMode) {
        if (apiConfig) {
          console.log('应用自定义 API 配置:', {
            model: apiConfig.model,
            apiurl: apiConfig.apiurl.substring(0, 50) + '...',
            temperature: apiConfig.temperature,
            max_tokens: apiConfig.max_tokens,
          });
        } else {
          console.log('使用酒馆默认 API');
        }
      }

      // 3. 应用配置到请求（懒加载优化：只在有配置时才修改，处理 ordered_prompts 等特殊参数）
      let modifiedConfig = config;
      if (apiConfig) {
        modifiedConfig = this.applyAPIConfigToGenerateRaw(config, apiConfig);

        // 验证修改后的配置
        if (!this.validateRequestConfig(modifiedConfig)) {
          console.warn('[API Auto Switch] 配置验证失败，使用原始配置');
          modifiedConfig = config;

          // 12.3 调试模式：显示验证失败信息
          if (this.debugMode) {
            console.warn('配置验证失败，回退到原始配置');
          }
        } else if (this.debugMode) {
          // 12.3 调试模式：显示修改后的配置
          console.log('配置应用成功，修改后的 custom_api:', {
            model: modifiedConfig.custom_api?.model,
            apiurl: modifiedConfig.custom_api?.apiurl?.substring(0, 50) + '...',
            temperature: modifiedConfig.custom_api?.temperature,
            max_tokens: modifiedConfig.custom_api?.max_tokens,
          });
        }
      }

      // 4. 调用原始函数
      let result: string;
      try {
        // 12.3 调试模式：记录请求开始时间
        const startTime = this.debugMode ? Date.now() : 0;

        result = await this.originalGenerateRaw!(modifiedConfig);

        // 10.3 懒加载优化：成功时只记录简单日志
        console.log(`[API Auto Switch] generateRaw 请求成功 #${this.state.requestCount}`);

        // 12.3 调试模式：显示请求结果
        if (this.debugMode) {
          const duration = Date.now() - startTime;
          console.log('请求成功:', {
            duration: `${duration}ms`,
            response_length: result.length,
            response_preview: result.substring(0, 100) + (result.length > 100 ? '...' : ''),
          });
          console.groupEnd();
        }
      } catch (error) {
        // 捕获 API 请求失败
        this.state.errorCount++;

        // 记录详细错误信息
        const errorMessage = error instanceof Error ? error.message : String(error);

        console.error(`[API Auto Switch] generateRaw 请求失败 #${this.state.errorCount}:`, errorMessage);

        // 12.3 调试模式：显示详细错误信息
        if (this.debugMode) {
          console.error('请求失败详情:', {
            error: error,
            world: this.currentWorld,
            apiConfig: apiConfig
              ? {
                  model: apiConfig.model,
                  apiurl: apiConfig.apiurl.substring(0, 50) + '...',
                }
              : '默认 API',
          });
          console.groupEnd();
        }

        this.log({
          level: 'error',
          message: `generateRaw 请求失败 (错误 #${this.state.errorCount}): ${errorMessage}`,
          world: this.currentWorld,
          error: error instanceof Error ? error : new Error(String(error)),
          apiConfig: apiConfig
            ? {
                model: apiConfig.model,
                apiurl: apiConfig.apiurl.substring(0, 30) + '...',
              }
            : undefined,
        });

        // 显示用户友好的错误提示
        toastr.error(`AI 生成请求失败: ${errorMessage}`);

        // 向上抛出错误让调用者处理
        throw error;
      }

      return result;
    } catch (error) {
      // 5. 处理拦截过程中的其他错误
      this.state.errorCount++;

      // 记录详细错误信息
      const errorMessage = error instanceof Error ? error.message : String(error);

      console.error(`[API Auto Switch] generateRaw 拦截过程中发生错误 #${this.state.errorCount}:`, errorMessage);

      // 12.3 调试模式：显示拦截错误
      if (this.debugMode) {
        console.error('拦截过程错误:', error);
        console.groupEnd();
      }

      this.log({
        level: 'error',
        message: `generateRaw 拦截过程中发生错误 (错误 #${this.state.errorCount}): ${errorMessage}`,
        world: this.currentWorld,
        error: error instanceof Error ? error : new Error(String(error)),
      });

      // 向上抛出错误让调用者处理
      throw error;
    }
  }

  /**
   * 应用 API 配置到 generate 请求
   */
  private applyAPIConfigToGenerate(config: GenerateConfig, apiConfig: APIConfig | null): GenerateConfig {
    return this.requestModifier.applyToGenerate(config, apiConfig);
  }

  /**
   * 应用 API 配置到 generateRaw 请求
   */
  private applyAPIConfigToGenerateRaw(config: GenerateRawConfig, apiConfig: APIConfig | null): GenerateRawConfig {
    return this.requestModifier.applyToGenerateRaw(config, apiConfig);
  }

  /**
   * 验证请求配置
   */
  private validateRequestConfig(config: GenerateConfig | GenerateRawConfig): boolean {
    return this.requestModifier.validate(config);
  }

  /**
   * 清理服务
   */
  async cleanup(): Promise<void> {
    try {
      console.log('[API Auto Switch] 开始清理...');

      // 恢复原始函数
      this.restoreOriginalFunctions();

      // 移除所有事件监听器
      if (this.mvuEventCleanup) {
        this.mvuEventCleanup();
        this.mvuEventCleanup = null;
        console.log('[API Auto Switch] 事件监听器已移除');
      }

      // 清除配置缓存
      this.configResolver.clearCache();
      console.log('[API Auto Switch] 配置缓存已清除');

      // 重置状态
      this.state = {
        enabled: false,
        currentWorld: 'realWorld',
        lastWorldChange: Date.now(),
        requestCount: 0,
        errorCount: 0,
      };

      this.initialized = false;
      this.state.enabled = false;
      console.log('[API Auto Switch] 清理完成');
    } catch (error) {
      console.error('[API Auto Switch] 清理失败:', error);
      throw error;
    }
  }

  /**
   * 获取拦截器状态
   */
  getState(): InterceptorState {
    return { ...this.state };
  }

  /**
   * 12.3 启用调试模式
   * 在控制台显示拦截的请求信息和配置应用详情
   */
  enableDebugMode(): void {
    this.debugMode = true;
    console.log('[API Auto Switch] 调试模式已启用');
    toastr.info('API 自动切换调试模式已启用，详细日志将输出到控制台');
  }

  /**
   * 12.3 禁用调试模式
   */
  disableDebugMode(): void {
    this.debugMode = false;
    console.log('[API Auto Switch] 调试模式已禁用');
    toastr.info('API 自动切换调试模式已禁用');
  }

  /**
   * 12.3 切换调试模式
   */
  toggleDebugMode(): void {
    if (this.debugMode) {
      this.disableDebugMode();
    } else {
      this.enableDebugMode();
    }
  }

  /**
   * 12.3 获取调试模式状态
   */
  isDebugMode(): boolean {
    return this.debugMode;
  }

  /**
   * 8.1 实现统一日志格式
   * - 使用 `[API Auto Switch]` 前缀
   * - 包含时间戳、世界类型、操作类型
   * - 区分 info/warn/error 级别
   *
   * 8.3 实现敏感信息保护
   * - API 密钥只显示前后几位
   * - API 地址截断显示
   * - 不在日志中输出完整配置
   */
  private log(entry: Omit<LogEntry, 'timestamp'>): void {
    const logEntry: LogEntry = {
      ...entry,
      timestamp: Date.now(),
    };

    // 8.1 统一日志格式
    const prefix = '[API Auto Switch]';
    const timestamp = new Date(logEntry.timestamp).toISOString();
    const worldInfo = logEntry.world ? ` [${logEntry.world}]` : '';

    // 8.3 敏感信息保护 - 处理 API 配置
    let apiConfigInfo = '';
    if (logEntry.apiConfig) {
      const safeConfig: any = {};

      // API 密钥只显示前后几位
      if (logEntry.apiConfig.key) {
        const key = logEntry.apiConfig.key;
        if (key.length > 8) {
          safeConfig.key = `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
        } else {
          safeConfig.key = '***';
        }
      }

      // API 地址截断显示
      if (logEntry.apiConfig.apiurl) {
        const url = logEntry.apiConfig.apiurl;
        if (url.length > 50) {
          safeConfig.apiurl = url.substring(0, 47) + '...';
        } else {
          safeConfig.apiurl = url;
        }
      }

      // 其他配置信息可以完整显示（model、temperature、max_tokens）
      if (logEntry.apiConfig.model) {
        safeConfig.model = logEntry.apiConfig.model;
      }
      if (logEntry.apiConfig.temperature !== undefined) {
        safeConfig.temperature = logEntry.apiConfig.temperature;
      }
      if (logEntry.apiConfig.max_tokens !== undefined) {
        safeConfig.max_tokens = logEntry.apiConfig.max_tokens;
      }

      apiConfigInfo = ` [API: ${JSON.stringify(safeConfig)}]`;
    }

    // 构建完整的日志消息
    const fullMessage = `${prefix} [${timestamp}]${worldInfo} ${logEntry.message}${apiConfigInfo}`;

    // 根据日志级别输出
    switch (logEntry.level) {
      case 'info':
        console.log(fullMessage);
        if (logEntry.error) {
          console.log('  Error details:', logEntry.error);
        }
        break;
      case 'warn':
        console.warn(fullMessage);
        if (logEntry.error) {
          console.warn('  Error details:', logEntry.error);
        }
        break;
      case 'error':
        console.error(fullMessage);
        if (logEntry.error) {
          console.error('  Error details:', logEntry.error);
          if (logEntry.error.stack) {
            console.error('  Stack trace:', logEntry.error.stack);
          }
        }
        break;
    }
  }
}

// 导出服务单例
export const apiAutoSwitchService = new APIAutoSwitchService();
