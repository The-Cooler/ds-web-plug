import { MARKER, TARGET_URL } from './constants.js';
import { getPrompt } from './presets.js';
import { isSessionInjected, log, markSessionInjected } from './store.js';

// 每条会话只注入一次，同一会话里后续每条消息都不再注入。
// DeepSeek 会预创建 session（preCreateSession），首条消息的请求体里通常已经带
// chat_session_id，所以按「这个 id 是否处理过」判断，而不是看请求体有没有这个字段。
// 标记持久化在 GM 存储里，刷新页面后同一会话依然不会重复注入。
export function modifyBody(body, url) {
  const prompt = getPrompt();
  if (!prompt || typeof body !== 'string') return body;
  if (!TARGET_URL.test(String(url))) return body;

  try {
    const data = JSON.parse(body);
    const sessionId = data.chat_session_id;
    if (isSessionInjected(sessionId)) return body;
    let changed = false;

    if (Array.isArray(data.messages)) {
      const existing = data.messages.find(
        m => m && m.role === 'system' && typeof m.content === 'string' &&
          m.content.includes(MARKER)
      );
      if (!existing) {
        const system = data.messages.find(m => m && m.role === 'system');
        if (system && typeof system.content === 'string') {
          if (!system.content.includes(prompt)) {
            system.content = `${MARKER}\n${prompt}\n\n${system.content}`;
            changed = true;
          }
        } else {
          data.messages.unshift({
            role: 'system',
            content: `${MARKER}\n${prompt}`
          });
          changed = true;
        }
      }
    } else if (typeof data.prompt === 'string') {
      if (!data.prompt.includes(MARKER)) {
        data.prompt = `${MARKER}\n${prompt}\n\n${data.prompt}`;
        changed = true;
      }
    } else {
      return body;
    }

    if (changed) {
      markSessionInjected(sessionId);
      log('已修改匹配请求', String(url));
      return JSON.stringify(data);
    }
  } catch (e) {
    log('请求不是可识别的 JSON，跳过', String(url));
  }
  return body;
}
