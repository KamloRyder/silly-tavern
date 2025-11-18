// MVU 变量服务 - 管理 MVU 变量的读写和同步

import { klona } from 'klona';
import type { Character, CharacterStatusUpdate } from '../types/character';
import { MVUGameDataSchema, type MVUGameDataType } from '../types/schemas';

/**
 * MVU 服务类
 * 负责管理 MVU 变量框架的数据读写和同步
 */
class MVUService {
  private initialized = false;

  /**
   * 初始化 MVU 服务
   * 必须等待 MVU 变量框架初始化完成
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[MVU Service] 已经初始化，跳过重复初始化');
      return;
    }

    console.log('[MVU Service] 开始初始化 MVU 服务...');
    const startTime = Date.now();

    try {
      console.log('[MVU Service] 等待 MVU 变量框架全局初始化...');
      await waitGlobalInitialized('Mvu');

      this.initialized = true;
      const duration = Date.now() - startTime;

      console.log('[MVU Service] MVU 变量框架初始化完成');
      console.log('[MVU Service] 初始化耗时:', duration, 'ms');
    } catch (error) {
      console.error('[MVU Service] MVU 初始化失败:', error);
      console.error('[MVU Service] 初始化失败时间:', Date.now() - startTime, 'ms');
      toastr.error('MVU 变量框架初始化失败，请确保已安装 MVU 插件');
      throw error;
    }
  }

  /**
   * 确保 MVU 已初始化
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('MVU Service 未初始化，请先调用 initialize()');
    }
  }

  /**
   * 加载游戏数据
   * 从 MVU 变量中读取游戏状态数据
   * @param messageId 消息楼层 ID，默认为 0（当前楼层）
   */
  async loadGameData(messageId: number = 0): Promise<MVUGameDataType> {
    this.ensureInitialized();

    try {
      // 从 MVU 变量的 stat_data 字段读取数据
      const rawData = Mvu.getMvuData({ type: 'message', message_id: messageId });

      console.log('[MVU Service] 原始数据:', rawData);

      // 如果没有数据或数据为空，返回默认值
      if (!rawData || Object.keys(rawData).length === 0) {
        console.log('[MVU Service] 未找到游戏数据，使用默认值初始化');
        const defaultData = MVUGameDataSchema.parse({});
        // 保存默认数据
        await this.saveGameData(defaultData, messageId);
        return defaultData;
      }

      // 使用 Zod 验证和规范化数据
      const validatedData = MVUGameDataSchema.parse(rawData);

      console.log('[MVU Service] 游戏数据加载成功');
      return validatedData;
    } catch (error) {
      console.error('[MVU Service] 加载游戏数据失败:', error);

      // 如果是 Zod 验证错误，使用 formatZodError 格式化错误信息
      if (error instanceof Error && 'issues' in error) {
        const { formatZodError } = await import('../utils/validators');
        const formatted = formatZodError(error as any);
        console.error('[MVU Service] 数据验证错误:\n', formatted);
        toastr.warning('游戏数据格式错误，已使用默认值初始化');
      } else {
        toastr.error('加载游戏数据失败');
      }

      // 返回默认的空数据结构
      const defaultData = MVUGameDataSchema.parse({});
      // 尝试保存默认数据
      try {
        await this.saveGameData(defaultData, messageId);
      } catch (saveError) {
        console.error('[MVU Service] 保存默认数据失败:', saveError);
      }
      return defaultData;
    }
  }

  /**
   * 保存游戏数据
   * 将游戏状态数据写入 MVU 变量
   * @param data 游戏数据
   * @param messageId 消息楼层 ID，默认为 0（当前楼层）
   */
  async saveGameData(data: MVUGameDataType, messageId: number = 0): Promise<void> {
    this.ensureInitialized();

    console.log('[MVU Service] 开始保存游戏数据到消息楼层', messageId);
    const startTime = Date.now();

    try {
      // 使用 klona 去除 Vue 的 Proxy 层
      console.log('[MVU Service] 使用 klona 去除 Proxy 层...');
      const cleanData = klona(data);

      // 获取当前的 MVU 数据结构
      console.log('[MVU Service] 获取当前 MVU 数据结构...');
      const currentMvuData = Mvu.getMvuData({ type: 'message', message_id: messageId });

      // 更新 stat_data 字段
      const updatedMvuData = {
        ...currentMvuData,
        stat_data: cleanData,
      };

      // 写入 MVU 变量
      console.log('[MVU Service] 写入 MVU 变量...');
      await Mvu.replaceMvuData(updatedMvuData, { type: 'message', message_id: messageId });

      const duration = Date.now() - startTime;
      console.log('[MVU Service] 游戏数据保存成功，耗时:', duration, 'ms');
    } catch (error) {
      console.error('[MVU Service] 保存游戏数据失败:', error);
      console.error('[MVU Service] 保存失败时间:', Date.now() - startTime, 'ms');
      toastr.error('保存游戏数据失败');
      throw error;
    }
  }

  /**
   * 更新角色状态
   * @param characterId 角色 ID，'player' 表示主控角色
   * @param updates 要更新的状态数据
   * @param messageId 消息楼层 ID
   */
  async updateCharacterStatus(
    characterId: string,
    updates: CharacterStatusUpdate,
    messageId: number = 0,
  ): Promise<void> {
    this.ensureInitialized();

    try {
      const data = await this.loadGameData(messageId);

      if (characterId === 'player') {
        if (!data.characters.player) {
          throw new Error('主控角色不存在');
        }

        // 更新主控角色
        if (updates.attributes) {
          Object.assign(data.characters.player.attributes, updates.attributes);
        }
        if (updates.derivedStats) {
          Object.assign(data.characters.player.derivedStats, updates.derivedStats);
        }
        if (updates.bodyParts) {
          data.characters.player.bodyParts = updates.bodyParts;
        }
      } else {
        // 更新 NPC
        const npc = data.characters.npcs[characterId];
        if (!npc) {
          throw new Error(`NPC ${characterId} 不存在`);
        }

        if (updates.attributes) {
          Object.assign(npc.attributes, updates.attributes);
        }
        if (updates.derivedStats) {
          Object.assign(npc.derivedStats, updates.derivedStats);
        }
        if (updates.bodyParts) {
          npc.bodyParts = updates.bodyParts;
        }
        if (updates.affection !== undefined) {
          npc.affection = updates.affection;
        }
      }

      await this.saveGameData(data, messageId);
      console.log(`[MVU Service] 角色 ${characterId} 状态更新成功`);
    } catch (error) {
      console.error(`[MVU Service] 更新角色 ${characterId} 状态失败:`, error);
      toastr.error('更新角色状态失败');
      throw error;
    }
  }

  /**
   * 保存角色数据
   * @param character 角色数据
   * @param messageId 消息楼层 ID
   */
  async saveCharacter(character: Character, messageId: number = 0): Promise<void> {
    this.ensureInitialized();

    try {
      const data = await this.loadGameData(messageId);

      if (character.type === 'player') {
        data.characters.player = character;
      } else {
        data.characters.npcs[character.id] = character;
      }

      await this.saveGameData(data, messageId);
      console.log(`[MVU Service] 角色 ${character.name} 保存成功`);
    } catch (error) {
      console.error(`[MVU Service] 保存角色 ${character.name} 失败:`, error);
      toastr.error('保存角色数据失败');
      throw error;
    }
  }

  /**
   * 删除 NPC
   * @param npcId NPC ID
   * @param messageId 消息楼层 ID
   */
  async deleteNPC(npcId: string, messageId: number = 0): Promise<void> {
    this.ensureInitialized();

    try {
      const data = await this.loadGameData(messageId);

      if (!data.characters.npcs[npcId]) {
        throw new Error(`NPC ${npcId} 不存在`);
      }

      delete data.characters.npcs[npcId];

      await this.saveGameData(data, messageId);
      console.log(`[MVU Service] NPC ${npcId} 删除成功`);
    } catch (error) {
      console.error(`[MVU Service] 删除 NPC ${npcId} 失败:`, error);
      toastr.error('删除 NPC 失败');
      throw error;
    }
  }

  /**
   * 更新玩家位置
   * @param areaId 区域 ID
   * @param messageId 消息楼层 ID
   */
  async updatePlayerLocation(areaId: string, messageId: number = 0): Promise<void> {
    this.ensureInitialized();

    try {
      const data = await this.loadGameData(messageId);

      if (!data.game.currentInstanceId) {
        throw new Error('当前没有活跃的副本');
      }

      const instance = data.instances[data.game.currentInstanceId];
      if (!instance) {
        throw new Error('副本数据不存在');
      }

      instance.map.playerLocation = areaId;
      data.game.currentArea = areaId;

      await this.saveGameData(data, messageId);
      console.log(`[MVU Service] 玩家位置更新为: ${areaId}`);
    } catch (error) {
      console.error('[MVU Service] 更新玩家位置失败:', error);
      toastr.error('更新玩家位置失败');
      throw error;
    }
  }

  /**
   * 更新游戏模式
   * @param newMode 新的游戏模式
   * @param messageId 消息楼层 ID
   */
  async updateGameMode(newMode: 'main' | 'combat' | 'sanctuary' | 'creation', messageId: number = 0): Promise<void> {
    this.ensureInitialized();

    try {
      const data = await this.loadGameData(messageId);
      data.game.mode = newMode;
      await this.saveGameData(data, messageId);
      console.log(`[MVU Service] 游戏模式更新为: ${newMode}`);
    } catch (error) {
      console.error('[MVU Service] 更新游戏模式失败:', error);
      toastr.error('更新游戏模式失败');
      throw error;
    }
  }

  /**
   * 设置当前副本
   * @param instanceId 副本 ID
   * @param messageId 消息楼层 ID
   */
  async setCurrentInstance(instanceId: string, messageId: number = 0): Promise<void> {
    this.ensureInitialized();

    try {
      const data = await this.loadGameData(messageId);
      data.game.currentInstanceId = instanceId;
      await this.saveGameData(data, messageId);
      console.log(`[MVU Service] 当前副本设置为: ${instanceId}`);
    } catch (error) {
      console.error('[MVU Service] 设置当前副本失败:', error);
      toastr.error('设置当前副本失败');
      throw error;
    }
  }

  /**
   * 解析 AI 输出中的 MVU 命令并更新变量
   * 用于流式传输场景，当 AI 输出包含 MVU 命令时自动解析并更新
   * @param message AI 输出的消息内容
   * @param messageId 消息楼层 ID
   */
  async parseAndUpdateFromMessage(message: string, messageId: number = 0): Promise<MVUGameDataType> {
    this.ensureInitialized();

    try {
      // 检查消息中是否包含 MVU 命令
      if (!this.containsMVUCommands(message)) {
        console.log('[MVU Service] 消息中不包含 MVU 命令，跳过解析');
        return await this.loadGameData(messageId);
      }

      // 获取当前的 MVU 数据
      const currentMvuData = Mvu.getMvuData({ type: 'message', message_id: messageId });

      // 使用 MVU 的 parseMessage 接口解析消息
      // parseMessage 返回更新后的完整 MVU 数据结构
      const newMvuData = await Mvu.parseMessage(message, currentMvuData);

      // 提取 stat_data 并验证
      const validatedData = MVUGameDataSchema.parse((newMvuData?.stat_data as any) || {});

      // 保存更新后的数据
      await this.saveGameData(validatedData, messageId);

      console.log('[MVU Service] MVU 命令解析并更新成功');
      return validatedData;
    } catch (error) {
      console.error('[MVU Service] 解析 MVU 命令失败:', error);
      toastr.error('解析 AI 输出中的数据更新失败');
      throw error;
    }
  }

  /**
   * 检查消息中是否包含 MVU 命令
   * MVU 命令通常使用 {{}} 或特定格式
   */
  private containsMVUCommands(message: string): boolean {
    // 检查是否包含 MVU 命令的标记
    return message.includes('{{') && message.includes('}}');
  }
}

// 导出单例
export const mvuService = new MVUService();
