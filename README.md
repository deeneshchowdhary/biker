# Bonk Bikers

A kid-friendly 3D motorbike racer for ages 4–9, made with plain HTML, CSS and JavaScript plus [Three.js](https://threejs.org). There's no build step and no server. It's designed for Safari on iPad and iPad mini.

## Play it on your computer

ES modules don't load from `file://`, so run a tiny local server in this folder:

```
python3 -m http.server 8000
```

Then open http://localhost:8000.

**Keyboard:** ← → (or A/D) steer · ↑ (or W) go · Space boost · Z / X bonk · H horn · Esc pause

## Modes

- **🌼 Sunday Ride (ages 4–5):** the bike drives itself, steering is helped, two friendly riders come along, and nobody loses. Every world is open.
- **🏁 Race Day:** 6 riders on a ~5 km road. Finish in the top 3 to unlock the next world.
- **💥 Bonk Battle:** a 90-second round. Bonk as many riders as you can; everyone stays bunched together.

## Worlds

Farm Country 🚜 · Candy Canyon 🍭 · Dino Valley 🦕 (stomping dino feet) · Snowy Peaks ⛄ (icy patches, sliding penguins) · Neon City 🌃 (extra ramps)

Each world has its own scenery, hazards, puddles (mud, chocolate, swamp, ice, neon slick), colours and music. Every world also hides one sticker star on the road.

## Grown-up settings

On the main menu, **hold ⚙️ for 3 seconds**. Settings: tilt steering (and flip direction), steering helper, auto-go, rival speed (Easy/Normal/Hard), bonking on/off, volume, music, voice cues, a play timer ("The bikes need a nap!"), an FPS meter and progress reset.

Tap the title logo 5 times to toggle the FPS meter.

## Put it online with GitHub Pages (free)

1. Create a public repository, e.g. `bonk-bikers`, and upload everything in this folder.
2. Go to **Settings → Pages** and set Source to "Deploy from a branch", `main`, `/ (root)`.
3. After a minute it's live at `https://<your-username>.github.io/bonk-bikers/`.
4. On each iPad, open the link in Safari, then **Share → Add to Home Screen** for full-screen offline play.

**Releasing an update:** change `CACHE = 'bonk-v1'` in `sw.js` to `bonk-v2` (then `bonk-v3`, and so on) so iPads fetch the new files. The service worker only runs over HTTPS, so it never caches anything while you test on localhost.

## Code map

| File | What it does |
|---|---|
| `js/main.js` | Startup, main loop, screen flow, rewards |
| `js/race.js` | One race session: countdown, bonking, finish, camera |
| `js/road.js` | Curving, hilly road built from 6 m segments; chunked so off-screen parts are skipped; instanced scenery |
| `js/player.js` | Shared rider physics, plus the player's steering, speed and boost |
| `js/rivals.js` | AI riders: rubber banding, lane changes, dodging, bonk attempts |
| `js/obstacles.js` | Hazards, puddles, ramps, coins, stars, hidden sticker |
| `js/models.js` | All 3D models (bikes, riders, pets, scenery, hazards), built from code |
| `js/worlds.js` | World themes |
| `js/scene.js` | Renderer, lights, fog, confetti, garage showroom, auto resolution drop |
| `js/input.js` | Multi-touch buttons, tilt, keyboard |
| `js/audio.js` | Synthesised sound effects, engine, music and voice cues |
| `js/hud.js`, `js/menus.js` | HUD and all menu screens |
| `js/save.js`, `js/rewards.js` | localStorage save; garage catalogue and stickers |

## Not built yet

- Two-player split screen (milestone 12 in the plan).
- Separate per-child profiles. Difficulty is one shared setting for now.
