"use strict";
/* =========================================================================
   PIXEL DASH — a complete 16-bit style platformer in one file, no deps.
   Art, levels, sound and music are all generated in code.
   ========================================================================= */

// ------------------------------------------------------------------ setup
const cvs = document.getElementById("game");
const ctx = cvs.getContext("2d");
ctx.imageSmoothingEnabled = false;

const VW = 480, VH = 272;          // internal resolution
const T = 16, ROWS = 17;           // tile size / level rows (272px = 17 tiles)
const STEP = 1 / 60;               // fixed physics step

function fitScreen() {
  let s = Math.min(Math.floor(innerWidth / VW), Math.floor(innerHeight / VH));
  if (s < 1) s = Math.min(innerWidth / VW, innerHeight / VH);
  cvs.style.width = VW * s + "px";
  cvs.style.height = VH * s + "px";
}
addEventListener("resize", fitScreen); fitScreen();

// ------------------------------------------------------------------ player name (title screen)
let playerName = "PLAYER";
try { playerName = (localStorage.getItem("pixeldash_name") || "PLAYER").toUpperCase(); } catch (e) {}
const titleUI = document.getElementById("titleUI");
const nameInput = document.getElementById("nameInput");
const startBtn = document.getElementById("startBtn");
nameInput.value = playerName === "PLAYER" ? "" : playerName;
function beginFromTitle() {
  initAudio();
  const n = (nameInput.value || "").trim().toUpperCase().slice(0, 12);
  playerName = n || "PLAYER";
  try { localStorage.setItem("pixeldash_name", playerName); } catch (e) {}
  nameInput.blur();
  startBtn.blur();
  for (const k of Object.keys(keys)) keys[k] = false;   // no stuck keys from typing
  jumpEdge = false;
  startGame();
}
startBtn.addEventListener("click", beginFromTitle);
nameInput.addEventListener("keydown", e => {
  if (e.key === "Enter") { e.stopPropagation(); beginFromTitle(); }
});

// ---- CHG button (in-HUD name change) ----
const CHG = { x: 368, y: 7, w: 20, h: 15 };
const nameModal = document.getElementById("nameModal");
const nameModalInput = document.getElementById("nameModalInput");
let namePopupOpen = false;
let nameFlash = 0;
function openNamePopup() {
  if (state !== PLAY || paused || namePopupOpen) return;
  namePopupOpen = true;
  nameModalInput.value = playerName === "PLAYER" ? "" : playerName;
  nameModal.classList.remove("hidden");
  SFX.pause();
  setTimeout(() => nameModalInput.focus(), 60);
}
function closeNamePopup(save) {
  if (!namePopupOpen) return;
  if (save) {
    const n = (nameModalInput.value || "").trim().toUpperCase().slice(0, 12);
    if (n && n !== playerName) {
      playerName = n;
      try { localStorage.setItem("pixeldash_name", n); } catch (e) {}
      nameFlash = 50;
      SFX.power();
    } else SFX.bump();
  } else SFX.bump();
  namePopupOpen = false;
  nameModal.classList.add("hidden");
  nameModalInput.blur();
  for (const k of Object.keys(keys)) keys[k] = false;
  jumpEdge = false;
}
document.getElementById("nameSave").addEventListener("click", () => closeNamePopup(true));
document.getElementById("nameCancel").addEventListener("click", () => closeNamePopup(false));
nameModalInput.addEventListener("keydown", e => {
  e.stopPropagation();
  if (e.key === "Enter") closeNamePopup(true);
  if (e.key === "Escape") closeNamePopup(false);
});
function canvasPoint(e) {
  const r = cvs.getBoundingClientRect();
  return { x: (e.clientX - r.left) / r.width * VW, y: (e.clientY - r.top) / r.height * VH };
}
cvs.addEventListener("click", e => {
  const p = canvasPoint(e);
  if (state === PLAY && !paused && !namePopupOpen &&
      p.x >= CHG.x && p.x <= CHG.x + CHG.w && p.y >= CHG.y && p.y <= CHG.y + CHG.h) {
    initAudio();
    openNamePopup();
  }
});
cvs.addEventListener("mousemove", e => {
  const p = canvasPoint(e);
  const over = state === PLAY && !paused && !namePopupOpen &&
    p.x >= CHG.x && p.x <= CHG.x + CHG.w && p.y >= CHG.y && p.y <= CHG.y + CHG.h;
  cvs.style.cursor = over ? "pointer" : "default";
});

// ------------------------------------------------------------------ levels
// legend:  . air   # ground  B brick  ? coin-block  M mushroom-block  ! star-block
//          H shield-block   D pipe lip  I pipe body  V pipe lip + piranha
//          o coin  g goomba  k koopa  P start  F flag
function mkLevel(name, w) {
  const rows = Array.from({ length: ROWS }, () => Array(w).fill("."));
  const L = {
    name, w, rows,
    put(x, y, s) { for (let i = 0; i < s.length; i++) if (s[i] !== ".") rows[y][x + i] = s[i]; return L; },
    ground(a, b) { for (let y = 15; y < ROWS; y++) for (let x = a; x <= b; x++) rows[y][x] = "#"; return L; },
    pit(a, b) { for (let y = 15; y < ROWS; y++) for (let x = a; x <= b; x++) rows[y][x] = "."; return L; },
    stairUp(x0, n)   { for (let i = 0; i < n; i++) for (let y = 14; y > 14 - (i + 1); y--) rows[y][x0 + i] = "#"; return L; },
    stairDown(x0, n) { for (let i = 0; i < n; i++) for (let y = 14; y > 14 - (n - i); y--) rows[y][x0 + i] = "#"; return L; },
    pipe(x, h, plant) {
      const lipY = 15 - h;
      rows[lipY][x] = plant ? "V" : "D"; rows[lipY][x + 1] = "D";
      for (let y = lipY + 1; y <= 14; y++) { rows[y][x] = "I"; rows[y][x + 1] = "I"; }
      return L;
    },
  };
  return L;
}

// --- World 1-1 : introduction ---
const LEVEL1 = mkLevel("1-1", 140)
  .ground(0, 139).pit(56, 58).pit(84, 86)
  .put(3, 14, "P")
  .put(16, 12, "oooo").put(116, 12, "oooo")
  .put(48, 10, "ooooo")
  .put(62, 8, "oooo")
  .put(20, 11, "B??B").put(38, 11, "BMBB").put(62, 11, "BBBB").put(90, 11, "?!H")
  .stairUp(74, 4)
  .pipe(30, 2).pipe(110, 2, true)
  .put(26, 14, "g").put(45, 14, "g").put(68, 14, "g").put(96, 14, "g").put(98, 14, "g")
  .put(104, 14, "k")
  .put(134, 14, "F");

// --- World 1-2 : more platforms, faster enemies, piranhas ---
const LEVEL2 = mkLevel("1-2", 170)
  .ground(0, 169).pit(18, 20).pit(40, 51).pit(79, 81).pit(128, 131)
  .put(3, 14, "P")
  .put(12, 11, "?").put(14, 11, "?")
  .pipe(26, 3, true)
  .put(43, 12, "BBB").put(48, 10, "BBB")
  .put(43, 10, "ooo").put(48, 8, "ooo")
  .put(60, 11, "M")
  .put(88, 12, "ooooo")
  .put(96, 11, "?!?")
  .pipe(104, 3, true)
  .put(120, 11, "BBBB").put(120, 8, "oooo")
  .put(136, 11, "?H?")
  .stairUp(74, 4).stairDown(82, 4)
  .stairUp(148, 6)
  .put(32, 14, "g").put(36, 14, "k").put(64, 14, "g").put(66, 14, "g")
  .put(70, 14, "k").put(110, 14, "k").put(114, 14, "g").put(116, 14, "g")
  .put(142, 14, "g").put(144, 14, "g")
  .put(162, 14, "F");

// --- World 1-3 : expert — tight timing, many enemies ---
const LEVEL3 = mkLevel("1-3", 200)
  .ground(0, 199).pit(12, 27).pit(67, 69).pit(75, 77).pit(112, 121).pit(152, 155)
  .put(3, 14, "P")
  .put(8, 11, "?")
  .put(15, 12, "BB").put(19, 9, "BB").put(23, 12, "BB")
  .put(15, 10, "oo").put(19, 7, "oo")
  .pipe(42, 3, true)
  .put(48, 11, "?!?")
  .pipe(98, 2, true)
  .put(104, 11, "BMBB").put(104, 8, "oooo")
  .put(114, 11, "BB").put(118, 9, "BB")
  .put(114, 9, "oo").put(118, 7, "oo")
  .put(80, 12, "ooooo").put(158, 12, "ooooo")
  .put(138, 11, "?H?")
  .stairUp(62, 4).stairDown(70, 4).stairUp(144, 6).stairUp(178, 6)
  .put(32, 14, "g").put(34, 14, "g").put(38, 14, "k")
  .put(54, 14, "g").put(56, 14, "g").put(58, 14, "g")
  .put(88, 14, "k").put(92, 14, "g").put(94, 14, "g")
  .put(126, 14, "k").put(130, 14, "g").put(132, 14, "g").put(134, 14, "g")
  .put(166, 14, "g").put(168, 14, "g").put(170, 14, "g").put(174, 14, "k")
  .put(190, 14, "F");

const LEVELS = [LEVEL1, LEVEL2, LEVEL3];

// ------------------------------------------------------------------ world state
const TL_EMPTY = 0, TL_GROUND = 1, TL_BRICK = 2, TL_QCOIN = 3, TL_QMUSH = 4, TL_QSTAR = 5,
      TL_USED = 6, TL_QSHIELD = 7, TL_PIPE_LIP = 8, TL_PIPE_BODY = 9;
const SOLID = t => t >= 1 && t <= 9;

let grid = [], level = null, levelW = 0;
let coins = [], enemies = [], items = [], popups = [], parts = [], bumps = [], plants = [];
let flag = null, spawn = { x: 40, y: 200 };
let score = 0, lives = 3, coinCount = 0, worldIx = 0, timeLeft = 300, timeTick = 0;
let camX = 0, shake = 0, frame = 0, state = 0, stateT = 0;
let flagAnim = null, hintT = 0;
let highScore = 0;
try { highScore = parseInt(localStorage.getItem("pixeldash_hs") || "0", 10) || 0; } catch (e) {}

const TITLE = 0, PLAY = 1, FLAGSEQ = 2, COMPLETE = 3, DEAD = 4, OVER = 5, WIN = 6;
let paused = false;
let muted = false;

const player = {
  x: 0, y: 0, vx: 0, vy: 0, w: 10, h: 22, face: 1,
  grounded: false, coyote: 0, jbuf: 0, animT: 0,
  dead: false, star: 0, shield: false, iFrames: 0,
};

function loadLevel(ix) {
  worldIx = ix;
  level = LEVELS[ix];
  levelW = level.w * T;
  grid = [];
  coins = []; enemies = []; items = []; popups = []; parts = []; bumps = []; plants = [];
  flagAnim = null;
  timeLeft = 300; timeTick = 0; hintT = 0; coinCount = 0;
  for (let y = 0; y < ROWS; y++) {
    const src = level.rows[y] || "";
    grid[y] = [];
    for (let x = 0; x < level.w; x++) {
      const ch = src[x] || ".";
      let t = TL_EMPTY;
      if (ch === "#") t = TL_GROUND;
      else if (ch === "B") t = TL_BRICK;
      else if (ch === "?") t = TL_QCOIN;
      else if (ch === "M") t = TL_QMUSH;
      else if (ch === "!") t = TL_QSTAR;
      else if (ch === "H") t = TL_QSHIELD;
      else if (ch === "D") t = TL_PIPE_LIP;
      else if (ch === "V") { t = TL_PIPE_LIP; plants.push(mkPlant(x, y)); }
      else if (ch === "I") t = TL_PIPE_BODY;
      else if (ch === "o") coins.push({ x: x * T + 3, y: y * T + 2, taken: false });
      else if (ch === "g") enemies.push(mkGoomba(x * T + 2, (y + 1) * T - 12));
      else if (ch === "k") enemies.push(mkKoopa(x * T + 2, (y + 1) * T - 16));
      else if (ch === "P") spawn = { x: x * T + 3, y: (y + 1) * T - player.h };
      else if (ch === "F") flag = { x: x * T + 7, y: (y + 1) * T, flagY: (y + 1) * T - 9 * T + 4, grabbed: false };
      grid[y][x] = t;
    }
  }
  respawnPlayer();
  camX = 0;
}
function respawnPlayer() {
  player.x = spawn.x; player.y = spawn.y;
  player.vx = 0; player.vy = 0; player.face = 1;
  player.grounded = true; player.dead = false; player.star = 0;
  player.shield = false; player.iFrames = 0;
  player.coyote = 0; player.jbuf = 0; player.animT = 0;
}
// enemies get a level-based speed scale + per-enemy variance
function enemySpeed(base) { return base * (0.8 + Math.random() * 0.55) * (1 + worldIx * 0.25); }
function mkGoomba(x, y) { const s = enemySpeed(0.45); return { kind: "goomba", x, y, w: 12, h: 12, vx: -s, spd: s, vy: 0, active: false, dead: false, squashT: 0, animT: 0, hesitate: 0 }; }
function mkKoopa(x, y)  { const s = enemySpeed(0.55); return { kind: "koopa",  x, y, w: 12, h: 16, vx: -s, spd: s, vy: 0, active: false, dead: false, squashT: 0, animT: 0, hesitate: 0, turnTo: 1 }; }
function mkPlant(x, y)  { return { x: x * T + 9, topY: y * T, h: 0, state: 0, t: 90 + Math.random() * 80, dead: false, gone: false }; }

function startGame() {
  score = 0; lives = 3; coinCount = 0;
  loadLevel(0);
  state = PLAY; paused = false;
  musicReset();
}
function tileAt(tx, ty) {
  if (tx < 0 || tx >= level.w) return TL_GROUND; // level side walls
  if (ty < 0 || ty >= ROWS) return TL_EMPTY;
  return grid[ty][tx];
}
function solidAtPx(px, py) { return SOLID(tileAt(Math.floor(px / T), Math.floor(py / T))); }

// ------------------------------------------------------------------ input
const keys = {};
let jumpEdge = false;
addEventListener("keydown", e => {
  initAudio();
  if (e.target === nameInput || e.target === nameModalInput) return; // typing a name, not playing
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (namePopupOpen) {                 // modal owns the keyboard
    if (k === "Escape") closeNamePopup(false);
    return;
  }
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key)) e.preventDefault();
  if (!e.repeat) {
    if (k === "ArrowUp" || k === "w" || k === " ") jumpEdge = true;
    if (k === "Enter") onEnter();
    if (k === "p" || k === "Escape") {
      if (state === PLAY) { paused = !paused; SFX.pause(); if (!paused) musicReset(); }
    }
    if (k === "m") muted = !muted;
    if (k === "f") {
      if (document.fullscreenElement) document.exitFullscreen();
      else cvs.requestFullscreen().catch(() => {});
    }
  }
  keys[k] = true;
});
addEventListener("keyup", e => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  keys[k] = false;
});
addEventListener("blur", () => {
  if (state === PLAY && !namePopupOpen) paused = true;
  for (const k of Object.keys(keys)) keys[k] = false;   // no stuck keys on focus loss
  jumpEdge = false;
});

// ------------------------------------------------------------------ touch controls (mobile / tablet)
// On-screen buttons feed the very same keys/jumpEdge the keyboard uses, so the
// game logic is untouched. Physical keyboard keeps working in parallel (hybrid).
const mqTouch = matchMedia("(max-width:1024px)");        // tablet + phones show buttons
let touchUIOn = mqTouch.matches;
function onMqTouch(e) { touchUIOn = e.matches; }
if (mqTouch.addEventListener) mqTouch.addEventListener("change", onMqTouch);
else if (mqTouch.addListener) mqTouch.addListener(onMqTouch);  // older Safari

const touchUI = document.getElementById("touchUI");
const tBtns = [
  { el: document.getElementById("btnLeft"),  hold: "ArrowLeft" },
  { el: document.getElementById("btnRight"), hold: "ArrowRight" },
  { el: document.getElementById("btnJump"),  hold: " ", jump: true },   // " " = Space (hold = higher jump)
  { el: document.getElementById("btnPause"), pause: true },
];
function touchTogglePause() {
  if (state === PLAY) {
    paused = !paused;
    SFX.pause();
    if (!paused) musicReset();
  } else onEnter();   // doubles as the confirm key on end screens (no keyboard on mobile)
}
for (const b of tBtns) {
  const el = b.el;
  el.addEventListener("pointerdown", e => {
    e.preventDefault();                        // block scroll / double-tap zoom
    initAudio();
    if (namePopupOpen) return;                 // name modal owns input
    try { el.setPointerCapture(e.pointerId); } catch (err) {}   // multi-touch: each button keeps its own pointer
    el.classList.add("pressed");
    if (b.hold) keys[b.hold] = true;
    if (b.jump) jumpEdge = true;               // one tap = one jump (edge, like Space)
    if (b.pause) touchTogglePause();
    b.active = true;
    b.pointerId = e.pointerId;
  });
  const release = e => {
    if (e && e.cancelable) e.preventDefault();
    el.classList.remove("pressed");
    if (b.hold) keys[b.hold] = false;
    b.active = false;
  };
  el.addEventListener("pointerup", release);
  el.addEventListener("pointercancel", release);
  el.addEventListener("lostpointercapture", release);
}
// show the bar only on touch-sized screens and never on the title screen;
// also releases any touch-held key if the bar vanishes mid-press
function syncTouchUI() {
  const show = touchUIOn && state !== TITLE;
  touchUI.classList.toggle("show", show);
  touchUI.setAttribute("aria-hidden", show ? "false" : "true");
  if (!show) for (const b of tBtns)
    if (b.active) { if (b.hold) keys[b.hold] = false; b.active = false; b.el.classList.remove("pressed"); }
}
// safety net: if a pointerup/pointercancel is ever missed by a button (browser
// gesture takeover, app switch, ...), clear any held touch key so it can't stick
addEventListener("pointerup", e => {
  for (const b of tBtns)
    if (b.active && b.pointerId === e.pointerId) { if (b.hold) keys[b.hold] = false; b.active = false; b.el.classList.remove("pressed"); }
});
addEventListener("pointercancel", e => {
  for (const b of tBtns)
    if (b.active && b.pointerId === e.pointerId) { if (b.hold) keys[b.hold] = false; b.active = false; b.el.classList.remove("pressed"); }
});

function onEnter() {
  if (state === TITLE) beginFromTitle();
  else if (state === OVER) state = TITLE;
  else if (state === WIN) state = TITLE;
  else if (state === COMPLETE && stateT > 40) nextLevel();
  else if (state === PLAY && paused) { paused = false; musicReset(); }
}
function nextLevel() {
  if (worldIx + 1 >= LEVELS.length) { state = WIN; stateT = 0; SFX.win(); saveHigh(); }
  else { loadLevel(worldIx + 1); state = PLAY; musicReset(); }
}
function saveHigh() {
  if (score > highScore) {
    highScore = score;
    try { localStorage.setItem("pixeldash_hs", String(highScore)); } catch (e) {}
  }
}

// ------------------------------------------------------------------ physics helpers
function moveEntX(e) {
  e.x += e.vx;
  e.x = Math.round(e.x);
  e.hitWall = 0;
  const top = Math.floor(e.y / T), bot = Math.floor((e.y + e.h - 1) / T);
  if (e.vx > 0) {
    const tx = Math.floor((e.x + e.w) / T);
    for (let ty = top; ty <= bot; ty++) if (SOLID(tileAt(tx, ty))) { e.x = tx * T - e.w - 0.01; e.hitWall = 1; break; }
  } else if (e.vx < 0) {
    const tx = Math.floor(e.x / T);
    for (let ty = top; ty <= bot; ty++) if (SOLID(tileAt(tx, ty))) { e.x = (tx + 1) * T + 0.01; e.hitWall = -1; break; }
  }
}
function moveEntY(e, isPlayer) {
  e.y += e.vy;
  e.y = Math.round(e.y);
  e.grounded = false;
  const left = Math.floor(e.x / T), right = Math.floor((e.x + e.w - 1) / T);
  if (e.vy > 0) {
    const ty = Math.floor((e.y + e.h) / T);
    for (let tx = left; tx <= right; tx++) if (SOLID(tileAt(tx, ty))) {
      e.y = ty * T - e.h; e.vy = 0; e.grounded = true; break;
    }
  } else if (e.vy < 0) {
    const ty = Math.floor(e.y / T);
    let bumped = -1, best = -1;
    for (let tx = left; tx <= right; tx++) if (SOLID(tileAt(tx, ty))) {
      if (!isPlayer) { e.y = (ty + 1) * T + 0.01; e.vy = 0; return; }
      const ov = Math.min(e.x + e.w, (tx + 1) * T) - Math.max(e.x, tx * T);
      if (ov > best) { best = ov; bumped = tx; }
    }
    if (isPlayer && bumped >= 0) {
      e.y = (ty + 1) * T + 0.01; e.vy = 0;
      hitBlock(bumped, ty);
    }
  }
}

function hitBlock(tx, ty) {
  const t = grid[ty][tx];
  if (t === TL_QCOIN) {
    grid[ty][tx] = TL_USED;
    bumps.push({ x: tx, y: ty, t: 0 });
    coinCount++; addScore(100, tx * T + 8, ty * T - 8);
    SFX.coin();
    checkCoinLife();
  } else if (t === TL_QMUSH || t === TL_QSTAR || t === TL_QSHIELD) {
    grid[ty][tx] = TL_USED;
    bumps.push({ x: tx, y: ty, t: 0 });
    const kind = t === TL_QMUSH ? "mush" : t === TL_QSTAR ? "star" : "shield";
    items.push({ kind, x: tx * T + 3, y: ty * T - 4, vx: kind === "mush" ? 0.6 : 0, vy: 0, w: 10, h: 12, rise: 20, grounded: false, hesitate: 0 });
    SFX.power();
  } else if (t === TL_BRICK) {
    bumps.push({ x: tx, y: ty, t: 0 });
    SFX.brick();
    shake = Math.max(shake, 2);
  } else {
    SFX.bump();
  }
  for (const en of enemies) {         // bump an enemy standing on the block
    if (!en.dead && en.active && Math.abs((en.y + en.h) - ty * T) < 4 &&
        en.x + en.w > tx * T && en.x < (tx + 1) * T) killEnemy(en);
  }
}
function addScore(n, x, y) {
  score += n;
  popups.push({ x, y, text: "+" + n, life: 50 });
}
function gainLife(x, y, label) {
  if (lives < 9) {
    lives++; SFX.oneup();
    popups.push({ x, y, text: label || "1UP!", life: 70 });
  } else {
    score += 500;
    popups.push({ x, y, text: "+500", life: 70 });
  }
}
function checkCoinLife() {
  if (coinCount > 0 && coinCount % 100 === 0) gainLife(player.x + 5, player.y - 10);
}
function killEnemy(en) {
  if (en.dead) return;
  en.dead = true;
  en.squashT = en.kind === "goomba" ? 26 : 9999;
  en.vy = -4; en.vx = 0;
  shake = Math.max(shake, 5);
  SFX.stomp();
  addScore(200, en.x + en.w / 2, en.y - 8);
  for (let i = 0; i < 6; i++)
    parts.push({ x: en.x + 6, y: en.y + 6, vx: (Math.random() - 0.5) * 2.4, vy: -Math.random() * 2 - 0.5, g: 0.12, life: 24, col: PAL.white, size: 2 });
}
function hurtPlayer() {
  const p = player;
  if (p.dead || p.star > 0 || p.iFrames > 0) return;
  if (p.shield) {                    // shield absorbs one hit (halved damage)
    p.shield = false; p.iFrames = 60;
    p.vy = -4.5; p.vx = -p.face * 1.6;
    SFX.shieldHit();
    popups.push({ x: p.x + 5, y: p.y - 10, text: "SHIELD!", life: 55 });
    burst(p.x + 5, p.y + 8, PAL.shC, 8);
    return;
  }
  p.dead = true;
  p.vy = -6.2; p.vx = 0;
  state = DEAD; stateT = 0;
  SFX.die();
}
function burst(x, y, col, n) {
  for (let i = 0; i < n; i++)
    parts.push({ x, y, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 2.5, g: 0.14, life: 26, col, size: 2 });
}

// ------------------------------------------------------------------ update
function update() {
  frame++;
  window.gamePaused = paused;
  window.gameNamePopupOpen = namePopupOpen;
  window.gameState = state;
  window.gameMuted = muted;
  if (state === PLAY && namePopupOpen) return;   // frozen while the name modal is up
  if (state === PLAY) updatePlay();
  else if (state === DEAD) updateDead();
  else if (state === FLAGSEQ) updateFlag();
  else if (state === COMPLETE) { stateT++; if (stateT > 420) nextLevel(); }
  else stateT++;
  for (let i = popups.length - 1; i >= 0; i--) { const p = popups[i]; p.y -= 0.5; if (--p.life <= 0) popups.splice(i, 1); }
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.x += p.vx; p.y += p.vy; p.vy += p.g || 0;
    if (--p.life <= 0) parts.splice(i, 1);
  }
  for (let i = bumps.length - 1; i >= 0; i--) if (++bumps[i].t > 12) bumps.splice(i, 1);
  shake *= 0.86; if (shake < 0.3) shake = 0;
  if (state === WIN && frame % 30 === 0)
    burst(60 + Math.random() * 360, 50 + Math.random() * 90,
      [PAL.red, PAL.gold, PAL.grassL, PAL.pipeL][Math.floor(Math.random() * 4)], 14);
  if (state !== PLAY) jumpEdge = false;
}

function updatePlay() {
  if (paused) return;
  hintT++;
  if (++timeTick >= 25) {
    timeTick = 0;
    if (--timeLeft <= 0) { timeLeft = 0; hurtPlayer(); return; }
  }
  const p = player;
  if (p.dead) return;
  if (p.iFrames > 0) p.iFrames--;

  // ---- horizontal motion
  const left = keys["ArrowLeft"] || keys["a"], right = keys["ArrowRight"] || keys["d"];
  const jumpHeld = keys["ArrowUp"] || keys["w"] || keys[" "];
  const acc = p.grounded ? 0.28 : 0.2;
  if (left && !right) { p.vx -= acc; p.face = -1; }
  else if (right && !left) { p.vx += acc; p.face = 1; }
  else if (p.grounded) { p.vx *= 0.8; if (Math.abs(p.vx) < 0.05) p.vx = 0; }
  else p.vx *= 0.98;
  p.vx = Math.max(-1.9, Math.min(1.9, p.vx));

  // ---- jumping: coyote time + input buffer + variable height (jump cut)
  p.coyote = p.grounded ? 6 : p.coyote - 1;
  if (jumpEdge) { p.jbuf = 7; jumpEdge = false; }
  else if (p.jbuf > 0) p.jbuf--;
  if (p.jbuf > 0 && p.coyote > 0) {
    p.vy = -7.3; p.grounded = false; p.coyote = 0; p.jbuf = 0;
    SFX.jump();
  }
  if (!jumpHeld && p.vy < -3) p.vy = -3;
  p.vy += (p.vy < 0 && jumpHeld) ? 0.27 : 0.4;   // gravity ~9.8 m/s² scaled to px
  if (p.vy > 7.5) p.vy = 7.5;

  const wasGrounded = p.grounded;
  const fallV = p.vy;
  moveEntX(p);
  moveEntY(p, true);
  if (!wasGrounded && p.grounded) {                  // landing puffs (bigger after long falls)
    const hard = fallV > 5.5;
    const n = hard ? 8 : 3;
    for (let i = 0; i < n; i++)
      parts.push({
        x: p.x + 2 + Math.random() * (p.w - 4), y: p.y + p.h - 2,
        vx: (Math.random() - 0.5) * (hard ? 2.4 : 1), vy: -Math.random() * (hard ? 1.5 : 0.6),
        g: 0.05, life: hard ? 20 : 14, col: hard ? PAL.white : PAL.cloudSh, size: hard ? 2 : 1,
      });
  }
  // dust while running / skidding
  if (p.grounded && Math.abs(p.vx) > 1.2 && frame % 5 === 0)
    parts.push({ x: p.x + (p.vx > 0 ? 1 : p.w - 1), y: p.y + p.h - 2, vx: -p.vx * 0.3, vy: -0.5 - Math.random() * 0.2, g: 0.04, life: 14, col: PAL.cloudSh, size: Math.random() < 0.3 ? 2 : 1 });
  if (p.grounded && ((left && p.vx > 0.9) || (right && p.vx < -0.9)) && frame % 3 === 0)
    parts.push({ x: p.x + p.w / 2, y: p.y + p.h - 2, vx: (Math.random() - 0.5) * 0.8, vy: -0.9, g: 0.05, life: 14, col: PAL.white, size: 1 });
  if (Math.abs(p.vx) > 0.25) p.animT++;

  if (p.star > 0) p.star--;

  // ---- coins
  for (const c of coins) {
    if (!c.taken && p.x < c.x + 10 && p.x + p.w > c.x && p.y < c.y + 12 && p.y + p.h > c.y) {
      c.taken = true; coinCount++;
      addScore(100, c.x + 5, c.y - 6);
      SFX.coin(); burst(c.x + 5, c.y + 6, PAL.gold, 5);
      checkCoinLife();
    }
  }

  // ---- items
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    if (it.rise > 0) { it.y -= 0.5; it.rise--; continue; }
    if (it.kind !== "shield") {                    // shield floats where it spawns
      it.vy += (it.kind === "star") ? 0.3 : 0.35;
      if (it.vy > 5) it.vy = 5;
      moveEntX(it);
      if (it.hitWall) it.vx = -it.vx;
      moveEntY(it);
      if (it.grounded && it.kind === "star") it.vy = -4.4;
    }
    if (it.y > VH + 40) { items.splice(i, 1); continue; }
    if (p.x < it.x + it.w && p.x + p.w > it.x && p.y < it.y + it.h && p.y + p.h > it.y) {
      items.splice(i, 1);
      if (it.kind === "mush") { gainLife(it.x, it.y - 8); }
      else if (it.kind === "star") {
        p.star = 180; SFX.power();
        popups.push({ x: it.x, y: it.y - 8, text: "INVINCIBLE!", life: 70 });
      } else {
        p.shield = true; SFX.shieldUp();
        popups.push({ x: it.x, y: it.y - 8, text: "SHIELD!", life: 70 });
        burst(it.x + 5, it.y + 6, PAL.shC, 6);
      }
    }
  }

  // ---- enemies
  for (const en of enemies) {
    if (!en.active) { if (en.x < camX + VW + 32) en.active = true; else continue; }
    if (en.dead) {
      en.vy += 0.3; en.y += en.vy;
      if (en.kind === "goomba" && en.squashT > 0) en.squashT--;
      continue;
    }
    en.vy += 0.35; if (en.vy > 7) en.vy = 7;
    moveEntX(en);
    if (en.hitWall) en.vx = -en.vx;
    moveEntY(en);
    if (en.kind === "koopa") {
      if (en.hesitate > 0) {                       // pause + "!" before turning at a ledge
        en.vx = 0;
        if (--en.hesitate === 0) en.vx = en.spd * en.turnTo;
      } else if (en.grounded) {
        const aheadX = en.vx > 0 ? en.x + en.w + 2 : en.x - 2;
        if (!solidAtPx(aheadX, en.y + en.h + 4)) {
          en.hesitate = 20;
          en.turnTo = en.vx > 0 ? -1 : 1;
          en.vx = 0;
        }
      }
    }
    if (en.y > VH + 60) { en.dead = true; en.squashT = 0; continue; }
    en.animT++;
    if (p.x < en.x + en.w && p.x + p.w > en.x && p.y < en.y + en.h && p.y + p.h > en.y) {
      if (p.star > 0) { killEnemy(en); continue; }
      const falling = p.vy > 0;
      const above = (p.y + p.h) - p.vy <= en.y + 6;
      if (falling && above) {
        killEnemy(en);
        p.vy = jumpHeld ? -7.2 : -5;
        p.y = en.y - p.h;
      } else hurtPlayer();
    }
  }
  enemies = enemies.filter(e => !(e.dead && ((e.kind === "goomba" && e.squashT <= 0) || e.y > VH + 80)));
  // enemies bounce off each other
  for (let i = 0; i < enemies.length; i++) for (let j = i + 1; j < enemies.length; j++) {
    const a = enemies[i], b = enemies[j];
    if (a.dead || b.dead || !a.active || !b.active || a.hesitate > 0 || b.hesitate > 0) continue;
    if (a.x < b.x + b.w && a.x + a.w > b.x && Math.abs(a.y - b.y) < 12) {
      if (a.x < b.x) { a.vx = -Math.abs(a.vx); b.vx = Math.abs(b.vx); }
      else { a.vx = Math.abs(a.vx); b.vx = -Math.abs(b.vx); }
    }
  }

  // ---- piranha plants
  updatePlants(p);

  // ---- fell into a pit
  if (p.y > VH + 24 && !p.dead) {
    p.dead = true; state = DEAD; stateT = 0; SFX.die();
  }

  // ---- flagpole
  if (flag && !flag.grabbed && p.x + p.w > flag.x - 2 && p.x < flag.x + 6) {
    flag.grabbed = true;
    state = FLAGSEQ; stateT = 0;
    flagAnim = { phase: 0, t: 0, bonus: 500 + timeLeft * 5, timeBonus: timeLeft * 5 };
    score += flagAnim.bonus;
    SFX.flag();
    p.x = flag.x - 10; p.vx = 0; p.vy = 0;
  }

  // ---- camera (smooth follow with slight lag)
  const target = Math.max(0, Math.min(levelW - VW, p.x - 190));
  camX += (target - camX) * 0.15;
  if (Math.abs(target - camX) < 0.4) camX = target;
}

function updatePlants(p) {
  for (const pl of plants) {
    if (pl.dead) { pl.h -= 1.2; if (pl.h <= 0) pl.gone = true; continue; }
    const near = Math.abs((p.x + p.w / 2) - (pl.x + 7)) < 44;
    if (pl.state === 0) {                  // hidden in pipe
      if (--pl.t <= 0 && !near) pl.state = 1;
    } else if (pl.state === 1) {           // rising
      pl.h += 0.5;
      if (pl.h >= 26) { pl.h = 26; pl.state = 2; pl.t = 70; }
    } else if (pl.state === 2) {           // out, then sink
      if (--pl.t <= 0) pl.state = 3;
    } else {                               // sinking
      pl.h -= 0.5;
      if (pl.h <= 0) { pl.h = 0; pl.state = 0; pl.t = 80 + Math.random() * 70; }
    }
    // contact damage (cannot be stomped — classic piranha rule)
    if (pl.h > 10 && !pl.dead) {
      const bx = pl.x + 1, by = pl.topY + 2 - pl.h, bw = 12, bh = pl.h;
      if (p.x < bx + bw && p.x + p.w > bx && p.y < by + bh && p.y + p.h > by) {
        if (p.star > 0) {
          pl.dead = true;
          addScore(200, pl.x + 7, pl.topY - 12);
          SFX.stomp(); shake = Math.max(shake, 5);
        } else hurtPlayer();
      }
    }
  }
  plants = plants.filter(pl => !pl.gone);
}

function updateDead() {
  stateT++;
  if (stateT >= 12) { player.vy += 0.35; player.y += player.vy; }
  if (stateT === 70) {
    lives--;
    if (lives <= 0) { state = OVER; stateT = 0; saveHigh(); SFX.over(); }
    else { loadLevel(worldIx); state = PLAY; musicReset(); }
  }
}

function updateFlag() {
  stateT++; flagAnim.t++;
  const p = player;
  if (flagAnim.phase === 0) {                        // slide down the pole
    p.y += 2.4;
    const groundY = flag.y - p.h;
    if (p.y >= groundY) { p.y = groundY; flagAnim.phase = 1; flagAnim.t = 0; }
  } else if (flagAnim.phase === 1) {                 // hop off and walk right
    if (flagAnim.t === 1) { p.vy = -3; p.face = 1; }
    p.vy += 0.4; p.x += 1.1;
    moveEntX(p); moveEntY(p);
    p.animT++;
    if (flagAnim.t > 80) { flagAnim.phase = 2; state = COMPLETE; stateT = 0; saveHigh(); SFX.clear(); }
  }
  camX += (Math.max(0, Math.min(levelW - VW, p.x - 190)) - camX) * 0.15;
}

// ------------------------------------------------------------------ render
function drawTiledBG() {
  ctx.fillStyle = PAL.sky; ctx.fillRect(0, 0, VW, VH);
  const gx = 15 * T;
  for (let i = 0; i < 8; i++) {                      // clouds, parallax 0.35
    const sx = (i * 155 + (i % 4) * 37) - camX * 0.35;
    const x = ((sx % 1240) + 1240) % 1240 - 120;
    ctx.drawImage(CLOUD, Math.floor(x), 18 + (i * 41) % 80);
  }
  for (let i = 0; i < 10; i++) {                     // hills, parallax 0.65
    const span = VW + 200;
    const hx = ((i * 230 + (i % 2) * 90) - camX * 0.65) % span + span;
    const x = hx % span - 100;
    const img = i % 2 ? HILL_SMALL : HILL_BIG;
    ctx.drawImage(img, Math.floor(x), gx - img.height);
  }
  for (let i = 0; i < 30; i++) {                     // bushes, in-world layer
    const bx = i * 230 + 80 - camX;
    if (bx > -60 && bx < VW) ctx.drawImage(BUSH, Math.floor(bx), gx - 15);
  }
}

function drawTiles() {
  const x0 = Math.max(0, Math.floor(camX / T)), x1 = Math.min(level.w - 1, Math.ceil((camX + VW) / T));
  for (let ty = 0; ty < ROWS; ty++) for (let tx = x0; tx <= x1; tx++) {
    const t = grid[ty][tx];
    if (!t) continue;
    let dy = 0;
    for (const b of bumps) if (b.x === tx && b.y === ty) dy = -Math.round(4 * Math.sin(Math.PI * b.t / 12));
    const px = Math.floor(tx * T - camX), py = ty * T + dy;
    let img = null;
    if (t === TL_GROUND) img = tileAt(tx, ty - 1) === TL_GROUND ? TILES.groundFill : TILES.groundTop;
    else if (t === TL_BRICK) img = TILES.brick;
    else if (t === TL_QCOIN || t === TL_QMUSH || t === TL_QSTAR || t === TL_QSHIELD) img = TILES.q;
    else if (t === TL_USED) img = TILES.used;
    else if (t === TL_PIPE_LIP) img = tileAt(tx - 1, ty) === TL_PIPE_LIP ? TILES.pipeLR : TILES.pipeLL;
    else if (t === TL_PIPE_BODY) img = tileAt(tx - 1, ty) === TL_PIPE_BODY ? TILES.pipeBR : TILES.pipeBL;
    if (img) ctx.drawImage(img, px, py);
  }
}

function drawSpriteC(img, x, y, flip) {
  x = Math.floor(x - camX); y = Math.floor(y);
  if (x + img.width < 0 || x > VW) return;
  if (flip) { ctx.save(); ctx.translate(x + img.width, y); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0); ctx.restore(); }
  else ctx.drawImage(img, x, y);
}

function heroFrame() {
  const p = player;
  const set = (p.star > 0 && Math.floor(frame / 3) % 2 === 0) ? HERO_G : HERO;
  if (p.dead) return set.jump;
  if (state === FLAGSEQ && flagAnim && flagAnim.phase === 0) return set.jump;
  if (!p.grounded && state !== FLAGSEQ) return p.vy > 1.5 ? set.fall : set.jump;
  if (Math.abs(p.vx) > 0.25) {
    const cyc = [set.run1, set.run2, set.run3, set.run2];
    return cyc[Math.floor(p.animT / 5) % 4];
  }
  return set.idle;
}

function render() {
  titleUI.classList.toggle("hidden", state !== TITLE);
  syncTouchUI();
  ctx.clearRect(0, 0, VW, VH);
  if (state === TITLE) { renderTitle(); return; }

  const sx = shake ? Math.round((Math.random() - 0.5) * shake) : 0;
  const sy = shake ? Math.round((Math.random() - 0.5) * shake) : 0;
  ctx.save(); ctx.translate(sx, sy);

  drawTiledBG();

  // piranha plants (drawn before tiles so pipes mask them)
  for (const pl of plants) {
    if (pl.h <= 0) continue;
    const px = Math.floor(pl.x - camX), py = Math.floor(pl.topY + 2 - pl.h);
    const vis = Math.min(26, Math.ceil(pl.h));
    ctx.drawImage(PIRANHA, 0, 0, 14, vis, px, py, 14, vis);
  }

  drawTiles();

  if (flag) {                                        // flagpole
    const px = Math.floor(flag.x - camX);
    ctx.fillStyle = PAL.pole;
    ctx.fillRect(px, flag.y - 9 * T, 2, 9 * T);
    ctx.fillStyle = PAL.gold; ctx.fillRect(px - 1, flag.y - 9 * T - 4, 4, 4);
    const fy = (state === FLAGSEQ || state === COMPLETE) && flagAnim
      ? Math.min(flag.y - 14, flag.flagY + flagAnim.t * 3) : flag.flagY;
    ctx.fillStyle = PAL.red;
    ctx.fillRect(px - 12, Math.floor(fy), 12, 9);
    ctx.fillStyle = PAL.white; ctx.fillRect(px - 10, Math.floor(fy) + 2, 4, 2);
  }

  const cf = COIN_F[Math.floor(frame / 7) % 4];
  for (const c of coins) if (!c.taken)
    drawSpriteC(cf, c.x, c.y + Math.sin((frame + c.x) / 22) * 1.5, false);

  // items with a pulsing "glow"
  for (const it of items) {
    const glowCol = it.kind === "star" ? "#fff0a0" : it.kind === "shield" ? "#a8d8ff" : "#ffd8a0";
    ctx.globalAlpha = 0.14 + 0.09 * Math.sin(frame / 5 + it.x);
    ctx.fillStyle = glowCol;
    const gx = Math.floor(it.x - camX) - 5, gy = Math.floor(it.y) - 7;
    ctx.fillRect(gx - 2, gy + 3, 24, 18); ctx.fillRect(gx + 4, gy - 3, 12, 30);
    ctx.globalAlpha = 1;
    if (it.kind === "mush") drawSpriteC(SHROOM, it.x - 3, it.y - 4, false);
    else if (it.kind === "star") drawSpriteC(STAR, it.x - 3, it.y - 2, false);
    else drawSpriteC(SHIELD, it.x - 1, it.y - 1, false);
  }

  for (const en of enemies) {
    if (!en.active) continue;
    if (en.kind === "goomba") {
      if (en.dead && en.squashT > 0) drawSpriteC(GOOMBA_SQ, en.x - 2, en.y + en.h - 6, false);
      else if (!en.dead) drawSpriteC(GOOMBA_F[Math.floor(en.animT / 12) % 2], en.x - 2, en.y + en.h - 16, false);
    } else {
      drawSpriteC(KOOPA_F[Math.floor(en.animT / 10) % 2], en.x - 2, en.y + en.h - 20, en.dead);
      if (en.hesitate > 0)
        text(ctx, "!", Math.floor(en.x + 4 - camX), Math.floor(en.y - 12), 1, PAL.goldL, PAL.black);
    }
  }

  if (!((player.star > 0 || player.iFrames > 0) && frame % 6 < 2)) {
    const img = heroFrame();
    drawSpriteC(img, player.x - 3, player.y - 4, player.face < 0 && !player.dead);
  }

  for (const pt of parts) { ctx.fillStyle = pt.col; ctx.fillRect(Math.floor(pt.x - camX), Math.floor(pt.y), pt.size, pt.size); }
  for (const pp of popups)
    text(ctx, pp.text, Math.floor(pp.x - camX - pp.text.length * 3), Math.floor(pp.y), 1, PAL.white, PAL.black);

  ctx.restore();
  drawHUD();
  if (state === PLAY && paused) drawPause();
  if (state === COMPLETE) drawComplete();
  if (state === OVER) drawOver();
  if (state === WIN) drawWin();
  if (state === PLAY && !paused && worldIx === 0 && hintT < 480 && !touchUIOn) drawKeyHints();
}

function drawHUD() {
  ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fillRect(0, 0, VW, 30);
  // player name: gold, drawn twice for a slightly bolder look, with change animation
  const nameStr = "PLAYER: " + playerName.slice(0, 12);
  const nameCol = nameFlash > 0 && Math.floor(nameFlash / 4) % 2 === 0 ? PAL.white : PAL.goldL;
  text(ctx, nameStr, 8, 4, 1, nameCol, PAL.black);
  text(ctx, nameStr, 8, 5, 1, nameCol);
  ctx.fillStyle = "rgba(255,239,173,0.35)";                 // separator under the name
  ctx.fillRect(8, 14, nameStr.length * 6 - 1, 1);
  if (nameFlash > 0) {                                      // gold sweep on change
    ctx.fillStyle = PAL.goldL;
    ctx.fillRect(8, 14, Math.max(1, Math.round((nameFlash / 50) * nameStr.length * 6)), 1);
    nameFlash--;
  }
  text(ctx, "SCORE " + String(score).padStart(6, "0"), 8, 17, 1, PAL.white, PAL.black);
  ctx.drawImage(COIN_F[Math.floor(frame / 7) % 4], 100, 15);
  text(ctx, "X" + String(coinCount).padStart(2, "0"), 112, 17, 1, PAL.goldL, PAL.black);
  text(ctx, "WORLD " + level.name, 150, 17, 1, PAL.white, PAL.black);
  const hurry = timeLeft < 60 && Math.floor(frame / 16) % 2 === 0;
  text(ctx, "TIME " + String(timeLeft).padStart(3, "0"), 232, 17, 1, hurry ? PAL.red : PAL.white, PAL.black);
  ctx.drawImage(HEAD_ICON, 320, 16);
  text(ctx, "X" + lives, 330, 17, 1, PAL.white, PAL.black);
  if (player.shield) ctx.drawImage(MINI_SHIELD, 346, 16);
  if (player.star > 0 && frame % 8 < 5) ctx.drawImage(MINI_STAR, 358, 16);
  // CHG button (opens the name-change popup) with a soft pulsing glow
  const pulse = 0.85 + 0.15 * Math.sin(frame / 48);         // 0.8s cycle
  const grow = 1 + Math.round(pulse);
  ctx.globalAlpha = 0.15 + 0.35 * pulse * pulse;
  ctx.fillStyle = PAL.goldL;
  ctx.fillRect(CHG.x - grow, CHG.y - grow, CHG.w + grow * 2, CHG.h + grow * 2);
  ctx.globalAlpha = 1;
  ctx.fillStyle = PAL.goldD; ctx.fillRect(CHG.x, CHG.y, CHG.w, CHG.h);
  ctx.fillStyle = PAL.goldL; ctx.fillRect(CHG.x + 1, CHG.y + 1, CHG.w - 2, CHG.h - 2);
  text(ctx, "CHG", CHG.x + 2, CHG.y + 4, 1, PAL.black);
}

function keycap(x, y, w, label, arrow) {
  ctx.fillStyle = "rgba(15,15,18,0.55)"; ctx.fillRect(x, y, w, 15);
  ctx.fillStyle = "rgba(248,248,248,0.75)"; ctx.fillRect(x + 1, y + 1, w - 2, 13);
  ctx.fillStyle = "rgba(15,15,18,0.8)";
  if (arrow) {
    const cx = x + w / 2, cy = y + 7;
    for (let i = 0; i < 3; i++) {
      if (arrow === "L") ctx.fillRect(cx - 3 + i, cy - (3 - i), 1, (3 - i) * 2 + 1);
      if (arrow === "R") ctx.fillRect(cx + 3 - i, cy - (3 - i), 1, (3 - i) * 2 + 1);
      if (arrow === "U") ctx.fillRect(cx - (3 - i), cy - 3 + i, (3 - i) * 2 + 1, 1);
      if (arrow === "D") ctx.fillRect(cx - (3 - i), cy + 3 - i, (3 - i) * 2 + 1, 1);
    }
  } else text(ctx, label, x + Math.floor((w - label.length * 6) / 2) + 1, y + 4, 1, "rgba(15,15,18,0.8)");
}
function drawKeyHints() {
  const a = hintT > 400 ? 1 - (hintT - 400) / 80 : 1;
  ctx.globalAlpha = Math.max(0, a);
  keycap(10, VH - 26, 15, "", "L"); keycap(27, VH - 26, 15, "", "R");
  text(ctx, "MOVE", 46, VH - 21, 1, PAL.white, PAL.black);
  keycap(92, VH - 26, 42, "SPACE");
  text(ctx, "JUMP", 138, VH - 21, 1, PAL.white, PAL.black);
  keycap(176, VH - 26, 15, "P");
  text(ctx, "PAUSE", 195, VH - 21, 1, PAL.white, PAL.black);
  keycap(248, VH - 26, 15, "F");
  text(ctx, "FULLSCREEN", 267, VH - 21, 1, PAL.white, PAL.black);
  ctx.globalAlpha = 1;
}

function drawPause() {
  ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(0, 0, VW, VH);
  text(ctx, "PAUSED", VW / 2 - 21, 84, 3, PAL.white, PAL.black);
  text(ctx, "ARROWS / WASD - MOVE   SPACE - JUMP", VW / 2 - 118, 126, 1, PAL.white);
  text(ctx, "P / ESC - RESUME   M - MUSIC " + (muted ? "OFF" : "ON"), VW / 2 - 118, 138, 1, PAL.white);
  text(ctx, "F - FULLSCREEN", VW / 2 - 45, 150, 1, PAL.white);
  text(ctx, "PRESS P TO RESUME", VW / 2 - 57, 172, 1, PAL.goldL, PAL.black);
}

// --- mini preview of the next level, shown on the complete panel ---
const previewCache = {};
function levelPreview(ix) {
  if (previewCache[ix]) return previewCache[ix];
  const lv = LEVELS[ix];
  const c = document.createElement("canvas");
  c.width = lv.w * 2; c.height = 34;
  const g = c.getContext("2d");
  g.fillStyle = PAL.sky; g.fillRect(0, 0, c.width, c.height);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < lv.w; x++) {
    const ch = (lv.rows[y] || "")[x] || ".";
    let col = null;
    if (ch === "#") col = PAL.grass;
    else if (ch === "B") col = PAL.brick;
    else if (ch === "?" || ch === "M" || ch === "!" || ch === "H") col = PAL.gold;
    else if (ch === "D" || ch === "I" || ch === "V") col = PAL.pipe;
    else if (ch === "o") col = PAL.goldD;
    else if (ch === "F") col = PAL.red;
    else if (ch === "P") col = PAL.white;
    else if (ch === "g") col = PAL.goomba;
    else if (ch === "k") col = PAL.cream;
    if (col) { g.fillStyle = col; g.fillRect(x * 2, y * 2, 2, 2); }
  }
  previewCache[ix] = c;
  return c;
}

function drawComplete() {
  ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(0, 48, VW, 172);
  text(ctx, "LEVEL COMPLETE!", VW / 2 - 108, 56, 2, PAL.goldL, PAL.black);
  const congrats = "CONGRATULATIONS " + playerName + "!";
  text(ctx, congrats, Math.floor(VW / 2 - congrats.length * 3), 80, 1, PAL.white, PAL.black);
  text(ctx, "WORLD " + level.name + " CLEARED", VW / 2 - 76, 94, 1, PAL.white, PAL.black);
  text(ctx, "CLEAR BONUS +500", VW / 2 - 52, 108, 1, PAL.white, PAL.black);
  text(ctx, "TIME BONUS +" + flagAnim.timeBonus, VW / 2 - 52, 120, 1, PAL.white, PAL.black);
  text(ctx, "SCORE " + String(score).padStart(6, "0"), VW / 2 - 45, 134, 1, PAL.goldL, PAL.black);
  if (worldIx + 1 < LEVELS.length) {
    text(ctx, "NEXT: WORLD " + LEVELS[worldIx + 1].name, VW / 2 - 46, 148, 1, PAL.white, PAL.black);
    const pv = levelPreview(worldIx + 1);
    ctx.fillStyle = PAL.black;
    ctx.fillRect(VW / 2 - pv.width / 2 - 2, 158, pv.width + 4, 38);
    ctx.drawImage(pv, Math.floor(VW / 2 - pv.width / 2), 160);
  } else {
    text(ctx, "GET READY FOR THE FINALE!", VW / 2 - 85, 160, 1, PAL.goldL, PAL.black);
  }
  if (stateT > 40 && Math.floor(stateT / 20) % 2 === 0)
    text(ctx, worldIx + 1 < LEVELS.length ? "PRESS ENTER FOR NEXT LEVEL" : "PRESS ENTER FOR THE FINALE",
      VW / 2 - 96, 204, 1, PAL.white, PAL.black);
}
function drawOver() {
  ctx.fillStyle = "rgba(0,0,0,0.65)"; ctx.fillRect(0, 0, VW, VH);
  const big = playerName + " - GAME OVER";
  text(ctx, big, Math.floor(VW / 2 - big.length * 6), 66, 2, PAL.red, PAL.black);
  text(ctx, "SCORE " + String(score).padStart(6, "0"), VW / 2 - 45, 120, 1, PAL.white, PAL.black);
  text(ctx, "HIGH SCORE " + String(highScore).padStart(6, "0"), VW / 2 - 53, 134, 1, PAL.goldL, PAL.black);
  text(ctx, "TIP: PRESS THE CHG BUTTON TO CHANGE YOUR NAME", VW / 2 - 152, 152, 1, "rgba(248,248,248,0.7)");
  if (Math.floor(stateT / 24) % 2 === 0) text(ctx, "PRESS ENTER TO TRY AGAIN", VW / 2 - 84, 176, 1, PAL.white, PAL.black);
}
function drawWin() {
  ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(0, 0, VW, VH);
  for (const pt of parts) { ctx.fillStyle = pt.col; ctx.fillRect(Math.floor(pt.x), Math.floor(pt.y), pt.size, pt.size); }
  text(ctx, "YOU WIN!", VW / 2 - 55, 62, 3, PAL.goldL, PAL.black);
  text(ctx, playerName + " SAVED THE KINGDOM!", VW / 2 - 87, 102, 1, PAL.white, PAL.black);
  text(ctx, "FINAL SCORE " + String(score).padStart(6, "0"), VW / 2 - 52, 126, 1, PAL.white, PAL.black);
  text(ctx, "HIGH SCORE " + String(highScore).padStart(6, "0"), VW / 2 - 53, 140, 1, PAL.goldL, PAL.black);
  if (Math.floor(stateT / 24) % 2 === 0) text(ctx, "PRESS ENTER FOR TITLE", VW / 2 - 72, 172, 1, PAL.white, PAL.black);
}

function renderTitle() {
  // sky-blue -> purple gradient
  const grad = ctx.createLinearGradient(0, 0, 0, VH);
  grad.addColorStop(0, "#5c94fc");
  grad.addColorStop(0.55, "#7a6ce8");
  grad.addColorStop(1, "#4a2d8f");
  ctx.fillStyle = grad; ctx.fillRect(0, 0, VW, VH);

  // twinkling stars
  for (let i = 0; i < 46; i++) {
    const sx = (i * 97 + (i * i * 31) % 53) % VW;
    const sy = (i * 41 + (i % 7) * 13) % 150;
    const a = 0.25 + 0.75 * Math.abs(Math.sin(frame / 18 + i * 1.7));
    ctx.globalAlpha = a;
    ctx.fillStyle = i % 5 === 0 ? "#ffe9a0" : "#ffffff";
    const sz = i % 8 === 0 ? 2 : 1;
    ctx.fillRect(sx, sy, sz, sz);
  }
  ctx.globalAlpha = 1;

  const gx = 15 * T;
  for (let i = 0; i < 6; i++) {                    // parallax hills + clouds
    const img = i % 2 ? HILL_SMALL : HILL_BIG;
    ctx.drawImage(img, 20 + i * 120 - Math.floor(frame * 0.1) % 120, gx - img.height);
  }
  for (let i = 0; i < 5; i++)
    ctx.drawImage(CLOUD, ((i * 140 + 20 - Math.floor(frame * 0.15)) % 700 + 700) % 700 - 40, 120 + (i % 3) * 26);
  for (let i = 0; i < 7; i++) ctx.drawImage(BUSH, i * 100 - 30, gx - 15);
  for (let x = 0; x < VW; x += T) {
    ctx.drawImage(TILES.groundTop, x, gx);
    ctx.drawImage(TILES.groundFill, x, gx + T);
  }
  const bob = Math.sin(frame / 30) * 2;            // hero + goomba cameo
  ctx.drawImage(HERO.idle, 40, Math.floor(gx - 78 + bob), 48, 78);
  const gx2 = 330 + Math.sin(frame / 90) * 60;
  ctx.drawImage(GOOMBA_F[Math.floor(frame / 12) % 2], Math.floor(gx2), gx - 16);

  // giant bouncing logo, letter by letter
  const logo = "PIXEL HERO";
  for (let i = 0; i < logo.length; i++) {
    const ly = 18 + Math.round(Math.sin(frame / 13 + i * 0.55) * 5);
    text(ctx, logo[i], 92 + i * 30, ly, 5, PAL.goldL, "#2a1050");
  }
  text(ctx, "A 16-BIT PLATFORMER", VW / 2 - 70, 62, 2, PAL.white, PAL.black);

  if (touchUIOn) {
    const tapA = 0.55 + 0.45 * Math.abs(Math.sin(frame / 22));
    ctx.globalAlpha = tapA;
    text(ctx, "TAP TO PLAY", VW / 2 - 33, 176, 1, PAL.goldL, PAL.black);
    ctx.globalAlpha = 1;
    text(ctx, "ON-SCREEN BUTTONS: MOVE - JUMP - PAUSE", VW / 2 - 111, 190, 1, PAL.white, PAL.black);
    text(ctx, "STOMP ENEMIES +200   COINS +100   CLEAR +500 + TIME BONUS", VW / 2 - 195, 200, 1, PAL.white, PAL.black);
    text(ctx, "HIGH SCORE " + String(highScore).padStart(6, "0"), VW / 2 - 53, 224, 1, PAL.goldL, PAL.black);
  } else {
    text(ctx, "CONTROLS", VW / 2 - 30, 176, 1, PAL.goldL, PAL.black);
    text(ctx, "ARROWS OR WASD - MOVE   UP/W/SPACE - JUMP (HOLD = HIGHER)", VW / 2 - 195, 190, 1, PAL.white, PAL.black);
    text(ctx, "STOMP ENEMIES +200   COINS +100   CLEAR +500 + TIME BONUS", VW / 2 - 195, 200, 1, PAL.white, PAL.black);
    text(ctx, "P - PAUSE   M - MUSIC " + (muted ? "OFF" : "ON") + "   F - FULLSCREEN", VW / 2 - 123, 210, 1, PAL.white, PAL.black);
    text(ctx, "HIGH SCORE " + String(highScore).padStart(6, "0"), VW / 2 - 53, 224, 1, PAL.goldL, PAL.black);
  }
  ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fillRect(0, VH - 16, VW, 16);
  text(ctx, "MUSHROOM: 1UP   STAR: INVINCIBLE   SHIELD: BLOCKS A HIT", VW / 2 - 175, VH - 11, 1, PAL.white, PAL.black);
}

// ------------------------------------------------------------------ main loop
// tiny console/testing handle
window.G = {
  get player() { return player; }, get state() { return state; }, set state(v) { state = v; },
  get paused() { return paused; }, set paused(v) { paused = v; },
  get lives() { return lives; }, set lives(v) { lives = v; },
  get score() { return score; }, get coins() { return coinCount },
  get timeLeft() { return timeLeft; }, set timeLeft(v) { timeLeft = v; },
  get camX() { return camX; },
  get enemies() { return enemies; }, get items() { return items; }, get plants() { return plants; },
  get grid() { return grid; }, get keys() { return keys; }, get flag() { return flag; },
  get level() { return level; }, get jumpEdge() { return jumpEdge; }, set jumpEdge(v) { jumpEdge = v; },
  get playerName() { return playerName; }, set playerName(v) { playerName = v; },
  get namePopupOpen() { return namePopupOpen; },
  start: startGame, load: loadLevel,
};
let last = 0, accum = 0;
function frameLoop(t) {
  requestAnimationFrame(frameLoop);
  if (!last) last = t;
  let dt = (t - last) / 1000; last = t;
  if (dt > 0.1) dt = 0.1;
  accum += dt;
  while (accum >= STEP) { update(); accum -= STEP; }
  render();
}
loadLevel(0);
state = TITLE;
requestAnimationFrame(frameLoop);
