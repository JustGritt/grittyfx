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
};
