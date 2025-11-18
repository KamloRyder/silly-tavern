// 现实世界地图生成服务

import type { PlayerCharacter } from '../types/character';
import type { Area, MapData } from '../types/instance';
import { withAPIContext } from '../utils/apiContext';

/**
 * 现实世界地图服务
 * 负责根据主控角色背景生成和管理现实世界地图
 */
class RealWorldMapService {
  /**
   * 根据主控角色背景生成现实世界地图
   * @param character 主控角色数据
   * @returns 生成的地图数据
   */
  async generateMap(character: PlayerCharacter): Promise<MapData> {
    // 使用 withAPIContext 确保使用 sanctuary API（归所）
    // 地图生成等不触发 AI 对话的功能统一使用归所 API
    return await withAPIContext('sanctuary', async () => {
      try {
        console.log('[RealWorldMapService] 开始生成现实世界地图...', character.name);
        toastr.info('正在生成现实世界地图...');

        // 构建 AI 生成提示
        const prompt = `你是一个地图数据生成器。请严格按照以下要求生成地图数据：

【重要】只返回 YAML 格式的数据，不要添加任何解释或叙述性文本。

角色信息：
- 姓名：${character.name}
- 年龄：${character.age || '未知'}
- 职业：${character.occupation || '无业'}
- 背景：${character.background || '无背景描述'}

要求：
1. 必须使用 \`\`\`yaml 代码块包裹
2. 包含角色的家（id: home）
3. 根据职业生成工作地点（如有职业）
4. 生成 3-5 个公共地点
5. 所有地点 isDangerous 设为 false

示例格式：
\`\`\`yaml
startArea: home
areas:
  - id: home
    name: ${character.name}的家
    description: 温馨的住所
    connectedAreas: [street]
    isDangerous: false
  - id: street
    name: 主街道
    description: 城市的主要街道
    connectedAreas: [home, shop]
    isDangerous: false
  - id: shop
    name: 便利店
    description: 24小时营业的便利店
    connectedAreas: [street]
    isDangerous: false
connections:
  - from: home
    to: street
  - from: street
    to: shop
\`\`\`

现在请生成地图数据：`;

        // 使用 generate 函数直接调用 AI，不在聊天界面显示
        console.log('[RealWorldMapService] 调用 AI 生成地图...');
        console.log('[RealWorldMapService] AI 调用参数:', {
          should_stream: false,
          prompt_length: prompt.length,
          character_name: character.name,
          character_occupation: character.occupation || '无业',
        });

        let text: string;
        try {
          text = await generate({
            user_input: prompt,
            should_stream: false, // 不使用流式传输，不在聊天界面显示
          });

          console.log('[RealWorldMapService] AI 生成完成，开始解析地图数据...');
          console.log('[RealWorldMapService] AI 返回文本长度:', text.length, '字符');
          console.log('[RealWorldMapService] AI 返回的完整原始文本:', text);
        } catch (apiError) {
          console.error('[RealWorldMapService] API 调用失败:', {
            error: apiError instanceof Error ? apiError.message : String(apiError),
            stack: apiError instanceof Error ? apiError.stack : undefined,
          });

          // API 调用失败，直接抛出错误让外层 catch 处理（使用降级方案）
          throw new Error(`API 调用失败: ${apiError instanceof Error ? apiError.message : String(apiError)}`);
        }

        // 使用多层解析策略解析地图数据
        const result = await this.parseMapFromText(text, character);

        // 为所有区域生成详细信息
        console.log('[RealWorldMapService] 开始为所有区域生成详细信息...');
        await this.generateAreaDetails(result);

        // 保存地图到全局变量
        await this.saveMap(result);

        console.log('[RealWorldMapService] 现实世界地图生成成功');
        toastr.success('现实世界地图生成成功！');

        return result;
      } catch (error) {
        console.error('[RealWorldMapService] 地图生成失败:', error);
        console.error('[RealWorldMapService] 错误详情:', {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          character: character.name,
        });
        console.warn('[RealWorldMapService] AI 调用失败，使用默认地图生成器（降级方案）');

        try {
          // 使用默认地图生成器作为降级方案
          console.log('[RealWorldMapService] 启动降级方案: 默认地图生成器');
          const result = this.generateDefaultMap(character);
          console.log('[RealWorldMapService] 降级方案生成结果:', {
            areas_count: result.areas.size,
            startArea: result.startArea,
            playerLocation: result.playerLocation,
          });

          // 为所有区域生成详细信息
          console.log('[RealWorldMapService] 开始为所有区域生成详细信息...');
          await this.generateAreaDetails(result);

          await this.saveMap(result);

          console.log('[RealWorldMapService] 现实世界地图生成成功（使用默认地图）');
          toastr.warning('AI 调用失败，已生成默认地图');

          return result;
        } catch (fallbackError) {
          console.error('[RealWorldMapService] 默认地图生成也失败:', fallbackError);
          console.error('[RealWorldMapService] 降级方案失败详情:', {
            message: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
            stack: fallbackError instanceof Error ? fallbackError.stack : undefined,
          });
          toastr.error('地图生成失败，请重试');
          throw fallbackError;
        }
      }
    });
  }

  /**
   * 保存现实世界地图到全局变量
   * @param map 地图数据
   */
  async saveMap(map: MapData): Promise<void> {
    try {
      console.log('[RealWorldMapService] 开始保存地图到全局变量...');
      // 将 Map 转换为普通对象以便序列化
      const serializedMap = {
        areas: Array.from(map.areas.entries()).map(([, area]) => area),
        connections: map.connections,
        playerLocation: map.playerLocation,
        startArea: map.startArea,
      };

      console.log('[RealWorldMapService] 序列化数据:', {
        区域数量: serializedMap.areas.length,
        连接数量: serializedMap.connections.length,
        玩家位置: serializedMap.playerLocation,
        起始区域: serializedMap.startArea,
      });

      insertOrAssignVariables({ real_world_map: serializedMap }, { type: 'global' });
      console.log('[RealWorldMapService] ✓ 现实世界地图已成功保存到全局变量');
    } catch (error) {
      console.error('[RealWorldMapService] ✗ 保存地图失败:', error);
      console.error('[RealWorldMapService] 错误详情:', error instanceof Error ? error.message : String(error));
      toastr.error('保存地图失败');
      throw error;
    }
  }

  /**
   * 从全局变量加载现实世界地图
   * @returns 地图数据，如果不存在则返回 null
   */
  async loadMap(): Promise<MapData | null> {
    try {
      const variables = getVariables({ type: 'global' });
      const data = variables.real_world_map as any;

      if (!data || !data.areas) {
        console.log('[RealWorldMapService] 未找到现实世界地图数据');
        return null;
      }

      // 将序列化的数据转换回 MapData 格式
      const areas = new Map<string, Area>();

      const mapData: MapData = {
        areas,
        connections: data.connections || [],
        playerLocation: data.playerLocation || data.startArea || 'home',
        startArea: data.startArea || 'home',
      };

      console.log('[RealWorldMapService] 现实世界地图加载成功');
      return mapData;
    } catch (error) {
      console.error('[RealWorldMapService] 加载地图失败:', error);
      return null;
    }
  }

  /**
   * 更新玩家在现实世界的位置
   * @param areaId 区域 ID
   */
  async updatePlayerLocation(areaId: string): Promise<void> {
    try {
      const map = await this.loadMap();
      if (!map) {
        throw new Error('现实世界地图不存在');
      }

      if (!map.areas.has(areaId)) {
        throw new Error(`区域 ${areaId} 不存在`);
      }

      map.playerLocation = areaId;

      // 标记该区域为已发现
      const area = map.areas.get(areaId);
      if (area) {
        area.isDiscovered = true;
      }

      await this.saveMap(map);
      console.log(`[RealWorldMapService] 玩家位置更新为: ${areaId}`);
    } catch (error) {
      console.error('[RealWorldMapService] 更新玩家位置失败:', error);
      throw error;
    }
  }

  /**
   * 检查现实世界地图是否存在
   * @returns 是否存在地图
   */
  async hasMap(): Promise<boolean> {
    const map = await this.loadMap();
    return map !== null;
  }

  /**
   * 使用多层策略解析 AI 返回的文本
   * @param text AI 返回的原始文本
   * @param character 角色信息
   * @returns 解析后的地图数据
   */
  private async parseMapFromText(text: string, character: PlayerCharacter): Promise<MapData> {
    const YAML = (await import('yaml')).default;

    console.log('[RealWorldMapService] ========== 开始解析地图文本 ==========');
    console.log('[RealWorldMapService] 文本长度:', text.length, '字符');

    // 策略 1: 尝试提取 YAML 代码块
    console.log('[RealWorldMapService] ========== 策略 1: 提取 YAML 代码块 ==========');
    const patterns = [
      { regex: /```yaml\n([\s\S]*?)\n```/, name: '```yaml' },
      { regex: /```yml\n([\s\S]*?)\n```/, name: '```yml' },
      { regex: /```\n([\s\S]*?)\n```/, name: '```' },
    ];

    for (let i = 0; i < patterns.length; i++) {
      const { regex, name } = patterns[i];
      console.log(`[RealWorldMapService] 尝试模式 ${i + 1}: ${name}`);
      const match = text.match(regex);
      if (match) {
        console.log(`[RealWorldMapService] ✓ 找到代码块 (模式: ${name})`);
        console.log(`[RealWorldMapService] 代码块内容长度: ${match[1].length} 字符`);
        try {
          const mapData = YAML.parse(match[1]);
          console.log('[RealWorldMapService] ✓ YAML 解析成功');
          console.log('[RealWorldMapService] 解析结果:', {
            areas_count: mapData.areas?.length || 0,
            startArea: mapData.startArea,
            has_home: mapData.areas?.some((a: any) => a.id === 'home'),
          });
          if (this.validateMapData(mapData)) {
            console.log('[RealWorldMapService] ✓ 数据验证通过');
            console.log('[RealWorldMapService] 最终使用: AI 生成的地图数据');
            toastr.success('现实世界地图生成成功！');
            return this.buildMapData(mapData);
          } else {
            console.warn('[RealWorldMapService] ✗ 数据验证失败');
          }
        } catch (e) {
          console.warn(`[RealWorldMapService] ✗ YAML 解析失败:`, e instanceof Error ? e.message : String(e));
          continue;
        }
      } else {
        console.log(`[RealWorldMapService] ✗ 未找到匹配的代码块`);
      }
    }
    console.log('[RealWorldMapService] 策略 1 失败: 未能从代码块中提取有效数据');

    // 策略 2: 尝试直接解析整个文本
    console.log('[RealWorldMapService] ========== 策略 2: 直接解析整个文本 ==========');
    try {
      const mapData = YAML.parse(text);
      console.log('[RealWorldMapService] ✓ YAML 解析成功');
      console.log('[RealWorldMapService] 解析结果:', {
        areas_count: mapData.areas?.length || 0,
        startArea: mapData.startArea,
        has_home: mapData.areas?.some((a: any) => a.id === 'home'),
      });
      if (this.validateMapData(mapData)) {
        console.log('[RealWorldMapService] ✓ 数据验证通过');
        console.log('[RealWorldMapService] ========== 策略 2 成功 ==========');
        console.log('[RealWorldMapService] 最终使用: AI 生成的地图数据');
        toastr.success('现实世界地图生成成功！');
        return this.buildMapData(mapData);
      } else {
        console.warn('[RealWorldMapService] ✗ 数据验证失败');
      }
    } catch (e) {
      console.warn('[RealWorldMapService] ✗ YAML 解析失败:', e instanceof Error ? e.message : String(e));
    }
    console.log('[RealWorldMapService] 策略 2 失败: 无法直接解析文本');

    // 策略 3: 使用默认地图生成器（降级方案）
    console.warn('[RealWorldMapService] ========== 策略 3: 使用默认地图生成器（降级方案）==========');
    console.warn('[RealWorldMapService] 所有 AI 解析策略均失败，将生成默认地图');
    console.log('[RealWorldMapService] 降级原因: AI 返回的数据无法解析或验证失败');
    console.log('[RealWorldMapService] 角色信息:', {
      name: character.name,
      occupation: character.occupation,
      age: character.age,
    });
    console.log('[RealWorldMapService] 最终使用: 默认地图生成器（降级方案）');
    toastr.warning('AI 解析失败，已使用默认地图');
    return this.generateDefaultMap(character);
  }

  /**
   * 将解析后的 YAML 对象转换为 MapData 结构
   * @param mapData 解析后的 YAML 对象
   * @returns MapData 结构
   */
  private buildMapData(mapData: any): MapData {
    console.log('[RealWorldMapService] 构建 MapData 结构...');

    const areas = new Map<string, Area>();
    const startArea = mapData.startArea || 'home';

    if (mapData.areas && Array.isArray(mapData.areas)) {
      mapData.areas.forEach((area: any) => {
        areas.set(area.id, {
          id: area.id,
          name: area.name,
          description: area.description,
          background: area.background,
          connectedAreas: area.connectedAreas || [],
          isDiscovered: area.id === startArea, // 起始区域标记为已发现
          isDangerous: area.isDangerous || false,
          relatedNPCs: area.relatedNPCs || [],
        });
      });
    }

    const result: MapData = {
      areas,
      connections: mapData.connections || [],
      playerLocation: startArea,
      startArea: startArea,
    };

    console.log('[RealWorldMapService] MapData 构建完成，包含', areas.size, '个区域');
    return result;
  }

  /**
   * 验证地图数据的完整性
   * @param mapData 待验证的地图数据
   * @returns 是否有效
   */
  private validateMapData(mapData: any): boolean {
    if (!mapData || typeof mapData !== 'object') {
      console.warn('[RealWorldMapService] 地图数据不是对象');
      return false;
    }

    if (!mapData.areas || !Array.isArray(mapData.areas)) {
      console.warn('[RealWorldMapService] 缺少 areas 数组');
      return false;
    }

    if (mapData.areas.length === 0) {
      console.warn('[RealWorldMapService] areas 数组为空');
      return false;
    }

    // 检查是否有 home 区域
    const hasHome = mapData.areas.some((area: any) => area.id === 'home');
    if (!hasHome) {
      console.warn('[RealWorldMapService] 缺少 home 区域');
      return false;
    }

    // 检查每个区域的必需字段
    for (const area of mapData.areas) {
      if (!area.id || !area.name || !area.description) {
        console.warn('[RealWorldMapService] 区域缺少必需字段:', area);
        return false;
      }
    }

    return true;
  }

  /**
   * 生成默认地图作为降级方案
   * @param character 角色信息
   * @returns 默认地图数据
   */
  private generateDefaultMap(character: PlayerCharacter): MapData {
    console.log('[RealWorldMapService] 开始生成默认地图...');

    const areas = new Map<string, Area>();

    // 家
    areas.set('home', {
      id: 'home',
      name: `${character.name}的家`,
      description: `这是${character.name}温馨的住所`,
      connectedAreas: ['street'],
      isDiscovered: true,
      isDangerous: false,
      relatedNPCs: [],
    });

    // 街道
    areas.set('street', {
      id: 'street',
      name: '主街道',
      description: '城市的主要街道，连接着各个地点',
      connectedAreas: ['home', 'shop', 'park'],
      isDiscovered: false,
      isDangerous: false,
      relatedNPCs: [],
    });

    // 商店
    areas.set('shop', {
      id: 'shop',
      name: '便利店',
      description: '24小时营业的便利店',
      connectedAreas: ['street'],
      isDiscovered: false,
      isDangerous: false,
      relatedNPCs: [],
    });

    // 公园
    areas.set('park', {
      id: 'park',
      name: '城市公园',
      description: '适合散步和休息的公园',
      connectedAreas: ['street'],
      isDiscovered: false,
      isDangerous: false,
      relatedNPCs: [],
    });

    // 如果有职业，添加工作地点
    if (character.occupation && character.occupation !== '无业') {
      console.log(`[RealWorldMapService] 角色有职业 (${character.occupation})，添加工作地点`);
      areas.set('work', {
        id: 'work',
        name: `${character.occupation}工作地点`,
        description: `${character.name}的工作场所`,
        connectedAreas: ['street'],
        isDiscovered: false,
        isDangerous: false,
        relatedNPCs: [],
      });

      // 更新街道连接
      const street = areas.get('street')!;
      street.connectedAreas.push('work');
    } else {
      console.log('[RealWorldMapService] 角色无职业，不添加工作地点');
    }

    const result = {
      areas,
      connections: this.generateConnections(areas),
      playerLocation: 'home',
      startArea: 'home',
    };

    console.log('[RealWorldMapService] ✓ 默认地图生成完成，包含', areas.size, '个区域');
    return result;
  }

  /**
   * 根据区域的连接关系生成连接数组
   * @param areas 区域 Map
   * @returns 连接数组
   */
  private generateConnections(areas: Map<string, Area>): Array<{ from: string; to: string }> {
    const connections: Array<{ from: string; to: string }> = [];

    areas.forEach(area => {
      area.connectedAreas.forEach(connectedId => {
        // 避免重复的双向连接
        const reverseExists = connections.some(c => c.from === connectedId && c.to === area.id);
        if (!reverseExists) {
          connections.push({ from: area.id, to: connectedId });
        }
      });
    });

    return connections;
  }

  /**
   * 为地图中的所有区域生成详细信息
   * @param mapData 地图数据
   */
  private async generateAreaDetails(mapData: MapData): Promise<void> {
    try {
      const { areaDetailsService } = await import('./areaDetailsService');
      const areas = Array.from(mapData.areas.values());

      console.log(`[RealWorldMapService] 需要为 ${areas.length} 个区域生成详细信息`);
      console.log('[RealWorldMapService] 区域列表:', areas.map(a => a.name).join(', '));

      let successCount = 0;
      let failCount = 0;

      // 为每个区域生成详细信息
      for (let i = 0; i < areas.length; i++) {
        const area = areas[i];
        console.log(`[RealWorldMapService] 生成区域详情 (${i + 1}/${areas.length}): ${area.name}`);

        try {
          const details = await areaDetailsService.generateDetails(area, true);
          area.details = details;
          successCount++;
          console.log(`[RealWorldMapService] ✓ ${area.name} 详情生成完成`);
        } catch (error) {
          failCount++;
          console.error(`[RealWorldMapService] ✗ ${area.name} 详情生成失败:`, {
            error: error instanceof Error ? error.message : String(error),
            area_id: area.id,
          });
          // 继续生成其他区域的详情
        }
      }

      console.log('[RealWorldMapService] 所有区域详情生成完成:', {
        total: areas.length,
        success: successCount,
        failed: failCount,
      });
    } catch (error) {
      console.error('[RealWorldMapService] 生成区域详情失败:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      // 不阻塞地图生成流程
    }
  }
}

// 导出单例
export const realWorldMapService = new RealWorldMapService();
