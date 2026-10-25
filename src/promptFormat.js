/**
 * 注入内容的拼装与剥离。
 * 新格式在 marker 里带上提示词长度：`[DS_CUSTOM_SYSTEM_PROMPT:27]`，
 * 解析时按长度切，提示词里含空行（甚至含 marker 文本）都不会误判。
 * 旧格式没有长度，只能靠「已知模板前缀」或空行分隔做启发式匹配。
 */
import { MARKER_HEAD } from './constants.js';
import { getUsedPrompts } from './store.js';

const HEAD = /^\[DS_CUSTOM_SYSTEM_PROMPT(?::(\d+))?\]/;

/** 拼接注入内容：marker(带长度) + 换行 + 提示词 + 空行 + 用户原文。 */
export function buildInjected(prompt, text) {
  return `${MARKER_HEAD}:${prompt.length}]\n${prompt}\n\n${text ?? ''}`;
}

/** 是否以注入 marker 开头（新旧格式都算）。 */
export function startsWithMarker(text) {
  return typeof text === 'string' && text.startsWith(MARKER_HEAD);
}

function dropLeadingNewline(s) {
  if (s.startsWith('\r\n')) return s.slice(2);
  if (s.startsWith('\n')) return s.slice(1);
  return s;
}

function dropSeparator(s) {
  if (s.startsWith('\r\n\r\n')) return s.slice(4);
  if (s.startsWith('\n\n')) return s.slice(2);
  return dropLeadingNewline(s);
}

/** 剥掉注入前缀，返回用户原文；无法确定边界时原样返回，绝不返回空串。 */
export function stripInjected(text) {
  if (typeof text !== 'string' || !text.startsWith(MARKER_HEAD)) return text;
  const m = HEAD.exec(text);
  if (!m) return text;
  let rest = dropLeadingNewline(text.slice(m[0].length));

  if (m[1] !== undefined) {
    const len = Number(m[1]);
    if (!Number.isFinite(len) || len < 0 || rest.length < len) return text;
    return dropSeparator(rest.slice(len));
  }

  // 旧格式：先按曾经用过的模板做最长前缀匹配，全部不中再退回空行分隔。
  const known = getUsedPrompts().slice().sort((a, b) => b.length - a.length);
  for (const p of known) {
    if (!p) continue;
    if (rest.startsWith(p)) {
      const tail = rest.slice(p.length);
      if (tail.startsWith('\n\n') || tail.startsWith('\r\n\r\n')) return dropSeparator(tail);
    }
  }
  const sep = rest.indexOf('\n\n');
  if (sep === -1) return text;
  return rest.slice(sep + 2);
}

/** 供历史响应与 DOM 清理共用：判断一段文本是否为本脚本注入。 */
export function isInjected(text) {
  return typeof text === 'string' && text.startsWith(MARKER_HEAD);
}
