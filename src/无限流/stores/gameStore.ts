// 游戏主状态 Store - 管理游戏的核心状态

import { klona } from 'klona';
import _ from 'lodash';
import { defineStore } from 'pinia';
import { computed, type Ref, ref, watchEffect } from 'vue';
import { mvuService } from '../services/mvuService';
import type { SceneData } from '../types/instance';
import type { DialogueDataType } from '../types/schemas';

/**
 * 游戏模式
 */
export type GameMode = 'main' | 'combat' | 'interaction' | 'creation';

/**
 * 游戏主状态 Store
 */
export const useGameStore = defineStore('game', () => {
  // ==================== 状态 ====================
  const initialized = ref(false);
  const mode: Ref<GameMode> = ref('main');
  const currentInstanceId = ref<string | undefined>(undefined);
  const currentArea = ref<string | undefined>(undefined);

  // 当前场景数据
  const currentScene = ref<SceneData>({
    background: '',
    sprites: [],
    areaId: undefined,
    description: undefined,
  });

  // 流式传输状态
  const isStreaming = ref(false);
  const streamingText = ref('');
  const streamingDialogue = ref<DialogueDataType | null>(null);
  const finalDialogue = ref<DialogueDataType | null>(null);

  // ==================== 计算属性 ====================
  const isInCombat = computed(() => mode.value === 'combat');
  const isInInteraction = computed(() => mode.value === 'interaction');
  const isInCreation = computed(() => mode.value === 'creation');
  const isInMainGame = computed(() => mode.value === 'main');

  // ==================== 方法 ====================

  /**
   * 初始化游戏状态
   * 从 MVU 变量加载游戏数据
   */
  async function initialize(): Promise<void> {
    if (initialized.value) {
      console.log('[Game Store] 已经初始化，跳过');
      return;
    }

    try {
      console.log('[Game Store] 开始初始化...');

      // 初始化 MVU 服务
      await mvuService.initialize();

      // 加载游戏数据
      const gameData = await mvuService.loadGameData();

      // 恢复游戏状态
      mode.value = gameData.game.mode;
      currentInstanceId.value = gameData.game.currentInstanceId;
      currentArea.value = gameData.game.currentArea;

      // 如果有当前副本，加载场景数据
      if (currentInstanceId.value && gameData.instances[currentInstanceId.value]) {
        const instance = gameData.instances[currentInstanceId.value];
        const area = instance.map.areas.get(currentArea.value || instance.map.startArea);

        if (area) {
          currentScene.value = {
            background: area.background || '',
            sprites: [],
            areaId: area.id,
            description: area.description,
          };
        }
      }

      initialized.value = true;
      console.log('[Game Store] 初始化完成');

      // 设置自动同步到 MVU（使用防抖优化）
      setupAutoSync();
    } catch (error) {
      console.error('[Game Store] 初始化失败:', error);
      toastr.error('游戏状态初始化失败');
      throw error;
    }
  }

  /**
   * 设置自动同步到 MVU
   * 使用 watchEffect 监听状态变化，使用防抖优化性能
   */
  function setupAutoSync(): void {
    // 创建防抖的保存函数
    const debouncedSave = _.debounce(async () => {
      try {
        const gameData = await mvuService.loadGameData();

        // 更新游戏状态
        gameData.game.mode = mode.value;
        gameData.game.currentInstanceId = currentInstanceId.value;
        gameData.game.currentArea = currentArea.value;

        // 使用 klona 去除 Proxy 层并保存
        await mvuService.saveGameData(klona(gameData));
        console.log('[Game Store] 自动同步到 MVU 成功');
      } catch (error) {
        console.error('[Game Store] 自动同步失败:', error);
      }
    }, 1000); // 1 秒防抖

    // 监听状态变化
    watchEffect(() => {
      if (!initialized.value) return;

      // 触发防抖保存
      debouncedSave();
    });
  }

  /**
   * 设置游戏模式
   */
  async function setMode(newMode: GameMode): Promise<void> {
    try {
      mode.value = newMode;
      await mvuService.updateGameMode(newMode);
      console.log(`[Game Store] 游戏模式切换为: ${newMode}`);
    } catch (error) {
      console.error('[Game Store] 切换游戏模式失败:', error);
      toastr.error('切换游戏模式失败');
    }
  }

  /**
   * 更新场景数据
   */
  function updateScene(scene: Partial<SceneData>): void {
    currentScene.value = {
      ...currentScene.value,
      ...scene,
    };
    console.log('[Game Store] 场景数据已更新:', currentScene.value);
  }

  /**
   * 设置当前副本
   */
  async function setCurrentInstance(instanceId: string): Promise<void> {
    try {
      currentInstanceId.value = instanceId;
      await mvuService.setCurrentInstance(instanceId);
      console.log(`[Game Store] 当前副本设置为: ${instanceId}`);
    } catch (error) {
      console.error('[Game Store] 设置当前副本失败:', error);
      toastr.error('切换副本失败');
    }
  }

  /**
   * 设置当前区域
   */
  async function setCurrentArea(areaId: string): Promise<void> {
    try {
      currentArea.value = areaId;
      await mvuService.updatePlayerLocation(areaId);
      console.log(`[Game Store] 当前区域设置为: ${areaId}`);
    } catch (error) {
      console.error('[Game Store] 设置当前区域失败:', error);
      toastr.error('切换区域失败');
    }
  }

  /**
   * 更新流式传输的对话内容
   * 在流式传输过程中实时更新
   */
  function updateStreamingDialogue(dialogue: DialogueDataType | null): void {
    streamingDialogue.value = dialogue;
    isStreaming.value = dialogue !== null;
  }

  /**
   * 设置完整的对话内容
   * 流式传输完成后调用
   */
  function setFinalDialogue(dialogue: DialogueDataType): void {
    finalDialogue.value = dialogue;
    streamingDialogue.value = null;
    isStreaming.value = false;
    console.log('[Game Store] 对话接收完成:', dialogue);
  }

  /**
   * 更新流式传输文本
   */
  function updateStreamingText(text: string): void {
    streamingText.value = text;
    isStreaming.value = text.length > 0;
  }

  /**
   * 清除流式传输状态
   */
  function clearStreaming(): void {
    isStreaming.value = false;
    streamingText.value = '';
    streamingDialogue.value = null;
  }

  /**
   * 生成新副本
   * 支持随机生成或通过自定义提示词生成
   * @param config 副本生成配置
   */
  async function generateInstance(
    config: {
      type?: string;
      difficulty?: number;
      customPrompt?: string;
      areaCount?: number;
    } = {},
  ): Promise<string> {
    try {
      console.log('[Game Store] 开始生成副本...', config);
      toastr.info('正在生成副本...');

      // 导入必要的服务和 store
      const { streamService } = await import('../services/streamService');
      const { useInstanceStore } = await import('./instanceStore');
      const instanceStore = useInstanceStore();

      // 生成副本 ID
      const instanceId = `instance_${Date.now()}`;

      // 随机生成类型和难度（如果未指定）
      const instanceTypes = ['恐怖', '修仙', '现代', '科幻', '奇幻', '武侠', '末日', '推理'];
      const finalType = config.type || instanceTypes[Math.floor(Math.random() * instanceTypes.length)];
      const finalDifficulty = config.difficulty || Math.floor(Math.random() * 5) + 1;
      const areaCount = config.areaCount || Math.floor(Math.random() * 6) + 5; // 5-10 个区域

      // 构建 AI 生成提示
      let prompt = '';

      if (config.customPrompt) {
        // 使用自定义提示词
        prompt = `请生成一个无限流副本，要求如下：
${config.customPrompt}

副本难度：${finalDifficulty}/5
地图区域数量：${areaCount}

请按照以下 YAML 格式输出副本信息：
\`\`\`yaml
name: 副本名称
type: ${finalType}
difficulty: ${finalDifficulty}
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
  connections:
    - from: area_1
      to: area_2
\`\`\``;
      } else {
        // 随机生成
        prompt = `请生成一个${finalType}类型的无限流副本，难度为 ${finalDifficulty}/5。

副本要求：
- 地图包含 ${areaCount} 个区域
- 每个区域都有独特的名称和描述
- 区域之间有合理的连接关系
- 起始区域应该相对安全
- 难度越高，危险区域越多

请按照以下 YAML 格式输出副本信息：
\`\`\`yaml
name: 副本名称
type: ${finalType}
difficulty: ${finalDifficulty}
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
  connections:
    - from: area_1
      to: area_2
\`\`\``;
      }

      // 设置流式传输回调，等待 AI 生成完成
      return new Promise<string>((resolve, reject) => {
        let generatedData: any = null;

        streamService.setCallbacks({
          onComplete: async (text: string) => {
            try {
              console.log('[Game Store] 副本生成完成，解析数据...');

              // 解析 YAML 格式的副本数据
              const yamlMatch = text.match(/```yaml\n([\s\S]*?)\n```/);
              if (!yamlMatch) {
                throw new Error('未找到有效的 YAML 格式副本数据');
              }

              const YAML = (await import('yaml')).default;
              generatedData = YAML.parse(yamlMatch[1]);

              // 构建完整的副本记录
              const areas = new Map<string, any>();
              if (generatedData.map?.areas) {
                generatedData.map.areas.forEach((area: any) => {
                  areas.set(area.id, {
                    ...area,
                    isDiscovered: area.id === generatedData.map.startArea, // 起始区域标记为已发现
                  });
                });
              }

              const instanceRecord: import('../types/instance').InstanceRecord = {
                id: instanceId,
                name: generatedData.name || `${finalType}副本`,
                type: finalType,
                difficulty: finalDifficulty as import('../types/instance').InstanceDifficulty,
                worldSetting: generatedData.worldSetting || '',
                map: {
                  areas,
                  connections: generatedData.map?.connections || [],
                  playerLocation: generatedData.map?.startArea || 'area_1',
                  startArea: generatedData.map?.startArea || 'area_1',
                },
                characters: [],
                events: [],
                startTime: Date.now(),
                isActive: true,
                customPrompt: config.customPrompt,
              };

              // 保存副本到 instanceStore 和 MVU
              await instanceStore.addInstance(instanceRecord);

              // 设置为当前副本
              await setCurrentInstance(instanceId);

              // 更新当前区域
              await setCurrentArea(instanceRecord.map.startArea);

              // 更新场景
              const startArea = areas.get(instanceRecord.map.startArea);
              if (startArea) {
                updateScene({
                  background: startArea.background || '',
                  sprites: [],
                  areaId: startArea.id,
                  description: startArea.description,
                });
              }

              console.log('[Game Store] 副本生成成功:', instanceRecord.name);
              toastr.success(`副本 ${instanceRecord.name} 生成成功！`);

              // 清除回调
              streamService.clearCallbacks();

              resolve(instanceId);
            } catch (error) {
              console.error('[Game Store] 解析副本数据失败:', error);
              toastr.error('副本数据解析失败，请重试');
              streamService.clearCallbacks();
              reject(error);
            }
          },
          onError: (error: Error) => {
            console.error('[Game Store] 副本生成失败:', error);
            toastr.error('副本生成失败');
            streamService.clearCallbacks();
            reject(error);
          },
        });

        // 触发 AI 生成
        streamService.sendMessage(prompt).catch(reject);
      });
    } catch (error) {
      console.error('[Game Store] 生成副本失败:', error);
      toastr.error('生成副本失败');
      throw error;
    }
  }

  /**
   * 重置游戏状态
   */
  function reset(): void {
    initialized.value = false;
    mode.value = 'main';
    currentInstanceId.value = undefined;
    currentArea.value = undefined;
    currentScene.value = {
      background: '',
      sprites: [],
      areaId: undefined,
      description: undefined,
    };
    clearStreaming();
    console.log('[Game Store] 游戏状态已重置');
  }

  // ==================== 返回 ====================
  return {
    // 状态
    initialized,
    mode,
    currentInstanceId,
    currentArea,
    currentScene,
    isStreaming,
    streamingText,
    streamingDialogue,
    finalDialogue,

    // 计算属性
    isInCombat,
    isInInteraction,
    isInCreation,
    isInMainGame,

    // 方法
    initialize,
    setMode,
    updateScene,
    setCurrentInstance,
    setCurrentArea,
    updateStreamingDialogue,
    setFinalDialogue,
    updateStreamingText,
    clearStreaming,
    generateInstance,
    reset,
  };
});
