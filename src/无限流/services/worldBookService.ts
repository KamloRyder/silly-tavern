/**
 * 世界书服务
 * 负责管理三个世界（现实世界、里世界、归所）的世界书条目激活
 */

import type { WorldType } from './apiConfigService';

/**
 * 世界书服务类
 * 根据当前世界类型激活对应的世界书条目
 */
class WorldBookService {
  private initialized = false;
  private currentWorld: WorldType = 'realWorld';
  private worldbookName: string | null = null;

  /**
   * 初始化服务
   * 获取当前角色卡绑定的世界书
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[WorldBookService] 服务已初始化');
      return;
    }

    try {
      console.log('[WorldBookService] 初始化服务...');

      // 获取当前角色卡绑定的世界书
      const charWorldbooks = getCharWorldbookNames('current');

      if (charWorldbooks.primary) {
        this.worldbookName = charWorldbooks.primary;
        console.log('[WorldBookService] 找到角色卡绑定的世界书:', this.worldbookName);
      } else {
        console.warn('[WorldBookService] 当前角色卡未绑定世界书');
        this.worldbookName = null;
      }

      this.initialized = true;
      console.log('[WorldBookService] 服务初始化完成');
    } catch (error) {
      console.error('[WorldBookService] 初始化失败:', error);
      throw error;
    }
  }

  /**
   * 激活现实世界条目
   * 将所有标记为现实世界的条目设置为 constant（蓝灯），其他设置为 selective（绿灯）
   */
  async activateRealWorldEntries(): Promise<void> {
    try {
      if (!this.worldbookName) {
        console.warn('[WorldBookService] 未找到世界书，跳过激活');
        return;
      }

      console.log('[WorldBookService] 激活现实世界条目...');

      // 获取世界书内容
      const worldbook = await getWorldbook(this.worldbookName);

      // 更新条目激活策略
      const updatedWorldbook = worldbook.map(entry => {
        // 检查条目的 extra 字段中是否标记了世界类型
        const worldType = entry.extra?.worldType as string | undefined;

        if (worldType === 'realWorld') {
          // 现实世界条目：设置为 constant（蓝灯），始终激活
          return {
            ...entry,
            strategy: {
              ...entry.strategy,
              type: 'constant' as const,
            },
          };
        } else if (worldType === 'innerWorld' || worldType === 'sanctuary') {
          // 其他世界条目：设置为 selective（绿灯），需要关键词匹配
          return {
            ...entry,
            strategy: {
              ...entry.strategy,
              type: 'selective' as const,
              keys: entry.strategy.keys.length > 0 ? entry.strategy.keys : ['__never_match__'], // 如果没有关键词，使用永不匹配的关键词
            },
          };
        } else {
          // 未标记世界类型的条目：保持原样
          return entry;
        }
      });

      // 替换世界书
      await replaceWorldbook(this.worldbookName, updatedWorldbook);

      this.currentWorld = 'realWorld';
      console.log('[WorldBookService] 现实世界条目已激活');
    } catch (error) {
      console.error('[WorldBookService] 激活现实世界条目失败:', error);
      throw error;
    }
  }

  /**
   * 激活里世界条目
   * 将所有标记为里世界的条目设置为 constant（蓝灯），其他设置为 selective（绿灯）
   */
  async activateInnerWorldEntries(): Promise<void> {
    try {
      if (!this.worldbookName) {
        console.warn('[WorldBookService] 未找到世界书，跳过激活');
        return;
      }

      console.log('[WorldBookService] 激活里世界条目...');

      // 获取世界书内容
      const worldbook = await getWorldbook(this.worldbookName);

      // 更新条目激活策略
      const updatedWorldbook = worldbook.map(entry => {
        // 检查条目的 extra 字段中是否标记了世界类型
        const worldType = entry.extra?.worldType as string | undefined;

        if (worldType === 'innerWorld') {
          // 里世界条目：设置为 constant（蓝灯），始终激活
          return {
            ...entry,
            strategy: {
              ...entry.strategy,
              type: 'constant' as const,
            },
          };
        } else if (worldType === 'realWorld' || worldType === 'sanctuary') {
          // 其他世界条目：设置为 selective（绿灯），需要关键词匹配
          return {
            ...entry,
            strategy: {
              ...entry.strategy,
              type: 'selective' as const,
              keys: entry.strategy.keys.length > 0 ? entry.strategy.keys : ['__never_match__'], // 如果没有关键词，使用永不匹配的关键词
            },
          };
        } else {
          // 未标记世界类型的条目：保持原样
          return entry;
        }
      });

      // 替换世界书
      await replaceWorldbook(this.worldbookName, updatedWorldbook);

      this.currentWorld = 'innerWorld';
      console.log('[WorldBookService] 里世界条目已激活');
    } catch (error) {
      console.error('[WorldBookService] 激活里世界条目失败:', error);
      throw error;
    }
  }

  /**
   * 激活归所条目
   * 将所有标记为归所的条目设置为 constant（蓝灯），其他设置为 selective（绿灯）
   */
  async activateInteractionRoomEntries(): Promise<void> {
    try {
      if (!this.worldbookName) {
        console.warn('[WorldBookService] 未找到世界书，跳过激活');
        return;
      }

      console.log('[WorldBookService] 激活归所条目...');

      // 获取世界书内容
      const worldbook = await getWorldbook(this.worldbookName);

      // 更新条目激活策略
      const updatedWorldbook = worldbook.map(entry => {
        // 检查条目的 extra 字段中是否标记了世界类型
        const worldType = entry.extra?.worldType as string | undefined;

        if (worldType === 'sanctuary') {
          // 归所条目：设置为 constant（蓝灯），始终激活
          return {
            ...entry,
            strategy: {
              ...entry.strategy,
              type: 'constant' as const,
            },
          };
        } else if (worldType === 'realWorld' || worldType === 'innerWorld') {
          // 其他世界条目：设置为 selective（绿灯），需要关键词匹配
          return {
            ...entry,
            strategy: {
              ...entry.strategy,
              type: 'selective' as const,
              keys: entry.strategy.keys.length > 0 ? entry.strategy.keys : ['__never_match__'], // 如果没有关键词，使用永不匹配的关键词
            },
          };
        } else {
          // 未标记世界类型的条目：保持原样
          return entry;
        }
      });

      // 替换世界书
      await replaceWorldbook(this.worldbookName, updatedWorldbook);

      this.currentWorld = 'sanctuary';
      console.log('[WorldBookService] 归所条目已激活');
    } catch (error) {
      console.error('[WorldBookService] 激活归所条目失败:', error);
      throw error;
    }
  }

  /**
   * 获取当前世界类型
   */
  getCurrentWorld(): WorldType {
    return this.currentWorld;
  }

  /**
   * 获取世界书名称
   */
  getWorldbookName(): string | null {
    return this.worldbookName;
  }

  /**
   * 重新加载世界书
   * 当角色卡切换时调用
   */
  async reload(): Promise<void> {
    this.initialized = false;
    await this.initialize();
  }
}

// 导出单例
export const worldBookService = new WorldBookService();
