import { state } from './presets.js';
import { log } from './store.js';
import { installInterceptors } from './interceptors.js';
import { mountPet, unmountPet } from './pet/widget.js';
import { isPetEnabled, setPetEnabled } from './pet/state.js';
import { mountPromptButton, unmountPromptButton } from './ui/panel.js';
import { installScrubber } from './scrub.js';
import { runCleanup } from './cleanup.js';

(() => {
  'use strict';

  const W = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

  runCleanup();
  installInterceptors(W);

  const syncEntry = () => {
    if (isPetEnabled()) {
      unmountPromptButton();
      mountPet();
    } else {
      unmountPet();
      mountPromptButton();
    }
    installScrubber();
  };

  const observer = new MutationObserver(() => {
    if (!document.body) return;
    syncEntry();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  if (document.body) syncEntry();

  // 宠物关闭时，双击提示词按钮把宠物叫回来（按钮位置此时叠加在动画锚点上）。
  document.addEventListener('dblclick', e => {
    if (e.target?.id === '__ds_prompt_toggle' && !isPetEnabled()) {
      setPetEnabled(true);
      syncEntry();
    }
  });

  window.addEventListener('ds-pet-disabled', syncEntry);
  window.addEventListener('ds-pet-toggle', syncEntry);

  log('脚本已启动；当前默认模板：', state.defaultId);
})();
