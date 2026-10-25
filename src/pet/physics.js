/**
 * pet-physics.js — 取自 dsh-pet（MIT, Copyright (c) 2026 PC2005-cloud）
 * 原文件：dsh-pet/src/shared/physics.ts，此处只保留浏览器挂件用到的部分，逻辑未改。
 */

export const SPRING_K = 200;
export const SPRING_C = 30;
export const TRAIL_KEEP_MS = 200;
export const RELEASE_WINDOW_MS = 150;
export const RELEASE_STALE_MS = 150;
export const MIN_SPAN_MS = 20;
export const SEG_MIN_DT_MS = 8;
export const DEAD_ZONE_SPEED = 500;
export const MAX_THROW_SPEED = 3600;
export const PEAK_WEIGHT = 0.5;
export const ACCEL_REF = 8000;
export const ACCEL_GAIN_MAX = 0.6;

export const GRAVITY = 1400;
export const RESTITUTION = 0.78;
export const GROUND_FRICTION = 2.5;

export const DEFAULT_PHYSICS = {
  gravity: GRAVITY,
  restitution: RESTITUTION,
  groundFriction: GROUND_FRICTION,
  ceilingBounce: true,
  throwPower: 1,
  petCollision: false,
};

export const DEFAULT_THROW_POWER = 1;
export const REST_VY = 40;
export const REST_VX = 15;
export const MAX_STEP_DT = 0.05;

export const SQ_SQUASH = 0.55;
export const SQ_DURATION_MS = 220;
export const SQ_SOFT_SPEED = 300;
export const SQ_HARD_SPEED = 1500;
export const SQ_MAX_SQUASH = 0.55;

export const landingSquash = impactSpeed => {
  const t = Math.min(Math.max((Math.abs(impactSpeed) - SQ_SOFT_SPEED) / (SQ_HARD_SPEED - SQ_SOFT_SPEED), 0), 1);
  return Math.min(0.8, 1 - t * (1 - SQ_MAX_SQUASH));
};

export const squashScale = (u, squash = SQ_SQUASH) => {
  if (u < 0.45) {
    const p = u / 0.45;
    return 1 - (1 - squash) * p * p;
  }
  const p = (u - 0.45) / 0.55;
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const f = 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
  return Math.min(1.12, squash + (1 - squash) * Math.max(f, 0));
};

export const throwBounds = o => {
  const h = (o.size * 9) / 16;
  return { minX: -o.sideAllow, minY: 0, maxX: o.W - o.size + o.sideAllow, maxY: o.H - h };
};

export const trimTrail = (trail, now) => {
  const cutoff = now - TRAIL_KEEP_MS;
  let i = 0;
  while (i < trail.length && trail[i].t < cutoff) i++;
  return i === 0 ? trail : trail.slice(i);
};

export const springStep = (v, x, target, dt, power = DEFAULT_THROW_POWER) =>
  v + ((target - x) * SPRING_K - v * SPRING_C) * power * dt;

export const softClampSpeed = speed => {
  if (speed <= 0) return 0;
  return MAX_THROW_SPEED * (1 - Math.exp(-speed / MAX_THROW_SPEED));
};

export const THROW_SPEED_ANCHOR = 1200;

export const SLINGSHOT_REF_RATIO = 0.6;

export const slingshotRefDist = size => (size > 0 ? size * SLINGSHOT_REF_RATIO : 0);

export const slingshotPower = (dist, size) => {
  const ref = slingshotRefDist(size);
  if (!(ref > 0) || !(dist > 0) || !Number.isFinite(dist)) return 0;
  return dist / ref;
};

export const pullAngle = (pullX, pullY) => (Math.atan2(pullY, -pullX) * 180) / Math.PI;

export const slingshotVelocity = (angleDeg, power, throwPower = DEFAULT_THROW_POWER) => {
  const speed = THROW_SPEED_ANCHOR * Math.max(0, power) * Math.max(0, throwPower);
  if (speed === 0) return { vx: 0, vy: 0 };
  const rad = (angleDeg * Math.PI) / 180;
  return { vx: Math.cos(rad) * speed, vy: -Math.sin(rad) * speed };
};

export const estimateReleaseVelocity = (trail, now, physics = DEFAULT_PHYSICS) => {
  if (trail.length === 0) return null;
  const last = trail[trail.length - 1];
  if (now - last.t > RELEASE_STALE_MS) return null;
  const win = trail.filter(s => now - s.t <= RELEASE_WINDOW_MS);
  if (win.length < 2) return null;
  const t0 = win[0].t;
  const x0 = win[0].x;
  const y0 = win[0].y;
  const t1 = win[win.length - 1].t;
  const x1 = win[win.length - 1].x;
  const y1 = win[win.length - 1].y;
  const spanMs = t1 - t0;
  if (spanMs < MIN_SPAN_MS) return null;
  const baseVx = ((x1 - x0) / spanMs) * 1000;
  const baseVy = ((y1 - y0) / spanMs) * 1000;
  const baseSpeed = Math.hypot(baseVx, baseVy);
  if (baseSpeed < 1e-6) return null;
  const segSpeeds = [];
  let px = x0;
  let py = y0;
  let pt = t0;
  for (const s of win.slice(1)) {
    const dt = s.t - pt;
    if (dt >= SEG_MIN_DT_MS) {
      segSpeeds.push({ speed: (Math.hypot(s.x - px, s.y - py) / dt) * 1000, tEnd: s.t });
      px = s.x;
      py = s.y;
      pt = s.t;
    }
  }
  const peakSpeed = segSpeeds.length ? Math.max(...segSpeeds.map(v => v.speed)) : baseSpeed;
  let accel = 0;
  if (segSpeeds.length >= 2) {
    const lastSeg = segSpeeds[segSpeeds.length - 1];
    const firstSeg = segSpeeds[0];
    accel = (lastSeg.speed - firstSeg.speed) / Math.max((lastSeg.tEnd - firstSeg.tEnd) / 1000, MIN_SPAN_MS / 1000);
  }
  const speedBeforeClamp =
    ((1 - PEAK_WEIGHT) * baseSpeed + PEAK_WEIGHT * peakSpeed) *
    (1 + Math.min(Math.max(accel, 0) / ACCEL_REF, 1) * ACCEL_GAIN_MAX);
  const speed = softClampSpeed(speedBeforeClamp) * physics.throwPower;
  if (speed < DEAD_ZONE_SPEED) return null;
  return { vx: (baseVx / baseSpeed) * speed, vy: (baseVy / baseSpeed) * speed };
};

export const throwStep = (s, dtRaw, b, physics = DEFAULT_PHYSICS) => {
  const dt = Math.min(Math.max(dtRaw, 0), MAX_STEP_DT);
  let { x, y, vx, vy } = s;
  vy += physics.gravity * dt;
  x += vx * dt;
  y += vy * dt;
  let bounced = false;
  if (x < b.minX) {
    x = b.minX;
    vx = Math.abs(vx) * physics.restitution;
    bounced = true;
  } else if (x > b.maxX) {
    x = b.maxX;
    vx = -Math.abs(vx) * physics.restitution;
    bounced = true;
  }
  if (y < b.minY) {
    if (physics.ceilingBounce) {
      y = b.minY;
      vy = Math.abs(vy) * physics.restitution;
      bounced = true;
    }
  } else if (y >= b.maxY) {
    y = b.maxY;
    vx *= Math.max(0, 1 - physics.groundFriction * dt);
    if (Math.abs(vy) < REST_VY) vy = 0;
    else vy = -Math.abs(vy) * physics.restitution;
    bounced = true;
  }
  const speed = Math.hypot(vx, vy);
  const atRest =
    (y >= b.maxY - 1 && Math.abs(vy) < 1 && Math.abs(vx) < REST_VX) || (bounced && speed < REST_VY && Math.abs(vy) < 1);
  return { x, y, vx, vy, bounced, atRest };
};

export const SUBSTEP_PX = 8;
export const SUBSTEP_MAX = 64;

export const throwSubsteps = (vx, vy, dt) => {
  const travel = Math.hypot(vx, vy) * Math.min(Math.max(dt, 0), MAX_STEP_DT);
  if (!(travel > SUBSTEP_PX)) return 1;
  return Math.min(SUBSTEP_MAX, Math.ceil(travel / SUBSTEP_PX));
};
