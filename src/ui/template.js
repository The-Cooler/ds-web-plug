// 面板样式：颜色与圆角优先取 DeepSeek 自己的设计变量（随站点浅/深色自动切换），
// 取不到时用与 DS 一致的兜底色。
export const PANEL_STYLE = `
      #__ds_prompt_manager {
        --pn-bg: var(--dsw-alias-bg-layer-2, #ffffff);
        --pn-bg-input: var(--dsw-alias-bg-layer-1, #f9fafb);
        --pn-bg-hover: var(--dsw-alias-button-floating-hover, #f1f3f5);
        --pn-border: var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.1));
        --pn-border-strong: var(--dsw-alias-border-l3, rgba(0, 0, 0, 0.12));
        --pn-text: var(--dsw-alias-label-primary, #0f1115);
        --pn-text-2: var(--dsw-alias-label-secondary, #61666b);
        --pn-text-3: var(--dsw-alias-label-tertiary, #81858c);
        --pn-brand: var(--dsw-alias-brand-primary, #3964fe);
        --pn-brand-soft: var(--dsw-static-deepseek-50, #edf3fe);
        --pn-radius: 14px;
        --pn-radius-sm: 9px;
        --pn-font: var(--dsw-font-family, "Inter", system-ui, -apple-system, "Segoe UI", sans-serif);
        position: fixed;
        z-index: 2147483647;
        color: var(--pn-text);
        font: 14px/1.5 var(--pn-font);
      }
      html.dark #__ds_prompt_manager,
      body.dark #__ds_prompt_manager,
      [data-theme="dark"] #__ds_prompt_manager {
        --pn-bg: var(--dsw-alias-bg-layer-2, #2c2c2e);
        --pn-bg-input: var(--dsw-alias-bg-layer-1, #232324);
        --pn-bg-hover: var(--dsw-alias-button-floating-hover, #353638);
        --pn-border: var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.12));
        --pn-border-strong: var(--dsw-alias-border-l3, rgba(255, 255, 255, 0.16));
        --pn-text: var(--dsw-alias-label-primary, #f9fafb);
        --pn-text-2: var(--dsw-alias-label-secondary, #cfd3d6);
        --pn-text-3: var(--dsw-alias-label-tertiary, #adb2b8);
        --pn-brand: var(--dsw-alias-brand-primary, #5686fe);
        --pn-brand-soft: rgba(86, 134, 254, 0.16);
      }

      /* 入口按钮 */
      #__ds_prompt_manager #__ds_prompt_toggle {
        display: inline-flex; align-items: center; gap: 6px;
        height: 32px; padding: 0 14px;
        border-radius: 999px;
        border: 1px solid var(--pn-border);
        background: var(--pn-bg);
        color: var(--pn-text);
        font: 500 13px/1 var(--pn-font);
        cursor: pointer;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
        transition: background .18s var(--ds-ease-out, ease), border-color .18s var(--ds-ease-out, ease);
      }
      #__ds_prompt_manager #__ds_prompt_toggle[hidden] {
        display: none;
      }
      #__ds_prompt_manager #__ds_prompt_toggle:hover {
        background: var(--pn-bg-hover);
        border-color: var(--pn-border-strong);
      }

      /* 面板 */
      #__ds_prompt_manager .ds-prompt-window {
        position: absolute; right: 0; bottom: 44px;
        width: min(400px, calc(100vw - 32px));
        max-height: 72vh; overflow: auto;
        padding: 18px 18px 16px;
        box-sizing: border-box;
        background: var(--pn-bg);
        color: var(--pn-text);
        border: 1px solid var(--pn-border);
        border-radius: var(--pn-radius);
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
        scrollbar-width: thin;
      }
      #__ds_prompt_manager .ds-header {
        display: flex; align-items: center; justify-content: space-between;
        gap: 12px; margin-bottom: 14px;
        padding-right: 30px;
      }
      #__ds_prompt_manager .ds-title {
        font: 600 15px/1.4 var(--pn-font);
        letter-spacing: .2px;
        user-select: none;
      }
      #__ds_prompt_manager .ds-close {
        position: absolute; top: 10px; right: 10px;
        width: 26px; height: 26px; padding: 0;
        display: flex; align-items: center; justify-content: center;
        border-radius: 8px;
        border: 1px solid transparent;
        background: transparent;
        color: var(--pn-text-3);
        font: 400 16px/1 var(--pn-font);
        cursor: pointer;
      }
      #__ds_prompt_manager .ds-close:hover {
        background: var(--pn-bg-hover);
        color: var(--pn-text);
      }

      /* 表单 */
      #__ds_prompt_manager label {
        display: block;
        margin: 12px 0 6px;
        color: var(--pn-text-2);
        font: 500 12px/1.4 var(--pn-font);
      }
      #__ds_prompt_manager label:has(> input[type="checkbox"]) {
        display: flex; align-items: center; gap: 8px;
        margin: 10px 0;
        color: var(--pn-text-2);
        font-size: 13px;
        cursor: pointer;
      }
      #__ds_prompt_manager input[type="checkbox"] {
        width: 15px; height: 15px;
        margin: 0;
        accent-color: var(--pn-brand);
        cursor: pointer;
      }
      #__ds_prompt_manager input[type="text"],
      #__ds_prompt_manager input:not([type]),
      #__ds_prompt_manager select,
      #__ds_prompt_manager textarea {
        box-sizing: border-box; width: 100%;
        margin: 0;
        border-radius: var(--pn-radius-sm);
        border: 1px solid var(--pn-border);
        background: var(--pn-bg-input);
        color: var(--pn-text);
        font: 13px/1.5 var(--pn-font);
        transition: border-color .18s var(--ds-ease-out, ease), background .18s var(--ds-ease-out, ease);
      }
      #__ds_prompt_manager input[type="text"],
      #__ds_prompt_manager input:not([type]),
      #__ds_prompt_manager select:not([multiple]) {
        height: 36px; padding: 0 12px;
      }
      #__ds_prompt_manager select[multiple] {
        padding: 6px;
        min-height: 92px;
      }
      #__ds_prompt_manager select[multiple] option {
        padding: 5px 8px;
        border-radius: 6px;
      }
      #__ds_prompt_manager .ds-inherits {
        max-height: 120px; overflow: auto;
        padding: 4px;
        border-radius: var(--pn-radius-sm);
        border: 1px solid var(--pn-border);
        background: var(--pn-bg-input);
      }
      #__ds_prompt_manager .ds-inherits label {
        display: flex; align-items: center; gap: 8px;
        margin: 0; padding: 6px 8px;
        border-radius: 6px;
        color: var(--pn-text);
        font: 400 13px/1.4 var(--pn-font);
        cursor: pointer;
      }
      #__ds_prompt_manager .ds-inherits label:hover {
        background: var(--pn-bg-hover);
      }
      #__ds_prompt_manager .ds-inherits .ds-empty {
        padding: 8px;
        color: var(--pn-text-3);
        font-size: 12px;
      }
      #__ds_prompt_manager textarea {
        min-height: 132px;
        padding: 10px 12px;
        resize: vertical;
      }
      #__ds_prompt_manager input:focus,
      #__ds_prompt_manager select:focus,
      #__ds_prompt_manager textarea:focus {
        outline: none;
        border-color: var(--pn-brand);
        background: var(--pn-bg);
      }

      /* 按钮行 */
      #__ds_prompt_manager .ds-actions {
        display: flex; gap: 8px; flex-wrap: wrap;
        margin-top: 16px;
      }
      #__ds_prompt_manager .ds-actions button {
        height: 32px; padding: 0 14px;
        border-radius: var(--pn-radius-sm);
        border: 1px solid var(--pn-border);
        background: var(--pn-bg-input);
        color: var(--pn-text);
        font: 500 13px/1 var(--pn-font);
        cursor: pointer;
        transition: background .18s var(--ds-ease-out, ease), border-color .18s var(--ds-ease-out, ease);
      }
      #__ds_prompt_manager .ds-actions button:hover {
        background: var(--pn-bg-hover);
        border-color: var(--pn-border-strong);
      }
      #__ds_prompt_manager .ds-actions #__ds_prompt_save {
        background: var(--pn-brand);
        border-color: var(--pn-brand);
        color: #fff;
      }
      #__ds_prompt_manager .ds-actions #__ds_prompt_save:hover {
        filter: brightness(1.06);
      }

      /* 状态行 */
      #__ds_prompt_manager .ds-status {
        min-height: 18px;
        margin-top: 12px;
        color: var(--pn-text-3);
        font-size: 12px;
        line-height: 1.5;
      }

      /* 使用说明 */
      #__ds_prompt_manager .ds-help {
        margin-top: 14px;
        padding-top: 12px;
        border-top: 1px solid var(--pn-border);
      }
      #__ds_prompt_manager .ds-help-title {
        display: flex; align-items: center; gap: 6px;
        margin: 0;
        padding: 0;
        border: none;
        background: transparent;
        color: var(--pn-text-3);
        font: 500 12px/1.4 var(--pn-font);
        cursor: pointer;
      }
      #__ds_prompt_manager .ds-help-title:hover {
        color: var(--pn-text-2);
      }
      #__ds_prompt_manager .ds-help-toggle {
        display: inline-block;
        transition: transform .18s var(--ds-ease-out, ease);
      }
      #__ds_prompt_manager .ds-help[data-open="true"] .ds-help-toggle {
        transform: rotate(90deg);
      }
      #__ds_prompt_manager .ds-help ul {
        margin: 8px 0 0;
        padding-left: 18px;
        color: var(--pn-text-3);
        font-size: 12px;
        line-height: 1.8;
      }
      #__ds_prompt_manager .ds-help[data-open="false"] ul {
        display: none;
      }
`;

export const PANEL_HTML = `
      <button type="button" id="__ds_prompt_toggle" data-i18n="toggle"></button>
      <section class="ds-prompt-window" hidden>
        <div class="ds-header">
          <div class="ds-title" data-i18n="title"></div>
        </div>
        <label data-i18n="label.template"></label>
        <select id="__ds_prompt_select"></select>
        <label data-i18n="label.name"></label>
        <input id="__ds_prompt_name" type="text" data-i18n-placeholder="placeholder.name">
        <label data-i18n="label.content"></label>
        <textarea id="__ds_prompt_text" data-i18n-placeholder="placeholder.content"></textarea>
        <label data-i18n="label.inherits"></label>
        <div id="__ds_prompt_inherits" class="ds-inherits"></div>
        <label><input id="__ds_prompt_enabled" type="checkbox"> <span data-i18n="enable.inject"></span></label>
        <label><input id="__ds_pet_enabled" type="checkbox"> <span data-i18n="enable.pet"></span></label>
        <label data-i18n="label.language"></label>
        <select id="__ds_prompt_lang">
          <option value="auto" data-i18n="lang.auto"></option>
          <option value="zh" data-i18n="lang.zh"></option>
          <option value="en" data-i18n="lang.en"></option>
        </select>
        <div class="ds-actions">
          <button type="button" id="__ds_prompt_new" data-i18n="action.new"></button>
          <button type="button" id="__ds_prompt_save" data-i18n="action.save"></button>
          <button type="button" id="__ds_prompt_default" data-i18n="action.default"></button>
          <button type="button" id="__ds_prompt_delete" data-i18n="action.delete"></button>
        </div>
        <div class="ds-status" id="__ds_prompt_status"></div>
        <div class="ds-help" id="__ds_prompt_help" data-open="false">
          <button type="button" class="ds-help-title" id="__ds_prompt_help_toggle">
            <span class="ds-help-toggle">▸</span>
            <span data-i18n="help.title"></span>
          </button>
          <ul>
            <li data-i18n="help.inject"></li>
            <li data-i18n="help.inherit"></li>
            <li data-i18n="help.pet"></li>
            <li data-i18n="help.close"></li>
          </ul>
        </div>
      </section>
`;
