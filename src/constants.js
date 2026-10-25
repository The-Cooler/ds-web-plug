export const KEY = 'ds_custom_prompt_presets_v2';
export const ENABLE_KEY = 'ds_custom_prompt_enabled_v2';
export const DEFAULT_KEY = 'ds_custom_prompt_default_v2';

export const MARKER = '[DS_CUSTOM_SYSTEM_PROMPT]';

export const DEFAULT_PRESETS = [
  { id: 'default', name: '默认模板', prompt: '请准确理解用户的要求，直接回答问题。' },
];

// 请求层注入：仅处理发起对话的接口，未识别的请求结构保持原样。
// 线上代码中 /api/v0/chat/edit_message 也带 prompt 字段，注入会污染被编辑的用户消息，故排除。
export const TARGET_URL = /\/api\/v0\/chat\/completion(?:[?"#]|$)|\/chat\/completions|\/v1\/chat\/completions/i;
