const ENABLED_KEY = 'ds_pet_enabled_v1';

export const isPetEnabled = () => {
  try {
    return GM_getValue(ENABLED_KEY, true) !== false;
  } catch {
    return true;
  }
};

export const setPetEnabled = enabled => {
  try {
    GM_setValue(ENABLED_KEY, !!enabled);
  } catch (e) {
    console.error('[DS大肥鱼] 开关保存失败', e);
  }
};
