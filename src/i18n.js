/**
 * 轻量 i18n：按浏览器语言选择词典，缺词回落中文。
 * 面板与右键菜单的文案都走这里，未翻译的键直接返回键名，便于发现遗漏。
 */
const zh = {
  'toggle': '提示词',
  'title': '自定义系统提示词',
  'label.template': '模板',
  'label.name': '模板名称',
  'label.content': '提示词内容',
  'label.inherits': '继承模板（可多选）',
  'placeholder.name': '例如：论文润色',
  'placeholder.content': '输入希望模型遵循的指令',
  'enable.inject': '启用后台注入',
  'enable.pet': '显示大肥鱼动画',
  'action.new': '新建',
  'action.save': '保存模板',
  'action.default': '设为默认',
  'action.delete': '删除',
  'action.close': '关闭',
  'action.pin': '固定窗口',
  'action.unpin': '取消固定',
  'menu.title': '大肥鱼',
  'menu.prompt': '提示词',
  'menu.hide': '关闭动画',
  'menu.home': '回到初始位置',
  'status.injectOn': '后台注入已启用',
  'status.injectOff': '后台注入已关闭',
  'status.petOn': '大肥鱼动画已开启',
  'status.petOff': '大肥鱼动画已关闭',
  'status.editThenSave': '编辑内容后点击“保存模板”',
  'status.needNew': '请先新建模板',
  'status.newTemplate': '新模板',
  'status.untitled': '未命名模板',
  'status.saved': '已保存',
  'status.needSelect': '请先选择模板',
  'status.defaultSet': '默认模板已设置：',
  'status.nothingToDelete': '没有可删除的模板',
  'status.confirmDelete': '确定删除当前模板？',
  'status.deleted': '已删除',
  'status.noInherits': '没有其他模板可继承',
  'help.title': '使用说明',
  'help.inject': '开启「启用后台注入」后，新会话的第一条消息会带上当前默认模板；同一会话后续消息不再重复注入。',
  'help.inherit': '「继承模板」可多选：被选模板的正文会按顺序拼在本模板正文之前；删除模板时会自动从其他模板的继承列表移除。',
  'help.pet': '取消「显示大肥鱼动画」会移除桌宠；之后想找回，双击提示词按钮即可。',
  'help.close': '点面板外任意位置、按 Esc，或再次点击提示词按钮都可以关闭面板。',
  'label.language': '界面语言',
  'lang.auto': '跟随浏览器',
  'lang.zh': '中文',
  'lang.en': 'English',
};

const en = {
  'toggle': 'Prompts',
  'title': 'Custom System Prompt',
  'label.template': 'Template',
  'label.name': 'Template name',
  'label.content': 'Prompt',
  'label.inherits': 'Inherit templates (multi-select)',
  'placeholder.name': 'e.g. Paper polishing',
  'placeholder.content': 'Instructions the model should follow',
  'enable.inject': 'Enable background injection',
  'enable.pet': 'Show pet animation',
  'action.new': 'New',
  'action.save': 'Save',
  'action.default': 'Set default',
  'action.delete': 'Delete',
  'action.close': 'Close',
  'action.pin': 'Pin window',
  'action.unpin': 'Unpin window',
  'menu.title': 'Pet',
  'menu.prompt': 'Prompts',
  'menu.hide': 'Hide animation',
  'menu.home': 'Reset position',
  'status.injectOn': 'Background injection enabled',
  'status.injectOff': 'Background injection disabled',
  'status.petOn': 'Pet animation enabled',
  'status.petOff': 'Pet animation disabled',
  'status.editThenSave': 'Edit the content, then click Save',
  'status.needNew': 'Create a template first',
  'status.newTemplate': 'New template',
  'status.untitled': 'Untitled template',
  'status.saved': 'Saved',
  'status.needSelect': 'Select a template first',
  'status.defaultSet': 'Default template set: ',
  'status.nothingToDelete': 'No template to delete',
  'status.confirmDelete': 'Delete the current template?',
  'status.deleted': 'Deleted',
  'status.noInherits': 'No other templates to inherit',
  'help.title': 'How it works',
  'help.inject': 'With background injection on, the first message of each new session carries the default template; later messages in the same session are left untouched.',
  'help.inherit': 'Inherit templates (multi-select): their text is prepended in order to this template; deleting a template removes it from every inheritance list.',
  'help.pet': 'Unchecking "Show pet animation" removes the pet; double-click the prompt button to bring it back.',
  'help.close': 'Click outside, press Esc, or click the prompt button again to close.',
  'label.language': 'Language',
  'lang.auto': 'Follow browser',
  'lang.zh': '中文',
  'lang.en': 'English',
};

const LANG_KEY = 'ds_prompt_lang_v1';

/** 当前语言：auto（跟随浏览器）/ zh / en。 */
export function getLangSetting() {
  try {
    const v = GM_getValue(LANG_KEY, 'auto');
    return v === 'zh' || v === 'en' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

export function setLangSetting(lang) {
  try {
    GM_setValue(LANG_KEY, lang === 'zh' || lang === 'en' ? lang : 'auto');
  } catch (e) {
    console.error('[DS自定义提示词] 语言设置保存失败', e);
  }
}

const browserIsZh = () => (navigator.language || '').toLowerCase().startsWith('zh');

const currentDict = () => {
  const setting = getLangSetting();
  const useZh = setting === 'zh' || (setting === 'auto' && browserIsZh());
  return useZh ? zh : en;
};

export const t = key => {
  const dict = currentDict();
  return dict[key] ?? zh[key] ?? key;
};

/** 把带 data-i18n / data-i18n-placeholder 的节点按当前语言填充。 */
export function applyI18n(root) {
  if (!root) return;
  for (const el of root.querySelectorAll('[data-i18n]')) {
    el.textContent = t(el.dataset.i18n);
  }
  for (const el of root.querySelectorAll('[data-i18n-placeholder]')) {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  }
}
