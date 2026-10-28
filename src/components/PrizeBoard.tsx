import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'motion/react'

/**
 * A figure drawn as a dot-matrix sign. Every cell of the board is a dot, lit where Geist Pixel Circle has
 * ink, so the figure reads as the same face as the rest of the page. When the board scrolls into view the
 * digits roll and land one after another; after that, the lit dots near the cursor slide away from it and
 * flow back, like the name in the hero.
 *
 * The figure is also real text, laid out by CSS, so the board has its final size before any script runs.
 * The canvas draws the same dots on the same grid and only takes over once the font has loaded.
 */

const GRID = 0.038 // em: Geist Pixel Circle puts every dot on a 38-unit grid, centred 19 units in
const FONT = '"Geist Pixel Circle"'

/** Geist Pixel Circle, in grid cells. Every advance is a whole number of cells, so the grid runs unbroken across glyphs. */
const METRICS: Record<string, readonly [advance: number, left: number, right: number, ascent: number, descent: number]> = {
  $: [17, 2, 2, 21, 2],
  ',': [5, 1, 1, 3, 4],
  '.': [5, 1, 1, 3, 0],
  '0': [15, 1, 1, 19, 0],
  '1': [13, 2, 2, 19, 0],
  '2': [17, 2, 2, 19, 0],
  '3': [16, 2, 2, 19, 0],
  '4': [18, 2, 2, 19, 0],
  '5': [15, 2, 1, 19, 0],
  '6': [17, 2, 2, 19, 0],
  '7': [15, 1, 1, 19, 0],
  '8': [17, 2, 2, 19, 0],
  '9': [17, 2, 2, 19, 0],
}

const ASCENT = 21
const DESCENT = 4
const PAD_TOP = 3
const PAD_BOTTOM = 2
const ROWS = PAD_TOP + ASCENT + DESCENT + PAD_BOTTOM
/** where line-height: 1 puts the baseline, from the font's ascent (1.005em) and descent (0.295em) */
const BASELINE = (1 - (1.005 + 0.295)) / 2 + 1.005

const INK = '#181818'
const UNLIT = 'rgba(24, 24, 24, 0.075)'
const ROLLING = '#8444ee'

const ROLL_TICK = 55 // ms per step of a rolling digit
const ROLL_FIRST = 700 // ms until the first digit lands
const ROLL_STAGGER = 170 // ms between digits landing

// the hero's repel field, in cells of the board
const REPEL_RADIUS = 9
const REPEL_PUSH = 4
const REPEL_DRAG = 0.016
const STIFFNESS = 700
const DAMPING = 26

/** the lit cells of each glyph, as [column, row] pairs; rows count up from the baseline */
function sampleGlyphs(chars: string) {
  const px = 8
  const g = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
  const out = new Map<string, Int16Array>()
  for (const c of new Set([...chars, ...'0123456789'])) {
    const m = METRICS[c]
    if (!m) continue
    const w = (m[0] + 2) * px
    const h = (ASCENT + DESCENT + 2) * px
    const base = (ASCENT + 1) * px
    g.canvas.width = w
    g.canvas.height = h
    g.font = `500 ${px / GRID}px ${FONT}`
    g.fillStyle = '#000'
    g.fillText(c, px, base)
    const ink = g.getImageData(0, 0, w, h).data
    const cells: number[] = []
    for (let k = 0; k < m[0]; k++) {
      for (let j = -DESCENT; j < ASCENT; j++) {
        const x = Math.floor(px + (k + 0.5) * px)
        const y = Math.floor(base - (j + 0.5) * px)
        if (ink[(y * w + x) * 4 + 3] >= 128) cells.push(k, j)
      }
    }
    out.set(c, Int16Array.from(cells))
  }
  return out
}

export function PrizeBoard({ value, className = '' }: { value: string; className?: string }) {
  const reduce = useReducedMotion()
  const root = useRef<HTMLSpanElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const label = useRef<HTMLSpanElement>(null)
  const rolled = useRef(false)

  const known = [...value].filter((c) => c in METRICS)
  const lead = known.length ? METRICS[known[0]][1] : 0
  const tail = known.length ? METRICS[known[known.length - 1]][2] : 0
  const cols = known.reduce((n, c) => n + METRICS[c][0], 0) - lead - tail

  useEffect(() => {
    const box = root.current
    const cv = canvas.current
    const el = label.current
    if (!box || !cv || !el) return
    let alive = true
    let stop = () => {}

    document.fonts.load(`500 100px ${FONT}`).then(() => {
      if (!alive) return
      const glyphs = sampleGlyphs(value)

      // the digits roll; everything else ("$", the separator) is lit from the start
      const fixed: number[] = []
      const slots: { col: number; adv: number; digit: number }[] = []
      let col = 0
      for (const c of value) {
        const m = METRICS[c]
        if (!m) continue
        if (c >= '0' && c <= '9') slots.push({ col, adv: m[0], digit: Number(c) })
        else {
          const cells = glyphs.get(c)!
          for (let i = 0; i < cells.length; i += 2) fixed.push(col + cells[i], cells[i + 1])
        }
        col += m[0]
      }
      const final = fixed.slice()
      for (const s of slots) {
        const cells = glyphs.get(String(s.digit))!
        for (let i = 0; i < cells.length; i += 2) final.push(s.col + cells[i], cells[i + 1])
      }
      const n = final.length / 2

      let phase: 'waiting' | 'rolling' | 'done' = reduce || rolled.current ? 'done' : 'waiting'
      let t0 = 0
      const rollEnd = ROLL_FIRST + (slots.length - 1) * ROLL_STAGGER

      let L = { w: 0, h: 0, cell: 0, ox: 0, base: 0, dpr: 1 }
      const grid = document.createElement('canvas')
      const rest = new Float32Array(n * 2)
      const pos = new Float32Array(n * 2)
      const vel = new Float32Array(n * 2)

      const layout = () => {
        const b = box.getBoundingClientRect()
        const cell = parseFloat(getComputedStyle(box).fontSize) * GRID
        const ox = el.getBoundingClientRect().left - b.left
        const dpr = Math.min(2, window.devicePixelRatio || 1)
        L = { w: b.width, h: b.height, cell, ox, base: (PAD_TOP + ASCENT) * cell, dpr }
        cv.width = grid.width = Math.round(b.width * dpr)
        cv.height = grid.height = Math.round(b.height * dpr)

        // the unlit board: every whole cell that fits, on the figure's grid
        const g = grid.getContext('2d')!
        g.setTransform(dpr, 0, 0, dpr, 0, 0)
        g.fillStyle = UNLIT
        g.beginPath()
        const r = cell / 2
        for (let k = Math.ceil(-ox / cell); ox + (k + 1) * cell <= b.width + 0.01; k++) {
          for (let j = -(DESCENT + PAD_BOTTOM); j < ASCENT + PAD_TOP; j++) {
            const x = ox + (k + 0.5) * cell
            const y = L.base - (j + 0.5) * cell
            g.moveTo(x + r, y)
            g.arc(x, y, r, 0, Math.PI * 2)
          }
        }
        g.fill()

        for (let i = 0; i < n; i++) {
          rest[i * 2] = ox + (final[i * 2] + 0.5) * cell
          rest[i * 2 + 1] = L.base - (final[i * 2 + 1] + 0.5) * cell
        }
        pos.set(rest)
        vel.fill(0)
      }

      const ctx = cv.getContext('2d')!
      const dots = (cells: ArrayLike<number>, from: number, offset: number, clip: number, color: string) => {
        const { cell, ox, base } = L
        const r = cell / 2
        ctx.fillStyle = color
        ctx.beginPath()
        for (let i = from; i < cells.length; i += 2) {
          const k = cells[i] + offset
          if (k < 0 || k >= clip) continue
          const x = ox + (k + 0.5) * cell
          const y = base - (cells[i + 1] + 0.5) * cell
          ctx.moveTo(x + r, y)
          ctx.arc(x, y, r, 0, Math.PI * 2)
        }
        ctx.fill()
      }

      const draw = (now: number) => {
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.clearRect(0, 0, cv.width, cv.height)
        ctx.drawImage(grid, 0, 0)
        ctx.setTransform(L.dpr, 0, 0, L.dpr, 0, 0)
        if (phase === 'done') {
          const r = L.cell / 2
          ctx.fillStyle = INK
          ctx.beginPath()
          for (let i = 0; i < n; i++) {
            ctx.moveTo(pos[i * 2] + r, pos[i * 2 + 1])
            ctx.arc(pos[i * 2], pos[i * 2 + 1], r, 0, Math.PI * 2)
          }
          ctx.fill()
          return
        }
        dots(fixed, 0, 0, Infinity, INK)
        if (phase === 'waiting') return
        const elapsed = now - t0
        slots.forEach((s, i) => {
          const land = ROLL_FIRST + i * ROLL_STAGGER
          if (elapsed >= land) {
            const cells = glyphs.get(String(s.digit))!
            ctx.save()
            ctx.translate(s.col * L.cell, 0)
            dots(cells, 0, 0, s.adv, INK)
            ctx.restore()
            return
          }
          // count up into the final digit, one step per tick, centred in the final digit's slot
          const d = (((s.digit - Math.ceil((land - elapsed) / ROLL_TICK)) % 10) + 10) % 10
          const shift = Math.floor((s.adv - METRICS[String(d)][0]) / 2)
          ctx.save()
          ctx.translate(s.col * L.cell, 0)
          dots(glyphs.get(String(d))!, 0, shift, s.adv, ROLLING)
          ctx.restore()
        })
      }

      const pointer = { x: -1e4, y: -1e4, vx: 0, vy: 0, t: 0 }
      const isNear = () => {
        const b = cv.getBoundingClientRect()
        const m = REPEL_RADIUS * L.cell
        return pointer.x > b.left - m && pointer.x < b.right + m && pointer.y > b.top - m && pointer.y < b.bottom + m
      }

      /** one frame of the repel springs; true while anything is still moving */
      const step = (dt: number) => {
        const b = cv.getBoundingClientRect()
        const near = isNear()
        pointer.vx *= 0.9
        pointer.vy *= 0.9
        const radius = REPEL_RADIUS * L.cell
        const push = REPEL_PUSH * L.cell
        const ux = pointer.x - b.left
        const uy = pointer.y - b.top
        const dvx = pointer.vx * REPEL_DRAG
        const dvy = pointer.vy * REPEL_DRAG
        const r2 = radius * radius
        const steps = 3
        const h = dt / steps
        let moving = 0
        for (let i = 0; i < n; i++) {
          let tx = rest[i * 2]
          let ty = rest[i * 2 + 1]
          if (near) {
            const dx = tx - ux
            const dy = ty - uy
            const d2 = dx * dx + dy * dy
            if (d2 < r2) {
              const d = Math.sqrt(d2) || 0.001
              const fall = (1 - d / radius) ** 2
              tx += (dx / d) * push * fall + dvx * fall
              ty += (dy / d) * push * fall + dvy * fall
            }
          }
          for (let s = 0; s < steps; s++) {
            vel[i * 2] += (STIFFNESS * (tx - pos[i * 2]) - DAMPING * vel[i * 2]) * h
            vel[i * 2 + 1] += (STIFFNESS * (ty - pos[i * 2 + 1]) - DAMPING * vel[i * 2 + 1]) * h
            pos[i * 2] += vel[i * 2] * h
            pos[i * 2 + 1] += vel[i * 2 + 1] * h
          }
          moving = Math.max(
            moving,
            Math.abs(pos[i * 2] - rest[i * 2]),
            Math.abs(pos[i * 2 + 1] - rest[i * 2 + 1]),
            Math.abs(vel[i * 2]) * 0.05,
            Math.abs(vel[i * 2 + 1]) * 0.05,
          )
        }
        if (moving > 0.05) return true
        pos.set(rest)
        vel.fill(0)
        return near
      }

      let raf = 0
      let running = false
      let last = 0
      const tick = (now: number) => {
        const dt = Math.min(0.05, (now - last) / 1000)
        last = now
        let again = false
        if (phase === 'rolling') {
          again = true
          if (now - t0 >= rollEnd) {
            phase = 'done'
            rolled.current = true
          }
        }
        if (phase === 'done' && !reduce) again = step(dt) || again
        draw(now)
        running = again
        if (again) raf = requestAnimationFrame(tick)
      }
      const kick = () => {
        if (running) return
        running = true
        last = performance.now()
        raf = requestAnimationFrame(tick)
      }

      const onMove = (e: PointerEvent) => {
        if (e.pointerType === 'touch') return
        const now = performance.now()
        const dt = Math.max(1, now - pointer.t) / 1000
        if (pointer.x > -1e3) {
          pointer.vx += ((e.clientX - pointer.x) / dt - pointer.vx) * 0.3
          pointer.vy += ((e.clientY - pointer.y) / dt - pointer.vy) * 0.3
        }
        pointer.x = e.clientX
        pointer.y = e.clientY
        pointer.t = now
        if (phase === 'done' && isNear()) kick()
      }
      const onLeave = () => {
        pointer.x = -1e4
        pointer.y = -1e4
        kick()
      }
      if (!reduce) {
        window.addEventListener('pointermove', onMove, { passive: true })
        document.documentElement.addEventListener('pointerleave', onLeave)
      }

      const io = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting || phase !== 'waiting') return
          io.disconnect()
          phase = 'rolling'
          t0 = performance.now()
          kick()
        },
        { threshold: 0.6 },
      )
      if (phase === 'waiting') io.observe(box)

      const ro = new ResizeObserver(() => {
        layout()
        draw(performance.now())
      })
      layout()
      draw(performance.now())
      ro.observe(box)
      cv.style.opacity = '1'
      el.style.opacity = '0'

      stop = () => {
        cancelAnimationFrame(raf)
        io.disconnect()
        ro.disconnect()
        window.removeEventListener('pointermove', onMove)
        document.documentElement.removeEventListener('pointerleave', onLeave)
        cv.style.opacity = ''
        el.style.opacity = ''
      }
    })

    return () => {
      alive = false
      stop()
    }
  }, [value, reduce])

  return (
    <span
      ref={root}
      aria-hidden
      className={`relative block select-none [--pad:1rem] md:[--pad:1.5rem] ${className}`}
      style={{
        fontSize: `min((100cqw - 2 * var(--pad)) / ${(cols * GRID).toFixed(4)}, 55svh)`,
        height: `${(ROWS * GRID).toFixed(4)}em`,
      }}
    >
      <canvas ref={canvas} className="absolute inset-0 size-full opacity-0" />
      <span
        ref={label}
        className="absolute font-pixel leading-none whitespace-nowrap"
        style={{
          left: `calc(var(--pad) - ${(lead * GRID).toFixed(4)}em)`,
          top: `${((PAD_TOP + ASCENT) * GRID - BASELINE).toFixed(4)}em`,
          color: INK,
        }}
      >
        {value}
      </span>
    </span>
  )
}
