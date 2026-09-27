"use strict";
// ------------------------------------------------------------------ levels
// ROWS is the level height in tiles; game.js shares this binding for grid
// building and rendering (levels.js must load before game.js).
const ROWS = 17;

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
