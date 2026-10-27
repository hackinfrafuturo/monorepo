import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useReducedMotion } from 'motion/react'
import { DITHER, DITHER_R, FLAG_SPLIT, FLAG_STAR, SPRITE_EXT, STAR_FEET, STAR_R, drawFlagTop, drawStarFromFlag, starSprite } from './hif-dither'
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
 * Everything is drawn on one full-screen canvas; positions are CSS pixels. Star and band geometry come
 * from hif-dither in the mark's 70 × 70 units, scaled by `k` (pixels per unit).
 */

export type BreakoutLabels = {
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
}

const NAME_KEY = 'hif-breakout-name'

type Phase = 'enter' | 'ready' | 'play' | 'won' | 'over' | 'exit'

const INK = '#181818'
const LIVES = 3

const FEET = STAR_FEET

// band geometry, relative to the band's centre (35, 60): the paddle keeps the bottom rows; the
// dithered rows above them fade away on the way into the game
const PADDLE_CUT = 3
const PAD_TOP = Math.min(...DITHER.board.filter((d) => d.by >= PADDLE_CUT).map((d) => d.by)) - DITHER_R
const PAD_BOT = Math.max(...DITHER.board.map((d) => d.by)) + DITHER_R
const PAD_HALF = 35

const GAP = 0.07 // space between bricks, in em

type Glyph = { ch: string; adv: number; l: number; r: number; a: number; d: number } // metrics at 1px
type Spot = { x: number; base: number; size: number; alpha: number }
type Letter = { g: Glyph; row: number; home: Spot; game: Spot; cur: Spot; hits: number; alive: boolean; shake: number }
type Ball = { x: number; y: number; k: number; rot: number; alpha: number; vx: number; vy: number; spin: number }
type Band = { x: number; y: number; k: number; fade: number }
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; brand: boolean }
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
  const cb = useRef({ onExitStart, onDone })
  useEffect(() => {
    cb.current = { onExitStart, onDone }
  })

  // ---- the leaderboard: a run is opened on the first launch and closed on the win, both on the server --
  const timerEl = useRef<HTMLParagraphElement>(null)
  const nameEl = useRef<HTMLInputElement>(null)
  const [board, setBoard] = useState<Score[] | null>(null)
  const [result, setResult] = useState<Result | null>(null)
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
    const clean = name.trim()
    if (!result?.runId || !clean || result.state !== 'name') return
    const g = gen.current
    setResult({ ...result, state: 'saving' })
    try {
      localStorage.setItem(NAME_KEY, clean)
    } catch {
      // private mode: the name just isn't remembered
    }
    claimRun(result.runId, clean)
      .then(async ({ id, rank, ms }) => {
        if (g !== gen.current) return
        setResult((r) => r && { ...r, ms, id, rank, state: 'saved' })
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
    const resizeCanvas = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
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
      const k = r.width / 70
      return { x: r.left + FLAG_STAR.x * k, y: r.top + FLAG_STAR.y * k, k: (k * FLAG_STAR.r) / STAR_R }
    }
    const homeFlag = () => {
      const r = mark.getBoundingClientRect()
      return { left: r.left, top: r.top, k: r.width / 70 }
    }
    const homeBand = (): Band => {
      const r = mark.getBoundingClientRect()
      const k = r.width / 70
      return { x: r.left + 35 * k, y: r.top + 60 * k, k, fade: 1 }
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
      const wp = clamp(0.12 * W, 120, 210)
      paddle.k = wp / 70
      paddle.y = H - Math.max(40, 0.06 * H) - PAD_BOT * paddle.k
      ballK = clamp(0.034 * W, 38, 58) / (2 * STAR_R)
      baseSpeed = clamp(0.68 * H, 440, 720)
    }
    layout()

    // ---- state ------------------------------------------------------------------------------------------
    const hb = homeBall()
    const ball: Ball = { ...hb, rot: 0, alpha: 1, vx: 0, vy: 0, spin: 0 }
    const band: Band = homeBand()
    // the flag's top half stays where the hero has it and fades out (and back in on the way out)
    let flagAt = homeFlag()
    const flag = { alpha: 1 }
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
    const explode = (L: Letter) => {
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
      const ox = L.game.x - L.g.l * s - 2
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
            vx: ((px - cx) / w) * 260 + ball.vx * 0.2 + (Math.random() - 0.5) * 80,
            vy: ((py - cy) / h) * 200 + ball.vy * 0.15 - 140 + (Math.random() - 0.5) * 80,
            life: 0,
            max: 0.55 + Math.random() * 0.4,
            r: stepPx * 0.42,
            brand: Math.random() < 0.75,
          })
        }
      }
    }

    const hit = (L: Letter) => {
      L.hits++
      L.shake = 1
      if (L.hits < 2) return
      L.alive = false
      explode(L)
      speed = Math.min(baseSpeed * 1.45, speed * 1.025)
      const sp = Math.hypot(ball.vx, ball.vy) || 1
      ball.vx *= speed / sp
      ball.vy *= speed / sp
      if (letters.every((l) => !l.alive)) {
        timing = false
        clockMs = performance.now() - clockStart
        writeClock(clockMs)
        events.current.win(clockMs)
        go('won')
        run([{ obj: ball, from: { x: ball.x, y: ball.y, rot: ball.rot }, to: { ...readyBall(), rot: Math.round(ball.rot / 360) * 360 - 360 }, delay: 0, dur: 0.9 }])
      }
    }

    const lose = () => {
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
    const physics = (dt: number) => {
      const r = STAR_R * ball.k * 0.78
      const sp = Math.hypot(ball.vx, ball.vy)
      const n = Math.max(1, Math.ceil((sp * dt) / (r * 0.4)))
      const h = dt / n
      for (let s = 0; s < n; s++) {
        ball.x += ball.vx * h
        ball.y += ball.vy * h
        if (ball.x < r) {
          ball.x = r
          ball.vx = Math.abs(ball.vx)
        } else if (ball.x > W - r) {
          ball.x = W - r
          ball.vx = -Math.abs(ball.vx)
        }
        if (ball.y < r) {
          ball.y = r
          ball.vy = Math.abs(ball.vy)
        }
        // paddle: where it lands on the paddle sets the angle it leaves at
        const top = band.y + PAD_TOP * band.k
        const half = PAD_HALF * band.k
        if (ball.vy > 0 && ball.y + r >= top && ball.y - r < top + (PAD_BOT - PAD_TOP) * band.k && Math.abs(ball.x - band.x) <= half + r * 0.5) {
          const off = clamp((ball.x - band.x) / half, -1, 1)
          const a = (off * 62 * Math.PI) / 180
          ball.vx = Math.sin(a) * speed
          ball.vy = -Math.cos(a) * speed
          ball.y = top - r
          ball.spin += off * 500
          dipV += 70
        }
        // bricks: circle against each letter's ink box
        for (const L of letters) {
          if (!L.alive) continue
          const s2 = L.game.size
          const x0 = L.game.x - L.g.l * s2
          const x1 = L.game.x + L.g.r * s2
          const y0 = L.game.base - L.g.a * s2
          const y1 = L.game.base + L.g.d * s2
          const qx = clamp(ball.x, x0, x1)
          const qy = clamp(ball.y, y0, y1)
          let nx = ball.x - qx
          let ny = ball.y - qy
          const d = Math.hypot(nx, ny)
          if (d >= r) continue
          if (d < 1e-6) {
            nx = -ball.vx
            ny = -ball.vy
          }
          const len = Math.hypot(nx, ny) || 1
          nx /= len
          ny /= len
          const dot = ball.vx * nx + ball.vy * ny
          if (dot < 0) {
            ball.vx -= 2 * dot * nx
            ball.vy -= 2 * dot * ny
          }
          ball.x = qx + nx * r
          ball.y = qy + ny * r
          hit(L)
          break
        }
        if (current !== 'play') return
        if (ball.y - r > H) {
          lose()
          return
        }
      }
    }

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
        ctx.fillText(L.g.ch, c.x + j, c.base)
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

      // the band / paddle, dot by dot; the deck dips a little when the star lands on it
      ctx.fillStyle = brand
      const rr = DITHER_R * band.k
      for (const faded of [false, true]) {
        if (faded && band.fade <= 0.01) continue
        ctx.globalAlpha = faded ? band.fade : 1
        ctx.beginPath()
        for (const d of DITHER.board) {
          if (d.by < PADDLE_CUT !== faded) continue
          const x = band.x + d.bx * band.k
          const y = band.y + d.by * band.k + dip * (1 - (2 * d.along - 1) ** 2)
          ctx.moveTo(x + rr, y)
          ctx.arc(x, y, rr, 0, Math.PI * 2)
        }
        ctx.fill()
      }
      ctx.globalAlpha = 1

      // the flag's square and white field, with the star cut out wherever the star is
      const pose = { x: ball.x, y: ball.y, r: STAR_R * ball.k, rot: ball.rot }
      if (flag.alpha > 0.01) {
        ctx.globalAlpha = flag.alpha
        drawFlagTop(ctx, flagAt.left, flagAt.top, flagAt.k, pose, INK)
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
    const tick = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000)
      last = now
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
        if (dir) padTarget = band.x + dir * 900 * dt * 1.6
        const half = PAD_HALF * band.k
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
        // spin follows the ball's sideways speed, so it reads as rolling through the air
        ball.spin += (ball.vx * 0.9 - ball.spin) * Math.min(1, dt * 2)
        ball.rot += ball.spin * dt
      }
      for (const L of letters) L.shake = Math.max(0, L.shake - dt * 5)
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
    if (import.meta.env.DEV) (window as unknown as { __breakout?: unknown }).__breakout = { ball, band, letters }
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
          {Array.from({ length: LIVES }, (_, i) => (
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
                onChange={(e) => setName(e.target.value)}
                maxLength={24}
                required
                autoComplete="nickname"
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
          {phase === 'won' && result?.state === 'saved' && result.rank && (
            <p className="font-mono text-base tracking-wide text-brand uppercase">{labels.rank(result.rank)}</p>
          )}
          {phase === 'won' && result?.state === 'offline' && <p className="font-mono text-sm text-[#5a5956]">{labels.offline}</p>}

          {board && board.length > 0 && (
            <div className="w-full text-left">
              <p className="mb-2 font-mono text-sm tracking-wide text-[#5a5956] uppercase">{labels.board}</p>
              <ol className="font-mono text-base leading-7">
                {board.map((s, i) => (
                  <li
                    key={s._id}
                    className={`grid grid-cols-[2ch_1fr_auto] gap-3 border-t border-[#d6d4d0] ${s._id === result?.id ? 'text-brand' : 'text-[#181818]'}`}
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
