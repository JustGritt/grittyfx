# Catalog

38 effects. Generated from each effect's `meta` by `node tools/catalog.mjs`: don't edit by hand.
Ramps read `option: default (steps)`; pass another ramp name or a list of colors to recolor.

## electric

| effect | kind | views | size | duration | ramps | tags | description |
|---|---|---|---|---|---|---|---|
| `electric/arc` | loop | side | 72x40 | 1.2 s | palette: electric (8) | electric, arc, ambient, spark, tesla, prop | A standing electric arc across a gap, a tesla coil or a broken cable: a jagged bolt that re-forms every few frames, forks, hot contact points, sparks spitting off them and a flickering glow |
| `electric/shock` | one-shot | side | 76x68 | 0.72 s | palette: electric (8) | electric, shock, hit, impact, status, zap | A target takes a jolt: a white flash with bolts bursting off its outline, then crackling arcs that hop around the body, fewer and dimmer, spitting sparks |

## explosions

| effect | kind | views | size | duration | ramps | tags | description |
|---|---|---|---|---|---|---|---|
| `explosions/landing-dust` | one-shot | side | 72x28 | 0.5 s | palette: dust (8) | dust, landing, jump, ground, movement | Dust kicked out to both sides when a character lands: a flash on the ground, low plumes that curl up and settle, hopping grit |
| `explosions/small-explosion` | one-shot | side, top | 124x84 | 1.6 s | palette: fire (8), smoke: smoke (6), dust: dust (5), debris: stone (4) | explosion, fire, smoke, debris, blast | A white flash, a fireball that cools into rolling smoke, sparks and chunks that bounce and kick up dust |
| `explosions/smoke-puff` | one-shot | side | 60x56 | 0.6 s | palette: smoke (8) | smoke, poof, spawn, vanish, teleport | A spawn or vanish poof: a pop of light, a ring of smoke puffs that bursts out, rolls up and thins away |

## fire

| effect | kind | views | size | duration | ramps | tags | description |
|---|---|---|---|---|---|---|---|
| `fire/campfire` | loop | side | 56x64 | 1.5 s | palette: fire (8), smoke: smoke (6), wood: dust (5) | fire, light, prop, camp, ambient | Two crossed logs charring under licking flames, rising embers, a thin column of smoke and a warm pool of light |
| `fire/fireball` | loop | side, top (8 headings) | 50x28 | 0.5 s | palette: fire (8) | fire, projectile, magic | A flying fireball: a white-hot core, flame tails streaming back, licks that tear off and sparks left behind |
| `fire/torch` | loop | side | 24x32 | 1 s | palette: fire (8) | fire, light, prop, ambient | A wall torch: a flame licking up in tongues, white-hot core, drifting embers, a warm pool of light |

## holy

| effect | kind | views | size | duration | ramps | tags | description |
|---|---|---|---|---|---|---|---|
| `holy/blessing` | one-shot | side | 52x72 | 1.1 s | palette: holy (8) | buff, holy, light, magic, spell | A buff on the caster: a glint over the head opens into a ring of light that settles down over the body to the feet, golden motes spiral up, a gentle shine |
| `holy/holy-bolt` | loop | side, top (8 headings) | 52x22 | 0.5 s | palette: holy (8) | projectile, holy, light, magic, spell | A flying lance of light: a white-hot point in gold edges, a short trail of two strands that shimmer and weave, glints popping behind it |
| `holy/light-pillar` | one-shot | side | 84x116 | 1.1 s | palette: holy (8) | impact, hit, holy, light, beam, spell, strike | A thin ray picks out the target, then a column of light slams down on it: a white hero frame, a flare racing over the ground, sparks rising as the beam thins and lifts away |

## impacts

| effect | kind | views | size | duration | ramps | tags | description |
|---|---|---|---|---|---|---|---|
| `impacts/heavy-hit` | one-shot | side | 104x64 | 0.9 s | palette: fire (8), debris: stone (4), dust: dust (5) | impact, hit, heavy, melee, crack, debris | A crushing blow: a white hero frame, a broken shock ring, then a glowing crack splits the floor under the target and throws up debris and dust |
| `impacts/hit-spark` | one-shot | side | 56x40 | 0.46 s | palette: gold (8) | impact, hit, spark, melee | A sharp contact flash, a white hero frame, then a spray of sparks that streak, fall and bounce |
| `impacts/slash` | one-shot | side, top (8 headings) | 60x60 | 0.3 s | palette: ice (8) | slash, melee, sword, impact, arc | A blade swing from the wielder at the anchor: a crescent sweeps down through the target in front, flashes as it cuts, and leaves a trail that cools and fades |

## magic

| effect | kind | views | size | duration | ramps | tags | description |
|---|---|---|---|---|---|---|---|
| `magic/frost-burst` | one-shot | side | 80x60 | 1.3 s | palette: ice (8) | magic, ice, frost, nova, spell | Cold gathers, then a crown of ice spikes bursts from the ground with flying shards and a frost ring; the spikes shatter and a cold mist settles |
| `magic/heal-aura` | loop | side | 48x56 | 2 s | palette: heal (8) | magic, heal, aura, buff, status | A soft ring of light at the feet, sparkles and little plus signs rising through a gentle glow |
| `magic/lightning-strike` | one-shot | side | 72x104 | 0.8 s | palette: electric (8) | magic, lightning, electric, strike, spell | A glint and a creeping leader, then a jagged branching bolt with a white hero frame, re-strikes, ground sparks and afterglow |
| `magic/twinkle` | loop | side | 36x36 | 1.5 s | palette: gold (8) | magic, sparkle, glint, pickup, idle | Star glints that pop up around a collectible one after another: a white core, four arms, a soft glow |

## movement

| effect | kind | views | size | duration | ramps | tags | description |
|---|---|---|---|---|---|---|---|
| `movement/dash-trail` | one-shot | side, top (8 headings) | 56x34 | 0.34 s | palette: dust (8) | dash, speed, trail, dust, movement | A burst of speed: streaks shooting out behind the body and peeling away, dust kicked back from the feet, a flash on the first frame |
| `movement/double-jump` | one-shot | side, top | 44x30 | 0.4 s | palette: ice (8) | jump, air, ring, movement | A kick off thin air: a flash under the feet, a flat ring of air that flares, spreads and breaks into gusts, streaks of air driven down |
| `movement/footstep` | loop | side | 32x14 | 0.5 s | palette: dust (8) | dust, footstep, run, step, movement | Dust scuffed up while running, a loop of two steps: each foot strikes, kicks a couple of small puffs back and a speck of grit, and the dust thins as the next foot lands |
| `movement/jump-dust` | one-shot | side, top | 44x24 | 0.4 s | palette: dust (8) | dust, jump, takeoff, ground, movement | Dust pushed out from under the feet as a character takes off: a flat flash where they push off, two tight puffs shooting out low to each side, launch streaks rising, a few hopping specks |
| `movement/wall-slide` | loop | side | 34x44 | 0.6 s | palette: dust (8) | dust, wall, slide, scrape, spark, movement | Scraping down a wall, a loop: grit and sparks spat out from where the hand drags on the wall, a bright scrape mark left above it, puffs of dust peeling off |

## pickups

| effect | kind | views | size | duration | ramps | tags | description |
|---|---|---|---|---|---|---|---|
| `pickups/coin-collect` | one-shot | side | 48x52 | 0.5 s | palette: gold (8) | pickup, coin, collect, sparkle, gold, reward | A coin picked up: a white flash, a gold ring that bursts out, glints and sparkles that fly up and wink out |
| `pickups/power-up` | one-shot | side | 48x72 | 1 s | palette: electric (8) | pickup, power-up, buff, level-up, collect, aura | A power-up taken: a white pillar of light, rings that rise up the body one after another, a column of motes streaming up |

## projectiles

| effect | kind | views | size | duration | ramps | tags | description |
|---|---|---|---|---|---|---|---|
| `projectiles/arrow` | loop | side, top (8 headings) | 48x12 | 0.4 s | palette: blood (8), wood: dust (6), steel: stone (6) | projectile, arrow, bow, physical | An arrow in flight: a steel broadhead that glints, a shaft whose fletching shivers as it flies, streaks of air running off behind |
| `projectiles/energy-orb` | loop | side, top (8 headings) | 40x24 | 0.6 s | palette: arcane (8) | projectile, magic, energy, orb, arcane, bolt | A flying orb of energy: a pulsing core with a swirling shell, two sparks in orbit, echoes and motes trailing behind |
| `projectiles/kunai` | loop | side, top (8 headings) | 40x12 | 0.4 s | palette: blood (8), steel: stone (6) | projectile, thrown, kunai, knife, dagger, ninja, physical | A thrown kunai flying point first: a leaf blade lit along its ridge, a wrapped grip, a ring pommel and a tassel that flutters, air streaming off behind |
| `projectiles/shuriken` | loop | side, top (8 headings) | 28x16 | 0.4 s | palette: stone (6) | projectile, thrown, shuriken, star, spin, ninja, physical | A spinning four-pointed throwing star: bevelled steel points around a dark hole, a glint as each point swings past the light, air streaming off behind |

## shadow

| effect | kind | views | size | duration | ramps | tags | description |
|---|---|---|---|---|---|---|---|
| `shadow/curse` | loop | side | 30x40 | 2 s | palette: shadow (8), rim: arcane (8) | status, shadow, curse, debuff, skull, magic | A status over the target's head (the anchor): a ghostly skull turns side to side with glinting eye sockets inside a ring of runes and drips shadow onto it |
| `shadow/dark-nova` | one-shot | side, top | 104x68 | 1.4 s | palette: shadow (8), rim: arcane (8) | nova, shadow, dark, magic, spell, blast | Darkness is pulled in to the caster's feet, then bursts out as a ring of shadow tendrils and dark motes along the ground under a violet rim light |
| `shadow/portal` | loop | side | 60x76 | 2 s | palette: shadow (8), rim: arcane (8) | ambient, shadow, portal, magic, summon | A summoning portal standing on the ground: a swirling dark oval inside a flickering violet rim, motes drawn into it |

## status

| effect | kind | views | size | duration | ramps | tags | description |
|---|---|---|---|---|---|---|---|
| `status/burning` | loop | side | 44x56 | 1.5 s | palette: fire (8), smoke: smoke (6) | status, fire, burn, debuff, dot | A burn status over a body: small flame tongues flare up and die down all over it, embers rise, a little smoke |
| `status/poisoned` | loop | side | 44x56 | 2 s | palette: poison (8) | status, poison, debuff, bubbles, toxic | A poison status over a body: green bubbles that rise and pop, a sickly drip that splashes at the feet, faint fumes |
| `status/stunned` | loop | side | 36x20 | 1.2 s | palette: gold (8) | status, stun, dizzy, daze, stars, debuff | A dazed status over the head: little stars orbiting in a flattened ring, twinkling, bright in front and dim behind |

## water

| effect | kind | views | size | duration | ramps | tags | description |
|---|---|---|---|---|---|---|---|
| `water/ripple` | loop | side, top | 64x24 | 2.4 s | palette: water (8) | water, ripple, ambient, surface, prop | Rings that spread over still water from one spot, a bright crest over a dark trough, breaking up and fading as they go, a glint riding each crest |
| `water/splash` | one-shot | side, top | 84x56 | 1.2 s | palette: water (8) | water, splash, impact, hit, landing, droplets | Something hits the water: a white burst, a crown of water thrown up that collapses into a foam ring, a jet from the middle, droplets that arc out and ripple where they land |
| `water/water-bolt` | loop | side, top (8 headings) | 48x26 | 0.5 s | palette: water (8) | water, projectile, magic, bolt | A flying ball of churning water: swirling bands under a glinting skin, a foam bow wave, a wake of spray that breaks up behind and droplets shed as it goes |
