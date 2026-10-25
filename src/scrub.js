const MARKER = '[DS_CUSTOM_SYSTEM_PROMPT]';

// 旧消息（本脚本清理上线之前注入的）仍然带着 marker。这里在渲染层把前缀剥掉，
// 不依赖历史接口是否被清理，也能覆盖浏览器本地缓存里的旧数据。
const SKIP_IDS = new Set(['__ds_prompt_manager', '__ds_pet_root', '__ds_pet_menu']);

function strip(text) {
  const idx = text.indexOf(MARKER);
  if (idx === -1) return text;
  const before = text.slice(0, idx);
  const rest = text.slice(idx + MARKER.length).replace(/^\n/, '');
  const sep = rest.indexOf('\n\n');
  const cleaned = sep === -1 ? '' : rest.slice(sep + 2);
  // 只处理 marker 位于开头的情况，避免误改正文里恰好提到 marker 的消息。
  return before.trim() === '' ? cleaned : text;
}

function shouldSkip(node) {
  let el = node.parentElement;
  while (el) {
    if (SKIP_IDS.has(el.id)) return true;
    el = el.parentElement;
  }
  return false;
}

function scrubRoot(root) {
  if (!root || !root.textContent?.includes(MARKER)) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const targets = [];
  let node;
  while ((node = walker.nextNode())) {
    if (!node.data.includes(MARKER)) continue;
    if (shouldSkip(node)) continue;
    targets.push(node);
  }
  for (const n of targets) {
    const next = strip(n.data);
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
  }, 800);
}

export function installScrubber() {
  if (!document.body || scrubInstalled) return;
  scrubInstalled = true;
  scrubRoot(document.body);
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
}
