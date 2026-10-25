/**
 * pet-motion.js — 取自 dsh-pet（MIT, Copyright (c) 2026 PC2005-cloud）
 * 原文件：dsh-pet/src/shared/motion.ts，只保留视口单屏分支。
 */
import { randomBetween } from './pickers.js';

export const planMove = o => {
  const side = o.sideAllow ?? 0;
  const distance = randomBetween(o.minDist, o.maxDist);
  const target = o.cx + o.dir * distance;
  const leftBound = o.margin + o.halfW - side;
  const rightBound = o.W - o.margin - o.halfW + side;
  if (target < leftBound || target > rightBound) return null;
  return {
    startRatio: o.cx / o.W,
    startYRatio: o.cy / o.H,
    targetRatio: target / o.W,
    totalRatio: Math.abs(target - o.cx) / o.W,
  };
};
