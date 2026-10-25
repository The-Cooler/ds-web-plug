import { TARGET_URL } from './constants.js';
import { getPrompt } from './presets.js';
import {
  isInjectedWithoutSession,
  isSessionInjected,
  log,
  markInjectedWithoutSession,
  markSessionInjected,
  rememberPrompt,
} from './store.js';
import { buildInjected, isInjected } from './promptFormat.js';

// 每条会话只注入一次，同一会话里后续每条消息都不再注入。
// DeepSeek 会预创建 session（preCreateSession），首条消息的请求体里通常已经带
// chat_session_id，所以按「这个 id 是否处理过」判断，而不是看请求体有没有这个字段。
// 标记持久化在 GM 存储里，刷新页面后同一会话依然不会重复注入；
// 没有 session id 的老请求只在本次页面生命周期内注入一次。
export function modifyBody(body, url) {
  const prompt = getPrompt();
  if (!prompt || typeof body !== 'string') return body;
  if (!TARGET_URL.test(String(url))) return body;

  try {
    const data = JSON.parse(body);
    // 历史消息里已有的注入内容由 history.js 负责剥离，这里只处理发起对话。
    if (Array.isArray(data.messages)) return body;
    if (typeof data.prompt !== 'string') return body;
    if (isInjected(data.prompt)) return body;

    const sessionId = data.chat_session_id;
    const hasSession = sessionId !== undefined && sessionId !== null;
    if (hasSession ? isSessionInjected(sessionId) : isInjectedWithoutSession()) return body;

    data.prompt = buildInjected(prompt, data.prompt);

    if (hasSession) markSessionInjected(sessionId);
    else markInjectedWithoutSession();
    rememberPrompt(prompt);
    log('已注入模板', String(url));
    return JSON.stringify(data);
  } catch (e) {
    log('请求不是可识别的 JSON，跳过', String(url));
  }
  return body;
}
