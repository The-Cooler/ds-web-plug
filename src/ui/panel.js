/**
 * 提示词面板：原先固定在右下角的浮层，现作为大肥鱼右键菜单的一项弹出。
 * 面板样式与事件逻辑保持原样，开合入口交给菜单。
 */
import { state, save } from '../presets.js';
import { PANEL_STYLE, PANEL_HTML } from './template.js';

let panelRoot = null;

function ensurePanel() {
  if (panelRoot) return panelRoot;

  const style = document.createElement('style');
  style.textContent = PANEL_STYLE;
  document.documentElement.appendChild(style);

  const root = document.createElement('div');
  root.id = '__ds_prompt_manager';
  root.innerHTML = PANEL_HTML;
  document.body.appendChild(root);
  panelRoot = root;

  const $ = id => root.querySelector('#' + id);
  const section = root.querySelector('.ds-prompt-window');
  section.hidden = false;
  $('__ds_prompt_toggle')?.remove();

  let selectedId = state.presets[0]?.id || '';

  function status(text) {
    $('__ds_prompt_status').textContent = text;
  }

  function refreshSelect() {
    const select = $('__ds_prompt_select');
    select.replaceChildren();
    state.presets.forEach(p => {
      const option = document.createElement('option');
      option.value = p.id;
      option.textContent = p.name;
      select.appendChild(option);
    });
    if (state.presets.some(p => p.id === selectedId)) select.value = selectedId;
    loadSelected();
  }

  function loadSelected() {
    const p = state.presets.find(p => p.id === selectedId);
    $('__ds_prompt_name').value = p?.name || '';
    $('__ds_prompt_text').value = p?.prompt || '';
    $('__ds_prompt_enabled').checked = state.enabled;
  }

  const close = document.createElement('button');
  close.type = 'button';
  close.id = '__ds_prompt_manager_close';
  close.textContent = '关闭';
  close.style.marginBottom = '10px';
  close.addEventListener('click', () => {
    section.hidden = true;
  });
  section.prepend(close);

  // 拖拽标题移动窗口。
  const title = root.querySelector('.ds-title');
  title.style.cursor = 'move';
  title.style.userSelect = 'none';
  let dragStart = null;
  title.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    const rect = section.getBoundingClientRect();
    dragStart = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    title.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  title.addEventListener('pointermove', e => {
    if (!dragStart) return;
    const left = Math.max(0, Math.min(e.clientX - dragStart.dx, window.innerWidth - section.offsetWidth));
    const top = Math.max(0, Math.min(e.clientY - dragStart.dy, window.innerHeight - section.offsetHeight));
    section.style.left = left + 'px';
    section.style.top = top + 'px';
    section.style.right = 'auto';
    section.style.bottom = 'auto';
  });
  title.addEventListener('pointerup', () => {
    dragStart = null;
  });
  title.addEventListener('pointercancel', () => {
    dragStart = null;
  });

  $('__ds_prompt_toggle').addEventListener('click', () => {
    section.hidden = !section.hidden;
    if (!section.hidden) refreshSelect();
  });

  $('__ds_prompt_select').addEventListener('change', e => {
    selectedId = e.target.value;
    loadSelected();
  });

  $('__ds_prompt_enabled').addEventListener('change', e => {
    state.enabled = e.target.checked;
    save();
    status(state.enabled ? '后台注入已启用' : '后台注入已关闭');
  });

  $('__ds_prompt_new').addEventListener('click', () => {
    selectedId = 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    state.presets.push({ id: selectedId, name: '新模板', prompt: '' });
    refreshSelect();
    $('__ds_prompt_name').focus();
    status('编辑内容后点击“保存模板”');
  });

  $('__ds_prompt_save').addEventListener('click', () => {
    const p = state.presets.find(p => p.id === selectedId);
    if (!p) return status('请先新建模板');
    p.name = $('__ds_prompt_name').value.trim() || '未命名模板';
    p.prompt = $('__ds_prompt_text').value;
    state.enabled = $('__ds_prompt_enabled').checked;
    save();
    refreshSelect();
    status('已保存');
  });

  $('__ds_prompt_default').addEventListener('click', () => {
    if (!state.presets.some(p => p.id === selectedId)) return status('请先选择模板');
    state.defaultId = selectedId;
    save();
    status('默认模板已设置：' + (state.presets.find(p => p.id === state.defaultId)?.name || ''));
  });

  $('__ds_prompt_delete').addEventListener('click', () => {
    if (!state.presets.some(p => p.id === selectedId)) return status('没有可删除的模板');
    if (!confirm('确定删除当前模板？')) return;
    state.presets = state.presets.filter(p => p.id !== selectedId);
    if (state.defaultId === selectedId) state.defaultId = state.presets[0]?.id || '';
    selectedId = state.presets[0]?.id || '';
    save();
    refreshSelect();
    status('已删除');
  });

  refreshSelect();
  return root;
}

/** 在指定位置弹出提示词面板；重复调用只把已有面板挪过去。 */
export function openPromptPanel(x, y) {
  const root = ensurePanel();
  const section = root.querySelector('.ds-prompt-window');
  section.hidden = false;
  const width = section.offsetWidth || 420;
  section.style.position = 'fixed';
  section.style.right = 'auto';
  section.style.bottom = 'auto';
  section.style.left = Math.max(8, Math.min(x, window.innerWidth - width - 8)) + 'px';
  section.style.top = Math.max(8, Math.min(y, window.innerHeight - 80)) + 'px';
  return root;
}

/** 提示词按钮：宠物关闭时作为入口挂在页面右下角。 */
export function mountPromptButton() {
  if (!document.body) return;
  const root = ensurePanel();
  const toggle = root.querySelector('#__ds_prompt_toggle');
  if (!toggle) return;
  if (root.parentElement !== document.body) document.body.appendChild(root);
  root.style.position = 'fixed';
  root.style.right = '24px';
  root.style.bottom = '100px';
  root.style.left = 'auto';
  root.style.top = 'auto';
  toggle.hidden = false;
}

/** 宠物接管入口时，按钮由大肥鱼右键菜单替代。 */
export function unmountPromptButton() {
  if (!panelRoot) return;
  const toggle = panelRoot.querySelector('#__ds_prompt_toggle');
  if (toggle) toggle.hidden = true;
  panelRoot.style.position = '';
  panelRoot.style.right = '';
  panelRoot.style.bottom = '';
  panelRoot.querySelector('.ds-prompt-window').hidden = true;
}
