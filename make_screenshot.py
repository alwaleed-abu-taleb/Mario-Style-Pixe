# Renders a retro 16-bit platformer "game screenshot" as pixel art.
# Hero is custom-designed from the reference image:
# black bob-cut hair, straight bangs, big black sunglasses, white tank top, red shorts.
from PIL import Image, ImageDraw

LW, LH = 480, 270          # logical pixel canvas
FINAL = 4                  # upscale factor -> 1920x1080

SKY = (92, 148, 252)

img = Image.new("RGB", (LW, LH), SKY)
d = ImageDraw.Draw(img)

def rect(x0, y0, x1, y1, c):
    d.rectangle([x0, y0, x1, y1], fill=c)

def sprite(rows, x, y, pal):
    w = max(len(r) for r in rows)
    for j, row in enumerate(rows):
        if len(row) != w:
            print("MAP WIDTH WARN:", len(row), "vs", w, "->", row)
        for i, ch in enumerate(row):
            c = pal.get(ch)
            if c is not None:
                rect(x + i, y + j, x + i, y + j, c)

def pcircle(cx, cy, r, c):
    for dy in range(-r, r + 1):
        w = int((r * r - dy * dy) ** 0.5)
        rect(cx - w, cy + dy, cx + w, cy + dy, c)

def line(p0, p1, w, c):
    d.line([p0, p1], fill=c, width=w)
    for (x, y) in (p0, p1):
        h = w // 2
        rect(x - h, y - h, x - h + w - 1, y - h + w - 1, c)

# ------------------------------------------------------------------ font (5x7)
FONT = {
'S':(".####.","#.....","#.....",".####.",".....#",".....#","####_."),
'C':(".###.","#...#","#....","#....","#....","#...#",".###."),
'O':(".###.","#...#","#...#","#...#","#...#","#...#",".###."),
'R':("####.","#...#","#...#","####.","#.#..","#..#.","#...#"),
'E':("#####","#....","#....","####.","#....","#....","#####"),
'W':("#...#","#...#","#...#","#.#.#","#.#.#","##.##","#...#"),
'L':("#....","#....","#....","#....","#....","#....","#####"),
'D':("####.","#...#","#...#","#...#","#...#","#...#","####."),
'T':("#####","..#..","..#..","..#..","..#..","..#..","..#.."),
'I':("#####","..#..","..#..","..#..","..#..","..#..","#####"),
'M':("#...#","##.##","#.#.#","#.#.#","#...#","#...#","#...#"),
'V':("#...#","#...#","#...#","#...#","#...#",".#.#.","..#.."),
'J':("..###","...#.","...#.","...#.","...#.","#..#.",".##.."),
'U':("#...#","#...#","#...#","#...#","#...#","#...#",".###."),
'P':("####.","#...#","#...#","####.","#....","#....","#...."),
'N':("#...#","##..#","##..#","#.#.#","#..##","#..##","#...#"),
'F':("#####","#....","#....","####.","#....","#....","#...."),
'0':(".###.","#...#","#...#","#...#","#...#","#...#",".###."),
'1':("..#..",".##..","..#..","..#..","..#..","..#..",".###."),
'2':(".###.","#...#","....#","...#.","..#..",".#...","#####"),
'3':("####.","....#","....#",".###.","....#","....#","####."),
'4':("...#.","..##.",".#.#.","#..#.","#####","...#.","...#."),
'5':("#####","#....","####.","....#","....#","#...#",".###."),
'6':("..##.",".#...","#....","####.","#...#","#...#",".###."),
'7':("#####","....#","...#.","..#..","..#..","..#..","..#.."),
'8':(".###.","#...#","#...#",".###.","#...#","#...#",".###."),
'9':(".###.","#...#","#...#",".####","....#","...#.",".##.."),
':':(".....",".##..",".##..",".....",".##..",".##..","....."),
'-':(".....",".....",".....",".###.",".....",".....","....."),
'?':(".###.","#...#","....#","..##.",".....","..#..","....."),
' ':(".....",".....",".....",".....",".....",".....","....."),
}

def text(s, x, y, sc, c, dr, shadow=(0, 0, 0, 255)):
    for phase in (1, 0):
        for k, ch in enumerate(s):
            g = FONT[ch]
            ox = x + k * 6 * sc
            for j, row in enumerate(g):
                for i, ch2 in enumerate(row):
                    if ch2 == '#':
                        px = ox + i * sc + (sc if phase else 0)
                        py = y + j * sc + (sc if phase else 0)
                        if phase:
                            dr.rectangle([px, py, px + sc - 1, py + sc - 1], fill=shadow)
                        else:
                            dr.rectangle([px, py, px + sc - 1, py + sc - 1], fill=c)

# ------------------------------------------------------------------ palettes
PAL_TILE = {'h': (240, 156, 80), 'o': (200, 92, 20), 'd': (60, 24, 0)}
PAL_BRICK = {'h': (232, 128, 72), 'o': (180, 76, 12), 'd': (48, 16, 0)}
PAL_Q = {'L': (255, 224, 130), 'Y': (248, 184, 0), 'D': (160, 88, 0), 'K': (32, 16, 0)}
PAL_COIN = {'C': (156, 88, 0), 'c': (252, 192, 0), 'W': (255, 239, 173)}
PAL_SHROOM = {'R': (216, 40, 0), 'W': (255, 255, 255), 'C': (255, 216, 160), 'K': (30, 20, 10)}
PAL_GOOMBA = {'B': (160, 64, 16), 'C': (255, 217, 160), 'W': (255, 255, 255),
              'K': (20, 10, 5), 'D': (108, 40, 8)}
PAL_KOOPA = {'Y': (248, 224, 128), 'G': (40, 160, 40), 'g': (20, 112, 20),
             'C': (255, 248, 200), 'W': (255, 255, 255), 'K': (20, 15, 5)}
PAL_HERO = {'H': (26, 24, 28), 'h': (56, 52, 60), 'K': (8, 8, 10), 'W': (230, 240, 255),
            'S': (248, 192, 144), 'm': (232, 106, 106)}

# ------------------------------------------------------------------ tile maps
TILE = (
"hhhhhhhhhhhhhhhh",
) + tuple("h" + "o" * 14 + "d" for _ in range(6)) + (
"dddddddddddddddd",
) + tuple("ohooooo" + "d" + "h" + "oooooo" + "d" for _ in range(7)) + (
"dddddddddddddddd",
)

QBLOCK = (
"LLLLLLLLLLLLLLLD",
"LYYYYYYYYYYYYYYD",
"LYKYYYYYYYYYYKYD",
) + tuple("LYYYYYYYYYYYYYYD" for _ in range(10)) + (
"LYKYYYYYYYYYYKYD",
"LYYYYYYYYYYYYYYD",
"DDDDDDDDDDDDDDDD",
)

COIN = (
"...CCCC...",
"..CccccC..",
".CcWccccC.",
".CcWccccC.",
".CcWccccC.",
".CcWccccC.",
".CcWccccC.",
".CcWccccC.",
".CcWccccC.",
".CcWccccC.",
"..CccccC..",
"...CCCC...",
)

SHROOM = (
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
)

GOOMBA = (
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
)

KOOPA = (
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
"...YYY....YYY...",
"...YYY....YYY...",
"..YYYY....YYYY..",
"..YYY......YYY..",
"..YYY......YYY..",
)

HERO_HEAD = (
"......HHHHHH......",
"....HHHHHHHHHH....",
"...HHHhhHHHHHHH...",
"..HHHHHHHHHHHHHH..",
"..HHHHHHHHHHHHHH..",
".HHHHHHHHHHHHHHHH.",
".HHHHHHHHHHHHHHHH.",
".HHKKKKKKKKKKKKHH.",
".HHKKKKKKKKKKKKHH.",
".HHKKKKKKKKKKKKHH.",
".HHKKKKKKKKKKKKHH.",
".HHSSSSSSSSSSSSHH.",
".HHSSSSSSSSmmSSHH.",
".HHHHHHHHHHHHHHHH.",
"..HHHHHHHHHHHHHH..",
)

# ------------------------------------------------------------------ scenery
def cloud(cx, cy, s):
    pcircle(cx - 12 * s, cy + 1, 7 * s, (255, 255, 255))
    pcircle(cx, cy - 4 * s, 9 * s, (255, 255, 255))
    pcircle(cx + 12 * s, cy + 1, 7 * s, (255, 255, 255))
    rect(cx - 17 * s, cy + 2, cx + 17 * s, cy + 7 * s, (255, 255, 255))
    rect(cx - 17 * s, cy + 6 * s, cx + 17 * s, cy + 7 * s, (205, 226, 255))

def hill(cx, base_y, half_w, h, main, dark):
    for j in range(h):
        t = (j + 1) / h
        half = max(2, int(half_w * t) // 2 * 2)
        y = base_y - h + j
        rect(cx - half, y, cx + half, y, main)
        rect(cx - half, y, cx - half, y, dark)
        rect(cx + half, y, cx + half, y, dark)

def bush(cx, base_y, s):
    g1, g2, g3 = (44, 180, 44), (14, 122, 14), (134, 226, 134)
    pcircle(cx - 9 * s, base_y - 6 * s, 7 * s, g1)
    pcircle(cx, base_y - 9 * s, 9 * s, g1)
    pcircle(cx + 9 * s, base_y - 6 * s, 7 * s, g1)
    rect(cx - 15 * s, base_y - 4 * s, cx + 15 * s, base_y, g1)
    rect(cx - 15 * s, base_y - 1, cx + 15 * s, base_y, g2)
    rect(cx - 2 * s, base_y - 14 * s, cx + 1 * s, base_y - 13 * s, g3)

def pipe(x, top_y, w=30, h=38):
    outline = (0, 48, 0)
    mid = (34, 168, 34)
    lite = (128, 232, 128)
    dark = (10, 92, 10)
    # lip
    rect(x - 3, top_y, x + w + 2, top_y + 8, outline)
    rect(x - 2, top_y + 1, x + w + 1, top_y + 7, mid)
    rect(x, top_y + 1, x + 4, top_y + 7, lite)
    rect(x + w - 5, top_y + 1, x + w + 1, top_y + 7, dark)
    # body
    rect(x, top_y + 8, x + w - 1, 232, outline)
    rect(x + 1, top_y + 8, x + w - 2, 231, mid)
    rect(x + 3, top_y + 8, x + 6, 231, lite)
    rect(x + w - 7, top_y + 8, x + w - 2, 231, dark)

GROUND_Y = 232
for tx in range(0, LW, 16):
    for ty in (GROUND_Y, GROUND_Y + 16, GROUND_Y + 32):
        sprite(TILE, tx, ty, PAL_TILE)

# clouds
cloud(60, 78, 1); cloud(178, 56, 1); cloud(332, 88, 1); cloud(432, 66, 1)

# hills
hill(84, GROUND_Y, 46, 34, (26, 168, 26), (10, 104, 10))
for sx, sy in ((76, 208), (94, 212), (85, 220)):
    rect(sx, sy, sx + 1, sy + 1, (10, 104, 10))
hill(448, GROUND_Y, 30, 22, (26, 168, 26), (10, 104, 10))
rect(442, 218, 443, 219, (10, 104, 10)); rect(454, 222, 455, 223, (10, 104, 10))

# bushes
bush(52, GROUND_Y, 1); bush(258, GROUND_Y, 1); bush(438, GROUND_Y, 1)

# pipe
pipe(336, 194)

# ------------------------------------------------------------------ blocks
QGLYPH = FONT['?']
def qblock(x, y):
    sprite(QBLOCK, x, y, PAL_Q)
    for phase in (1, 0):
        col = (160, 88, 0) if phase else (255, 255, 255)
        for j, row in enumerate(QGLYPH):
            for i, ch in enumerate(row):
                if ch == '#':
                    rect(x + 5 + i + phase, y + 4 + j + phase,
                         x + 5 + i + phase, y + 4 + j + phase, col)

qblock(108, 168)                       # lone low block
qblock(204, 152); qblock(252, 152)     # in the row
qblock(212, 92)                        # high block
for bx in (188, 220, 236, 268):
    sprite(TILE, bx, 152, PAL_BRICK)

# ------------------------------------------------------------------ coins
def coin(x, y):
    sprite(COIN, x, y, PAL_COIN)
    rect(x + 9, y - 1, x + 9, y - 1, (255, 255, 255))
    rect(x + 10, y, x + 10, y, (255, 255, 255))

for cx, cy in ((90, 150), (194, 122), (210, 116), (226, 122), (300, 184), (316, 176)):
    coin(cx, cy)

# ------------------------------------------------------------------ enemies + power-up
sprite(SHROOM, 236, 136, PAL_SHROOM)
sprite(GOOMBA, 298, 216, PAL_GOOMBA)
sprite(GOOMBA, 322, 216, PAL_GOOMBA)
sprite(KOOPA, 372, 210, PAL_KOOPA)

# ------------------------------------------------------------------ hero
SKIN = (248, 192, 144)
SKIN_SH = (219, 165, 114)
RED = (208, 48, 40)
RED_D = (160, 24, 16)
WHITE = (248, 248, 248)
WHITE_SH = (214, 214, 214)

def hero(ax, ay):
    # back limbs
    line((144, 168), (136, 176), 3, SKIN_SH)
    rect(133, 175, 135, 177, SKIN_SH)
    line((145, 182), (138, 188), 3, SKIN_SH)
    rect(131, 186, 140, 190, RED)
    rect(131, 191, 140, 192, (255, 255, 255))
    # torso: white tank top
    rect(143, 166, 154, 174, WHITE)
    rect(143, 166, 143, 174, WHITE_SH)
    rect(143, 174, 154, 174, WHITE_SH)
    # red shorts
    rect(142, 175, 155, 182, RED)
    rect(142, 181, 155, 182, RED_D)
    # front leg
    line((152, 182), (156, 190), 3, SKIN)
    rect(152, 190, 162, 195, RED)
    rect(152, 196, 162, 197, (255, 255, 255))
    # neck + head
    rect(146, 163, 150, 165, SKIN)
    sprite(HERO_HEAD, ax, ay, PAL_HERO)
    # front arm pumping forward
    line((152, 168), (161, 162), 3, SKIN)
    rect(161, 160, 163, 162, SKIN)

# ------------------------------------------------------------------ fx overlay (motion)
fx = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
fd = ImageDraw.Draw(fx)
fd.ellipse([134, 227, 162, 233], fill=(0, 0, 0, 70))          # jump shadow
for (x0, y0, x1, y1, a) in ((116, 168, 126, 169, 120), (108, 178, 120, 179, 100),
                            (118, 157, 125, 158, 110)):       # speed lines
    fd.rectangle([x0, y0, x1, y1], fill=(255, 255, 255, a))
for (x0, y0, x1, y1) in ((122, 226, 126, 229), (114, 220, 118, 223), (128, 230, 132, 232)):
    fd.rectangle([x0, y0, x1, y1], fill=(255, 255, 255, 150))  # dust puffs

img = Image.alpha_composite(img.convert("RGBA"), fx)
d = ImageDraw.Draw(img)
hero(138, 148)

# ------------------------------------------------------------------ HUD + controller overlay
ui = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
ud = ImageDraw.Draw(ui)

text("SCORE 004500", 8, 6, 2, (255, 255, 255, 255), ud)
text("WORLD 1-1", 8, 24, 2, (255, 255, 255, 255), ud)
text("TIME 240", 8, 42, 2, (255, 255, 255, 255), ud)
text("LIVES: 3", 378, 6, 2, (255, 255, 255, 255), ud)

DARK = (28, 34, 46, 195)
EDGE = (76, 88, 108, 220)
ARROW = (235, 242, 250, 235)
cx, cy = 64, 234
ud.rectangle([56, 212, 71, 256], fill=EDGE)
ud.rectangle([42, 226, 86, 242], fill=EDGE)
ud.rectangle([57, 213, 70, 255], fill=DARK)
ud.rectangle([43, 227, 85, 241], fill=DARK)
ud.polygon([(48, cy), (56, cy - 5), (56, cy + 5)], fill=ARROW)
ud.polygon([(80, cy), (72, cy - 5), (72, cy + 5)], fill=ARROW)
ud.polygon([(cx, 219), (cx - 5, 227), (cx + 5, 227)], fill=ARROW)
ud.polygon([(cx, 249), (cx - 5, 241), (cx + 5, 241)], fill=ARROW)
ud.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], outline=EDGE)

def button(bx, by, r, label):
    ud.ellipse([bx - r, by - r, bx + r, by + r], fill=(120, 16, 8, 225))
    ud.ellipse([bx - r + 2, by - r + 2, bx + r - 2, by + r - 2], fill=(226, 50, 40, 210))
    lx = bx - (len(label) * 6 - 1) // 2
    text(label, lx, by - 3, 1, (255, 255, 255, 255), ud)

button(424, 240, 15, "RUN")
button(458, 212, 17, "JUMP")

img = Image.alpha_composite(img, ui).convert("RGB")

# ------------------------------------------------------------------ upscale + save
final = img.resize((LW * FINAL, LH * FINAL), Image.NEAREST)
final.save("world_1_1.png")
print("saved world_1_1.png", final.size)
