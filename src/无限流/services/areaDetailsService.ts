// 区域详细信息生成服务

import type { Area, AreaDetails, Item } from '../types/instance';

/**
 * 区域详细信息生成服务
 */
class AreaDetailsService {
  /**
   * 为区域生成详细信息
   * @param area 区域数据
   * @param isRealWorld 是否为现实世界
   * @returns 生成的详细信息
   */
  async generateDetails(area: Area, isRealWorld: boolean = false): Promise<AreaDetails> {
    // 使用 withAPIContext 确保使用 sanctuary API（归所）
    // 区域详情生成等不触发 AI 对话的功能统一使用归所 API
    return await withAPIContext('sanctuary', async () => {
      try {
        console.log(`[AreaDetailsService] 开始生成区域详细信息: ${area.name}`);
        toastr.info('正在生成区域详细信息...');

        // 构建 AI 生成提示
        const worldType = isRealWorld ? '现实世界' : '副本世界';
        const prompt = `你是一个游戏场景描述生成器。请为以下地点生成详细信息，严格按照 YAML 格式返回。

地点信息：
- 名称：${area.name}
- 基础描述：${area.description}
- 世界类型：${worldType}
- 是否危险：${area.isDangerous ? '是' : '否'}

要求：
1. 必须使用 \`\`\`yaml 代码块包裹
2. environment: 环境描述（50-100字，描述地点的外观、布局、光线等）
3. atmosphere: 氛围描述（30-50字，描述地点给人的感觉）
4. items: 可获取的道具列表（2-4个道具）
   - 每个道具包含 id、name、description（一句话）、type
   - 道具必须符合地点特征
   - ${isRealWorld ? '现实世界道具应该是日常物品' : '副本道具可以是特殊物品'}

示例格式：
\`\`\`yaml
environment: 这是一个宽敞明亮的便利店，货架整齐地排列着各种商品。白色的日光灯照亮整个空间，收银台旁边摆放着热饮机和微波炉。
atmosphere: 安静祥和，偶尔传来冰柜的嗡嗡声，空气中弥漫着咖啡的香气。
items:
  - id: item_${Date.now()}_1
    name: 矿泉水
    description: 一瓶普通的矿泉水，可以补充水分
    type: 消耗品
  - id: item_${Date.now()}_2
    name: 便当
    description: 新鲜的便当，可以恢复体力
    type: 食物
\`\`\`

现在请生成 ${area.name} 的详细信息：`;

        // 使用 generateRaw 进行静默调用，不会触发聊天界面
        // withAPIContext 已确保使用 sanctuary API
        let text: string;
        try {
          text = await generateRaw({
            ordered_prompts: [{ role: 'user', content: prompt }],
          });
          console.log('[AreaDetailsService] AI 生成完成，开始解析...');
        } catch (apiError) {
          console.error('[AreaDetailsService] API 调用失败:', {
            error: apiError instanceof Error ? apiError.message : String(apiError),
            stack: apiError instanceof Error ? apiError.stack : undefined,
          });

          // API 调用失败，使用默认详细信息
          console.log('[AreaDetailsService] API 调用失败，使用默认详细信息');
          toastr.warning(`${area.name} 使用默认详细信息（API 不可用）`);
          return this.generateDefaultDetails(area, isRealWorld);
        }

        const result = await this.parseDetailsFromText(text);
        toastr.success('区域详细信息生成成功！');
        return result;
      } catch (error) {
        console.error('[AreaDetailsService] 生成区域详细信息失败:', error);
        toastr.warning('使用默认详细信息');
        return this.generateDefaultDetails(area, isRealWorld);
      }
    });
  }

  /**
   * 从 AI 返回的文本中解析详细信息
   */
  private async parseDetailsFromText(text: string): Promise<AreaDetails> {
    const YAML = (await import('yaml')).default;

    console.log('[AreaDetailsService] 开始解析文本...');

    // 尝试提取 YAML 代码块
    const patterns = [
      { regex: /```yaml\n([\s\S]*?)\n```/, name: '```yaml' },
      { regex: /```yml\n([\s\S]*?)\n```/, name: '```yml' },
      { regex: /```\n([\s\S]*?)\n```/, name: '```' },
    ];

    for (const { regex, name } of patterns) {
      const match = text.match(regex);
      if (match) {
        console.log(`[AreaDetailsService] 找到代码块 (${name})`);
        try {
          const data = YAML.parse(match[1]);
          if (this.validateDetails(data)) {
            console.log('[AreaDetailsService] 解析成功');
            return this.buildDetails(data);
          }
        } catch (e) {
          console.warn('[AreaDetailsService] YAML 解析失败:', e);
        }
      }
    }

    // 尝试直接解析
    try {
      const data = YAML.parse(text);
      if (this.validateDetails(data)) {
        console.log('[AreaDetailsService] 直接解析成功');
        return this.buildDetails(data);
      }
    } catch (e) {
      console.warn('[AreaDetailsService] 直接解析失败:', e);
    }

    throw new Error('无法解析详细信息');
  }

  /**
   * 验证详细信息数据
   */
  private validateDetails(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      typeof data.environment === 'string' &&
      typeof data.atmosphere === 'string' &&
      Array.isArray(data.items)
    );
  }

  /**
   * 构建详细信息对象
   */
  private buildDetails(data: any): AreaDetails {
    return {
      environment: data.environment,
      atmosphere: data.atmosphere,
      items: data.items.map((item: any) => ({
        id: item.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: item.name,
        description: item.description,
        type: item.type,
      })),
    };
  }

  /**
   * 生成默认详细信息
   */
  private generateDefaultDetails(area: Area, isRealWorld: boolean): AreaDetails {
    console.log('[AreaDetailsService] 生成默认详细信息');

    const defaultItems: Item[] = isRealWorld
      ? [
          {
            id: `item_${Date.now()}_1`,
            name: '矿泉水',
            description: '一瓶普通的矿泉水，可以补充水分',
            type: '消耗品',
          },
          {
            id: `item_${Date.now()}_2`,
            name: '便当',
            description: '新鲜的便当，可以恢复体力',
            type: '食物',
          },
        ]
      : [
          {
            id: `item_${Date.now()}_1`,
            name: '神秘药水',
            description: '散发着奇异光芒的药水，效果未知',
            type: '消耗品',
          },
          {
            id: `item_${Date.now()}_2`,
            name: '古老卷轴',
            description: '记载着某种知识的卷轴',
            type: '材料',
          },
        ];

    return {
      environment: `${area.description}。这里的环境${area.isDangerous ? '充满危险气息' : '相对安全'}。`,
      atmosphere: area.isDangerous ? '紧张压抑，让人不安' : '平静祥和，令人放松',
      items: defaultItems,
    };
  }
}

export const areaDetailsService = new AreaDetailsService();
