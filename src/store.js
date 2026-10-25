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

// 旧会话（无 session id）在脚本层面只注入一次；启用注入后清空，新开的会话不受影响。
let injectedWithoutSession = false;

export const isInjectedWithoutSession = () => injectedWithoutSession;

export const markInjectedWithoutSession = () => {
  injectedWithoutSession = true;
};

// 用过的提示词：清历史时用来识别旧格式（无长度）的注入边界。
const USED_KEY = 'ds_custom_prompt_used_prompts_v1';
const MAX_USED = 30;

export const getUsedPrompts = () => {
  try {
    const v = GM_getValue(USED_KEY, []);
    return Array.isArray(v) ? v.filter(x => typeof x === 'string' && x) : [];
  } catch {
    return [];
  }
};

export const rememberPrompt = prompt => {
  if (!prompt) return;
  const list = getUsedPrompts().filter(p => p !== prompt);
  list.push(prompt);
  try {
    GM_setValue(USED_KEY, list.slice(-MAX_USED));
  } catch (e) {
    console.error('[DS自定义提示词] 提示词记录保存失败', e);
  }
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

export const read = (key, fallback) => {  try {
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
