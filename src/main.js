import { state } from './presets.js';
import { log } from './store.js';
import { installInterceptors } from './interceptors.js';
import { createUI } from './ui/panel.js';

(() => {
  'use strict';

  const W = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

  installInterceptors(W);

  const observer = new MutationObserver(() => {
    if (document.body && !document.getElementById('__ds_prompt_manager')) createUI();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  if (document.body) createUI();

  log('脚本已启动；当前默认模板：', state.defaultId);
})();
