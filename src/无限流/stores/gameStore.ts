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
export type GameMode = 'main' | 'combat' | 'sanctuary' | 'creation';

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
  const isInSanctuary = computed(() => mode.value === 'sanctuary');
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
  async function setCurrentInstance(instanceId: string | null): Promise<void> {
    try {
      currentInstanceId.value = instanceId || undefined;

      if (instanceId) {
        await mvuService.setCurrentInstance(instanceId);

        // 切换到里世界世界书
        const { worldBookService } = await import('../services/worldBookService');
        await worldBookService.activateInnerWorldEntries();

        console.log(`[Game Store] 当前副本设置为: ${instanceId}`);
      } else {
        // 退出副本，切换回现实世界世界书
        const { worldBookService } = await import('../services/worldBookService');
        await worldBookService.activateRealWorldEntries();

        console.log('[Game Store] 已退出副本，返回现实世界');
      }
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
      npcs?: Array<import('../types/instance').CharacterInInstance & { id: string }>;
    } = {},
  ): Promise<string> {
    try {
      console.log('[Game Store] 开始生成副本...', {
        type: config.type,
        difficulty: config.difficulty,
        areaCount: config.areaCount,
        npcCount: config.npcs?.length,
        hasCustomPrompt: !!config.customPrompt,
      });
      toastr.info('正在生成副本...');

      // 导入必要的 store
      const { useInstanceStore } = await import('./instanceStore');
      const instanceStore = useInstanceStore();

      // 生成副本 ID
      const instanceId = `instance_${Date.now()}`;

      // 随机生成类型和难度（如果未指定）
      const instanceTypes = ['恐怖', '修仙', '现代', '科幻', '奇幻', '武侠', '末日', '推理'];
      const finalType = config.type || instanceTypes[Math.floor(Math.random() * instanceTypes.length)];
      const finalDifficulty = config.difficulty || Math.floor(Math.random() * 5) + 1;
      const areaCount = config.areaCount || Math.floor(Math.random() * 6) + 5; // 5-10 个区域

      console.log('[Game Store] 副本参数:', {
        instanceId,
        type: finalType,
        difficulty: finalDifficulty,
        areaCount,
      });

      // 生成 NPC（如果未提供）
      let npcs: Array<import('../types/instance').CharacterInInstance> = [];
      if (config.npcs) {
        // 使用提供的 NPC
        npcs = config.npcs.map(npc => ({
          characterId: npc.id,
          character: npc.character,
          isImportant: (npc.importance || 0) >= 3,
          importance: npc.importance,
          source: npc.source,
          appearanceCount: 0,
        }));
        console.log(`[Game Store] 使用提供的 ${npcs.length} 个 NPC`);
      } else {
        // 自动生成 NPC
        try {
          const { npcGenerationCoordinator } = await import('../services/npcGenerationCoordinator');

          // 计算 NPC 数量
          const npcCount = npcGenerationCoordinator.calculateNPCCount(finalDifficulty);
          console.log(`[Game Store] 将生成 ${npcCount} 个 NPC`);
          toastr.info(`正在生成 ${npcCount} 个 NPC...`);

          // 生成 NPC，显示进度
          const generatedNPCs = await npcGenerationCoordinator.generateRandomNPCs(
            npcCount,
            finalType,
            undefined,
            (current, total) => {
              console.log(`[Game Store] NPC 生成进度: ${current}/${total}`);
              // 显示进度信息，使用较短的超时时间避免堆积
              toastr.info(`正在生成第 ${current}/${total} 个 NPC...`, '副本生成', {
                timeOut: 800,
                extendedTimeOut: 0,
              });
            },
          );

          // 将生成的 NPC 转换为 CharacterInInstance 格式
          npcs = generatedNPCs.map(npc => {
            // 随机生成重要程度（1-3）
            const importance = (Math.floor(Math.random() * 3) + 1) as 1 | 2 | 3;

            return {
              characterId: npc.id,
              character: npc,
              isImportant: importance >= 3,
              importance,
              appearanceCount: 0,
            };
          });

          console.log(`[Game Store] ✅ 成功生成 ${npcs.length} 个 NPC`);
          toastr.success(`成功生成 ${npcs.length} 个 NPC`, '副本生成', { timeOut: 2000 });
        } catch (error) {
          // NPC 生成失败时显示警告但继续创建副本
          console.error('[Game Store] NPC 生成失败:', error);
          toastr.warning('NPC 生成失败，将创建不含 NPC 的副本');
          npcs = [];
        }
      }

      // 构建 NPC 信息（如果有）
      let npcInfo = '';
      const importantNPCs = npcs.filter(npc => (npc.importance || 0) >= 3);

      if (importantNPCs.length > 0) {
        npcInfo = '\n\n重要 NPC 信息（请为这些 NPC 生成相关地点）：\n';
        importantNPCs.forEach(npc => {
          npcInfo += `- ${npc.character.name}（重要程度：${npc.importance}/5）：${npc.character.occupation || '未知职业'}，${npc.character.background || '无背景描述'}\n`;
        });
        console.log(`[Game Store] 包含 ${importantNPCs.length} 个重要 NPC`);
      }

      // 构建 AI 生成提示
      let prompt = '';

      if (config.customPrompt) {
        // 使用自定义提示词
        prompt = `请生成一个无限流副本，要求如下：
${config.customPrompt}

副本难度：${finalDifficulty}/5
地图区域数量：${areaCount}${npcInfo}

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
      relatedNPCs: [npc_id_1, npc_id_2]  # 可选，与该区域相关的重要 NPC ID
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
- 难度越高，危险区域越多${npcInfo ? '\n- 为重要 NPC 生成相关地点（如住所、工作地点等）' : ''}${npcInfo}

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
      relatedNPCs: [npc_id_1, npc_id_2]  # 可选，与该区域相关的重要 NPC ID
  connections:
    - from: area_1
      to: area_2
\`\`\``;
      }

      console.log('[Game Store] 调用 AI 生成副本地图 (静默模式)');
      toastr.info('正在生成副本地图...', '副本生成');

      // 使用静默模式调用 AI 生成，不在聊天界面显示
      const text = await generate({
        user_input: prompt,
        should_stream: false, // 静默模式，不触发流式传输事件
      });

      console.log('[Game Store] AI 生成完成，开始解析副本数据');

      // 解析 YAML 格式的副本数据
      const yamlMatch = text.match(/```yaml\n([\s\S]*?)\n```/);
      if (!yamlMatch) {
        console.error('[Game Store] 未找到有效的 YAML 格式副本数据');
        throw new Error('未找到有效的 YAML 格式副本数据');
      }

      const YAML = (await import('yaml')).default;
      const generatedData = YAML.parse(yamlMatch[1]);

      console.log('[Game Store] 副本数据解析成功:', {
        name: generatedData.name,
        areaCount: generatedData.map?.areas?.length,
      });

      // 构建完整的副本记录
      const areas = new Map<string, any>();
      if (generatedData.map?.areas) {
        generatedData.map.areas.forEach((area: any) => {
          areas.set(area.id, {
            ...area,
            isDiscovered: area.id === generatedData.map.startArea, // 起始区域标记为已发现
            relatedNPCs: area.relatedNPCs || [], // 保留 AI 生成的 NPC 关联
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
        characters: npcs, // 使用生成的 NPC 列表
        events: [],
        mementos: [], // 初始化空的纪念品数组
        status: 'draft', // 设置副本状态为草稿
        startTime: Date.now(),
        isActive: true,
        customPrompt: config.customPrompt,
      };

      console.log('[Game Store] 保存副本到 instanceStore 和全局变量');

      // 保存副本到 instanceStore 和 MVU
      await instanceStore.addInstance(instanceRecord);

      console.log('[Game Store] 副本已保存到全局变量:', {
        instanceId,
        name: instanceRecord.name,
        areaCount: areas.size,
      });

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

      console.log('[Game Store] ✅ 副本生成成功:', {
        instanceId,
        name: instanceRecord.name,
        type: finalType,
        difficulty: finalDifficulty,
        areaCount: areas.size,
        npcCount: npcs.length,
      });

      toastr.success(`副本「${instanceRecord.name}」生成成功！`, '副本生成');

      return instanceId;
    } catch (error) {
      console.error('[Game Store] 生成副本失败:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      toastr.error('生成副本失败，请重试', '副本生成');
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
    isInSanctuary,
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
