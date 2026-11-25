// Moves: effects chained and acted out on the stage, in the gallery and by `render --stage <move>`. A step plays once
// the one before it has ended, after its own wind-up; `on: 'hit'` plays it with the previous step's first hit instead.
// A step's `stage` places it over its effect's meta.stage.
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
    steps: [{ fx: 'shadow/blink' }, { fx: 'impacts/slash', on: 'hit', opts: { palette: 'arcane' } }],
  },
};
