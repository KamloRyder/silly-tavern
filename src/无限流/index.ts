import { createPinia } from 'pinia';
import toastr from 'toastr';
import { createApp } from 'vue';
import app from './app.vue';
import { apiAutoSwitchService } from './services/apiAutoSwitchService';
import { memoryFragmentService } from './services/memoryFragmentService';
import { sanctuaryService } from './services/sanctuaryService';
import { streamService } from './services/streamService';
import './styles/global.scss';

// 全局错误处理
window.addEventListener('error', event => {
  console.error('全局错误:', event.error);
  toastr.error('发生错误，请检查控制台');
});

/**
 * 隐藏除第 0 楼以外的所有消息楼层
 */
function hideNonZeroMessages(): void {
  try {
    console.log('[无限流] 开始隐藏非 0 楼消息...');

    // 查找所有消息元素（在父页面中）
    const $messages = $('.mes', window.parent.document);

    console.log('[无限流] 找到', $messages.length, '条消息');

    let hiddenCount = 0;

    // 遍历所有消息，隐藏除第 0 楼以外的消息
    $messages.each((index, element) => {
      const $element = $(element);

      // 获取消息的 mesid 属性来确定楼层
      const mesId = $element.attr('mesid');

      console.log(`[无限流] 消息 ${index}: mesid=${mesId}`);

      // 只保留第 0 楼（mesid="0"），隐藏其他所有消息
      if (mesId !== '0' && mesId !== undefined) {
        $element.addClass('hidden-by-infinite-flow').hide();
        hiddenCount++;
        console.log(`[无限流] 隐藏消息: mesid=${mesId}`);
      } else {
        console.log(`[无限流] 保留消息: mesid=${mesId} (第 0 楼)`);
      }
    });

    console.log('[无限流] 已隐藏', hiddenCount, '条非 0 楼消息，保留第 0 楼');
  } catch (error) {
    console.error('[无限流] 隐藏消息失败:', error);
  }
}

/**
 * 恢复所有被隐藏的消息楼层
 */
function restoreHiddenMessages(): void {
  try {
    console.log('[无限流] 开始恢复被隐藏的消息...');

    // 查找所有被标记为隐藏的消息
    const $hiddenMessages = $('.hidden-by-infinite-flow', window.parent.document);

    console.log('[无限流] 找到', $hiddenMessages.length, '条被隐藏的消息');

    // 恢复显示并移除标记类
    $hiddenMessages.removeClass('hidden-by-infinite-flow').show();

    console.log('[无限流] 已恢复所有被隐藏的消息');
  } catch (error) {
    console.error('[无限流] 恢复消息失败:', error);
  }
}

$(() => {
  console.log('[无限流] 开始加载界面...');
  console.log('[无限流] 当前时间:', new Date().toLocaleString());

  // 隐藏非 0 楼消息
  hideNonZeroMessages();

  // 等待 MVU 初始化
  console.log('[无限流] 等待 MVU 变量框架初始化...');
  waitGlobalInitialized('Mvu')
    .then(async () => {
      console.log('[无限流] MVU 变量框架初始化完成');

      // 设置流式传输监听器
      console.log('[无限流] 设置流式传输监听器...');
      streamService.setupStreamListeners();
      console.log('[无限流] 流式传输监听器设置完成');

      // 初始化并启动记忆碎片服务
      console.log('[无限流] 初始化记忆碎片服务...');
      await memoryFragmentService.initialize();
      memoryFragmentService.startListening();
      console.log('[无限流] 记忆碎片服务已启动');

      // 初始化归所服务
      console.log('[无限流] 初始化归所服务...');
      await sanctuaryService.initialize();
      console.log('[无限流] 归所服务已启动');

      // 初始化 API 自动切换服务
      console.log('[无限流] 初始化 API 自动切换服务...');
      try {
        await apiAutoSwitchService.initialize();
        console.log('[无限流] API 自动切换服务已启动');
      } catch (error) {
        console.error('[无限流] API 自动切换服务初始化失败:', error);
        console.error('[无限流] 错误详情:', error);
        toastr.warning('API 自动切换服务初始化失败，将使用默认 API');
        // 不阻止应用启动，继续加载其他功能
      }

      // 创建 Vue 应用
      console.log('[无限流] 创建 Vue 应用...');
      const vueApp = createApp(app);

      // 创建并挂载 Pinia
      console.log('[无限流] 创建 Pinia 状态管理...');
      const pinia = createPinia();
      vueApp.use(pinia);

      // 挂载应用
      console.log('[无限流] 挂载 Vue 应用到 #app...');
      vueApp.mount('#app');

      console.log('[无限流] 无限流视觉互动小说游戏界面加载完成');
      toastr.success('游戏界面加载成功');

      // 监听聊天文件变更并重载
      const chat_id = SillyTavern.getCurrentChatId();
      console.log('[无限流] 当前聊天 ID:', chat_id);
      console.log('[无限流] 设置聊天文件变更监听器...');

      eventOn(tavern_events.CHAT_CHANGED, new_chat_id => {
        console.log('[无限流] 检测到聊天文件变更');
        console.log('[无限流] 旧聊天 ID:', chat_id);
        console.log('[无限流] 新聊天 ID:', new_chat_id);

        if (chat_id !== new_chat_id) {
          console.log('[无限流] 聊天文件已变更，准备重新加载界面...');
          toastr.info('聊天文件已变更，正在重新加载...');
          window.location.reload();
        }
      });

      console.log('[无限流] 所有初始化完成，界面已就绪');
    })
    .catch(error => {
      console.error('[无限流] MVU 初始化失败:', error);
      console.error('[无限流] 错误详情:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      toastr.error('MVU 初始化失败，请检查是否安装了 MVU 变量框架');
    });
});

// 监听界面卸载
$(window).on('pagehide', async () => {
  console.log('[无限流] 界面卸载事件触发');
  console.log('[无限流] 卸载时间:', new Date().toLocaleString());

  // 清理 API 自动切换服务
  try {
    console.log('[无限流] 清理 API 自动切换服务...');
    await apiAutoSwitchService.cleanup();
    console.log('[无限流] API 自动切换服务已清理');
  } catch (error) {
    console.error('[无限流] API 自动切换服务清理失败:', error);
    // 继续执行其他清理操作
  }

  // 恢复被隐藏的消息
  restoreHiddenMessages();

  console.log('[无限流] 无限流视觉互动小说游戏界面已卸载');
  toastr.info('游戏界面已卸载');
});
