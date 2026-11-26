# Catalog

110 effects. Generated from each effect's `meta` by `node tools/catalog.mjs`: don't edit by hand.
Ramps read `option: default (steps)`; pass another ramp name or a list of colors to recolor.

## earth

| effect | kind | views | size | duration | ramps | tags | description |
|---|---|---|---|---|---|---|---|
| `earth/quake` | one-shot | side, top (8 headings) | 100x54 | 1.2 s | palette: stone (8), dust: dust (5) | earth, quake, shockwave, rock, ground, magic, spell | A shockwave runs along the floor from the caster to the target: slabs heave up and drop back behind a glowing crack, dust kicked up at its front, and a burst of rock where it reaches the target |
| `earth/spike` | one-shot | side | 88x64 | 1.3 s | palette: stone (8), dust: dust (5) | earth, rock, spike, eruption, magic, spell | The floor cracks and trembles under the target, then a cluster of jagged spikes stabs up through it throwing debris and dust, holds, and crumbles into falling chunks |

## electric

| effect | kind | views | size | duration | ramps | tags | description |
|---|---|---|---|---|---|---|---|
| `electric/arc` | loop | side | 72x40 | 1.2 s | palette: electric (8) | electric, arc, ambient, spark, tesla, prop | A standing electric arc across a gap, a tesla coil or a broken cable: a jagged bolt that re-forms every few frames, forks, hot contact points, sparks spitting off them and a flickering glow |
| `electric/chain-lightning` | one-shot | side, top (8 headings) | 138x50 | 0.8 s | palette: electric (8) | electric, lightning, chain, magic, spell | Lightning thrown from the staff that jumps on: it crackles at the tip, strikes the target with a white hero frame, then leaps to the floor behind it and on again, each jump later and dimmer, sparks spitting where each one lands |
| `electric/shock` | one-shot | side | 76x68 | 0.72 s | palette: electric (8) | electric, shock, hit, impact, status, zap | A target takes a jolt: a white flash with bolts bursting off its outline, then crackling arcs that hop around the body, fewer and dimmer, spitting sparks |

## explosions

| effect | kind | views | size | duration | ramps | tags | description |
|---|---|---|---|---|---|---|---|
| `explosions/backblast` | one-shot | side | 100x64 | 0.9 s | palette: fire (8), smoke: smoke (6), dust: dust (6) | military, rocket, launcher, backblast, bazooka, blast, smoke, dust, fire | The blast out of the back of a shoulder launcher as it fires: a cone of flame-lit gas jetting back, dust and grit torn off the floor behind the gunner, a smoke cloud that lingers and drifts away |
| `explosions/c4` | one-shot | side | 140x120 | 3.1 s | palette: fire (8), smoke: smoke (8), dust: dust (6), brick: #38342a,#5c5646,#847c64,#aca286,#d0c8aa (5), led: #300608,#7a0c10,#e8222a,#ffa0a0 (4) | explosion, military, c4, charge, trap, placed, plastic, explosive, breach, blast, shockwave, smoke | A C4 brick on the floor, a detonator strapped to it, its red light blinking slow then faster and faster with a beep on each blink, then a sharp blast: a white flash, a shock ring racing out along the floor, a quick fireball and grey smoke |
| `explosions/dynamite` | one-shot | side | 128x132 | 3.1 s | palette: fire (8), smoke: smoke (8), dust: dust (6), sticks: #2a080c,#5e1216,#9c1e1c,#d0362a,#f07058 (5) | explosion, military, dynamite, charge, trap, placed, fuse, demolition, blast, fire, smoke, debris | A bundle of three red sticks lying on the floor, its fuse lit: a spark crawls down the fuse spitting sparks, then the bundle goes off in a white flash and a fireball, paper shreds fluttering down through the smoke and dirt flung along the floor |
| `explosions/fire-splash` | one-shot | side | 112x98 | 2.5 s | palette: fire (8), smoke: smoke (6), glass: #0c2216,#174430,#266446,#3f8c5e,#7cc493,#dcfbe6 (6) | explosion, fire, molotov, military, splash, burn | A fire bottle breaking on the floor: glass shards flung out, burning fuel splashing and spreading into a pool, flames whooshing up off it, licking and flickering, then burning down to embers and a scorch |
| `explosions/flashbang` | one-shot | side | 144x120 | 1.2 s | palette: #1a1c2a,#343a56,#56628a,#8494bc,#b4c2e0,#d8e2f4,#eef3fc,#ffffff (8), smoke: smoke (6), steel: stone (5) | explosion, military, flashbang, stun, flash, grenade | A stun grenade going off: a white flash filling a wide circle, its edge dithered, a flare across it, a sharp ring racing out, bright specks hanging and dimming like an afterimage, a puff of smoke off the spent canister |
| `explosions/gas-cloud` | loop | side | 120x60 | 3 s | palette: #161a14,#262d22,#3a4433,#525e45,#6d7a58,#8e9a70,#b3bc90,#dfe3c4 (8) | gas, teargas, military, cloud, zone, hazard, haze, grenade | Tear gas that lingers: a low, see-through green-grey cloud hugging the floor round the target, lobes creeping out along the ground and thin wisps curling off its top |
| `explosions/grenade-blast` | one-shot | side | 136x96 | 1 s | palette: fire (8), smoke: smoke (8), dust: dust (6), debris: stone (4) | explosion, military, grenade, frag, shrapnel, blast, fire, smoke, debris, dust | A frag grenade going off on the floor: a white flash for a frame, a short tight fireball, shrapnel streaking out every way and skipping along the floor, a kick of dirt and grit, a low dust ring rolling out and a puff of smoke rising and thinning |
| `explosions/landing-dust` | one-shot | side | 72x28 | 0.5 s | palette: dust (8) | dust, landing, jump, ground, movement | Dust kicked out to both sides when a character lands: a flash on the ground, low plumes that curl up and settle, hopping grit |
| `explosions/landmine` | one-shot | side | 132x126 | 2.8 s | palette: dust (8), fire: fire (8), metal: #1a1e12,#30361f,#4a5230,#687246,#8c9662 (5) | explosion, military, landmine, mine, charge, trap, placed, eruption, dirt, debris, fire, blast | A mine half buried in the floor, only its dome and pressure plate showing; a click, a jolt, light seeping round its rim, then the ground erupts: a fan of dirt and fire bursting straight up out of the floor, clods and grit thrown high and raining back, the plate tumbling, a dust cloud rolling out over a smoking crater |
| `explosions/rocket-blast` | one-shot | side, top | 168x128 | 1.8 s | palette: fire (8), smoke: smoke (8), dust: dust (6), debris: stone (4) | explosion, rocket, military, blast, fire, smoke, debris, shockwave, artillery | A rocket going off on the ground: a white flash and a shock ring, a fireball that balloons and rolls up into dark smoke, dust racing out along the floor, burning debris flung high, lingering embers |
| `explosions/shell-blast` | one-shot | side | 120x122 | 2 s | palette: dust (8), fire: fire (8), smoke: smoke (8) | explosion, military, artillery, shell, mortar, blast, dirt, debris, smoke | An artillery shell landing in dirt: a hard flash, a tall column of earth and smoke thrown straight up, clods raining back, a dust skirt rolling out and a smouldering scorch |
| `explosions/signal-flare` | loop | side | 100x104 | 3 s | palette: #1c0610,#3e0a1e,#6c0e2a,#a4153a,#dc2448,#ff5468,#ff9cac,#fff0f2 (8), smoke: smoke (6) | military, flare, signal, artillery, light | An artillery spotter's flare hanging under a little parachute: a blinding red core sputtering burning drips, a smoke trail drifting up, swaying slowly as it sinks, its red light washing the ground |
| `explosions/small-explosion` | one-shot | side, top | 124x84 | 1.6 s | palette: fire (8), smoke: smoke (6), dust: dust (5), debris: stone (4) | explosion, fire, smoke, debris, blast | A white flash, a fireball that cools into rolling smoke, sparks and chunks that bounce and kick up dust |
| `explosions/smoke-grenade` | loop | side | 100x72 | 3 s | palette: smoke (8) | smoke, military, grenade, screen, smokescreen, cover, cloud, canister, concealment | A smoke screen that holds: a canister hissing on the floor, thick grey clouds billowing out and up in layers that roll slowly round a dense core |
| `explosions/smoke-puff` | one-shot | side | 60x56 | 0.6 s | palette: smoke (8) | smoke, poof, spawn, vanish, teleport | A spawn or vanish poof: a pop of light, a ring of smoke puffs that bursts out, rolls up and thins away |

## fire

| effect | kind | views | size | duration | ramps | tags | description |
|---|---|---|---|---|---|---|---|
| `fire/campfire` | loop | side | 56x64 | 1.5 s | palette: fire (8), smoke: smoke (6), wood: dust (5) | fire, light, prop, camp, ambient | Two crossed logs charring under licking flames, rising embers, a thin column of smoke and a warm pool of light |
| `fire/candle` | loop | side | 32x44 | 2 s | palette: fire (8), wax: #3a2a28,#7a6458,#bca88e,#e4d6b8,#fbf4e2 (5) | fire, light, prop, ambient, candle | A wax candle: a small flame swaying on its wick and guttering now and then, a white-hot heart, a drip of wax running down, a warm pool of light |
| `fire/fireball` | loop | side, top (8 headings) | 50x28 | 0.5 s | palette: fire (8) | fire, projectile, magic | A flying fireball: a white-hot core, flame tails streaming back, licks that tear off and sparks left behind |
| `fire/lava-bubble` | loop | side | 56x40 | 2.4 s | palette: fire (8), rock: stone (5) | fire, lava, magma, pool, ambient, prop | A pool of lava in a rock rim: a dark crust drifting over molten seams, bubbles swelling and popping in turn, spitting drops that arc and fall back, the air lit above it |
| `fire/steam-vent` | loop | side | 48x72 | 2 s | palette: fire (8), smoke: smoke (8) | fire, steam, vent, geyser, smoke, ambient, prop | A crack in the floor glowing with heat, breathing out a thin wisp of steam and, twice a loop, a hissing burst that rolls up, leans and thins away |
| `fire/torch` | loop | side | 24x32 | 1 s | palette: fire (8) | fire, light, prop, ambient | A wall torch: a flame licking up in tongues, white-hot core, drifting embers, a warm pool of light |

## firearms

| effect | kind | views | size | duration | ramps | tags | description |
|---|---|---|---|---|---|---|---|
| `firearms/bullet-hit` | one-shot | side | 48x32 | 0.36 s | palette: fire (8), dust: dust (6) | impact, hit, firearm, military, bullet, gunshot, shot, wound, rifle, gun | A rifle round striking a body: a tiny hard flash, sparks and dark specks thrown back toward the shooter, a puff of dust |
| `firearms/cover-hit` | one-shot | side | 52x38 | 0.6 s | palette: dust (8), sparks: fire (6) | firearm, military, impact, cover, sandbag, dust, bullet | A bullet burying itself in sandbags: a spray of sand and dust thrown back at the shooter, a few hot sparks, clods that fall and settle, a pock mark trickling sand |
| `firearms/muzzle-flash` | one-shot | side, top (8 headings) | 72x60 | 0.8 s | palette: fire (8), smoke: smoke (6) | firearm, military, gun, rifle, muzzle, flash, shot, gunshot, fire, smoke | A rifle's shot at the muzzle: a white star of flame for a frame, petals licking forward, a puff of smoke that drifts and thins |
| `firearms/ricochet` | one-shot | side | 64x48 | 0.42 s | palette: gold (8) | impact, hit, firearm, military, ricochet, bullet, deflect, armor, shield, metal, spark, gun | A round glancing off metal: a white-gold star on contact, a spray of hot sparks, and the round skipping away up and back as a short streak that arcs off |
| `firearms/shell-casing` | one-shot | side | 44x40 | 1.8 s | palette: gold (8) | firearm, military, gun, rifle, casing, shell, brass, cartridge, eject, bullet, debris | A brass casing kicked up and back out of a rifle, tumbling end over end, bouncing twice with a tink, glinting, then lying still and fading |
| `firearms/shotgun-blast` | one-shot | side, top (8 headings) | 104x72 | 1 s | palette: fire (8), smoke: smoke (6) | firearm, military, gun, shotgun, blast, muzzle, flash, pellets, buckshot, spread, gunshot, fire, smoke | A shotgun fired: a wide fan of flame, pellets streaking out in a cone, burning flecks and a heavy cloud of smoke rolling forward |
| `firearms/tracer` | loop | side, top (8 headings) | 36x10 | 0.3 s | palette: fire (8) | projectile, firearm, military, bullet, tracer, round, rifle, gun, gunfire, shot | A rifle round in flight: a thin streak with a white-hot head and a tail cooling from yellow to orange, flickering as it flies |

## holy

| effect | kind | views | size | duration | ramps | tags | description |
|---|---|---|---|---|---|---|---|
| `holy/barrier` | one-shot | side | 96x68 | 1.85 s | palette: holy (8), bolt: arcane (8) | barrier, shield, ward, holy, light, magic, spell | A wall of light raised before the caster: it unfurls from the staff, shimmers and holds, a hostile bolt bursts on its face as it flares and ripples, then it crumbles into rising motes |
| `holy/blessing` | one-shot | side | 52x72 | 1.1 s | palette: holy (8) | buff, holy, light, magic, spell | A buff on the caster: a glint over the head opens into a ring of light that settles down over the body to the feet, golden motes spiral up, a gentle shine |
| `holy/cleanse` | one-shot | side | 64x64 | 1.7 s | palette: holy (8), taint: poison (8) | cleanse, cure, purify, buff, holy, light, magic, spell | A taint washed off the caster: sickly bubbles and fumes cling to her until light gathered over her head bursts and pours down over her, the taint flung off at her feet and gone in puffs, sparkles left on her |
| `holy/holy-bolt` | loop | side, top (8 headings) | 52x22 | 0.5 s | palette: holy (8) | projectile, holy, light, magic, spell | A flying lance of light: a white-hot point in gold edges, a short trail of two strands that shimmer and weave, glints popping behind it |
| `holy/light-pillar` | one-shot | side | 84x116 | 1.1 s | palette: holy (8) | impact, hit, holy, light, beam, spell, strike | A thin ray picks out the target, then a column of light slams down on it: a white hero frame, a flare racing over the ground, sparks rising as the beam thins and lifts away |
| `holy/revive` | one-shot | side | 64x96 | 1.9 s | palette: holy (8) | revive, resurrect, heal, holy, light, magic, spell | A shaft of soft light comes down on a spot on the floor, motes falling into the glow of a body lying there; it rises and stands in a white flash, a ring flaring out over the ground, and the light lifts away in rising motes |

## impacts

| effect | kind | views | size | duration | ramps | tags | description |
|---|---|---|---|---|---|---|---|
| `impacts/ground-slam` | one-shot | side | 136x48 | 1.1 s | palette: fire (8), debris: stone (6), dust: dust (6) | impact, slam, shockwave, ground, melee, crack, dust, debris | A blade driven into the floor: a white flash, sparks and cracks where it bites, then a shockwave of rolled-up dust and grit runs both ways along the floor, skimming it, the far side bursting under the target |
| `impacts/heavy-hit` | one-shot | side | 104x64 | 0.9 s | palette: fire (8), debris: stone (4), dust: dust (5) | impact, hit, heavy, melee, crack, debris | A crushing blow: a white hero frame, a broken shock ring, then a glowing crack splits the floor under the target and throws up debris and dust |
| `impacts/hit-spark` | one-shot | side | 56x40 | 0.46 s | palette: gold (8) | impact, hit, spark, melee | A sharp contact flash, a white hero frame, then a spray of sparks that streak, fall and bounce |
| `impacts/kick` | one-shot | side | 76x60 | 0.42 s | palette: gold (8) | kick, unarmed, melee, impact, hit, arc | A fast roundhouse at chest height: the foot sweeps a flat arc round in front of the kicker and into the target, a white pop where it lands throws out a wide broken ring and sparks, the arc swinging on past behind it |
| `impacts/palm-strike` | one-shot | side | 84x60 | 0.6 s | palette: wind (8), dust: dust (5) | palm, unarmed, melee, impact, hit, shockwave, knockback | Both palms driven into the target at once: two white flashes and a wall of force, then a shockwave that bursts out of its back and rolls on, crescent after crescent, with streaks of air and dust swept along the floor |
| `impacts/punch` | one-shot | side | 60x48 | 0.3 s | palette: gold (8) | punch, unarmed, melee, impact, hit | A short, heavy fist blow on the target: speed lines close in, a round white flash lands, and a ring of impact lines bursts out round it with a shock ring, a few sparks knocked on through |
| `impacts/slash` | one-shot | side, top (8 headings) | 60x60 | 0.3 s | palette: ice (8) | slash, melee, sword, impact, arc | A blade swing from the wielder at the anchor: a crescent sweeps down through the target in front, flashes as it cuts, and leaves a trail that cools and fades |
| `impacts/spin-slash` | one-shot | side, top | 88x44 | 0.6 s | palette: ice (8) | spin, whirlwind, melee, sword, impact, arc | A whirlwind swing around the wielder at the anchor: the blade sweeps two full turns, its trail wrapping behind and in front of them, cutting the target in front on each pass, its path lingering as a fading ring |
| `impacts/thrust` | one-shot | side, top (8 headings) | 64x40 | 0.34 s | palette: ice (8) | thrust, stab, melee, sword, spear, impact | A straight stab from the wielder at the anchor: a lance of light shoots forward with speed lines, a sharp star bursts where the point lands, sparks spray on through, and the lance pulls back as it fades |
| `impacts/uppercut` | one-shot | side, top (8 headings) | 60x68 | 0.4 s | palette: gold (8), dust: dust (5) | uppercut, launcher, melee, sword, impact, arc | A rising blow from the wielder at the anchor: the blade scoops up off the floor in front, flashes as it cuts up through the target, launches sparks skyward with rising speed lines, and its crescent arcs on overhead and fades |

## magic

| effect | kind | views | size | duration | ramps | tags | description |
|---|---|---|---|---|---|---|---|
| `magic/beam` | one-shot | side, top (8 headings) | 78x36 | 0.8 s | palette: arcane (8) | magic, beam, ray, laser, spell | A ray held from the staff: light gathers at the tip, the beam snaps out to full length with a white hero frame, holds with a rippling core and a flaring contact point spitting sparks, then thins to a thread and breaks up |
| `magic/charge-up` | loop | side | 64x64 | 1.6 s | palette: gold (8) | aura, charge, charge-up, power, focus, weapon | A held charge on a fighter with the blade raised: motes drawn inward into the blade, its glow building to a flare each beat, a flickering rim round the body, grit drawn in along the floor |
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

## nature

| effect | kind | views | size | duration | ramps | tags | description |
|---|---|---|---|---|---|---|---|
| `nature/fireflies` | loop | side | 64x46 | 4 s | palette: poison (8) | nature, firefly, light, night, ambient, prop | A few fireflies drifting over the ground on their own lazy paths, each blinking on its own beat: a hot point, a soft halo lighting the air, a dim body between blinks |

## pickups

| effect | kind | views | size | duration | ramps | tags | description |
|---|---|---|---|---|---|---|---|
| `pickups/chest-open` | one-shot | side | 64x72 | 1.5 s | palette: gold (8), wood: #1e1008,#3a2010,#5a3418,#7c4a22,#9c6230,#c08048 (6) | pickup, chest, treasure, loot, open, reward, gold | A treasure chest: it rattles, its lid pops open, light pours out of it in rays with glints rising, then it fades away |
| `pickups/coin-collect` | one-shot | side | 48x52 | 0.5 s | palette: gold (8) | pickup, coin, collect, sparkle, gold, reward | A coin picked up: a white flash, a gold ring that bursts out, glints and sparkles that fly up and wink out |
| `pickups/gem` | one-shot | side | 56x56 | 0.85 s | palette: arcane (8) | pickup, gem, jewel, crystal, collect, sparkle, reward | A gem pickup: a cut gem pops up and turns, its facets catching the light, then flashes white as it is taken and bursts into glints |
| `pickups/heart` | one-shot | side | 56x56 | 0.9 s | palette: blood (8) | pickup, heart, health, heal, collect, life | A heart pickup: it pops up and bobs, squashes as it is taken, flashes white, and bursts into small hearts that float up and wink out |
| `pickups/power-up` | one-shot | side | 48x72 | 1 s | palette: electric (8) | pickup, power-up, buff, level-up, collect, aura | A power-up taken: a white pillar of light, rings that rise up the body one after another, a column of motes streaming up |
| `pickups/xp-orbs` | one-shot | side | 80x56 | 1.2 s | palette: electric (8) | pickup, xp, experience, orb, collect, absorb, reward | Experience orbs: they pop out of a point beside the anchor, hang bobbing, then swoop in one after another to the anchor, the collector's chest, each flashing as it arrives |

## projectiles

| effect | kind | views | size | duration | ramps | tags | description |
|---|---|---|---|---|---|---|---|
| `projectiles/arrow` | loop | side, top (8 headings) | 48x12 | 0.4 s | palette: blood (8), wood: dust (6), steel: stone (6) | projectile, arrow, bow, physical | An arrow in flight: a steel broadhead that glints, a shaft whose fletching shivers as it flies, streaks of air running off behind |
| `projectiles/arrow-rain` | one-shot | side | 82x70 | 1.2 s | palette: blood (8), wood: dust (6), steel: stone (6), dust: dust (8) | projectile, arrow, bow, volley, rain, physical | A volley falling out of the sky: arrows streak down steeply across the target one after another and thud into the floor around it, quivering, dust and grit kicked up, then stand there and fade |
| `projectiles/caltrops` | one-shot | side | 88x44 | 1.8 s | palette: stone (6), dust: dust (5) | thrown, ninja, trap, caltrops, spikes, scatter, physical | A handful of caltrops tossed in a low arc: they tumble apart, clatter and hop over the floor at the target's feet, settle spikes up, glint one by one, then fade |
| `projectiles/energy-orb` | loop | side, top (8 headings) | 40x24 | 0.6 s | palette: arcane (8) | projectile, magic, energy, orb, arcane, bolt | A flying orb of energy: a pulsing core with a swirling shell, two sparks in orbit, echoes and motes trailing behind |
| `projectiles/fire-arrow` | loop | side, top (8 headings) | 60x22 | 0.4 s | palette: fire (8), fletch: blood (8), wood: dust (6), steel: stone (6) | projectile, arrow, bow, fire, burning, physical | A burning arrow in flight: flames streaming back off a wrap behind the broadhead over the shaft, lighting it, embers peeling off into a trail that drifts up and cools |
| `projectiles/grenade` | loop | side, top (8 headings) | 44x32 | 0.4 s | palette: #2a3018,#4f5a30,#727d49,#8c9657,#b5bd85 (5), fire: fire (6), steel: stone (5) | projectile, thrown, grenade, military, physical | A thrown grenade tumbling end over end a quarter turn at a time: an olive body lit from above, a pin ring and lever, a fuse spark fizzing and shedding sparks behind |
| `projectiles/kunai` | loop | side, top (8 headings) | 40x12 | 0.4 s | palette: blood (8), steel: stone (6) | projectile, thrown, kunai, knife, dagger, ninja, physical | A thrown kunai flying point first: a leaf blade lit along its ridge, a wrapped grip, a ring pommel and a tassel that flutters, air streaming off behind |
| `projectiles/missile` | loop | side, top (8 headings) | 72x24 | 0.8 s | palette: fire (8), smoke: smoke (6), metal: stone (8), paint: #1c211b,#2a3227,#3a4535,#4d5a45,#647358,#808f6e (6) | projectile, rocket, missile, military, guided, launcher, explosive, smoke | A guided missile in flight: a slim steel body with an olive band, a dark seeker nose, canards and tail fins, a white-hot exhaust and a smoke trail that corkscrews behind it as it rolls |
| `projectiles/molotov` | loop | side, top (8 headings) | 60x48 | 0.4 s | palette: fire (8), glass: #0c2216,#174430,#266446,#3f8c5e,#7cc493,#dcfbe6 (6), rag: dust (4) | projectile, thrown, molotov, fire, military | A thrown fire bottle tumbling end over end: green glass with a highlight down its side and dark fuel in its base, a rag stuffed in its neck burning, the flame streaming back and shedding embers |
| `projectiles/rocket` | loop | side, top (8 headings) | 64x18 | 0.4 s | palette: fire (8), smoke: smoke (6), metal: stone (8), paint: #1c211b,#2a3227,#3a4535,#4d5a45,#647358,#808f6e (6) | projectile, rocket, missile, military, physical, launcher, bazooka, explosive | A rocket in flight: an olive warhead on a steel motor with swept fins, a flickering white-hot jet at the tail and a short trail of smoke puffing out behind and thinning |
| `projectiles/shuriken` | loop | side, top (8 headings) | 28x16 | 0.4 s | palette: stone (6) | projectile, thrown, shuriken, star, spin, ninja, physical | A spinning four-pointed throwing star: bevelled steel points around a dark hole, a glint as each point swings past the light, air streaming off behind |
| `projectiles/sky-shot` | one-shot | side | 32x52 | 0.4 s | palette: blood (8), wood: dust (6), steel: stone (6) | projectile, arrow, bow, volley, physical | Two arrows loosed high from the bow one after the other, fanning apart as they streak up out of the top of the frame, air streaming off behind |
| `projectiles/syringe-dart` | loop | side, top (8 headings) | 56x20 | 0.6 s | palette: heal (8), steel: stone (6) | projectile, heal, dart, syringe, medic, military, physical | A medic's healing dart: a glass barrel of glowing green liquid with a bubble running through it, a steel needle, a little finned tail, green sparkles streaming off behind |

## shadow

| effect | kind | views | size | duration | ramps | tags | description |
|---|---|---|---|---|---|---|---|
| `shadow/blink` | one-shot | side, top (8 headings) | 88x40 | 0.5 s | palette: arcane (8), smoke: shadow (8) | vanish, blink, teleport, dash, shadow, ninja, afterimage | A shadow step: a slit of light where the body was, afterimages and speed lines streaking ahead, a slit opening where it reappears, wisps of shadow at both ends |
| `shadow/curse` | loop | side | 30x40 | 2 s | palette: shadow (8), rim: arcane (8) | status, shadow, curse, debuff, skull, magic | A status over the target's head (the anchor): a ghostly skull turns side to side with glinting eye sockets inside a ring of runes and drips shadow onto it |
| `shadow/dark-nova` | one-shot | side, top | 104x68 | 1.4 s | palette: shadow (8), rim: arcane (8) | nova, shadow, dark, magic, spell, blast | Darkness is pulled in to the caster's feet, then bursts out as a ring of shadow tendrils and dark motes along the ground under a violet rim light |
| `shadow/portal` | loop | side | 60x76 | 2 s | palette: shadow (8), rim: arcane (8) | ambient, shadow, portal, magic, summon | A summoning portal standing on the ground: a swirling dark oval inside a flickering violet rim, motes drawn into it |
| `shadow/seal` | one-shot | side | 56x56 | 0.6 s | palette: arcane (8) | shadow, seal, ninja, jutsu, buff, flash, glyph | A hand seal released: motes drawn into the hands, a white flash with a cross of light, a ring of glyph ticks snapping outward and a thin shock ring |
| `shadow/smoke-bomb` | one-shot | side | 80x80 | 1.3 s | palette: fire (8), smoke: smoke (8) | vanish, smoke, bomb, ninja, escape, poof, shadow | A ninja vanish: a pellet dashed down at the feet, a pop of light, smoke rolling out along the floor and billowing into a column that hides whoever stood there, then thins away |
| `shadow/substitution` | one-shot | side | 72x56 | 1.8 s | palette: smoke (8), wood: #2a160c,#4a2a16,#6e4024,#94603a,#b8854f,#d8ae74 (6), dust: dust (6) | vanish, substitution, decoy, log, smoke, ninja, shadow, poof | A body swapped for a log: a pop of smoke, and a log left standing where they stood tips over, lands with a knock and a puff of dust, lies there, then goes in a second poof |

## status

| effect | kind | views | size | duration | ramps | tags | description |
|---|---|---|---|---|---|---|---|
| `status/asleep` | loop | side | 28x26 | 4.5 s | palette: ice (8) | status, debuff, sleep, asleep, zzz, snore, drowsy | A sleep status over the head: Zs drift up and sideways one after another, growing, swaying and fading, in a slow breathing rhythm |
| `status/bleeding` | loop | side | 40x30 | 1.6 s | palette: blood (8) | status, debuff, bleed, blood, wound, dot, gore | A bleed status over a body: a gash that throbs with each heartbeat and spurts, drops that well up and fall, spatters on the floor that fade |
| `status/burning` | loop | side | 44x56 | 1.5 s | palette: fire (8), smoke: smoke (6) | status, fire, burn, debuff, dot | A burn status over a body: small flame tongues flare up and die down all over it, embers rise, a little smoke |
| `status/confused` | loop | side | 36x22 | 2.4 s | palette: gold (8) | status, debuff, confuse, confused, question, puzzled, dizzy, swirl | A confused status over the head: two question marks bob and tilt this way and that, then whirl round each other in a little swirl and trade places |
| `status/enraged` | loop | side | 52x44 | 1.6 s | palette: fire (8), steam: smoke (6) | status, debuff, enraged, rage, berserk, anger, fury, steam | A berserk status over the head: a throbbing anger mark, steam huffing out both sides, a red heat shimmer round the body |
| `status/frozen` | loop | side | 56x46 | 2.4 s | palette: ice (8) | status, ice, frozen, freeze, frost, debuff, cold | A frozen status over a body: a jagged crust of translucent ice from the feet up, light sliding across it, glints twinkling on its points, cold haze pouring off it |
| `status/gassed` | loop | side | 48x40 | 2.4 s | palette: smoke (8) | status, debuff, gas, teargas, cough, choke, smoke, haze | A tear gas status over a body: fits of coughing throw grey puffs out of the mouth in jerks, a thin haze hangs round the body |
| `status/haste` | loop | side | 60x46 | 1.2 s | palette: electric (8) | buff, status, haste, speed, quick, swift, wind, dash | A speed buff on its caster: speed lines streaming back off the body, a wind gust curling behind the feet, a light shimmer |
| `status/marked` | loop | side | 56x38 | 2 s | palette: blood (8) | status, debuff, mark, target, reticle, crosshair, sniper, hunter, lock | A hunter's mark on a target: corner brackets close in on the chest and lock with a flash, then pulse, a faint sight line running back to the shooter |
| `status/poisoned` | loop | side | 44x56 | 2 s | palette: poison (8) | status, poison, debuff, bubbles, toxic | A poison status over a body: green bubbles that rise and pop, a sickly drip that splashes at the feet, faint fumes |
| `status/shocked` | loop | side | 48x48 | 1.5 s | palette: electric (8) | status, electric, shock, shocked, paralyze, lightning, debuff, static | An electrified status over a body: little forked arcs crawling over it, re-forming in a new spot every few frames, sparks spitting off them and a flicker of light |
| `status/silenced` | loop | side | 36x32 | 2 s | palette: arcane (8) | status, debuff, silence, silenced, mute, seal, speech, magic | A silence status over the head: a struck-through speech bubble pulses; words try to form in it, the seal flashes and they break into glyph shards that fizzle out |
| `status/soaked` | loop | side | 44x40 | 2.4 s | palette: water (8) | status, water, soaked, wet, drench, drip, debuff | A drenched status over a body: drops running down it, hanging and falling into a puddle round the feet that rings with ripples, a wet sheen glinting on it |
| `status/stunned` | loop | side | 36x20 | 1.2 s | palette: gold (8) | status, stun, dizzy, daze, stars, debuff | A dazed status over the head: little stars orbiting in a flattened ring, twinkling, bright in front and dim behind |
| `status/suppressed` | loop | side | 64x30 | 2.4 s | palette: gold (8), dust: dust (6), sweat: water (6) | status, debuff, military, suppression, bullets, suppressed, pinned, tracer, gunfire | A suppression status over the head: tracer rounds whizzing past just overhead, one clipping in sparks and dust, a bead of sweat |

## water

| effect | kind | views | size | duration | ramps | tags | description |
|---|---|---|---|---|---|---|---|
| `water/ripple` | loop | side, top | 64x24 | 2.4 s | palette: water (8) | water, ripple, ambient, surface, prop | Rings that spread over still water from one spot, a bright crest over a dark trough, breaking up and fading as they go, a glint riding each crest |
| `water/splash` | one-shot | side, top | 84x56 | 1.2 s | palette: water (8) | water, splash, impact, hit, landing, droplets | Something hits the water: a white burst, a crown of water thrown up that collapses into a foam ring, a jet from the middle, droplets that arc out and ripple where they land |
| `water/water-bolt` | loop | side, top (8 headings) | 48x26 | 0.5 s | palette: water (8) | water, projectile, magic, bolt | A flying ball of churning water: swirling bands under a glinting skin, a foam bow wave, a wake of spray that breaks up behind and droplets shed as it goes |
| `water/waterfall` | loop | side | 48x72 | 1 s | palette: water (8) | water, waterfall, cascade, ambient, prop | A narrow fall of water: it curls over a lip, pours down in streaks that race past, and churns into foam and drifting mist on a pool at its foot |

## wind

| effect | kind | views | size | duration | ramps | tags | description |
|---|---|---|---|---|---|---|---|
| `wind/air-blade` | loop | side, top (8 headings) | 36x30 | 0.4 s | palette: wind (8), dust: dust (6) | projectile, thrown, wind, air, blade, crescent, ninja | A crescent of pressed air flying edge first: a thin bright leading edge that shimmers, streaks peeling off its tips and curling as they fade, dust caught in its wake |
| `wind/gust` | one-shot | side, top (8 headings) | 88x48 | 0.8 s | palette: wind (8), dust: dust (6), leaf: leaf (4) | wind, air, gust, magic, spell, push | A blast of air from the hand: wisps are sucked into the staff tip, then a widening cone of curling lines streams out to the target, its front slapping into it and splitting round it, dust and leaves kicked up from the floor below, the lines thinning and curling away |
| `wind/tornado` | one-shot | side, top | 72x84 | 1.7 s | palette: wind (8), dust: dust (6), leaf: leaf (4) | wind, air, tornado, whirlwind, magic, spell | A twist on the floor shoots up into a spinning funnel round the target, bands of air and dust and leaves wound up it; it grinds three times, then unwinds upward and flings what it carried |
| `wind/updraft` | loop | side | 48x64 | 1.6 s | palette: wind (8), leaf: leaf (5) | wind, air, updraft, buff, aura, levitate | A wind buff on its caster: a breathing ring of air at the feet, streaks spiralling up round the body and curling off, a few leaves riding up |
