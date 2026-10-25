// 素材地址：Gitee 优先，失败回落 GitHub raw。
// Gitee raw 不返回 Access-Control-Allow-Origin，故用 GM_xmlhttpRequest 绕开跨域。
const BASES = [
  'https://gitee.com/Ljunyang114/ds-web-plug/raw/main/assets/pet/webm/',
  'https://raw.githubusercontent.com/The-Cooler/ds-web-plug/main/assets/pet/webm/',
];

const cache = new Map();

function gmFetch(url) {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: 'GET',
      url,
      responseType: 'blob',
      timeout: 20000,
      onload: res => {
        if (res.status >= 200 && res.status < 300) resolve(res.response);
        else reject(new Error('HTTP ' + res.status));
      },
      onerror: () => reject(new Error('网络错误')),
      ontimeout: () => reject(new Error('超时')),
    });
  });
}

export async function loadAnimation(name) {
  const hit = cache.get(name);
  if (hit) return hit;
  let lastError = null;
  for (const base of BASES) {
    const url = base + encodeURIComponent(name) + '.webm';
    try {
      const blob = await gmFetch(url);
      const objectUrl = URL.createObjectURL(blob);
      cache.set(name, objectUrl);
      return objectUrl;
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError ?? new Error('素材加载失败：' + name);
}
