import { state, save } from '../presets.js';
import { PANEL_STYLE, PANEL_HTML } from './template.js';

export function createUI() {
  if (!document.body || document.getElementById('__ds_prompt_manager')) return;

  const style = document.createElement('style');
  style.textContent = PANEL_STYLE;
  document.documentElement.appendChild(style);

  const root = document.createElement('div');
  root.id = '__ds_prompt_manager';
  root.innerHTML = PANEL_HTML;
  document.body.appendChild(root);

  const $ = id => root.querySelector('#' + id);
  const panel = root.querySelector('.ds-prompt-window');
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

  $('__ds_prompt_toggle').addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) refreshSelect();
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
}
