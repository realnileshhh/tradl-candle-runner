# how the Chrome dino game works, and what it means for Candle Runner

Source: "How the Chrome Dino Game Works", freeCodeCamp, 13 August 2026 (https://www.freecodecamp.org/news/how-the-chrome-dino-game-works/), read on 16 October 2026. The article is a write-up of the Chromium source (`components/neterror/resources/dino_game/`); its numbers are quoted here as the article gives them, not checked against the source. Where the article is silent, this page says so.

## the game in brief

About 3,000 lines of dependency-free JavaScript on one `<canvas>`, shown behind Chrome's "No internet" page since 2014, played about 270 million times a month. Internal codename "Project Bolan". All art comes from one sprite sheet PNG addressed by coordinates.

## how it works

**Loop and time.** `requestAnimationFrame` drives it. Speeds are written in pixels per frame at an assumed 60 FPS, and every movement is scaled by the elapsed time: `xPos -= Math.floor((speed * FPS / 1000) * deltaTime)`. So the game plays at the same speed on a 144 Hz screen and on a laptop managing 40 FPS, and high scores stay comparable. The article's lesson: never move anything by a per-frame amount.

**The T-Rex.** Gravity 0.6 px/frame², initial jump velocity -10 px/frame (the constant is misspelled `INIITAL_JUMP_VELOCITY` in Chrome). Apex about 83 px, reached in about 0.28 s, more than half of the 150 px playfield. The jump is variable: hold the key for the full arc; release early and the upward speed is clamped to `DROP_VELOCITY`, but only after a minimum height. Down mid-air triggers a fast drop (fall speed ×3). Ducking has its own hit box.

**Speed.** Starts at 6 px/frame (360 px/s), gains 0.001 px/frame every frame, caps at 13: a little over twice the start, reached after about 7,000 frames (117 s).

**Obstacles.** Small cacti (17 × 35, `minGap` 120), large cacti, and pterodactyls flying at one of three heights from speed 8.5, with a `speedOffset` of 0.8 so they drift against the ground. Cacti come in groups of up to 3 (`MAX_OBSTACLE_LENGTH`), a group only once the speed passes the type's `multipleSpeed` (4 for small, 7 for large); pterodactyls never group. The gap after an obstacle is about `width × speed + minGap × 0.6`, plus randomness, so gaps grow with speed. A history of recent types (`obstacleHistory`) rejects a third identical obstacle in a row (`MAX_OBSTACLE_DUPLICATION` 2). No obstacle in the first 3 s (`CLEAR_TIME` 3000): a runway instead of a tutorial.

**Collision.** A cheap outer bounding box test first; only on overlap, every T-Rex box against every obstacle box. The running T-Rex has 6 boxes (head, torso, legs and three more), ducking has 1, the pterodactyl 5. The boxes follow the silhouette, so a near miss is a miss.

**Score.** Distance × 0.025 (40 px a point), 5 digits, wrapping past 99,999 on screen while the counter continues. Every 100 points the score flashes at four beats a second.

**Night.** At 700 points the palette inverts (dark sky, pale ground, stars at 0.3 speed) for 12 s; the moon moves to its next phase each night.

**Game over.** The jump key restarts, but not for the first 750 ms (`GAMEOVER_CLEAR_TIME`): players mash the key as they die, and an instant restart would hide their score.

**Small things.** The T-Rex blinks while waiting (up to 3 times, at random intervals).

**Not covered by the article:** the class wiring (Runner, Horizon, DistanceMeter), 1x and 2x sprite sheets, animation frames per state, clouds, the horizon line, high score storage, sound, accessibility, and what `MOBILE_SPEED_COEFFICIENT` (1.2) does (the article's sentence on it contradicts itself).

## side by side

| | Chrome dino (the article) | Candle Runner (PRD and code) |
|---|---|---|
| time | px per frame at 60 FPS, scaled by delta time | the same; a frame longer than 32 ms counts as 32 |
| jump | v -10, g 0.6: apex 83 px, about 33 frames in the air | v -10.2, g 0.46: apex 113 px, 44.3 frames (0.74 s): floatier |
| jump control | variable (hold, release), fast drop, duck | one input, one fixed jump (PRD principle 3) |
| speed | 6 to 13 px/frame (×2.2), gaining 0.001, about 117 s to the cap | 2.8 to 7.0 (×2.5), gaining 0.0014, about 50 s to the cap |
| opening | no obstacle for 3 s | the first hazard 20 slots in (4.1 to about 5 s), a single red with a "↑ jump" flag and a hint line |
| obstacles | small and large cacti (groups of up to 3), pterodactyls from speed 8.5 | red candles (streaks of 2 from speed 3.6, 3 from 4.6), gaps, doji walls (from 3.0), bears |
| spacing | gap ≈ width × speed + minGap × 0.6, plus randomness | a runway after every hazard of max(3, (jump range + 40 px) / 38) flat candles, 0 to 2 idle candles, and a flat approach required |
| variety | no third identical obstacle in a row | weights only, no repeat cap |
| collision | outer box, then per-part boxes along the silhouette | one box for the bull; hazard bodies inset 2 px; wicks never hurt |
| score | 40 px a point, 5 digits, flash every 100 | 12 px a point, 5 digits, the rupee note pulses on a new best |
| night | inverts at 700 points for 12 s | none |
| restart | jump key, locked for 750 ms | a tap after 250 ms, or automatically after 2.6 s |
| art | one sprite sheet | drawn on canvas, crisp at the device pixel ratio (capped at 2) |
| sound | not in the article | none (a PRD non goal) |

The two games share their core idea (time-scaled physics, difficulty that only grows as fast as the player's jump can answer it, an empty start), and differ where Candle Runner's job differs: it fills a wait inside a trading product, so it has one input, no sound, a coached first hazard and a host that can end it at any moment.

## ideas worth a decision

Proposals for the user, none applied. Each is a product call, and anything that touches play goes through the scripted player first.

1. **A repeat cap** (recommended): no third hazard of the same kind in a row, as the dino does. It adds variety without touching fairness, since every hazard already carries its own runway.
2. **A longer restart lock** (recommended to discuss): Candle Runner accepts a restart tap 250 ms after death, so a player mashing Space as they die skips their score card, which is the problem the dino's 750 ms lock solves. 600 to 750 ms keeps the card on screen; the 2.6 s automatic restart is unchanged.
3. **A milestone flash** on the score every 100 points (no sound): cheap, and it rewards long waits. Against it: PRD principle 6, minimal animation.
4. **A blink** for the bull in the intro: small charm, about ten lines in `art.ts`.
5. **Not recommended:** a variable jump, a duck or a fast drop (they break "one input, nothing to learn"), night mode (the product is dark already, and it adds motion), and silhouette hit boxes (Candle Runner's forgiving single box is what keeps every death the player's fault).
