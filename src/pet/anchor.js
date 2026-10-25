/**
 * 动画与提示词按钮共用的位置。
 * 动画每次改变落点（拖动、抛掷、走位、缩放）时写入，按钮按这份坐标放置，
 * 从而两者始终处在同一个位置。刷新后从 GM 存储里读回落点。
 */
const POSITION_KEY = 'ds_pet_position_v1';

let anchor = null;
let loaded = false;

function load() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = GM_getValue(POSITION_KEY, null);
    if (raw && typeof raw === 'object') anchor = { rx: raw.rx, ry: raw.ry };
  } catch {}
}

/** 记录动画包围盒左上角（px，同时存归一化坐标，视口变化时按比例还原）。 */
export function setPetAnchor(x, y) {
  anchor = {
    x,
    y,
    rx: x / window.innerWidth,
    ry: y / window.innerHeight,
  };
}

/** 读取动画当前包围盒左上角；没有位置记录时返回 null。 */
export function getPetAnchor() {
  load();
  if (!anchor) return null;
  // 优先按归一化坐标还原，窗口尺寸变了也能对上。
  return { x: anchor.rx * window.innerWidth, y: anchor.ry * window.innerHeight };
}
