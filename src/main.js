import { state } from './presets.js';
import { log } from './store.js';
import { installInterceptors } from './interceptors.js';
import { mountPet, unmountPet } from './pet/widget.js';
import { isPetEnabled, setPetEnabled } from './pet/state.js';
import { mountPromptButton, unmountPromptButton } from './ui/panel.js';
import { installScrubber } from './scrub.js';

(() => {
  'use strict';

  const W = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

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

  // 宠物关闭时，双击右下角的提示词按钮把宠物叫回来。
  document.addEventListener('dblclick', e => {
    if (e.target?.id === '__ds_prompt_toggle' && !isPetEnabled()) {
      setPetEnabled(true);
      syncEntry();
    }
  });

  // 右键菜单「关闭动画」后立刻切回提示词按钮。
  window.addEventListener('ds-pet-disabled', syncEntry);

  log('脚本已启动；当前默认模板：', state.defaultId);
})();
