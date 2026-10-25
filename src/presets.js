import { KEY, ENABLE_KEY, DEFAULT_KEY, DEFAULT_PRESETS } from './constants.js';
import { read, write } from './store.js';

export const state = {
  presets: read(KEY, DEFAULT_PRESETS),
  enabled: read(ENABLE_KEY, true),
  defaultId: '',
};

if (!Array.isArray(state.presets)) state.presets = [];
state.defaultId = read(DEFAULT_KEY, state.presets[0]?.id || '');

export const getPrompt = () => {
  if (!state.enabled) return '';
  return state.presets.find(p => p.id === state.defaultId)?.prompt?.trim() || '';
};

export const save = () => {
  write(KEY, state.presets);
  write(ENABLE_KEY, state.enabled);
  write(DEFAULT_KEY, state.defaultId);
};
