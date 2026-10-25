export const log = (...args) => console.info('[DS自定义提示词]', ...args);

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
