import { TARGET_URL } from './constants.js';
import { getPrompt } from './presets.js';
import {
  isInjectedWithoutSession,
  log,
  markInjectedWithoutSession,
  rememberPrompt,
} from './store.js';
import { buildInjected, isInjected } from './promptFormat.js';

// 会话是否已注入，只在本页面生命周期内记录，不落盘：
// 用户删除会话后不会留下任何残留，真正的判断依据是会话历史里有没有注入标记。
// true = 已有注入；false = 拉过历史且确认没有；无记录 = 还没拉过历史。
const sessionState = new Map();

/** 历史接口返回后调用：告诉注入层这条会话是否已经带过注入标记。 */
export function noteSessionHistory(sessionId, hasInjected) {
  if (sessionId === undefined || sessionId === null) return;
  sessionState.set(String(sessionId), hasInjected);
}

// 每条会话只注入一次。DeepSeek 会预创建 session（preCreateSession），
// 首条消息的请求体里通常已经带 chat_session_id，所以按「这条会话是否已带标记」判断，
// 首条消息再用 parent_message_id 为空兜底。
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

    if (hasSession) {
      const state = sessionState.get(String(sessionId));
      const isFirstMessage = data.parent_message_id === null || data.parent_message_id === undefined;
      // 历史里已有注入就不再注入；历史还没拉过时，只有首条消息才注入。
      if (state === true) return body;
      if (state === undefined && !isFirstMessage) return body;
    } else if (isInjectedWithoutSession()) {
      return body;
    }

    data.prompt = buildInjected(prompt, data.prompt);

    if (hasSession) sessionState.set(String(sessionId), true);
    else markInjectedWithoutSession();
    rememberPrompt(prompt);
    log('已注入模板', String(url));
    return JSON.stringify(data);
  } catch (e) {
    log('请求不是可识别的 JSON，跳过', String(url));
  }
  return body;
}
