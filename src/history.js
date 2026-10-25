// 历史接口返回里滤掉注入内容，避免刷新后聊天记录里出现 marker 与提示词。
// 只处理 /api/v0/chat/history_messages 的 JSON 响应，其它请求原样放行。
import { isInjected, stripInjected } from './promptFormat.js';

const HISTORY_URL = /\/api\/v0\/chat\/history_messages(?:[?"#]|$)/i;

function cleanMessage(msg) {
  if (!msg || typeof msg !== 'object') return;
  const fragments = msg.fragments;
  if (!Array.isArray(fragments)) return;
  for (const f of fragments) {
    if (!f || f.type !== 'REQUEST' || typeof f.content !== 'string') continue;
    if (!isInjected(f.content)) continue;
    f.content = stripInjected(f.content);
  }
}

function cleanBizData(data) {
  if (!data || typeof data !== 'object') return;
  const messages = data.chat_messages;
  if (!Array.isArray(messages)) return;
  for (const m of messages) cleanMessage(m);
}

function cleanPayload(json) {
  if (!json || typeof json !== 'object') return;
  const data = json.data;
  if (!data || typeof data !== 'object') return;
  cleanBizData(data.biz_data);
}

export function cleanHistoryJson(text) {
  try {
    const json = JSON.parse(text);
    cleanPayload(json);
    return JSON.stringify(json);
  } catch {
    return text;
  }
}

export function isHistoryUrl(url) {
  return HISTORY_URL.test(String(url));
}
