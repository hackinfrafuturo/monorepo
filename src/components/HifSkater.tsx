import { useEffect, useRef, useState } from 'react'
import {
  animate,
  motion,
  motionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type AnimationPlaybackControls,
  type MotionValue,
} from 'motion/react'
import { HifMark } from './HifLogo'
import { BAND, STAR } from './hif-dots'
import { DITHER, DITHER_R, LIMB_ANGLES, STAR_CENTER_DY, type BoardDotData, type RiderDotData } from './hif-dither'

/**
 * The Hack Infra Futuro mark as a skater: the star rides the purple band like a skateboard.
 *
 * Two behaviours, both short and in place:
 *   click   a backflip with the board: crouch, pop, flip, land with a squash and a puff of dust (~1.3 s)
 *   hover   the dots near the cursor slide away from it and flow back as it passes (a repel field),
 *           with a slight pull in the direction the cursor moves
 *
 * How it moves: a few invisible "controls" (board height, rider height, rotation, squash, tuck…) are
 * driven by the flip timeline; every dot follows its own target on a spring, so the star squashes,
 * stretches and wobbles like a soft body. In the dithered variant the star's five points also bend like
 * limbs (head, arms, legs) and the deck flexes under the rider.
 *
 * Variants: 'classic' is the 7 × 7 mark (one React spring per dot); 'dither' is the 64 × 64 dithered star
 * (~1,400 dots simulated in a frame loop and drawn on a canvas while anything moves). Units are the mark's
 * own: 70 × 70. Never moves under prefers-reduced-motion.
 */

// ---------------------------------------------------------------------------------------------------------
// timelines

type Ease = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut'
/** [seconds, value, ease of the segment that ends here] */
type Key = readonly [number, number, Ease?]
type Line = { values: number[]; options: Record<string, unknown> }

function tl(points: readonly Key[], duration: number): Line {
  const pts = [...points]
  if (pts[0][0] !== 0) pts.unshift([0, pts[0][1]])
  if (pts[pts.length - 1][0] !== duration) pts.push([duration, pts[pts.length - 1][1]])
  return {
    values: pts.map((p) => p[1]),
    options: {
      duration,
      times: pts.map((p) => p[0] / duration),
      ease: pts.slice(1).map((p) => p[2] ?? 'easeInOut'),
    },
  }
}

// ---------------------------------------------------------------------------------------------------------
// the soft body

const RIDER_CENTER = [35, 25] as const
const BOARD_CENTER = [35, 60] as const
const SINK = [2.2, 2, 1.7, 1.2, 0.2] // per star row: how far it sinks on a knee pump
const ROW_SPRING = [
  { stiffness: 190, damping: 13 }, // head: loose
  { stiffness: 230, damping: 14 },
  { stiffness: 290, damping: 16 },
  { stiffness: 400, damping: 20 },
  { stiffness: 650, damping: 30 }, // feet: stiff
]
const BOARD_SPRING = { stiffness: 1100, damping: 48 }

const REST = {
  x: 0, sway: 0, boardY: 0, riderY: 0, spin: 0, lean: 0, turn: 0, face: 1, spread: 1, squash: 1,
  pump: 0, arms: 0, boardTurn: 0, flip: 1, shuv: 1, wheel: 0, roll: 0,
}
type ControlKey = keyof typeof REST
type Controls = Record<ControlKey, MotionValue<number>>
type Values = Record<ControlKey, number>
const KEYS = Object.keys(REST) as ControlKey[]

function makeControls() {
  return Object.fromEntries(KEYS.map((key) => [key, motionValue(REST[key])])) as Controls
}
function read(c: Controls) {
  return Object.fromEntries(KEYS.map((key) => [key, c[key].get()])) as Values
}

/** the star spins on its own centre; the board never spins */
function spinStar(px: number, py: number, deg: number) {
  const [x, y] = rotate(px, py - STAR_CENTER_DY, deg)
  return [x, y + STAR_CENTER_DY] as const
}

function rotate(x: number, y: number, deg: number) {
  const a = (deg * Math.PI) / 180
  const cos = Math.cos(a)
  const sin = Math.sin(a)
  return [x * cos - y * sin, x * sin + y * cos] as const
}

/** Where a star dot wants to be. */
function riderTarget(v: Values, col: number, row: number) {
  const dx = col * 10 + 5 - RIDER_CENTER[0]
  const dy = row * 10 + 5 - RIDER_CENTER[1]
  const arm = row === 2 && col === 1 ? 1 : row === 2 && col === 5 ? -1 : 0
  let px = dx * v.spread
  let py = dy * v.spread
  // squash and stretch around the feet (row 4 sits 20 below the rider's centre)
  py = 20 + (py - 20) * v.squash
  px *= 1 + (1 - v.squash) * 0.6
  py += v.pump * SINK[row] + v.arms * arm
  ;[px, py] = rotate(px, py, v.turn)
  px *= v.face
  // relative to the board's centre
  ;[px, py] = spinStar(px, py, v.spin)
  const qx = px + v.lean
  const qy = py + RIDER_CENTER[1] - BOARD_CENTER[1] + (v.riderY - v.boardY)
  return [BOARD_CENTER[0] + qx + v.x + v.sway, BOARD_CENTER[1] + qy + v.boardY] as const
}

/** Where a board dot wants to be. */
function boardTarget(v: Values, col: number, row: number) {
  const bx = col * 10 + 5 - BOARD_CENTER[0]
  const by = row * 10 + 5 - BOARD_CENTER[1]
  let [px, py] = rotate(bx * v.shuv, by * v.flip, v.boardTurn)
  px *= v.face
  // a bump runs nose to tail, like the wheels rolling
  const wave = -v.roll * 0.5 * (1 - Math.cos(2 * Math.PI * (v.wheel - col / 7 - (row - 5) * 0.12)))
  return [BOARD_CENTER[0] + px + v.x + v.sway, BOARD_CENTER[1] + py + v.boardY + wave] as const
}

/** Limb state for the dithered star: each of its five points bends (theta, degrees) and stretches (ext). */
type Limbs = { theta: Float32Array; omega: Float32Array; ext: Float32Array; extV: Float32Array; flex: number; flexV: number }
function makeLimbs(): Limbs {
  return { theta: new Float32Array(5), omega: new Float32Array(5), ext: new Float32Array(5), extV: new Float32Array(5), flex: 0, flexV: 0 }
}

/** Where a dot of the dithered star wants to be: limbs first (bend + stretch from the star's centre), then the same body mechanics as the 7 × 7 mark. */
function riderTargetAt(v: Values, d: RiderDotData, out: Float32Array, i: number, L: Limbs) {
  let lx = d.lx
  let ly = d.ly
  if (d.bend > 0) {
    const e = 1 + L.ext[d.limb] * d.bend
    ;[lx, ly] = rotate(lx * e, ly * e, L.theta[d.limb] * d.bend)
  }
  let px = lx * v.spread
  let py = (ly + STAR_CENTER_DY) * v.spread
  py = 20 + (py - 20) * v.squash
  px *= 1 + (1 - v.squash) * 0.6
  py += v.pump * d.sink
  ;[px, py] = rotate(px, py, v.turn)
  px *= v.face
  ;[px, py] = spinStar(px, py, v.spin)
  const qx = px + v.lean
  const qy = py + RIDER_CENTER[1] - BOARD_CENTER[1] + (v.riderY - v.boardY)
  out[i * 2] = BOARD_CENTER[0] + qx + v.x + v.sway
  out[i * 2 + 1] = BOARD_CENTER[1] + qy + v.boardY
}

/** A board dot of the dithered mark; the deck flexes (dips in the middle) under the rider's weight. */
function boardTargetAt(v: Values, d: BoardDotData, out: Float32Array, i: number, L: Limbs) {
  const sag = L.flex * (1 - (2 * d.along - 1) ** 2)
  let [px, py] = rotate(d.bx * v.shuv, (d.by + sag) * v.flip, v.boardTurn)
  px *= v.face
  const wave = -v.roll * 0.5 * (1 - Math.cos(2 * Math.PI * (v.wheel - d.along - d.across * 0.12)))
  out[i * 2] = BOARD_CENTER[0] + px + v.x + v.sway
  out[i * 2 + 1] = BOARD_CENTER[1] + py + v.boardY + wave
}

/**
 * Pose + swing for the limbs. The pose comes from the controls the timelines already drive (crouch,
 * spread/tuck, the balance seesaw, lean); the swing comes from the body's acceleration, each limb a
 * damped pendulum, so arms trail on a push, flop on a landing and dangle while you drag it.
 */
const LIMB_PERP = LIMB_ANGLES.map((a) => {
  const r = ((a + 90) * Math.PI) / 180
  return [Math.cos(r), Math.sin(r)] as const
})
function stepLimbs(L: Limbs, v: Values, ax: number, ay: number, dt: number) {
  const crouch = 1 - v.squash // > 0 crouching, < 0 stretching
  const open = v.spread - 1 // > 0 spread star, < 0 tucked
  const raise = open * 70 + Math.max(0, crouch) * 30 // arms up
  const splay = open * 40 + crouch * 45 // legs out
  const seesaw = v.arms * 9 // balance: one arm up, the other down
  // pose targets: [head, right arm, right leg, left leg, left arm]; right side bends negative to open, left positive
  const theta = [v.lean * 3 + v.arms * 2.5, -raise + seesaw, -splay, splay, raise + seesaw]
  const ext = [open * 0.35 - Math.max(0, crouch) * 0.2, open * 0.3, open * 0.3 - crouch * 0.45, open * 0.3 - crouch * 0.45, open * 0.3]
  const steps = 3
  const h = dt / steps
  for (let s = 0; s < steps; s++) {
    for (let l = 0; l < 5; l++) {
      // the body's acceleration swings each limb about its root (opposite to the push)
      const torque = Math.max(-2000, Math.min(2000, -(ax * LIMB_PERP[l][0] + ay * LIMB_PERP[l][1]) * 0.65))
      const acc = 140 * (theta[l] - L.theta[l]) - 9 * L.omega[l] + torque
      L.omega[l] += acc * h
      L.theta[l] = Math.max(-62, Math.min(62, L.theta[l] + L.omega[l] * h))
      const eAcc = 180 * (ext[l] - L.ext[l]) - 13 * L.extV[l] + Math.max(-3, Math.min(3, ay * 0.0006)) * (l === 2 || l === 3 ? 1 : -0.4)
      L.extV[l] += eAcc * h
      L.ext[l] = Math.max(-0.55, Math.min(0.7, L.ext[l] + L.extV[l] * h))
    }
    // the deck: sags under a crouch and on landings, springs back
    const flexT = Math.max(0, crouch) * 5 + Math.max(0, Math.min(4, ay * 0.0025))
    L.flex += (L.flexV += (320 * (flexT - L.flex) - 15 * L.flexV) * h) * h
  }
}

/**
 * Soft-body state for the dithered field: ~1,400 dots is too many for one React spring each, so they
 * live in typed arrays and are integrated in the frame loop (springs: loose at the head, stiff at the feet).
 */
function makeField() {
  const nr = DITHER.rider.length
  const nb = DITHER.board.length
  const n = nr + nb
  const pos = new Float32Array(n * 2)
  const target = new Float32Array(n * 2)
  const vel = new Float32Array(n * 2)
  const k = new Float32Array(n)
  const damp = new Float32Array(n)
  const rest = read(makeControls())
  const limbs = makeLimbs()
  DITHER.rider.forEach((d, i) => {
    riderTargetAt(rest, d, pos, i, limbs)
    k[i] = d.stiffness
    damp[i] = d.damping
  })
  DITHER.board.forEach((d, i) => {
    boardTargetAt(rest, d, pos, nr + i, limbs)
    k[nr + i] = 1100
    damp[nr + i] = 48
  })
  // body motion (board centre) for the limbs' swing
  const body = { x: 0, y: 0, vx: 0, vy: 0, ax: 0, ay: 0 }
  return { nr, nb, n, pos, target, vel, k, damp, rest: pos.slice(), limbs, body }
}
type Field = ReturnType<typeof makeField>

function useDot(c: Controls, target: (v: Values) => readonly [number, number], spring: object) {
  const inputs = KEYS.map((k) => c[k])
  const tx = useTransform(inputs, () => target(read(c))[0])
  const ty = useTransform(inputs, () => target(read(c))[1])
  return [useSpring(tx, spring), useSpring(ty, spring)] as const
}

function RiderDot({ c, col, row }: { c: Controls; col: number; row: number }) {
  const [cx, cy] = useDot(c, (v) => riderTarget(v, col, row), ROW_SPRING[row])
  return <motion.circle cx={cx} cy={cy} r={4} />
}

function BoardDot({ c, col, row }: { c: Controls; col: number; row: number }) {
  const [cx, cy] = useDot(c, (v) => boardTarget(v, col, row), BOARD_SPRING)
  return <motion.circle cx={cx} cy={cy} r={4} />
}

/** The click: a backflip in place. */
const FLIP_T = 1.4
// only the star leaves the board: crouch, jump, flip, land. The board stays put and just gives a little under the push-off and the landing.
const FLIP: Partial<Record<ControlKey, Line>> = {
  boardY: tl([[0.1, 0], [0.18, 1.2], [0.3, 0], [0.92, 0], [1.0, 1.4], [1.16, 0]], FLIP_T),
  riderY: tl([[0.04, 0], [0.16, 2], [0.56, -34, 'easeOut'], [0.94, 0, 'easeIn'], [1.02, 2.2], [1.3, 0]], FLIP_T),
  // the whole skater turns over, board and all
  spin: tl([[0.22, 0], [0.86, -360, 'easeInOut'], [0.86, 0]], FLIP_T),
  squash: tl([[0.02, 1], [0.15, 0.75], [0.27, 1.15], [0.42, 1], [0.94, 1], [1.02, 0.72], [1.2, 1.06], [1.32, 1]], FLIP_T),
  spread: tl([[0.3, 1], [0.45, 0.86], [0.7, 0.86], [0.85, 1.12], [0.98, 1]], FLIP_T), // tuck, then open for the landing
}

// ---------------------------------------------------------------------------------------------------------
// landing dust: a few dots, drawn on the canvas (dither) or a small SVG pool (classic)

type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; ink: boolean }
const POOL = 24
const INK = '#181818'

// the repel field, in the mark's units
const REPEL_RADIUS = 19
const REPEL_PUSH = 8.5
const REPEL_DRAG = 0.016 // how much the cursor's own motion pulls the dots along

// ---------------------------------------------------------------------------------------------------------

export function HifSkater({
  className,
  run,
  variant = 'classic',
}: {
  className?: string
  /** bump this number to make it flip */
  run: number
  /** 'classic' is the 7 × 7 mark; 'dither' is the 64 × 64 dithered star */
  variant?: 'classic' | 'dither'
}) {
  const reduce = useReducedMotion()
  const svg = useRef<SVGSVGElement>(null)
  const fx = useRef<SVGGElement>(null)
  const [c] = useState(makeControls)
  const [finishedRun, setFinishedRun] = useState(0)
  const flipping = run > finishedRun && !reduce

  const particles = useRef<Particle[]>([])
  // the cursor, in client pixels, and how fast it is moving
  const pointer = useRef({ x: -1e4, y: -1e4, vx: 0, vy: 0, t: 0 })

  const [field] = useState<Field | null>(() => (variant === 'dither' ? makeField() : null))
  const canvas = useRef<HTMLCanvasElement>(null)
  const canvasOnRef = useRef(false)
  const [canvasOn, setCanvasOn] = useState(false)

  // ---- the flip ------------------------------------------------------------------------------------------
  useEffect(() => {
    const playing: AnimationPlaybackControls[] = []
    let timer = 0
    if (flipping) {
      for (const key of KEYS) if (!(key in FLIP)) c[key].set(REST[key])
      for (const [key, line] of Object.entries(FLIP) as [ControlKey, Line][]) {
        playing.push(animate(c[key], line.values, line.options))
      }
      timer = window.setTimeout(() => setFinishedRun(run), FLIP_T * 1000)
    } else {
      for (const key of KEYS) {
        if (key === 'spin' || key === 'turn') {
          const target = Math.round(c[key].get() / 360) * 360
          playing.push(animate(c[key], target, { duration: 0.3, ease: 'easeOut', onComplete: () => c[key].set(0) }))
        } else playing.push(animate(c[key], REST[key], { duration: 0.3, ease: 'easeOut' }))
      }
    }
    return () => {
      playing.forEach((a) => a.stop())
      window.clearTimeout(timer)
    }
  }, [flipping, run, c])

  // ---- the cursor ----------------------------------------------------------------------------------------
  useEffect(() => {
    if (reduce || !field) return
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      const p = pointer.current
      const now = performance.now()
      const dt = Math.max(1, now - p.t) / 1000
      if (p.x > -1e3) {
        p.vx += ((e.clientX - p.x) / dt - p.vx) * 0.3
        p.vy += ((e.clientY - p.y) / dt - p.vy) * 0.3
      }
      p.x = e.clientX
      p.y = e.clientY
      p.t = now
    }
    const onLeave = () => {
      pointer.current.x = -1e4
      pointer.current.y = -1e4
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    return () => {
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
    }
  }, [reduce, field])

  // ---- the frame loop: dust, and the dithered field ------------------------------------------------------
  useEffect(() => {
    if (reduce) return
    let raf = 0
    let last = performance.now()
    let prevY = c.riderY.get()
    let prevVy = 0
    const nodes = fx.current ? (Array.from(fx.current.children) as SVGCircleElement[]) : []
    const brand = (svg.current && getComputedStyle(svg.current).getPropertyValue('--color-brand').trim()) || '#7c3aec'

    const burst = (x: number, y: number, n: number) => {
      for (let i = 0; i < n; i++) {
        const a = Math.PI + Math.random() * Math.PI
        const s = 30 + Math.random() * 70
        if (particles.current.length >= POOL) particles.current.shift()
        particles.current.push({ x: x + (Math.random() - 0.5) * 50, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6, life: 0, max: 0.35 + Math.random() * 0.25, r: 1 + Math.random() * 1.2, ink: Math.random() < 0.5 })
      }
    }

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const v = read(c)

      // landing: falling fast, then suddenly not
      const vy = (v.riderY - prevY) / Math.max(dt, 1e-3)
      if (prevVy > 90 && vy < 20) burst(BOARD_CENTER[0], BOARD_CENTER[1] - 10, 10) // a puff off the deck where the star lands
      prevVy = vy
      prevY = v.riderY

      const list = particles.current
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i]
        p.life += dt
        if (p.life >= p.max) {
          list.splice(i, 1)
          continue
        }
        p.vy += 260 * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
      }

      if (field) stepField(v, dt)
      else {
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i]
          const p = list[i]
          if (!p) {
            n.setAttribute('opacity', '0')
            continue
          }
          const k = 1 - p.life / p.max
          n.setAttribute('cx', p.x.toFixed(2))
          n.setAttribute('cy', p.y.toFixed(2))
          n.setAttribute('r', (p.r * (0.4 + 0.6 * k)).toFixed(2))
          n.setAttribute('opacity', (k * 0.9).toFixed(2))
          n.style.fill = p.ink ? INK : brand
        }
      }
      raf = requestAnimationFrame(tick)
    }

    function stepField(v: Values, dt: number) {
      const F = field!
      const el = svg.current
      if (!el) return
      const box = el.getBoundingClientRect()
      const per = box.width / 70
      // the cursor in the mark's units, and whether it's close enough to matter
      const P = pointer.current
      const ux = (P.x - box.left) / per
      const uy = (P.y - box.top) / per
      const near = ux > -REPEL_RADIUS && ux < 70 + REPEL_RADIUS && uy > -REPEL_RADIUS && uy < 70 + REPEL_RADIUS
      P.vx *= 0.9 // the cursor's speed fades when it stops
      P.vy *= 0.9

      const busy = flipping || near || canvasOnRef.current || particles.current.length > 0
      if (!busy) return

      // body acceleration (smoothed) for the limbs' swing
      const B = F.body
      const by = v.riderY
      const nvy = (by - B.y) / Math.max(dt, 1e-3)
      B.ay += ((nvy - B.vy) / Math.max(dt, 1e-3) - B.ay) * 0.35
      B.ax += (0 - B.ax) * 0.35
      B.y = by
      B.vy = nvy
      const [lax, lay] = rotate(B.ax, B.ay, -v.spin)
      stepLimbs(F.limbs, v, lax, lay, dt)
      for (let i = 0; i < F.nr; i++) riderTargetAt(v, DITHER.rider[i], F.target, i, F.limbs)
      for (let i = 0; i < F.nb; i++) boardTargetAt(v, DITHER.board[i], F.target, F.nr + i, F.limbs)

      // the repel field: push targets away from the cursor, falling off smoothly; a little drag along its path
      if (near) {
        const dvx = (P.vx / per) * REPEL_DRAG
        const dvy = (P.vy / per) * REPEL_DRAG
        const r2 = REPEL_RADIUS * REPEL_RADIUS
        for (let i = 0; i < F.n; i++) {
          const tx = F.target[i * 2]
          const ty = F.target[i * 2 + 1]
          const dx = tx - ux
          const dy = ty - uy
          const d2 = dx * dx + dy * dy
          if (d2 >= r2) continue
          const d = Math.sqrt(d2) || 0.001
          const fall = (1 - d / REPEL_RADIUS) ** 2
          F.target[i * 2] = tx + (dx / d) * REPEL_PUSH * fall + dvx * fall
          F.target[i * 2 + 1] = ty + (dy / d) * REPEL_PUSH * fall + dvy * fall
        }
      }

      // springs, in small steps so the stiff core stays stable
      const steps = 4
      const h = dt / steps
      for (let s = 0; s < steps; s++) {
        for (let i = 0; i < F.n; i++) {
          const kx = F.k[i]
          const c2 = F.damp[i]
          for (let a = 0; a < 2; a++) {
            const j = i * 2 + a
            F.vel[j] += (kx * (F.target[j] - F.pos[j]) - c2 * F.vel[j]) * h
            F.pos[j] += F.vel[j] * h
          }
        }
      }
      let moving = 0
      for (let j = 0; j < F.n * 2; j++) moving = Math.max(moving, Math.abs(F.pos[j] - F.rest[j]), Math.abs(F.vel[j]) * 0.05)
      for (let l = 0; l < 5; l++) moving = Math.max(moving, Math.abs(F.limbs.theta[l]) * 0.05, Math.abs(F.limbs.omega[l]) * 0.01)

      // the canvas is only shown while something moves; at rest the static logo takes over
      const want = flipping || moving > 0.02 || particles.current.length > 0
      if (want !== canvasOnRef.current) {
        canvasOnRef.current = want
        setCanvasOn(want)
      }
      if (want) draw(box, per)
    }

    function draw(box: DOMRect, per: number) {
      const cv = canvas.current
      if (!cv) return
      const F = field!
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const W = window.innerWidth
      const H = window.innerHeight
      if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
        cv.width = Math.round(W * dpr)
        cv.height = Math.round(H * dpr)
      }
      const ctx = cv.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      const r = DITHER_R * per
      const dots = (from: number, to: number, color: string) => {
        ctx.fillStyle = color
        ctx.beginPath()
        for (let i = from; i < to; i++) {
          const x = box.left + F.pos[i * 2] * per
          const y = box.top + F.pos[i * 2 + 1] * per
          ctx.moveTo(x + r, y)
          ctx.arc(x, y, r, 0, Math.PI * 2)
        }
        ctx.fill()
      }
      dots(F.nr, F.n, brand)
      dots(0, F.nr, INK)
      for (const p of particles.current) {
        const k = 1 - p.life / p.max
        ctx.globalAlpha = k * 0.9
        ctx.fillStyle = p.ink ? INK : brand
        ctx.beginPath()
        ctx.arc(box.left + p.x * per, box.top + p.y * per, p.r * (0.4 + 0.6 * k) * per * 0.6, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [flipping, reduce, c, field])

  if (reduce) return <HifMark className={className} />

  return (
    <>
      {field && (
        <canvas
          ref={canvas}
          aria-hidden
          className="pointer-events-none fixed inset-0 z-30 h-screen w-screen"
          style={{ display: canvasOn ? 'block' : 'none' }}
        />
      )}
      <svg ref={svg} viewBox="0 0 70 70" aria-hidden className={`overflow-visible ${className ?? ''}`}>
        {field ? (
          // the dithered logo at rest; while it moves it is drawn on the canvas instead
          <g style={{ visibility: canvasOn ? 'hidden' : 'visible' }}>
            <g className="fill-brand">
              {DITHER.board.map((d, i) => (
                <circle key={i} cx={d.bx + BOARD_CENTER[0]} cy={d.by + BOARD_CENTER[1]} r={DITHER_R} />
              ))}
            </g>
            <g className="fill-current">
              {DITHER.rider.map((d, i) => (
                <circle key={i} cx={d.dx + RIDER_CENTER[0]} cy={d.dy + RIDER_CENTER[1]} r={DITHER_R} />
              ))}
            </g>
          </g>
        ) : (
          <>
            <g ref={fx}>
              {Array.from({ length: POOL }, (_, i) => (
                <circle key={i} r={0} opacity={0} />
              ))}
            </g>
            <g className="fill-current">
              {STAR.map(([col, row]) => (
                <RiderDot key={`s${col}${row}`} c={c} col={col} row={row} />
              ))}
            </g>
            <g className="fill-brand">
              {BAND.map(([col, row]) => (
                <BoardDot key={`b${col}${row}`} c={c} col={col} row={row} />
              ))}
            </g>
          </>
        )}
      </svg>
    </>
  )
}
