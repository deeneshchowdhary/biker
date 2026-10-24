// World themes: colours, scenery, hazards and music.
// Prop and hazard names refer to builders in models.js.

const NEON = [0xff2bd6, 0x22e4ff, 0xffe14d, 0x7dff6a, 0xff8a3c, 0xa66bff];
const CANDY = [0xff8fc8, 0xc49bff, 0x8fe3ff, 0xffe08f, 0xa6ffcb, 0xff9f9f];
const CANDY_ROCK = [0xff9fd0, 0xf7b2e0, 0xd9a6ff, 0xffb8c9];

export const WORLDS = [
  {
    id: 'farm', name: 'Farm Country', icon: '🚜', card: '#6fcf4a',
    sky: 0x9bdcff, fogNear: 70, fogFar: 330,
    ground: [0x74c94f, 0x67bb44], road: [0x707078, 0x6a6a72], rumble: [0xffffff, 0xe5413b], line: 0xffffff,
    bank: -5, curve: 0.009, hills: 9, rampChance: 0.1,
    props: [
      { m: 'tree', every: 15, off: [11, 45], scale: [0.8, 1.3] },
      { m: 'fence', aligned: true, every: 12, off: [9.6, 9.6], chance: 0.7 },
      { m: 'bush', every: 22, off: [10, 30], scale: [0.7, 1.2] },
      { m: 'barn', every: 260, off: [24, 40], scale: [0.9, 1.1] },
      { m: 'cow', every: 80, off: [13, 32], scale: [0.9, 1.1] },
      { m: 'hayroll', every: 55, off: [12, 38], scale: [0.9, 1.2] },
    ],
    hazards: [{ m: 'hay', w: 3 }, { m: 'sheep', w: 2, move: 'cross' }, { m: 'tractor', w: 1, move: 'sway' }],
    puddle: { color: 0x7a5230, effect: 'slow' },
    music: { bpm: 118, root: 60, scale: 'major', lead: 'square' },
  },
  {
    id: 'candy', name: 'Candy Canyon', icon: '🍭', card: '#ff7fc4',
    sky: 0xffd6f0, fogNear: 60, fogFar: 300,
    ground: [0xffa6d6, 0xff94cc], road: [0x7b4a36, 0x734531], rumble: [0xffffff, 0xff4fa3], line: 0xfff0a8,
    bank: 9, curve: 0.016, hills: 6, rampChance: 0.1,
    props: [
      { m: 'rockwall', every: 9, off: [26, 36], scale: [0.8, 1.3], sy: [0.7, 1.5], tint: CANDY_ROCK },
      { m: 'lollipop', every: 20, off: [10, 22], scale: [0.8, 1.3], tint: CANDY },
      { m: 'candycane', every: 32, off: [10, 20], scale: [0.9, 1.2] },
      { m: 'gumdrop', every: 18, off: [10, 24], scale: [0.6, 1.3], tint: CANDY },
      { m: 'cupcake', every: 70, off: [12, 22], scale: [0.9, 1.3] },
    ],
    arch: { every: 380, tint: [0xffffff] },
    hazards: [{ m: 'gumball', w: 3, move: 'roll' }, { m: 'bigGumdrop', w: 2 }],
    puddle: { color: 0x4a2c1d, effect: 'slow' },
    music: { bpm: 128, root: 65, scale: 'major', lead: 'triangle' },
  },
  {
    id: 'dino', name: 'Dino Valley', icon: '🦕', card: '#3fae6a',
    sky: 0xb8ecff, fogNear: 60, fogFar: 320,
    ground: [0x58a84a, 0x4f9c42], road: [0x9c7b55, 0x957450], rumble: [0xf2e3c6, 0x8b5a2b], line: 0xf2e3c6,
    bank: -7, curve: 0.011, hills: 14, rampChance: 0.16,
    props: [
      { m: 'palm', every: 18, off: [10, 32], scale: [0.8, 1.3] },
      { m: 'fern', every: 13, off: [9.6, 26], scale: [0.7, 1.4] },
      { m: 'dino', every: 170, off: [22, 36], scale: [0.8, 1.2] },
      { m: 'rock', every: 40, off: [11, 30], scale: [0.6, 1.5] },
      { m: 'volcano', every: 650, off: [80, 120], scale: [0.9, 1.3] },
    ],
    arch: { every: 520, tint: [0xf3ead8] },
    hazards: [{ m: 'foot', w: 2, move: 'stomp' }, { m: 'egg', w: 2 }],
    puddle: { color: 0x5b7d2e, effect: 'slow' },
    music: { bpm: 112, root: 57, scale: 'minorPent', lead: 'triangle' },
  },
  {
    id: 'snow', name: 'Snowy Peaks', icon: '⛄', card: '#6cb8ff',
    sky: 0xd8eeff, fog: 0xe8f4ff, fogNear: 50, fogFar: 280,
    ground: [0xf7fbff, 0xe9f1fa], road: [0x7f8b99, 0x798593], rumble: [0xffffff, 0x3a86ff], line: 0xffffff,
    bank: -6, curve: 0.01, hills: 12, rampChance: 0.1,
    props: [
      { m: 'pine', every: 11, off: [10, 40], scale: [0.8, 1.4] },
      { m: 'snowmanProp', every: 90, off: [11, 26], scale: [0.9, 1.2] },
      { m: 'igloo', every: 210, off: [16, 32], scale: [0.9, 1.2] },
      { m: 'ice', every: 45, off: [11, 34], scale: [0.6, 1.4] },
      { m: 'mountain', every: 380, off: [100, 140], scale: [0.9, 1.4] },
    ],
    hazards: [{ m: 'snowman', w: 2 }, { m: 'penguin', w: 3, move: 'slide' }],
    puddle: { color: 0xbfe9ff, effect: 'slip' },
    music: { bpm: 100, root: 64, scale: 'lydian', lead: 'sine' },
  },
  {
    id: 'neon', name: 'Neon City', icon: '🌃', card: '#7b4dff',
    sky: 0x1d1347, fog: 0x241a55, fogNear: 50, fogFar: 300,
    ground: [0x2b2f4a, 0x262a42], road: [0x3a3a52, 0x34344c], rumble: [0xff2bd6, 0x22e4ff], line: 0xffe14d,
    bank: 0, curve: 0.012, hills: 8, rampChance: 0.22,
    hemiSky: 0xbfb6ff,
    props: [
      { m: 'building', every: 11, off: [15, 30], scale: [0.8, 1.2], sy: [1, 4], tint: NEON },
      { m: 'lamp', aligned: true, every: 30, off: [8.6, 8.6], tint: [0x22e4ff, 0xff2bd6] },
    ],
    arch: { every: 220, tint: NEON },
    hazards: [{ m: 'cone', w: 3 }, { m: 'beachball', w: 2, move: 'bounce' }],
    puddle: { color: 0x9a4dff, effect: 'slip' },
    music: { bpm: 136, root: 57, scale: 'minor', lead: 'square' },
  },
];

export const MENU_MUSIC = { id: 'menu', music: { bpm: 104, root: 60, scale: 'major', lead: 'triangle' } };
