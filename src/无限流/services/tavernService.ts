// 酒馆接口服务 - 封装酒馆助手 API 调用

import type { Character } from '../types/character';

/**
 * 酒馆事件回调
 */
interface TavernEventCallbacks {
  onChatChanged?: (chatId: string) => void;
  onMessageReceived?: (message: any) => void;
  onCharacterChanged?: (characterId: string) => void;
  onGenerationStarted?: () => void;
  onGenerationStopped?: () => void;
}

/**
 * 酒馆接口服务类
 * 封装酒馆助手和 SillyTavern 的 API 调用
 */
class TavernService {
  private callbacks: TavernEventCallbacks = {};
  private currentChatId: string = '';

  /**
   * 初始化服务
   */
  initialize(): void {
    this.currentChatId = this.getCurrentChatId();
    console.log('[Tavern Service] 初始化完成，当前聊天 ID:', this.currentChatId);
  }

  // ==================== 聊天相关 ====================

  /**
   * 获取当前聊天 ID
   */
  getCurrentChatId(): string {
    try {
      const chatId = SillyTavern.getCurrentChatId();
      if (!chatId) {
        console.warn('[Tavern Service] 当前没有活跃的聊天');
        return '';
      }
      return chatId;
    } catch (error) {
      console.error('[Tavern Service] 获取当前聊天 ID 失败:', error);
      return '';
    }
  }

  /**
   * 获取当前角色 ID
   */
  getCurrentCharacterId(): string {
    try {
      // SillyTavern 提供的接口
      return SillyTavern.characterId || '';
    } catch (error) {
      console.error('[Tavern Service] 获取当前角色 ID 失败:', error);
      return '';
    }
  }

  /**
   * 获取当前聊天的所有消息
   */
  getChatMessages(): any[] {
    try {
      return getChatMessages('0-{{lastMessageId}}');
    } catch (error) {
      console.error('[Tavern Service] 获取聊天消息失败:', error);
      return [];
    }
  }

  // ==================== 角色相关 ====================

  /**
   * 更新用户角色信息
   * 将游戏中的角色数据同步到酒馆的用户角色设定
   * @param character 角色数据
   */
  async updateUserCharacter(character: Character): Promise<void> {
    try {
      if (!character || !character.name) {
        throw new Error('角色数据无效');
      }

      // 构建角色描述文本
      const description = this.buildCharacterDescription(character);

      console.log('[Tavern Service] 角色描述已生成，长度:', description.length);

      // 使用 SillyTavern API 更新角色卡描述
      const characterId = SillyTavern.characterId;
      console.log('[Tavern Service] 当前角色卡 ID:', characterId);

      const currentChar = SillyTavern.characters[Number(characterId)];

      if (!currentChar) {
        console.error('[Tavern Service] 无法获取当前角色卡，characterId:', characterId);
        throw new Error('无法获取当前角色卡');
      }

      console.log('[Tavern Service] 当前角色卡名称:', currentChar.name);
      console.log('[Tavern Service] 原描述长度:', currentChar.description?.length || 0);

      // 更新角色卡描述
      currentChar.description = description;
      console.log('[Tavern Service] 描述已更新');

      // 保存角色卡
      await SillyTavern.saveMetadata();
      console.log('[Tavern Service] saveMetadata 完成');

      console.log('[Tavern Service] 用户角色更新成功:', character.name);
      toastr.success(`角色 ${character.name} 已同步到酒馆`);
    } catch (error) {
      console.error('[Tavern Service] 更新用户角色失败:', error);
      toastr.error('同步角色到酒馆失败');
      throw error;
    }
  }

  /**
   * 构建角色描述文本
   * 将角色数据转换为文本描述
   */
  private buildCharacterDescription(character: Character): string {
    const { name, age, occupation, background, attributes, derivedStats } = character;

    const description = `姓名: ${name}\n${age ? `年龄: ${age}\n` : ''}${occupation ? `职业: ${occupation}\n` : ''}${background ? `背景: ${background}\n\n` : ''}属性:\n力量 (STR): ${attributes.STR}\n体质 (CON): ${attributes.CON}\n体型 (SIZ): ${attributes.SIZ}\n敏捷 (DEX): ${attributes.DEX}\n外貌 (APP): ${attributes.APP}\n智力 (INT): ${attributes.INT}\n意志 (POW): ${attributes.POW}\n教育 (EDU): ${attributes.EDU}\n幸运 (LUK): ${attributes.LUK}\n\n衍生属性:\n生命值 (HP): ${derivedStats.HP}/${derivedStats.maxHP}\n魔法值 (MP): ${derivedStats.MP}/${derivedStats.maxMP}\n理智值 (SAN): ${derivedStats.SAN}/${derivedStats.maxSAN}\n移动力 (MOV): ${derivedStats.MOV}\n伤害加值 (DB): ${derivedStats.DB}\n体格 (BUILD): ${derivedStats.BUILD}\n`;

    return description;
  }

  /**
   * 获取角色列表
   */
  getCharacterList(): any[] {
    try {
      // 使用 SillyTavern 接口获取角色列表
      return SillyTavern.characters || [];
    } catch (error) {
      console.error('[Tavern Service] 获取角色列表失败:', error);
      return [];
    }
  }

  // ==================== 事件监听 ====================

  /**
   * 设置事件监听器
   */
  setupEventListeners(): void {
    // 监听聊天变更事件
    eventOn(tavern_events.CHAT_CHANGED, (chatId: string) => {
      console.log('[Tavern Service] 聊天已变更:', chatId);
      this.currentChatId = chatId;

      if (this.callbacks.onChatChanged) {
        this.callbacks.onChatChanged(chatId);
      }
    });

    // 监听消息接收事件
    eventOn(tavern_events.MESSAGE_RECEIVED, (message: any) => {
      console.log('[Tavern Service] 接收到新消息');

      if (this.callbacks.onMessageReceived) {
        this.callbacks.onMessageReceived(message);
      }
    });

    // 监听角色变更事件
    eventOn(tavern_events.CHARACTER_EDITED, (result: any) => {
      console.log('[Tavern Service] 角色已变更:', result.detail?.id);

      if (this.callbacks.onCharacterChanged && result.detail?.id) {
        this.callbacks.onCharacterChanged(result.detail.id);
      }
    });

    // 监听生成开始事件
    eventOn(tavern_events.GENERATION_STARTED, () => {
      console.log('[Tavern Service] AI 生成开始');

      if (this.callbacks.onGenerationStarted) {
        this.callbacks.onGenerationStarted();
      }
    });

    // 监听生成停止事件
    eventOn(tavern_events.GENERATION_STOPPED, () => {
      console.log('[Tavern Service] AI 生成停止');

      if (this.callbacks.onGenerationStopped) {
        this.callbacks.onGenerationStopped();
      }
    });

    console.log('[Tavern Service] 事件监听器已设置');
  }

  /**
   * 设置回调函数
   */
  setCallbacks(callbacks: TavernEventCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * 清除回调函数
   */
  clearCallbacks(): void {
    this.callbacks = {};
  }

  // ==================== 生成相关 ====================

  /**
   * 触发 AI 生成
   * @param options 生成选项
   */
  async generate(options?: { user_input?: string }): Promise<void> {
    try {
      if (options?.user_input) {
        await generate({ user_input: options.user_input });
      } else {
        await generate({});
      }
    } catch (error) {
      console.error('[Tavern Service] 触发生成失败:', error);
      throw error;
    }
  }

  /**
   * 停止当前生成
   */
  stopGeneration(): void {
    try {
      // 使用 SillyTavern 的停止生成接口
      // 具体实现取决于 SillyTavern 提供的 API
      console.log('[Tavern Service] 请求停止生成');
    } catch (error) {
      console.error('[Tavern Service] 停止生成失败:', error);
    }
  }

  // ==================== 世界书相关 ====================

  /**
   * 获取世界书条目
   * @param worldbookName 世界书名称
   */
  async getWorldbookEntries(worldbookName: string): Promise<any[]> {
    try {
      // 使用酒馆助手接口获取世界书
      const entries = await getWorldbook(worldbookName);
      return Array.from(entries);
    } catch (error) {
      console.error('[Tavern Service] 获取世界书失败:', error);
      return [];
    }
  }

  /**
   * 更新世界书条目
   * @param worldbookName 世界书名称
   * @param entries 世界书条目
   */
  async updateWorldbook(worldbookName: string, entries: any[]): Promise<void> {
    try {
      await replaceWorldbook(worldbookName, entries);
      console.log('[Tavern Service] 世界书更新成功');
    } catch (error) {
      console.error('[Tavern Service] 更新世界书失败:', error);
      throw error;
    }
  }

  // ==================== 变量相关 ====================

  /**
   * 获取全局变量
   */
  getGlobalVariables(): any {
    try {
      return getVariables({ type: 'global' });
    } catch (error) {
      console.error('[Tavern Service] 获取全局变量失败:', error);
      return {};
    }
  }

  /**
   * 设置全局变量
   */
  async setGlobalVariables(variables: any): Promise<void> {
    try {
      await replaceVariables(variables, { type: 'global' });
      console.log('[Tavern Service] 全局变量设置成功');
    } catch (error) {
      console.error('[Tavern Service] 设置全局变量失败:', error);
      throw error;
    }
  }

  // ==================== 工具方法 ====================

  /**
   * 获取酒馆上下文信息
   */
  getContext(): typeof SillyTavern {
    return SillyTavern;
  }

  /**
   * 显示通知
   * @param message 消息内容
   * @param type 消息类型
   */
  showNotification(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info'): void {
    toastr[type](message);
  }

  /**
   * 执行 STScript 命令
   * @param command 命令字符串
   */
  async executeCommand(command: string): Promise<any> {
    try {
      return await triggerSlash(command);
    } catch (error) {
      console.error('[Tavern Service] 执行命令失败:', command, error);
      throw error;
    }
  }

  /**
   * 重新加载界面
   */
  reloadInterface(): void {
    window.location.reload();
  }
}

// 导出单例
export const tavernService = new TavernService();
