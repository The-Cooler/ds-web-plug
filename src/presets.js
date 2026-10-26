import { KEY, ENABLE_KEY, DEFAULT_KEY, DEFAULT_PRESETS } from './constants.js';
import { read, write } from './store.js';

export const state = {
  presets: read(KEY, DEFAULT_PRESETS),
  enabled: read(ENABLE_KEY, true),
  defaultId: '',
};

if (!Array.isArray(state.presets)) state.presets = [];
state.defaultId = read(DEFAULT_KEY, state.presets[0]?.id || '');

/**
 * 解析模板正文：自身正文 + 被继承模板的内容，按继承顺序依次拼接。
 * 循环继承（A→B→A）跳过已经展开过的模板，不会无限递归。
 */
export function resolvePrompt(id, seen = new Set()) {
  const p = state.presets.find(x => x.id === id);
  if (!p || seen.has(id)) return '';
  seen.add(id);
  const parts = [];
  for (const parentId of p.inherits ?? []) {
    const part = resolvePrompt(parentId, seen);
    if (part) parts.push(part);
  }
  const own = p.prompt?.trim();
  if (own) parts.push(own);
  return parts.join('\n\n');
}

export const getPrompt = () => {
  if (!state.enabled) return '';
  return resolvePrompt(state.defaultId);
};

export const save = () => {
  write(KEY, state.presets);
  write(ENABLE_KEY, state.enabled);
  write(DEFAULT_KEY, state.defaultId);
};
