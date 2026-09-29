"use strict";
// ------------------------------------------------------------------ preview panel
// Title-screen live preview (state === TITLE): shows the hero and the monster
// in their current colors, both idle-animated. Reads HERO_SET and
// MONSTER_SPRITES fresh every frame, so applyCharacterData()/applyMonsterData()
// updates appear instantly. Drawn on the canvas only -- no HTML elements.
// Called from the end of renderTitle() in game.js.

const PP_W = 160, PP_H = 124;   // panel size; position is derived from VW/VH at draw time
const PP_SCALE = 4;
const PP_HERO_W = 16 * PP_SCALE, PP_HERO_H = 26 * PP_SCALE;                 // 64x104
const PP_MON_W = 16 * PP_SCALE, PP_MON_H = 16 * PP_SCALE;                   // 64x64

function drawPreviewPanel() {
  const px = VW - PP_W - 4, py = VH - PP_H - 4;   // pinned to the bottom-right corner
  const pw = PP_W, ph = PP_H;

  // ---- panel: translucent field + gold border
  ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(px, py, pw, ph);
  ctx.fillStyle = PAL.goldL;
  ctx.fillRect(px, py, pw, 1);                 // top
  ctx.fillRect(px, py + ph - 1, pw, 1);        // bottom
  ctx.fillRect(px, py, 1, ph);                 // left
  ctx.fillRect(px + pw - 1, py, 1, ph);        // right

  // ---- columns: hero left, monster right, bottoms aligned
  const hx = px + 8, mx = px + pw - 8 - PP_MON_W;
  const feet = py + ph - 4;                    // shared baseline (4px pad)
  const hy = feet - PP_HERO_H, my = feet - PP_MON_H;
  const labelY = py + 6;

  // soft drop shadows under each subject
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(hx + 6, feet - 2, PP_HERO_W - 12, 2);
  ctx.fillRect(mx + 6, feet - 2, PP_MON_W - 12, 2);

  // ---- labels (5x7 bitmap font, centered over each column)
  text(ctx, "YOUR HERO", hx + PP_HERO_W / 2 - 27, labelY, 1, PAL.goldL, PAL.black);
  text(ctx, "YOUR MONSTER", mx + PP_MON_W / 2 - 36, labelY, 1, PAL.goldL, PAL.black);

  // ---- hero: gentle float (matches the title hero's cadence)
  const heroBob = Math.sin(frame / 30) * 3;
  ctx.drawImage(HERO_SET.idle, Math.floor(hx), Math.floor(hy + heroBob), PP_HERO_W, PP_HERO_H);

  // ---- monster: walk-frame cycle + float on the opposite phase
  const mSet = MONSTER_SPRITES[MonsterData.type] || MONSTER_SPRITES.goomba || {};
  const mWalk = mSet.walk || GOOMBA_F;
  const monBob = Math.sin(frame / 30 + Math.PI) * 2;
  ctx.drawImage(mWalk[Math.floor(frame / 12) % mWalk.length],
    Math.floor(mx), Math.floor(my + monBob), PP_MON_W, PP_MON_H);
}
