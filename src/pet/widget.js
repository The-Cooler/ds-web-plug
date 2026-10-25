/**
 * 宠物挂件：材质、物理参数与动作池取自 dsh-pet（MIT, Copyright (c) 2026 PC2005-cloud）。
 * 浏览器端实现为原生 DOM 版本，不依赖 DSH 运行时。
 */
import { PET_CONFIG, PET_GEOMETRY } from './config.js';
import { loadAnimation } from './assets.js';
import { pick, pickCategoryAction, rollKind } from './pickers.js';
import { planMove } from './motion.js';
import {
  DEFAULT_PHYSICS,
  SQ_DURATION_MS,
  SQ_SQUASH,
  estimateReleaseVelocity,
  landingSquash,
  slingshotPower,
  slingshotVelocity,
  pullAngle,
  springStep,
  squashScale,
  throwBounds,
  throwStep,
  throwSubsteps,
  trimTrail,
} from './physics.js';
import { log } from '../store.js';
import { openPromptPanel } from '../ui/panel.js';
import { setPetEnabled } from './state.js';

const { HIT_BOX, CANVAS_H, FEET_Y, DRAG_THRESHOLD, SLINGSHOT_DOUBLE_MS } = PET_GEOMETRY;
const POSITION_KEY = 'ds_pet_position_v1';

const CSS = `
#__ds_pet_root{position:fixed;z-index:2147483646;pointer-events:none;user-select:none}
#__ds_pet_stage{position:relative;width:var(--ds-pet-size,462px);height:calc(var(--ds-pet-size,462px)*9/16);pointer-events:none}
#__ds_pet_root .ds-pet-video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;pointer-events:none;opacity:0;transition:opacity .18s ease;transform-origin:center}
#__ds_pet_root .ds-pet-video.is-front{opacity:1}
#__ds_pet_root .ds-pet-hit{position:absolute;pointer-events:auto;cursor:grab;z-index:1;touch-action:none;-webkit-user-select:none;-webkit-touch-callout:none}
#__ds_pet_root .ds-pet-hit.dragging{cursor:grabbing}
#__ds_pet_menu{position:fixed;z-index:2147483647;max-height:70vh;overflow:auto;padding:6px;border-radius:10px;
  background:var(--ds-card-background,Canvas);color:var(--ds-text-primary,CanvasText);border:1px solid var(--ds-border-color,#8884);
  box-shadow:0 8px 24px #0003;font:13px/1.6 system-ui,sans-serif;min-width:130px}
#__ds_pet_menu .pet-menu-item{padding:4px 10px;border-radius:6px;cursor:pointer;white-space:nowrap}
#__ds_pet_menu .pet-menu-item:hover{background:color-mix(in srgb,CanvasText 10%,transparent)}
#__ds_pet_menu .pet-menu-title{padding:4px 10px;opacity:.6;font-size:12px}
#__ds_pet_menu .pet-menu-group{padding:4px 10px;border-radius:6px;cursor:pointer;display:flex;justify-content:space-between}
#__ds_pet_menu .pet-menu-group:hover{background:color-mix(in srgb,CanvasText 10%,transparent)}
@media (prefers-reduced-motion: reduce){#__ds_pet_root .ds-pet-video{transition:none}}
`;

function readPosition() {
  try {
    const raw = GM_getValue(POSITION_KEY, null);
    return raw && typeof raw === 'object' ? raw : null;
  } catch {
    return null;
  }
}

function writePosition(pos) {
  try {
    GM_setValue(POSITION_KEY, pos);
  } catch (e) {
    console.error('[DS大肥鱼] 位置保存失败', e);
  }
}

/** 从 DOM 上摘掉宠物：停播视频、清掉菜单，事件与样式保留，
 *  重新 mountPet 时沿用同一套播放入口。 */
export function unmountPet() {
  const root = document.getElementById('__ds_pet_root');
  if (!root) return;
  for (const v of root.querySelectorAll('video')) {
    v.pause();
    v.onended = null;
    v.removeAttribute('src');
    v.load();
  }
  document.getElementById('__ds_pet_menu')?.remove();
  root.remove();
}

export function mountPet() {
  if (document.getElementById('__ds_pet_root')) return;

  const size = PET_CONFIG.size;
  const halfW = size / 2;
  const halfH = (size * 9) / 16 / 2;
  const bottomPad = (size * (9 / 16) * (CANVAS_H - FEET_Y)) / CANVAS_H;
  const sideAllow = (HIT_BOX.x0 / 640) * size;
  const physics = PET_CONFIG.physics ?? DEFAULT_PHYSICS;
  const animations = PET_CONFIG.animations;
  const weights = PET_CONFIG.animationWeights;

  const style = document.createElement('style');
  style.textContent = CSS;
  document.documentElement.appendChild(style);

  const root = document.createElement('div');
  root.id = '__ds_pet_root';
  root.style.setProperty('--ds-pet-size', size + 'px');

  const stage = document.createElement('div');
  stage.id = '__ds_pet_stage';
  stage.style.transform = `translateY(${bottomPad}px)`;

  const videoA = document.createElement('video');
  const videoB = document.createElement('video');
  for (const v of [videoA, videoB]) {
    v.className = 'ds-pet-video';
    v.muted = true;
    v.playsInline = true;
    v.autoplay = true;
  }
  videoA.classList.add('is-front');

  const hit = document.createElement('div');
  hit.className = 'ds-pet-hit';
  hit.style.left = (HIT_BOX.x0 / 640) * 100 + '%';
  hit.style.top = (HIT_BOX.y0 / 360) * 100 + '%';
  hit.style.width = ((HIT_BOX.x1 - HIT_BOX.x0) / 640) * 100 + '%';
  hit.style.height = ((HIT_BOX.y1 - HIT_BOX.y0) / 360) * 100 + '%';

  stage.append(videoA, videoB, hit);
  root.appendChild(stage);
  document.body.appendChild(root);

  // 位置：优先回读上次落点，否则用配置角落。
  const saved = readPosition();
  const placeAt = (rx, ry) => {
    root.style.left = rx * window.innerWidth - halfW + 'px';
    root.style.top = ry * window.innerHeight - halfH + 'px';
    root.style.right = 'auto';
    root.style.bottom = 'auto';
    customPos = { rx, ry };
  };
  let customPos = null;
  if (saved) {
    placeAt(saved.rx, saved.ry);
  } else {
    const { corner, marginX, marginY } = PET_CONFIG.position;
    if (corner === 'top-right') {
      root.style.right = marginX + 'px';
      root.style.bottom = 'auto';
    } else if (corner === 'top-left') {
      root.style.left = marginX + 'px';
    }
    root.style.top = marginY + 'px';
  }

  // 播放状态
  let anim = animations.idle[0] ?? '';
  let once = true;
  let facing = 'left';
  let front = 0;
  let gen = 0;
  let pending = null;
  let pendingSquash = false;
  const animRef = { current: anim };

  const frontEl = () => (front === 0 ? videoA : videoB);
  const backEl = () => (front === 0 ? videoB : videoA);

  function applyFacing(el) {
    el.style.transform = facing === 'right' ? 'scaleX(-1)' : '';
  }

  function startSquash(el, depth = SQ_SQUASH) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t0 = performance.now();
    const origin = el.style.transformOrigin;
    el.style.transformOrigin = 'bottom';
    const step = () => {
      const u = Math.min((performance.now() - t0) / SQ_DURATION_MS, 1);
      const scale = squashScale(u, depth);
      el.style.transform = (facing === 'right' ? 'scaleX(-1) ' : '') + 'scaleY(' + scale + ')';
      if (u < 1) requestAnimationFrame(step);
      else {
        el.style.transformOrigin = origin;
        el.style.transform = facing === 'right' ? 'scaleX(-1)' : '';
      }
    };
    requestAnimationFrame(step);
  }

  function switchTo(next, nextOnce) {
    if (!next) return;
    if (pending && pending.anim === next && pending.once === nextOnce) {
      if (pendingSquash) {
        pendingSquash = false;
        startSquash(frontEl());
      }
      return;
    }
    const myGen = ++gen;
    pending = { anim: next, once: nextOnce, gen: myGen };
    const el = backEl();
    el.loop = !nextOnce;
    el.onended = nextOnce ? handleEnded : null;

    loadAnimation(next)
      .then(url => {
        if (pending?.gen !== myGen) return;
        el.src = url;
        el.load();
        const onReady = () => {
          el.removeEventListener('loadeddata', onReady);
          if (pending?.gen !== myGen) return;
          const old = frontEl();
          el.classList.add('is-front');
          if (old !== el) {
            old.classList.remove('is-front');
            old.onended = null;
            old.pause();
          }
          front = front === 0 ? 1 : 0;
          pending = null;
          applyFacing(el);
          el.play().catch(() => {});
          if (pendingSquash) {
            pendingSquash = false;
            startSquash(el);
          }
          if (pendingMove) startMoveDrive(el);
        };
        el.addEventListener('loadeddata', onReady);
      })
      .catch(err => {
        if (pending?.gen === myGen) pending = null;
        log('宠物素材加载失败：' + next + '（' + err.message + '）');
      });
  }

  function pickNext() {
    const k = rollKind(Math.random(), weights, { fixed: false });
    let next;
    if (k === 'idle') {
      next = pick(animations.idle, animRef.current);
    } else if (k === 'turn') {
      next = pick(animations.turn, animRef.current);
    } else if (k === 'move') {
      const moved = tryMove();
      if (moved === false) {
        const act = pickCategoryAction(animations.categories, animations.idle, facing, animRef.current);
        next = act.name;
      } else {
        return;
      }
    } else {
      const act = pickCategoryAction(animations.categories, animations.idle, facing, animRef.current);
      next = act.name;
    }
    once = true;
    anim = next;
    animRef.current = next;
    switchTo(next, once);
  }

  function handleEnded(e) {
    const evEl = e?.currentTarget;
    if (evEl && !evEl.classList.contains('is-front')) return;
    if (drag.active) return;
    if (animations.turn.includes(animRef.current)) {
      facing = facing === 'left' ? 'right' : 'left';
    }
    if (animations.drag.includes(animRef.current) || animations.clicks.includes(animRef.current)) {
      // 互动动画播完回待机，下一段再进随机链。
      const next = pick(animations.idle, animRef.current);
      once = true;
      anim = next;
      animRef.current = next;
      switchTo(next, once);
      return;
    }
    pickNext();
  }

  // 移动
  let pendingMove = null;
  let moveToken = 0;
  let moving = false;
  function tryMove() {
    if (moving || pendingMove || throwRaf !== null) return true;
    const actions = animations.moves.actions;
    if (!actions.length) return false;
    const chosen = actions[Math.floor(Math.random() * actions.length)];
    const params = { ...animations.moves.default, ...(chosen.params ?? {}) };
    const dir = facing === 'right' ? 1 : -1;
    const scale = size / PET_GEOMETRY.PET_REF_WIDTH;
    const rootRect = root.getBoundingClientRect();
    const plan = planMove({
      cx: rootRect.left + halfW,
      cy: rootRect.top + halfH,
      W: window.innerWidth,
      H: window.innerHeight,
      dir,
      minDist: params.minDist * scale,
      maxDist: params.maxDist * scale,
      margin: params.margin,
      halfW,
      sideAllow,
    });
    if (!plan) return false;
    pendingMove = { ...plan, dir, leadSec: params.leadSec, tailSec: params.tailSec };
    once = true;
    anim = chosen.name;
    animRef.current = chosen.name;
    switchTo(anim, once);
    return chosen.name;
  }

  function startMoveDrive(el) {
    const pm = pendingMove;
    if (!pm) return;
    pendingMove = null;
    const duration = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : 10.09;
    const travelWindow = Math.max(0.1, duration - pm.leadSec - pm.tailSec);
    const token = ++moveToken;
    moving = true;
    const step = () => {
      if (token !== moveToken) return;
      const t = el.currentTime || 0;
      const W = window.innerWidth;
      const H = window.innerHeight;
      let ratioX;
      if (t <= pm.leadSec) ratioX = pm.startRatio;
      else if (t >= duration - pm.tailSec) ratioX = pm.targetRatio;
      else ratioX = pm.startRatio + pm.dir * pm.totalRatio * ((t - pm.leadSec) / travelWindow);
      const px = ratioX * W;
      const py = pm.startYRatio * H;
      root.style.left = px - halfW + 'px';
      root.style.top = py - halfH + 'px';
      root.style.right = 'auto';
      root.style.bottom = 'auto';
      boxPx = { x: px - halfW, y: py - halfH };
      if (!el.paused && !el.ended) requestAnimationFrame(step);
      else {
        moving = false;
        customPos = { rx: px / W, ry: py / H };
        writePosition(customPos);
      }
    };
    requestAnimationFrame(step);
  }

  function stopMove() {
    moveToken++;
    pendingMove = null;
    moving = false;
  }

  // 拖拽与抛掷
  let boxPx = null;
  let dragTarget = null;
  let dragVel = { vx: 0, vy: 0 };
  let dragFollow = null;
  let dragFollowToken = 0;
  let throwRaf = null;
  let throwToken = 0;
  let trail = [];
  let justDragged = false;
  let lastPressAt = 0;
  const drag = {
    active: false,
    dragging: false,
    sx: 0,
    sy: 0,
    offX: 0,
    offY: 0,
    sling: false,
    anchorX: 0,
    anchorY: 0,
  };

  function startDragFollow() {
    if (dragFollow !== null) return;
    const token = ++dragFollowToken;
    let last = performance.now();
    const step = () => {
      if (dragFollowToken !== token) return;
      if (!dragTarget) {
        dragFollow = null;
        return;
      }
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      let x = boxPx?.x ?? 0;
      let y = boxPx?.y ?? 0;
      dragVel.vx = springStep(dragVel.vx, x, dragTarget.x, dt, physics.throwPower);
      dragVel.vy = springStep(dragVel.vy, y, dragTarget.y, dt, physics.throwPower);
      x += dragVel.vx * dt;
      y += dragVel.vy * dt;
      boxPx = { x, y };
      root.style.left = x + 'px';
      root.style.top = y + 'px';
      root.style.right = 'auto';
      root.style.bottom = 'auto';
      dragFollow = requestAnimationFrame(step);
    };
    dragFollow = requestAnimationFrame(step);
  }

  function stopDragFollow() {
    dragFollowToken++;
    if (dragFollow !== null) {
      cancelAnimationFrame(dragFollow);
      dragFollow = null;
    }
    dragTarget = null;
    dragVel = { vx: 0, vy: 0 };
  }

  function stopThrow() {
    throwToken++;
    if (throwRaf !== null) {
      cancelAnimationFrame(throwRaf);
      throwRaf = null;
    }
  }

  function startThrow(px, py, vx, vy) {
    stopDragFollow();
    stopMove();
    const bounds = throwBounds({ W: window.innerWidth, H: window.innerHeight, size, sideAllow });
    const token = ++throwToken;
    let state = { x: px, y: py, vx, vy };
    let last = performance.now();
    let prevGrounded = false;
    const step = () => {
      if (throwToken !== token) return;
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      const fallingVy = state.vy;
      const substeps = throwSubsteps(state.vx, state.vy, dt);
      let res = throwStep(state, dt / substeps, bounds, physics);
      for (let i = 1; i < substeps && !res.atRest; i++) {
        res = throwStep(res, dt / substeps, bounds, physics);
      }
      state = { x: res.x, y: res.y, vx: res.vx, vy: res.vy };
      root.style.left = res.x + 'px';
      root.style.top = res.y + 'px';
      root.style.right = 'auto';
      root.style.bottom = 'auto';
      boxPx = { x: res.x, y: res.y };
      customPos = {
        rx: (res.x + halfW) / window.innerWidth,
        ry: (res.y + halfH) / window.innerHeight,
      };
      const grounded = res.y >= bounds.maxY - 1;
      if (res.bounced && grounded && !prevGrounded) {
        startSquash(frontEl(), landingSquash(fallingVy));
      }
      prevGrounded = grounded;
      if (res.atRest) {
        throwRaf = null;
        writePosition(customPos);
        return;
      }
      throwRaf = requestAnimationFrame(step);
    };
    throwRaf = requestAnimationFrame(step);
  }

  function playClick() {
    if (drag.active || drag.dragging || justDragged) return;
    stopThrow();
    stopMove();
    once = true;
    if (!animations.clicks.length) return;
    pendingSquash = true;
    anim = pick(animations.clicks);
    animRef.current = anim;
    switchTo(anim, once);
  }

  hit.addEventListener('click', playClick);

  hit.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    stopThrow();
    stopDragFollow();
    stopMove();
    trail = [];
    hit.classList.add('dragging');
    hit.setPointerCapture(e.pointerId);
    const rect = root.getBoundingClientRect();
    boxPx = { x: rect.left, y: rect.top };
    const offX = e.clientX - (rect.left + rect.width / 2);
    const offY = e.clientY - (rect.top + rect.height / 2);
    const pressNow = performance.now();
    const sling = pressNow - lastPressAt < SLINGSHOT_DOUBLE_MS;
    lastPressAt = sling ? 0 : pressNow;
    Object.assign(drag, {
      active: true,
      dragging: false,
      sx: e.clientX,
      sy: e.clientY,
      offX,
      offY,
      sling,
      anchorX: boxPx.x + halfW,
      anchorY: boxPx.y + halfH,
    });
  });

  hit.addEventListener('pointermove', e => {
    if (!drag.active) return;
    const dx = e.clientX - drag.sx;
    const dy = e.clientY - drag.sy;
    if (!drag.dragging) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      drag.dragging = true;
      stopMove();
      once = true;
      if (animations.drag.length) {
        anim = pick(animations.drag);
        animRef.current = anim;
        switchTo(anim, once);
      }
    }
    const now = performance.now();
    trail = trimTrail([...trail, { t: now, x: e.clientX, y: e.clientY }], now);
    dragTarget = { x: e.clientX - drag.offX - halfW, y: e.clientY - drag.offY - halfH };
    startDragFollow();
    stage.style.transform = 'none';
  });

  function endDrag(e) {
    const wasDragging = drag.dragging;
    drag.active = false;
    drag.dragging = false;
    hit.classList.remove('dragging');
    stopDragFollow();
    if (!wasDragging) return;
    justDragged = true;
    setTimeout(() => {
      justDragged = false;
    }, 100);
    stage.style.transform = `translateY(${bottomPad}px)`;
    once = true;
    anim = pick(animations.idle, animRef.current);
    animRef.current = anim;
    switchTo(anim, once);
    const px = boxPx?.x ?? e.clientX - drag.offX - halfW;
    const py = boxPx?.y ?? e.clientY - drag.offY - halfH;
    if (drag.sling) {
      const pullX = px + halfW - drag.anchorX;
      const pullY = py + halfH - drag.anchorY;
      const dist = Math.hypot(pullX, pullY);
      const power = slingshotPower(dist, size);
      const v = slingshotVelocity(pullAngle(pullX, pullY), power, physics.throwPower);
      trail = [];
      startThrow(px, py, v.vx, v.vy);
      return;
    }
    const vel = estimateReleaseVelocity(trail, performance.now(), physics);
    trail = [];
    if (vel) {
      startThrow(px, py, vel.vx, vel.vy);
    } else {
      customPos = { rx: (px + halfW) / window.innerWidth, ry: (py + halfH) / window.innerHeight };
      writePosition(customPos);
    }
  }

  hit.addEventListener('pointerup', endDrag);
  hit.addEventListener('pointercancel', endDrag);

  // 右键菜单：只保留回到初始位置
  let menuEl = null;
  function closeMenu() {
    if (menuEl) {
      menuEl.remove();
      menuEl = null;
    }
  }

  function menuItem(label, onClick) {
    const el = document.createElement('div');
    el.className = 'pet-menu-item';
    el.textContent = label;
    el.addEventListener('click', () => {
      closeMenu();
      onClick();
    });
    return el;
  }

  function openMenu(x, y) {
    closeMenu();
    menuEl = document.createElement('div');
    menuEl.id = '__ds_pet_menu';
    menuEl.style.left = Math.min(x, window.innerWidth - 180) + 'px';
    menuEl.style.top = Math.min(y, window.innerHeight - 320) + 'px';

    const title = document.createElement('div');
    title.className = 'pet-menu-title';
    title.textContent = '大肥鱼';
    menuEl.appendChild(title);

    menuEl.appendChild(menuItem('提示词', () => {
      openPromptPanel(x, y);
    }));

    menuEl.appendChild(menuItem('关闭动画', () => {
      setPetEnabled(false);
      unmountPet();
      window.dispatchEvent(new CustomEvent('ds-pet-disabled'));
    }));

    menuEl.appendChild(menuItem('回到初始位置', () => {
      customPos = null;
      root.style.left = 'auto';
      root.style.right = PET_CONFIG.position.marginX + 'px';
      root.style.top = PET_CONFIG.position.marginY + 'px';
      root.style.bottom = 'auto';
      boxPx = null;
      try {
        GM_setValue(POSITION_KEY, null);
      } catch {}
    }));

    document.body.appendChild(menuEl);
    setTimeout(() => {
      const onDown = ev => {
        if (menuEl && !menuEl.contains(ev.target)) {
          closeMenu();
          document.removeEventListener('pointerdown', onDown, true);
        }
      };
      document.addEventListener('pointerdown', onDown, true);
    }, 0);
  }

  hit.addEventListener('contextmenu', e => {
    e.preventDefault();
    openMenu(e.clientX, e.clientY);
  });

  window.addEventListener('resize', () => {
    if (customPos) placeAt(customPos.rx, customPos.ry);
    closeMenu();
  });

  // 启动
  switchTo(anim, once);
  log('宠物已启动');
}
