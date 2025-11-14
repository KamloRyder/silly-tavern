import { createPinia } from 'pinia';
import toastr from 'toastr';
import { createApp } from 'vue';
import app from './app.vue';
import './styles/global.scss';

// 全局错误处理
window.addEventListener('error', event => {
  console.error('全局错误:', event.error);
  toastr.error('发生错误，请检查控制台');
});

$(() => {
  console.log('[无限流] 开始加载界面...');
  console.log('[无限流] 当前时间:', new Date().toLocaleString());

  // 等待 MVU 初始化
  console.log('[无限流] 等待 MVU 变量框架初始化...');
  waitGlobalInitialized('Mvu')
    .then(() => {
      console.log('[无限流] MVU 变量框架初始化完成');

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
$(window).on('pagehide', () => {
  console.log('[无限流] 界面卸载事件触发');
  console.log('[无限流] 卸载时间:', new Date().toLocaleString());
  console.log('[无限流] 无限流视觉互动小说游戏界面已卸载');
  toastr.info('游戏界面已卸载');
});
