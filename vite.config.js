import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.js',
      userscript: {
        name: 'DeepSeek 大肥鱼插件',
        namespace: 'deepseek-custom-prompt',
        version: '2.2.2',
        description: '自定义提示词模板 + 桌面宠物挂件',
        author: 'LLL',
        downloadURL: 'https://gitee.com/Ljunyang114/ds-web-plug/raw/main/dist/ds-custom-prompt.user.js',
        updateURL: 'https://gitee.com/Ljunyang114/ds-web-plug/raw/main/dist/ds-custom-prompt.user.js',
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
