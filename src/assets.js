"use strict";
// ------------------------------------------------------------------ palette
const PAL = {
  sky:    "#5c94fc",
  cloud:  "#ffffff", cloudSh: "#c8e0f8",
  grassL: "#7ce050", grass: "#2ea82e", grassD: "#116611",
  dirt:   "#8a4a1a", dirtD: "#5c2c0c", dirtL: "#b06a2c",
  brickL: "#e08a4c", brick: "#b05018", brickD: "#401800",
  gold:   "#fcc000", goldD: "#a05000", goldL: "#ffefad",
  white:  "#f8f8f8", black: "#0f0f12",
  skin:   "#f8c090", skinD: "#dba572",
  red:    "#d03028", redD: "#8c1410",
  hair:   "#1c1a20", glass: "#08080a",
  tank:   "#f0f0f0", tankD: "#c0c8d0",
  hill:   "#1ca01c", hillD: "#0c6c14",
  pipe:   "#28a428", pipeL: "#80e880", pipeD: "#0a5c10",
  koopa:  "#30b030", koopaD: "#146614", cream: "#f8e080", rim: "#fff8c8",
  goomba: "#a04810", goombaD: "#6c2808", face: "#ffd9a0",
  pole:   "#b8c0c8", mouth: "#e86a6a",
  shB:    "#2870c8", shC: "#48a8f0",   // shield
  plant:  "#d82810", stem: "#0a7a0a",
};
const PAL_GOLD = Object.assign({}, PAL, {   // star-flash variant of the hero
  hair: "#f8d020", glass: "#ffffff", tank: "#fff8b0", tankD: "#e0a800",
  red: "#f8d020", redD: "#c09000", skin: "#fff0c0", skinD: "#e0b060",
});

// ------------------------------------------------------------------ bitmap font (5x7)
const FONT = {
  'A':[".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  'B':["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  'C':[".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."],
  'D':["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  'E':["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  'F':["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  'G':[".###.", "#....", "#....", "#..##", "#...#", "#...#", ".###."],
  'H':["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  'I':["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
  'J':["..###", "...#.", "...#.", "...#.", "...#.", "#..#.", ".##.."],
  'K':["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  'L':["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  'M':["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  'N':["#...#", "##..#", "##..#", "#.#.#", "#..##", "#..##", "#...#"],
  'O':[".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  'P':["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  'Q':[".###.", "#...#", "#...#", "#...#", "#.#.#", ".###.", "...##"],
  'R':["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  'S':[".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  'T':["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  'U':["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  'V':["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  'W':["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  'X':["#...#", ".#.#.", "..#..", "..#..", "..#..", ".#.#.", "#...#"],
  'Y':["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  'Z':["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  '0':[".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  '1':["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  '2':[".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  '3':["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
  '4':["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  '5':["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  '6':["..##.", ".#...", "#....", "####.", "#...#", "#...#", ".###."],
  '7':["#####", "....#", "...#.", "..#..", "..#..", "..#..", "..#.."],
  '8':[".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  '9':[".###.", "#...#", "#...#", ".####", "....#", "...#.", ".##.."],
  ' ':[".....", ".....", ".....", ".....", ".....", ".....", "....."],
  '.':[".....", ".....", ".....", ".....", ".....", ".##..", ".##.."],
  ',':[".....", ".....", ".....", ".....", ".##..", ".##..", "#...."],
  ':':[".....", ".##..", ".##..", ".....", ".##..", ".##..", "....."],
  '!':["..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."],
  '?':[".###.", "#...#", "....#", "..##.", ".....", "..#..", "....."],
  '-':[".....", ".....", ".....", ".###.", ".....", ".....", "....."],
  '+':[".....", "..#..", "..#..", "#####", "..#..", "..#..", "....."],
  '/':["....#", "...#.", "...#.", "..#..", ".#...", ".#...", "#...."],
  '(':["...#.", "..#..", ".#...", ".#...", ".#...", "..#..", "...#."],
  ')':[".#...", "..#..", "...#.", "...#.", "...#.", "..#..", ".#..."],
  "'":["..#..", "..#..", ".....", ".....", ".....", ".....", "....."],
};
function text(dr, s, x, y, sc, col, shadow) {
  sc = sc || 1;
  for (let pass = shadow ? 1 : 0; pass >= 0; pass--) {
    const c = pass ? shadow : col;
    dr.fillStyle = c;
    for (let k = 0; k < s.length; k++) {
      const g = FONT[s[k]] || FONT['?'];
      const ox = x + k * 6 * sc;
      for (let j = 0; j < 7; j++) for (let i = 0; i < 5; i++)
        if (g[j][i] === '#') dr.fillRect(ox + i * sc + pass * sc, y + j * sc + pass * sc, sc, sc);
    }
  }
}

// ------------------------------------------------------------------ sprite baking
function bake(w, h, fn) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  fn(c.getContext("2d"));
  return c;
}
function bakeMap(rows, pal) {
  const w = Math.max(...rows.map(r => r.length)), h = rows.length;
  return bake(w, h, g => {
    for (let y = 0; y < h; y++) for (let x = 0; x < rows[y].length; x++) {
      const col = pal[rows[y][x]];
      if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
    }
  });
}

// ----- hero: head + 6 body frames (16x26 total) -----
const HEAD_MAP = [
".....HHHHHH.....",
"...HHHHHHHHHH...",
"..HHHHHHHHHHHH..",
"..HHhhHHHHHHHH..",
".HHHHHHHHHHHHHH.",
".HHHHHHHHHHHHHH.",
".HKKKKKKKKKKKKH.",
".HKKKKKKKKKKKKH.",
".HKKKKKKKKKKKKH.",
".HKKKKKKKKKKKKH.",
".HSSSSSSSSSSSSH.",
".HSSSSSSSSmmSSH.",
".HHHHHHHHHHHHHH.",
];
const BODY_IDLE = [
"....SSSSSS......",
"..SWWWWWWWWWSS..",
"..SWWWWWWWWWSS..",
"..SWWWWWWWWWSS..",
"...wwwwwwwww....",
"...RRRRRRRRR....",
"..RRRRRRRRRRR...",
"..RRRRRRRRRRR...",
"...rRRRRRRRr....",
"....SS....SS....",
"....SS....SS....",
"...RRR...RRR....",
"...WWW...WWW....",
];
const BODY_RUN1 = [
"....SSSSSS......",
"..SWWWWWWWWWW...",
"..SWWWWWWWWWW...",
"..SWWWWWWWWWW...",
"...wwwwwwwww....",
"...RRRRRRRRR....",
"..RRRRRRRRRRR...",
"..RRRRRRRRRRR...",
"...rRRRRRRRr....",
"...SS......SS...",
"..SS........SS..",
".RRR........RRR.",
".WWW........WWW.",
];
const BODY_RUN2 = [
"....SSSSSS......",
"...WWWWWWWWWW...",
"...WWWWWWWWWW...",
"...WWWWWWWWWW...",
"...wwwwwwwww....",
"...RRRRRRRRR....",
"..RRRRRRRRRRR...",
"..RRRRRRRRRRR...",
"...rRRRRRRRr....",
".....SS..SS.....",
".....SS..SS.....",
"....RRR.RRR.....",
"....WWW.WWW.....",
];
const BODY_RUN3 = [
"....SSSSSS......",
"..SWWWWWWWWWW...",
"..SWWWWWWWWWW...",
"..SWWWWWWWWWW...",
"...wwwwwwwww....",
"...RRRRRRRRR....",
"..RRRRRRRRRRR...",
"..RRRRRRRRRRR...",
"...rRRRRRRRr....",
"....SSS..SS.....",
"...SS......SS...",
"...RRR....RRR...",
"...WWW....WWW...",
];
const BODY_JUMP = [
"....SSSSSS..SS..",
"..SWWWWWWWWWWSS.",
".SSWWWWWWWWWWSS.",
"...WWWWWWWWWW...",
"...wwwwwwwww....",
"...RRRRRRRRR....",
"..RRRRRRRRRRR...",
"..RRRRRRRRRRR...",
".RRRR....RRRR...",
".SSS......SSS...",
".SS........SS...",
"RRR........RRR..",
"WWW........WWW..",
];
const BODY_FALL = [
"....SSSSSS..SS..",
"..SWWWWWWWWWWSS.",
".SSWWWWWWWWWWSS.",
"...WWWWWWWWWW...",
"...wwwwwwwww....",
"...RRRRRRRRR....",
"..RRRRRRRRRRR...",
"..RRRRRRRRRRR...",
"...RRRRRRRRR....",
"....SS....SS....",
"....SS....SS....",
"...RRR....RRR...",
"...WWW....WWW...",
];
function heroPal(p) {
  return { H: p.hair, h: "#3a3842", K: p.glass, S: p.skin, m: p.mouth,
           W: p.tank, w: p.tankD, R: p.red, r: p.redD };
}
function bakeHeroFrame(body, p) {
  return bake(16, 26, g => {
    g.drawImage(bakeMap(body, heroPal(p)), 0, 13);
    g.drawImage(bakeMap(HEAD_MAP, heroPal(p)), 0, 0);
  });
}
function bakeHeroSet(p) {
  return {
    idle: bakeHeroFrame(BODY_IDLE, p), run1: bakeHeroFrame(BODY_RUN1, p),
    run2: bakeHeroFrame(BODY_RUN2, p), run3: bakeHeroFrame(BODY_RUN3, p),
    jump: bakeHeroFrame(BODY_JUMP, p), fall: bakeHeroFrame(BODY_FALL, p),
  };
}
const HERO_G = bakeHeroSet(PAL_GOLD);   // star-flash variant (base set lives in character-data.js)
const HEAD_ICON = bakeMap([
".HHHHHH.",
"HHHHHHHH",
"HKKKKKKH",
"HKKKKKKH",
"HSSSSSSH",
"HSSmmSSH",
"HHHHHHHH",
".HHHHHH.",
], { H: PAL.hair, K: PAL.glass, S: PAL.skin, m: PAL.mouth });

// ----- goomba -----
const GOOMBA_WALK = [[
"......BBBB......",
"....BBBBBBBB....",
"...BBBBBBBBBB...",
"..BBBBBBBBBBBB..",
".BBBBBBBBBBBBBB.",
".BKKWWBBBBKKWWB.",
"BBKWWWBBBBKWWWBB",
"BBBKWWBBBBKWWBBB",
"BBCCCCCCCCCCCCBB",
".CCCCCCCCCCCCCC.",
".DCCCCCCCCCCCCD.",
"..DDDDDDDDDDDD..",
"..KKKK....KKKK..",
".KKKKKK..KKKKKK.",
".KKKKK....KKKKK.",
".KKKK......KKKK.",
],[
"......BBBB......",
"....BBBBBBBB....",
"...BBBBBBBBBB...",
"..BBBBBBBBBBBB..",
".BBBBBBBBBBBBBB.",
".BKKWWBBBBKKWWB.",
"BBKWWWBBBBKWWWBB",
"BBBKWWBBBBKWWBBB",
"BBCCCCCCCCCCCCBB",
".CCCCCCCCCCCCCC.",
".DCCCCCCCCCCCCD.",
"..DDDDDDDDDDDD..",
".KKKK......KKKK.",
"KKKKKK....KKKKKK",
".KKKKK....KKKKK.",
"..KKKK....KKKK..",
]];
const GOOMBA_PAL = { B: PAL.goomba, C: PAL.face, W: PAL.white, K: PAL.black, D: PAL.goombaD };
const GOOMBA_F = GOOMBA_WALK.map(m => bakeMap(m, GOOMBA_PAL));
const GOOMBA_SQ = bakeMap([
"....BBBBBBBB....",
"..BBBBBBBBBBBB..",
".BBKWWBBBBWWKBB.",
"BBCCCCCCCCCCCCBB",
"KKKKKKK..KKKKKKK",
"KKKKK......KKKKK",
], GOOMBA_PAL);

// ----- koopa -----
const KOOPA_PAL = { Y: PAL.cream, G: PAL.koopa, g: PAL.koopaD, C: PAL.rim, W: PAL.white, K: PAL.black };
const KOOPA_TOP = [
"...YYYY.........",
"..YYYYYY........",
"..YWKYYY........",
"..YYYYYY........",
"...YYYY.GGGG....",
"....YYGGGGGGG...",
"....YGGGGGGGGG..",
"....GGgGGGGgGG..",
"...GGGGgGGGgGGG.",
"...GGGGGGgGGGGG.",
"...GGgGGGGGgGGG.",
"...GGGGGgGGGGGG.",
"...GGGGGGGgGGG..",
"....GGGGGGGGG...",
"....CCCCCCCCC...",
"....CCCCCCCC....",
"...CCCCCCCC.....",
];
const KOOPA_F = [
  bakeMap(KOOPA_TOP.concat(["...YYY....YYY...", "...YYY....YYY...", "..YYYY....YYYY.."]), KOOPA_PAL),
  bakeMap(KOOPA_TOP.concat(["...YYY....YYY...", "....YYY..YYY....", "....YYYY.YYY...."]), KOOPA_PAL),
];

// ----- piranha plant (in pipes) -----
const PIRANHA = bake(14, 26, g => {
  g.fillStyle = PAL.stem; g.fillRect(5, 12, 4, 14);
  g.fillStyle = PAL.pipeL; g.fillRect(5, 12, 1, 14);
  g.fillStyle = PAL.plant;
  g.fillRect(3, 2, 8, 10); g.fillRect(1, 4, 12, 6);
  g.fillRect(0, 6, 14, 3);
  g.fillStyle = PAL.white;
  g.fillRect(3, 4, 2, 2); g.fillRect(9, 8, 2, 2); g.fillRect(6, 3, 2, 2);
  g.fillRect(2, 12, 10, 2);
  g.fillStyle = PAL.black;
  g.fillRect(4, 13, 2, 1); g.fillRect(8, 13, 2, 1);
});

// ----- coin (4 spin frames) -----
const COIN_PAL = { C: PAL.goldD, c: PAL.gold, W: PAL.goldL };
const COIN_F = [
  bakeMap(["...CCCC...","..CccccC..",".CcWccccC.",".CcWccccC.",".CcWccccC.",".CcWccccC.",".CcWccccC.",".CcWccccC.",".CcWccccC.",".CcWccccC.","..CccccC..","...CCCC..."], COIN_PAL),
  bakeMap(["...CCCC...","..CccccC..","..CWcccC..","..CWcccC..","..CWcccC..","..CWcccC..","..CWcccC..","..CWcccC..","..CWcccC..","..CWcccC..","..CccccC..","...CCCC..."], COIN_PAL),
  bakeMap(["....CC....","....cc....","....Wc....","....Wc....","....Wc....","....Wc....","....Wc....","....Wc....","....Wc....","....Wc....","....cc....","....CC...."], COIN_PAL),
  bakeMap(["...CCCC...","..CccccC..","..CccWcC..","..CccWcC..","..CccWcC..","..CccWcC..","..CccWcC..","..CccWcC..","..CccWcC..","..CccWcC..","..CccccC..","...CCCC..."], COIN_PAL),
];

// ----- power-up items -----
const SHROOM = bakeMap([
".....RRRRRR.....",
"...RRWWWWWWRR...",
"..RRRWWWWWWRRR..",
".RRRRRWWWWRRRRR.",
".RWWRRRRRRRRWWR.",
"RWWWWRRRRRRWWWWR",
"RWWWWRRRRRRWWWWR",
"RRWWRRRRRRRRWWRR",
"RRRRRRRRRRRRRRRR",
".RRRRRRRRRRRRRR.",
"..CCCCCCCCCCCC..",
"..CCKCCCCCCKCC..",
"..CCKCCCCCCKCC..",
"..CCCCCCCCCCCC..",
"..CCCCCCCCCCCC..",
"...CCCCCCCCCC...",
], { R: PAL.red, W: PAL.white, C: PAL.face, K: PAL.black });
const STAR = bakeMap([
".......YY.......",
"......YYYY......",
"......YYYY......",
".YYYYYYYYYYYYYY.",
"..YYYYYYYYYYYY..",
"...YYYYYYYYYY...",
"...YYKYYYYKYY...",
"....YKYYYYKY....",
"....YYYYYYYY....",
"...YYYY..YYYY...",
"..YYY......YYY..",
".YYY........YYY.",
"YYY..........YYY",
"YY............YY",
], { Y: "#f8d820", K: PAL.black });
const SHIELD = bakeMap([
"..BBBBBBBB..",
".BBccccccBB.",
".BccccccccB.",
".BcccWWcccB.",
".BccWWWWccB.",
".BcccWWcccB.",
".BccccccccB.",
".BccccccccB.",
"..BccccccB..",
"...BccccB...",
"....BccB....",
".....BB.....",
], { B: PAL.shB, c: PAL.shC, W: PAL.white });
const MINI_STAR = bakeMap([
"...YY...",
"...YY...",
".YYYYYY.",
"..YYYY..",
"..YYYY..",
".YY..YY.",
"YY....YY",
], { Y: "#f8d820" });
const MINI_SHIELD = bakeMap([
"BBBBBBBB",
"BccccccB",
"BcWWWWcB",
"BccWWccB",
"BccccccB",
".BccccB.",
"..BccB..",
"...BB...",
], { B: PAL.shB, c: PAL.shC, W: PAL.white });

// ----- tiles -----
const DIRT_ROWS = [
"DDDDDDDDDDDDDDDD","DDDDDdDDDDDDDDDD","DdDDDDDDDDDeDDDD","DDDDDDDDDDDDDDDD",
"DDDeDDDDDDDdDDDD","DDDDDDDDDDDDDDDD","DDDDDDDdDDDDDDDD","DdDDDDDDDDDDDDDD",
"DDDDDDDDDDDeDDDD","DDDDdDDDDDDDDDDD","DDDDDDDDDDDDDDDD","DeDDDDDDDDDDDDDD",
];
const TILES = {};
TILES.groundTop = bakeMap([
"AAAAAAAAGGGGGGGG",
"GGGGgGGGGGGGgGGG",
"GGGGGGGGGgGGGGGG",
"GgGGGGGGGGGGGgGG",
].concat(DIRT_ROWS), { A: PAL.grassL, G: PAL.grass, g: PAL.grassD, D: PAL.dirt, d: PAL.dirtD, e: PAL.dirtL });
TILES.groundFill = bakeMap(DIRT_ROWS.concat(DIRT_ROWS.slice().reverse()),
  { D: PAL.dirt, d: PAL.dirtD, e: PAL.dirtL });
TILES.brick = bakeMap(["hhhhhhhhhhhhhhhh"]
  .concat(Array(6).fill("h" + "o".repeat(13) + "uu"))
  .concat(["uuuuuuuuuuuuuuuu"])
  .concat(Array(7).fill("ohooooou" + "h" + "oooooouu"))
  .concat(["uuuuuuuuuuuuuuuu"]),
  { h: PAL.brickL, o: PAL.brick, u: PAL.brickD });
const QBASE = [
"LLLLLLLLLLLLLLLD",
"LYYYYYYYYYYYYYYD",
"LYKYYYYYYYYYYKYD",
].concat(Array(10).fill("LYYYYYYYYYYYYYYD")).concat([
"LYKYYYYYYYYYYKYD",
"LYYYYYYYYYYYYYYD",
"DDDDDDDDDDDDDDDD",
]);
const QGLYPH = FONT['?'];
TILES.q = bake(16, 16, g => {
  g.drawImage(bakeMap(QBASE, { L: PAL.goldL, Y: PAL.gold, D: PAL.goldD, K: PAL.black }), 0, 0);
  for (let pass = 1; pass >= 0; pass--) {
    g.fillStyle = pass ? PAL.goldD : PAL.white;
    for (let j = 0; j < 7; j++) for (let i = 0; i < 5; i++)
      if (QGLYPH[j][i] === '#') g.fillRect(5 + i + pass, 4 + j + pass, 1, 1);
  }
});
TILES.used = bakeMap(["uuuuuuuuuuuuuuuu"]
  .concat(Array(14).fill("uUUUUUUUUUUUUVu"))
  .concat(["VVVVVVVVVVVVVVVV"]),
  { u: PAL.brickD, U: "#8a4210", V: "#5c2c0c" });
const PIPE_PAL = { p: PAL.pipe, P: PAL.pipeL, q: PAL.pipeD };
TILES.pipeLL = bakeMap([
".ppppppppppppppq",
"pPPPPppppppppqqq",
"pPPPPppppppppqqq",
"pPPPPppppppppqqq",
"pPPPPppppppppqqq",
"pPPPPppppppppqqq",
"pPPPPppppppppqqq",
"pppppppppppppqqq",
".pPPPpppppppppq.",
".pPPPpppppppppq.",
".pPPPpppppppppq.",
".pPPPpppppppppq.",
".pPPPpppppppppq.",
".pPPPpppppppppq.",
".pPPPpppppppppq.",
".pPPPpppppppppq.",
], PIPE_PAL);
TILES.pipeLR = bakeMap([
"pppppppppppppqq.",
"pppppppppppqqq..",
"pppppppppppqqq..",
"pppppppppppqqq..",
"pppppppppppqqq..",
"pppppppppppqqq..",
"pppppppppppqqq..",
"pppppppppppqqq..",
".pppppppppppppq.",
".pppppppppppppq.",
".pppppppppppppq.",
".pppppppppppppq.",
".pppppppppppppq.",
".pppppppppppppq.",
".pppppppppppppq.",
".pppppppppppppq.",
], PIPE_PAL);
TILES.pipeBL = bakeMap(Array(16).fill(".pPPPpppppppppq."), PIPE_PAL);
TILES.pipeBR = bakeMap(Array(16).fill(".pppppppppppppq."), PIPE_PAL);

// ----- background pieces -----
const CLOUD = bake(38, 18, g => {
  const P = (cx, cy, r) => { for (let dy = -r; dy <= r; dy++) { const w = Math.floor(Math.sqrt(r * r - dy * dy)); g.fillRect(cx - w, cy + dy, w * 2 + 1, 1); } };
  g.fillStyle = PAL.cloud; P(11, 11, 7); P(19, 7, 9); P(28, 11, 7); g.fillRect(4, 11, 31, 6);
  g.fillStyle = PAL.cloudSh; g.fillRect(4, 15, 31, 2);
});
function bakeHill(w, h) {
  return bake(w, h, g => {
    for (let j = 0; j < h; j++) {
      const half = Math.max(2, Math.floor((w / 2) * ((j + 1) / h) / 2) * 2);
      const y = j;
      g.fillStyle = PAL.hill; g.fillRect(w / 2 - half, y, half * 2, 1);
      g.fillStyle = PAL.hillD; g.fillRect(w / 2 - half, y, 1, 1); g.fillRect(w / 2 + half - 1, y, 1, 1);
    }
    g.fillStyle = PAL.hillD;
    g.fillRect(w / 2 - 1, 4, 2, 2); g.fillRect(w / 2 - 8, h - 10, 2, 2); g.fillRect(w / 2 + 6, h - 10, 2, 2);
  });
}
const HILL_BIG = bakeHill(96, 40), HILL_SMALL = bakeHill(64, 26);
const BUSH = bake(46, 16, g => {
  const P = (cx, cy, r, col) => { g.fillStyle = col; for (let dy = -r; dy <= r; dy++) { const w = Math.floor(Math.sqrt(r * r - dy * dy)); g.fillRect(cx - w, cy + dy, w * 2 + 1, 1); } };
  P(10, 9, 7, PAL.grass); P(23, 6, 9, PAL.grass); P(36, 9, 7, PAL.grass);
  g.fillStyle = PAL.grass; g.fillRect(3, 9, 40, 7);
  g.fillStyle = PAL.grassD; g.fillRect(3, 14, 40, 2);
  g.fillStyle = PAL.grassL; g.fillRect(22, 0, 2, 1); g.fillRect(9, 3, 2, 1); g.fillRect(35, 3, 2, 1);
});

