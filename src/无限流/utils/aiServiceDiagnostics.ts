/**
 * AI 服务诊断工具
 * 用于检测和诊断 AI 服务问题
 */

/**
 * 测试 AI 服务连接
 */
export async function testAIService(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    console.log('[AI Diagnostics] 开始测试 AI 服务...');

    // 测试简单的生成请求
    const testPrompt = '请回复"测试成功"';

    const response = await generate({
      user_input: testPrompt,
      should_stream: false,
    });

    console.log('[AI Diagnostics] AI 服务响应:', response);

    if (response && response.length > 0) {
      return {
        success: true,
        message: 'AI 服务连接正常',
        details: {
          response: response.substring(0, 100),
          length: response.length,
        },
      };
    } else {
      return {
        success: false,
        message: 'AI 服务返回空响应',
      };
    }
  } catch (error) {
    console.error('[AI Diagnostics] AI 服务测试失败:', error);

    const errorMessage = error instanceof Error ? error.message : String(error);

    // 分析错误类型
    let diagnosis = '';
    if (errorMessage.includes('500')) {
      diagnosis = '服务器内部错误 (500)。可能原因：\n' + '- AI 模型配置错误\n' + '- API 密钥无效\n' + '- 后端服务异常';
    } else if (errorMessage.includes('404')) {
      diagnosis = 'API 端点不存在 (404)。请检查 API 配置。';
    } else if (errorMessage.includes('401') || errorMessage.includes('403')) {
      diagnosis = '认证失败。请检查 API 密钥是否正确。';
    } else if (errorMessage.includes('timeout')) {
      diagnosis = '请求超时。请检查网络连接。';
    } else {
      diagnosis = '未知错误。请查看控制台日志获取详细信息。';
    }

    return {
      success: false,
      message: `AI 服务测试失败: ${errorMessage}`,
      details: {
        error: errorMessage,
        diagnosis,
      },
    };
  }
}

/**
 * 获取当前 AI 配置信息
 */
export function getAIConfigInfo(): {
  model: string;
  endpoint: string;
  hasApiKey: boolean;
} {
  try {
    // 从 SillyTavern 获取当前配置
    const chatSettings = SillyTavern.chatCompletionSettings;
    const mainApi = SillyTavern.mainApi;

    return {
      model: chatSettings?.openai_model || mainApi || 'unknown',
      endpoint: chatSettings?.api_url_scale || 'unknown',
      hasApiKey: Boolean(chatSettings?.api_key_openai || chatSettings?.api_key_claude),
    };
  } catch (error) {
    console.error('[AI Diagnostics] 获取配置信息失败:', error);
    return {
      model: 'unknown',
      endpoint: 'unknown',
      hasApiKey: false,
    };
  }
}

/**
 * 运行完整诊断
 */
export async function runFullDiagnostics(): Promise<string> {
  console.log('[AI Diagnostics] 开始完整诊断...');

  let report = '=== AI 服务诊断报告 ===\n\n';

  // 1. 配置信息
  report += '1. 配置信息\n';
  const config = getAIConfigInfo();
  report += `   - 模型: ${config.model}\n`;
  report += `   - 端点: ${config.endpoint}\n`;
  report += `   - API 密钥: ${config.hasApiKey ? '已配置' : '未配置'}\n\n`;

  // 2. 连接测试
  report += '2. 连接测试\n';
  const testResult = await testAIService();
  report += `   - 状态: ${testResult.success ? '✅ 成功' : '❌ 失败'}\n`;
  report += `   - 消息: ${testResult.message}\n`;

  if (testResult.details) {
    if (testResult.details.diagnosis) {
      report += `   - 诊断: ${testResult.details.diagnosis}\n`;
    }
    if (testResult.details.response) {
      report += `   - 响应预览: ${testResult.details.response}\n`;
    }
  }

  report += '\n=== 诊断完成 ===';

  console.log('[AI Diagnostics] 诊断完成');
  console.log(report);

  return report;
}
