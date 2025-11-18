import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { npcGenerationCoordinator } from '../../services/npcGenerationCoordinator';
import { useGameStore } from '../../stores/gameStore';
import { useInstanceStore } from '../../stores/instanceStore';
import type { NPCCharacter } from '../../types/character';

// Mock services
const mockStreamService = {
  setCallbacks: vi.fn(),
  clearCallbacks: vi.fn(),
  sendMessage: vi.fn(),
};

vi.mock('../../services/streamService', () => ({
  streamService: mockStreamService,
}));

vi.mock('../../services/mvuService', () => ({
  mvuService: {
    initialize: vi.fn().mockResolvedValue(undefined),
    loadGameData: vi.fn().mockResolvedValue({
      game: {
        mode: 'main',
        currentInstanceId: undefined,
        currentArea: undefined,
      },
      instances: {},
    }),
    saveGameData: vi.fn().mockResolvedValue(undefined),
    updateGameMode: vi.fn().mockResolvedValue(undefined),
    setCurrentInstance: vi.fn().mockResolvedValue(undefined),
    updatePlayerLocation: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../services/worldBookService', () => ({
  worldBookService: {
    activateInnerWorldEntries: vi.fn().mockResolvedValue(undefined),
    activateRealWorldEntries: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../services/npcGenerationService', () => ({
  npcGenerationService: {
    generateRandom: vi.fn(),
    generateCustom: vi.fn(),
    generateRelatedNPC: vi.fn(),
  },
}));

describe('副本创建集成测试', () => {
  let gameStore: ReturnType<typeof useGameStore>;
  let instanceStore: ReturnType<typeof useInstanceStore>;

  beforeEach(async () => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    gameStore = useGameStore();
    instanceStore = useInstanceStore();
    await gameStore.initialize();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * 创建模拟的 NPC 数据
   */
  function createMockNPC(id: string, name: string, occupation: string): NPCCharacter {
    return {
      id,
      type: 'npc',
      name,
      age: 30,
      occupation,
      background: `${name}的背景故事`,
      attributes: {
        STR: 50,
        CON: 50,
        SIZ: 50,
        DEX: 50,
        APP: 50,
        INT: 50,
        POW: 50,
        EDU: 50,
        LUK: 50,
      },
      derivedStats: {
        HP: 10,
        maxHP: 10,
        MP: 10,
        maxMP: 10,
        SAN: 50,
        maxSAN: 50,
        MOV: 8,
        DB: '0',
        BUILD: 0,
      },
      skills: new Map(),
      bodyParts: [],
      inventory: [],
      affection: 50,
      isImportant: false,
      events: [],
    };
  }

  /**
   * 模拟 AI 生成副本数据
   */
  function mockInstanceGeneration(instanceName: string, difficulty: number, areaCount: number = 5) {
    mockStreamService.sendMessage.mockImplementation(async () => {
      // 模拟异步生成
      await new Promise(resolve => setTimeout(resolve, 10));

      // 获取回调并触发完成
      const callbacks = mockStreamService.setCallbacks.mock.calls[0]?.[0];
      if (callbacks?.onComplete) {
        // 构建模拟的 YAML 数据
        const areas = Array.from({ length: areaCount }, (_, i) => ({
          id: `area_${i + 1}`,
          name: `区域${i + 1}`,
          description: `这是区域${i + 1}的描述`,
          connectedAreas: i < areaCount - 1 ? [`area_${i + 2}`] : [],
          isDangerous: i > 0,
        }));

        const yamlData = `\`\`\`yaml
name: ${instanceName}
type: 恐怖
difficulty: ${difficulty}
worldSetting: 这是一个恐怖的世界
map:
  startArea: area_1
  areas:
${areas
  .map(
    a => `    - id: ${a.id}
      name: ${a.name}
      description: ${a.description}
      connectedAreas: [${a.connectedAreas.join(', ')}]
      isDangerous: ${a.isDangerous}`,
  )
  .join('\n')}
  connections:
${areas
  .slice(0, -1)
  .map(
    (_, i) => `    - from: area_${i + 1}
      to: area_${i + 2}`,
  )
  .join('\n')}
\`\`\``;

        callbacks.onComplete(yamlData);
      }
    });
  }

  describe('完整的副本创建流程（包含NPC生成）', () => {
    it('应该成功创建包含自动生成NPC的副本', async () => {
      // 准备：模拟 NPC 生成
      const mockNPCs = [
        createMockNPC('npc_1', '张三', '调查员'),
        createMockNPC('npc_2', '李四', '医生'),
        createMockNPC('npc_3', '王五', '警察'),
      ];

      vi.spyOn(npcGenerationCoordinator, 'calculateNPCCount').mockReturnValue(3);
      vi.spyOn(npcGenerationCoordinator, 'generateRandomNPCs').mockResolvedValue(mockNPCs);

      // 模拟副本生成
      mockInstanceGeneration('恐怖副本', 3);

      // 执行：创建副本
      const instanceId = await gameStore.generateInstance({
        type: '恐怖',
        difficulty: 3,
      });

      // 验证：副本创建成功
      expect(instanceId).toBeDefined();
      expect(instanceId).toMatch(/^instance_\d+$/);

      // 验证：NPC 生成被调用
      expect(npcGenerationCoordinator.calculateNPCCount).toHaveBeenCalledWith(3);
      expect(npcGenerationCoordinator.generateRandomNPCs).toHaveBeenCalledWith(
        3,
        '恐怖',
        undefined,
        expect.any(Function),
      );

      // 验证：副本包含生成的 NPC
      const instance = instanceStore.instances.get(instanceId);
      expect(instance).toBeDefined();
      expect(instance!.characters).toHaveLength(3);
      expect(instance!.characters.map(c => c.character.name)).toEqual(['张三', '李四', '王五']);

      // 验证：NPC 有正确的重要程度
      instance!.characters.forEach(char => {
        expect(char.importance).toBeGreaterThanOrEqual(1);
        expect(char.importance).toBeLessThanOrEqual(3);
      });

      // 验证：游戏状态更新
      expect(gameStore.currentInstanceId).toBe(instanceId);
    });

    it('应该在 NPC 生成失败时仍能创建副本', async () => {
      // 准备：模拟 NPC 生成失败
      vi.spyOn(npcGenerationCoordinator, 'calculateNPCCount').mockReturnValue(3);
      vi.spyOn(npcGenerationCoordinator, 'generateRandomNPCs').mockRejectedValue(new Error('NPC 生成失败'));

      // 模拟副本生成
      mockInstanceGeneration('恐怖副本', 2);

      // 执行：创建副本
      const instanceId = await gameStore.generateInstance({
        type: '恐怖',
        difficulty: 2,
      });

      // 验证：副本创建成功
      expect(instanceId).toBeDefined();

      // 验证：副本不包含 NPC
      const instance = instanceStore.instances.get(instanceId);
      expect(instance).toBeDefined();
      expect(instance!.characters).toHaveLength(0);

      // 验证：显示了警告提示
      expect(toastr.warning).toHaveBeenCalledWith(expect.stringContaining('NPC 生成失败'));
    });

    it('应该显示 NPC 生成进度', async () => {
      // 准备：模拟 NPC 生成并捕获进度回调
      const mockNPCs = [createMockNPC('npc_1', '张三', '调查员'), createMockNPC('npc_2', '李四', '医生')];

      let progressCallback: ((current: number, total: number) => void) | undefined;

      vi.spyOn(npcGenerationCoordinator, 'calculateNPCCount').mockReturnValue(2);
      vi.spyOn(npcGenerationCoordinator, 'generateRandomNPCs').mockImplementation(
        async (_count, _type, _customNPCs, onProgress) => {
          progressCallback = onProgress;
          // 模拟进度更新
          if (progressCallback) {
            progressCallback(1, 2);
            await new Promise(resolve => setTimeout(resolve, 10));
            progressCallback(2, 2);
          }
          return mockNPCs;
        },
      );

      // 模拟副本生成
      mockInstanceGeneration('恐怖副本', 2);

      // 执行：创建副本
      await gameStore.generateInstance({
        type: '恐怖',
        difficulty: 2,
      });

      // 验证：进度回调被调用
      expect(progressCallback).toBeDefined();

      // 验证：显示了进度提示
      expect(toastr.info).toHaveBeenCalledWith(
        expect.stringContaining('正在生成第 1/2 个 NPC'),
        expect.any(String),
        expect.any(Object),
      );
      expect(toastr.info).toHaveBeenCalledWith(
        expect.stringContaining('正在生成第 2/2 个 NPC'),
        expect.any(String),
        expect.any(Object),
      );
    });
  });

  describe('不同难度下的NPC数量', () => {
    it.each([
      { difficulty: 1, expectedMin: 1, expectedMax: 2 },
      { difficulty: 2, expectedMin: 2, expectedMax: 3 },
      { difficulty: 3, expectedMin: 3, expectedMax: 4 },
      { difficulty: 4, expectedMin: 4, expectedMax: 5 },
      { difficulty: 5, expectedMin: 5, expectedMax: 6 },
    ])(
      '难度 $difficulty 应该生成 $expectedMin-$expectedMax 个 NPC',
      async ({ difficulty, expectedMin, expectedMax }) => {
        // 准备：模拟 NPC 生成
        const npcCount = npcGenerationCoordinator.calculateNPCCount(difficulty);
        const mockNPCs = Array.from({ length: npcCount }, (_, i) =>
          createMockNPC(`npc_${i + 1}`, `NPC${i + 1}`, '调查员'),
        );

        vi.spyOn(npcGenerationCoordinator, 'generateRandomNPCs').mockResolvedValue(mockNPCs);

        // 模拟副本生成
        mockInstanceGeneration(`难度${difficulty}副本`, difficulty);

        // 执行：创建副本
        const instanceId = await gameStore.generateInstance({
          type: '恐怖',
          difficulty,
        });

        // 验证：NPC 数量在预期范围内
        const instance = instanceStore.instances.get(instanceId);
        expect(instance).toBeDefined();
        expect(instance!.characters.length).toBeGreaterThanOrEqual(expectedMin);
        expect(instance!.characters.length).toBeLessThanOrEqual(expectedMax);
      },
    );
  });

  describe('自定义NPC和随机NPC的混合使用', () => {
    it('应该支持提供自定义 NPC 创建副本', async () => {
      // 准备：创建自定义 NPC
      const customNPCs: Array<import('../../types/instance').CharacterInInstance & { id: string }> = [
        {
          id: 'custom_1',
          characterId: 'custom_1',
          character: createMockNPC('custom_1', '自定义NPC1', '医生'),
          isImportant: true,
          importance: 3 as const,
          appearanceCount: 0,
        },
        {
          id: 'custom_2',
          characterId: 'custom_2',
          character: createMockNPC('custom_2', '自定义NPC2', '护士'),
          isImportant: false,
          importance: 2 as const,
          appearanceCount: 0,
        },
      ];

      // 模拟副本生成
      mockInstanceGeneration('医院副本', 2);

      // 执行：使用自定义 NPC 创建副本
      const instanceId = await gameStore.generateInstance({
        type: '恐怖',
        difficulty: 2,
        npcs: customNPCs,
      });

      // 验证：副本包含自定义 NPC
      const instance = instanceStore.instances.get(instanceId);
      expect(instance).toBeDefined();
      expect(instance!.characters).toHaveLength(2);
      expect(instance!.characters.map(c => c.character.name)).toEqual(['自定义NPC1', '自定义NPC2']);

      // 验证：NPC 保留了自定义的重要程度
      expect(instance!.characters[0].importance).toBe(3);
      expect(instance!.characters[1].importance).toBe(2);

      // 验证：不会调用自动 NPC 生成（因为提供了自定义 NPC）
      // Note: generateRandomNPCs is not called when npcs are provided in config
    });

    it('应该正确标记 NPC 来源', async () => {
      // 准备：创建带来源标记的自定义 NPC
      const customNPCs: Array<import('../../types/instance').CharacterInInstance & { id: string }> = [
        {
          id: 'custom_1',
          characterId: 'custom_1',
          character: createMockNPC('custom_1', '快速创建NPC', '医生'),
          isImportant: true,
          importance: 3 as const,
          source: 'custom-quick' as const,
          appearanceCount: 0,
        },
        {
          id: 'custom_2',
          characterId: 'custom_2',
          character: createMockNPC('custom_2', '详细创建NPC', '护士'),
          isImportant: false,
          importance: 2 as const,
          source: 'custom-detailed' as const,
          appearanceCount: 0,
        },
      ];

      // 模拟副本生成
      mockInstanceGeneration('医院副本', 2);

      // 执行：创建副本
      const instanceId = await gameStore.generateInstance({
        type: '恐怖',
        difficulty: 2,
        npcs: customNPCs,
      });

      // 验证：NPC 来源标记正确
      const instance = instanceStore.instances.get(instanceId);
      expect(instance).toBeDefined();
      expect(instance!.characters[0].source).toBe('custom-quick');
      expect(instance!.characters[1].source).toBe('custom-detailed');
    });
  });

  describe('重新生成时保留自定义NPC的逻辑', () => {
    it('应该在重新生成时保留自定义 NPC', async () => {
      // 准备：创建包含自定义和随机 NPC 的副本
      const customNPC = createMockNPC('custom_1', '自定义NPC', '医生');
      const randomNPCs = [
        createMockNPC('random_1', '随机NPC1', '调查员'),
        createMockNPC('random_2', '随机NPC2', '警察'),
      ];

      // 模拟初始副本创建
      const initialNPCs = [customNPC, ...randomNPCs];
      vi.spyOn(npcGenerationCoordinator, 'calculateNPCCount').mockReturnValue(3);
      vi.spyOn(npcGenerationCoordinator, 'generateRandomNPCs').mockResolvedValue(initialNPCs);

      mockInstanceGeneration('测试副本', 3);

      const instanceId = await gameStore.generateInstance({
        type: '恐怖',
        difficulty: 3,
      });

      // 验证初始状态
      const instance = instanceStore.instances.get(instanceId);
      expect(instance!.characters).toHaveLength(3);

      // 执行：重新生成随机 NPC
      const newRandomNPCs = [
        createMockNPC('new_random_1', '新随机NPC1', '记者'),
        createMockNPC('new_random_2', '新随机NPC2', '司机'),
      ];

      vi.spyOn(npcGenerationCoordinator, 'regenerateRandomNPCs').mockResolvedValue(newRandomNPCs);

      // 模拟重新生成（在实际应用中，这会通过 UI 触发）
      const customNPCsToKeep = [
        {
          characterId: customNPC.id,
          character: customNPC,
          isImportant: true,
          importance: 3 as const,
          source: 'custom-detailed' as const,
          appearanceCount: 0,
        },
      ];

      const regeneratedNPCs = await npcGenerationCoordinator.regenerateRandomNPCs(
        3,
        '恐怖',
        customNPCsToKeep.map(c => c.character),
      );

      // 验证：返回了新的随机 NPC
      expect(regeneratedNPCs).toHaveLength(2);
      expect(regeneratedNPCs.map(n => n.name)).toEqual(['新随机NPC1', '新随机NPC2']);

      // 验证：自定义 NPC 应该被保留（在实际应用中由 UI 组件处理）
      expect(customNPCsToKeep).toHaveLength(1);
      expect(customNPCsToKeep[0].character.name).toBe('自定义NPC');
    });

    it('应该在存在自定义 NPC 时生成关联角色', async () => {
      // 准备：创建自定义 NPC
      const customNPC = createMockNPC('custom_1', '医生张三', '医生');
      const relatedNPC = createMockNPC('related_1', '护士李四', '护士');

      // 模拟生成关联 NPC
      vi.spyOn(npcGenerationCoordinator, 'regenerateRandomNPCs').mockImplementation(
        async (_difficulty, _instanceType, customNPCs) => {
          // 如果有自定义 NPC，应该生成关联角色
          if (customNPCs && customNPCs.length > 0) {
            return [relatedNPC];
          }
          return [];
        },
      );

      // 执行：重新生成
      const regeneratedNPCs = await npcGenerationCoordinator.regenerateRandomNPCs(2, '医院', [customNPC]);

      // 验证：生成了关联 NPC
      expect(regeneratedNPCs).toHaveLength(1);
      expect(regeneratedNPCs[0].name).toBe('护士李四');
    });

    it('应该在自定义 NPC 数量达到上限时不生成新 NPC', async () => {
      // 准备：创建达到上限的自定义 NPC
      const customNPCs = [
        createMockNPC('custom_1', 'NPC1', '医生'),
        createMockNPC('custom_2', 'NPC2', '护士'),
        createMockNPC('custom_3', 'NPC3', '警察'),
      ];

      // 执行：尝试重新生成（难度2，应该最多3个NPC）
      const regeneratedNPCs = await npcGenerationCoordinator.regenerateRandomNPCs(2, '恐怖', customNPCs);

      // 验证：不生成新 NPC
      expect(regeneratedNPCs).toHaveLength(0);

      // 验证：显示提示信息
      expect(toastr.info).toHaveBeenCalledWith(
        expect.stringContaining('自定义 NPC 数量已达上限'),
        expect.any(String),
        expect.any(Object),
      );
    });
  });
});
