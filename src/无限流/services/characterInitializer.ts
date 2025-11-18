// 主控角色初始化服务 - 在第 0 楼自动初始化主控角色

import { useCharacterStore } from '../stores/characterStore';
import type { PlayerCharacter } from '../types/character';
import { ProtagonistValidator } from '../utils/protagonistValidator';

/**
 * 拦截器状态接口
 */
interface InterceptorState {
  // 是否已设置拦截器
  isSetup: boolean;

  // 当前拦截的主控名称
  currentName: string | null;

  // 当前拦截的主控描述
  currentDescription: string | null;
}

/**
 * 原始方法备份接口
 */
interface OriginalMethods {
  getUserName?: () => string;
  getPersonaDescription?: () => string;
}

/**
 * 角色初始化器
 * 负责在第 0 楼检查并初始化主控角色
 */
class CharacterInitializer {
  private initialized = false;

  // 拦截器状态
  private interceptorState: InterceptorState = {
    isSetup: false,
    currentName: null,
    currentDescription: null,
  };

  // 原始方法备份
  private originalMethods: OriginalMethods = {};

  /**
   * 检查是否需要初始化主控角色
   * 在第 0 楼且没有主控角色时触发初始化
   */
  async checkAndInitialize(): Promise<boolean> {
    try {
      console.log('[CharacterInitializer] ========== 开始检查 ==========');

      // 方法1: 使用 SillyTavern.chat 检查消息数量
      const chatLength = SillyTavern.chat.length;
      console.log('[CharacterInitializer] SillyTavern.chat.length:', chatLength);

      // 方法2: 尝试使用 getChatMessages
      let messages: any[] = [];
      try {
        messages = getChatMessages('0-{{lastMessageId}}');
        console.log('[CharacterInitializer] getChatMessages 返回消息数:', messages.length);
      } catch (error) {
        console.log('[CharacterInitializer] getChatMessages 失败（可能是第 0 楼）:', error);
      }

      // 判断是否在第 0 楼：两种方法都显示没有消息
      const isFloorZero = chatLength === 0 && messages.length === 0;
      console.log('[CharacterInitializer] 是否在第 0 楼:', isFloorZero);

      if (!isFloorZero) {
        console.log('[CharacterInitializer] ❌ 不在第 0 楼，无需初始化');
        return false;
      }

      // 检查是否已有主控角色
      const characterStore = useCharacterStore();
      console.log('[CharacterInitializer] characterStore.hasPlayer:', characterStore.hasPlayer);
      console.log('[CharacterInitializer] characterStore.player:', characterStore.player);

      if (characterStore.hasPlayer) {
        console.log('[CharacterInitializer] ❌ 主控角色已存在，无需初始化');
        return false;
      }

      // 检查是否已经初始化过（防止重复触发）
      console.log('[CharacterInitializer] this.initialized:', this.initialized);
      if (this.initialized) {
        console.log('[CharacterInitializer] ❌ 已经触发过初始化流程');
        return false;
      }

      console.log('[CharacterInitializer] ✅✅✅ 需要初始化主控角色，触发欢迎页面事件');
      this.initialized = true;

      // 触发角色创建事件
      // 由 MainInterface 监听此事件并显示欢迎页面
      console.log('[CharacterInitializer] 发送事件: character_initialization_required');
      eventEmit('character_initialization_required');
      console.log('[CharacterInitializer] 事件已发送');

      return true;
    } catch (error) {
      console.error('[CharacterInitializer] ❌ 检查初始化失败:', error);
      return false;
    }
  }

  /**
   * 同步主控角色信息（拦截用户信息调用）
   */
  async syncToSillyTavern(): Promise<void> {
    try {
      console.log('[CharacterInitializer] 开始设置主控角色信息拦截...');

      const characterStore = useCharacterStore();
      const character = characterStore.player;

      if (!character) {
        console.warn('[CharacterInitializer] 没有主控角色，无法设置');
        return;
      }

      console.log('[CharacterInitializer] 主控角色:', character.name);

      const description = this.formatCharacterDescription(character);
      console.log('[CharacterInitializer] 格式化后的描述长度:', description.length);

      // 保存到全局变量
      insertOrAssignVariables(
        {
          player_name: character.name,
          player_description: description,
        },
        { type: 'global' },
      );

      // 使用新的 setupInterceptor() 方法设置拦截器
      this.setupInterceptor(character.name, description);

      // 在设置拦截后记录拦截器状态
      console.log('[CharacterInitializer] 当前拦截器状态:', this.interceptorState);

      console.log('[CharacterInitializer] ✅ 主控角色信息已保存并启用拦截');
      toastr.success('主控角色信息已设置');
    } catch (error) {
      console.error('[CharacterInitializer] ❌ 设置主控角色信息失败:', error);
      toastr.error('设置角色信息失败: ' + (error as Error).message);
    }
  }

  /**
   * 重置角色信息拦截器
   * 恢复 SillyTavern 原始的用户信息方法
   */
  resetInterceptor(): void {
    try {
      console.log('[CharacterInitializer] ========== 开始重置拦截器 ==========');
      console.log('[CharacterInitializer] 当前拦截器状态:', this.interceptorState);

      const st = SillyTavern as any;

      // 恢复 SillyTavern.getUserName 原始方法
      if (this.originalMethods.getUserName) {
        st.getUserName = this.originalMethods.getUserName;
        console.log('[CharacterInitializer] ✅ getUserName 已恢复为原始方法');
      } else {
        console.log('[CharacterInitializer] ⚠️ getUserName 原始方法未保存，跳过恢复');
      }

      // 恢复 SillyTavern.getPersonaDescription 原始方法
      if (this.originalMethods.getPersonaDescription) {
        st.getPersonaDescription = this.originalMethods.getPersonaDescription;
        console.log('[CharacterInitializer] ✅ getPersonaDescription 已恢复为原始方法');
      } else {
        console.log('[CharacterInitializer] ⚠️ getPersonaDescription 原始方法未保存，跳过恢复');
      }

      // 移除 powerUserSettings 上的属性拦截
      if (st.powerUserSettings) {
        try {
          // 使用 delete 移除 defineProperty 定义的属性
          delete st.powerUserSettings.name;
          console.log('[CharacterInitializer] ✅ powerUserSettings.name 属性拦截已移除');
        } catch (error) {
          console.warn('[CharacterInitializer] ⚠️ 移除 powerUserSettings.name 拦截失败:', error);
        }

        try {
          delete st.powerUserSettings.persona_description;
          console.log('[CharacterInitializer] ✅ powerUserSettings.persona_description 属性拦截已移除');
        } catch (error) {
          console.warn('[CharacterInitializer] ⚠️ 移除 powerUserSettings.persona_description 拦截失败:', error);
        }
      }

      // 更新拦截器状态
      this.interceptorState = {
        isSetup: false,
        currentName: null,
        currentDescription: null,
      };

      console.log('[CharacterInitializer] ✅✅✅ 拦截器已完全重置');
      console.log('[CharacterInitializer] 新的拦截器状态:', this.interceptorState);
      console.log('[CharacterInitializer] ========== 拦截器重置完成 ==========');
    } catch (error) {
      console.error('[CharacterInitializer] ❌ 拦截器重置失败:', {
        error: (error as Error).message,
        stack: (error as Error).stack,
        currentState: this.interceptorState,
      });
      throw error;
    }
  }

  /**
   * 设置角色信息拦截器
   * 使用新主控信息拦截 SillyTavern 的用户信息调用
   */
  private setupInterceptor(playerName: string, playerDescription: string): void {
    try {
      console.log('[CharacterInitializer] ========== 开始设置拦截器 ==========');
      console.log('[CharacterInitializer] 主控名称:', playerName);
      console.log('[CharacterInitializer] 描述长度:', playerDescription.length);

      const st = SillyTavern as any;

      // 在设置拦截前先保存原始方法（如果尚未保存）
      if (!this.originalMethods.getUserName && typeof st.getUserName === 'function') {
        this.originalMethods.getUserName = st.getUserName;
        console.log('[CharacterInitializer] ✅ 已保存 getUserName 原始方法');
      }

      if (!this.originalMethods.getPersonaDescription && typeof st.getPersonaDescription === 'function') {
        this.originalMethods.getPersonaDescription = st.getPersonaDescription;
        console.log('[CharacterInitializer] ✅ 已保存 getPersonaDescription 原始方法');
      }

      // 拦截 SillyTavern.getUserName
      if (typeof st.getUserName === 'function') {
        st.getUserName = function () {
          console.log('[CharacterInitializer] 拦截 getUserName，返回主控角色名称:', playerName);
          return playerName;
        };
        console.log('[CharacterInitializer] ✅ getUserName 已拦截');
      }

      // 拦截 SillyTavern.getPersonaDescription
      if (typeof st.getPersonaDescription === 'function') {
        st.getPersonaDescription = function () {
          console.log(
            '[CharacterInitializer] 拦截 getPersonaDescription，返回主控角色描述，长度:',
            playerDescription.length,
          );
          return playerDescription;
        };
        console.log('[CharacterInitializer] ✅ getPersonaDescription 已拦截');
      }

      // 拦截 powerUserSettings 的 name 和 persona_description 属性
      if (st.powerUserSettings) {
        const powerUser = st.powerUserSettings;

        // 使用 Object.defineProperty 拦截属性访问
        Object.defineProperty(powerUser, 'name', {
          get: function () {
            console.log('[CharacterInitializer] 拦截 powerUserSettings.name，返回主控角色名称:', playerName);
            return playerName;
          },
          set: function () {
            console.log('[CharacterInitializer] 拦截 powerUserSettings.name 设置，忽略');
          },
          configurable: true,
        });

        Object.defineProperty(powerUser, 'persona_description', {
          get: function () {
            console.log(
              '[CharacterInitializer] 拦截 powerUserSettings.persona_description，返回主控角色描述，长度:',
              playerDescription.length,
            );
            return playerDescription;
          },
          set: function () {
            console.log('[CharacterInitializer] 拦截 powerUserSettings.persona_description 设置，忽略');
          },
          configurable: true,
        });

        console.log('[CharacterInitializer] ✅ powerUserSettings 属性已拦截');
      }

      // 更新拦截器状态
      this.interceptorState = {
        isSetup: true,
        currentName: playerName,
        currentDescription: playerDescription,
      };

      console.log('[CharacterInitializer] ✅✅✅ 用户信息拦截已全部启用');
      console.log('[CharacterInitializer] 拦截器状态:', this.interceptorState);
      console.log('[CharacterInitializer] ========== 拦截器设置完成 ==========');
    } catch (error) {
      console.error('[CharacterInitializer] ❌ 拦截器设置失败:', {
        error: (error as Error).message,
        stack: (error as Error).stack,
        playerName,
        descriptionLength: playerDescription.length,
      });
      throw error;
    }
  }

  /**
   * 验证主控信息是否正确设置
   * @param expectedName 期望的主控名称
   * @param expectedDescription 期望的主控描述
   * @returns 验证是否成功
   */
  async verifyProtagonistInfo(expectedName: string, expectedDescription: string): Promise<boolean> {
    try {
      console.log('[CharacterInitializer] ========== 开始验证主控信息 ==========');

      // 调用 ProtagonistValidator.validate() 执行验证
      const result = ProtagonistValidator.validate(expectedName, expectedDescription);

      if (!result.success) {
        // 验证失败，记录详细错误信息
        console.error('[CharacterInitializer] ❌ 主控信息验证失败:', {
          errors: result.errors,
          details: result.details,
        });

        // 显示警告提示
        toastr.warning(`主控信息验证失败：${result.errors.join('；')}`, '验证警告', { timeOut: 5000 });

        console.log('[CharacterInitializer] ========== 验证完成（失败）==========');
        return false;
      }

      // 验证成功，记录成功信息
      console.log('[CharacterInitializer] ✅✅✅ 主控信息验证成功');
      console.log('[CharacterInitializer] 验证详情:', result.details);
      console.log('[CharacterInitializer] ========== 验证完成（成功）==========');

      return true;
    } catch (error) {
      console.error('[CharacterInitializer] ❌ 验证过程发生异常:', {
        error: (error as Error).message,
        stack: (error as Error).stack,
      });

      toastr.error('主控信息验证过程发生错误', '验证错误');
      return false;
    }
  }

  /**
   * 格式化角色描述
   */
  private formatCharacterDescription(character: PlayerCharacter): string {
    const lines: string[] = [];

    // 基本信息
    lines.push(`姓名：${character.name}`);
    if (character.age) {
      lines.push(`年龄：${character.age}`);
    }
    if (character.occupation) {
      lines.push(`职业：${character.occupation}`);
    }
    if (character.background) {
      lines.push(`背景：${character.background}`);
    }

    // 属性
    lines.push('');
    lines.push('属性：');
    const attributes = character.attributes;
    lines.push(`- 力量 (STR): ${attributes.STR}`);
    lines.push(`- 体质 (CON): ${attributes.CON}`);
    lines.push(`- 体型 (SIZ): ${attributes.SIZ}`);
    lines.push(`- 敏捷 (DEX): ${attributes.DEX}`);
    lines.push(`- 外貌 (APP): ${attributes.APP}`);
    lines.push(`- 智力 (INT): ${attributes.INT}`);
    lines.push(`- 意志 (POW): ${attributes.POW}`);
    lines.push(`- 教育 (EDU): ${attributes.EDU}`);
    lines.push(`- 幸运 (LUK): ${attributes.LUK}`);

    // 衍生属性
    lines.push('');
    lines.push('衍生属性：');
    const derived = character.derivedStats;
    lines.push(`- 生命值 (HP): ${derived.HP}/${derived.maxHP}`);
    lines.push(`- 魔法值 (MP): ${derived.MP}/${derived.maxMP}`);
    lines.push(`- 理智值 (SAN): ${derived.SAN}/${derived.maxSAN}`);
    lines.push(`- 移动力 (MOV): ${derived.MOV}`);
    lines.push(`- 伤害加值 (DB): ${derived.DB}`);
    lines.push(`- 体格 (BUILD): ${derived.BUILD}`);

    // 技能（如果有）
    if (character.skills && character.skills.size > 0) {
      lines.push('');
      lines.push('技能：');
      character.skills.forEach((value, name) => {
        lines.push(`- ${name}: ${value}`);
      });
    }

    return lines.join('\n');
  }

  /**
   * 角色创建完成后的处理
   * 包括同步到酒馆、重置 API 配置和生成现实世界地图
   */
  async onCharacterCreated(character: PlayerCharacter): Promise<void> {
    try {
      console.log('[CharacterInitializer] ========== 处理角色创建完成事件 ==========');

      // 1. 同步到酒馆角色卡
      console.log('[CharacterInitializer] 步骤 1/4: 同步角色信息到酒馆...');
      await this.syncToSillyTavern();
      console.log('[CharacterInitializer] ✅ 角色信息同步完成');

      // 2. 重置 API 配置为酒馆默认 API
      console.log('[CharacterInitializer] 步骤 2/4: 重置 API 配置...');
      try {
        // eslint-disable-next-line import-x/no-cycle -- Dynamic import breaks cycle at runtime
        const { gameResetService } = await import('./gameResetService');
        await gameResetService.resetAPIConfiguration();
        console.log('[CharacterInitializer] ✅ API 配置已重置为酒馆默认');
      } catch (error) {
        console.error('[CharacterInitializer] ⚠️ API 配置重置失败:', error);
        toastr.warning('API 配置重置失败，将使用当前配置');
        // 不抛出错误，允许继续
      }

      // 3. 生成现实世界地图
      console.log('[CharacterInitializer] 步骤 3/4: 生成现实世界地图...');
      const { realWorldMapService } = await import('./realWorldMapService');

      // 检查是否已有地图
      const hasMap = await realWorldMapService.hasMap();
      if (!hasMap) {
        console.log('[CharacterInitializer] 开始生成现实世界地图...');
        try {
          await realWorldMapService.generateMap(character);
          console.log('[CharacterInitializer] ✅ 现实世界地图生成成功');
          toastr.success('现实世界地图已生成');
        } catch (error) {
          console.error('[CharacterInitializer] ❌ 现实世界地图生成失败:', error);
          toastr.error('现实世界地图生成失败，可稍后在地图面板手动生成');
          // 不抛出错误，允许继续游戏
        }
      } else {
        console.log('[CharacterInitializer] 现实世界地图已存在，跳过生成');
      }

      // 4. 验证主控信息
      console.log('[CharacterInitializer] 步骤 4/4: 验证主控信息...');
      const description = this.formatCharacterDescription(character);
      const verificationResult = await this.verifyProtagonistInfo(character.name, description);

      if (!verificationResult) {
        // 验证失败，显示警告但不阻塞流程
        console.warn('[CharacterInitializer] ⚠️ 主控信息验证失败，但继续流程');
      } else {
        console.log('[CharacterInitializer] ✅ 主控信息验证通过');
      }

      console.log('[CharacterInitializer] ========== 角色创建后处理完成 ==========');
    } catch (error) {
      console.error('[CharacterInitializer] ❌ 角色创建后处理失败:', error);
      toastr.error('角色创建后处理失败');
      throw error;
    }
  }

  /**
   * 重置初始化状态
   * 用于测试或重新初始化
   */
  reset(): void {
    this.initialized = false;
    console.log('[CharacterInitializer] 初始化状态已重置');
  }
}

// 导出单例
export const characterInitializer = new CharacterInitializer();
