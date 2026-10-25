// 历史接口返回里滤掉注入内容，避免刷新后聊天记录里出现 marker 与提示词。
// 只处理 /api/v0/chat/history_messages 的 JSON 响应，其它请求原样放行。
const HISTORY_URL = /\/api\/v0\/chat\/history_messages(?:[?"#]|$)/i;
const MARKER = '[DS_CUSTOM_SYSTEM_PROMPT]';

function cleanMessage(msg) {
  if (!msg || typeof msg !== 'object') return;
  const fragments = msg.fragments;
  if (!Array.isArray(fragments)) return;
  for (const f of fragments) {
    if (!f || f.type !== 'REQUEST' || typeof f.content !== 'string') continue;
    if (!f.content.startsWith(MARKER)) continue;
    const rest = f.content.slice(MARKER.length).replace(/^\n/, '');
    const idx = rest.indexOf('\n\n');
    f.content = (idx === -1 ? '' : rest.slice(idx + 2)).trim();
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
