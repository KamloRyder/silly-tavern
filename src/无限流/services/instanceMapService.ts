// 里世界地图生成服务 - 负责生成副本（里世界）地图

import type { InstanceDifficulty, InstanceType } from '../types/instance';
import { withAPIContext } from '../utils/apiContext';

/**
 * 副本地图生成配置
 */
export interface InstanceMapConfig {
  /** 副本类型 */
  type: InstanceType;
  /** 副本难度 */
  difficulty: InstanceDifficulty;
  /** 自定义提示词（可选） */
  customPrompt?: string;
  /** 主控角色名称 */
  playerName: string;
  /** 主控角色背景 */
  playerBackground: string;
}

/**
 * 生成的副本地图数据
 */
export interface GeneratedInstanceMap {
  name: string;
  worldSetting: string;
  map: {
    startArea: string;
    areas: Array<{
      id: string;
      name: string;
      description: string;
      background?: string;
      connectedAreas: string[];
      isDangerous: boolean;
      relatedNPCs?: string[];
    }>;
    connections: Array<{
      from: string;
      to: string;
    }>;
  };
}

/**
 * 里世界地图生成服务
 * 负责生成副本（里世界）地图，确保使用 innerWorld API
 */
class InstanceMapService {
  /**
   * 生成副本地图
   * @param config 副本地图生成配置
   * @returns 生成的副本地图数据
   */
  async generateMap(config: InstanceMapConfig): Promise<GeneratedInstanceMap> {
    // 使用 withAPIContext 确保使用 sanctuary API（归所）
    // 地图生成等不触发 AI 对话的功能统一使用归所 API
    return await withAPIContext('sanctuary', async () => {
      console.log('[InstanceMapService] 开始生成里世界地图...');

      // 构建 AI 生成提示
      const prompt = this.buildPrompt(config);

      // 使用 generate 函数直接调用 AI，不在聊天界面显示
      console.log('[InstanceMapService] 调用 AI 生成地图...');
      console.log('[InstanceMapService] AI 调用参数:', {
        should_stream: false,
        prompt_length: prompt.length,
      });

      const text = await generate({
        user_input: prompt,
        should_stream: false,
      });

      console.log('[InstanceMapService] AI 生成完成，开始解析地图数据');

      // 解析 YAML 格式的地图数据
      const mapData = await this.parseMapData(text);

      console.log('[InstanceMapService] ✅ 里世界地图生成成功:', {
        name: mapData.name,
        areaCount: mapData.map.areas.length,
      });

      return mapData;
    });
  }

  /**
   * 构建 AI 生成提示
   */
  private buildPrompt(config: InstanceMapConfig): string {
    // 如果有自定义提示词，使用自定义提示词
    if (config.customPrompt) {
      return config.customPrompt;
    }

    // 否则使用默认提示词模板
    return `你是一个副本数据生成器。请严格按照以下要求生成副本数据：

【重要】只返回 YAML 格式的数据，不要添加任何解释或叙述性文本。

主控角色信息：
- 姓名：${config.playerName}
- 背景：${config.playerBackground}

副本要求：
- 类型：${config.type}
- 难度：${config.difficulty}

请生成一个符合以下格式的副本数据：

\`\`\`yaml
name: 副本名称
worldSetting: 世界观与背景描述（详细描述这个副本的世界设定、规则、氛围等）
map:
  startArea: 起始区域ID
  areas:
    - id: area_1
      name: 区域名称
      description: 区域描述
      background: 背景图片URL（可选，使用 GitHub 链接）
      connectedAreas: [area_2, area_3]
      isDangerous: false
      relatedNPCs: [npc_id_1, npc_id_2]  # 可选，与该区域相关的重要 NPC ID
  connections:
    - from: area_1
      to: area_2
\`\`\`

现在请生成副本数据：`;
  }

  /**
   * 解析 AI 生成的地图数据
   */
  private async parseMapData(text: string): Promise<GeneratedInstanceMap> {
    // 解析 YAML 格式的副本数据
    const yamlMatch = text.match(/```yaml\n([\s\S]*?)\n```/);
    if (!yamlMatch) {
      console.error('[InstanceMapService] 未找到有效的 YAML 格式副本数据');
      throw new Error('未找到有效的 YAML 格式副本数据');
    }

    const YAML = (await import('yaml')).default;
    const generatedData = YAML.parse(yamlMatch[1]);

    // 验证必需字段
    if (!generatedData.name) {
      throw new Error('副本数据缺少 name 字段');
    }
    if (!generatedData.map || !generatedData.map.areas) {
      throw new Error('副本数据缺少 map.areas 字段');
    }

    return generatedData as GeneratedInstanceMap;
  }
}

// 导出单例
export const instanceMapService = new InstanceMapService();
