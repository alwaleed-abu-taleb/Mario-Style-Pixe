"use strict";
// ------------------------------------------------------------------ color picker
// Title-screen hero customizer (state === TITLE / window.gameState === 0).
// Four part swatches (HEAD / HAIR / BODY / LEGS); clicking one opens a strip
// of 10 preset colors. Picking a color calls applyCharacterData(CharacterData)
// so the title-screen hero updates instantly, and the choice is stored under
// localStorage key "pixelhero_colors" and restored on the next load.
//
// Loads between character-data.js and game.js. Everything it needs from
// game.js (ctx, canvasPoint, window.gameState) is only touched at runtime,
// after game.js has run -- never at load time.

const PICKER_COLORS = {
  head: ["#f8c090", "#ffd5b0", "#c8803a", "#8b4513", "#f0e0c8", "#ffe4b5", "#deb887", "#d2691e", "#8d5524", "#4a2512"],
  hair: ["#1c1a20", "#4a3728", "#8b4513", "#c8a060", "#f8d060", "#d4a017", "#800000", "#ff4500", "#c0c0c0", "#ffffff"],
  body: ["#f0f0f0", "#3498db", "#e74c3c", "#2ecc71", "#9b59b6", "#f39c12", "#1abc9c", "#e67e22", "#34495e", "#ff6b6b"],
  legs: ["#d03028", "#2c3e50", "#27ae60", "#8e44ad", "#c0392b", "#1a252f", "#196f3d", "#6c3483", "#922b21", "#154360"],
};
const PART_ORDER = ["head", "hair", "body", "legs"];
const PART_LABELS = { head: "HEAD", hair: "HAIR", body: "BODY", legs: "LEGS" };
const LS_KEY = "pixelhero_colors";

// ---- layout (internal 480x272 resolution) ------------------------------
// Left-edge column: clear of the #titleUI overlay on phones and desktop alike.
// Palette strip: bottom band, the only wide region the overlay never covers.
const CP_BOX_X = 8, CP_BOX = 16, CP_ROW_PITCH = 22, CP_ROW_Y = 76;
const CP_LABEL_X = 28;
const CP_CELL = 14, CP_CELL_PITCH = 17, CP_CELL_X = 4, CP_CELL_Y = 214;
const CP_HIT_PAD = 2;                 // grow boxes + labels into tappable rows

let cpPart = null;                    // currently open part, or null
let cpHover = null;                   // { kind: "swatch"|"cell", i } from mousemove
let cpFlash = 0;                      // apply-feedback pulse, in frames
let cpT = 0;                          // local frame counter
let cpLoopOn = false;

// ---- persistence -------------------------------------------------------
function loadColors() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(LS_KEY)); } catch (e) {}
  if (!saved || typeof saved !== "object") return;
  for (const part of PART_ORDER) {
    const v = saved[part];
    if (typeof v === "string" && PICKER_COLORS[part].indexOf(v.toLowerCase()) >= 0)
      CharacterData.colors[part] = v.toLowerCase();
  }
}
function saveColors() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      head: CharacterData.colors.head, hair: CharacterData.colors.hair,
      body: CharacterData.colors.body, legs: CharacterData.colors.legs,
    }));
  } catch (e) {}
}
// restore saved colors before game.js renders its first title frame
loadColors();
applyCharacterData(CharacterData);

// ---- canvas + input ----------------------------------------------------
const cpCanvas = document.getElementById("game");

function cpRectHit(p, x, y, w, h) {
  return p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;
}
function cpRowHit(p, i) {                    // whole row: box + label
  const ry = CP_ROW_Y + i * CP_ROW_PITCH - CP_HIT_PAD;
  return cpRectHit(p, 4, ry, 54, CP_BOX + CP_HIT_PAD * 2);
}
function cpCellHit(p, j) {                   // palette cell + padding
  const cx = CP_CELL_X + j * CP_CELL_PITCH;
  return cpRectHit(p, cx - CP_HIT_PAD, CP_CELL_Y - CP_HIT_PAD, CP_CELL + CP_HIT_PAD * 2, CP_CELL + CP_HIT_PAD * 2);
}

function cpApply(part, color) {
  CharacterData.colors[part] = color;
  applyCharacterData(CharacterData);        // re-bake HERO_SET -> title hero updates live
  saveColors();
  cpFlash = 26;
  SFX.coin();
}

function cpClick(e) {
  if (window.gameState !== 0) { cpPart = null; return; }   // title screen only
  initAudio();
  const p = canvasPoint(e);
  if (cpPart) {                              // palette open: cells take priority
    for (let j = 0; j < 10; j++)
      if (cpCellHit(p, j)) { cpApply(cpPart, PICKER_COLORS[cpPart][j]); return; }
  }
  for (let i = 0; i < PART_ORDER.length; i++) {
    if (cpRowHit(p, i)) {
      const part = PART_ORDER[i];
      cpPart = cpPart === part ? null : part;             // toggle open / closed
      SFX.pause();                                        // ui blip (as on pause button)
      return;
    }
  }
  cpPart = null;                             // clicked outside: close
}
cpCanvas.addEventListener("click", cpClick);

function cpMove(e) {
  if (window.gameState !== 0) { cpHover = null; return; }
  const p = canvasPoint(e);
  cpHover = null;
  if (cpPart)
    for (let j = 0; j < 10; j++)
      if (cpCellHit(p, j)) { cpHover = { kind: "cell", i: j }; break; }
  if (!cpHover)
    for (let i = 0; i < PART_ORDER.length; i++)
      if (cpRowHit(p, i)) { cpHover = { kind: "swatch", i: i }; break; }
  cpCanvas.style.cursor = cpHover ? "pointer" : "default";
}
cpCanvas.addEventListener("mousemove", cpMove);

addEventListener("keydown", e => { if (e.key === "Escape") cpPart = null; });

// ---- drawing -----------------------------------------------------------
function cpPanel(x, y, w, h) {               // dark translucent backing, keycap-style
  ctx.fillStyle = "rgba(15,15,18,0.55)"; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fillRect(x, y, w, 1);
  ctx.fillStyle = "rgba(0,0,0,0.45)";   ctx.fillRect(x, y + h - 1, w, 1);
}
function cpOutline(x, y, w, h, col) {        // 1px box outline one pixel out
  ctx.fillStyle = col;
  ctx.fillRect(x - 1, y - 1, w + 2, 1);
  ctx.fillRect(x - 1, y + h, w + 2, 1);
  ctx.fillRect(x - 1, y - 1, 1, h + 2);
  ctx.fillRect(x + w, y - 1, 1, h + 2);
}

function drawColorPicker() {
  if (window.gameState !== 0) { cpPart = null; return; }   // title screen only
  cpT++; if (cpFlash > 0) cpFlash--;

  cpPanel(2, 62, 58, 102);                   // swatch column backing
  text(ctx, "COLORS", 4, 66, 1, PAL.goldL, PAL.black);

  for (let i = 0; i < PART_ORDER.length; i++) {
    const part = PART_ORDER[i];
    const bx = CP_BOX_X, by = CP_ROW_Y + i * CP_ROW_PITCH;
    text(ctx, PART_LABELS[part], CP_LABEL_X, by + 4, 1, PAL.white, PAL.black);
    ctx.fillStyle = PAL.black;              // dark frame
    ctx.fillRect(bx - 1, by - 1, CP_BOX + 2, CP_BOX + 2);
    ctx.fillStyle = CharacterData.colors[part];
    ctx.fillRect(bx, by, CP_BOX, CP_BOX);
    ctx.fillStyle = "rgba(255,255,255,0.3)";  // top sheen
    ctx.fillRect(bx, by, CP_BOX, 1);
    if (cpPart === part) {                    // open row: gold frame + apply pulse
      cpOutline(bx, by, CP_BOX, CP_BOX, PAL.gold);
      if (cpFlash > 0) {
        ctx.globalAlpha = (cpFlash / 26) * 0.5;
        ctx.fillStyle = PAL.goldL;
        ctx.fillRect(bx - 3, by - 3, CP_BOX + 6, CP_BOX + 6);
        ctx.globalAlpha = 1;
      }
    } else if (cpHover && cpHover.kind === "swatch" && cpHover.i === i) {
      cpOutline(bx, by, CP_BOX, CP_BOX, PAL.white);
    }
  }

  if (cpPart) {                               // palette strip (bottom band)
    cpPanel(0, 209, 176, 24);
    for (let j = 0; j < 10; j++) {
      const cx = CP_CELL_X + j * CP_CELL_PITCH, cy = CP_CELL_Y;
      ctx.fillStyle = PAL.black;
      ctx.fillRect(cx - 1, cy - 1, CP_CELL + 2, CP_CELL + 2);
      ctx.fillStyle = PICKER_COLORS[cpPart][j];
      ctx.fillRect(cx, cy, CP_CELL, CP_CELL);
      ctx.fillStyle = "rgba(255,255,255,0.3)";  // top sheen
      ctx.fillRect(cx, cy, CP_CELL, 1);
      const selected = PICKER_COLORS[cpPart][j] === CharacterData.colors[cpPart];
      if (selected) cpOutline(cx, cy, CP_CELL, CP_CELL, PAL.goldL);
      else if (cpHover && cpHover.kind === "cell" && cpHover.i === j)
        cpOutline(cx, cy, CP_CELL, CP_CELL, PAL.white);
    }
    text(ctx, PART_LABELS[cpPart], 180, 218, 1, PAL.goldL, PAL.black);
  }
}

// own rAF loop, registered after game.js's so this draws on top of the title
// scene each frame (game.js and assets.js are left untouched)
function cpFrame() { requestAnimationFrame(cpFrame); drawColorPicker(); }
function cpStart() { if (cpLoopOn) return; cpLoopOn = true; requestAnimationFrame(cpFrame); }
setTimeout(cpStart, 0);
addEventListener("DOMContentLoaded", cpStart);
