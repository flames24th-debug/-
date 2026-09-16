// ===================== 데이터 정의 =====================

const RARITY = {
  common:   { label: "흔함",   color: "#9fd3ff" },
  uncommon: { label: "보통",   color: "#4ee08a" },
  rare:     { label: "희귀",   color: "#35a7ff" },
  legendary:{ label: "전설",   color: "#ffcc4d" },
};

// difficulty: 0(쉬움) ~ 1(어려움) - 릴링 시 얼마나 힘들게 당기는가
const FISH_LIST = [
  { id: "sardine",  name: "정어리",   icon: "🐟", rarity: "common",   value: 12,  minW: 0.1, maxW: 0.4, difficulty: 0.1 },
  { id: "bream",    name: "붕어",     icon: "🐠", rarity: "common",   value: 18,  minW: 0.3, maxW: 1.2, difficulty: 0.15 },
  { id: "mackerel", name: "고등어",   icon: "🐟", rarity: "common",   value: 22,  minW: 0.4, maxW: 1.5, difficulty: 0.2 },
  { id: "trout",    name: "송어",     icon: "🐡", rarity: "uncommon", value: 45,  minW: 0.8, maxW: 2.5, difficulty: 0.35 },
  { id: "bass",     name: "농어",     icon: "🐠", rarity: "uncommon", value: 60,  minW: 1.0, maxW: 3.5, difficulty: 0.4 },
  { id: "eel",      name: "장어",     icon: "🐍", rarity: "uncommon", value: 70,  minW: 0.5, maxW: 2.0, difficulty: 0.5 },
  { id: "tuna",     name: "참치",     icon: "🐟", rarity: "rare",     value: 150, minW: 5,   maxW: 20,  difficulty: 0.65 },
  { id: "salmon",   name: "연어",     icon: "🐠", rarity: "rare",     value: 130, minW: 2,   maxW: 8,   difficulty: 0.6 },
  { id: "shark",    name: "상어",     icon: "🦈", rarity: "legendary",value: 500, minW: 30,  maxW: 120, difficulty: 0.85 },
  { id: "golden",   name: "황금잉어", icon: "🐉", rarity: "legendary",value: 800, minW: 3,   maxW: 10,  difficulty: 0.9 },
];

const RARITY_BASE_WEIGHTS = { common: 55, uncommon: 28, rare: 13, legendary: 4 };

const ROD_LIST = [
  { id: "wood",   name: "나무 낚싯대",   price: 0,    power: 0.3, tensionMax: 100, reelSpeed: 26, tensionGain: 34, desc: "기본 낚싯대" },
  { id: "carbon", name: "카본 낚싯대",   price: 300,  power: 0.55,tensionMax: 120, reelSpeed: 30, tensionGain: 28, desc: "가볍고 튼튼함" },
  { id: "pro",    name: "프로 낚싯대",   price: 1200, power: 0.75,tensionMax: 145, reelSpeed: 34, tensionGain: 22, desc: "전문가용" },
  { id: "legend", name: "전설의 낚싯대", price: 4000, power: 1.0, tensionMax: 175, reelSpeed: 40, tensionGain: 17, desc: "최고급 장비" },
];

const BAIT_LIST = [
  { id: "worm",   name: "지렁이",  price: 0,  rareBonus: 0,   infinite: true,  desc: "기본 미끼" },
  { id: "shrimp", name: "새우",    price: 15, rareBonus: 12,  infinite: false, desc: "희귀 확률 +12%p" },
  { id: "dough",  name: "떡밥",    price: 40, rareBonus: 25,  infinite: false, desc: "희귀 확률 +25%p" },
  { id: "premium",name: "특급 미끼",price: 90, rareBonus: 45,  infinite: false, desc: "희귀 확률 +45%p" },
];

// ===================== 저장 데이터 =====================

const SAVE_KEY = "fishingGameSave_v1";

function defaultState() {
  const bagOfBaits = {};
  BAIT_LIST.forEach(b => bagOfBaits[b.id] = b.infinite ? Infinity : 0);
  return {
    money: 50,
    rodId: "wood",
    ownedRods: ["wood"],
    baitId: "worm",
    baitBag: bagOfBaits,
    dex: {}, // fishId -> { caught: count, bestWeight: number }
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const base = defaultState();
    return Object.assign(base, parsed, {
      baitBag: Object.assign(base.baitBag, parsed.baitBag || {}),
      dex: parsed.dex || {},
    });
  } catch (e) {
    return defaultState();
  }
}

function saveState() {
  const toSave = JSON.parse(JSON.stringify(state, (k, v) => (v === Infinity ? "Infinity" : v)));
  // restore Infinity markers on the fly not needed since we re-derive infinite baits on load
  localStorage.setItem(SAVE_KEY, JSON.stringify(toSave));
}

let state = loadState();

function getRod() { return ROD_LIST.find(r => r.id === state.rodId); }
function getBait() { return BAIT_LIST.find(b => b.id === state.baitId); }

// ===================== 캔버스 / 렌더링 =====================

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width, H = canvas.height;
const WATER_Y = H * 0.55;
const ROD_TIP = { x: 90, y: WATER_Y - 70 };
const CAST_MIN_X = ROD_TIP.x + 60;
const CAST_MAX_X = W - 60;

let waveT = 0;

function drawScene(dtSec) {
  waveT += dtSec;

  // sky
  const skyGrad = ctx.createLinearGradient(0, 0, 0, WATER_Y);
  skyGrad.addColorStop(0, "#1c3d63");
  skyGrad.addColorStop(1, "#4a8fc7");
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, WATER_Y);

  // sun
  ctx.beginPath();
  ctx.fillStyle = "#ffe9a8";
  ctx.arc(W - 100, 70, 34, 0, Math.PI * 2);
  ctx.fill();

  // water
  const waterGrad = ctx.createLinearGradient(0, WATER_Y, 0, H);
  waterGrad.addColorStop(0, "#1c6f9e");
  waterGrad.addColorStop(1, "#0a2f47");
  ctx.fillStyle = waterGrad;
  ctx.fillRect(0, WATER_Y, W, H - WATER_Y);

  // waves
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 2;
  for (let row = 0; row < 4; row++) {
    const y = WATER_Y + 20 + row * 24;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 10) {
      const yy = y + Math.sin((x * 0.03) + waveT * 2 + row) * 3;
      if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }

  // dock
  ctx.fillStyle = "#5b3a22";
  ctx.fillRect(0, WATER_Y - 18, ROD_TIP.x + 40, 22);
  ctx.fillStyle = "#42290f";
  for (let x = 10; x < ROD_TIP.x + 40; x += 26) {
    ctx.fillRect(x, WATER_Y - 18, 6, 40);
  }

  // angler (simple stick figure)
  ctx.strokeStyle = "#eee0c8";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  const px = 55, py = WATER_Y - 20;
  ctx.beginPath();
  ctx.moveTo(px, py); ctx.lineTo(px, py - 40); // body
  ctx.moveTo(px, py - 32); ctx.lineTo(px + 25, py - 55); // arm to rod
  ctx.stroke();
  ctx.beginPath();
  ctx.fillStyle = "#eee0c8";
  ctx.arc(px, py - 48, 9, 0, Math.PI * 2); // head
  ctx.fill();

  // rod
  ctx.strokeStyle = "#3a2b1a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(px + 25, py - 55);
  ctx.lineTo(ROD_TIP.x, ROD_TIP.y);
  ctx.stroke();

  // fishing line + bobber
  if (game.state !== "idle") {
    const bx = game.bobber.x;
    const by = game.bobber.y;
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(ROD_TIP.x, ROD_TIP.y);
    ctx.lineTo(bx, by);
    ctx.stroke();

    // bobber
    ctx.beginPath();
    ctx.fillStyle = "#ff4d4d";
    ctx.arc(bx, by, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = "#fff";
    ctx.arc(bx, by - 4, 4, 0, Math.PI * 2);
    ctx.fill();

    if (game.state === "reeling" && game.hookedFish) {
      // fish silhouette near bobber, thrashing
      const jitter = Math.sin(waveT * 20) * 4;
      ctx.font = "24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(game.hookedFish.fish.icon, bx, by + 30 + jitter);
    }
  }

  requestAnimationFrame(loop);
}

let lastTime = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  game.tick(dt);
  drawScene(dt);
}

// ===================== 게임 로직 =====================

const el = {
  moneyValue: document.getElementById("moneyValue"),
  rodValue: document.getElementById("rodValue"),
  statusText: document.getElementById("statusText"),
  actionBtn: document.getElementById("actionBtn"),
  baitSelect: document.getElementById("baitSelect"),
  powerMeterWrap: document.getElementById("powerMeterWrap"),
  powerMeterFill: document.getElementById("powerMeterFill"),
  reelingUI: document.getElementById("reelingUI"),
  surgeWarning: document.getElementById("surgeWarning"),
  tensionFill: document.getElementById("tensionFill"),
  distanceFill: document.getElementById("distanceFill"),
  bigMessage: document.getElementById("bigMessage"),
  rodShopList: document.getElementById("rodShopList"),
  baitShopList: document.getElementById("baitShopList"),
  dexList: document.getElementById("dexList"),
};

function pickWeighted(items, weightFn) {
  const total = items.reduce((s, it) => s + weightFn(it), 0);
  let r = Math.random() * total;
  for (const it of items) {
    r -= weightFn(it);
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}

function chooseFish() {
  const bait = getBait();
  const weights = Object.assign({}, RARITY_BASE_WEIGHTS);
  // bait rareBonus shifts weight from common into rare/legendary
  const bonus = bait.rareBonus;
  weights.common = Math.max(5, weights.common - bonus);
  weights.rare += bonus * 0.6;
  weights.legendary += bonus * 0.4;

  const rarityRoll = pickWeighted(Object.keys(weights), r => weights[r]);
  const candidates = FISH_LIST.filter(f => f.rarity === rarityRoll);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function showBigMessage(text, ms = 1100) {
  el.bigMessage.textContent = text;
  el.bigMessage.classList.remove("hidden");
  // restart animation
  el.bigMessage.style.animation = "none";
  void el.bigMessage.offsetWidth;
  el.bigMessage.style.animation = "";
  clearTimeout(showBigMessage._t);
  showBigMessage._t = setTimeout(() => el.bigMessage.classList.add("hidden"), ms);
}

const game = {
  state: "idle", // idle | casting | waiting | bite | reeling
  power: 0,
  powerDir: 1,
  bobber: { x: ROD_TIP.x, y: ROD_TIP.y },
  waitTimer: 0,
  biteWindow: 0,
  hookedFish: null, // { fish, castPower }
  reel: { tension: 0, distance: 0, holding: false, surgeTimer: 0, surgeActive: false },

  startCasting() {
    if (this.state !== "idle") return;
    this.state = "casting";
    this.power = 0;
    this.powerDir = 1;
    el.powerMeterWrap.classList.remove("hidden");
    el.statusText.textContent = "파워가 오르내릴 때 버튼을 눌러 캐스팅하세요!";
    el.actionBtn.textContent = "캐스팅!";
  },

  lockCasting() {
    if (this.state !== "casting") return;
    el.powerMeterWrap.classList.add("hidden");
    const rod = getRod();
    const castPower = this.power / 100; // 0..1
    const targetX = CAST_MIN_X + (CAST_MAX_X - CAST_MIN_X) * castPower * (0.5 + rod.power * 0.5);
    this.bobber.x = ROD_TIP.x;
    this.bobber.y = ROD_TIP.y;
    this._castTargetX = Math.min(CAST_MAX_X, targetX);
    this._castProgress = 0;
    this.state = "flying";
    el.actionBtn.disabled = true;
    el.statusText.textContent = "낚싯줄을 던지는 중...";
  },

  beginWaiting() {
    this.state = "waiting";
    const bait = getBait();
    const baseWait = 2.5 + Math.random() * 3.5;
    this.waitTimer = Math.max(1, baseWait - bait.rareBonus * 0.01);
    el.actionBtn.disabled = true;
    el.statusText.textContent = "입질을 기다리는 중...";
  },

  triggerBite() {
    this.state = "bite";
    this.hookedFish = { fish: chooseFish() };
    const rod = getRod();
    this.biteWindow = 0.55 + rod.power * 0.5; // seconds to react
    el.actionBtn.disabled = false;
    el.actionBtn.textContent = "챔질!";
    el.statusText.textContent = "입질이다! 지금 챔질하세요!!";
    showBigMessage("입질!", 700);
  },

  hookSet(success) {
    if (success) {
      this.state = "reeling";
      const fish = this.hookedFish.fish;
      const rod = getRod();
      this.reel.tension = 20;
      this.reel.distance = 100;
      this.reel.holding = false;
      this.reel.surgeTimer = 1 + Math.random() * 2;
      this.reel.surgeActive = false;
      this._fishDifficulty = fish.difficulty;
      el.reelingUI.classList.remove("hidden");
      el.surgeWarning.classList.add("hidden");
      el.actionBtn.textContent = "릴 감기 (누르고 있기)";
      el.statusText.textContent = `${fish.name}(이)가 걸렸다! 릴을 감아 끌어당기세요.`;
    } else {
      this.failCatch("타이밍을 놓쳐 물고기가 도망갔습니다.");
    }
  },

  finishReelSuccess() {
    if (this.reel.holding) ignoreNextClick = true;
    const fish = this.hookedFish.fish;
    const weight = (fish.minW + Math.random() * (fish.maxW - fish.minW));
    const rec = state.dex[fish.id] || { caught: 0, bestWeight: 0 };
    rec.caught += 1;
    rec.bestWeight = Math.max(rec.bestWeight, weight);
    state.dex[fish.id] = rec;
    const earned = Math.round(fish.value * (0.8 + weight / fish.maxW * 0.6));
    state.money += earned;
    saveState();
    updateHeader();
    renderDex();
    showBigMessage(`${fish.icon} ${fish.name} 포획!\n+${earned}원`, 1500);
    el.statusText.textContent = `${fish.name} (${weight.toFixed(2)}kg) 포획! +${earned}원`;
    this.resetToIdle();
  },

  failCatch(msg) {
    if (this.reel.holding) ignoreNextClick = true;
    showBigMessage("놓쳤다...", 1000);
    el.statusText.textContent = msg + " 다시 던져보세요.";
    this.resetToIdle();
  },

  resetToIdle() {
    this.state = "idle";
    this.hookedFish = null;
    this.bobber.x = ROD_TIP.x;
    this.bobber.y = ROD_TIP.y;
    el.reelingUI.classList.add("hidden");
    el.powerMeterWrap.classList.add("hidden");
    el.actionBtn.disabled = false;
    el.actionBtn.textContent = "낚싯대 던지기";
  },

  tick(dt) {
    if (this.state === "casting") {
      this.power += this.powerDir * dt * 140;
      if (this.power >= 100) { this.power = 100; this.powerDir = -1; }
      if (this.power <= 0) { this.power = 0; this.powerDir = 1; }
      el.powerMeterFill.style.width = this.power + "%";
    } else if (this.state === "flying") {
      this._castProgress += dt * 2.2;
      const t = Math.min(1, this._castProgress);
      this.bobber.x = ROD_TIP.x + (this._castTargetX - ROD_TIP.x) * t;
      this.bobber.y = ROD_TIP.y + (WATER_Y - ROD_TIP.y) * t + Math.sin(t * Math.PI) * -30;
      if (t >= 1) {
        this.bobber.y = WATER_Y;
        this.beginWaiting();
      }
    } else if (this.state === "waiting") {
      this.bobber.y = WATER_Y + Math.sin(waveT * 2) * 3;
      this.waitTimer -= dt;
      if (this.waitTimer <= 0) this.triggerBite();
    } else if (this.state === "bite") {
      this.bobber.y = WATER_Y + 10 + Math.sin(waveT * 30) * 4;
      this.biteWindow -= dt;
      if (this.biteWindow <= 0) this.hookSet(false);
    } else if (this.state === "reeling") {
      this.tickReel(dt);
    }
  },

  tickReel(dt) {
    const r = this.reel;
    const diff = this._fishDifficulty;
    const rod = getRod();

    // fish surge events: fish fights back hard for a short burst, then rests
    r.surgeTimer -= dt;
    if (r.surgeTimer <= 0) {
      r.surgeActive = !r.surgeActive;
      r.surgeTimer = r.surgeActive ? (0.4 + Math.random() * 0.5) : (1 + Math.random() * 2.2);
    }

    const effReel = rod.reelSpeed * (1 - diff * 0.35);
    const basePull = 6 + diff * 10;
    const tensionGainHold = rod.tensionGain * (0.18 + diff * 0.22);
    const surgeTensionMult = r.surgeActive ? 3.0 : 1.0;
    const surgePullMult = r.surgeActive ? 2.0 : 1.0;

    if (r.holding) {
      r.distance -= effReel * dt;
      r.tension += tensionGainHold * surgeTensionMult * dt;
    } else {
      r.distance += basePull * surgePullMult * dt;
      r.tension -= 30 * dt;
    }
    // passive fish pull always adds a bit of tension during a surge, even if not reeling
    if (r.surgeActive) r.tension += 4 * diff * dt;

    r.tension = Math.max(0, Math.min(rod.tensionMax, r.tension));
    r.distance = Math.max(0, Math.min(100, r.distance));

    // update bobber position based on distance (closer = nearer to rod tip)
    const t = 1 - r.distance / 100;
    this.bobber.x = ROD_TIP.x + (this._castTargetX - ROD_TIP.x) * (1 - t * 0.85);
    this.bobber.y = WATER_Y + Math.sin(waveT * 25) * 3;

    el.tensionFill.style.width = (r.tension / rod.tensionMax * 100) + "%";
    el.distanceFill.style.width = (100 - r.distance) + "%";
    el.surgeWarning.classList.toggle("hidden", !r.surgeActive);

    if (r.tension >= rod.tensionMax) {
      this.failCatch("낚싯줄이 끊어졌습니다!");
    } else if (r.distance <= 0) {
      this.finishReelSuccess();
    }
  },
};

// ===================== 입력 처리 =====================

let ignoreNextClick = false;

el.actionBtn.addEventListener("click", () => {
  if (ignoreNextClick) { ignoreNextClick = false; return; }
  if (game.state === "idle") {
    game.startCasting();
  } else if (game.state === "casting") {
    game.lockCasting();
  } else if (game.state === "bite") {
    game.hookSet(true);
  }
});

function reelDown(ev) {
  if (game.state === "reeling") {
    ev.preventDefault();
    game.reel.holding = true;
  }
}
function reelUp() {
  game.reel.holding = false;
}
el.actionBtn.addEventListener("mousedown", reelDown);
el.actionBtn.addEventListener("touchstart", reelDown, { passive: false });
window.addEventListener("mouseup", reelUp);
window.addEventListener("touchend", reelUp);

window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    if (game.state === "idle") game.startCasting();
    else if (game.state === "casting") game.lockCasting();
    else if (game.state === "bite") game.hookSet(true);
    else if (game.state === "reeling") game.reel.holding = true;
  }
});
window.addEventListener("keyup", (e) => {
  if (e.code === "Space" && game.state === "reeling") game.reel.holding = false;
});

// ===================== 탭 전환 =====================

document.querySelectorAll(".tabBtn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tabBtn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("panel-" + btn.dataset.tab).classList.add("active");
  });
});

// ===================== UI 렌더링 =====================

function updateHeader() {
  el.moneyValue.textContent = state.money.toLocaleString();
  el.rodValue.textContent = getRod().name;
}

function renderBaitSelect() {
  el.baitSelect.innerHTML = "";
  BAIT_LIST.forEach(b => {
    const count = state.baitBag[b.id];
    const owned = b.infinite || count > 0;
    if (!owned) return;
    const opt = document.createElement("option");
    opt.value = b.id;
    opt.textContent = b.infinite ? `${b.name} (무한)` : `${b.name} (${count}개)`;
    el.baitSelect.appendChild(opt);
  });
  el.baitSelect.value = state.baitId;
}

el.baitSelect.addEventListener("change", () => {
  state.baitId = el.baitSelect.value;
  saveState();
});

function renderShop() {
  el.rodShopList.innerHTML = "";
  ROD_LIST.forEach(rod => {
    const owned = state.ownedRods.includes(rod.id);
    const equipped = state.rodId === rod.id;
    const div = document.createElement("div");
    div.className = "shopItem" + (owned ? " owned" : "") + (equipped ? " equipped" : "");
    div.innerHTML = `
      <div class="info">
        <span class="name">${rod.name}</span>
        <span class="desc">${rod.desc} · 파워${Math.round(rod.power*100)} · 최대텐션${rod.tensionMax}</span>
      </div>
    `;
    const btn = document.createElement("button");
    if (equipped) {
      btn.textContent = "장착중";
      btn.disabled = true;
    } else if (owned) {
      btn.textContent = "장착";
      btn.addEventListener("click", () => {
        state.rodId = rod.id;
        saveState();
        updateHeader();
        renderShop();
      });
    } else {
      btn.textContent = `구매 (${rod.price}원)`;
      btn.disabled = state.money < rod.price;
      btn.addEventListener("click", () => {
        if (state.money < rod.price) return;
        state.money -= rod.price;
        state.ownedRods.push(rod.id);
        state.rodId = rod.id;
        saveState();
        updateHeader();
        renderShop();
      });
    }
    div.appendChild(btn);
    el.rodShopList.appendChild(div);
  });

  el.baitShopList.innerHTML = "";
  BAIT_LIST.filter(b => !b.infinite).forEach(bait => {
    const div = document.createElement("div");
    div.className = "shopItem";
    div.innerHTML = `
      <div class="info">
        <span class="name">${bait.name}</span>
        <span class="desc">${bait.desc} · 보유 ${state.baitBag[bait.id]}개</span>
      </div>
    `;
    const btn = document.createElement("button");
    btn.textContent = `구매 (${bait.price}원)`;
    btn.disabled = state.money < bait.price;
    btn.addEventListener("click", () => {
      if (state.money < bait.price) return;
      state.money -= bait.price;
      state.baitBag[bait.id] = (state.baitBag[bait.id] || 0) + 1;
      saveState();
      updateHeader();
      renderShop();
      renderBaitSelect();
    });
    div.appendChild(btn);
    el.baitShopList.appendChild(div);
  });
}

function renderDex() {
  el.dexList.innerHTML = "";
  FISH_LIST.forEach(fish => {
    const rec = state.dex[fish.id];
    const div = document.createElement("div");
    div.className = "dexItem" + (rec ? "" : " locked");
    div.innerHTML = `
      <div class="icon">${rec ? fish.icon : "❔"}</div>
      <div class="name">${rec ? fish.name : "???"}</div>
      <div class="rarity" style="color:${RARITY[fish.rarity].color}">${RARITY[fish.rarity].label}</div>
      <div class="count">${rec ? `${rec.caught}마리 · 최고 ${rec.bestWeight.toFixed(2)}kg` : "미포획"}</div>
    `;
    el.dexList.appendChild(div);
  });
}

// bait selection needs to fall back if selected bait ran out
function ensureValidBaitSelection() {
  const b = getBait();
  if (!b.infinite && state.baitBag[b.id] <= 0) {
    state.baitId = "worm";
  }
}

// consume bait on cast lock (hook into lockCasting)
const _origLockCasting = game.lockCasting.bind(game);
game.lockCasting = function () {
  if (this.state !== "casting") return;
  const bait = getBait();
  if (!bait.infinite) {
    if (state.baitBag[bait.id] <= 0) {
      state.baitId = "worm";
    } else {
      state.baitBag[bait.id] -= 1;
      saveState();
      renderBaitSelect();
      renderShop();
    }
  }
  _origLockCasting();
};

// ===================== 초기화 =====================

updateHeader();
renderBaitSelect();
renderShop();
renderDex();
requestAnimationFrame(loop);
