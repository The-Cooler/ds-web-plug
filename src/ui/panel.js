/**
 * 提示词面板：原先固定在右下角的浮层，现作为大肥鱼右键菜单的一项弹出。
 * 面板样式与事件逻辑保持原样，开合入口交给菜单。
 */
import { state, save } from '../presets.js';
import { PANEL_STYLE, PANEL_HTML } from './template.js';
import { PET_CONFIG } from '../pet/config.js';
import { isPetEnabled, setPetEnabled } from '../pet/state.js';
import { getPetAnchor } from '../pet/anchor.js';
import { applyI18n, t } from '../i18n.js';

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
  applyI18n(root);

  const $ = id => root.querySelector('#' + id);
  const section = root.querySelector('.ds-prompt-window');
  section.hidden = true;
  const toggle = $('__ds_prompt_toggle');
  toggle.hidden = true;

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
    $('__ds_pet_enabled').checked = isPetEnabled();
  }

  const close = document.createElement('button');
  close.type = 'button';
  close.id = '__ds_prompt_manager_close';
  close.textContent = t('action.close');
  close.style.marginBottom = '10px';
  close.addEventListener('click', () => {
    section.hidden = true;
  });
  section.prepend(close);

  // 拖动窗口：按住面板内除按钮、输入框、下拉框与文本域以外的任意位置。
  let dragStart = null;
  section.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    if (e.target.closest('button, input, textarea, select, label')) return;
    const rect = section.getBoundingClientRect();
    dragStart = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    section.setPointerCapture(e.pointerId);
    section.style.cursor = 'move';
    e.preventDefault();
  });
  section.addEventListener('pointermove', e => {
    if (!dragStart) return;
    const left = Math.max(0, Math.min(e.clientX - dragStart.dx, window.innerWidth - section.offsetWidth));
    const top = Math.max(0, Math.min(e.clientY - dragStart.dy, window.innerHeight - section.offsetHeight));
    section.style.left = left + 'px';
    section.style.top = top + 'px';
    section.style.right = 'auto';
    section.style.bottom = 'auto';
  });
  const endDrag = () => {
    dragStart = null;
    section.style.cursor = '';
  };
  section.addEventListener('pointerup', endDrag);
  section.addEventListener('pointercancel', endDrag);

  $('__ds_prompt_toggle').addEventListener('click', () => {
    section.hidden = !section.hidden;
    if (!section.hidden) refreshSelect();
  });

  $('__ds_pet_enabled').addEventListener('change', e => {
    const on = e.target.checked;
    setPetEnabled(on);
    window.dispatchEvent(new CustomEvent('ds-pet-toggle'));
    status(t(on ? 'status.petOn' : 'status.petOff'));
  });

  $('__ds_prompt_select').addEventListener('change', e => {
    selectedId = e.target.value;
    loadSelected();
  });

  $('__ds_prompt_enabled').addEventListener('change', e => {
    state.enabled = e.target.checked;
    save();
    status(t(state.enabled ? 'status.injectOn' : 'status.injectOff'));
  });

  $('__ds_prompt_new').addEventListener('click', () => {
    selectedId = 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    state.presets.push({ id: selectedId, name: t('status.newTemplate'), prompt: '' });
    refreshSelect();
    $('__ds_prompt_name').focus();
    status(t('status.editThenSave'));
  });

  $('__ds_prompt_save').addEventListener('click', () => {
    const p = state.presets.find(p => p.id === selectedId);
    if (!p) return status(t('status.needNew'));
    p.name = $('__ds_prompt_name').value.trim() || t('status.untitled');
    p.prompt = $('__ds_prompt_text').value;
    state.enabled = $('__ds_prompt_enabled').checked;
    save();
    refreshSelect();
    status(t('status.saved'));
  });

  $('__ds_prompt_default').addEventListener('click', () => {
    if (!state.presets.some(p => p.id === selectedId)) return status(t('status.needSelect'));
    state.defaultId = selectedId;
    save();
    status(t('status.defaultSet') + (state.presets.find(p => p.id === state.defaultId)?.name || ''));
  });

  $('__ds_prompt_delete').addEventListener('click', () => {
    if (!state.presets.some(p => p.id === selectedId)) return status(t('status.nothingToDelete'));
    if (!confirm(t('status.confirmDelete'))) return;
    state.presets = state.presets.filter(p => p.id !== selectedId);
    if (state.defaultId === selectedId) state.defaultId = state.presets[0]?.id || '';
    selectedId = state.presets[0]?.id || '';
    save();
    refreshSelect();
    status(t('status.deleted'));
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

/** 提示词按钮：位置与动画共用同一份锚点，动画被拖到哪按钮就跟到哪。 */
export function mountPromptButton() {
  if (!document.body) return;
  const root = ensurePanel();
  const toggle = root.querySelector('#__ds_prompt_toggle');
  if (!toggle) return;
  if (root.parentElement !== document.body) document.body.appendChild(root);
  root.style.position = 'fixed';
  root.style.right = 'auto';
  root.style.bottom = 'auto';
  root.style.left = anchorLeft(anchorX()) + 'px';
  root.style.top = anchorTop(anchorY()) + 'px';
  toggle.hidden = false;
  root.querySelector('#__ds_pet_enabled').checked = isPetEnabled();
}

// 按钮落在动画的右上角内侧；动画还没定位时用配置角落。
function anchorX() {
  const a = getPetAnchor();
  return a ? a.x : window.innerWidth - PET_CONFIG.size;
}

function anchorY() {
  const a = getPetAnchor();
  return a ? a.y : PET_CONFIG.position.marginY;
}

function anchorLeft(x) {
  return Math.max(0, Math.min(x, window.innerWidth - 80));
}

function anchorTop(y) {
  return Math.max(0, Math.min(y, window.innerHeight - 40));
}

/** 宠物接管入口时隐藏提示词按钮；已打开的面板保持不动。 */
export function unmountPromptButton() {
  if (!panelRoot) return;
  const toggle = panelRoot.querySelector('#__ds_prompt_toggle');
  if (toggle) toggle.hidden = true;
}
