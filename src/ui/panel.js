/**
 * 提示词面板：原先固定在右下角的浮层，现作为大肥鱼右键菜单的一项弹出。
 * 面板样式与事件逻辑保持原样，开合入口交给菜单。
 */
import { state, save } from '../presets.js';
import { PANEL_STYLE, PANEL_HTML } from './template.js';
import { PET_CONFIG } from '../pet/config.js';
import { isPetEnabled, setPetEnabled } from '../pet/state.js';
import { getPetAnchor, setPetAnchor, persistAnchor } from '../pet/anchor.js';
import { applyI18n, t, getLangSetting, setLangSetting } from '../i18n.js';

let panelRoot = null;
let sectionDragActive = false;

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
  bindButtonDrag(root, toggle);

  // 语言下拉：切换后重填面板所有文案。
  const langSelect = $('__ds_prompt_lang');
  langSelect.value = getLangSetting();
  langSelect.addEventListener('change', e => {
    setLangSetting(e.target.value);
    applyI18n(root);
    const closeBtn = root.querySelector('#__ds_prompt_manager_close');
    if (closeBtn) {
      closeBtn.setAttribute('aria-label', t('action.close'));
      closeBtn.title = t('action.close');
    }
    refreshSelect();
  });

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
    refreshInherits(p);
  }

  /** 继承列表：排除自己，其余模板都可勾选。 */
  function refreshInherits(current) {
    const list = $('__ds_prompt_inherits');
    list.replaceChildren();
    const chosen = new Set(current?.inherits ?? []);
    const others = state.presets.filter(p => p.id !== selectedId);
    if (!others.length) {
      const empty = document.createElement('div');
      empty.className = 'ds-empty';
      empty.textContent = t('status.noInherits');
      list.appendChild(empty);
      return;
    }
    for (const p of others) {
      const row = document.createElement('label');
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.value = p.id;
      box.checked = chosen.has(p.id);
      const text = document.createElement('span');
      text.textContent = p.name || p.id;
      row.append(box, text);
      list.appendChild(row);
    }
  }

  function readInherits() {
    return [...$('__ds_prompt_inherits').querySelectorAll('input:checked')].map(b => b.value);
  }

  const close = document.createElement('button');
  close.type = 'button';
  close.id = '__ds_prompt_manager_close';
  close.className = 'ds-close';
  close.textContent = '✕';
  close.setAttribute('aria-label', t('action.close'));
  close.title = t('action.close');
  close.addEventListener('click', () => {
    section.hidden = true;
  });
  section.querySelector('.ds-header').appendChild(close);

  // 拖动窗口：按住面板内除按钮、输入框、下拉框与文本域以外的任意位置。
  let dragStart = null;
  sectionDragActive = false;
  section.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    if (e.target.closest('button, input, textarea, select, label')) return;
    const rect = section.getBoundingClientRect();
    dragStart = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    sectionDragActive = true;
    section.setPointerCapture(e.pointerId);
    section.style.cursor = 'move';
    e.preventDefault();
  });
  section.addEventListener('pointermove', e => {
    if (!dragStart) return;
    section.style.left = clampLeft(e.clientX - dragStart.dx) + 'px';
    section.style.top = clampTop(e.clientY - dragStart.dy) + 'px';
    section.style.right = 'auto';
    section.style.bottom = 'auto';
  });
  const endDrag = () => {
    dragStart = null;
    section.style.cursor = '';
    // 松手后浏览器补的那次 click 不应触发「点外面关闭」。
    setTimeout(() => {
      sectionDragActive = false;
    }, 0);
  };
  section.addEventListener('pointerup', endDrag);
  section.addEventListener('pointercancel', endDrag);

  // 使用说明折叠。
  $('__ds_prompt_help_toggle').addEventListener('click', () => {
    const help = $('__ds_prompt_help');
    help.dataset.open = help.dataset.open === 'true' ? 'false' : 'true';
  });

  $('__ds_prompt_toggle').addEventListener('click', e => {
    e.stopPropagation();
    if (consumeSuppressedClick()) return;
    section.hidden = !section.hidden;
    if (!section.hidden) {
      syncSwitches();
      refreshSelect();
      placeNearButton(section);
    }
  });

  // 点面板外关闭：用 click 而不是 pointerdown，避免拖动过程中被误关。
  // 判断是否点在面板/按钮内要用事件坐标，而不是 e.target：
  // 按下时面板若调用了 setPointerCapture，click 的 target 会变成面板本身。
  document.addEventListener('click', e => {
    if (section.hidden) return;
    if (sectionDragActive) return;
    const r = section.getBoundingClientRect();
    if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) return;
    const t = panelRoot?.querySelector('#__ds_prompt_toggle');
    if (t && t.offsetParent !== null) {
      const b = t.getBoundingClientRect();
      if (e.clientX >= b.left && e.clientX <= b.right && e.clientY >= b.top && e.clientY <= b.bottom) return;
    }
    section.hidden = true;
  }, true);

  // Esc 关闭。
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !section.hidden) section.hidden = true;
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
    p.inherits = readInherits();
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
    // 删掉的模板要从其他模板的继承列表里摘掉。
    for (const p of state.presets) {
      if (Array.isArray(p.inherits)) p.inherits = p.inherits.filter(id => id !== selectedId);
    }
    if (state.defaultId === selectedId) state.defaultId = state.presets[0]?.id || '';
    selectedId = state.presets[0]?.id || '';
    save();
    refreshSelect();
    status(t('status.deleted'));
  });

  refreshSelect();
  return root;
}

/** 刷新不随模板变化的开关状态。 */
function syncSwitches() {
  const petBox = panelRoot?.querySelector('#__ds_pet_enabled');
  if (petBox) petBox.checked = isPetEnabled();
  const enabledBox = panelRoot?.querySelector('#__ds_prompt_enabled');
  if (enabledBox) enabledBox.checked = state.enabled;
}

/** 在指定位置弹出提示词面板；重复调用只把已有面板挪过去。 */
export function openPromptPanel(x, y) {
  const root = ensurePanel();
  const section = root.querySelector('.ds-prompt-window');
  section.hidden = false;
  syncSwitches();
  const width = section.offsetWidth || 400;
  const height = section.offsetHeight || 400;
  section.style.position = 'fixed';
  section.style.right = 'auto';
  section.style.bottom = 'auto';
  section.style.left = Math.max(8, Math.min(x, window.innerWidth - width - 8)) + 'px';
  section.style.top = Math.max(8, Math.min(y, window.innerHeight - height - 8)) + 'px';
  return root;
}

/** 提示词按钮：位置就是动画锚点，拖动按钮等于移动锚点。 */
export function mountPromptButton() {
  if (!document.body) return;
  const root = ensurePanel();
  const toggle = root.querySelector('#__ds_prompt_toggle');
  if (!toggle) return;
  if (root.parentElement !== document.body) document.body.appendChild(root);
  root.style.position = 'fixed';
  root.style.right = 'auto';
  root.style.bottom = 'auto';
  placeAtAnchor(root);
  toggle.hidden = false;
  root.querySelector('#__ds_pet_enabled').checked = isPetEnabled();
}

/** 按动画当前锚点摆放按钮；动画还没定位时退回配置角落。 */
function placeAtAnchor(root) {
  root.style.left = anchorLeft(anchorX()) + 'px';
  root.style.top = anchorTop(anchorY()) + 'px';
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

/** 拖动按钮：移动超过 4px 才算拖，拖动写入共用锚点并保存。 */
function bindButtonDrag(root, toggle) {
  let start = null;
  let moved = false;
  toggle.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    const rect = root.getBoundingClientRect();
    start = { cx: e.clientX, cy: e.clientY, left: rect.left, top: rect.top };
    moved = false;
    toggle.setPointerCapture(e.pointerId);
  });
  toggle.addEventListener('pointermove', e => {
    if (!start) return;
    const dx = e.clientX - start.cx;
    const dy = e.clientY - start.cy;
    if (!moved && Math.hypot(dx, dy) < 4) return;
    moved = true;
    const left = anchorLeft(start.left + dx);
    const top = anchorTop(start.top + dy);
    root.style.left = left + 'px';
    root.style.top = top + 'px';
  });
  const finish = e => {
    if (!start) return;
    const wasMoved = moved;
    start = null;
    moved = false;
    if (!wasMoved) return;
    e.preventDefault();
    suppressClick = true;
    const rect = root.getBoundingClientRect();
    setPetAnchor(rect.left, rect.top);
    persistAnchor();
  };
  toggle.addEventListener('pointerup', finish);
  toggle.addEventListener('pointercancel', () => {
    start = null;
    moved = false;
  });
}

/** 拖动松手会补一次 click，打开面板前检查这个标记并吞掉。 */
export function consumeSuppressedClick() {
  if (!suppressClick) return false;
  suppressClick = false;
  return true;
}

let suppressClick = false;

/** 把顶部坐标夹进视口，按面板实际高度计算，避免底部越界。 */
function clampTop(y) {
  const h = panelRoot?.querySelector('.ds-prompt-window')?.offsetHeight || 400;
  return Math.max(0, Math.min(y, Math.max(0, window.innerHeight - h)));
}

/** 把水平坐标夹进视口（面板宽度已知时用）。 */
function clampLeft(x) {
  const w = panelRoot?.querySelector('.ds-prompt-window')?.offsetWidth || 400;
  return Math.max(0, Math.min(x, window.innerWidth - w));
}

/** 面板贴按钮展开：按钮上方放得下就往上，否则往下；左右夹进视口。 */
function placeNearButton(section) {
  const toggle = panelRoot?.querySelector('#__ds_prompt_toggle');
  if (!toggle) return;
  const btn = toggle.getBoundingClientRect();
  const w = section.offsetWidth || 400;
  const h = section.offsetHeight || 400;
  section.style.position = 'fixed';
  section.style.right = 'auto';
  section.style.bottom = 'auto';
  section.style.left = Math.max(8, Math.min(btn.left, window.innerWidth - w - 8)) + 'px';
  const above = btn.top - h - 8;
  section.style.top = (above >= 8 ? above : Math.min(btn.bottom + 8, window.innerHeight - h - 8)) + 'px';
}

/** 宠物接管入口时隐藏提示词按钮；已打开的面板保持不动。 */
export function unmountPromptButton() {
  if (!panelRoot) return;
  const toggle = panelRoot.querySelector('#__ds_prompt_toggle');
  if (toggle) toggle.hidden = true;
}
