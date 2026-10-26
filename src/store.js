export const log = (...args) => console.info('[DS自定义提示词]', ...args);

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

// 没有 session id 的老请求在本次页面生命周期内只注入一次；
// 有 session id 的请求不再记录，改由会话历史里是否已有注入标记来判断。
let injectedWithoutSession = false;

export const isInjectedWithoutSession = () => injectedWithoutSession;

export const markInjectedWithoutSession = () => {
  injectedWithoutSession = true;
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
