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
