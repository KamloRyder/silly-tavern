<template>
  <div class="test-panel">
    <div class="test-header">
      <h2>🧪 功能测试面板</h2>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>

    <div class="test-content">
      <!-- 记忆碎片系统测试 -->
      <div class="test-section">
        <h3>📝 记忆碎片系统</h3>
        <div class="test-actions">
          <button @click="testMemoryCapture">测试记忆捕获</button>
          <button @click="viewMemoryArchives">查看记忆档案</button>
          <button @click="testMemoryInjection">测试记忆注入</button>
        </div>
        <div v-if="memoryTestResult" class="test-result">
          {{ memoryTestResult }}
        </div>
      </div>

      <!-- NPC 生成系统测试 -->
      <div class="test-section">
        <h3>👥 NPC 生成系统</h3>
        <div class="test-actions">
          <button @click="testNPCGeneration">生成测试 NPC</button>
          <button @click="testNPCAppearance">测试 NPC 出场</button>
        </div>
        <div v-if="npcTestResult" class="test-result">
          {{ npcTestResult }}
        </div>
      </div>

      <!-- 事件记录系统测试 -->
      <div class="test-section">
        <h3>📋 事件记录系统</h3>
        <div class="test-actions">
          <button @click="testEventRecord">记录测试事件</button>
          <button @click="viewEventHistory">查看事件历史</button>
        </div>
        <div v-if="eventTestResult" class="test-result">
          {{ eventTestResult }}
        </div>
      </div>

      <!-- 真实世界地图测试 -->
      <div class="test-section">
        <h3>🗺️ 真实世界地图</h3>
        <div class="test-actions">
          <button @click="testMapGeneration">生成测试地图</button>
          <button @click="testAreaDetails">测试区域详情</button>
        </div>
        <div v-if="mapTestResult" class="test-result">
          {{ mapTestResult }}
        </div>
      </div>

      <!-- AI 服务诊断 -->
      <div class="test-section">
        <h3>🔍 AI 服务诊断</h3>
        <div class="test-actions">
          <button @click="testAIConnection">测试 AI 连接</button>
          <button @click="runAIDiagnostics">完整诊断</button>
        </div>
        <div v-if="aiTestResult" class="test-result">
          <pre>{{ aiTestResult }}</pre>
        </div>
      </div>

      <!-- 综合测试 -->
      <div class="test-section">
        <h3>🔄 综合测试</h3>
        <div class="test-actions">
          <button class="primary-btn" @click="runIntegrationTest">运行完整测试</button>
        </div>
        <div v-if="integrationTestResult" class="test-result">
          <pre>{{ integrationTestResult }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { eventRecordService } from '../services/eventRecordService';
import { integrationTestService } from '../services/integrationTestService';
import { memoryFragmentService } from '../services/memoryFragmentService';
import { npcGenerationCoordinator } from '../services/npcGenerationCoordinator';
import { realWorldMapService } from '../services/realWorldMapService';
import { useInstanceStore } from '../stores/instanceStore';

defineEmits(['close']);

const memoryTestResult = ref('');
const npcTestResult = ref('');
const eventTestResult = ref('');
const mapTestResult = ref('');
const aiTestResult = ref('');
const integrationTestResult = ref('');

const instanceStore = useInstanceStore();

// 记忆碎片测试
async function testMemoryCapture() {
  try {
    memoryTestResult.value = '正在测试记忆捕获...';

    // 模拟一个记忆事件
    const testEvent = {
      id: `test_${Date.now()}`,
      description: '测试记忆：玩家帮助了 NPC',
      type: 'positive' as const,
      timestamp: Date.now(),
      sourceInstance: 'test_instance',
    };

    await memoryFragmentService.addMemoryToNPC('test_npc_001', testEvent);
    memoryTestResult.value = '✅ 记忆捕获测试成功！已添加测试记忆。';
  } catch (error) {
    memoryTestResult.value = `❌ 测试失败: ${error}`;
  }
}

async function viewMemoryArchives() {
  try {
    const archives = await memoryFragmentService.getAllArchives();
    memoryTestResult.value = `📚 当前记忆档案数量: ${archives.length}\n${JSON.stringify(archives, null, 2)}`;
  } catch (error) {
    memoryTestResult.value = `❌ 获取失败: ${error}`;
  }
}

async function testMemoryInjection() {
  try {
    const prompt = await memoryFragmentService.injectMemoryPrompt('test_npc_001');
    memoryTestResult.value = prompt ? `✅ 记忆注入成功:\n${prompt}` : '⚠️ 该 NPC 暂无记忆';
  } catch (error) {
    memoryTestResult.value = `❌ 注入失败: ${error}`;
  }
}

// NPC 生成测试
async function testNPCGeneration() {
  try {
    npcTestResult.value = '正在生成测试 NPC...';

    const currentInstance = instanceStore.currentInstance;
    if (!currentInstance) {
      npcTestResult.value = '❌ 请先创建副本';
      return;
    }

    const npcs = await npcGenerationCoordinator.generateRandomNPCs(2, currentInstance.type || '克苏鲁神话', []);

    npcTestResult.value = `✅ 生成成功！\n生成了 ${npcs.length} 个 NPC`;
  } catch (error) {
    npcTestResult.value = `❌ 生成失败: ${error}`;
  }
}

async function testNPCAppearance() {
  try {
    const currentInstance = instanceStore.currentInstance;
    if (!currentInstance || !currentInstance.characters.length) {
      npcTestResult.value = '❌ 当前副本没有 NPC';
      return;
    }

    const npcData = currentInstance.characters[0];
    npcTestResult.value = `📊 NPC: ${npcData.character.name}\n出场次数: ${npcData.appearanceCount || 0}`;
  } catch (error) {
    npcTestResult.value = `❌ 测试失败: ${error}`;
  }
}

// 事件记录测试
async function testEventRecord() {
  try {
    eventTestResult.value = '正在记录测试事件...';

    const currentInstance = instanceStore.currentInstance;
    if (!currentInstance) {
      eventTestResult.value = '❌ 请先创建副本';
      return;
    }

    await eventRecordService.recordEventFromAIOutput(
      currentInstance.id,
      '玩家发现了一个神秘的宝箱，里面装满了金币。',
      [],
    );

    eventTestResult.value = '✅ 事件记录成功！';
  } catch (error) {
    eventTestResult.value = `❌ 记录失败: ${error}`;
  }
}

async function viewEventHistory() {
  try {
    const currentInstance = instanceStore.currentInstance;
    if (!currentInstance) {
      eventTestResult.value = '❌ 请先创建副本';
      return;
    }

    const events = currentInstance.events || [];
    eventTestResult.value = `📋 事件历史 (${events.length} 条):\n${JSON.stringify(events.slice(-5), null, 2)}`;
  } catch (error) {
    eventTestResult.value = `❌ 获取失败: ${error}`;
  }
}

// 地图测试
async function testMapGeneration() {
  try {
    mapTestResult.value = '正在生成测试地图...';

    const testCharacter = {
      id: 'test_player',
      type: 'player' as const,
      name: '测试角色',
      age: 25,
      occupation: '调查员',
      background: '一位居住在北京的调查员',
      attributes: { STR: 50, CON: 50, SIZ: 50, DEX: 50, APP: 50, INT: 50, POW: 50, EDU: 50, LUK: 50 },
      derivedStats: {
        HP: 10,
        MP: 10,
        SAN: 50,
        luck: 50,
        MOV: 8,
        DB: '0',
        build: 0,
        BUILD: 0,
        maxHP: 10,
        maxMP: 10,
        maxSAN: 50,
      },
      skills: new Map(),
      bodyParts: [],
      inventory: [],
    };

    const map = await realWorldMapService.generateMap(testCharacter);

    mapTestResult.value = `✅ 地图生成成功！\n区域数量: ${map.areas.size}\n起始区域: ${map.startArea}`;
  } catch (error) {
    mapTestResult.value = `❌ 生成失败: ${error}`;
  }
}

async function testAreaDetails() {
  try {
    mapTestResult.value = '测试功能开发中...';
  } catch (error) {
    mapTestResult.value = `❌ 测试失败: ${error}`;
  }
}

// AI 服务诊断
async function testAIConnection() {
  try {
    aiTestResult.value = '正在测试 AI 连接...';

    const { testAIService } = await import('../utils/aiServiceDiagnostics');
    const result = await testAIService();

    if (result.success) {
      aiTestResult.value = `✅ ${result.message}\n\n详情:\n${JSON.stringify(result.details, null, 2)}`;
    } else {
      aiTestResult.value = `❌ ${result.message}\n\n${result.details?.diagnosis || ''}`;
    }
  } catch (error) {
    aiTestResult.value = `❌ 测试失败: ${error}`;
  }
}

async function runAIDiagnostics() {
  try {
    aiTestResult.value = '正在运行完整诊断...';

    const { runFullDiagnostics } = await import('../utils/aiServiceDiagnostics');
    const report = await runFullDiagnostics();

    aiTestResult.value = report;
  } catch (error) {
    aiTestResult.value = `❌ 诊断失败: ${error}`;
  }
}

// 综合测试
async function runIntegrationTest() {
  try {
    integrationTestResult.value = '正在运行综合测试...\n';

    await integrationTestService.runAllTests();
    const results = integrationTestService.getResults();

    integrationTestResult.value = `测试完成！\n通过: ${results.filter(r => r.passed).length}/${results.length}\n\n${results.map(r => `${r.passed ? '✅' : '❌'} ${r.testName}: ${r.message}`).join('\n')}`;
  } catch (error) {
    integrationTestResult.value = `❌ 测试失败: ${error}`;
  }
}
</script>

<style lang="scss" scoped>
.test-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90%;
  max-width: 800px;
  max-height: 80vh;
  background: rgba(20, 20, 30, 0.95);
  border: 2px solid #d4af37;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
  z-index: 1000;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.test-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: linear-gradient(135deg, #d4af37, #aa8c2e);
  color: #1a1a2e;

  h2 {
    margin: 0;
    font-size: 20px;
    font-weight: bold;
  }

  .close-btn {
    background: none;
    border: none;
    color: #1a1a2e;
    font-size: 24px;
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background 0.2s;

    &:hover {
      background: rgba(0, 0, 0, 0.1);
    }
  }
}

.test-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.test-section {
  margin-bottom: 32px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(212, 175, 55, 0.3);

  h3 {
    margin: 0 0 16px 0;
    color: #d4af37;
    font-size: 18px;
  }

  .test-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 16px;

    button {
      padding: 8px 16px;
      background: rgba(212, 175, 55, 0.2);
      border: 1px solid #d4af37;
      border-radius: 4px;
      color: #d4af37;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 14px;

      &:hover {
        background: rgba(212, 175, 55, 0.3);
        transform: translateY(-2px);
      }

      &.primary-btn {
        background: linear-gradient(135deg, #d4af37, #aa8c2e);
        color: #1a1a2e;
        font-weight: bold;

        &:hover {
          background: linear-gradient(135deg, #e5c158, #d4af37);
        }
      }
    }
  }

  .test-result {
    padding: 12px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 4px;
    color: #e0e0e0;
    font-size: 13px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 300px;
    overflow-y: auto;

    pre {
      margin: 0;
      font-family: 'Courier New', monospace;
      font-size: 12px;
    }
  }
}
</style>
