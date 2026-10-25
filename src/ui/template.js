export const PANEL_STYLE = `
      #__ds_prompt_manager {
        position:fixed; right:24px; bottom:100px; z-index:2147483647;
        color:var(--ds-text-primary, CanvasText);
        font:14px/1.5 system-ui,sans-serif;
      }
      #__ds_prompt_manager button {
        color:inherit; font:inherit; cursor:pointer;
        border:1px solid var(--ds-border-color, color-mix(in srgb, CanvasText 20%, transparent));
        background:var(--ds-button-background, Canvas);
        border-radius:9px; padding:7px 12px;
      }
      #__ds_prompt_manager .ds-prompt-window {
        position:absolute; right:0; bottom:44px;
        width:min(420px, calc(100vw - 32px)); max-height:70vh; overflow:auto;
        padding:16px; box-sizing:border-box;
        background:var(--ds-card-background, Canvas);
        color:var(--ds-text-primary, CanvasText);
        border:1px solid var(--ds-border-color, color-mix(in srgb, CanvasText 20%, transparent));
        border-radius:14px; box-shadow:0 8px 32px #0002;
      }
      #__ds_prompt_manager input, #__ds_prompt_manager textarea,
      #__ds_prompt_manager select {
        box-sizing:border-box; width:100%; padding:8px;
        margin:5px 0 10px; border-radius:8px;
        color:inherit; background:var(--ds-input-background, Canvas);
        border:1px solid var(--ds-border-color, color-mix(in srgb, CanvasText 20%, transparent));
        font:inherit;
      }
      #__ds_prompt_manager textarea { min-height:150px; resize:vertical; }
      #__ds_prompt_manager .ds-actions { display:flex; gap:8px; flex-wrap:wrap; }
      #__ds_prompt_manager .ds-title { font-weight:650; margin-bottom:12px; }
      #__ds_prompt_manager .ds-status { opacity:.7; font-size:12px; margin-top:8px; }
`;

export const PANEL_HTML = `
      <button type="button" id="__ds_prompt_toggle" data-i18n="toggle"></button>
      <section class="ds-prompt-window" hidden>
        <div class="ds-title" data-i18n="title"></div>
        <label data-i18n="label.template"></label>
        <select id="__ds_prompt_select"></select>
        <label data-i18n="label.name"></label>
        <input id="__ds_prompt_name" data-i18n-placeholder="placeholder.name">
        <label data-i18n="label.content"></label>
        <textarea id="__ds_prompt_text" data-i18n-placeholder="placeholder.content"></textarea>
        <label><input id="__ds_prompt_enabled" type="checkbox" style="width:auto"> <span data-i18n="enable.inject"></span></label>
        <label><input id="__ds_pet_enabled" type="checkbox" style="width:auto"> <span data-i18n="enable.pet"></span></label>
        <div class="ds-actions">
          <button type="button" id="__ds_prompt_new" data-i18n="action.new"></button>
          <button type="button" id="__ds_prompt_save" data-i18n="action.save"></button>
          <button type="button" id="__ds_prompt_default" data-i18n="action.default"></button>
          <button type="button" id="__ds_prompt_delete" data-i18n="action.delete"></button>
        </div>
        <div class="ds-status" id="__ds_prompt_status"></div>
      </section>
`;
