import { state } from './presets.js';
import { log } from './store.js';
import { installInterceptors } from './interceptors.js';
import { createUI } from './ui/panel.js';
import { mountPet } from './pet/widget.js';

(() => {
  'use strict';

  const W = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

  installInterceptors(W);

  const observer = new MutationObserver(() => {
    if (!document.body) return;
    if (!document.getElementById('__ds_prompt_manager')) createUI();
    if (!document.getElementById('__ds_pet_root')) mountPet();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  if (document.body) {
    createUI();
    mountPet();
  }

  log('脚本已启动；当前默认模板：', state.defaultId);
})();
