"use strict";
// ------------------------------------------------------------------ character data
// Data-driven hero appearance. applyCharacterData() re-bakes the hero sprite
// set from a color table; game.js consumes HERO_SET through this shared
// binding (rebuilt on every startGame). character-data.js must load after
// assets.js (PAL + bakeHeroSet) and before game.js.
const CharacterData = {
  type: "hero",
  colors: {
    head: "#f8c090",
    hair: "#1c1a20",
    body: "#f0f0f0",
    legs: "#d03028",
    belt: "#fcc000",
    shoes: "#0f0f12"
  }
};

let HERO_SET = bakeHeroSet(PAL);   // default bake; replaced by applyCharacterData

function applyCharacterData(data) {
  const pal = Object.assign({}, PAL, {
    skin: data.colors.head,
    hair: data.colors.hair,
    tank: data.colors.body,
    red:  data.colors.legs
  });
  HERO_SET = bakeHeroSet(pal);
  return HERO_SET;
}

// ------------------------------------------------------------------ monster data
// Data-driven enemy appearance, mirroring the hero interface above. Each kind
// keeps its own color state; applyMonsterData() re-bakes that kind's frames
// into MONSTER_SPRITES. Kinds absent from MONSTER_SPRITES fall back to the
// default sprites in game.js.
const MonsterData = {
  type: "goomba",                    // "goomba" | "koopa"
  colors: { body: PAL.goomba, face: PAL.face, dark: PAL.goombaD, eyes: PAL.black },
};

// current color state per kind, seeded from PAL (applyMonsterData merges into it)
let MONSTER_PALETTES = {
  goomba: { body: PAL.goomba, face: PAL.face,  dark: PAL.goombaD, eyes: PAL.black },
  koopa:  { body: PAL.koopa,  face: PAL.cream, dark: PAL.koopaD,  eyes: PAL.black },
};

// baked frames per kind: goomba { walk:[2], sq }, koopa { walk:[2] }
let MONSTER_SPRITES = {};

function applyMonsterData(data) {
  const type = data && data.type === "koopa" ? "koopa" : "goomba";
  const c = MONSTER_PALETTES[type];
  Object.assign(c, (data && data.colors) || {});
  if (type === "goomba") {
    const pal = { B: c.body, C: c.face, D: c.dark, K: c.eyes, W: PAL.white };
    MONSTER_SPRITES.goomba = {
      walk: GOOMBA_WALK.map(m => bakeMap(m, pal)),
      sq:   bakeMap(GOOMBA_SQ_MAP, pal),
    };
  } else {
    const pal = { Y: c.face, G: c.body, g: c.dark, K: c.eyes, C: PAL.rim, W: PAL.white };
    MONSTER_SPRITES.koopa = {
      walk: [ bakeMap(KOOPA_TOP.concat(KOOPA_LEGS[0]), pal),
              bakeMap(KOOPA_TOP.concat(KOOPA_LEGS[1]), pal) ],
    };
  }
  return MONSTER_SPRITES[type];
}
applyMonsterData(MonsterData);   // goomba live with default colors; koopa stays on defaults
