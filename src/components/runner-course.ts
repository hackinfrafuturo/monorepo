/**
 * The runner's course, generated a chunk at a time (src/components/HifRunner.tsx). A chunk is one pattern
 * (a run of letters to jump, one to duck under, a tower, a jump-then-duck, …) followed by a breather, picked
 * by weight as the difficulty climbs from 0 to 1 with the score.
 *
 * Every pattern is checked against the jump: a cluster is never wider, nor a tower taller, than a full jump
 * clears at the current speed, and every gap leaves time to land. So the knobs below change how hard the
 * course is, not whether it can be played.
 *
 * The speed is not a knob here: ACCEL and MAX_SPEED in HifRunner.tsx are mirrored in convex/runner.ts, which
 * caps scores with them.
 */

/** a value at difficulty 0 and at difficulty 1, interpolated between */
export type Range = readonly [easy: number, hard: number]
export type PatternName = 'cluster' | 'duck' | 'tower' | 'rapid' | 'jumpDuck' | 'duckJump'
export type PatternKnob = { from: number; weight: Range }

export const RUNNER_KNOBS = {
  /** a fixed seed replays the same course every run (handy for tuning); null is random */
  seed: null as number | null,
  /** difficulty = (score / score)^curve, capped at 1; curve < 1 gets hard sooner */
  ramp: { score: 500, curve: 0.85 },
  /** distance before the first obstacle, as a share of the screen's width */
  firstGap: 0.6,
  /** seconds of ground after landing before the next chunk: min, plus a random jitter that shrinks */
  rest: { min: 0.06, jitter: [0.35, 0.08] as Range },
  /** ground clusters: up to this many letters, using this share of a jump's reach */
  cluster: { letters: [2, 5] as Range, reach: [0.7, 0.8] as Range },
  /** air letters bob up and down: amplitude (mark units, safe up to ~7) and speed (radians a second) */
  bob: { amp: [3, 6.5] as Range, speed: [5, 9] as Range },
  /** rapid: this many clusters in a row, each with only this many seconds of ground between them */
  rapid: { count: [2, 4] as Range, rest: [0.16, 0.05] as Range },
  /** jumpDuck: seconds between landing the jump and the air letter arriving */
  jumpDuck: { lead: [0.3, 0.1] as Range },
  /** duckJump: seconds between leaving the air letter and reaching the ground one */
  duckJump: { lead: [0.4, 0.2] as Range },
  /** how a pattern is picked: from a score on, by a weight that moves from easy to hard */
  patterns: {
    cluster: { from: 0, weight: [1, 0.6] },
    duck: { from: 20, weight: [0.45, 0.5] },
    rapid: { from: 80, weight: [0.15, 0.45] },
    tower: { from: 140, weight: [0.1, 0.35] },
    jumpDuck: { from: 200, weight: [0.1, 0.35] },
    duckJump: { from: 260, weight: [0.1, 0.3] },
  } satisfies Record<PatternName, PatternKnob> as Record<PatternName, PatternKnob>,
}
export type RunnerKnobs = typeof RUNNER_KNOBS

/** One letter of a chunk; they take the name's letters in order. */
export type Piece = {
  /** from the chunk's start to the letter's left edge, in pixels */
  at: number
  /** 'ground' stands on the floor, 'stack' on the ground letter at the same `at`, 'air' is ducked under */
  level: 'ground' | 'stack' | 'air'
  /** bob amplitude (mark units) and speed (radians a second); 0 for letters on the ground */
  bob: number
  bobSpeed: number
}
export type Chunk = { pattern: PatternName; pieces: Piece[]; length: number }

/** what the generator needs to know about the game right now, in pixels and seconds */
export type CourseCtx = {
  score: number
  speed: number
  /** a full jump: time in the air and apex height */
  airTime: number
  apex: number
  /** the star's collision box width */
  starW: number
  /** the width (ink, plus the gap to the next) and collision height of the i-th upcoming letter */
  letterW: (i: number) => number
  letterH: (i: number) => number
}

export type Rng = () => number

/** mulberry32: small and seedable */
export function makeRng(seed: number | null): Rng {
  if (seed === null) return Math.random
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const lerp = (r: Range, d: number) => r[0] + (r[1] - r[0]) * d

export function difficulty(score: number, knobs: RunnerKnobs = RUNNER_KNOBS) {
  return Math.min(1, Math.max(0, score / knobs.ramp.score)) ** knobs.ramp.curve
}

/** how far the star travels while a full jump keeps its feet above `h` */
function clearance(ctx: CourseCtx, h: number) {
  return h >= ctx.apex ? 0 : ctx.speed * ctx.airTime * Math.sqrt(1 - h / ctx.apex)
}

export function nextChunk(ctx: CourseCtx, rng: Rng, knobs: RunnerKnobs = RUNNER_KNOBS): Chunk {
  const d = difficulty(ctx.score, knobs)
  const { speed, airTime } = ctx
  const land = speed * airTime // ground covered by one full jump
  const rest = () => speed * (knobs.rest.min + rng() * lerp(knobs.rest.jitter, d))
  const bob = () => ({ bob: lerp(knobs.bob.amp, d) * (0.6 + 0.4 * rng()), bobSpeed: lerp(knobs.bob.speed, d) * (0.8 + 0.4 * rng()) })

  // a ground run starting with letter i, as wide as a jump allows; returns its pieces and width
  const cluster = (i: number, at: number) => {
    const max = Math.max(1, Math.round(lerp(knobs.cluster.letters, d)))
    const count = 1 + Math.floor(rng() * max)
    const reach = land * lerp(knobs.cluster.reach, d) - ctx.starW
    const pieces: Piece[] = []
    let w = 0
    for (let n = 0; n < count; n++) {
      if (n > 0 && w + ctx.letterW(i + n) > reach) break
      pieces.push({ at: at + w, level: 'ground', bob: 0, bobSpeed: 0 })
      w += ctx.letterW(i + n)
    }
    return { pieces, w }
  }

  // pick a pattern by weight among those unlocked
  const names = (Object.keys(knobs.patterns) as PatternName[]).filter((n) => ctx.score >= knobs.patterns[n].from)
  const weights = names.map((n) => Math.max(0, lerp(knobs.patterns[n].weight, d)))
  let pick = rng() * weights.reduce((a, b) => a + b, 0)
  let pattern: PatternName = 'cluster'
  for (let i = 0; i < names.length; i++) {
    pick -= weights[i]
    if (pick <= 0) {
      pattern = names[i]
      break
    }
  }

  switch (pattern) {
    case 'duck': {
      const w = ctx.letterW(0)
      return { pattern, pieces: [{ at: 0, level: 'air', ...bob() }], length: w + 1.5 * ctx.starW + speed * 0.12 + rest() }
    }
    case 'tower': {
      // two letters stacked: a short hop won't do, and it only comes when a full jump clears it here
      const w = Math.max(ctx.letterW(0), ctx.letterW(1))
      const h = ctx.letterH(0) + ctx.letterH(1)
      if (clearance(ctx, h) >= 1.3 * (w + ctx.starW)) {
        return {
          pattern,
          pieces: [
            { at: 0, level: 'ground', bob: 0, bobSpeed: 0 },
            { at: 0, level: 'stack', bob: 0, bobSpeed: 0 },
          ],
          length: w + land + rest(),
        }
      }
      break
    }
    case 'rapid': {
      const count = Math.max(2, Math.round(lerp(knobs.rapid.count, d) - rng()))
      const pieces: Piece[] = []
      let at = 0
      for (let n = 0; n < count; n++) {
        const c = cluster(pieces.length, at)
        pieces.push(...c.pieces)
        at += c.w + (n < count - 1 ? land + speed * lerp(knobs.rapid.rest, d) : 0)
      }
      return { pattern, pieces, length: at + land + rest() }
    }
    case 'jumpDuck': {
      const c = cluster(0, 0)
      const at = c.w + land + speed * lerp(knobs.jumpDuck.lead, d)
      const w = ctx.letterW(c.pieces.length)
      return { pattern, pieces: [...c.pieces, { at, level: 'air', ...bob() }], length: at + w + 1.5 * ctx.starW + speed * 0.12 + rest() }
    }
    case 'duckJump': {
      const air = { at: 0, level: 'air' as const, ...bob() }
      const at = ctx.letterW(0) + 1.5 * ctx.starW + speed * lerp(knobs.duckJump.lead, d)
      const c = cluster(1, at)
      return { pattern, pieces: [air, ...c.pieces], length: at + c.w + land + rest() }
    }
  }
  const c = cluster(0, 0)
  return { pattern: 'cluster', pieces: c.pieces, length: c.w + land + rest() }
}
