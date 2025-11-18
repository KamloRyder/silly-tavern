// 游戏重置服务 - 清空所有游戏数据

import { useInventoryStore } from '../stores/inventoryStore';

/**
 * 游戏重置服务
 * 负责清空所有游戏相关数据，包括 MVU 变量、全局变量、聊天变量、背包等
 */
class GameResetService {
  /**
   * 清空所有 MVU 变量
   */
  async clearMVUVariables(): Promise<void> {
    try {
      console.log('[GameResetService] 开始清空 MVU 变量...');

      // 等待 MVU 框架初始化
      await waitGlobalInitialized('Mvu');

      // 创建空的 MVU 数据结构
      const emptyMvuData: Mvu.MvuData = {
        initialized_lorebooks: [],
        stat_data: {},
        display_data: {},
        delta_data: {},
      };

      let clearedCount = 0;

      // 先清空第 0 楼（当前楼层）
      try {
        const mvuData0 = Mvu.getMvuData({ type: 'message', message_id: 0 });
        if (mvuData0 && Object.keys(mvuData0.stat_data || {}).length > 0) {
          await Mvu.replaceMvuData(emptyMvuData, { type: 'message', message_id: 0 });
          clearedCount++;
          console.log(`[GameResetService] 已清空第 0 楼的 MVU 变量`);
        }
      } catch (error) {
        console.warn(`[GameResetService] 清空第 0 楼的 MVU 变量失败:`, error);
      }

      // 获取所有其他消息
      try {
        const messages = getChatMessages('0-{{lastMessageId}}');
        console.log(`[GameResetService] 找到 ${messages.length} 条其他消息`);

        // 遍历所有消息楼层，清空 MVU 变量
        for (const message of messages) {
          const messageId = message.message_id;
          try {
            // 获取当前楼层的 MVU 数据
            const mvuData = Mvu.getMvuData({ type: 'message', message_id: messageId });

            if (mvuData && Object.keys(mvuData.stat_data || {}).length > 0) {
              // 清空该楼层的 MVU 数据
              await Mvu.replaceMvuData(emptyMvuData, { type: 'message', message_id: messageId });
              clearedCount++;
              console.log(`[GameResetService] 已清空第 ${messageId} 楼的 MVU 变量`);
            }
          } catch (error) {
            console.warn(`[GameResetService] 清空第 ${messageId} 楼的 MVU 变量失败:`, error);
          }
        }
      } catch (error) {
        console.log('[GameResetService] 获取消息列表失败（可能在第 0 楼）:', error);
      }

      console.log(`[GameResetService] ✅ MVU 变量清空完成，共清空 ${clearedCount} 个楼层`);
    } catch (error) {
      console.error('[GameResetService] ❌ 清空 MVU 变量失败:', error);
      throw new Error(`清空 MVU 变量失败: ${(error as Error).message}`);
    }
  }

  /**
   * 清空全局变量
   */
  async clearGlobalVariables(): Promise<void> {
    try {
      console.log('[GameResetService] 开始清空全局变量...');

      // 获取当前全局变量
      const currentVariables = getVariables({ type: 'global' });
      const variableNames = Object.keys(currentVariables);
      console.log(`[GameResetService] 找到 ${variableNames.length} 个全局变量:`, variableNames);

      // 清空所有全局变量
      replaceVariables({}, { type: 'global' });

      console.log(`[GameResetService] ✅ 全局变量清空完成，共清空 ${variableNames.length} 个变量`);
    } catch (error) {
      console.error('[GameResetService] ❌ 清空全局变量失败:', error);
      throw new Error(`清空全局变量失败: ${(error as Error).message}`);
    }
  }

  /**
   * 清空聊天变量
   */
  async clearChatVariables(): Promise<void> {
    try {
      console.log('[GameResetService] 开始清空聊天变量...');

      // 获取当前聊天变量
      const currentVariables = getVariables({ type: 'chat' });
      const variableNames = Object.keys(currentVariables);
      console.log(`[GameResetService] 找到 ${variableNames.length} 个聊天变量:`, variableNames);

      // 清空所有聊天变量
      replaceVariables({}, { type: 'chat' });

      console.log(`[GameResetService] ✅ 聊天变量清空完成，共清空 ${variableNames.length} 个变量`);
    } catch (error) {
      console.error('[GameResetService] ❌ 清空聊天变量失败:', error);
      throw new Error(`清空聊天变量失败: ${(error as Error).message}`);
    }
  }

  /**
   * 清空背包系统
   */
  async clearInventory(): Promise<void> {
    try {
      console.log('[GameResetService] 开始清空背包...');

      const inventoryStore = useInventoryStore();

      // 记录清空前的物品数量
      const realWorldCount = inventoryStore.realWorldInventory.items.length;
      const instanceCount = inventoryStore.instanceInventory.items.length;
      console.log(`[GameResetService] 现实世界背包物品数: ${realWorldCount}`);
      console.log(`[GameResetService] 副本背包物品数: ${instanceCount}`);

      // 重置 store（清空所有背包）
      inventoryStore.reset();

      // 保存到全局变量
      await inventoryStore.saveToGlobal();

      console.log(`[GameResetService] ✅ 背包清空完成，共清空 ${realWorldCount + instanceCount} 个物品`);
    } catch (error) {
      console.error('[GameResetService] ❌ 清空背包失败:', error);
      throw new Error(`清空背包失败: ${(error as Error).message}`);
    }
  }

  /**
   * 清除主控角色信息
   * 包括全局变量中的 player_name 和 player_description
   */
  async clearProtagonistInfo(): Promise<void> {
    try {
      console.log('[GameResetService] 开始清除主控角色信息...');

      // 获取当前全局变量
      const currentVariables = getVariables({ type: 'global' });

      // 记录被清除的 player_name 和 player_description 值
      const oldPlayerName = currentVariables.player_name;
      const oldPlayerDescription = currentVariables.player_description;

      console.log('[GameResetService] 当前主控信息:', {
        player_name: oldPlayerName,
        player_description: oldPlayerDescription ? `${oldPlayerDescription.substring(0, 50)}...` : undefined,
      });

      // 删除全局变量中的 player_name 字段
      if (currentVariables.player_name !== undefined) {
        delete currentVariables.player_name;
        console.log('[GameResetService] ✅ 已删除 player_name 字段:', oldPlayerName);
      } else {
        console.log('[GameResetService] player_name 字段不存在，跳过');
      }

      // 删除全局变量中的 player_description 字段
      if (currentVariables.player_description !== undefined) {
        delete currentVariables.player_description;
        console.log('[GameResetService] ✅ 已删除 player_description 字段，长度:', oldPlayerDescription?.length || 0);
      } else {
        console.log('[GameResetService] player_description 字段不存在，跳过');
      }

      // 保存更新后的全局变量
      replaceVariables(currentVariables, { type: 'global' });
      console.log('[GameResetService] ✅ 全局变量已更新');

      // 调用 characterInitializer.resetInterceptor() 重置拦截器
      console.log('[GameResetService] 开始重置角色信息拦截器...');
      // eslint-disable-next-line import-x/no-cycle -- Dynamic import breaks cycle at runtime
      const { characterInitializer } = await import('./characterInitializer');
      characterInitializer.resetInterceptor();
      console.log('[GameResetService] ✅ 角色信息拦截器已重置');

      console.log('[GameResetService] ✅✅✅ 主控角色信息清除完成');
    } catch (error) {
      console.error('[GameResetService] ❌ 清除主控角色信息失败:', {
        error: (error as Error).message,
        stack: (error as Error).stack,
      });
      throw new Error(`清除主控角色信息失败: ${(error as Error).message}`);
    }
  }

  /**
   * 重置 API 配置为酒馆默认 API
   */
  async resetAPIConfiguration(): Promise<void> {
    try {
      console.log('[GameResetService] 开始重置 API 配置...');

      // 清空全局变量中的 api_config 字段
      const currentVariables = getVariables({ type: 'global' });

      if (currentVariables.api_config) {
        console.log('[GameResetService] 发现自定义 API 配置，准备清空');

        // 删除 api_config 字段
        delete currentVariables.api_config;
        replaceVariables(currentVariables, { type: 'global' });

        console.log('[GameResetService] ✅ API 配置已重置为酒馆默认');
      } else {
        console.log('[GameResetService] 未发现自定义 API 配置，无需重置');
      }
    } catch (error) {
      console.error('[GameResetService] ❌ 重置 API 配置失败:', error);
      throw new Error(`重置 API 配置失败: ${(error as Error).message}`);
    }
  }

  /**
   * 清空所有游戏数据
   * 统一调用所有清空操作
   */
  async clearAllGameData(): Promise<void> {
    console.log('[GameResetService] ========== 开始清空所有游戏数据 ==========');

    const errors: Array<{ operation: string; error: Error }> = [];
    const results: Array<{ operation: string; success: boolean }> = [];

    // 清除主控信息（在清除其他数据前先清除）
    try {
      await this.clearProtagonistInfo();
      results.push({ operation: '主控信息', success: true });
    } catch (error) {
      errors.push({ operation: '主控信息', error: error as Error });
      results.push({ operation: '主控信息', success: false });
      console.error('[GameResetService] 清除主控信息失败:', error);
    }

    // 清空 MVU 变量
    try {
      await this.clearMVUVariables();
      results.push({ operation: 'MVU 变量', success: true });
    } catch (error) {
      errors.push({ operation: 'MVU 变量', error: error as Error });
      results.push({ operation: 'MVU 变量', success: false });
      console.error('[GameResetService] 清空 MVU 变量失败:', error);
    }

    // 清空全局变量
    try {
      await this.clearGlobalVariables();
      results.push({ operation: '全局变量', success: true });
    } catch (error) {
      errors.push({ operation: '全局变量', error: error as Error });
      results.push({ operation: '全局变量', success: false });
      console.error('[GameResetService] 清空全局变量失败:', error);
    }

    // 清空聊天变量
    try {
      await this.clearChatVariables();
      results.push({ operation: '聊天变量', success: true });
    } catch (error) {
      errors.push({ operation: '聊天变量', error: error as Error });
      results.push({ operation: '聊天变量', success: false });
      console.error('[GameResetService] 清空聊天变量失败:', error);
    }

    // 清空背包
    try {
      await this.clearInventory();
      results.push({ operation: '背包', success: true });
    } catch (error) {
      errors.push({ operation: '背包', error: error as Error });
      results.push({ operation: '背包', success: false });
      console.error('[GameResetService] 清空背包失败:', error);
    }

    // 汇总结果
    console.log('[GameResetService] ========== 清空操作完成 ==========');
    console.log('[GameResetService] 操作结果:');
    results.forEach(result => {
      const status = result.success ? '✅ 成功' : '❌ 失败';
      console.log(`[GameResetService]   ${result.operation}: ${status}`);
    });

    // 显示结果提示
    if (errors.length > 0) {
      const errorMessage = errors.map(e => `${e.operation}: ${e.error.message}`).join('\n');
      console.error('[GameResetService] 部分数据清空失败:\n', errorMessage);
      toastr.warning(`部分数据清空失败:\n${errorMessage}`);
    } else {
      console.log('[GameResetService] ✅✅✅ 所有游戏数据已成功清空');
      toastr.success('所有游戏数据已清空');
    }

    console.log('[GameResetService] ========================================');
  }
}

// 导出单例
export const gameResetService = new GameResetService();
