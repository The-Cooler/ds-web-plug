/**
 * 数据清理。脚本改动过存储结构时，把过期数据在这里删掉。
 * 每次启动执行一次；清理函数必须幂等，重复运行无副作用。
 */

/** 已废弃：早期按 session_id 保存「已注入」标记，用户删除会话后不会回收，会无限增长。 */
const LEGACY_INJECTED_SESSIONS = 'ds_custom_prompt_injected_sessions_v1';

/** 已废弃：按钮曾单独保存拖动位置，后来按钮统一跟随动画锚点。 */
const LEGACY_BUTTON_POS = 'ds_prompt_button_pos_v1';

const cleaners = [
  {
    name: '旧版会话注入标记',
    key: LEGACY_INJECTED_SESSIONS,
    run: () => {
      try {
        const existing = GM_getValue(LEGACY_INJECTED_SESSIONS, undefined);
        if (existing === undefined) return;
        GM_deleteValue(LEGACY_INJECTED_SESSIONS);
        console.info('[DS自定义提示词] 已清理旧版会话注入标记');
      } catch (e) {
        console.error('[DS自定义提示词] 清理旧版会话注入标记失败', e);
      }
    },
  },
  {
    name: '旧版按钮坐标',
    key: LEGACY_BUTTON_POS,
    run: () => {
      try {
        const existing = GM_getValue(LEGACY_BUTTON_POS, undefined);
        if (existing === undefined) return;
        GM_deleteValue(LEGACY_BUTTON_POS);
        console.info('[DS自定义提示词] 已清理旧版按钮坐标');
      } catch (e) {
        console.error('[DS自定义提示词] 清理旧版按钮坐标失败', e);
      }
    },
  },
];

/** 运行所有清理项。 */
export function runCleanup() {
  for (const c of cleaners) c.run();
}
