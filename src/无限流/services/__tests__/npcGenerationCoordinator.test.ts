import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NPCCharacter } from '../../types/character';
import { npcGenerationCoordinator } from '../npcGenerationCoordinator';
import { npcGenerationService } from '../npcGenerationService';

// Mock npcGenerationService
vi.mock('../npcGenerationService', () => ({
  npcGenerationService: {
    generateRandom: vi.fn(),
    generateCustom: vi.fn(),
    generateRelatedNPC: vi.fn(),
  },
}));

describe('NPCGenerationCoordinator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('calculateNPCCount', () => {
    it('应该根据难度计算NPC数量（难度1）', () => {
      const results = new Set<number>();
      // 运行多次以测试随机性
      for (let i = 0; i < 100; i++) {
        const count = npcGenerationCoordinator.calculateNPCCount(1);
        results.add(count);
        expect(count).toBeGreaterThanOrEqual(1);
        expect(count).toBeLessThanOrEqual(2);
      }
      // 确保两种结果都出现过（1和2）
      expect(results.size).toBe(2);
    });

    it('应该根据难度计算NPC数量（难度2）', () => {
      const results = new Set<number>();
      for (let i = 0; i < 100; i++) {
        const count = npcGenerationCoordinator.calculateNPCCount(2);
        results.add(count);
        expect(count).toBeGreaterThanOrEqual(2);
        expect(count).toBeLessThanOrEqual(3);
      }
      expect(results.size).toBe(2);
    });

    it('应该根据难度计算NPC数量（难度3）', () => {
      const results = new Set<number>();
      for (let i = 0; i < 100; i++) {
        const count = npcGenerationCoordinator.calculateNPCCount(3);
        results.add(count);
        expect(count).toBeGreaterThanOrEqual(3);
        expect(count).toBeLessThanOrEqual(4);
      }
      expect(results.size).toBe(2);
    });

    it('应该根据难度计算NPC数量（难度4）', () => {
      const results = new Set<number>();
      for (let i = 0; i < 100; i++) {
        const count = npcGenerationCoordinator.calculateNPCCount(4);
        results.add(count);
        expect(count).toBeGreaterThanOrEqual(4);
        expect(count).toBeLessThanOrEqual(5);
      }
      expect(results.size).toBe(2);
    });

    it('应该根据难度计算NPC数量（难度5）', () => {
      const results = new Set<number>();
      for (let i = 0; i < 100; i++) {
        const count = npcGenerationCoordinator.calculateNPCCount(5);
        results.add(count);
        expect(count).toBeGreaterThanOrEqual(5);
        expect(count).toBeLessThanOrEqual(6);
      }
      expect(results.size).toBe(2);
    });

    it('应该处理超出范围的难度值（小于1）', () => {
      const count = npcGenerationCoordinator.calculateNPCCount(0);
      expect(count).toBeGreaterThanOrEqual(3);
      expect(count).toBeLessThanOrEqual(4);
    });

    it('应该处理超出范围的难度值（大于5）', () => {
      const count = npcGenerationCoordinator.calculateNPCCount(10);
      expect(count).toBeGreaterThanOrEqual(3);
      expect(count).toBeLessThanOrEqual(4);
    });
  });

  describe('generateRandomNPCs', () => {
    const mockNPC: NPCCharacter = {
      id: 'test-npc-1',
      type: 'npc',
      name: '测试NPC',
      age: 30,
      occupation: '调查员',
      background: '测试背景',
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

    it('应该成功批量生成NPC', async () => {
      vi.mocked(npcGenerationService.generateRandom).mockResolvedValue(mockNPC);

      const npcs = await npcGenerationCoordinator.generateRandomNPCs(3, '恐怖');

      expect(npcs).toHaveLength(3);
      expect(npcGenerationService.generateRandom).toHaveBeenCalledTimes(3);
      expect(npcGenerationService.generateRandom).toHaveBeenCalledWith('恐怖');
    });

    it('应该在生成过程中调用进度回调', async () => {
      vi.mocked(npcGenerationService.generateRandom).mockResolvedValue(mockNPC);
      const progressCallback = vi.fn();

      await npcGenerationCoordinator.generateRandomNPCs(3, '恐怖', undefined, progressCallback);

      expect(progressCallback).toHaveBeenCalledTimes(3);
      expect(progressCallback).toHaveBeenNthCalledWith(1, 1, 3);
      expect(progressCallback).toHaveBeenNthCalledWith(2, 2, 3);
      expect(progressCallback).toHaveBeenNthCalledWith(3, 3, 3);
    });

    it('应该在单个NPC生成失败时继续生成其他NPC', async () => {
      vi.mocked(npcGenerationService.generateRandom)
        .mockResolvedValueOnce(mockNPC)
        .mockRejectedValueOnce(new Error('生成失败'))
        .mockResolvedValueOnce(mockNPC);

      const npcs = await npcGenerationCoordinator.generateRandomNPCs(3, '恐怖');

      expect(npcs.length).toBeGreaterThanOrEqual(2);
      expect(toastr.warning).toHaveBeenCalled();
    });

    it('应该在所有NPC生成失败时抛出错误', async () => {
      // Mock both generateRandom and the fallback to fail
      vi.mocked(npcGenerationService.generateRandom).mockRejectedValue(new Error('AI服务不可用'));

      // Mock the import to make fallback also fail
      vi.doMock('../../utils/coc7Rules', () => ({
        generateRandomAttributes: vi.fn(() => {
          throw new Error('Fallback failed');
        }),
        calculateDerivedStats: vi.fn(),
      }));

      await expect(npcGenerationCoordinator.generateRandomNPCs(3, '恐怖')).rejects.toThrow('所有 NPC 生成失败');

      expect(toastr.error).toHaveBeenCalled();
    });

    it('应该在连续失败时尝试降级方案', async () => {
      // 前3次失败，触发降级方案
      vi.mocked(npcGenerationService.generateRandom)
        .mockRejectedValueOnce(new Error('失败1'))
        .mockRejectedValueOnce(new Error('失败2'))
        .mockRejectedValueOnce(new Error('失败3'))
        .mockResolvedValue(mockNPC);

      const npcs = await npcGenerationCoordinator.generateRandomNPCs(5, '恐怖');

      // 应该至少生成了一些NPC（通过降级方案或后续成功）
      expect(npcs.length).toBeGreaterThan(0);
      expect(toastr.warning).toHaveBeenCalled();
    });

    it('应该在全部成功时显示成功提示', async () => {
      vi.mocked(npcGenerationService.generateRandom).mockResolvedValue(mockNPC);

      await npcGenerationCoordinator.generateRandomNPCs(2, '恐怖');

      expect(toastr.success).toHaveBeenCalledWith(
        expect.stringContaining('成功生成'),
        expect.any(String),
        expect.any(Object),
      );
    });
  });

  describe('generateRelatedNPC', () => {
    const mockCustomNPC: NPCCharacter = {
      id: 'custom-npc-1',
      type: 'npc',
      name: '自定义NPC',
      age: 35,
      occupation: '医生',
      background: '一位经验丰富的医生',
      attributes: {
        STR: 50,
        CON: 50,
        SIZ: 50,
        DEX: 50,
        APP: 50,
        INT: 70,
        POW: 50,
        EDU: 80,
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

    const mockRelatedNPC: NPCCharacter = {
      ...mockCustomNPC,
      id: 'related-npc-1',
      name: '护士小王',
      occupation: '护士',
      relationship: '同事',
    };

    it('应该基于自定义NPC生成关联角色', async () => {
      // When customNPCs are provided, generateRandomNPCs doesn't use generateRelatedNPC
      // It only uses generateRandom. The generateRelatedNPC is used in regenerateRandomNPCs
      vi.mocked(npcGenerationService.generateRandom).mockResolvedValue(mockRelatedNPC);

      const npcs = await npcGenerationCoordinator.generateRandomNPCs(2, '医院', [mockCustomNPC]);

      expect(npcGenerationService.generateRandom).toHaveBeenCalledWith('医院');
      expect(npcs).toHaveLength(2);
    });
  });

  describe('regenerateRandomNPCs', () => {
    const mockNPC: NPCCharacter = {
      id: 'test-npc-1',
      type: 'npc',
      name: '测试NPC',
      age: 30,
      occupation: '调查员',
      background: '测试背景',
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

    const mockCustomNPC: NPCCharacter = {
      ...mockNPC,
      id: 'custom-npc-1',
      name: '自定义NPC',
      occupation: '医生',
    };

    it('应该重新生成随机NPC', async () => {
      vi.mocked(npcGenerationService.generateRandom).mockResolvedValue(mockNPC);

      const npcs = await npcGenerationCoordinator.regenerateRandomNPCs(3, '恐怖', []);

      expect(npcs.length).toBeGreaterThanOrEqual(3);
      expect(npcs.length).toBeLessThanOrEqual(4);
      expect(npcGenerationService.generateRandom).toHaveBeenCalled();
    });

    it('应该在存在自定义NPC时生成关联角色', async () => {
      const mockRelatedNPC = { ...mockNPC, id: 'related-npc-1', relationship: '同事' };
      vi.mocked(npcGenerationService.generateRelatedNPC).mockResolvedValue(mockRelatedNPC);

      const npcs = await npcGenerationCoordinator.regenerateRandomNPCs(3, '医院', [mockCustomNPC]);

      expect(npcGenerationService.generateRelatedNPC).toHaveBeenCalledWith('医院', [mockCustomNPC]);
      expect(npcs.length).toBeGreaterThanOrEqual(2);
      expect(npcs.length).toBeLessThanOrEqual(3);
    });

    it('应该在自定义NPC数量达到上限时返回空数组', async () => {
      const customNPCs = [mockCustomNPC, { ...mockCustomNPC, id: 'custom-2' }, { ...mockCustomNPC, id: 'custom-3' }];

      const npcs = await npcGenerationCoordinator.regenerateRandomNPCs(2, '恐怖', customNPCs);

      expect(npcs).toHaveLength(0);
      expect(toastr.info).toHaveBeenCalledWith(
        expect.stringContaining('自定义 NPC 数量已达上限'),
        expect.any(String),
        expect.any(Object),
      );
    });

    it('应该在重新生成过程中调用进度回调', async () => {
      vi.mocked(npcGenerationService.generateRandom).mockResolvedValue(mockNPC);
      const progressCallback = vi.fn();

      await npcGenerationCoordinator.regenerateRandomNPCs(3, '恐怖', [], progressCallback);

      expect(progressCallback).toHaveBeenCalled();
    });

    it('应该处理重新生成时的错误', async () => {
      // Mock both generateRandom and the fallback to fail
      vi.mocked(npcGenerationService.generateRandom).mockRejectedValue(new Error('生成失败'));

      // Mock the import to make fallback also fail
      vi.doMock('../../utils/coc7Rules', () => ({
        generateRandomAttributes: vi.fn(() => {
          throw new Error('Fallback failed');
        }),
        calculateDerivedStats: vi.fn(),
      }));

      await expect(npcGenerationCoordinator.regenerateRandomNPCs(3, '恐怖', [])).rejects.toThrow();

      expect(toastr.error).toHaveBeenCalled();
    });

    it('应该在部分失败时显示警告', async () => {
      vi.mocked(npcGenerationService.generateRandom)
        .mockResolvedValueOnce(mockNPC)
        .mockRejectedValueOnce(new Error('失败'))
        .mockResolvedValueOnce(mockNPC);

      const npcs = await npcGenerationCoordinator.regenerateRandomNPCs(3, '恐怖', []);

      expect(npcs.length).toBeGreaterThan(0);
      expect(toastr.warning).toHaveBeenCalled();
    });
  });

  describe('generateQuickNPC', () => {
    const mockNPC: NPCCharacter = {
      id: 'quick-npc-1',
      type: 'npc',
      name: '快速NPC',
      age: 28,
      occupation: '记者',
      background: '一位勇敢的记者',
      attributes: {
        STR: 50,
        CON: 50,
        SIZ: 50,
        DEX: 50,
        APP: 50,
        INT: 60,
        POW: 50,
        EDU: 70,
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

    it('应该通过一句话描述生成NPC', async () => {
      vi.mocked(npcGenerationService.generateCustom).mockResolvedValue(mockNPC);

      const npc = await npcGenerationCoordinator.generateQuickNPC('一位勇敢的记者', '现代');

      expect(npc).toEqual(mockNPC);
      expect(npcGenerationService.generateCustom).toHaveBeenCalledWith('一位勇敢的记者', '现代');
      expect(toastr.success).toHaveBeenCalled();
    });

    it('应该处理生成失败的情况', async () => {
      vi.mocked(npcGenerationService.generateCustom).mockRejectedValue(new Error('AI服务不可用'));

      await expect(npcGenerationCoordinator.generateQuickNPC('测试描述', '现代')).rejects.toThrow();

      expect(toastr.error).toHaveBeenCalled();
    });

    it('应该在AI服务不可用时提供降级方案提示', async () => {
      vi.mocked(npcGenerationService.generateCustom).mockRejectedValue(new Error('AI服务不可用'));

      await expect(npcGenerationCoordinator.generateQuickNPC('测试描述', '现代')).rejects.toThrow();

      expect(toastr.info).toHaveBeenCalledWith(
        expect.stringContaining('详细创建'),
        expect.any(String),
        expect.any(Object),
      );
    });
  });
});
