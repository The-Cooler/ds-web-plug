import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.js',
      userscript: {
        name: 'DeepSeek 大肥鱼插件',
        namespace: 'deepseek-custom-prompt',
        version: '2.1.0',
        description: '自定义提示词模板 + 桌面宠物挂件',
        author: 'LLL',
        match: ['https://chat.deepseek.com/*'],
        'run-at': 'document-start',
        grant: ['GM_getValue', 'GM_setValue', 'unsafeWindow', 'GM_xmlhttpRequest'],
        connect: [
          'gitee.com',
          'raw.githubusercontent.com',
        ],
      },
    }),
  ],
});
