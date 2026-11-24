# Catalog

18 effects. Generated from each effect's `meta` by `node tools/catalog.mjs`: don't edit by hand.
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
| `fire/torch` | loop | side | 32x48 | 1 s | palette: fire (8) | fire, light, prop, ambient | A wall torch: a flame licking up in tongues, white-hot core, drifting embers, a warm pool of light |

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

## water

| effect | kind | views | size | duration | ramps | tags | description |
|---|---|---|---|---|---|---|---|
| `water/ripple` | loop | side, top | 64x24 | 2.4 s | palette: water (8) | water, ripple, ambient, surface, prop | Rings that spread over still water from one spot, a bright crest over a dark trough, breaking up and fading as they go, a glint riding each crest |
| `water/splash` | one-shot | side, top | 84x56 | 1.2 s | palette: water (8) | water, splash, impact, hit, landing, droplets | Something hits the water: a white burst, a crown of water thrown up that collapses into a foam ring, a jet from the middle, droplets that arc out and ripple where they land |
| `water/water-bolt` | loop | side, top (8 headings) | 48x26 | 0.5 s | palette: water (8) | water, projectile, magic, bolt | A flying ball of churning water: swirling bands under a glinting skin, a foam bow wave, a wake of spray that breaks up behind and droplets shed as it goes |
