// ==UserScript==
// @name         DeepSeek 大肥鱼插件
// @namespace    deepseek-custom-prompt
// @version      1.0
// @author       LLL
// @description  自定义提示词模板 + 桌面宠物挂件
// @downloadURL  https://gitee.com/Ljunyang114/ds-web-plug/raw/main/dist/ds-custom-prompt.user.js
// @updateURL    https://gitee.com/Ljunyang114/ds-web-plug/raw/main/dist/ds-custom-prompt.user.js
// @match        https://chat.deepseek.com/*
// @connect      gitee.com
// @connect      raw.githubusercontent.com
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(function() {
	"use strict";
	var KEY = "ds_custom_prompt_presets_v2";
	var ENABLE_KEY = "ds_custom_prompt_enabled_v2";
	var DEFAULT_KEY = "ds_custom_prompt_default_v2";
	var MARKER = "[DS_CUSTOM_SYSTEM_PROMPT]";
	var DEFAULT_PRESETS = [{
		id: "default",
		name: "默认模板",
		prompt: "请准确理解用户的要求，直接回答问题。"
	}];
	var TARGET_URL = /\/api\/v0\/chat\/completion(?:[?"#]|$)|\/chat\/completions|\/v1\/chat\/completions/i;
	var log = (...args) => console.info("[DS自定义提示词]", ...args);
	var INJECTED_KEY = "ds_custom_prompt_injected_sessions_v1";
	var MAX_REMEMBERED = 300;
	var readMap = () => {
		try {
			const v = GM_getValue(INJECTED_KEY, {});
			return v && typeof v === "object" && !Array.isArray(v) ? v : {};
		} catch {
			return {};
		}
	};
	var isSessionInjected = (id) => {
		if (id === void 0 || id === null) return false;
		return Object.prototype.hasOwnProperty.call(readMap(), String(id));
	};
	var markSessionInjected = (id) => {
		if (id === void 0 || id === null) return;
		const map = readMap();
		map[String(id)] = 1;
		const keys = Object.keys(map);
		if (keys.length > MAX_REMEMBERED) for (const k of keys.slice(0, keys.length - MAX_REMEMBERED)) delete map[k];
		try {
			GM_setValue(INJECTED_KEY, map);
		} catch (e) {
			console.error("[DS自定义提示词] 会话标记保存失败", e);
		}
	};
	var read = (key, fallback) => {
		try {
			const v = GM_getValue(key, fallback);
			return v === void 0 ? fallback : v;
		} catch {
			return fallback;
		}
	};
	var write = (key, value) => {
		try {
			GM_setValue(key, value);
		} catch (e) {
			console.error("[DS自定义提示词] 保存失败", e);
		}
	};
	var state = {
		presets: read(KEY, DEFAULT_PRESETS),
		enabled: read(ENABLE_KEY, true),
		defaultId: ""
	};
	if (!Array.isArray(state.presets)) state.presets = [];
	state.defaultId = read(DEFAULT_KEY, state.presets[0]?.id || "");
	var getPrompt = () => {
		if (!state.enabled) return "";
		return state.presets.find((p) => p.id === state.defaultId)?.prompt?.trim() || "";
	};
	var save = () => {
		write(KEY, state.presets);
		write(ENABLE_KEY, state.enabled);
		write(DEFAULT_KEY, state.defaultId);
	};
	function modifyBody(body, url) {
		const prompt = getPrompt();
		if (!prompt || typeof body !== "string") return body;
		if (!TARGET_URL.test(String(url))) return body;
		try {
			const data = JSON.parse(body);
			const sessionId = data.chat_session_id;
			if (isSessionInjected(sessionId)) return body;
			let changed = false;
			if (Array.isArray(data.messages)) {
				if (!data.messages.find((m) => m && m.role === "system" && typeof m.content === "string" && m.content.includes("[DS_CUSTOM_SYSTEM_PROMPT]"))) {
					const system = data.messages.find((m) => m && m.role === "system");
					if (system && typeof system.content === "string") {
						if (!system.content.includes(prompt)) {
							system.content = `${MARKER}\n${prompt}\n\n${system.content}`;
							changed = true;
						}
					} else {
						data.messages.unshift({
							role: "system",
							content: `${MARKER}\n${prompt}`
						});
						changed = true;
					}
				}
			} else if (typeof data.prompt === "string") {
				if (!data.prompt.includes("[DS_CUSTOM_SYSTEM_PROMPT]")) {
					data.prompt = `${MARKER}\n${prompt}\n\n${data.prompt}`;
					changed = true;
				}
			} else return body;
			if (changed) {
				markSessionInjected(sessionId);
				log("已修改匹配请求", String(url));
				return JSON.stringify(data);
			}
		} catch (e) {
			log("请求不是可识别的 JSON，跳过", String(url));
		}
		return body;
	}
	function installInterceptors(W) {
		const originalFetch = W.fetch;
		if (typeof originalFetch === "function" && !originalFetch.__dsPromptPatched) {
			const patchedFetch = function(input, init) {
				try {
					const url = typeof input === "string" ? input : input?.url;
					if (init && typeof init.body === "string") init = {
						...init,
						body: modifyBody(init.body, url)
					};
				} catch (e) {
					console.error("[DS自定义提示词] fetch 拦截异常", e);
				}
				return originalFetch.call(this, input, init);
			};
			patchedFetch.__dsPromptPatched = true;
			W.fetch = patchedFetch;
		}
		const XHR = W.XMLHttpRequest;
		if (XHR && !XHR.prototype.__dsPromptPatched) {
			const originalOpen = XHR.prototype.open;
			const originalSend = XHR.prototype.send;
			XHR.prototype.open = function(method, url, ...args) {
				this.__dsPromptUrl = url;
				return originalOpen.call(this, method, url, ...args);
			};
			XHR.prototype.send = function(body) {
				try {
					body = modifyBody(body, this.__dsPromptUrl);
				} catch (e) {
					console.error("[DS自定义提示词] XHR 拦截异常", e);
				}
				return originalSend.call(this, body);
			};
			XHR.prototype.__dsPromptPatched = true;
		}
		const OriginalWS = W.WebSocket;
		if (OriginalWS && !OriginalWS.__dsPromptPatched) {
			const PatchedWS = new Proxy(OriginalWS, { construct(Target, args) {
				const ws = Reflect.construct(Target, args, Target);
				const originalSend = ws.send;
				ws.send = function(data) {
					try {
						if (typeof data === "string") data = modifyBody(data, args[0]);
					} catch (e) {
						console.error("[DS自定义提示词] WebSocket 拦截异常", e);
					}
					return originalSend.call(this, data);
				};
				return ws;
			} });
			PatchedWS.__dsPromptPatched = true;
			W.WebSocket = PatchedWS;
		}
	}
	var PET_CONFIG = {
		size: 462,
		position: {
			corner: "top-right",
			marginX: 24,
			marginY: 100
		},
		physics: {
			gravity: 1400,
			restitution: .78,
			groundFriction: 2.5,
			ceilingBounce: true,
			throwPower: 1,
			petCollision: false
		},
		animations: {
			idle: ["待机呼吸休闲"],
			turn: ["东张西望"],
			drag: ["被鼠标拖拽悬空反馈"],
			clicks: [
				"点击回应-开心跃动",
				"点击回应-害羞惊讶",
				"点击回应-傲娇生气",
				"点击回应-挠痒咯咯笑",
				"点击回应-元气挥手"
			],
			moves: {
				default: {
					minDist: 60,
					maxDist: 240,
					margin: 20,
					leadSec: 2,
					tailSec: 2
				},
				actions: [
					{ name: "螃蟹走路" },
					{
						name: "原地漂浮踏步",
						params: {
							minDist: 40,
							maxDist: 120
						}
					},
					{
						name: "原地左转奔跑",
						params: {
							minDist: 120,
							maxDist: 320,
							leadSec: 1.75,
							tailSec: 4.8
						}
					}
				]
			},
			categories: [
				{
					id: "小动作",
					weight: 20,
					actions: [
						"悠闲哼歌",
						"超大伸懒腰",
						"原地敲击桌面互动",
						"原地重力下蹲压缩",
						"哈欠连天",
						"原地小憩沉眠",
						"女仆屈膝礼仪",
						"被吓一跳",
						"小幅度原地360度旋转展示",
						"偷吃零食被抓住",
						"用鲸鱼尾巴拍打地面",
						"打瞌睡被惊醒",
						"照镜子",
						"整体换装试色",
						"轻快记录",
						"写代码",
						"摇扇纳凉",
						"晨间刷牙"
					]
				},
				{
					id: "玩耍",
					weight: 20,
					actions: [
						"原地专心玩魔方",
						"原地蹲下玩玩具汽车",
						"鲸鱼吐泡泡特效",
						"原地跳跃抓碎头顶物品",
						"玩游戏气急败坏",
						"玩水枪",
						"小提琴演奏",
						"蓝鲸现世",
						"优雅女仆舞",
						"轻快摇摆舞",
						"可爱宅舞",
						"吹气球",
						"动物环绕",
						"放风筝",
						"拆礼物",
						"变鸽子",
						"扑克魔术",
						"抽陀螺",
						"吹笛子",
						"蝴蝶蜜蜂环绕头顶开花",
						"撸猫",
						"凭空生花",
						"骑木马",
						"三球抛接",
						"踢毽子",
						"下五子棋",
						"荡秋千"
					]
				},
				{
					id: "吃什么",
					weight: 16,
					actions: [
						"吃白饭",
						"大口吃零食",
						"吃Token",
						"吃早餐",
						"吃午餐",
						"吃晚餐",
						"吃冰淇淋融化",
						"吃大闸蟹",
						"吃糖葫芦",
						"吃长寿面",
						"吃西瓜",
						"涮火锅"
					]
				},
				{
					id: "时节",
					weight: 14,
					actions: [
						"被落叶淹没",
						"中秋赏月吃月饼",
						"堆雪人",
						"放烟花",
						"吃粽子",
						"吃年糕",
						"吃青团",
						"吃腊八粥",
						"吃重阳糕",
						"收红包",
						"写福字",
						"穿针乞巧",
						"舞狮头",
						"讨糖南瓜灯",
						"插茱萸赏菊",
						"放河灯",
						"萌化小幽灵",
						"装点圣诞树",
						"放孔明灯",
						"吃汤圆",
						"吃饺子"
					]
				},
				{
					id: "文字",
					weight: 10,
					noMirror: true,
					actions: ["是啊，吃什么", "深度思考碎碎念"]
				}
			]
		},
		animationWeights: {
			idle: 10,
			turn: 5,
			move: 5
		}
	};
	var PET_GEOMETRY = {
		CANVAS_H: 360,
		FEET_Y: 330,
		HIT_BOX: {
			x0: 200,
			y0: 50,
			x1: 440,
			y1: 335
		},
		DRAG_THRESHOLD: 5,
		SLINGSHOT_DOUBLE_MS: 200,
		PET_REF_WIDTH: 462
	};
	var BASES = ["https://gitee.com/Ljunyang114/ds-web-plug/raw/main/assets/pet/webm/", "https://raw.githubusercontent.com/The-Cooler/ds-web-plug/main/assets/pet/webm/"];
	var cache = new Map();
	function gmFetch(url) {
		return new Promise((resolve, reject) => {
			GM_xmlhttpRequest({
				method: "GET",
				url,
				responseType: "blob",
				timeout: 2e4,
				onload: (res) => {
					if (res.status >= 200 && res.status < 300) resolve(res.response);
					else reject(new Error("HTTP " + res.status));
				},
				onerror: () => reject(new Error("网络错误")),
				ontimeout: () => reject(new Error("超时"))
			});
		});
	}
	async function loadAnimation(name) {
		const hit = cache.get(name);
		if (hit) return hit;
		let lastError = null;
		for (const base of BASES) {
			const url = base + encodeURIComponent(name) + ".webm";
			try {
				const blob = await gmFetch(url);
				const objectUrl = URL.createObjectURL(blob);
				cache.set(name, objectUrl);
				return objectUrl;
			} catch (e) {
				lastError = e;
			}
		}
		throw lastError ?? new Error("素材加载失败：" + name);
	}
	var pick = (pool, exclude) => {
		const entries = exclude ? pool.filter((n) => n !== exclude) : pool;
		const src = entries.length ? entries : pool;
		return src[Math.floor(Math.random() * src.length)];
	};
	var randomBetween = (min, max) => Math.floor(min + Math.random() * (max - min));
	var pickWeightedCategory = (categories, facing) => {
		const cats = categories.filter((c) => c.actions.length > 0);
		if (!cats.length) return null;
		const filtered = cats.filter((c) => !(c.noMirror && facing === "right"));
		const eligible = filtered.length ? filtered : cats;
		const totalW = eligible.reduce((s, c) => s + c.weight, 0) || 1;
		let t = Math.random() * totalW;
		for (const c of eligible) {
			t -= c.weight;
			if (t <= 0) return c;
		}
		return eligible[eligible.length - 1];
	};
	var rollKind = (roll, w, opts) => {
		const turn = opts?.fixed ? 0 : w.turn;
		const move = opts?.fixed ? 0 : w.move;
		const topEnd = (w.idle + turn + move) / 100;
		if (roll < w.idle / 100) return "idle";
		if (roll < (w.idle + turn) / 100) return "turn";
		if (roll < topEnd) return "move";
		return "action";
	};
	var pickCategoryAction = (categories, idlePool, facing, current) => {
		const cat = pickWeightedCategory(categories, facing);
		if (!cat) return {
			id: "FALLBACK",
			name: pick(idlePool, current)
		};
		return {
			id: cat.id,
			name: pick(cat.actions, current)
		};
	};
	var planMove = (o) => {
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
			totalRatio: Math.abs(target - o.cx) / o.W
		};
	};
	var MAX_THROW_SPEED = 3600;
	var PEAK_WEIGHT = .5;
	var ACCEL_REF = 8e3;
	var ACCEL_GAIN_MAX = .6;
	var DEFAULT_PHYSICS = {
		gravity: 1400,
		restitution: .78,
		groundFriction: 2.5,
		ceilingBounce: true,
		throwPower: 1,
		petCollision: false
	};
	var MAX_STEP_DT = .05;
	var SQ_SQUASH = .55;
	var landingSquash = (impactSpeed) => {
		const t = Math.min(Math.max((Math.abs(impactSpeed) - 300) / 1200, 0), 1);
		return Math.min(.8, 1 - t * .44999999999999996);
	};
	var squashScale = (u, squash = SQ_SQUASH) => {
		if (u < .45) {
			const p = u / .45;
			return 1 - (1 - squash) * p * p;
		}
		const p = (u - .45) / .55;
		const f = 1 + 2.70158 * Math.pow(p - 1, 3) + 1.70158 * Math.pow(p - 1, 2);
		return Math.min(1.12, squash + (1 - squash) * Math.max(f, 0));
	};
	var throwBounds = (o) => {
		const h = o.size * 9 / 16;
		return {
			minX: -o.sideAllow,
			minY: 0,
			maxX: o.W - o.size + o.sideAllow,
			maxY: o.H - h
		};
	};
	var trimTrail = (trail, now) => {
		const cutoff = now - 200;
		let i = 0;
		while (i < trail.length && trail[i].t < cutoff) i++;
		return i === 0 ? trail : trail.slice(i);
	};
	var springStep = (v, x, target, dt, power = 1) => v + ((target - x) * 200 - v * 30) * power * dt;
	var softClampSpeed = (speed) => {
		if (speed <= 0) return 0;
		return MAX_THROW_SPEED * (1 - Math.exp(-speed / MAX_THROW_SPEED));
	};
	var THROW_SPEED_ANCHOR = 1200;
	var SLINGSHOT_REF_RATIO = .6;
	var slingshotRefDist = (size) => size > 0 ? size * SLINGSHOT_REF_RATIO : 0;
	var slingshotPower = (dist, size) => {
		const ref = slingshotRefDist(size);
		if (!(ref > 0) || !(dist > 0) || !Number.isFinite(dist)) return 0;
		return dist / ref;
	};
	var pullAngle = (pullX, pullY) => Math.atan2(pullY, -pullX) * 180 / Math.PI;
	var slingshotVelocity = (angleDeg, power, throwPower = 1) => {
		const speed = THROW_SPEED_ANCHOR * Math.max(0, power) * Math.max(0, throwPower);
		if (speed === 0) return {
			vx: 0,
			vy: 0
		};
		const rad = angleDeg * Math.PI / 180;
		return {
			vx: Math.cos(rad) * speed,
			vy: -Math.sin(rad) * speed
		};
	};
	var estimateReleaseVelocity = (trail, now, physics = DEFAULT_PHYSICS) => {
		if (trail.length === 0) return null;
		if (now - trail[trail.length - 1].t > 150) return null;
		const win = trail.filter((s) => now - s.t <= 150);
		if (win.length < 2) return null;
		const t0 = win[0].t;
		const x0 = win[0].x;
		const y0 = win[0].y;
		const t1 = win[win.length - 1].t;
		const x1 = win[win.length - 1].x;
		const y1 = win[win.length - 1].y;
		const spanMs = t1 - t0;
		if (spanMs < 20) return null;
		const baseVx = (x1 - x0) / spanMs * 1e3;
		const baseVy = (y1 - y0) / spanMs * 1e3;
		const baseSpeed = Math.hypot(baseVx, baseVy);
		if (baseSpeed < 1e-6) return null;
		const segSpeeds = [];
		let px = x0;
		let py = y0;
		let pt = t0;
		for (const s of win.slice(1)) {
			const dt = s.t - pt;
			if (dt >= 8) {
				segSpeeds.push({
					speed: Math.hypot(s.x - px, s.y - py) / dt * 1e3,
					tEnd: s.t
				});
				px = s.x;
				py = s.y;
				pt = s.t;
			}
		}
		const peakSpeed = segSpeeds.length ? Math.max(...segSpeeds.map((v) => v.speed)) : baseSpeed;
		let accel = 0;
		if (segSpeeds.length >= 2) {
			const lastSeg = segSpeeds[segSpeeds.length - 1];
			const firstSeg = segSpeeds[0];
			accel = (lastSeg.speed - firstSeg.speed) / Math.max((lastSeg.tEnd - firstSeg.tEnd) / 1e3, 20 / 1e3);
		}
		const speed = softClampSpeed((.5 * baseSpeed + PEAK_WEIGHT * peakSpeed) * (1 + Math.min(Math.max(accel, 0) / ACCEL_REF, 1) * ACCEL_GAIN_MAX)) * physics.throwPower;
		if (speed < 500) return null;
		return {
			vx: baseVx / baseSpeed * speed,
			vy: baseVy / baseSpeed * speed
		};
	};
	var throwStep = (s, dtRaw, b, physics = DEFAULT_PHYSICS) => {
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
			if (Math.abs(vy) < 40) vy = 0;
			else vy = -Math.abs(vy) * physics.restitution;
			bounced = true;
		}
		const speed = Math.hypot(vx, vy);
		const atRest = y >= b.maxY - 1 && Math.abs(vy) < 1 && Math.abs(vx) < 15 || bounced && speed < 40 && Math.abs(vy) < 1;
		return {
			x,
			y,
			vx,
			vy,
			bounced,
			atRest
		};
	};
	var throwSubsteps = (vx, vy, dt) => {
		const travel = Math.hypot(vx, vy) * Math.min(Math.max(dt, 0), MAX_STEP_DT);
		if (!(travel > 8)) return 1;
		return Math.min(64, Math.ceil(travel / 8));
	};
	var PANEL_STYLE = `
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
	var PANEL_HTML = `
      <button type="button" id="__ds_prompt_toggle">提示词</button>
      <section class="ds-prompt-window" hidden>
        <div class="ds-title">自定义系统提示词</div>
        <label>模板</label>
        <select id="__ds_prompt_select"></select>
        <label>模板名称</label>
        <input id="__ds_prompt_name" placeholder="例如：论文润色">
        <label>提示词内容</label>
        <textarea id="__ds_prompt_text" placeholder="输入希望模型遵循的指令"></textarea>
        <label><input id="__ds_prompt_enabled" type="checkbox" style="width:auto"> 启用后台注入</label>
        <div class="ds-actions">
          <button type="button" id="__ds_prompt_new">新建</button>
          <button type="button" id="__ds_prompt_save">保存模板</button>
          <button type="button" id="__ds_prompt_default">设为默认</button>
          <button type="button" id="__ds_prompt_delete">删除</button>
        </div>
        <div class="ds-status" id="__ds_prompt_status"></div>
      </section>
`;
	var panelRoot = null;
	function ensurePanel() {
		if (panelRoot) return panelRoot;
		const style = document.createElement("style");
		style.textContent = PANEL_STYLE;
		document.documentElement.appendChild(style);
		const root = document.createElement("div");
		root.id = "__ds_prompt_manager";
		root.innerHTML = PANEL_HTML;
		document.body.appendChild(root);
		panelRoot = root;
		const $ = (id) => root.querySelector("#" + id);
		const section = root.querySelector(".ds-prompt-window");
		section.hidden = false;
		$("__ds_prompt_toggle")?.remove();
		let selectedId = state.presets[0]?.id || "";
		function status(text) {
			$("__ds_prompt_status").textContent = text;
		}
		function refreshSelect() {
			const select = $("__ds_prompt_select");
			select.replaceChildren();
			state.presets.forEach((p) => {
				const option = document.createElement("option");
				option.value = p.id;
				option.textContent = p.name;
				select.appendChild(option);
			});
			if (state.presets.some((p) => p.id === selectedId)) select.value = selectedId;
			loadSelected();
		}
		function loadSelected() {
			const p = state.presets.find((p) => p.id === selectedId);
			$("__ds_prompt_name").value = p?.name || "";
			$("__ds_prompt_text").value = p?.prompt || "";
			$("__ds_prompt_enabled").checked = state.enabled;
		}
		const close = document.createElement("button");
		close.type = "button";
		close.id = "__ds_prompt_manager_close";
		close.textContent = "关闭";
		close.style.marginBottom = "10px";
		close.addEventListener("click", () => {
			section.hidden = true;
		});
		section.prepend(close);
		const title = root.querySelector(".ds-title");
		title.style.cursor = "move";
		title.style.userSelect = "none";
		let dragStart = null;
		title.addEventListener("pointerdown", (e) => {
			if (e.button !== 0) return;
			const rect = section.getBoundingClientRect();
			dragStart = {
				dx: e.clientX - rect.left,
				dy: e.clientY - rect.top
			};
			title.setPointerCapture(e.pointerId);
			e.preventDefault();
		});
		title.addEventListener("pointermove", (e) => {
			if (!dragStart) return;
			const left = Math.max(0, Math.min(e.clientX - dragStart.dx, window.innerWidth - section.offsetWidth));
			const top = Math.max(0, Math.min(e.clientY - dragStart.dy, window.innerHeight - section.offsetHeight));
			section.style.left = left + "px";
			section.style.top = top + "px";
			section.style.right = "auto";
			section.style.bottom = "auto";
		});
		title.addEventListener("pointerup", () => {
			dragStart = null;
		});
		title.addEventListener("pointercancel", () => {
			dragStart = null;
		});
		$("__ds_prompt_toggle").addEventListener("click", () => {
			section.hidden = !section.hidden;
			if (!section.hidden) refreshSelect();
		});
		$("__ds_prompt_select").addEventListener("change", (e) => {
			selectedId = e.target.value;
			loadSelected();
		});
		$("__ds_prompt_enabled").addEventListener("change", (e) => {
			state.enabled = e.target.checked;
			save();
			status(state.enabled ? "后台注入已启用" : "后台注入已关闭");
		});
		$("__ds_prompt_new").addEventListener("click", () => {
			selectedId = "p_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
			state.presets.push({
				id: selectedId,
				name: "新模板",
				prompt: ""
			});
			refreshSelect();
			$("__ds_prompt_name").focus();
			status("编辑内容后点击“保存模板”");
		});
		$("__ds_prompt_save").addEventListener("click", () => {
			const p = state.presets.find((p) => p.id === selectedId);
			if (!p) return status("请先新建模板");
			p.name = $("__ds_prompt_name").value.trim() || "未命名模板";
			p.prompt = $("__ds_prompt_text").value;
			state.enabled = $("__ds_prompt_enabled").checked;
			save();
			refreshSelect();
			status("已保存");
		});
		$("__ds_prompt_default").addEventListener("click", () => {
			if (!state.presets.some((p) => p.id === selectedId)) return status("请先选择模板");
			state.defaultId = selectedId;
			save();
			status("默认模板已设置：" + (state.presets.find((p) => p.id === state.defaultId)?.name || ""));
		});
		$("__ds_prompt_delete").addEventListener("click", () => {
			if (!state.presets.some((p) => p.id === selectedId)) return status("没有可删除的模板");
			if (!confirm("确定删除当前模板？")) return;
			state.presets = state.presets.filter((p) => p.id !== selectedId);
			if (state.defaultId === selectedId) state.defaultId = state.presets[0]?.id || "";
			selectedId = state.presets[0]?.id || "";
			save();
			refreshSelect();
			status("已删除");
		});
		refreshSelect();
		return root;
	}
	function openPromptPanel(x, y) {
		const root = ensurePanel();
		const section = root.querySelector(".ds-prompt-window");
		section.hidden = false;
		const width = section.offsetWidth || 420;
		section.style.position = "fixed";
		section.style.right = "auto";
		section.style.bottom = "auto";
		section.style.left = Math.max(8, Math.min(x, window.innerWidth - width - 8)) + "px";
		section.style.top = Math.max(8, Math.min(y, window.innerHeight - 80)) + "px";
		return root;
	}
	function mountPromptButton() {
		if (!document.body) return;
		const root = ensurePanel();
		const toggle = root.querySelector("#__ds_prompt_toggle");
		if (!toggle) return;
		if (root.parentElement !== document.body) document.body.appendChild(root);
		root.style.position = "fixed";
		root.style.right = "24px";
		root.style.bottom = "100px";
		root.style.left = "auto";
		root.style.top = "auto";
		toggle.hidden = false;
	}
	function unmountPromptButton() {
		if (!panelRoot) return;
		const toggle = panelRoot.querySelector("#__ds_prompt_toggle");
		if (toggle) toggle.hidden = true;
		panelRoot.style.position = "";
		panelRoot.style.right = "";
		panelRoot.style.bottom = "";
		panelRoot.querySelector(".ds-prompt-window").hidden = true;
	}
	var ENABLED_KEY = "ds_pet_enabled_v1";
	var isPetEnabled = () => {
		try {
			return GM_getValue(ENABLED_KEY, true) !== false;
		} catch {
			return true;
		}
	};
	var setPetEnabled = (enabled) => {
		try {
			GM_setValue(ENABLED_KEY, !!enabled);
		} catch (e) {
			console.error("[DS大肥鱼] 开关保存失败", e);
		}
	};
	var { HIT_BOX, CANVAS_H, FEET_Y, DRAG_THRESHOLD, SLINGSHOT_DOUBLE_MS } = PET_GEOMETRY;
	var POSITION_KEY = "ds_pet_position_v1";
	var CSS = `
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
			return raw && typeof raw === "object" ? raw : null;
		} catch {
			return null;
		}
	}
	function writePosition(pos) {
		try {
			GM_setValue(POSITION_KEY, pos);
		} catch (e) {
			console.error("[DS大肥鱼] 位置保存失败", e);
		}
	}
	function unmountPet() {
		const root = document.getElementById("__ds_pet_root");
		if (!root) return;
		for (const v of root.querySelectorAll("video")) {
			v.pause();
			v.onended = null;
			v.removeAttribute("src");
			v.load();
		}
		document.getElementById("__ds_pet_menu")?.remove();
		root.remove();
	}
	function mountPet() {
		if (document.getElementById("__ds_pet_root")) return;
		const size = PET_CONFIG.size;
		const halfW = size / 2;
		const halfH = size * 9 / 16 / 2;
		const bottomPad = size * (9 / 16) * (CANVAS_H - FEET_Y) / CANVAS_H;
		const sideAllow = HIT_BOX.x0 / 640 * size;
		const physics = PET_CONFIG.physics ?? DEFAULT_PHYSICS;
		const animations = PET_CONFIG.animations;
		const weights = PET_CONFIG.animationWeights;
		const style = document.createElement("style");
		style.textContent = CSS;
		document.documentElement.appendChild(style);
		const root = document.createElement("div");
		root.id = "__ds_pet_root";
		root.style.setProperty("--ds-pet-size", size + "px");
		const stage = document.createElement("div");
		stage.id = "__ds_pet_stage";
		stage.style.transform = `translateY(${bottomPad}px)`;
		const videoA = document.createElement("video");
		const videoB = document.createElement("video");
		for (const v of [videoA, videoB]) {
			v.className = "ds-pet-video";
			v.muted = true;
			v.playsInline = true;
			v.autoplay = true;
		}
		videoA.classList.add("is-front");
		const hit = document.createElement("div");
		hit.className = "ds-pet-hit";
		hit.style.left = HIT_BOX.x0 / 640 * 100 + "%";
		hit.style.top = HIT_BOX.y0 / 360 * 100 + "%";
		hit.style.width = (HIT_BOX.x1 - HIT_BOX.x0) / 640 * 100 + "%";
		hit.style.height = (HIT_BOX.y1 - HIT_BOX.y0) / 360 * 100 + "%";
		stage.append(videoA, videoB, hit);
		root.appendChild(stage);
		document.body.appendChild(root);
		const saved = readPosition();
		const placeAt = (rx, ry) => {
			root.style.left = rx * window.innerWidth - halfW + "px";
			root.style.top = ry * window.innerHeight - halfH + "px";
			root.style.right = "auto";
			root.style.bottom = "auto";
			customPos = {
				rx,
				ry
			};
		};
		let customPos = null;
		if (saved) placeAt(saved.rx, saved.ry);
		else {
			const { corner, marginX, marginY } = PET_CONFIG.position;
			if (corner === "top-right") {
				root.style.right = marginX + "px";
				root.style.bottom = "auto";
			} else if (corner === "top-left") root.style.left = marginX + "px";
			root.style.top = marginY + "px";
		}
		let anim = animations.idle[0] ?? "";
		let once = true;
		let facing = "left";
		let front = 0;
		let gen = 0;
		let pending = null;
		let pendingSquash = false;
		const animRef = { current: anim };
		const frontEl = () => front === 0 ? videoA : videoB;
		const backEl = () => front === 0 ? videoB : videoA;
		function applyFacing(el) {
			el.style.transform = facing === "right" ? "scaleX(-1)" : "";
		}
		function startSquash(el, depth = SQ_SQUASH) {
			if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
			const t0 = performance.now();
			const origin = el.style.transformOrigin;
			el.style.transformOrigin = "bottom";
			const step = () => {
				const u = Math.min((performance.now() - t0) / 220, 1);
				const scale = squashScale(u, depth);
				el.style.transform = (facing === "right" ? "scaleX(-1) " : "") + "scaleY(" + scale + ")";
				if (u < 1) requestAnimationFrame(step);
				else {
					el.style.transformOrigin = origin;
					el.style.transform = facing === "right" ? "scaleX(-1)" : "";
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
			pending = {
				anim: next,
				once: nextOnce,
				gen: myGen
			};
			const el = backEl();
			el.loop = !nextOnce;
			el.onended = nextOnce ? handleEnded : null;
			loadAnimation(next).then((url) => {
				if (pending?.gen !== myGen) return;
				el.src = url;
				el.load();
				const onReady = () => {
					el.removeEventListener("loadeddata", onReady);
					if (pending?.gen !== myGen) return;
					const old = frontEl();
					el.classList.add("is-front");
					if (old !== el) {
						old.classList.remove("is-front");
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
				el.addEventListener("loadeddata", onReady);
			}).catch((err) => {
				if (pending?.gen === myGen) pending = null;
				log("宠物素材加载失败：" + next + "（" + err.message + "）");
			});
		}
		function pickNext() {
			const k = rollKind(Math.random(), weights, { fixed: false });
			let next;
			if (k === "idle") next = pick(animations.idle, animRef.current);
			else if (k === "turn") next = pick(animations.turn, animRef.current);
			else if (k === "move") {
				if (tryMove() === false) next = pickCategoryAction(animations.categories, animations.idle, facing, animRef.current).name;
				else return;
			} else next = pickCategoryAction(animations.categories, animations.idle, facing, animRef.current).name;
			once = true;
			anim = next;
			animRef.current = next;
			switchTo(next, once);
		}
		function handleEnded(e) {
			const evEl = e?.currentTarget;
			if (evEl && !evEl.classList.contains("is-front")) return;
			if (drag.active) return;
			if (animations.turn.includes(animRef.current)) facing = facing === "left" ? "right" : "left";
			if (animations.drag.includes(animRef.current) || animations.clicks.includes(animRef.current)) {
				const next = pick(animations.idle, animRef.current);
				once = true;
				anim = next;
				animRef.current = next;
				switchTo(next, once);
				return;
			}
			pickNext();
		}
		let pendingMove = null;
		let moveToken = 0;
		let moving = false;
		function tryMove() {
			if (moving || pendingMove || throwRaf !== null) return true;
			const actions = animations.moves.actions;
			if (!actions.length) return false;
			const chosen = actions[Math.floor(Math.random() * actions.length)];
			const params = {
				...animations.moves.default,
				...chosen.params ?? {}
			};
			const dir = facing === "right" ? 1 : -1;
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
				sideAllow
			});
			if (!plan) return false;
			pendingMove = {
				...plan,
				dir,
				leadSec: params.leadSec,
				tailSec: params.tailSec
			};
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
			const travelWindow = Math.max(.1, duration - pm.leadSec - pm.tailSec);
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
				root.style.left = px - halfW + "px";
				root.style.top = py - halfH + "px";
				root.style.right = "auto";
				root.style.bottom = "auto";
				boxPx = {
					x: px - halfW,
					y: py - halfH
				};
				if (!el.paused && !el.ended) requestAnimationFrame(step);
				else {
					moving = false;
					customPos = {
						rx: px / W,
						ry: py / H
					};
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
		let boxPx = null;
		let dragTarget = null;
		let dragVel = {
			vx: 0,
			vy: 0
		};
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
			anchorY: 0
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
				const dt = Math.min((now - last) / 1e3, 1 / 30);
				last = now;
				let x = boxPx?.x ?? 0;
				let y = boxPx?.y ?? 0;
				dragVel.vx = springStep(dragVel.vx, x, dragTarget.x, dt, physics.throwPower);
				dragVel.vy = springStep(dragVel.vy, y, dragTarget.y, dt, physics.throwPower);
				x += dragVel.vx * dt;
				y += dragVel.vy * dt;
				boxPx = {
					x,
					y
				};
				root.style.left = x + "px";
				root.style.top = y + "px";
				root.style.right = "auto";
				root.style.bottom = "auto";
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
			dragVel = {
				vx: 0,
				vy: 0
			};
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
			const bounds = throwBounds({
				W: window.innerWidth,
				H: window.innerHeight,
				size,
				sideAllow
			});
			const token = ++throwToken;
			let state = {
				x: px,
				y: py,
				vx,
				vy
			};
			let last = performance.now();
			let prevGrounded = false;
			const step = () => {
				if (throwToken !== token) return;
				const now = performance.now();
				const dt = (now - last) / 1e3;
				last = now;
				const fallingVy = state.vy;
				const substeps = throwSubsteps(state.vx, state.vy, dt);
				let res = throwStep(state, dt / substeps, bounds, physics);
				for (let i = 1; i < substeps && !res.atRest; i++) res = throwStep(res, dt / substeps, bounds, physics);
				state = {
					x: res.x,
					y: res.y,
					vx: res.vx,
					vy: res.vy
				};
				root.style.left = res.x + "px";
				root.style.top = res.y + "px";
				root.style.right = "auto";
				root.style.bottom = "auto";
				boxPx = {
					x: res.x,
					y: res.y
				};
				customPos = {
					rx: (res.x + halfW) / window.innerWidth,
					ry: (res.y + halfH) / window.innerHeight
				};
				const grounded = res.y >= bounds.maxY - 1;
				if (res.bounced && grounded && !prevGrounded) startSquash(frontEl(), landingSquash(fallingVy));
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
		hit.addEventListener("click", playClick);
		hit.addEventListener("pointerdown", (e) => {
			if (e.button !== 0) return;
			stopThrow();
			stopDragFollow();
			stopMove();
			trail = [];
			hit.classList.add("dragging");
			hit.setPointerCapture(e.pointerId);
			const rect = root.getBoundingClientRect();
			boxPx = {
				x: rect.left,
				y: rect.top
			};
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
				anchorY: boxPx.y + halfH
			});
		});
		hit.addEventListener("pointermove", (e) => {
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
			trail = trimTrail([...trail, {
				t: now,
				x: e.clientX,
				y: e.clientY
			}], now);
			dragTarget = {
				x: e.clientX - drag.offX - halfW,
				y: e.clientY - drag.offY - halfH
			};
			startDragFollow();
			stage.style.transform = "none";
		});
		function endDrag(e) {
			const wasDragging = drag.dragging;
			drag.active = false;
			drag.dragging = false;
			hit.classList.remove("dragging");
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
				const power = slingshotPower(Math.hypot(pullX, pullY), size);
				const v = slingshotVelocity(pullAngle(pullX, pullY), power, physics.throwPower);
				trail = [];
				startThrow(px, py, v.vx, v.vy);
				return;
			}
			const vel = estimateReleaseVelocity(trail, performance.now(), physics);
			trail = [];
			if (vel) startThrow(px, py, vel.vx, vel.vy);
			else {
				customPos = {
					rx: (px + halfW) / window.innerWidth,
					ry: (py + halfH) / window.innerHeight
				};
				writePosition(customPos);
			}
		}
		hit.addEventListener("pointerup", endDrag);
		hit.addEventListener("pointercancel", endDrag);
		let menuEl = null;
		function closeMenu() {
			if (menuEl) {
				menuEl.remove();
				menuEl = null;
			}
		}
		function menuItem(label, onClick) {
			const el = document.createElement("div");
			el.className = "pet-menu-item";
			el.textContent = label;
			el.addEventListener("click", () => {
				closeMenu();
				onClick();
			});
			return el;
		}
		function openMenu(x, y) {
			closeMenu();
			menuEl = document.createElement("div");
			menuEl.id = "__ds_pet_menu";
			menuEl.style.left = Math.min(x, window.innerWidth - 180) + "px";
			menuEl.style.top = Math.min(y, window.innerHeight - 320) + "px";
			const title = document.createElement("div");
			title.className = "pet-menu-title";
			title.textContent = "大肥鱼";
			menuEl.appendChild(title);
			menuEl.appendChild(menuItem("提示词", () => {
				openPromptPanel(x, y);
			}));
			menuEl.appendChild(menuItem("关闭动画", () => {
				setPetEnabled(false);
				unmountPet();
				window.dispatchEvent(new CustomEvent("ds-pet-disabled"));
			}));
			menuEl.appendChild(menuItem("回到初始位置", () => {
				customPos = null;
				root.style.left = "auto";
				root.style.right = PET_CONFIG.position.marginX + "px";
				root.style.top = PET_CONFIG.position.marginY + "px";
				root.style.bottom = "auto";
				boxPx = null;
				try {
					GM_setValue(POSITION_KEY, null);
				} catch {}
			}));
			document.body.appendChild(menuEl);
			setTimeout(() => {
				const onDown = (ev) => {
					if (menuEl && !menuEl.contains(ev.target)) {
						closeMenu();
						document.removeEventListener("pointerdown", onDown, true);
					}
				};
				document.addEventListener("pointerdown", onDown, true);
			}, 0);
		}
		hit.addEventListener("contextmenu", (e) => {
			e.preventDefault();
			openMenu(e.clientX, e.clientY);
		});
		window.addEventListener("resize", () => {
			if (customPos) placeAt(customPos.rx, customPos.ry);
			closeMenu();
		});
		switchTo(anim, once);
		log("宠物已启动");
	}
	(() => {
		"use strict";
		installInterceptors(typeof unsafeWindow !== "undefined" ? unsafeWindow : window);
		const syncEntry = () => {
			if (isPetEnabled()) {
				unmountPromptButton();
				mountPet();
			} else {
				unmountPet();
				mountPromptButton();
			}
		};
		new MutationObserver(() => {
			if (!document.body) return;
			syncEntry();
		}).observe(document.documentElement, {
			childList: true,
			subtree: true
		});
		if (document.body) syncEntry();
		document.addEventListener("dblclick", (e) => {
			if (e.target?.id === "__ds_prompt_toggle" && !isPetEnabled()) {
				setPetEnabled(true);
				syncEntry();
			}
		});
		window.addEventListener("ds-pet-disabled", syncEntry);
		log("脚本已启动；当前默认模板：", state.defaultId);
	})();
})();
