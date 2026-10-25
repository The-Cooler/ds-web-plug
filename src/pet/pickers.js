/**
 * pet-pickers.js — 取自 dsh-pet（MIT, Copyright (c) 2026 PC2005-cloud）
 * 原文件：dsh-pet/src/shared/pickers.ts，逻辑未改。
 */

export const pick = (pool, exclude) => {
  const entries = exclude ? pool.filter(n => n !== exclude) : pool;
  const src = entries.length ? entries : pool;
  return src[Math.floor(Math.random() * src.length)];
};

export const randomBetween = (min, max) => Math.floor(min + Math.random() * (max - min));

export const pickWeightedCategory = (categories, facing) => {
  const cats = categories.filter(c => c.actions.length > 0);
  if (!cats.length) return null;
  const filtered = cats.filter(c => !(c.noMirror && facing === 'right'));
  const eligible = filtered.length ? filtered : cats;
  const totalW = eligible.reduce((s, c) => s + c.weight, 0) || 1;
  let t = Math.random() * totalW;
  for (const c of eligible) {
    t -= c.weight;
    if (t <= 0) return c;
  }
  return eligible[eligible.length - 1];
};

export const rollKind = (roll, w, opts) => {
  const turn = opts?.fixed ? 0 : w.turn;
  const move = opts?.fixed ? 0 : w.move;
  const topEnd = (w.idle + turn + move) / 100;
  if (roll < w.idle / 100) return 'idle';
  if (roll < (w.idle + turn) / 100) return 'turn';
  if (roll < topEnd) return 'move';
  return 'action';
};

export const pickCategoryAction = (categories, idlePool, facing, current) => {
  const cat = pickWeightedCategory(categories, facing);
  if (!cat) return { id: 'FALLBACK', name: pick(idlePool, current) };
  return { id: cat.id, name: pick(cat.actions, current) };
};
