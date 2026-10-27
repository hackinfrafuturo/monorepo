import { useEffect, useRef, useState, type FormEvent } from 'react'
import { githubHandle } from '../../convex/github'
import { useReducedMotion } from 'motion/react'
import { BAND_CX, DITHER, DITHER_PITCH, DITHER_R, FLAG_SPLIT, FLAG_STAR, FLAG_W, SPRITE_EXT, STAR_FEET, STAR_R, bandTile, drawBandTile, drawFlagTop, drawStarFromFlag, flagTopImage, starSprite, type BandTile } from './hif-dither'
import { boardEnabled, claimRun, completeRun, formatMs, startRun, topScores, type RunId, type Score } from './breakout-board'

/**
 * Breakout, played with the hero's own logo (Chile's flag in dots): the flag's star is the ball, its
 * purple band the paddle, and the letters of "Hack Infra Futuro" the bricks.
 *
 * It takes over from the real logo without a cut: on the first frame everything is drawn exactly where
 * the hero has it, then the letters fly into a wall of three rows, the band slims down into a paddle at
 * the bottom, and the star, cut out of the flag's black square, comes out of it as a star and flips down
 * onto the paddle while the square fades away. Leaving runs the same thing backwards, rebuilding any
 * letters that were broken, and hands back to the page.
 *
 * To keep it lively: as the wall thins, its rows start to sway; purple "?" blocks drift through the open
 * space and, hit, drop a power-up to catch with the paddle (a wider paddle, three stars, slow motion or a
 * life).
 *
 * Everything is drawn on one full-screen canvas; positions are CSS pixels. Star and band geometry come
 * from hif-dither in the mark's 70 × 70 units, scaled by `k` (pixels per unit).
 */

export type BreakoutLabels = {
  powers: Record<PowerKind, string>
  exit: string
  close: string
  launch: string
  win: string
  over: string
  again: string
  lives: string
  playAgain: string
  best: string
  board: string
  name: string
  nameHint: string
  badName: string
  kept: (best: string) => string
  save: string
  saving: string
  rank: (n: number) => string
  offline: string
}

/** A win, and where its time is on the way to the leaderboard. */
type Result = {
  ms: number
  state: 'checking' | 'name' | 'saving' | 'saved' | 'offline' | 'local'
  runId?: RunId
  id?: string
  rank?: number
  /** after saving: the person's best on the board, and whether this run beat it */
  best?: number
  improved?: boolean
  /** the username it was saved under, to find the player's row on the board */
  handle?: string
}

const NAME_KEY = 'hif-breakout-name'

type Phase = 'enter' | 'ready' | 'play' | 'won' | 'over' | 'exit'

const INK = '#181818'
const LIVES = 3

const FEET = STAR_FEET

// band geometry, relative to the band's centre (BAND_CX, 60): the paddle keeps the bottom rows of the
// middle 70 units; the rows above them and the ends beyond fade away on the way into the game
const PADDLE_CUT = 3
const PAD_TOP = Math.min(...DITHER.board.filter((d) => d.by >= PADDLE_CUT).map((d) => d.by)) - DITHER_R
const PAD_BOT = Math.max(...DITHER.board.map((d) => d.by)) + DITHER_R
const PAD_HALF = 35

const GAP = 0.07 // space between bricks, in em

// power-ups: the paddle widens to the band's full width, the star splits in three, everything slows
const WIDE_HALF = 52
const WIDE_S = 10
const SLOW_S = 8
const SLOW = 0.62
const MAX_LIVES = 5
type PowerKind = 'wide' | 'multi' | 'slow' | 'life'
const POWER_GLYPH: Record<PowerKind, string> = { wide: 'W', multi: '3', slow: 'S', life: '+' }
const pickPower = (): PowerKind => {
  const r = Math.random()
  return r < 0.32 ? 'wide' : r < 0.62 ? 'multi' : r < 0.86 ? 'slow' : 'life'
}

type Glyph = { ch: string; adv: number; l: number; r: number; a: number; d: number } // metrics at 1px
type Spot = { x: number; base: number; size: number; alpha: number }
type Letter = { g: Glyph; row: number; home: Spot; game: Spot; cur: Spot; hits: number; alive: boolean; shake: number }
type Ball = { x: number; y: number; k: number; rot: number; alpha: number; vx: number; vy: number; spin: number }
type Band = { x: number; y: number; k: number; fade: number }
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; brand: boolean }
/** a purple "?" block drifting through the open space; hit, it pops and drops a power-up */
type Block = { x: number; y: number; vx: number; vy: number; s: number; alive: boolean; back: number; bob: number; pop: number }
type Capsule = { x: number; y: number; vy: number; kind: PowerKind; t: number }
type Toast = { x: number; y: number; text: string; life: number }
type Item = { obj: Record<string, number>; from: Record<string, number>; to: Record<string, number>; delay: number; dur: number }
type Tween = { t: number; items: Item[]; done?: () => void }

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export function HifBreakout({
  word,
  mark,
  labels,
  onExitStart,
  onDone,
}: {
  /** the wordmark's text element in the hero; its letters become the bricks */
  word: HTMLElement
  /** the logo's SVG in the hero */
  mark: Element
  labels: BreakoutLabels
  /** leaving has started: the page can begin fading its own content back in */
  onExitStart: () => void
  /** everything is back where the hero has it */
  onDone: () => void
}) {
  const reduce = useReducedMotion()
  const canvas = useRef<HTMLCanvasElement>(null)
  const [phase, setPhase] = useState<Phase>('enter')
  const [lives, setLives] = useState(LIVES)
  const api = useRef<{ press: () => void; restart: () => void; exit: () => void }>({ press: () => {}, restart: () => {}, exit: () => {} })
  const labelsRef = useRef(labels)
  useEffect(() => {
    labelsRef.current = labels
  })
  const cb = useRef({ onExitStart, onDone })
  useEffect(() => {
    cb.current = { onExitStart, onDone }
  })

  // ---- the leaderboard: a run is opened on the first launch and closed on the win, both on the server --
  const timerEl = useRef<HTMLParagraphElement>(null)
  const nameEl = useRef<HTMLInputElement>(null)
  const [board, setBoard] = useState<Score[] | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [nameError, setNameError] = useState(false)
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem(NAME_KEY) ?? ''
    } catch {
      return ''
    }
  })
  const runRef = useRef<Promise<RunId | null> | null>(null)
  const gen = useRef(0)
  const events = useRef({ start: () => {}, win: (_ms: number) => {}, reset: () => {} })
  useEffect(() => {
    events.current = {
      start: () => {
        runRef.current = startRun()
      },
      win: (ms) => {
        const run = runRef.current
        runRef.current = null
        const g = ++gen.current
        setResult({ ms, state: boardEnabled() && run ? 'checking' : 'local' })
        if (!run) return
        run
          .then(async (runId) => {
            if (!runId) throw new Error('no run')
            const serverMs = await completeRun(runId)
            if (g === gen.current) setResult({ ms: serverMs, state: 'name', runId })
          })
          .catch(() => g === gen.current && setResult((r) => r && { ...r, state: 'offline' }))
      },
      reset: () => {
        runRef.current = null
        gen.current++
        setResult(null)
      },
    }
  })
  useEffect(() => {
    let live = true
    void topScores().then((b) => live && setBoard(b))
    return () => {
      live = false
    }
  }, [])
  useEffect(() => {
    if (result?.state === 'name') nameEl.current?.focus()
  }, [result?.state])
  // the clock shows the server's time once it has it, so it matches the leaderboard
  useEffect(() => {
    if (result && timerEl.current) timerEl.current.textContent = formatMs(result.ms)
  }, [result])

  const save = (e: FormEvent) => {
    e.preventDefault()
    if (!result?.runId || result.state !== 'name') return
    // the board is keyed on GitHub usernames: check it here so a typo doesn't cost the run
    const handle = githubHandle(name)
    setNameError(!handle)
    if (!handle) return
    const g = gen.current
    setResult({ ...result, state: 'saving' })
    try {
      localStorage.setItem(NAME_KEY, handle)
    } catch {
      // private mode: the name just isn't remembered
    }
    claimRun(result.runId, handle)
      .then(async ({ id, rank, ms, best, improved }) => {
        if (g !== gen.current) return
        setResult((r) => r && { ...r, ms, id, rank, best, improved, handle, state: 'saved' })
        setBoard(await topScores())
      })
      .catch(() => g === gen.current && setResult((r) => r && { ...r, state: 'offline' }))
  }


  useEffect(() => {
    const cv = canvas.current!
    const ctx = cv.getContext('2d')!
    const time = reduce ? 0.001 : 1
    const sprite = starSprite(INK)
    const brand = getComputedStyle(document.documentElement).getPropertyValue('--color-brand').trim() || '#7c3aec'
    const css = getComputedStyle(word)
    const family = css.fontFamily
    const weight = css.fontWeight
    const font = (size: number) => `${weight} ${size}px ${family}`

    let W = 0
    let H = 0
    // drawn at up to 2 device pixels per CSS pixel; a device that can't keep up drops to 1 (see tick)
    let maxDpr = 2
    let dpr = 1
    const resizeCanvas = () => {
      dpr = Math.min(maxDpr, window.devicePixelRatio || 1)
      W = window.innerWidth
      H = window.innerHeight
      cv.width = Math.round(W * dpr)
      cv.height = Math.round(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resizeCanvas()

    // ---- the letters, measured where the hero has them -----------------------------------------------
    ctx.font = font(100)
    const glyphOf = (ch: string): Glyph => {
      const m = ctx.measureText(ch)
      return { ch, adv: m.width / 100, l: m.actualBoundingBoxLeft / 100, r: m.actualBoundingBoxRight / 100, a: m.actualBoundingBoxAscent / 100, d: m.actualBoundingBoxDescent / 100 }
    }
    const fontAscent = ctx.measureText('H').fontBoundingBoxAscent / 100

    /** each non-space character of the wordmark, with where it sits on screen right now */
    const measureHome = () => {
      const out: { ch: string; spot: Spot; word: number }[] = []
      const size = parseFloat(getComputedStyle(word).fontSize)
      const walker = document.createTreeWalker(word, NodeFilter.SHOW_TEXT)
      const range = document.createRange()
      let w = -1
      let inWord = false
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const text = n.textContent ?? ''
        inWord = false
        for (let i = 0; i < text.length; i++) {
          if (/\s/.test(text[i])) {
            inWord = false
            continue
          }
          if (!inWord) w++
          inWord = true
          range.setStart(n, i)
          range.setEnd(n, i + 1)
          const r = range.getBoundingClientRect()
          out.push({ ch: text[i], word: w, spot: { x: r.left, base: r.top + fontAscent * size, size, alpha: 1 } })
        }
      }
      return out
    }
    // the star at home is the one cut out of the flag's square
    const homeBall = (): Pick<Ball, 'x' | 'y' | 'k'> => {
      const r = mark.getBoundingClientRect()
      const k = r.height / 70
      return { x: r.left + FLAG_STAR.x * k, y: r.top + FLAG_STAR.y * k, k: (k * FLAG_STAR.r) / STAR_R }
    }
    const homeFlag = () => {
      const r = mark.getBoundingClientRect()
      return { left: r.left, top: r.top, k: r.height / 70 }
    }
    const homeBand = (): Band => {
      const r = mark.getBoundingClientRect()
      const k = r.height / 70
      return { x: r.left + BAND_CX * k, y: r.top + 60 * k, k, fade: 1 }
    }

    const home = measureHome()
    const letters: Letter[] = home.map((h) => ({ g: glyphOf(h.ch), row: h.word, home: h.spot, game: { ...h.spot }, cur: { ...h.spot }, hits: 0, alive: true, shake: 0 }))

    // ---- the game's layout: a wall of three rows up top, the paddle along the bottom ----------------------
    const paddle = { k: 1, y: 0 }
    let ballK = 1
    let baseSpeed = 0
    const layout = () => {
      const rows = new Map<number, Letter[]>()
      for (const L of letters) rows.set(L.row, [...(rows.get(L.row) ?? []), L])
      const widths = [...rows.values()].map((r) => r.reduce((s, L) => s + L.g.adv, 0) + GAP * (r.length - 1))
      const maxA = Math.max(...letters.map((L) => L.g.a))
      const size = Math.min((0.7 * W) / Math.max(...widths), 0.135 * H, 160)
      const top = Math.max(84, 0.12 * H)
      let i = 0
      for (const row of rows.values()) {
        let x = (W - widths[i] * size) / 2
        const base = top + maxA * size + i * size * 1.14
        for (const L of row) {
          L.game = { x, base, size, alpha: 1 }
          x += (L.g.adv + GAP) * size
        }
        i++
      }
      const wp = clamp(0.105 * W, 110, 185)
      paddle.k = wp / 70
      paddle.y = H - Math.max(40, 0.06 * H) - PAD_BOT * paddle.k
      ballK = clamp(0.034 * W, 38, 58) / (2 * STAR_R)
      baseSpeed = clamp(0.78 * H, 500, 820)
    }
    layout()

    // ---- state ------------------------------------------------------------------------------------------
    const hb = homeBall()
    const ball: Ball = { ...hb, rot: 0, alpha: 1, vx: 0, vy: 0, spin: 0 }
    const band: Band = homeBand()
    // the flag's top half stays where the hero has it and fades out (and back in on the way out)
    let flagAt = homeFlag()
    const flag = { alpha: 1 }

    // pre-drawn: the band's two tiles (the paddle's rows, and the ones above that fade) and the flag's top
    // half, at the larger of the hero's and the paddle's scale so neither end is blurry
    let lowerTile: BandTile
    let upperTile: BandTile
    let flagImage: ReturnType<typeof flagTopImage>
    const homeK = flagAt.k
    const buildCaches = () => {
      const scale = Math.max(homeK, paddle.k) * dpr
      lowerTile = bandTile(scale, brand, (row) => row.dy >= PADDLE_CUT)
      upperTile = bandTile(scale, brand, (row) => row.dy < PADDLE_CUT)
      flagImage = flagTopImage(homeK * dpr, INK)
    }
    buildCaches()
    let padTarget = W / 2
    let dip = 0
    let dipV = 0
    let speed = baseSpeed
    let livesLeft = LIVES
    let current: Phase = 'enter'
    let tween: Tween | null = null
    let wait: { t: number; then: () => void } | null = null
    const particles: Particle[] = []
    const keys = new Set<string>()

    // the fun bits: more stars (from ×3), drifting "?" blocks, falling power-ups and their effects, and the
    // rows' sway once the wall thins out
    const extras: Ball[] = []
    const blocks: Block[] = []
    const capsules: Capsule[] = []
    const toasts: Toast[] = []
    const rowShift = [0, 0, 0]
    const rowAmp = [0, 0, 0]
    let swayT = 0
    let padHalf = PAD_HALF
    let wideT = 0
    let slowT = 0
    const speedMul = () => (slowT > 0 ? SLOW : 1)
    const balls = () => [ball, ...extras]
    const scaleBalls = (f: number) => {
      for (const b of balls()) {
        b.vx *= f
        b.vy *= f
      }
    }

    const go = (p: Phase) => {
      current = p
      setPhase(p)
    }
    const readyBall = (bx = band.x) => ({ x: bx, y: paddle.y + PAD_TOP * paddle.k - FEET * ballK - 1, k: ballK })
    const run = (items: Item[], done?: () => void) => {
      tween = { t: 0, items, done }
      step(0)
    }
    const step = (dt: number) => {
      if (!tween) return
      tween.t += dt
      let finished = true
      for (const it of tween.items) {
        const e = ease(clamp((tween.t - it.delay * time) / (it.dur * time), 0, 1))
        if (tween.t < (it.delay + it.dur) * time) finished = false
        for (const key in it.to) it.obj[key] = it.from[key] + (it.to[key] - it.from[key]) * e
      }
      if (finished) {
        const done = tween.done
        tween = null
        done?.()
      }
    }

    // ---- the "?" blocks: they drift between the wall and the paddle ---------------------------------------
    const blockZone = () => {
      const bottom = Math.max(...letters.map((L) => L.game.base + L.g.d * L.game.size))
      return { top: bottom + 0.05 * H, bottom: paddle.y - Math.max(110, 0.2 * H) }
    }
    const placeBlock = (b: Block) => {
      const z = blockZone()
      b.s = clamp(0.04 * Math.min(W, 1.4 * H), 26, 44)
      b.x = b.s + Math.random() * (W - 2 * b.s)
      b.y = z.top + b.s / 2 + Math.random() * Math.max(0, z.bottom - z.top - b.s)
      b.vx = (Math.random() < 0.5 ? -1 : 1) * (70 + Math.random() * 70)
      b.vy = (Math.random() - 0.5) * 40
      b.alive = true
      b.pop = 1
    }
    const spawnBlocks = () => {
      const z = blockZone()
      if (z.bottom - z.top < 60) return
      for (let i = blocks.length; i < (W < 640 ? 1 : 2); i++) {
        const b: Block = { x: 0, y: 0, vx: 0, vy: 0, s: 0, alive: true, back: 0, bob: Math.random() * 6, pop: 0 }
        placeBlock(b)
        blocks.push(b)
      }
    }
    const burst = (x: number, y: number, n: number, spread: number, brandShare: number) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2
        const v = spread * (0.4 + Math.random() * 0.6)
        particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, life: 0, max: 0.45 + Math.random() * 0.35, r: 2 + Math.random() * 1.5, brand: Math.random() < brandShare })
      }
    }
    /** everything the fun bits leave behind, cleared (a restart, leaving, or the wall coming down) */
    const clearExtras = () => {
      for (const b of extras) burst(b.x, b.y, 10, 220, 0.3)
      extras.length = 0
      capsules.length = 0
      if (slowT > 0) scaleBalls(1 / SLOW)
      wideT = slowT = 0
    }
    const power = (c: Capsule) => {
      // stacked above any that are still fresh nearby, so two catches don't print over each other
      const near = toasts.filter((t) => Math.abs(t.x - c.x) < 120 && t.life < 0.6).length
      toasts.push({ x: c.x, y: c.y - 20 - near * 22, text: labelsRef.current.powers[c.kind], life: 0 })
      if (c.kind === 'wide') wideT = WIDE_S
      else if (c.kind === 'slow') {
        if (slowT <= 0) scaleBalls(SLOW)
        slowT = SLOW_S
      } else if (c.kind === 'life') {
        if (livesLeft < MAX_LIVES) setLives(++livesLeft)
      } else {
        // two more stars, fanned out from one that's flying
        const from = balls().find((b) => b.vx || b.vy) ?? ball
        for (const turn of [-24, 24]) {
          if (extras.length >= 6) break
          const a = (turn * Math.PI) / 180
          extras.push({ ...from, alpha: 1, vx: from.vx * Math.cos(a) - from.vy * Math.sin(a), vy: from.vx * Math.sin(a) + from.vy * Math.cos(a) })
        }
      }
    }

    // ---- in: everything moves from the hero into the game ------------------------------------------------
    const enter = () => {
      run(
        [
          ...letters.map((L, i) => ({ obj: L.cur, from: { ...L.home }, to: { ...L.game }, delay: 0.03 * i, dur: 0.8 })),
          { obj: band, from: { ...band }, to: { x: W / 2, y: paddle.y, k: paddle.k, fade: 0 }, delay: 0.1, dur: 0.85 },
          { obj: ball, from: { x: ball.x, y: ball.y, k: ball.k, rot: 0 }, to: { ...readyBall(W / 2), rot: -360 }, delay: 0.12, dur: 0.95 },
          { obj: flag, from: { alpha: 1 }, to: { alpha: 0 }, delay: 0.2, dur: 0.6 },
        ],
        () => {
          ball.rot = 0
          padTarget = band.x
          go('ready')
        },
      )
    }

    // ---- out: back to the hero, broken letters rebuilt ---------------------------------------------------
    const exit = () => {
      if (current === 'exit') return
      go('exit')
      wait = null
      cb.current.onExitStart()
      const h = measureHome()
      const hbNow = homeBall()
      flagAt = homeFlag()
      const n = letters.length
      clearExtras()
      blocks.length = 0
      for (const L of letters) L.cur.x += rowShift[L.row]
      rowShift.fill(0)
      rowAmp.fill(0)
      for (const L of letters) {
        if (!L.alive) L.cur = { ...L.game, size: L.game.size * 0.6, alpha: 0 }
        L.alive = true
        L.hits = 0
      }
      ball.rot = ((ball.rot % 360) + 540) % 360 - 180
      run(
        [
          ...letters.map((L, i) => ({ obj: L.cur, from: { ...L.cur }, to: { ...h[i].spot }, delay: 0.025 * (n - 1 - i), dur: 0.7 })),
          { obj: band, from: { ...band }, to: { ...homeBand() }, delay: 0, dur: 0.75 },
          { obj: ball, from: { x: ball.x, y: ball.y, k: ball.k, rot: ball.rot, alpha: ball.alpha }, to: { ...hbNow, rot: 0, alpha: 1 }, delay: 0.05, dur: 0.75 },
          // the square comes back as the star reaches it, so it lands as the cut-out
          { obj: flag, from: { alpha: flag.alpha }, to: { alpha: 1 }, delay: 0.25, dur: 0.55 },
        ],
        () => cb.current.onDone(),
      )
    }

    const popBall = () => {
      ball.vx = ball.vy = ball.spin = 0
      ball.rot = 0
      const r = readyBall()
      Object.assign(ball, r, { alpha: 0, k: ballK * 0.4 })
      run([{ obj: ball, from: { alpha: 0, k: ballK * 0.4 }, to: { alpha: 1, k: ballK }, delay: 0, dur: 0.35 }])
    }

    // the game clock: from the first launch to the last letter, lives lost included
    let clockStart = 0
    let clockMs = 0
    let timing = false
    const writeClock = (ms: number) => {
      if (timerEl.current) timerEl.current.textContent = formatMs(ms)
    }

    const restart = () => {
      timing = false
      clockMs = 0
      writeClock(0)
      events.current.reset()
      livesLeft = LIVES
      setLives(LIVES)
      speed = baseSpeed
      clearExtras()
      blocks.length = 0
      rowShift.fill(0)
      rowAmp.fill(0)
      for (const L of letters) {
        L.alive = true
        L.hits = 0
      }
      go('ready')
      run([
        ...letters.map((L, i) => ({ obj: L.cur, from: { ...L.game, size: L.game.size * 0.4, alpha: 0 }, to: { ...L.game }, delay: 0.025 * i, dur: 0.45 })),
        { obj: ball, from: { x: ball.x, y: ball.y, k: ball.k, rot: ball.rot }, to: { ...readyBall(), rot: 0 }, delay: 0, dur: 0.45 },
      ])
    }

    const launch = () => {
      if (!timing) {
        timing = true
        clockStart = performance.now() - clockMs
        events.current.start()
      }
      const a = ((Math.random() < 0.5 ? -1 : 1) * (14 + Math.random() * 20) * Math.PI) / 180
      ball.vx = Math.sin(a) * speed
      ball.vy = -Math.cos(a) * speed
      ball.spin = ball.vx * 0.9
      dipV += 40
      spawnBlocks()
      go('play')
    }

    /** launch from the paddle; once the game has ended, only the keyboard (or the button) starts another */
    const press = (fromKey: boolean) => {
      if (tween || wait) return
      if (current === 'ready') launch()
      else if (fromKey && (current === 'won' || current === 'over')) restart()
    }
    api.current.press = () => press(false)
    api.current.restart = () => press(true)
    api.current.exit = () => exit()

    // ---- bricks breaking into their own dots ------------------------------------------------------------
    const explode = (L: Letter, by: Ball) => {
      const s = L.game.size
      const w = Math.ceil((L.g.l + L.g.r) * s) + 4
      const h = Math.ceil((L.g.a + L.g.d) * s) + 4
      const off = document.createElement('canvas')
      off.width = w
      off.height = h
      const g = off.getContext('2d')!
      g.font = font(s)
      g.fillStyle = '#000'
      g.fillText(L.g.ch, L.g.l * s + 2, L.g.a * s + 2)
      const data = g.getImageData(0, 0, w, h).data
      const stepPx = Math.max(3, s / 15)
      const ox = L.game.x + rowShift[L.row] - L.g.l * s - 2
      const oy = L.game.base - L.g.a * s - 2
      const cx = ox + w / 2
      const cy = oy + h / 2
      for (let y = stepPx / 2; y < h; y += stepPx) {
        for (let x = stepPx / 2; x < w; x += stepPx) {
          if (data[(Math.floor(y) * w + Math.floor(x)) * 4 + 3] < 120) continue
          if (particles.length > 1400) particles.shift()
          const px = ox + x
          const py = oy + y
          particles.push({
            x: px,
            y: py,
            vx: ((px - cx) / w) * 260 + by.vx * 0.2 + (Math.random() - 0.5) * 80,
            vy: ((py - cy) / h) * 200 + by.vy * 0.15 - 140 + (Math.random() - 0.5) * 80,
            life: 0,
            max: 0.55 + Math.random() * 0.4,
            r: stepPx * 0.42,
            brand: Math.random() < 0.75,
          })
        }
      }
    }

    const hit = (L: Letter, by: Ball) => {
      L.hits++
      L.shake = 1
      if (L.hits < 2) return
      L.alive = false
      explode(L, by)
      speed = Math.min(baseSpeed * 1.6, speed * 1.03)
      const sp = Math.hypot(by.vx, by.vy) || 1
      by.vx *= (speed * speedMul()) / sp
      by.vy *= (speed * speedMul()) / sp
      if (letters.every((l) => !l.alive)) {
        clearExtras()
        for (const b of blocks) if (b.alive) burst(b.x, b.y, 16, 200, 0.9)
        blocks.length = 0
        timing = false
        clockMs = performance.now() - clockStart
        writeClock(clockMs)
        events.current.win(clockMs)
        go('won')
        run([{ obj: ball, from: { x: ball.x, y: ball.y, rot: ball.rot }, to: { ...readyBall(), rot: Math.round(ball.rot / 360) * 360 - 360 }, delay: 0, dur: 0.9 }])
      }
    }

    const lose = () => {
      clearExtras()
      ball.alpha = 0
      ball.vx = ball.vy = 0
      livesLeft--
      setLives(livesLeft)
      for (let i = 0; i < 14; i++) {
        particles.push({ x: clamp(ball.x, 0, W) + (Math.random() - 0.5) * 30, y: H - 2, vx: (Math.random() - 0.5) * 240, vy: -160 - Math.random() * 220, life: 0, max: 0.5 + Math.random() * 0.3, r: 2, brand: false })
      }
      if (livesLeft === 0) {
        timing = false
        events.current.reset()
      }
      go(livesLeft > 0 ? 'ready' : 'over')
      wait = { t: 0.5, then: popBall }
    }

    // ---- physics ----------------------------------------------------------------------------------------
    /** One star's step: walls, paddle, "?" blocks and letters. 'lost' once it falls off the bottom. */
    const stepBall = (b: Ball, dt: number): 'lost' | void => {
      const r = STAR_R * b.k * 0.78
      const sp = Math.hypot(b.vx, b.vy)
      const n = Math.max(1, Math.ceil((sp * dt) / (r * 0.4)))
      const h = dt / n
      // bounce off a box: reflect off its nearest point
      const bounce = (x0: number, y0: number, x1: number, y1: number) => {
        const qx = clamp(b.x, x0, x1)
        const qy = clamp(b.y, y0, y1)
        let nx = b.x - qx
        let ny = b.y - qy
        const d = Math.hypot(nx, ny)
        if (d >= r) return false
        if (d < 1e-6) {
          nx = -b.vx
          ny = -b.vy
        }
        const len = Math.hypot(nx, ny) || 1
        nx /= len
        ny /= len
        const dot = b.vx * nx + b.vy * ny
        if (dot < 0) {
          b.vx -= 2 * dot * nx
          b.vy -= 2 * dot * ny
        }
        b.x = qx + nx * r
        b.y = qy + ny * r
        return true
      }
      for (let s = 0; s < n; s++) {
        b.x += b.vx * h
        b.y += b.vy * h
        if (b.x < r) {
          b.x = r
          b.vx = Math.abs(b.vx)
        } else if (b.x > W - r) {
          b.x = W - r
          b.vx = -Math.abs(b.vx)
        }
        if (b.y < r) {
          b.y = r
          b.vy = Math.abs(b.vy)
        }
        // paddle: where it lands on the paddle sets the angle it leaves at
        const top = band.y + PAD_TOP * band.k
        const half = padHalf * band.k
        if (b.vy > 0 && b.y + r >= top && b.y - r < top + (PAD_BOT - PAD_TOP) * band.k && Math.abs(b.x - band.x) <= half + r * 0.5) {
          const off = clamp((b.x - band.x) / half, -1, 1)
          const a = (off * 62 * Math.PI) / 180
          b.vx = Math.sin(a) * speed * speedMul()
          b.vy = -Math.cos(a) * speed * speedMul()
          b.y = top - r
          b.spin += off * 500
          dipV += 70
        }
        // the "?" blocks: pop, and drop a power-up
        for (const k of blocks) {
          if (!k.alive) continue
          const half2 = k.s / 2
          if (!bounce(k.x - half2, k.y - half2, k.x + half2, k.y + half2)) continue
          k.alive = false
          k.back = 4 + Math.random() * 4
          burst(k.x, k.y, 18, 240, 0.85)
          capsules.push({ x: k.x, y: k.y, vy: -60, kind: pickPower(), t: 0 })
          break
        }
        // bricks: circle against each letter's ink box, where its row has swayed to
        for (const L of letters) {
          if (!L.alive) continue
          const s2 = L.game.size
          const x = L.game.x + rowShift[L.row]
          if (!bounce(x - L.g.l * s2, L.game.base - L.g.a * s2, x + L.g.r * s2, L.game.base + L.g.d * s2)) continue
          hit(L, b)
          break
        }
        if (current !== 'play') return
        if (b.y - r > H) return 'lost'
      }
    }

    const physics = (dt: number) => {
      for (let i = extras.length - 1; i >= 0; i--) {
        if (stepBall(extras[i], dt) === 'lost') extras.splice(i, 1)
        if (current !== 'play') return
      }
      if (stepBall(ball, dt) === 'lost') {
        // another star takes over; the life is only lost with the last one
        const next = extras.pop()
        if (next) Object.assign(ball, next)
        else lose()
      }
    }

    /** the moving parts between frames: sway, blocks, power-ups and their timers */
    const fun = (dt: number) => {
      // the rows start to sway as the wall thins: the middle one past a third, the last past two thirds
      const dead = letters.filter((L) => !L.alive).length / letters.length
      swayT += dt
      for (let row = 1; row < 3; row++) {
        const inRow = letters.filter((L) => L.row === row)
        if (!inRow.length) continue
        const x0 = Math.min(...inRow.map((L) => L.game.x - L.g.l * L.game.size))
        const x1 = Math.max(...inRow.map((L) => L.game.x + L.g.r * L.game.size))
        const room = Math.max(0, Math.min((W - (x1 - x0)) / 2 - 12, 0.12 * W))
        const on = row === 1 ? dead > 1 / 3 : dead > 2 / 3
        rowAmp[row] += ((on ? room : 0) - rowAmp[row]) * Math.min(1, dt * 0.8)
        rowShift[row] = rowAmp[row] * Math.sin(swayT * (row === 1 ? 1.1 : 0.85) + (row === 1 ? 0 : Math.PI))
      }
      // blocks drift and bounce inside their zone; a popped one comes back after a while
      const z = blockZone()
      for (const k of blocks) {
        k.bob += dt
        k.pop = Math.max(0, k.pop - dt * 3)
        if (!k.alive) {
          k.back -= dt
          if (k.back <= 0) placeBlock(k)
          continue
        }
        k.x += k.vx * dt
        k.y += k.vy * dt
        if (k.x < k.s / 2 || k.x > W - k.s / 2) k.vx = -k.vx
        if (k.y < z.top + k.s / 2 || k.y > z.bottom - k.s / 2) k.vy = -k.vy
        k.x = clamp(k.x, k.s / 2, W - k.s / 2)
      }
      // power-ups fall; the paddle catches them
      const top = band.y + PAD_TOP * band.k
      for (let i = capsules.length - 1; i >= 0; i--) {
        const c = capsules[i]
        c.t += dt
        c.vy = Math.min(240, c.vy + 320 * dt)
        c.y += c.vy * dt
        const cr = capR()
        if (c.y + cr >= top && c.y - cr <= top + (PAD_BOT - PAD_TOP) * band.k && Math.abs(c.x - band.x) <= padHalf * band.k + cr) {
          capsules.splice(i, 1)
          dipV += 50
          power(c)
        } else if (c.y - cr > H) capsules.splice(i, 1)
      }
      if (wideT > 0) wideT = Math.max(0, wideT - dt)
      if (slowT > 0) {
        slowT -= dt
        if (slowT <= 0) {
          slowT = 0
          scaleBalls(1 / SLOW)
        }
      }
      for (const b of extras) {
        b.spin += (b.vx * 0.9 - b.spin) * Math.min(1, dt * 2)
        b.rot += b.spin * dt
      }
    }
    const capR = () => clamp(0.016 * Math.min(W, 1.4 * H), 11, 18)

    // ---- input ------------------------------------------------------------------------------------------
    const onMove = (e: PointerEvent) => {
      padTarget = e.clientX
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key
      // typing a name: only Escape is ours
      if (e.target instanceof HTMLInputElement) {
        if (k === 'Escape') {
          e.target.blur()
          exit()
        }
        return
      }
      if (k === 'Escape') {
        e.preventDefault()
        exit()
        return
      }
      if (k === ' ' || k === 'ArrowUp' || k === 'Enter') {
        e.preventDefault()
        if (!e.repeat) press(true)
        return
      }
      if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'a' || k === 'd' || k === 'A' || k === 'D') {
        e.preventDefault()
        keys.add(k.toLowerCase())
      }
      if (k === 'ArrowDown' || k === 'PageDown' || k === 'PageUp' || k === 'Home' || k === 'End') e.preventDefault()
    }
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase())
    const onWheel = (e: WheelEvent) => e.preventDefault()
    const onResize = () => {
      resizeCanvas()
      layout()
      buildCaches()
      if (!tween && current !== 'enter' && current !== 'exit') {
        for (const L of letters) if (L.alive) L.cur = { ...L.game }
        Object.assign(band, { y: paddle.y, k: paddle.k })
        ball.k = ballK
      }
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('resize', onResize)

    // ---- the loop ---------------------------------------------------------------------------------------
    const draw = (now: number) => {
      ctx.clearRect(0, 0, W, H)

      for (const L of letters) {
        const c = L.cur
        if (c.alpha <= 0.01 || !L.alive) continue
        ctx.globalAlpha = c.alpha
        ctx.fillStyle = L.hits > 0 ? brand : INK
        ctx.font = font(c.size)
        const j = L.shake > 0 ? Math.sin(now / 18) * L.shake * c.size * 0.04 : 0
        ctx.fillText(L.g.ch, c.x + rowShift[L.row] + j, c.base)
      }
      ctx.globalAlpha = 1

      // particles
      for (const brandDots of [true, false]) {
        ctx.fillStyle = brandDots ? brand : INK
        for (const p of particles) {
          if (p.brand !== brandDots) continue
          const k = 1 - p.life / p.max
          ctx.globalAlpha = k
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.r * (0.5 + 0.5 * k), 0, Math.PI * 2)
          ctx.fill()
        }
      }
      ctx.globalAlpha = 1

      // the band / paddle, copied from its tiles column by column: the paddle is the lower rows of the middle
      // columns; the rest fades away on the way in. The deck dips a little when the star lands on it.
      const COLS = Math.round(FLAG_W / DITHER_PITCH)
      const pFirst = Math.max(0, Math.ceil((BAND_CX - padHalf) / DITHER_PITCH - 0.5))
      const pLast = Math.min(COLS - 1, Math.floor((BAND_CX + padHalf) / DITHER_PITCH - 0.5))
      const dipAt =
        Math.abs(dip) < 0.3
          ? undefined
          : (col: number) => {
              const along = ((col + 0.5) * DITHER_PITCH) / FLAG_W
              const d = dip * (1 - (2 * along - 1) ** 2)
              return Math.abs(d) < 0.3 ? 0 : d
            }
      drawBandTile(ctx, lowerTile, band.x, band.y, band.k, 0, pFirst, pLast, dipAt)
      if (band.fade > 0.01) {
        ctx.globalAlpha = band.fade
        if (pFirst > 0) drawBandTile(ctx, lowerTile, band.x, band.y, band.k, 0, 0, pFirst - 1, dipAt)
        if (pLast < COLS - 1) drawBandTile(ctx, lowerTile, band.x, band.y, band.k, 0, pLast + 1, COLS - 1, dipAt)
        drawBandTile(ctx, upperTile, band.x, band.y, band.k, 0, 0, COLS - 1, dipAt)
        ctx.globalAlpha = 1
      }

      // the "?" blocks: a square of purple dots with a question mark, bobbing a little
      for (const k of blocks) {
        if (!k.alive) continue
        const grow = 1 - k.pop * 0.6
        const side = k.s * grow
        const bob = Math.sin(k.bob * 3) * 2
        const n = 5
        const pitch = side / n
        ctx.fillStyle = brand
        ctx.beginPath()
        for (let iy = 0; iy < n; iy++) {
          for (let ix = 0; ix < n; ix++) {
            const x = k.x - side / 2 + (ix + 0.5) * pitch
            const y = k.y - side / 2 + (iy + 0.5) * pitch + bob
            ctx.moveTo(x + pitch * 0.46, y)
            ctx.arc(x, y, pitch * 0.46, 0, Math.PI * 2)
          }
        }
        ctx.fill()
        ctx.fillStyle = '#f4f2ee'
        ctx.font = font(side * 0.7)
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('?', k.x, k.y + bob)
        ctx.textAlign = 'start'
        ctx.textBaseline = 'alphabetic'
      }

      // the power-ups, falling: a purple disc with a letter for what it does
      const cr = capR()
      for (const c of capsules) {
        const wob = Math.sin(c.t * 9) * 0.12
        ctx.save()
        ctx.translate(c.x, c.y)
        ctx.rotate(wob)
        ctx.fillStyle = brand
        ctx.beginPath()
        ctx.arc(0, 0, cr, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#f4f2ee'
        ctx.font = font(cr * 1.25)
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(POWER_GLYPH[c.kind], 0, cr * 0.06)
        ctx.restore()
      }
      ctx.textAlign = 'start'
      ctx.textBaseline = 'alphabetic'

      // the extra stars from ×3
      for (const b of extras) {
        ctx.save()
        ctx.translate(b.x, b.y)
        ctx.rotate((b.rot * Math.PI) / 180)
        const e = SPRITE_EXT * b.k
        ctx.drawImage(sprite, -e, -e, e * 2, e * 2)
        ctx.restore()
      }

      // what a power-up did, floating up where it was caught; and what is still running, bottom left
      ctx.font = `500 ${clamp(0.018 * W, 13, 18)}px ${getComputedStyle(document.documentElement).getPropertyValue('--font-mono') || 'monospace'}`
      ctx.textAlign = 'center'
      for (const t of toasts) {
        ctx.globalAlpha = Math.max(0, 1 - t.life / 1.1)
        ctx.fillStyle = brand
        ctx.fillText(t.text.toUpperCase(), t.x, t.y)
      }
      ctx.globalAlpha = 1
      ctx.textAlign = 'start'
      const running = [wideT > 0 && `${labelsRef.current.powers.wide} ${Math.ceil(wideT)}`, slowT > 0 && `${labelsRef.current.powers.slow} ${Math.ceil(slowT)}`].filter(Boolean)
      if (running.length && current === 'play') {
        ctx.fillStyle = '#5a5956'
        ctx.fillText(running.join(' · ').toUpperCase(), 16, H - 16)
      }

      // the flag's square and white field, with the star cut out wherever the star is
      const pose = { x: ball.x, y: ball.y, r: STAR_R * ball.k, rot: ball.rot }
      if (flag.alpha > 0.01) {
        ctx.globalAlpha = flag.alpha
        drawFlagTop(ctx, flagAt.left, flagAt.top, flagAt.k, pose, INK, undefined, flagImage)
        ctx.globalAlpha = 1
      }

      // the star: inside the square it's the cut-out, outside it, itself
      if (ball.alpha > 0.01) {
        const side = FLAG_SPLIT * flagAt.k
        drawStarFromFlag(ctx, sprite, SPRITE_EXT * ball.k, ball.alpha, flag.alpha, { x: flagAt.left, y: flagAt.top, w: side, h: side }, () => {
          ctx.translate(ball.x, ball.y)
          ctx.rotate((ball.rot * Math.PI) / 180)
        })
      }
    }

    let raf = 0
    let last = performance.now()
    // how long frames really take (smoothed); a device that stays slow gets the canvas at 1× from then on
    let frameMs = 16.7
    let slowFor = 0
    const tick = (now: number) => {
      const real = now - last
      const dt = Math.max(0, Math.min(0.033, real / 1000))
      last = now
      if (real > 0 && real < 200 && document.visibilityState === 'visible') {
        frameMs += (real - frameMs) * 0.05
        slowFor = frameMs > 24 ? slowFor + 1 : 0
        if (slowFor > 90 && maxDpr > 1) {
          maxDpr = 1
          resizeCanvas()
          buildCaches()
        }
      }
      step(dt)
      if (wait) {
        wait.t -= dt
        if (wait.t <= 0) {
          const then = wait.then
          wait = null
          then()
        }
      }

      // paddle follows the pointer (or the arrow keys) once the game is on
      if (current !== 'enter' && current !== 'exit') {
        const dir = (keys.has('arrowright') || keys.has('d') ? 1 : 0) - (keys.has('arrowleft') || keys.has('a') ? 1 : 0)
        // the keys move it at a set speed (about a screen width a second): the step is scaled up by the
        // easing below, so the paddle really covers it
        if (dir) padTarget = band.x + (dir * clamp(1.1 * W, 950, 1700) * dt) / Math.min(1, dt * 22)
        padHalf += ((wideT > 0 ? WIDE_HALF : PAD_HALF) - padHalf) * Math.min(1, dt * 10)
        const half = padHalf * band.k
        padTarget = clamp(padTarget, half + 8, W - half - 8)
        band.x += (padTarget - band.x) * Math.min(1, dt * 22)
        if ((current === 'ready' || current === 'won' || current === 'over') && !tween && ball.alpha > 0) {
          Object.assign(ball, readyBall())
          ball.rot += (0 - ball.rot) * Math.min(1, dt * 12)
        } else if ((current === 'ready' || current === 'won' || current === 'over') && tween) {
          ball.x = band.x
        }
      }
      // deck dip spring
      dipV += (-260 * dip - 18 * dipV) * dt
      dip += dipV * dt

      if (current === 'play') {
        physics(dt)
        fun(dt)
        // spin follows the ball's sideways speed, so it reads as rolling through the air
        ball.spin += (ball.vx * 0.9 - ball.spin) * Math.min(1, dt * 2)
        ball.rot += ball.spin * dt
      }
      for (const L of letters) L.shake = Math.max(0, L.shake - dt * 5)
      for (let i = toasts.length - 1; i >= 0; i--) {
        toasts[i].life += dt
        toasts[i].y -= 40 * dt
        if (toasts[i].life > 1.1) toasts.splice(i, 1)
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.life += dt
        if (p.life >= p.max) {
          particles.splice(i, 1)
          continue
        }
        p.vy += 1100 * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
      }
      if (timing) writeClock(now - clockStart)
      draw(now)
      raf = requestAnimationFrame(tick)
    }

    // dev only: lets the preview scripts read the ball (to steer the paddle in recordings)
    if (import.meta.env.DEV) (window as unknown as { __breakout?: unknown }).__breakout = { ball, band, letters, extras, blocks, capsules, timers: () => ({ wideT, slowT, padHalf, rowShift }) }
    draw(performance.now())
    enter()
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('resize', onResize)
    }
  }, [word, mark, reduce])

  const hud = phase !== 'enter' && phase !== 'exit'
  const playing = phase === 'ready' || phase === 'play'
  const ended = phase === 'won' || phase === 'over'
  const best = board?.[0]
  const showForm = phase === 'won' && (result?.state === 'name' || result?.state === 'saving')
  return (
    <div
      className={`fixed inset-0 z-[60] touch-none select-none ${playing ? 'cursor-none' : ''}`}
      onPointerDown={() => api.current.press()}
    >
      <canvas ref={canvas} aria-hidden className="absolute inset-0 size-full" />
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 grid grid-cols-[1fr_auto_1fr] items-start gap-4 px-4 pt-6 font-mono text-base leading-7 tracking-wide text-[#5a5956] uppercase transition-opacity duration-300 md:px-6 md:pt-10 md:text-lg md:leading-8 ${
          hud ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* the way out: Esc on a keyboard, or a tap here */}
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => api.current.exit()}
          className="pointer-events-auto text-left uppercase transition-colors hover:text-[#181818]"
        >
          Breakout <span className="text-[#9a9894]">· </span>
          <span className="hidden text-[#9a9894] pointer-fine:inline">{labels.exit}</span>
          <span className="text-[#9a9894] pointer-fine:hidden">{labels.close}</span>
        </button>
        <div className="text-center">
          <p ref={timerEl} className="text-[#181818] tabular-nums">
            0:00.0
          </p>
          {best && (
            <p className="text-sm leading-5 text-[#9a9894] normal-case">
              {labels.best} {formatMs(best.ms)} · {best.name}
            </p>
          )}
        </div>
        <p className="flex items-center justify-end gap-2" aria-label={`${labels.lives}: ${lives}`}>
          {Array.from({ length: Math.max(LIVES, lives) }, (_, i) => (
            <svg key={i} viewBox="-1 -1 2 2" className={`size-4 transition-opacity duration-300 ${i < lives ? 'opacity-100' : 'opacity-20'}`}>
              <polygon
                fill={INK}
                points={Array.from({ length: 10 }, (_, j) => {
                  const a = (-90 + j * 36) * (Math.PI / 180)
                  const r = j % 2 ? 0.382 : 1
                  return `${(Math.cos(a) * r).toFixed(3)},${(Math.sin(a) * r).toFixed(3)}`
                }).join(' ')}
              />
            </svg>
          ))}
        </p>
      </div>
      <p
        className={`pointer-events-none absolute inset-x-0 bottom-3 text-center font-mono text-sm leading-5 tracking-wide text-[#5a5956] uppercase transition-opacity duration-300 ${
          phase === 'ready' ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {labels.launch}
      </p>

      {/* the end of a game: the time, a name for the leaderboard, and the leaderboard */}
      <div
        role="status"
        className={`pointer-events-none absolute inset-0 flex items-center justify-center px-4 transition-opacity duration-300 ${ended ? 'opacity-100' : 'opacity-0'}`}
      >
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className={`${ended ? 'pointer-events-auto' : ''} flex max-h-[calc(100svh-96px)] w-full max-w-[440px] flex-col items-center gap-5 overflow-y-auto border border-[#d6d4d0] bg-[#f4f2ee] px-5 py-7 text-center md:px-8`}
        >
          <div className="flex flex-col items-center gap-2">
            <p className={`font-pixel text-[clamp(36px,5vw,60px)] leading-none ${phase === 'won' ? 'text-brand' : 'text-[#181818]'}`}>
              {phase === 'won' ? labels.win : labels.over}
            </p>
            {phase === 'won' && result && <p className="font-pixel text-[32px] leading-none text-[#181818] tabular-nums">{formatMs(result.ms)}</p>}
          </div>

          {showForm && (
            <form onSubmit={save} className="flex w-full gap-2">
              <input
                ref={nameEl}
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setNameError(false)
                }}
                maxLength={40}
                required
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={nameError}
                aria-describedby="board-name-hint"
                placeholder={labels.name}
                aria-label={labels.name}
                disabled={result?.state === 'saving'}
                className="min-w-0 flex-1 border border-[#181818]/30 bg-white px-3 py-2 font-mono text-base text-[#181818] outline-none select-text placeholder:text-[#9a9894] focus:border-brand"
              />
              <button
                type="submit"
                disabled={result?.state === 'saving' || !name.trim()}
                className="shrink-0 bg-brand px-4 py-2 font-mono text-base text-[#f4f2ee] transition-opacity disabled:opacity-50"
              >
                {result?.state === 'saving' ? labels.saving : labels.save}
              </button>
            </form>
          )}
          {showForm && (
            <p id="board-name-hint" className={`-mt-3 w-full text-left font-mono text-sm leading-5 ${nameError ? 'text-[#b42318]' : 'text-[#5a5956]'}`}>
              {nameError ? labels.badName : labels.nameHint}
            </p>
          )}
          {phase === 'won' && result?.state === 'saved' && result.rank && (
            <p className="font-mono text-base tracking-wide text-brand uppercase">
              {result.improved === false && result.best !== undefined ? `${labels.kept(formatMs(result.best))} · ${labels.rank(result.rank)}` : labels.rank(result.rank)}
            </p>
          )}
          {phase === 'won' && result?.state === 'offline' && <p className="font-mono text-sm text-[#5a5956]">{labels.offline}</p>}

          {board && board.length > 0 && (
            <div className="w-full text-left">
              <p className="mb-2 font-mono text-sm tracking-wide text-[#5a5956] uppercase">{labels.board}</p>
              <ol className="font-mono text-base leading-7">
                {board.map((s, i) => (
                  <li
                    key={s._id}
                    className={`grid grid-cols-[2ch_1fr_auto] gap-3 border-t border-[#d6d4d0] ${result?.handle && s.name.toLowerCase() === result.handle.toLowerCase() ? 'text-brand' : 'text-[#181818]'}`}
                  >
                    <span className="text-right text-[#9a9894]">{i + 1}</span>
                    <span className="truncate">{s.name}</span>
                    <span className="tabular-nums">{formatMs(s.ms)}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => api.current.restart()}
              className="border border-[#181818] px-4 py-2 font-mono text-base text-[#181818] transition-colors hover:bg-[#181818] hover:text-[#f4f2ee]"
            >
              {labels.playAgain}
            </button>
            <p className="font-mono text-xs leading-5 tracking-wide text-[#9a9894] uppercase">
              {labels.again} · {labels.exit}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
