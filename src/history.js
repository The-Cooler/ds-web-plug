// 历史接口返回里滤掉注入内容，避免刷新后聊天记录里出现 marker 与提示词。
// 同时把「这条会话的历史里是否已有注入标记」告诉注入层，作为是否注入的唯一依据。
// 只处理 /api/v0/chat/history_messages 的 JSON 响应，其它请求原样放行。
import { isInjected, stripInjected } from './promptFormat.js';
import { noteSessionHistory } from './injector.js';

const HISTORY_URL = /\/api\/v0\/chat\/history_messages(?:[?"#]|$)/i;

function cleanMessage(msg, mark) {
  if (!msg || typeof msg !== 'object') return;
  const fragments = msg.fragments;
  if (!Array.isArray(fragments)) return;
  for (const f of fragments) {
    if (!f || f.type !== 'REQUEST' || typeof f.content !== 'string') continue;
    if (!isInjected(f.content)) continue;
    mark.found = true;
    f.content = stripInjected(f.content);
  }
}

function cleanBizData(data, mark) {
  if (!data || typeof data !== 'object') return;
  const messages = data.chat_messages;
  if (!Array.isArray(messages)) return;
  for (const m of messages) cleanMessage(m, mark);
}

function cleanPayload(json, mark) {
  if (!json || typeof json !== 'object') return;
  const data = json.data;
  if (!data || typeof data !== 'object') return;
  cleanBizData(data.biz_data, mark);
}

export function cleanHistoryJson(text) {
  const mark = { found: false };
  try {
    const json = JSON.parse(text);
    cleanPayload(json, mark);
    const sessionId = json?.data?.biz_data?.chat_session?.id;
    if (sessionId !== undefined && sessionId !== null) noteSessionHistory(sessionId, mark.found);
    return JSON.stringify(json);
  } catch {
    return text;
  }
}

export function isHistoryUrl(url) {
  return HISTORY_URL.test(String(url));
}
