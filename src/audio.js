"use strict";
// ------------------------------------------------------------------ audio
// Chiptune SFX + music loop.
// Reads game state through the window bridge published by game.js in update()
// (gamePaused / gameNamePopupOpen / gameState / gameMuted) instead of
// reaching into game.js's bindings directly.
// State ids mirror game.js: TITLE=0, PLAY=1, FLAGSEQ=2.
const ST_TITLE = 0, ST_PLAY = 1, ST_FLAGSEQ = 2;

let AC = null;
function initAudio() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
  if (AC && AC.state === "suspended") AC.resume();
}
function beep(f0, f1, dur, type, vol, when) {
  if (!AC || window.gameMuted) return;
  const t = (when !== undefined ? when : AC.currentTime);
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type || "square";
  o.frequency.setValueAtTime(f0, t);
  if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  g.gain.setValueAtTime(vol || 0.08, t);
  g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
  o.connect(g); g.connect(AC.destination);
  o.start(t); o.stop(t + dur + 0.02);
}
function seq(notes, type, vol) {
  if (!AC || window.gameMuted) return;
  let t = AC.currentTime;
  for (const [f, d, gap] of notes) { if (f) beep(f, 0, d, type, vol, t); t += (gap !== undefined ? gap : d); }
}
const SFX = {
  jump()     { beep(260, 520, 0.14, "square", 0.06); },
  coin()     { seq([[988, 0.06], [1319, 0.22]], "square", 0.06); },
  stomp()    { beep(420, 90, 0.14, "square", 0.09); },
  bump()     { beep(110, 70, 0.08, "square", 0.08); },
  brick()    { beep(180, 60, 0.12, "sawtooth", 0.07); },
  power()    { seq([[523, 0.07], [659, 0.07], [784, 0.07], [1047, 0.18]], "square", 0.06); },
  shieldUp() { seq([[392, 0.07], [523, 0.07], [659, 0.16]], "triangle", 0.09); },
  shieldHit(){ seq([[659, 0.07], [392, 0.2]], "triangle", 0.09); },
  oneup()    { seq([[659, 0.08], [784, 0.08], [1319, 0.08], [1047, 0.08], [1175, 0.08], [1568, 0.24]], "square", 0.06); },
  die()      { seq([[494, 0.12], [466, 0.12], [440, 0.12], [150, 0.5, 0.5]], "square", 0.08); },
  flag()     { seq([[392, 0.09], [523, 0.09], [659, 0.09], [784, 0.09], [1047, 0.09], [1319, 0.2]], "square", 0.06); },
  clear()    { seq([[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.28]], "square", 0.07); },
  win()      { seq([[523, 0.12], [523, 0.12], [523, 0.12], [659, 0.2], [784, 0.2], [1047, 0.4]], "square", 0.07); },
  over()     { seq([[392, 0.2], [370, 0.2], [349, 0.2], [330, 0.5]], "triangle", 0.09); },
  pause()    { seq([[880, 0.06], [660, 0.08]], "square", 0.05); },
};
// --- tiny chiptune loop (2 voices) ---
const MELODY = [
  67,0,72,0, 76,0,72,0,  67,0,72,0, 76,74,72,71,
  69,0,72,0, 77,0,76,0,  74,0,71,0, 67,0,64,0,
];
const BASSLN = [
  48,0,55,0, 48,0,55,0,  45,0,52,0, 45,0,52,0,
  41,0,48,0,  41,0,48,0,  43,0,50,0, 43,0,50,0,
];
const SPB = 0.21;
let mStep = 0, mNext = 0;
const mf = m => 440 * Math.pow(2, (m - 69) / 12);
setInterval(() => {
  if (!AC || window.gameMuted || window.gamePaused || window.gameNamePopupOpen ||
      (window.gameState !== ST_PLAY && window.gameState !== ST_FLAGSEQ && window.gameState !== ST_TITLE)) return;
  const ahead = AC.currentTime + 0.35;
  if (mNext < AC.currentTime - 0.5) mNext = AC.currentTime + 0.05;
  while (mNext < ahead) {
    const m = MELODY[mStep], b = BASSLN[mStep];
    if (m) beep(mf(m), 0, 0.17, "square", 0.028, mNext);
    if (b) beep(mf(b), 0, 0.19, "triangle", 0.05, mNext);
    mStep = (mStep + 1) % 32; mNext += SPB;
  }
}, 90);
function musicReset() { mStep = 0; if (AC) mNext = AC.currentTime + 0.1; }
