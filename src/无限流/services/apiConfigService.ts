// API 配置管理服务 - 管理三个世界的独立 API 配置

import type { APIConfig, MultiAPIConfig } from '../types/api';

/**
 * 世界类型
 */
export type WorldType = 'realWorld' | 'innerWorld' | 'sanctuary';

/**
 * API 配置管理服务类
 * 负责加载、保存和切换不同世界的 API 配置
 */
class APIConfigService {
  private configs: MultiAPIConfig | null = null;
  private currentWorld: WorldType = 'realWorld';
  private initialized = false;

  /**
   * 初始化服务
   * 从全局变量加载配置
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[API Config Service] 已经初始化，跳过');
      return;
    }

    try {
      console.log('[API Config Service] 开始初始化...');
      await this.loadConfigs();
      this.initialized = true;
      console.log('[API Config Service] 初始化完成');
    } catch (error) {
      console.error('[API Config Service] 初始化失败:', error);
      throw error;
    }
  }

  /**
   * 从全局变量加载配置
   */
  async loadConfigs(): Promise<MultiAPIConfig> {
    try {
      const allGlobalVars = getVariables({ type: 'global' });
      const savedConfigs = allGlobalVars.api_configs as MultiAPIConfig | null;

      if (savedConfigs) {
        this.configs = savedConfigs;
        console.log('[API Config Service] 已加载配置:', this.configs);
      } else {
        // 初始化默认配置（全部为 null，使用酒馆默认 API）
        this.configs = {
          realWorld: null,
          innerWorld: null,
          sanctuary: null,
        };
        console.log('[API Config Service] 使用默认配置（酒馆默认 API）');
      }

      return this.configs;
    } catch (error) {
      console.error('[API Config Service] 加载配置失败:', error);
      // 如果加载失败，使用默认配置
      this.configs = {
        realWorld: null,
        innerWorld: null,
        sanctuary: null,
      };
      return this.configs;
    }
  }

  /**
   * 保存配置到全局变量
   */
  async saveConfigs(configs: MultiAPIConfig): Promise<void> {
    try {
      this.configs = configs;
      // 使用 insertOrAssignVariables 来更新 api_configs 字段
      await insertOrAssignVariables({ api_configs: configs }, { type: 'global' });
      console.log('[API Config Service] 配置已保存:', configs);
      toastr.success('API 配置已保存');
    } catch (error) {
      console.error('[API Config Service] 保存配置失败:', error);
      toastr.error('保存 API 配置失败');
      throw error;
    }
  }

  /**
   * 获取当前世界的 API 配置
   * @returns API 配置对象，如果未配置则返回 null（使用酒馆默认 API）
   */
  getCurrentAPI(): APIConfig | null {
    if (!this.configs) {
      console.warn('[API Config Service] 配置未加载，返回 null');
      return null;
    }

    const config = this.configs[this.currentWorld];
    console.log(`[API Config Service] 获取当前世界 (${this.currentWorld}) 的 API 配置:`, config);
    return config;
  }

  /**
   * 获取指定世界的 API 配置
   */
  getWorldAPI(world: WorldType): APIConfig | null {
    if (!this.configs) {
      console.warn('[API Config Service] 配置未加载，返回 null');
      return null;
    }

    return this.configs[world];
  }

  /**
   * 获取所有配置（返回深拷贝，避免引用共享）
   */
  getAllConfigs(): MultiAPIConfig {
    if (!this.configs) {
      return {
        realWorld: null,
        innerWorld: null,
        sanctuary: null,
      };
    }

    // 返回深拷贝，避免 Vue 组件直接修改内部配置
    return {
      realWorld: this.configs.realWorld ? { ...this.configs.realWorld } : null,
      innerWorld: this.configs.innerWorld ? { ...this.configs.innerWorld } : null,
      sanctuary: this.configs.sanctuary ? { ...this.configs.sanctuary } : null,
    };
  }

  /**
   * 更新指定世界的 API 配置
   */
  async updateWorldAPI(world: WorldType, config: APIConfig | null): Promise<void> {
    try {
      if (!this.configs) {
        await this.loadConfigs();
      }

      if (this.configs) {
        this.configs[world] = config;
        await this.saveConfigs(this.configs);
        console.log(`[API Config Service] 已更新 ${world} 的 API 配置`);
      }
    } catch (error) {
      console.error(`[API Config Service] 更新 ${world} 的 API 配置失败:`, error);
      throw error;
    }
  }

  /**
   * 切换到现实世界 API
   */
  switchToRealWorld(): void {
    this.currentWorld = 'realWorld';
    console.log('[API Config Service] 已切换到现实世界 API');
  }

  /**
   * 切换到里世界 API
   */
  switchToInnerWorld(): void {
    this.currentWorld = 'innerWorld';
    console.log('[API Config Service] 已切换到里世界 API');
  }

  /**
   * 切换到归所 API
   */
  switchToSanctuary(): void {
    this.currentWorld = 'sanctuary';
    console.log('[API Config Service] 已切换到归所 API');
  }

  /**
   * 获取当前世界类型
   */
  getCurrentWorld(): WorldType {
    return this.currentWorld;
  }

  /**
   * 测试 API 连接
   * 通过临时切换世界上下文，让 apiAutoSwitchService 拦截器应用配置
   * @param worldToTest 要测试的世界类型
   */
  async testConnection(worldToTest: WorldType): Promise<{ success: boolean; message: string }> {
    // 1. 保存当前世界状态
    const originalWorld = this.currentWorld;

    try {
      console.log(`[API Config Service] 开始测试 ${worldToTest} 的 API 配置...`);

      // 2. 临时切换到要测试的世界上下文
      // 这样 apiAutoSwitchService 就能捡起正确的配置
      if (worldToTest === 'realWorld') this.switchToRealWorld();
      else if (worldToTest === 'innerWorld') this.switchToInnerWorld();
      else if (worldToTest === 'sanctuary') this.switchToSanctuary();

      // 3. 发送一个普通的 generateRaw 请求（不带 custom_api）
      // 让 apiAutoSwitchService 拦截并应用配置
      const response = await generateRaw({
        ordered_prompts: [{ role: 'user', content: '你好，这是一个测试消息。请简单回复"测试成功"。' }],
        // 关键：不传入 custom_api，让拦截器自动应用
      });

      if (response && response.length > 0) {
        console.log('[API Config Service] API 连接测试成功');
        return {
          success: true,
          message: 'API 连接成功！',
        };
      } else {
        console.warn('[API Config Service] API 返回空响应');
        return {
          success: false,
          message: 'API 返回空响应',
        };
      }
    } catch (error) {
      console.error('[API Config Service] API 连接测试失败:', error);
      return {
        success: false,
        message: `连接失败: ${error instanceof Error ? error.message : '未知错误'}`,
      };
    } finally {
      // 4. 无论成功与否，都恢复到原始的世界上下文
      console.log(`[API Config Service] 恢复 API 上下文到: ${originalWorld}`);
      if (originalWorld === 'realWorld') this.switchToRealWorld();
      else if (originalWorld === 'innerWorld') this.switchToInnerWorld();
      else if (originalWorld === 'sanctuary') this.switchToSanctuary();
    }
  }

  /**
   * 验证 API 配置是否有效
   */
  validateConfig(config: APIConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.apiurl || config.apiurl.trim() === '') {
      errors.push('API 地址不能为空');
    } else if (!config.apiurl.startsWith('http://') && !config.apiurl.startsWith('https://')) {
      errors.push('API 地址必须以 http:// 或 https:// 开头');
    }

    // 使用本地后端时，API 密钥可以留空（密钥在后端配置）
    const isLocalBackend = config.apiurl.includes('localhost') || config.apiurl.includes('127.0.0.1');
    if (!isLocalBackend && (!config.key || config.key.trim() === '')) {
      errors.push('API 密钥不能为空（使用本地后端时可留空）');
    }

    if (!config.model || config.model.trim() === '') {
      errors.push('模型名称不能为空');
    }

    if (config.temperature < 0 || config.temperature > 2) {
      errors.push('温度参数必须在 0-2 之间');
    }

    if (config.max_tokens <= 0) {
      errors.push('最大 token 数必须大于 0');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 重置所有配置为默认值（使用酒馆默认 API）
   */
  async resetConfigs(): Promise<void> {
    try {
      const defaultConfigs: MultiAPIConfig = {
        realWorld: null,
        innerWorld: null,
        sanctuary: null,
      };

      await this.saveConfigs(defaultConfigs);
      console.log('[API Config Service] 配置已重置为默认值');
      toastr.success('API 配置已重置');
    } catch (error) {
      console.error('[API Config Service] 重置配置失败:', error);
      toastr.error('重置配置失败');
      throw error;
    }
  }
}

// 导出单例
export const apiConfigService = new APIConfigService();
