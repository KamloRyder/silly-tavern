<template>
  <div class="api-config-panel">
    <h2 class="panel-title">API 配置管理</h2>
    <p class="panel-description">为不同世界配置独立的 API，实现完全隔离的游戏体验。未配置时将使用酒馆默认 API。</p>

    <!-- 当前使用的 API -->
    <div class="current-api-info">
      <div class="info-row">
        <span class="info-label">当前世界：</span>
        <span class="info-value">{{ currentWorldName }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">当前使用的 API：</span>
        <span :class="['info-value', currentAPIStatus.isCustom ? 'custom-api' : 'default-api']">
          {{ currentAPIStatus.displayText }}
        </span>
      </div>
      <div v-if="currentAPIStatus.isCustom && currentAPIStatus.model" class="info-row model-info">
        <span class="info-label">模型：</span>
        <span class="info-value">{{ currentAPIStatus.model }}</span>
      </div>
    </div>

    <!-- 配置标签页 -->
    <div class="config-tabs">
      <button
        v-for="world in worlds"
        :key="world.key"
        :class="['tab-button', { active: activeTab === world.key }]"
        @click="activeTab = world.key"
      >
        {{ world.name }}
      </button>
    </div>

    <!-- 配置表单 -->
    <div class="config-form">
      <div class="form-group">
        <label class="form-label">
          <input type="checkbox" :checked="configs[activeTab] !== null" @change="toggleConfig(activeTab, $event)" />
          启用自定义 API（不勾选则使用酒馆默认 API）
        </label>
      </div>

      <template v-if="configs[activeTab] !== null">
        <div class="form-group">
          <label class="form-label">API 地址</label>
          <input
            v-model="configs[activeTab]!.apiurl"
            type="text"
            class="form-input"
            placeholder="https://api.example.com/v1/chat/completions"
          />
        </div>

        <div class="form-group">
          <label class="form-label">API 密钥</label>
          <input
            v-model="configs[activeTab]!.key"
            type="password"
            class="form-input"
            placeholder="留空（密钥在 SillyTavern 后端配置）"
          />
          <span class="api-key-hint">💡 使用本地后端时可留空，真实密钥应配置在 SillyTavern 的 config.yaml 中</span>
        </div>

        <div class="form-group">
          <label class="form-label">模型名称</label>
          <div class="model-input-group">
            <input
              v-model="configs[activeTab]!.model"
              type="text"
              class="form-input"
              placeholder="输入模型名称或从下方选择"
            />
            <div class="model-presets">
              <button
                v-for="preset in modelPresets"
                :key="preset.value"
                type="button"
                class="preset-chip"
                :title="preset.description"
                @click="selectModel(preset.value)"
              >
                {{ preset.label }}
              </button>
            </div>
          </div>
          <span class="model-hint">💡 常用模型：Gemini、GPT、Claude 等</span>
        </div>

        <div class="form-group">
          <label class="form-label">温度参数 ({{ configs[activeTab]!.temperature }})</label>
          <input
            v-model.number="configs[activeTab]!.temperature"
            type="range"
            min="0"
            max="2"
            step="0.1"
            class="form-range"
          />
          <span class="range-hint">控制输出随机性，0=确定性，2=高随机性</span>
        </div>

        <div class="form-group">
          <label class="form-label">最大 Token 数</label>
          <input
            v-model.number="configs[activeTab]!.max_tokens"
            type="number"
            min="1"
            max="32000"
            class="form-input"
            placeholder="2000"
          />
        </div>

        <!-- 测试连接按钮 -->
        <div class="form-actions">
          <button class="btn btn-test" :disabled="testing" @click="testConnection">
            {{ testing ? '测试中...' : '测试连接' }}
          </button>
        </div>

        <!-- 测试结果 -->
        <div v-if="testResult" :class="['test-result', testResult.success ? 'success' : 'error']">
          {{ testResult.message }}
        </div>
      </template>
    </div>

    <!-- 调试模式开关 -->
    <div class="debug-mode-section">
      <label class="debug-mode-label">
        <input type="checkbox" :checked="debugMode" @change="toggleDebugMode" />
        调试模式（在控制台显示详细日志）
      </label>
    </div>

    <!-- 底部操作按钮 -->
    <div class="panel-actions">
      <button class="btn btn-primary" @click="saveConfigs">保存配置</button>
      <button class="btn btn-secondary" @click="resetConfigs">重置为默认</button>
      <button class="btn btn-secondary" @click="closePanel">关闭</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { apiAutoSwitchService } from '../services/apiAutoSwitchService';
import { apiConfigService, type WorldType } from '../services/apiConfigService';
import type { MultiAPIConfig } from '../types/api';

// 定义事件
const emit = defineEmits<{
  close: [];
}>();

// 世界配置
const worlds = [
  { key: 'realWorld' as WorldType, name: '现实世界' },
  { key: 'innerWorld' as WorldType, name: '里世界副本' },
  { key: 'sanctuary' as WorldType, name: '归所' },
];

// 模型预设（包含 API 地址）
const modelPresets = [
  // Gemini 系列 - 通过 SillyTavern 本地后端
  {
    label: 'Gemini Pro 2.5',
    value: 'gemini-2.5-pro-latest',
    apiurl: 'http://localhost:8000/api/backends/google_gemini/chat-completions/generate',
    description: 'Google 最新 Pro 版本，最强性能（需在 SillyTavern 后端配置）',
  },
  {
    label: 'Gemini 2.0 Flash',
    value: 'gemini-2.0-flash-exp',
    apiurl: 'http://localhost:8000/api/backends/google_gemini/chat-completions/generate',
    description: 'Google 2.0 实验版本，速度快（需在 SillyTavern 后端配置）',
  },
  {
    label: 'Gemini 1.5 Pro',
    value: 'gemini-1.5-pro-latest',
    apiurl: 'http://localhost:8000/api/backends/google_gemini/chat-completions/generate',
    description: 'Google 1.5 高质量模型（需在 SillyTavern 后端配置）',
  },
  {
    label: 'Gemini 1.5 Flash',
    value: 'gemini-1.5-flash-latest',
    apiurl: 'http://localhost:8000/api/backends/google_gemini/chat-completions/generate',
    description: 'Google 1.5 快速模型（需在 SillyTavern 后端配置）',
  },
  {
    label: 'Gemini Pro',
    value: 'gemini-pro',
    apiurl: 'http://localhost:8000/api/backends/google_gemini/chat-completions/generate',
    description: 'Google 标准模型（需在 SillyTavern 后端配置）',
  },
  // GPT 系列 - 通过 SillyTavern 本地后端
  {
    label: 'GPT-4',
    value: 'gpt-4',
    apiurl: 'http://localhost:8000/api/backends/openai/chat-completions/generate',
    description: 'OpenAI 最强模型（需在 SillyTavern 后端配置）',
  },
  {
    label: 'GPT-4 Turbo',
    value: 'gpt-4-turbo-preview',
    apiurl: 'http://localhost:8000/api/backends/openai/chat-completions/generate',
    description: 'OpenAI 快速版本（需在 SillyTavern 后端配置）',
  },
  {
    label: 'GPT-3.5',
    value: 'gpt-3.5-turbo',
    apiurl: 'http://localhost:8000/api/backends/openai/chat-completions/generate',
    description: 'OpenAI 经济模型（需在 SillyTavern 后端配置）',
  },
  // Claude 系列 - 通过 SillyTavern 本地后端
  {
    label: 'Claude 3 Opus',
    value: 'claude-3-opus-20240229',
    apiurl: 'http://localhost:8000/api/backends/anthropic/chat-completions/generate',
    description: 'Anthropic 最强模型（需在 SillyTavern 后端配置）',
  },
  {
    label: 'Claude 3 Sonnet',
    value: 'claude-3-sonnet-20240229',
    apiurl: 'http://localhost:8000/api/backends/anthropic/chat-completions/generate',
    description: 'Anthropic 平衡模型（需在 SillyTavern 后端配置）',
  },
  {
    label: 'Claude 3 Haiku',
    value: 'claude-3-haiku-20240307',
    apiurl: 'http://localhost:8000/api/backends/anthropic/chat-completions/generate',
    description: 'Anthropic 快速模型（需在 SillyTavern 后端配置）',
  },
];

// 状态
const activeTab = ref<WorldType>('realWorld');
const configs = ref<MultiAPIConfig>({
  realWorld: null,
  innerWorld: null,
  sanctuary: null,
});
const testing = ref(false);
const testResult = ref<{ success: boolean; message: string } | null>(null);
const debugMode = ref(false);

// 计算属性
const currentWorldName = computed(() => {
  const currentWorld = apiConfigService.getCurrentWorld();
  const world = worlds.find(w => w.key === currentWorld);
  return world ? world.name : '未知';
});

const currentAPIStatus = computed(() => {
  const currentWorld = apiConfigService.getCurrentWorld();
  const currentConfig = configs.value[currentWorld];

  if (currentConfig) {
    // 使用自定义 API
    return {
      isCustom: true,
      displayText: '自定义 API',
      model: currentConfig.model || '未设置',
    };
  } else {
    // 使用默认 API
    return {
      isCustom: false,
      displayText: '酒馆默认 API',
      model: null,
    };
  }
});

// 初始化
onMounted(async () => {
  try {
    await apiConfigService.initialize();
    configs.value = apiConfigService.getAllConfigs();
    debugMode.value = apiAutoSwitchService.isDebugMode();
    console.log('[API Config Panel] 配置已加载:', configs.value);
  } catch (error) {
    console.error('[API Config Panel] 加载配置失败:', error);
    toastr.error('加载 API 配置失败');
  }
});

// 切换配置启用状态
function toggleConfig(world: WorldType, event: Event): void {
  const checkbox = event.target as HTMLInputElement;

  if (checkbox.checked) {
    // 启用自定义 API，创建全新的配置对象（避免引用共享）
    configs.value = {
      ...configs.value,
      [world]: {
        apiurl: '',
        key: '',
        model: '',
        temperature: 1.0,
        max_tokens: 2000,
      },
    };
  } else {
    // 禁用自定义 API，使用酒馆默认
    configs.value = {
      ...configs.value,
      [world]: null,
    };
  }

  testResult.value = null;
}

// 测试连接
async function testConnection(): Promise<void> {
  const config = configs.value[activeTab.value];

  if (!config) {
    toastr.warning('请先启用自定义 API');
    return;
  }

  // 验证配置
  const validation = apiConfigService.validateConfig(config);
  if (!validation.valid) {
    testResult.value = {
      success: false,
      message: validation.errors.join('; '),
    };
    return;
  }

  testing.value = true;
  testResult.value = null;

  try {
    const result = await apiConfigService.testConnection(activeTab.value);
    testResult.value = result;

    if (result.success) {
      toastr.success('API 连接测试成功！');
    } else {
      toastr.error('API 连接测试失败');
    }
  } catch (error) {
    console.error('[API Config Panel] 测试连接失败:', error);
    testResult.value = {
      success: false,
      message: `测试失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
    toastr.error('测试连接失败');
  } finally {
    testing.value = false;
  }
}

// 保存配置
async function saveConfigs(): Promise<void> {
  try {
    // 验证所有启用的配置
    for (const world of worlds) {
      const config = configs.value[world.key];
      if (config) {
        const validation = apiConfigService.validateConfig(config);
        if (!validation.valid) {
          toastr.error(`${world.name} 配置无效: ${validation.errors.join('; ')}`);
          return;
        }
      }
    }

    await apiConfigService.saveConfigs(configs.value);
    toastr.success('API 配置已保存');
  } catch (error) {
    console.error('[API Config Panel] 保存配置失败:', error);
    toastr.error('保存配置失败');
  }
}

// 重置配置
async function resetConfigs(): Promise<void> {
  if (!confirm('确定要重置所有 API 配置吗？这将使所有世界使用酒馆默认 API。')) {
    return;
  }

  try {
    await apiConfigService.resetConfigs();
    configs.value = {
      realWorld: null,
      innerWorld: null,
      sanctuary: null,
    };
    testResult.value = null;
    toastr.success('配置已重置');
  } catch (error) {
    console.error('[API Config Panel] 重置配置失败:', error);
    toastr.error('重置配置失败');
  }
}

// 关闭面板
function closePanel(): void {
  emit('close');
}

// 选择模型
function selectModel(modelValue: string): void {
  const currentConfig = configs.value[activeTab.value];
  if (currentConfig) {
    // 查找对应的模型预设
    const preset = modelPresets.find(p => p.value === modelValue);

    // 创建新的配置对象（避免引用共享）
    configs.value = {
      ...configs.value,
      [activeTab.value]: {
        ...currentConfig,
        model: modelValue,
        apiurl: preset?.apiurl || currentConfig.apiurl,
      },
    };

    testResult.value = null;
  }
}

// 切换调试模式
function toggleDebugMode(): void {
  apiAutoSwitchService.toggleDebugMode();
  debugMode.value = apiAutoSwitchService.isDebugMode();
}
</script>

<style scoped lang="scss">
@import '../styles/global.scss';

.api-config-panel {
  @include modal-container;
  max-width: 600px;
  width: 100%;
}

.panel-title {
  @include modal-title;
  text-align: center;
  margin-bottom: $spacing-sm;
}

.panel-description {
  font-size: $font-size-sm;
  color: $color-text-secondary;
  margin-bottom: $spacing-lg;
  text-align: center;
  line-height: 1.5;

  @include mobile {
    font-size: $font-size-xs;
    margin-bottom: $spacing-md;
  }
}

.current-api-info {
  background: rgba($color-primary-gold, 0.1);
  padding: $spacing-md;
  border-radius: $border-radius-sm;
  border: 1px solid $color-border-gold;
  margin-bottom: $spacing-lg;

  @include mobile {
    padding: $spacing-sm;
    margin-bottom: $spacing-md;
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: $spacing-xs 0;

    &:not(:last-child) {
      border-bottom: 1px solid rgba($color-border-gold, 0.3);
    }

    @include mobile {
      flex-direction: column;
      align-items: flex-start;
      gap: $spacing-xs;
    }

    &.model-info {
      font-size: $font-size-sm;
      opacity: 0.9;

      @include mobile {
        font-size: $font-size-xs;
      }
    }
  }

  .info-label {
    color: $color-text-gold;
    font-size: $font-size-sm;

    @include mobile {
      font-size: $font-size-xs;
    }
  }

  .info-value {
    font-weight: $font-weight-bold;
    font-size: $font-size-base;

    @include mobile {
      font-size: $font-size-sm;
    }

    &.custom-api {
      color: $color-secondary-gold;
    }

    &.default-api {
      color: $color-info;
    }
  }
}

.config-tabs {
  display: flex;
  gap: $spacing-xs;
  margin-bottom: $spacing-lg;
  border-bottom: 2px solid $color-border-gold;

  @include mobile {
    margin-bottom: $spacing-md;
  }
}

.tab-button {
  flex: 1;
  padding: $spacing-sm $spacing-md;
  background: transparent;
  border: none;
  color: $color-text-secondary;
  cursor: pointer;
  transition: all $transition-base;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  font-size: $font-size-base;

  @include mobile {
    padding: $spacing-xs $spacing-sm;
    font-size: $font-size-sm;
  }

  &:hover {
    color: $color-text-primary;
    background: rgba($color-primary-gold, 0.1);
  }

  &.active {
    color: $color-secondary-gold;
    border-bottom-color: $color-secondary-gold;
    font-weight: $font-weight-bold;
  }
}

.config-form {
  margin-bottom: $spacing-xl;

  @include mobile {
    margin-bottom: $spacing-lg;
  }
}

.form-group {
  margin-bottom: $spacing-lg;

  @include mobile {
    margin-bottom: $spacing-md;
  }
}

.form-label {
  display: block;
  margin-bottom: $spacing-sm;
  color: $color-text-gold;
  font-size: $font-size-sm;

  @include mobile {
    font-size: $font-size-xs;
  }

  input[type='checkbox'] {
    margin-right: $spacing-sm;
    cursor: pointer;
  }
}

.form-input {
  @include form-control;
  width: 100%;

  &:hover {
    border-color: $color-secondary-gold;
  }

  &:focus {
    border-color: $color-secondary-gold;
    box-shadow: $shadow-gold;
  }
}

.model-input-group {
  .model-presets {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-xs;
    margin-top: $spacing-sm;

    @include mobile {
      gap: 4px;
    }
  }

  .preset-chip {
    padding: $spacing-xs $spacing-sm;
    background: rgba($color-primary-gold, 0.1);
    border: 1px solid $color-border-gold;
    border-radius: $border-radius-sm;
    color: $color-text-primary;
    font-size: $font-size-xs;
    cursor: pointer;
    transition: all $transition-base;

    @include mobile {
      padding: 4px $spacing-xs;
      font-size: 10px;
    }

    &:hover {
      background: rgba($color-secondary-gold, 0.2);
      border-color: $color-secondary-gold;
      transform: translateY(-1px);
    }

    &:active {
      transform: translateY(0);
    }
  }

  .model-hint {
    display: block;
    font-size: $font-size-xs;
    color: $color-text-secondary;
    margin-top: $spacing-xs;
  }
}

.api-key-hint {
  display: block;
  font-size: $font-size-xs;
  color: $color-text-secondary;
  margin-top: $spacing-xs;
  font-style: italic;
}

.form-range {
  width: 100%;
  margin-bottom: $spacing-xs;
  cursor: pointer;

  &::-webkit-slider-thumb {
    background: $color-primary-gold;
  }

  &::-moz-range-thumb {
    background: $color-primary-gold;
  }
}

.range-hint {
  display: block;
  font-size: $font-size-xs;
  color: $color-text-secondary;
  margin-top: $spacing-xs;
}

.form-actions {
  margin-top: $spacing-lg;

  @include mobile {
    margin-top: $spacing-md;
  }
}

.test-result {
  margin-top: $spacing-md;
  padding: $spacing-md;
  border-radius: $border-radius-sm;
  font-size: $font-size-sm;

  @include mobile {
    padding: $spacing-sm;
    font-size: $font-size-xs;
  }

  &.success {
    background: rgba($color-success, 0.2);
    border: 1px solid $color-success;
    color: lighten($color-success, 20%);
  }

  &.error {
    background: rgba($color-danger, 0.2);
    border: 1px solid $color-danger;
    color: lighten($color-danger, 20%);
  }
}

.panel-actions {
  @include button-group;
  justify-content: center;
}

.btn {
  padding: $spacing-sm $spacing-xl;
  border: none;
  border-radius: $border-radius-sm;
  cursor: pointer;
  font-size: $font-size-base;
  font-weight: $font-weight-bold;
  transition: all $transition-base;

  @include mobile {
    padding: $spacing-xs $spacing-lg;
    font-size: $font-size-sm;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: $shadow-md;
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }
}

.btn-primary {
  background: linear-gradient(135deg, $color-primary-gold, $color-dark-gold);
  color: $color-primary-black;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.3);

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, $color-secondary-gold, $color-primary-gold);
    box-shadow: $shadow-md, $shadow-gold;
  }
}

.btn-secondary {
  background: rgba($color-text-secondary, 0.2);
  color: $color-text-primary;
  border: 1px solid $color-border-gold;

  &:hover:not(:disabled) {
    background: rgba($color-text-secondary, 0.3);
    border-color: $color-secondary-gold;
  }
}

.btn-test {
  background: linear-gradient(135deg, $color-info, darken($color-info, 10%));
  color: $color-text-primary;

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, lighten($color-info, 10%), $color-info);
    box-shadow:
      $shadow-md,
      0 0 15px rgba(33, 150, 243, 0.5);
  }
}

.debug-mode-section {
  background: rgba($color-text-secondary, 0.1);
  padding: $spacing-md;
  border-radius: $border-radius-sm;
  border: 1px solid $color-border-gold;
  margin-bottom: $spacing-lg;

  @include mobile {
    padding: $spacing-sm;
    margin-bottom: $spacing-md;
  }

  .debug-mode-label {
    display: flex;
    align-items: center;
    color: $color-text-gold;
    font-size: $font-size-sm;
    cursor: pointer;

    @include mobile {
      font-size: $font-size-xs;
    }

    input[type='checkbox'] {
      margin-right: $spacing-sm;
      cursor: pointer;
      width: 16px;
      height: 16px;

      @include mobile {
        width: 14px;
        height: 14px;
      }
    }

    &:hover {
      color: $color-secondary-gold;
    }
  }
}
</style>
