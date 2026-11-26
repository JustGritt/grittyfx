// Moves: effects chained and acted out on the stage, in the gallery and by `render --stage <move>`. A step plays once
// the one before it has ended, after its own wind-up; `on: 'hit'` plays it with the previous step's first hit instead,
// the caster acting nothing for it unless `acted: true`. A step's `stage` places it over its effect's meta.stage.
export const MOVES = {
  'sword-combo': {
    name: 'Sword combo',
    desc: 'A slash that sparks on contact, then a heavy blow that cracks the floor',
    steps: [{ fx: 'impacts/slash' }, { fx: 'impacts/hit-spark', on: 'hit' }, { fx: 'impacts/heavy-hit' }],
  },
  fireball: {
    name: 'Fireball',
    desc: 'A fireball cast from the staff, exploding on the goblin',
    steps: [{ fx: 'fire/fireball' }, { fx: 'explosions/small-explosion', on: 'hit' }],
  },
  thunder: {
    name: 'Thunder',
    desc: 'Lightning called down on the goblin',
    steps: [{ fx: 'magic/lightning-strike' }],
  },
  'frost-nova': {
    name: 'Frost nova',
    desc: 'Ice bursts from the ground under the goblin, glints hanging in the cold air around it',
    steps: [{ fx: 'magic/frost-burst' }, { fx: 'magic/twinkle', on: 'hit', opts: { palette: 'ice' }, stage: { at: 'target' } }],
  },
  'arrow-shot': {
    name: 'Arrow shot',
    desc: 'An arrow loosed from the bow, sparking where it strikes the goblin',
    steps: [{ fx: 'projectiles/arrow' }, { fx: 'impacts/hit-spark', on: 'hit' }],
  },
  'shock-arrow': {
    name: 'Shock arrow',
    desc: 'An arrow that jolts the goblin with crackling bolts where it lands',
    steps: [{ fx: 'projectiles/arrow' }, { fx: 'electric/shock', on: 'hit' }],
  },
  'tidal-bolt': {
    name: 'Tidal bolt',
    desc: 'A water bolt from the staff, bursting into a splash on the goblin',
    steps: [{ fx: 'water/water-bolt' }, { fx: 'water/splash', on: 'hit' }],
  },
  hex: {
    name: 'Hex',
    desc: 'A shadow orb that leaves a curse hanging over the goblin',
    steps: [{ fx: 'projectiles/energy-orb', opts: { palette: 'shadow' } }, { fx: 'shadow/curse', on: 'hit' }],
  },
  smite: {
    name: 'Smite',
    desc: 'A lance of light from the priest, a pillar of light where it strikes',
    steps: [{ fx: 'holy/holy-bolt' }, { fx: 'holy/light-pillar', on: 'hit' }],
  },
  'arcane-ray': {
    name: 'Arcane ray',
    desc: 'A ray held from the staff onto the goblin, sparks splashing off where it lands',
    steps: [{ fx: 'magic/beam' }],
  },
  sunbeam: {
    name: 'Sunbeam',
    desc: 'A ray of light held from the priest\'s staff onto the goblin',
    // from the priest's tip (x 19, y -18 when pointing), 76 px from the goblin
    steps: [{ fx: 'magic/beam', opts: { palette: 'holy' }, stage: { cast: 'priest', x: -57, ground: 18 } }],
  },
  'chain-lightning': {
    name: 'Chain lightning',
    desc: 'Lightning from the staff that strikes the goblin, then leaps to the floor behind it and on',
    steps: [{ fx: 'electric/chain-lightning' }],
  },
  earthspike: {
    name: 'Earthspike',
    desc: 'The floor cracks under the goblin and rock spikes stab up through it',
    steps: [{ fx: 'earth/spike' }],
  },
  'ice-lance': {
    name: 'Ice lance',
    desc: 'Ice spikes burst from the floor under the goblin and shatter',
    steps: [{ fx: 'earth/spike', opts: { palette: 'ice' } }],
  },
  tremor: {
    name: 'Tremor',
    desc: 'A quake runs along the floor to the goblin and rock spikes erupt where it lands',
    steps: [{ fx: 'earth/quake' }, { fx: 'earth/spike', on: 'hit' }],
  },
  vanish: {
    name: 'Vanish',
    desc: 'A hand seal, and on its flash a smoke bomb dashed down at her feet that hides her',
    steps: [{ fx: 'shadow/seal' }, { fx: 'shadow/smoke-bomb', on: 'hit' }],
  },
  'shadow-step': {
    name: 'Shadow step',
    desc: 'A blink across the gap, cutting the goblin as she reappears',
    steps: [{ fx: 'shadow/blink' }, { fx: 'impacts/slash', on: 'hit', acted: true, opts: { palette: 'arcane' } }],
  },
  lunge: {
    name: 'Lunge',
    desc: 'A straight stab from the knight, sparking where the point goes in',
    steps: [{ fx: 'impacts/thrust' }, { fx: 'impacts/hit-spark', on: 'hit' }],
  },
  whirlwind: {
    name: 'Whirlwind',
    desc: 'The knight spins twice on the spot, the blade cutting the goblin on each turn',
    steps: [{ fx: 'impacts/spin-slash' }],
  },
  launcher: {
    name: 'Launcher',
    desc: 'An uppercut that throws sparks skyward, then a crushing blow that cracks the floor',
    steps: [{ fx: 'impacts/uppercut' }, { fx: 'impacts/heavy-hit' }],
  },
  'soak-and-shock': {
    name: 'Soak and shock',
    desc: 'A water bolt drenches the goblin, then lightning finds it wet',
    steps: [{ fx: 'water/water-bolt' }, { fx: 'status/soaked', on: 'hit' }, { fx: 'electric/shock' }, { fx: 'status/shocked', on: 'hit' }],
  },
  'deep-freeze': {
    name: 'Deep freeze',
    desc: 'An ice orb that locks the goblin in a crust of ice',
    steps: [{ fx: 'projectiles/energy-orb', opts: { palette: 'ice' } }, { fx: 'status/frozen', on: 'hit' }],
  },
  tempest: {
    name: 'Tempest',
    desc: 'A gust that shoves the goblin back, then a tornado that twists up round it',
    steps: [{ fx: 'wind/gust' }, { fx: 'wind/tornado' }],
  },
  flurry: {
    name: 'Flurry',
    desc: 'Two punches to the goblin\'s chest, then a roundhouse kick that knocks it back',
    steps: [{ fx: 'impacts/punch' }, { fx: 'impacts/punch', opts: { seed: 2 } }, { fx: 'impacts/kick' }],
  },
  'charged-strike': {
    name: 'Charged strike',
    desc: 'The knight holds his blade up while a charge builds in it, then brings it down on the goblin in a crushing blow',
    steps: [{ fx: 'magic/charge-up' }, { fx: 'impacts/heavy-hit', opts: { palette: 'gold' } }], // the blow in the charge's colors
  },
  'fire-arrow': {
    name: 'Fire arrow',
    desc: 'A burning arrow loosed from the bow that sets the goblin alight where it strikes',
    steps: [{ fx: 'projectiles/fire-arrow' }, { fx: 'status/burning', on: 'hit' }],
  },
  'arrow-rain': {
    name: 'Arrow rain',
    desc: 'Arrows loosed high out of the frame, then the volley falling across the goblin and thudding into the floor round it',
    steps: [{ fx: 'projectiles/sky-shot' }, { fx: 'projectiles/arrow-rain' }],
  },
  // military, acted by the soldier and the gunner
  'rifle-burst': {
    name: 'Rifle burst',
    desc: 'Three quick shots from the soldier\'s rifle, a bullet striking the goblin with each',
    // the rifle stays up between shots: the wind-up of the second and third is the aim itself
    steps: [
      { fx: 'firearms/muzzle-flash' }, { fx: 'firearms/bullet-hit', on: 'hit' },
      { fx: 'firearms/muzzle-flash', opts: { seed: 2 }, stage: { looks: { gather: 'shoot' } } }, { fx: 'firearms/bullet-hit', on: 'hit', opts: { seed: 2 } },
      { fx: 'firearms/muzzle-flash', opts: { seed: 3 }, stage: { looks: { gather: 'shoot' } } }, { fx: 'firearms/bullet-hit', on: 'hit', opts: { seed: 3 } },
    ],
  },
  'sniper-shot': {
    name: 'Sniper shot',
    desc: 'One aimed round, its tracer streaking across to strike the goblin',
    steps: [{ fx: 'firearms/tracer' }, { fx: 'firearms/bullet-hit', on: 'hit' }],
  },
  rocket: {
    name: 'Rocket',
    desc: 'The gunner kneels and fires, the backblast roaring out behind him, the rocket blowing up under the goblin',
    // the backblast is acted and the rocket rides it: both leave the tube at once
    steps: [{ fx: 'explosions/backblast' }, { fx: 'projectiles/rocket', on: 'hit' }, { fx: 'explosions/rocket-blast', on: 'hit' }],
  },
  grenade: {
    name: 'Grenade',
    desc: 'A frag grenade lobbed at the goblin, bursting at its feet in a flash and a spray of shrapnel',
    steps: [{ fx: 'projectiles/grenade' }, { fx: 'explosions/grenade-blast', on: 'hit' }],
  },
  'smoke-screen': {
    name: 'Smoke screen',
    desc: 'A smoke grenade lobbed at the goblin, its cloud billowing up and swallowing it',
    steps: [{ fx: 'projectiles/grenade' }, { fx: 'explosions/smoke-grenade', on: 'hit', stage: { at: 'target', x: -16, ground: 0 } }], // the canister lands at its feet, the front of the cloud over it
  },
  'rocket-salvo': {
    name: 'Rocket salvo',
    desc: 'The gunner fires three rockets one after another, each blowing up on the goblin as the next leaves the tube',
    // a step on hit plays at the step before's first hit, and a rocket's is its arrival: each backblast (acted, so he
    // stays down firing) rides the blast before it and its rocket rides it, so a rocket leaves as the last one lands
    steps: [
      { fx: 'explosions/backblast' }, { fx: 'projectiles/rocket', on: 'hit' }, { fx: 'explosions/rocket-blast', on: 'hit' },
      { fx: 'explosions/backblast', on: 'hit', acted: true, opts: { seed: 2 } }, { fx: 'projectiles/rocket', on: 'hit', opts: { seed: 2 } }, { fx: 'explosions/rocket-blast', on: 'hit', opts: { seed: 2 }, stage: { x: -9 } },
      { fx: 'explosions/backblast', on: 'hit', acted: true, opts: { seed: 3 } }, { fx: 'projectiles/rocket', on: 'hit', opts: { seed: 3 } }, { fx: 'explosions/rocket-blast', on: 'hit', opts: { seed: 3 }, stage: { x: 7 } },
    ],
  },
  molotov: {
    name: 'Molotov',
    desc: 'A burning bottle lobbed at the goblin, smashing at its feet and setting the floor alight round it',
    steps: [{ fx: 'projectiles/molotov' }, { fx: 'explosions/fire-splash', on: 'hit' }],
  },
  flashbang: {
    name: 'Flashbang',
    desc: 'A stun grenade lobbed at the goblin, going off in a white flash that holds it stunned',
    steps: [{ fx: 'projectiles/grenade', opts: { palette: 'stone' } }, { fx: 'explosions/flashbang', on: 'hit' }], // a grey stun canister, not the olive frag
  },
  demolition: {
    name: 'Demolition',
    desc: 'A bundle of dynamite left at the goblin\'s feet, its fuse fizzing down, then the blast',
    steps: [{ fx: 'explosions/dynamite' }],
  },
  breach: {
    name: 'Breach',
    desc: 'A C4 charge stuck at the goblin\'s feet, its light beeping faster and faster, then the sharp blast',
    steps: [{ fx: 'explosions/c4' }],
  },
  minefield: {
    name: 'Minefield',
    desc: 'Two mines in the floor round the goblin: the one in front of it clicks and erupts, then the one behind it',
    // the second lies there from the start (waits), going off once the first has settled
    steps: [{ fx: 'explosions/landmine' }, { fx: 'explosions/landmine', opts: { seed: 2 }, stage: { x: 16, waits: true } }],
  },
};
