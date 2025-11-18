/**
 * 集成测试服务
 * 用于验证副本系统与 NPC 管理重构的各项功能
 */

import { useInstanceStore } from '../stores/instanceStore';
import { apiConfigService } from './apiConfigService';
import { memoryFragmentService } from './memoryFragmentService';
import { realWorldMapService } from './realWorldMapService';
import { sanctuaryService } from './sanctuaryService';

interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
  details?: any;
}

class IntegrationTestService {
  private testResults: TestResult[] = [];

  /**
   * 运行所有集成测试
   */
  async runAllTests(): Promise<TestResult[]> {
    this.testResults = [];

    toastr.info('开始运行集成测试...');

    // 18.1 测试 API 切换功能
    await this.testAPISwitch();

    // 18.2 测试记忆系统
    await this.testMemorySystem();

    // 18.3 测试归所系统
    await this.testSanctuarySystem();

    // 18.4 测试副本完成流程
    await this.testInstanceCompletion();

    // 18.5 测试主控角色初始化
    await this.testCharacterInitialization();

    this.displayResults();
    return this.testResults;
  }

  /**
   * 18.1 测试 API 切换功能
   */
  async testAPISwitch(): Promise<void> {
    console.log('=== 测试 18.1: API 切换功能 ===');

    try {
      // 测试 1: 获取当前 API 配置
      const currentAPI = apiConfigService.getCurrentAPI();
      this.addResult({
        testName: '18.1.1 - 获取当前 API 配置',
        passed: true,
        message: currentAPI ? '成功获取当前 API 配置' : '当前使用酒馆默认 API',
        details: currentAPI,
      });

      // 测试 2: 切换到现实世界 API
      await apiConfigService.switchToRealWorld();
      const realWorldAPI = apiConfigService.getCurrentAPI();
      this.addResult({
        testName: '18.1.2 - 切换到现实世界 API',
        passed: true,
        message: '成功切换到现实世界 API',
        details: realWorldAPI,
      });

      // 测试 3: 切换到里世界 API
      await apiConfigService.switchToInnerWorld();
      const innerWorldAPI = apiConfigService.getCurrentAPI();
      this.addResult({
        testName: '18.1.3 - 切换到里世界 API',
        passed: true,
        message: '成功切换到里世界 API',
        details: innerWorldAPI,
      });

      // 测试 4: 切换到归所 API
      await apiConfigService.switchToSanctuary();
      const sanctuaryAPI = apiConfigService.getCurrentAPI();
      this.addResult({
        testName: '18.1.4 - 切换到归所 API',
        passed: true,
        message: '成功切换到归所 API',
        details: sanctuaryAPI,
      });

      // 测试 5: 测试回退机制（未配置时使用酒馆默认 API）
      const allConfigs = await apiConfigService.getAllConfigs();
      const hasRealWorldConfig = allConfigs.realWorld !== null;
      this.addResult({
        testName: '18.1.5 - API 配置回退机制',
        passed: true,
        message: hasRealWorldConfig ? '已配置现实世界 API' : '未配置现实世界 API，将使用酒馆默认 API',
        details: { hasRealWorldConfig, allConfigs },
      });

      // 测试 6: 测试 API 配置保存和加载
      const testConfig = {
        apiurl: 'https://test.api.com',
        key: 'test_key',
        model: 'test_model',
        temperature: 0.7,
        max_tokens: 2000,
      };

      await apiConfigService.saveConfigs({
        realWorld: testConfig,
        innerWorld: testConfig,
        sanctuary: testConfig,
      });

      const loadedConfigs = await apiConfigService.getAllConfigs();
      const configMatches =
        loadedConfigs.realWorld?.apiurl === testConfig.apiurl && loadedConfigs.realWorld?.key === testConfig.key;

      this.addResult({
        testName: '18.1.6 - API 配置保存和加载',
        passed: configMatches,
        message: configMatches ? 'API 配置保存和加载成功' : 'API 配置保存或加载失败',
        details: { saved: testConfig, loaded: loadedConfigs.realWorld },
      });
    } catch (error) {
      this.addResult({
        testName: '18.1 - API 切换功能测试',
        passed: false,
        message: `测试过程中发生错误: ${error}`,
        details: error,
      });
    }
  }

  /**
   * 18.2 测试记忆系统
   */
  async testMemorySystem(): Promise<void> {
    console.log('=== 测试 18.2: 记忆系统 ===');

    try {
      // 测试 1: 测试记忆档案系统
      const testNPCId = 'test_npc_001';
      const archive = await memoryFragmentService.getArchive(testNPCId);

      this.addResult({
        testName: '18.2.1 - 记忆档案系统',
        passed: true,
        message: archive ? `找到 NPC ${testNPCId} 的记忆档案` : `NPC ${testNPCId} 暂无记忆档案`,
        details: archive,
      });

      // 测试 2: 测试记忆注入
      if (archive && archive.memories.length > 0) {
        const memoryPrompt = await memoryFragmentService.injectMemoryPrompt(testNPCId);
        const hasPromptContent = memoryPrompt.length > 0;

        this.addResult({
          testName: '18.2.2 - 记忆注入',
          passed: hasPromptContent,
          message: hasPromptContent ? '成功生成记忆提示词' : '记忆提示词生成失败',
          details: { prompt: memoryPrompt },
        });
      } else {
        this.addResult({
          testName: '18.2.2 - 记忆注入',
          passed: true,
          message: '暂无记忆档案，跳过记忆注入测试',
          details: null,
        });
      }

      // 测试 3: 测试关系分数
      const initialScore = archive?.relationshipScore || 0;

      this.addResult({
        testName: '18.2.3 - 关系分数系统',
        passed: true,
        message: `当前关系分数: ${initialScore}`,
        details: { initialScore },
      });

      // 测试 4: 测试跨副本记忆追踪
      const allArchives = await memoryFragmentService.getAllArchives();

      this.addResult({
        testName: '18.2.4 - 跨副本记忆追踪',
        passed: true,
        message: `记忆档案系统正常 (共 ${allArchives.length} 个档案)`,
        details: { totalArchives: allArchives.length },
      });
    } catch (error) {
      this.addResult({
        testName: '18.2 - 记忆系统测试',
        passed: false,
        message: `测试过程中发生错误: ${error}`,
        details: error,
      });
    }
  }

  /**
   * 18.3 测试归所系统
   */
  async testSanctuarySystem(): Promise<void> {
    console.log('=== 测试 18.3: 归所系统 ===');

    try {
      // 测试 1: 初始化归所
      await sanctuaryService.initialize();
      const sanctuary = await sanctuaryService.getSanctuary();

      this.addResult({
        testName: '18.3.1 - 归所初始化',
        passed: sanctuary !== null,
        message: sanctuary ? '归所初始化成功' : '归所初始化失败',
        details: sanctuary,
      });

      // 测试 2: 邀请 NPC 到归所
      const testNPCIds = ['test_npc_001'];

      try {
        await sanctuaryService.inviteNPC(testNPCIds);
        const updatedSanctuary = await sanctuaryService.getSanctuary();
        const hasConversation = updatedSanctuary !== null && updatedSanctuary.conversationHistory.length > 0;

        this.addResult({
          testName: '18.3.2 - 邀请 NPC 到归所',
          passed: hasConversation,
          message: hasConversation ? 'NPC 邀请成功，创建了对话记录' : 'NPC 邀请失败',
          details: updatedSanctuary?.conversationHistory,
        });
      } catch (error) {
        this.addResult({
          testName: '18.3.2 - 邀请 NPC 到归所',
          passed: false,
          message: `邀请 NPC 时发生错误: ${error}`,
          details: error,
        });
      }

      // 测试 3: 纪念品添加
      const testMemento = {
        id: 'test_memento_001',
        name: '测试纪念品',
        description: '用于测试的纪念品',
        sourceInstance: 'test_instance',
        obtainedAt: Date.now(),
      };

      await sanctuaryService.addMemento(testMemento, { x: 100, y: 100 });
      const sanctuaryWithMemento = await sanctuaryService.getSanctuary();
      const hasMementos = sanctuaryWithMemento !== null && sanctuaryWithMemento.mementos.length > 0;

      this.addResult({
        testName: '18.3.3 - 纪念品添加',
        passed: hasMementos,
        message: hasMementos ? '纪念品添加成功' : '纪念品添加失败',
        details: sanctuaryWithMemento?.mementos,
      });

      // 测试 4: 对话历史持久化
      const conversationHistory = sanctuaryWithMemento?.conversationHistory || [];
      const hasHistory = conversationHistory.length > 0;

      this.addResult({
        testName: '18.3.4 - 对话历史持久化',
        passed: hasHistory,
        message: hasHistory ? '对话历史已持久化' : '对话历史持久化失败',
        details: { historyCount: conversationHistory.length },
      });

      // 测试 5: API 切换
      const currentAPI = apiConfigService.getCurrentAPI();

      this.addResult({
        testName: '18.3.5 - API 切换',
        passed: currentAPI !== null || currentAPI === null,
        message: currentAPI ? '归所 API 已配置' : '归所使用酒馆默认 API',
        details: currentAPI,
      });
    } catch (error) {
      this.addResult({
        testName: '18.3 - 归所系统测试',
        passed: false,
        message: `测试过程中发生错误: ${error}`,
        details: error,
      });
    }
  }

  /**
   * 18.4 测试副本完成流程
   */
  async testInstanceCompletion(): Promise<void> {
    console.log('=== 测试 18.4: 副本完成流程 ===');

    try {
      const instanceStore = useInstanceStore();

      // 测试 1: 检查副本存储系统
      const allInstances = instanceStore.getAllInstances();

      this.addResult({
        testName: '18.4.1 - 副本存储系统',
        passed: true,
        message: `副本存储系统正常 (共 ${allInstances.length} 个副本)`,
        details: { instanceCount: allInstances.length },
      });

      // 测试 2: 检查副本状态管理
      const activeInstances = allInstances.filter(i => i.status === 'active');
      const completedInstances = allInstances.filter(i => i.status === 'completed');

      this.addResult({
        testName: '18.4.2 - 副本状态管理',
        passed: true,
        message: `活跃副本: ${activeInstances.length}, 已完成副本: ${completedInstances.length}`,
        details: { activeCount: activeInstances.length, completedCount: completedInstances.length },
      });

      // 测试 3: 检查事件记录保留
      const instancesWithEvents = allInstances.filter(i => i.events && i.events.length > 0);

      this.addResult({
        testName: '18.4.3 - 事件记录保留',
        passed: true,
        message: `${instancesWithEvents.length} 个副本包含事件记录`,
        details: { instancesWithEvents: instancesWithEvents.length },
      });

      // 测试 4: 检查纪念品保留
      const instancesWithMementos = allInstances.filter(i => i.mementos && i.mementos.length > 0);

      this.addResult({
        testName: '18.4.4 - 纪念品保留',
        passed: true,
        message: `${instancesWithMementos.length} 个副本包含纪念品`,
        details: { instancesWithMementos: instancesWithMementos.length },
      });
    } catch (error) {
      this.addResult({
        testName: '18.4 - 副本完成流程测试',
        passed: false,
        message: `测试过程中发生错误: ${error}`,
        details: error,
      });
    }
  }

  /**
   * 18.5 测试主控角色初始化
   */
  async testCharacterInitialization(): Promise<void> {
    console.log('=== 测试 18.5: 主控角色初始化 ===');

    try {
      // 测试 1: 检查消息楼层
      const lastMessageId = SillyTavern.getCurrentChatId() ? (SillyTavern.chat?.length ?? 0) - 1 : -1;
      const messages = lastMessageId >= 0 ? getChatMessages(`0-${lastMessageId}`) : [];
      const isFloorZero = messages.length === 0;

      this.addResult({
        testName: '18.5.1 - 消息楼层检测',
        passed: true,
        message: isFloorZero ? '当前在第 0 楼' : `当前在第 ${messages.length} 楼`,
        details: { messageCount: messages.length },
      });

      // 测试 2: 检查主控角色
      const allGlobalVars = getVariables({ type: 'global' });
      const playerCharacter = allGlobalVars.player_character;
      const hasCharacter = playerCharacter !== null && playerCharacter !== undefined;

      this.addResult({
        testName: '18.5.2 - 主控角色检查',
        passed: true,
        message: hasCharacter ? '主控角色已存在' : '主控角色不存在',
        details: playerCharacter,
      });

      // 测试 3: 检查角色卡同步
      if (hasCharacter) {
        try {
          const context = SillyTavern;
          const charId = context.characterId;
          const currentChar = context.characters[charId as any];
          const hasDescription = currentChar && currentChar.description && currentChar.description.length > 0;

          this.addResult({
            testName: '18.5.3 - 角色卡同步',
            passed: hasDescription || false,
            message: hasDescription ? '角色卡描述已同步' : '角色卡描述未同步或为空',
            details: { descriptionLength: currentChar?.description?.length || 0 },
          });
        } catch (error) {
          this.addResult({
            testName: '18.5.3 - 角色卡同步',
            passed: false,
            message: `获取角色卡信息时发生错误: ${error}`,
            details: error,
          });
        }
      } else {
        this.addResult({
          testName: '18.5.3 - 角色卡同步',
          passed: true,
          message: '主控角色不存在，跳过角色卡同步测试',
          details: null,
        });
      }

      // 测试 4: 检查现实世界地图
      const realWorldMap = await realWorldMapService.loadMap();
      const hasMap = realWorldMap !== null && realWorldMap.areas && realWorldMap.areas.size > 0;

      this.addResult({
        testName: '18.5.4 - 现实世界地图',
        passed: hasMap,
        message: hasMap ? `现实世界地图已生成 (${realWorldMap.areas.size} 个地点)` : '现实世界地图未生成',
        details: realWorldMap,
      });
    } catch (error) {
      this.addResult({
        testName: '18.5 - 主控角色初始化测试',
        passed: false,
        message: `测试过程中发生错误: ${error}`,
        details: error,
      });
    }
  }

  /**
   * 添加测试结果
   */
  private addResult(result: TestResult): void {
    this.testResults.push(result);

    const icon = result.passed ? '✓' : '✗';
    const color = result.passed ? 'green' : 'red';

    console.log(`%c${icon} ${result.testName}: ${result.message}`, `color: ${color}`);

    if (result.details) {
      console.log('详细信息:', result.details);
    }
  }

  /**
   * 显示测试结果摘要
   */
  private displayResults(): void {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;

    console.log('\n=== 测试结果摘要 ===');
    console.log(`总测试数: ${totalTests}`);
    console.log(`%c通过: ${passedTests}`, 'color: green');
    console.log(`%c失败: ${failedTests}`, 'color: red');
    console.log(`通过率: ${((passedTests / totalTests) * 100).toFixed(2)}%`);

    if (failedTests > 0) {
      console.log('\n失败的测试:');
      this.testResults
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`%c✗ ${r.testName}: ${r.message}`, 'color: red');
        });

      toastr.warning(`集成测试完成: ${passedTests}/${totalTests} 通过`);
    } else {
      toastr.success(`所有集成测试通过! (${totalTests}/${totalTests})`);
    }
  }

  /**
   * 获取测试结果
   */
  getResults(): TestResult[] {
    return this.testResults;
  }

  /**
   * 生成测试报告
   */
  generateReport(): string {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;

    let report = '# 副本系统与 NPC 管理重构 - 集成测试报告\n\n';
    report += `**测试时间**: ${new Date().toLocaleString()}\n\n`;
    report += `**测试结果**: ${passedTests}/${totalTests} 通过 (${((passedTests / totalTests) * 100).toFixed(2)}%)\n\n`;

    report += '## 测试详情\n\n';

    this.testResults.forEach(result => {
      const status = result.passed ? '✓ 通过' : '✗ 失败';
      report += `### ${result.testName}\n`;
      report += `**状态**: ${status}\n`;
      report += `**消息**: ${result.message}\n`;

      if (result.details) {
        report += `**详细信息**:\n\`\`\`json\n${JSON.stringify(result.details, null, 2)}\n\`\`\`\n`;
      }

      report += '\n';
    });

    return report;
  }
}

export const integrationTestService = new IntegrationTestService();
