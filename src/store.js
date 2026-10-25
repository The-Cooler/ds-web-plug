export const log = (...args) => console.info('[DS自定义提示词]', ...args);

// 会话是否已注入过：按 session id 持久化，刷新页面后同一会话仍然不会重复注入。
const INJECTED_KEY = 'ds_custom_prompt_injected_sessions_v1';
const MAX_REMEMBERED = 300;

const readMap = () => {
  try {
    const v = GM_getValue(INJECTED_KEY, {});
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
};

export const isSessionInjected = id => {
  if (id === undefined || id === null) return false;
  return Object.prototype.hasOwnProperty.call(readMap(), String(id));
};

export const markSessionInjected = id => {
  if (id === undefined || id === null) return;
  const map = readMap();
  map[String(id)] = 1;
  const keys = Object.keys(map);
  if (keys.length > MAX_REMEMBERED) {
    for (const k of keys.slice(0, keys.length - MAX_REMEMBERED)) delete map[k];
  }
  try {
    GM_setValue(INJECTED_KEY, map);
  } catch (e) {
    console.error('[DS自定义提示词] 会话标记保存失败', e);
  }
};

export const read = (key, fallback) => {
  try {
    const v = GM_getValue(key, fallback);
    return v === undefined ? fallback : v;
  } catch {
    return fallback;
  }
};

export const write = (key, value) => {
  try {
    GM_setValue(key, value);
  } catch (e) {
    console.error('[DS自定义提示词] 保存失败', e);
  }
};
