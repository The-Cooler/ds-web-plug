import { MARKER, TARGET_URL } from './constants.js';
import { getPrompt } from './presets.js';
import { log } from './store.js';

export function modifyBody(body, url) {
  const prompt = getPrompt();
  if (!prompt || typeof body !== 'string') return body;
  if (!TARGET_URL.test(String(url))) return body;

  try {
    const data = JSON.parse(body);
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
      log('已修改匹配请求', String(url));
      return JSON.stringify(data);
    }
  } catch (e) {
    log('请求不是可识别的 JSON，跳过', String(url));
  }
  return body;
}
