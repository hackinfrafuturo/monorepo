import { useEffect, useRef, useState, type FormEvent } from 'react'
import { githubHandle } from '../../convex/github'
import { useReducedMotion } from 'motion/react'
import { boardEnabled } from './breakout-board'
import { claimRunnerRun, completeRunnerRun, startRunnerRun, topRunnerScores, type RunnerRunId, type RunnerScore } from './runner-board'
import { createRunnerAudio } from './runner-audio'
import { BAND_CX, BAND_ROWS, DITHER_PITCH, DITHER_R, FLAG_SPLIT, FLAG_STAR, SPRITE_EXT, STAR_FEET, STAR_R, bandTile, drawBandTile, drawFlagTop, drawStarFromFlag, flagTopImage, starSprite, type BandTile } from './hif-dither'

/**
 * An endless runner, played with the hero's own logo (the Chrome dinosaur game): the flag's star runs,
 * its purple band stretches out into the floor, and the letters of "Hack Infra Futuro" come at it as the
 * obstacles. Jump over the ones on the ground; duck under the ones in the air.
 *
 * Like HifBreakout it takes over from the real logo without a cut: on the first frame everything is drawn
 * where the hero has it, then the letters slide away, the band widens to the screen's edges (its upper
 * rows fading while the ground fills down to the bottom), and the star, cut out of the flag's black square,
 * comes out of it as a star and flips into place while the square fades. Leaving runs it backwards.
 *
 * A run is timed on the server from the first jump (convex/runner.ts); a score good enough for the top ten
 * can be named onto the leaderboard.
 *
 * Everything is drawn on one full-screen canvas, in CSS pixels. Star and band geometry come from
 * hif-dither in the mark's 70 × 70 units, scaled by `k` (pixels per unit).
 */

export type RunnerLabels = {
  exit: string
  close: string
  jump: string
  sound: string
  mute: string
  unmute: string
  over: string
  again: string
  playAgain: string
  best: string
  board: string
  viewLeaderboard: string
  name: string
  nameHint: string
  badName: string
  kept: (best: string) => string
  save: string
  saving: string
  rank: (n: number) => string
  offline: string
}

/** A finished run, and where its score is on the way to the leaderboard. */
type Result = {
  score: number
  state: 'checking' | 'name' | 'saving' | 'saved' | 'offline' | 'local'
  runId?: RunnerRunId
  id?: string
  rank?: number
  /** after saving: the person's best on the board, and whether this run beat it */
  best?: number
  improved?: boolean
  /** the username it was saved under, to find the player's row on the board */
  handle?: string
}

type Phase = 'enter' | 'ready' | 'play' | 'over' | 'exit'

const INK = '#181818'
const BEST_KEY = 'hif-runner-best'
/** shared with Breakout, so a player types their name once */
const NAME_KEY = 'hif-breakout-name'
const TOP = 10
/** the obstacles come in the order of the name */
const NAME = 'HackInfraFuturo'
const GAP = 0.04 // between letters in a group, in em
const STAR_H = 50 // the star, tip to feet, in mark units
const DUCK = 0.6 // ducking squashes the star to this much of its height
// difficulty: the start speed (a share of the screen's width) grows by ACCEL of itself a second, up to
// MAX_SPEED times; keep ACCEL and MAX_SPEED in step with convex/runner.ts, which caps scores with them
const ACCEL = 0.045
const MAX_SPEED = 3.2
const AIR_FROM = 20 // score from which letters can come in the air
const RAMP = 400 // score by which the obstacles are as dense as they get (the speed ramps on its own)
/** a band dot's column pattern repeats every 8 columns: leaving, the floor scrolls back to a multiple of this */
const PATTERN = 8 * DITHER_PITCH
/** the floor keeps the band's rows from here down (relative to its centre); the ones above fade away */
const FLOOR_TOP = -10
const FLOOR_REPEAT = BAND_ROWS.filter((row) => row.dy >= FLOOR_TOP).length * DITHER_PITCH

type Glyph = { ch: string; adv: number; l: number; r: number; a: number; d: number } // metrics at 1px
type Spot = { x: number; base: number; size: number; alpha: number }
type Letter = { g: Glyph; home: Spot; cur: Spot }
type Obstacle = { g: Glyph; x: number; base: number; size: number; air: boolean; hit: boolean; bob: number }
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; brand: boolean }
type Item = { obj: Record<string, unknown>; from: Record<string, number>; to: Record<string, number>; delay: number; dur: number }
type Tween = { t: number; items: Item[]; done?: () => void }

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const pad = (n: number) => String(Math.floor(n)).padStart(5, '0')

function readBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0
  } catch {
    return 0
  }
}

export function HifRunner({
  word,
  mark,
  labels,
  onExitStart,
  onDone,
}: {
  /** the wordmark's text element in the hero; its letters become the obstacles */
  word: HTMLElement
  /** the logo's SVG in the hero */
  mark: Element
  labels: RunnerLabels
  /** leaving has started: the page can begin fading its own content back in */
  onExitStart: () => void
  /** everything is back where the hero has it */
  onDone: () => void
}) {
  const reduce = useReducedMotion()
  const canvas = useRef<HTMLCanvasElement>(null)
  const scoreEl = useRef<HTMLSpanElement>(null)
  const [phase, setPhase] = useState<Phase>('enter')
  const [best, setBest] = useState(readBest)
  const [audio] = useState(createRunnerAudio)
  const [muted, setMuted] = useState(() => audio.muted)

  const toggleSound = () => {
    const next = !audio.muted
    audio.setMuted(next)
    setMuted(next)
    if (!next) audio.unlock()
  }

  // ---- the leaderboard: a run is opened when play starts and closed on the crash, both on the server ----
  const nameEl = useRef<HTMLInputElement>(null)
  const [board, setBoard] = useState<RunnerScore[] | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [nameError, setNameError] = useState(false)
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem(NAME_KEY) ?? ''
    } catch {
      return ''
    }
  })
  const runRef = useRef<Promise<RunnerRunId | null> | null>(null)
  const gen = useRef(0)
  const boardRef = useRef(board)
  useEffect(() => {
    boardRef.current = board
  }, [board])
  const events = useRef({ start: () => {}, end: (_score: number) => {} })
  useEffect(() => {
    events.current = {
      start: () => {
        gen.current++
        setResult(null)
        runRef.current = startRunnerRun()
      },
      end: (score) => {
        const run = runRef.current
        runRef.current = null
        const g = ++gen.current
        const top = boardRef.current
        // only a top-ten score asks for a name
        const counts = !!run && boardEnabled() && score >= 1 && (!top || top.length < TOP || score > top[top.length - 1].score)
        setResult({ score, state: counts ? 'checking' : 'local' })
        if (!counts) return
        run
          .then(async (runId) => {
            if (!runId) throw new Error('no run')
            const accepted = await completeRunnerRun(runId, score)
            if (g === gen.current) setResult({ score: accepted, state: 'name', runId })
          })
          .catch(() => g === gen.current && setResult((r) => r && { ...r, state: 'offline' }))
      },
    }
  })
  useEffect(() => {
    let live = true
    void topRunnerScores().then((b) => live && setBoard(b))
    return () => {
      live = false
    }
  }, [])
  useEffect(() => {
    if (result?.state === 'name') nameEl.current?.focus()
  }, [result?.state])

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
    claimRunnerRun(result.runId, handle)
      .then(async ({ id, rank, score, best, improved }) => {
        if (g !== gen.current) return
        setResult((r) => r && { ...r, score, id, rank, best, improved, handle, state: 'saved' })
        setBoard(await topRunnerScores())
      })
      .catch(() => g === gen.current && setResult((r) => r && { ...r, state: 'offline' }))
  }

  const api = useRef({ down: () => {}, up: () => {}, restart: () => {}, exit: () => {} })
  const cb = useRef({ onExitStart, onDone })
  useEffect(() => {
    cb.current = { onExitStart, onDone }
  })

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
    const glyphs = new Map<string, Glyph>()
    const glyphOf = (ch: string): Glyph => {
      let g = glyphs.get(ch)
      if (!g) {
        ctx.font = font(100)
        const m = ctx.measureText(ch)
        g = { ch, adv: m.width / 100, l: m.actualBoundingBoxLeft / 100, r: m.actualBoundingBoxRight / 100, a: m.actualBoundingBoxAscent / 100, d: m.actualBoundingBoxDescent / 100 }
        glyphs.set(ch, g)
      }
      return g
    }
    const fontAscent = ctx.measureText('H').fontBoundingBoxAscent / 100

    const measureHome = () => {
      const out: { ch: string; spot: Spot }[] = []
      const size = parseFloat(getComputedStyle(word).fontSize)
      const walker = document.createTreeWalker(word, NodeFilter.SHOW_TEXT)
      const range = document.createRange()
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const text = n.textContent ?? ''
        for (let i = 0; i < text.length; i++) {
          if (/\s/.test(text[i])) continue
          range.setStart(n, i)
          range.setEnd(n, i + 1)
          const r = range.getBoundingClientRect()
          out.push({ ch: text[i], spot: { x: r.left, base: r.top + fontAscent * size, size, alpha: 1 } })
        }
      }
      return out
    }
    const homeMark = () => {
      const r = mark.getBoundingClientRect()
      const k = r.height / 70
      return { left: r.left, top: r.top, k }
    }

    const letters: Letter[] = measureHome().map((h) => ({ g: glyphOf(h.ch), home: h.spot, cur: { ...h.spot } }))

    // ---- the game's layout: the floor across the screen, the star near its left end ------------------------
    let k = 1 // pixels per mark unit, in the game
    let floorY = 0 // the band's centre
    let feetY = 0 // the top of the floor, where the star stands
    let starX = 0
    let letterSize = 0
    let baseSpeed = 0
    // jump: apex and air time at the start, in pixels and seconds
    let jumpV = 0
    let gravity = 0
    const layout = () => {
      k = Math.min(clamp(0.11 * H, 56, 104), 0.2 * W) / STAR_H
      feetY = Math.round(H * 0.62)
      floorY = feetY + 10 * k
      starX = clamp(0.16 * W, 70, 260)
      letterSize = (0.92 * STAR_H * k) / glyphOf('H').a
      baseSpeed = clamp(0.7 * W, 500, 900)
      const apex = 2.3 * STAR_H * k
      const air = 0.66
      jumpV = (4 * apex) / air
      gravity = (8 * apex) / (air * air)
    }
    layout()

    // ---- state ------------------------------------------------------------------------------------------
    // the star at home is the one cut out of the flag's square; the star is placed by its feet
    const homeStar = (m: ReturnType<typeof homeMark>) => {
      const sk = (m.k * FLAG_STAR.r) / STAR_R
      return { x: m.left + FLAG_STAR.x * m.k, y: m.top + FLAG_STAR.y * m.k + STAR_FEET * sk, k: sk }
    }
    const hm = homeMark()
    const hs = homeStar(hm)
    // the flag's top half stays where the hero has it and fades out (and back in on the way out)
    let flagAt = hm
    const flag = { alpha: 1 }

    // pre-drawn: the floor's two tiles (its rows, and the upper ones that fade) and the flag's top half, at
    // the larger of the hero's and the game's scale so neither end is blurry
    let floorTile: BandTile
    let groundTile: BandTile
    let upperTile: BandTile
    let flagImage: ReturnType<typeof flagTopImage>
    const buildCaches = () => {
      const scale = Math.max(hm.k, k) * dpr
      floorTile = bandTile(scale, brand, (row) => row.dy >= FLOOR_TOP)
      // Cache the deeper ground once; each frame still copies only one tile per horizontal run.
      const ground = document.createElement('canvas')
      ground.width = floorTile.canvas.width
      ground.height = Math.ceil((H / k + floorTile.height) * scale)
      const g = ground.getContext('2d')!
      for (let y = 0; y < ground.height; y += FLOOR_REPEAT * scale) {
        g.drawImage(floorTile.canvas, 0, y)
      }
      groundTile = { ...floorTile, canvas: ground, height: ground.height / scale }
      upperTile = bandTile(scale, brand, (row) => row.dy < FLOOR_TOP)
      flagImage = flagTopImage(hm.k * dpr, INK)
    }
    buildCaches()
    // the band: centre, scale, half its width (in mark units), and how far the floor has scrolled (units)
    const band = { x: hm.left + BAND_CX * hm.k, y: hm.top + 60 * hm.k, k: hm.k, half: BAND_CX, scroll: 0, fade: 1, depth: 0 }
    // the star: feet position (x, y), scale, rotation; squash is a spring for landings and ducking
    const star = { x: hs.x, y: hs.y, k: hs.k, rot: 0, alpha: 1, vy: 0, air: false, airT: 0, sq: 0, sqV: 0, duck: 0, run: 0 }
    let dip = 0
    let dipV = 0
    let speed = baseSpeed
    let score = 0
    let held = false
    let ducking = false
    let current: Phase = 'enter'
    let tween: Tween | null = null
    let obstacles: Obstacle[] = []
    let next = 0 // index into NAME
    let gap = 0 // distance to cover before the next obstacle
    const particles: Particle[] = []
    const fade = { obstacles: 1 } // obstacles fade out on the way back to the hero

    const go = (p: Phase) => {
      current = p
      setPhase(p)
    }
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
    const writeScore = () => {
      if (scoreEl.current) scoreEl.current.textContent = pad(score)
    }

    // ---- in: the letters slide off, the band becomes the floor, the star flips onto it -----------------------
    const enter = () => {
      run(
        [
          ...letters.map((L, i) => ({ obj: L.cur, from: { ...L.home }, to: { ...L.home, x: L.home.x + 0.3 * W, alpha: 0 }, delay: 0.025 * i, dur: 0.6 })),
          { obj: band, from: { ...band }, to: { x: W / 2, y: floorY, k, half: W / (2 * k) + 2 * DITHER_PITCH, scroll: 0, fade: 0, depth: 1 }, delay: 0.05, dur: 1 },
          { obj: star, from: { x: star.x, y: star.y, k: star.k, rot: 0 }, to: { x: starX, y: feetY, k, rot: -360 }, delay: 0.15, dur: 0.95 },
          { obj: flag, from: { alpha: 1 }, to: { alpha: 0 }, delay: 0.2, dur: 0.6 },
        ],
        () => {
          star.rot = 0
          go('ready')
        },
      )
    }

    // ---- out: everything back where the hero has it ----------------------------------------------------
    const exit = () => {
      if (current === 'exit') return
      audio.stop()
      go('exit')
      cb.current.onExitStart()
      const h = measureHome()
      const m = homeMark()
      const ms = homeStar(m)
      flagAt = m
      const n = letters.length
      for (const o of obstacles) o.hit = false
      run(
        [
          ...letters.map((L, i) => ({ obj: L.cur, from: { ...h[i].spot, x: h[i].spot.x + 0.3 * W, alpha: 0 }, to: { ...h[i].spot }, delay: 0.3 + 0.025 * (n - 1 - i), dur: 0.6 })),
          {
            obj: band,
            from: { ...band },
            // scroll back to where the dither pattern lines up with the logo's
            to: { x: m.left + BAND_CX * m.k, y: m.top + 60 * m.k, k: m.k, half: BAND_CX, scroll: Math.round(band.scroll / PATTERN) * PATTERN, fade: 1, depth: 0 },
            delay: 0.1,
            dur: 0.9,
          },
          { obj: star, from: { x: star.x, y: star.y, k: star.k, rot: star.rot, alpha: star.alpha }, to: { ...ms, rot: 360, alpha: 1 }, delay: 0.1, dur: 0.9 },
          // the square comes back as the star reaches it, so it lands as the cut-out
          { obj: flag, from: { alpha: flag.alpha }, to: { alpha: 1 }, delay: 0.35, dur: 0.65 },
          { obj: fade, from: { obstacles: fade.obstacles }, to: { obstacles: 0 }, delay: 0, dur: 0.3 },
        ],
        () => cb.current.onDone(),
      )
      star.vy = 0
      star.air = false
      star.duck = 0
      star.sq = 0
    }

    // ---- obstacles: the name, a letter or a few at a time ---------------------------------------------
    const spawn = () => {
      const ramp = Math.min(1, score / RAMP)
      const air = score > AIR_FROM && Math.random() < 0.45 + 0.15 * ramp
      const count = air ? 1 : 1 + Math.floor(Math.random() * Math.min(4, 1 + score / 80))
      const airTime = (2 * jumpV) / gravity
      // never wider than one jump can clear at this speed
      const maxWidth = speed * airTime * 0.75 - 1.1 * STAR_R * k
      let x = W + 20
      let width = 0
      for (let i = 0; i < count; i++) {
        const g = glyphOf(NAME[next % NAME.length])
        if (i > 0 && width + (g.l + g.r) * letterSize > maxWidth) break
        next++
        const size = letterSize
        // in the air: low enough to hit the star standing, high enough to duck under
        const base = air ? feetY - STAR_H * k * (DUCK + 0.08) - g.d * size : feetY
        obstacles.push({ g, x: x + g.l * size, base, size, air, hit: false, bob: Math.random() * 6 })
        const w = (g.l + g.r) * size
        x += w + GAP * size
        width += w + GAP * size
      }
      // room to land and jump again before the next one; the breathers get shorter as the score climbs
      gap = width + speed * (airTime + 0.06 + Math.random() * 0.35 * (1 - 0.6 * ramp))
    }

    const restart = () => {
      audio.unlock()
      obstacles = []
      score = 0
      writeScore()
      speed = baseSpeed
      gap = W * 0.6
      Object.assign(star, { y: feetY, vy: 0, air: false, rot: 0, sq: 0, sqV: 0, alpha: 1 })
      go('play')
      events.current.start()
      jump()
    }

    const jump = () => {
      if (star.air) return
      audio.play('jump')
      star.air = true
      star.airT = 0
      star.vy = -jumpV
      star.sqV -= 3
      dipV += 30
    }

    const down = () => {
      audio.unlock()
      held = true
      if (tween) return
      if (current === 'ready') {
        gap = W * 0.6
        go('play')
        events.current.start()
        jump()
      } else if (current === 'play') jump()
    }
    const up = () => {
      held = false
    }
    api.current = { down, up, restart: () => current === 'over' && !tween && restart(), exit: () => exit() }

    const crash = (o: Obstacle) => {
      audio.play('crash')
      o.hit = true
      go('over')
      events.current.end(Math.floor(score))
      if (score > readBest()) {
        try {
          localStorage.setItem(BEST_KEY, String(Math.floor(score)))
        } catch {
          // private mode: the best score just isn't kept
        }
        setBest(Math.floor(score))
      }
      // the star shakes off a few of its dots
      for (let i = 0; i < 18; i++) {
        const a = Math.random() * Math.PI * 2
        const s = 120 + Math.random() * 240
        particles.push({ x: star.x, y: star.y - STAR_H * k * 0.5, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 160, life: 0, max: 0.5 + Math.random() * 0.4, r: DITHER_R * k * 1.4, brand: i % 3 === 0 })
      }
      star.sqV += 6
    }

    // ---- physics --------------------------------------------------------------------------------------
    const physics = (dt: number) => {
      speed = Math.min(baseSpeed * MAX_SPEED, speed + baseSpeed * ACCEL * dt)
      score += dt * 10 * (speed / baseSpeed)
      writeScore()
      band.scroll += (speed * dt) / k

      // the star: gravity, a short hop when the jump is let go early, a fast fall when ducking in the air
      if (star.air) {
        const g = gravity * (ducking && star.vy > -jumpV * 0.2 ? 2.6 : 1)
        if (!held && star.vy < -jumpV * 0.45) star.vy = -jumpV * 0.45
        star.vy += g * dt
        star.y += star.vy * dt
        star.airT += dt
        // one backflip per jump, however long the jump turns out: progress = time so far / (so far + left)
        const h = feetY - star.y
        const left = h > 0 || star.vy < 0 ? (star.vy + Math.sqrt(Math.max(0, star.vy * star.vy + 2 * g * h))) / g : 0
        star.rot = -360 * ease(clamp(star.airT / (star.airT + left), 0, 1))
        if (star.y >= feetY) {
          audio.play('land')
          star.y = feetY
          star.air = false
          star.rot = 0
          star.sqV += Math.min(9, star.vy / jumpV * 6)
          star.vy = 0
          dipV += 60
          for (let i = 0; i < 6; i++) {
            particles.push({ x: star.x + (Math.random() - 0.5) * 30 * k, y: feetY, vx: (Math.random() - 0.5) * 160 - speed * 0.3, vy: -60 - Math.random() * 120, life: 0, max: 0.3 + Math.random() * 0.2, r: DITHER_R * k, brand: Math.random() < 0.6 })
          }
        }
      }

      // the course
      for (const o of obstacles) o.x -= speed * dt
      obstacles = obstacles.filter((o) => o.x + o.g.r * o.size > -40)
      gap -= speed * dt
      if (gap <= 0) spawn()

      // collision: forgiving boxes, the star's a little narrower and shorter than it looks
      const hs = STAR_H * k * (1 - star.duck * (1 - DUCK))
      const sx0 = star.x - STAR_R * k * 0.55
      const sx1 = star.x + STAR_R * k * 0.55
      const sy1 = star.y - hs * 0.08
      const sy0 = star.y - hs * 0.85
      for (const o of obstacles) {
        const w = (o.g.l + o.g.r) * o.size
        const x0 = o.x - o.g.l * o.size + w * 0.14
        const x1 = o.x + o.g.r * o.size - w * 0.14
        const bob = o.air ? Math.sin(o.bob) * 3 * k : 0
        const y0 = o.base - o.g.a * o.size * 0.92 + bob
        const y1 = o.base + o.g.d * o.size + bob
        if (x0 < sx1 && x1 > sx0 && y0 < sy1 && y1 > sy0) {
          crash(o)
          return
        }
      }
    }

    // ---- input ------------------------------------------------------------------------------------------
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const key = e.key
      // typing a name: only Escape is ours
      if (e.target instanceof HTMLInputElement) {
        if (key === 'Escape') {
          e.target.blur()
          exit()
        }
        return
      }
      if (key === 'Escape') {
        e.preventDefault()
        exit()
        return
      }
      if (e.target instanceof Element && e.target.closest('a, button')) return
      if (key === ' ' || key === 'ArrowUp' || key === 'w' || key === 'W' || key === 'Enter') {
        e.preventDefault()
        if (e.repeat) return
        if (current === 'over') api.current.restart()
        else down()
        return
      }
      if (key === 'ArrowDown' || key === 's' || key === 'S') {
        e.preventDefault()
        if (!ducking && (current === 'ready' || current === 'play')) {
          audio.unlock()
          audio.play('duck')
        }
        ducking = true
        return
      }
      if (key === 'PageDown' || key === 'PageUp' || key === 'Home' || key === 'End') e.preventDefault()
    }
    const onKeyUp = (e: KeyboardEvent) => {
      const key = e.key
      if (key === ' ' || key === 'ArrowUp' || key === 'w' || key === 'W' || key === 'Enter') up()
      if (key === 'ArrowDown' || key === 's' || key === 'S') ducking = false
    }
    const onWheel = (e: WheelEvent) => e.preventDefault()
    const onVisibility = () => { if (document.hidden) audio.stop() }
    const onResize = () => {
      resizeCanvas()
      layout()
      buildCaches()
      if (!tween && current !== 'enter' && current !== 'exit') {
        Object.assign(band, { x: W / 2, y: floorY, k, half: W / (2 * k) + 2 * DITHER_PITCH })
        Object.assign(star, { x: starX, k })
        if (!star.air) star.y = feetY
        for (const o of obstacles) o.base = o.air ? feetY - STAR_H * k * (DUCK + 0.08) - o.g.d * o.size : feetY
      }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('resize', onResize)
    document.addEventListener('visibilitychange', onVisibility)

    // ---- drawing ----------------------------------------------------------------------------------------
    const draw = (now: number) => {
      ctx.clearRect(0, 0, W, H)

      // the hero's letters, on their way out or back
      for (const L of letters) {
        const c = L.cur
        if (c.alpha <= 0.01) continue
        ctx.globalAlpha = c.alpha
        ctx.fillStyle = INK
        ctx.font = font(c.size)
        ctx.fillText(L.g.ch, c.x, c.base)
      }
      ctx.globalAlpha = 1

      // the band / floor, copied from its tiles, columns out to either side; it dips a little under a landing
      const first = Math.ceil((BAND_CX - band.half + band.scroll) / DITHER_PITCH - 0.5)
      const last = Math.floor((BAND_CX + band.half + band.scroll) / DITHER_PITCH - 0.5)
      const dipW = 40 * band.k
      const dipAt =
        Math.abs(dip) < 0.3
          ? undefined
          : (col: number) => {
              const x = band.x + ((col + 0.5) * DITHER_PITCH - BAND_CX - band.scroll) * band.k
              const d = dip * Math.exp(-(((x - star.x) / dipW) ** 2))
              return Math.abs(d) < 0.3 ? 0 : d
            }
      const floorBottom = band.y + (floorTile.top + floorTile.height) * band.k
      const bottom = floorBottom + Math.max(0, H - floorBottom) * band.depth
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, W, bottom)
      ctx.clip()
      drawBandTile(ctx, groundTile, band.x, band.y, band.k, band.scroll, first, last, dipAt)
      ctx.restore()
      if (band.fade > 0.01) {
        ctx.globalAlpha = band.fade
        drawBandTile(ctx, upperTile, band.x, band.y, band.k, band.scroll, first, last, dipAt)
        ctx.globalAlpha = 1
      }

      // the obstacles
      for (const o of obstacles) {
        const bob = o.air ? Math.sin(o.bob) * 3 * k : 0
        const shake = o.hit && current === 'over' ? Math.sin(now / 18) * o.size * 0.02 : 0
        ctx.globalAlpha = fade.obstacles
        ctx.fillStyle = o.hit ? brand : INK
        ctx.font = font(o.size)
        ctx.fillText(o.g.ch, o.x + shake, o.base + bob)
      }
      ctx.globalAlpha = 1

      // dust
      for (const p of particles) {
        const t = 1 - p.life / p.max
        ctx.globalAlpha = t
        ctx.fillStyle = p.brand ? brand : INK
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r * (0.5 + 0.5 * t), 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      // the star, from its feet: squashed by landings and ducking, with a little bounce while it runs
      const sy = (1 - star.duck * (1 - DUCK)) * (1 - star.sq * 0.06)
      const sx = (1 + star.duck * 0.22) * (1 + star.sq * 0.04)
      const bounce = current === 'play' && !star.air ? Math.abs(Math.sin(star.run)) * 1.6 * star.k : 0

      // the flag's square and white field, with the star cut out wherever the star is
      if (flag.alpha > 0.01) {
        ctx.globalAlpha = flag.alpha
        drawFlagTop(ctx, flagAt.left, flagAt.top, flagAt.k, { x: star.x, y: star.y - bounce - STAR_FEET * star.k * sy, r: STAR_R * star.k, rot: star.rot }, INK, undefined, flagImage)
        ctx.globalAlpha = 1
      }

      // inside the square it's the cut-out, outside it, itself
      if (star.alpha > 0.01) {
        const side = FLAG_SPLIT * flagAt.k
        drawStarFromFlag(ctx, sprite, SPRITE_EXT * star.k, star.alpha, flag.alpha, { x: flagAt.left, y: flagAt.top, w: side, h: side }, () => {
          ctx.translate(star.x, star.y - bounce)
          ctx.scale(sx, sy)
          ctx.translate(0, -STAR_FEET * star.k)
          ctx.rotate((star.rot * Math.PI) / 180)
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
      if (current === 'play') physics(dt)
      for (const o of obstacles) if (o.air) o.bob += dt * 5

      // ducking (only on the ground, or to drop faster in the air), and the squash spring
      const duckTarget = ducking && (current === 'play' || current === 'ready') ? 1 : 0
      star.duck += (duckTarget - star.duck) * Math.min(1, dt * 18)
      star.sqV += (-170 * star.sq - 14 * star.sqV) * dt
      star.sq += star.sqV * dt
      if (current === 'play') star.run += (dt * speed) / (9 * k)
      dipV += (-260 * dip - 18 * dipV) * dt
      dip += dipV * dt

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.life += dt
        if (p.life >= p.max) {
          particles.splice(i, 1)
          continue
        }
        p.vy += 900 * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
      }
      draw(now)
      raf = requestAnimationFrame(tick)
    }

    // dev only: lets the preview scripts read the game
    if (import.meta.env.DEV) (window as unknown as { __runner?: unknown }).__runner = { star, band, get obstacles() { return obstacles }, get phase() { return current } }
    draw(performance.now())
    enter()
    raf = requestAnimationFrame(tick)

    return () => {
      audio.stop()
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [word, mark, reduce, audio])

  const hud = phase !== 'enter' && phase !== 'exit'
  const showForm = phase === 'over' && (result?.state === 'name' || result?.state === 'saving')
  return (
    <div
      className="fixed inset-0 z-[60] touch-none select-none"
      onPointerDown={() => api.current.down()}
      onPointerUp={() => api.current.up()}
      onPointerCancel={() => api.current.up()}
    >
      <canvas ref={canvas} aria-hidden className="absolute inset-0 size-full" />
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 px-4 pt-6 font-mono text-base leading-7 tracking-wide text-[#5a5956] uppercase transition-opacity duration-300 md:px-6 md:pt-10 md:text-lg md:leading-8 ${
          hud ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* the way out: Esc on a keyboard, or a tap here */}
        <button
          type="button"
          title={labels.close}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => api.current.exit()}
          className="pointer-events-auto text-left uppercase transition-colors hover:text-[#181818]"
        >
          Runner <span className="hidden sm:inline">
            <span className="text-[#9a9894]">· </span>
            <span className="hidden text-[#9a9894] pointer-fine:inline">{labels.exit}</span>
            <span className="text-[#9a9894] pointer-fine:hidden">{labels.close}</span>
          </span>
        </button>
        <div className="flex items-start gap-2 md:gap-5">
          <p className="flex gap-2 whitespace-nowrap tabular-nums md:gap-4">
            {best > 0 && (
              <span className="text-[#9a9894]">
                {labels.best} {pad(best)}
              </span>
            )}
            <span ref={scoreEl} className="text-[#181818]">
              00000
            </span>
          </p>
          <button
            type="button"
            aria-label={labels.sound}
            aria-pressed={!muted}
            title={muted ? labels.unmute : labels.mute}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={toggleSound}
            className="pointer-events-auto -mt-1 shrink-0 p-1 text-[#5a5956] hover:text-[#181818] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-6">
              <path d="M11 4 6 8H3v8h3l5 4V4Z" />
              {muted ? <path d="m16 9 6 6m0-6-6 6" /> : <><path d="M15 8a6 6 0 0 1 0 8" /><path d="M18 5a10 10 0 0 1 0 14" /></>}
            </svg>
          </button>
        </div>
      </div>
      <p
        className={`pointer-events-none absolute inset-x-0 bottom-3 text-center font-mono text-sm leading-5 tracking-wide text-[#5a5956] uppercase transition-opacity duration-300 ${
          phase === 'ready' ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <span className="inline-block max-w-[calc(100%-2rem)] bg-brand px-2 py-1 text-[#f4f2ee]">{labels.jump}</span>
      </p>

      {/* game over: the score, a name for the leaderboard if it made the top ten, and the leaderboard */}
      <div
        role="status"
        className={`pointer-events-none absolute inset-0 flex items-center justify-center px-4 transition-opacity duration-300 ${phase === 'over' ? 'opacity-100' : 'opacity-0'}`}
      >
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className={`${phase === 'over' ? 'pointer-events-auto' : ''} flex max-h-[calc(100svh-96px)] w-full max-w-[440px] flex-col items-center gap-5 overflow-y-auto border border-[#d6d4d0] bg-[#f4f2ee] px-5 py-7 text-center md:px-8`}
        >
          <div className="flex flex-col items-center gap-2">
            <p className="font-pixel text-[clamp(36px,5vw,60px)] leading-none text-[#181818]">{labels.over}</p>
            {result && <p className="font-pixel text-[32px] leading-none text-brand tabular-nums">{pad(result.score)}</p>}
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
          {result?.state === 'saved' && result.rank && (
            <p className="font-mono text-base tracking-wide text-brand uppercase">
              {result.improved === false && result.best !== undefined ? `${labels.kept(pad(result.best))} · ${labels.rank(result.rank)}` : labels.rank(result.rank)}
            </p>
          )}
          {result?.state === 'offline' && <p className="font-mono text-sm text-[#5a5956]">{labels.offline}</p>}

          {phase === 'over' && (
            <a href="/leaderboard#runner" className="py-2 font-mono text-base text-brand underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">
              {labels.viewLeaderboard}
            </a>
          )}

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
                    <span className="tabular-nums">{pad(s.score)}</span>
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
