import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.js',
      userscript: {
        name: 'DeepSeek 自定义系统提示词',
        namespace: 'deepseek-custom-prompt',
        version: '2.0.0',
        description: '多模板管理，尝试在请求层注入默认提示词',
        author: 'LLL',
        match: ['https://chat.deepseek.com/*'],
        'run-at': 'document-start',
        grant: ['GM_getValue', 'GM_setValue', 'unsafeWindow'],
      },
    }),
  ],
});
