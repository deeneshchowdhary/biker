// Garage catalogue and the sticker book.

export const SHOP = {
  bike: [
    { id: 'classic', name: 'Racer', icon: '🏁', price: 0, speed: 1.0, accel: 1.0 },
    { id: 'superbike', name: 'Superbike', icon: '⚡', price: 120, speed: 1.04, accel: 1.05 },
    { id: 'motocross', name: 'Motocross', icon: '🏔️', price: 180, speed: 1.0, accel: 1.15 },
    { id: 'hyper', name: 'Hyper', icon: '💨', price: 300, speed: 1.1, accel: 0.96 },
    { id: 'gp', name: 'GP Racer', icon: '🏆', price: 500, speed: 1.08, accel: 1.08 },
    { id: 'scooter', name: 'Scooter', icon: '🛵', price: 80, speed: 0.98, accel: 1.15 },
    { id: 'chopper', name: 'Chopper', icon: '🦅', price: 150, speed: 1.04, accel: 0.92 },
    { id: 'banana', name: 'Banana', icon: '🍌', price: 250, speed: 1.03, accel: 1.08 },
    { id: 'rocket', name: 'Rocket', icon: '🚀', price: 400, speed: 1.07, accel: 1.05, boost: 1.25 },
  ],
  color: [
    { id: 'red', hex: 0xe8413b, price: 0 },
    { id: 'blue', hex: 0x2f7cf6, price: 30 },
    { id: 'green', hex: 0x34c759, price: 30 },
    { id: 'purple', hex: 0x9b59ff, price: 40 },
    { id: 'pink', hex: 0xff6fb5, price: 40 },
    { id: 'orange', hex: 0xff9500, price: 40 },
    { id: 'teal', hex: 0x1fc8c8, price: 50 },
    { id: 'gold', hex: 0xffc61a, price: 80 },
  ],
  helmet: [
    { id: 'blue', hex: 0x3a86ff, price: 0 },
    { id: 'yellow', hex: 0xffd60a, price: 20 },
    { id: 'white', hex: 0xf5f5f5, price: 20 },
    { id: 'green', hex: 0x2ecc71, price: 25 },
    { id: 'pink', hex: 0xff70a6, price: 25 },
    { id: 'purple', hex: 0x8e44ad, price: 30 },
    { id: 'black', hex: 0x2b2b2b, price: 30 },
  ],
  horn: [
    { id: 'beep', icon: '📣', price: 0 },
    { id: 'honk', icon: '🦢', price: 25 },
    { id: 'toot', icon: '🎺', price: 35 },
    { id: 'moo', icon: '🐮', price: 50 },
    { id: 'quack', icon: '🦆', price: 50 },
  ],
  pet: [
    { id: 'none', icon: '🚫', price: 0 },
    { id: 'duck', icon: '🐤', price: 100 },
    { id: 'dog', icon: '🐶', price: 120 },
    { id: 'cat', icon: '🐱', price: 120 },
    { id: 'bunny', icon: '🐰', price: 150 },
  ],
};

export const shopItem = (kind, id) => SHOP[kind].find((i) => i.id === id) || SHOP[kind][0];

// `preview` swaps in garage items the player is looking at but hasn't bought.
export function lookFromSave(data, preview = {}) {
  const e = { ...data.equip, ...preview };
  return {
    bike: e.bike,
    color: shopItem('color', e.color).hex,
    helmet: shopItem('helmet', e.helmet).hex,
    jersey: shopItem('helmet', e.helmet).hex,
    pet: e.pet,
    horn: e.horn,
  };
}

// Four stickers per world (finish, top three, win, hidden pickup) plus extras.
const WORLD_STICKERS = {
  farm: ['🐄', '🌻', '🚜', '🐔'],
  candy: ['🍭', '🧁', '🍬', '🍩'],
  dino: ['🦕', '🦖', '🌋', '🥚'],
  snow: ['⛄', '🐧', '🏔️', '❄️'],
  neon: ['🌃', '🎡', '🚦', '🎆'],
};

export const STICKERS = [];
for (const [world, icons] of Object.entries(WORLD_STICKERS)) {
  ['finish', 'podium', 'win', 'hidden'].forEach((kind, i) => STICKERS.push({ id: `${world}-${kind}`, icon: icons[i] }));
}
STICKERS.push(
  { id: 'sunday', icon: '🌈' },
  { id: 'bonk5', icon: '💥' },
  { id: 'bonk10', icon: '🤪' },
  { id: 'party', icon: '🎉' },
  { id: 'champ', icon: '🏆' },
);

export const stickerIcon = (id) => (STICKERS.find((s) => s.id === id) || { icon: '❔' }).icon;
