import { modifyBody } from './injector.js';
import { cleanHistoryJson, isHistoryUrl } from './history.js';

// 拦截 fetch、XHR、WebSocket，在请求发出前调用 modifyBody 注入提示词；
// 同时在历史接口的响应里滤掉注入内容，避免刷新后出现在聊天记录里。
export function installInterceptors(W) {
  // Fetch
  const originalFetch = W.fetch;
  if (typeof originalFetch === 'function' && !originalFetch.__dsPromptPatched) {
    const patchedFetch = function (input, init) {
      let url = null;
      try {
        url = typeof input === 'string' ? input : input?.url;
        if (init && typeof init.body === 'string') {
          init = { ...init, body: modifyBody(init.body, url) };
        }
      } catch (e) {
        console.error('[DS自定义提示词] fetch 拦截异常', e);
      }
      const res = originalFetch.call(this, input, init);
      if (!isHistoryUrl(url)) return res;
      return res.then(r => r.text().then(text => new Response(cleanHistoryJson(text), {
        status: r.status,
        statusText: r.statusText,
        headers: r.headers,
      })));
    };
    patchedFetch.__dsPromptPatched = true;
    W.fetch = patchedFetch;
  }

  // XMLHttpRequest
  const XHR = W.XMLHttpRequest;
  if (XHR && !XHR.prototype.__dsPromptPatched) {
    const originalOpen = XHR.prototype.open;
    const originalSend = XHR.prototype.send;

    XHR.prototype.open = function (method, url, ...args) {
      this.__dsPromptUrl = url;
      return originalOpen.call(this, method, url, ...args);
    };

    XHR.prototype.send = function (body) {
      try {
        body = modifyBody(body, this.__dsPromptUrl);
        if (isHistoryUrl(this.__dsPromptUrl) && !this.__dsHistoryPatched) {
          this.__dsHistoryPatched = true;
          this.addEventListener('readystatechange', () => {
            if (this.readyState !== 4 || this.status !== 200) return;
            if (typeof this.responseText !== 'string') return;
            const cleaned = cleanHistoryJson(this.responseText);
            if (cleaned === this.responseText) return;
            Object.defineProperty(this, 'responseText', { value: cleaned, configurable: true });
            if (this.responseType === 'json') {
              try {
                Object.defineProperty(this, 'response', { value: JSON.parse(cleaned), configurable: true });
              } catch {}
            }
          });
        }
      } catch (e) {
        console.error('[DS自定义提示词] XHR 拦截异常', e);
      }
      return originalSend.call(this, body);
    };

    XHR.prototype.__dsPromptPatched = true;
  }

  // WebSocket：仅处理可解析的 JSON 文本帧。
  const OriginalWS = W.WebSocket;
  if (OriginalWS && !OriginalWS.__dsPromptPatched) {
    const PatchedWS = new Proxy(OriginalWS, {
      construct(Target, args) {
        const ws = Reflect.construct(Target, args, Target);
        const originalSend = ws.send;
        ws.send = function (data) {
          try {
            if (typeof data === 'string') {
              data = modifyBody(data, args[0]);
            }
          } catch (e) {
            console.error('[DS自定义提示词] WebSocket 拦截异常', e);
          }
          return originalSend.call(this, data);
        };
        return ws;
      }
    });
    PatchedWS.__dsPromptPatched = true;
    W.WebSocket = PatchedWS;
  }
}
