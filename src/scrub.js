import { isInjected, stripInjected } from './promptFormat.js';

// 旧消息（清理上线之前注入的）仍然带着 marker。这里在渲染层把前缀剥掉，
// 不依赖历史接口是否被清理，也能覆盖浏览器本地缓存里的旧数据。
const SKIP_IDS = new Set(['__ds_prompt_manager', '__ds_pet_root', '__ds_pet_menu']);

function shouldSkip(node) {
  let el = node.parentElement;
  while (el) {
    if (SKIP_IDS.has(el.id)) return true;
    el = el.parentElement;
  }
  return false;
}

function scrubRoot(root) {
  if (!root || !root.textContent?.includes('[DS_CUSTOM_SYSTEM_PROMPT')) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const targets = [];
  let node;
  while ((node = walker.nextNode())) {
    if (!isInjected(node.data)) continue;
    if (shouldSkip(node)) continue;
    targets.push(node);
  }
  for (const n of targets) {
    const next = stripInjected(n.data);
    if (next !== n.data) n.data = next;
  }
}

let scheduled = false;
let scrubInstalled = false;
function schedule() {
  if (scheduled) return;
  scheduled = true;
  setTimeout(() => {
    scheduled = false;
    scrubRoot(document.body);
  }, 300);
}

export function installScrubber() {
  if (!document.body || scrubInstalled) return;
  scrubInstalled = true;
  scrubRoot(document.body);
  new MutationObserver(schedule).observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  // React 会在后续渲染里重写文本节点，定时兜底扫一遍。
  setInterval(() => scrubRoot(document.body), 2000);
}
