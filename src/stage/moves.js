// Moves: effects chained and acted out on the stage, in the gallery and by `render --stage <move>`. A step plays once
// the one before it has ended, after its own wind-up; `on: 'hit'` plays it with the previous step's first hit instead.
export const MOVES = {
  'sword-combo': {
    name: 'Sword combo',
    desc: 'A slash that sparks on contact, then a heavy blow that cracks the floor',
    steps: [{ fx: 'impacts/slash' }, { fx: 'impacts/hit-spark', on: 'hit' }, { fx: 'impacts/heavy-hit' }],
  },
  fireball: {
    name: 'Fireball',
    desc: 'A fireball thrown from the sword, exploding on the dummy',
    steps: [{ fx: 'fire/fireball' }, { fx: 'explosions/small-explosion', on: 'hit' }],
  },
  thunder: {
    name: 'Thunder',
    desc: 'Lightning called down on the dummy',
    steps: [{ fx: 'magic/lightning-strike' }],
  },
  'frost-nova': {
    name: 'Frost nova',
    desc: 'Ice bursts from the ground around the swordsman, glints hanging in the cold air',
    steps: [{ fx: 'magic/frost-burst' }, { fx: 'magic/twinkle', on: 'hit', opts: { palette: 'ice' } }],
  },
};
