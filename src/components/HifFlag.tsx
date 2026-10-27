import { useEffect, useRef, type Ref } from 'react'
import { useReducedMotion } from 'motion/react'
import { BAND_CX, DITHER, DITHER_R, FLAG, FLAG_FIELD, FLAG_STAR, FLAG_W, holeScale, starDistance, type StarPose } from './hif-dither'

/**
 * The Hack Infra Futuro mark: Chile's flag in dots (see hif-dither), with the star cut out of the black
 * square.
 *
 * Hovering, the dots near the cursor slide away from it and flow back as it passes (the repel field the
 * old star had), and the star itself, a hole in the square, shies away from the cursor and wobbles back on
 * springs. The dots along its edge shrink and grow with it, so it moves smoothly through the grid.
 *
 * As with the old star, the static SVG shows at rest and a canvas takes over only while anything moves.
 * Units are the mark's own: FLAG_W × 70 (3:2). Never moves under prefers-reduced-motion.
 */

const INK = '#181818'

// the repel field, in the mark's units (as the old star's)
const REPEL_RADIUS = 19
const REPEL_PUSH = 8.5
const REPEL_DRAG = 0.016
const STIFFNESS = 700
const DAMPING = 26

// the star: how near the cursor must be, how far it shies, and its (loose) springs
const STAR_REACH = 18
const STAR_SHY = 3.2
const STAR_SPRING = { k: 170, c: 8 }

const REST_STAR: StarPose = { x: FLAG_STAR.x, y: FLAG_STAR.y, r: FLAG_STAR.r, rot: 0 }
const BAND = Float32Array.from(DITHER.board.flatMap((d) => [d.bx + BAND_CX, d.by + 60]))

/** every dot at rest: square, field and band, as one array of mark-unit positions */
const REST = (() => {
  const a = new Float32Array(FLAG.square.length + FLAG.field.length + BAND.length)
  a.set(FLAG.square, 0)
  a.set(FLAG.field, FLAG.square.length)
  a.set(BAND, FLAG.square.length + FLAG.field.length)
  return a
})()
const SQ_END = FLAG.square.length
const FIELD_END = SQ_END + FLAG.field.length

function StaticFlag({ className, svgRef }: { className?: string; svgRef?: Ref<SVGSVGElement> }) {
  const dots = (from: number, to: number, scale?: (x: number, y: number) => number) => {
    const out = []
    for (let i = from; i < to; i += 2) {
      const r = DITHER_R * (scale ? scale(REST[i], REST[i + 1]) : 1)
      if (r < 0.02) continue
      out.push(<circle key={i} cx={REST[i]} cy={REST[i + 1]} r={r} />)
    }
    return out
  }
  return (
    <svg ref={svgRef} viewBox={`0 0 ${FLAG_W} 70`} aria-hidden className={className}>
      {/* the whole flag takes clicks, the gaps between dots included, and keeps taking them while the
          canvas draws it (only the dots are hidden then) */}
      <rect width={FLAG_W} height={70} fill="transparent" />
      <g data-dots>
        <g fill={FLAG_FIELD}>{dots(SQ_END, FIELD_END)}</g>
        <g fill={INK}>{dots(0, SQ_END, (x, y) => holeScale(starDistance(x, y, REST_STAR), DITHER_R))}</g>
        <g className="fill-brand">{dots(FIELD_END, REST.length)}</g>
      </g>
    </svg>
  )
}

/** The whole flag at rest (star cut out where it sits), at `scale` pixels per unit, for the canvas to start from. */
function flagAtRest(scale: number, brand: string) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(FLAG_W * scale)
  canvas.height = Math.ceil(70 * scale)
  const g = canvas.getContext('2d')!
  const draw = (from: number, to: number, color: string, size?: (x: number, y: number) => number) => {
    g.fillStyle = color
    g.beginPath()
    for (let i = from; i < to; i += 2) {
      const r = DITHER_R * scale * (size ? size(REST[i], REST[i + 1]) : 1)
      if (r < 0.05) continue
      g.moveTo(REST[i] * scale + r, REST[i + 1] * scale)
      g.arc(REST[i] * scale, REST[i + 1] * scale, r, 0, Math.PI * 2)
    }
    g.fill()
  }
  draw(SQ_END, FIELD_END, FLAG_FIELD)
  draw(0, SQ_END, INK, (x, y) => holeScale(starDistance(x, y, REST_STAR), DITHER_R))
  draw(FIELD_END, REST.length, brand)
  return { canvas, scale }
}

export function HifFlag({ className, off = false }: { className?: string; off?: boolean }) {
  const reduce = useReducedMotion()
  const svgRef = useRef<SVGSVGElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const svg = svgRef.current
    const dotsEl = svg?.querySelector<SVGGElement>('[data-dots]')
    const cv = canvas.current
    if (reduce || off || !svg || !dotsEl || !cv) return
    const pointer = { x: -1e4, y: -1e4, vx: 0, vy: 0, t: 0 }
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
    }
    const onLeave = () => {
      pointer.x = -1e4
      pointer.y = -1e4
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)

    const pos = REST.slice()
    const vel = new Float32Array(REST.length)
    // which dots are off their rest spot (or still moving): only those are worked on and redrawn
    const awake = new Uint8Array(REST.length / 2)
    const brand = getComputedStyle(svg).getPropertyValue('--color-brand').trim() || '#7c3aec'
    let restImage: { canvas: HTMLCanvasElement; scale: number } | null = null
    // the star's offset, rotation and scale, each on a loose spring
    const star = { x: 0, y: 0, rot: 0, s: 1, vx: 0, vy: 0, vr: 0, vs: 0 }
    let shown = false
    const show = (on: boolean) => {
      if (on === shown) return
      shown = on
      cv.style.display = on ? 'block' : 'none'
      dotsEl.style.visibility = on ? 'hidden' : ''
    }

    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const box = svg.getBoundingClientRect()
      const per = box.height / 70
      const ux = (pointer.x - box.left) / per
      const uy = (pointer.y - box.top) / per
      const near = ux > -REPEL_RADIUS && ux < FLAG_W + REPEL_RADIUS && uy > -REPEL_RADIUS && uy < 70 + REPEL_RADIUS
      pointer.vx *= 0.9
      pointer.vy *= 0.9
      if (!near && !shown) return

      // the star: shy away from the cursor, turn with its motion, flinch a little
      let tx = 0
      let ty = 0
      let tr = 0
      let ts = 1
      const sdx = FLAG_STAR.x - ux
      const sdy = FLAG_STAR.y - uy
      const sd = Math.hypot(sdx, sdy)
      if (near && sd < STAR_REACH) {
        const fall = (1 - sd / STAR_REACH) ** 2
        tx = (sdx / (sd || 1)) * STAR_SHY * fall
        ty = (sdy / (sd || 1)) * STAR_SHY * fall
        tr = Math.max(-35, Math.min(35, (pointer.vx / per) * 0.12)) * fall
        ts = 1 - 0.12 * fall
      }
      const { k, c } = STAR_SPRING
      const steps = 3
      const h = dt / steps
      for (let s = 0; s < steps; s++) {
        star.vx += (k * (tx - star.x) - c * star.vx) * h
        star.vy += (k * (ty - star.y) - c * star.vy) * h
        star.vr += (k * (tr - star.rot) - c * star.vr) * h
        star.vs += (k * (ts - star.s) - c * star.vs) * h
        star.x += star.vx * h
        star.y += star.vy * h
        star.rot += star.vr * h
        star.s += star.vs * h
      }

      // the dots: pushed away from the cursor, on stiff springs. Only the ones near the cursor or still
      // settling are worked on; the rest sit at their rest spot, untouched
      const dvx = (pointer.vx / per) * REPEL_DRAG
      const dvy = (pointer.vy / per) * REPEL_DRAG
      const r2 = REPEL_RADIUS * REPEL_RADIUS
      let moving = Math.max(Math.abs(star.x), Math.abs(star.y), Math.abs(star.rot) * 0.1, Math.abs(star.s - 1) * 10, Math.abs(star.vx) * 0.05, Math.abs(star.vr) * 0.01)
      for (let i = 0; i < REST.length; i += 2) {
        let gx = REST[i]
        let gy = REST[i + 1]
        let pushed = false
        if (near) {
          const dx = gx - ux
          const dy = gy - uy
          const d2 = dx * dx + dy * dy
          if (d2 < r2) {
            const d = Math.sqrt(d2) || 0.001
            const fall = (1 - d / REPEL_RADIUS) ** 2
            gx += (dx / d) * REPEL_PUSH * fall + dvx * fall
            gy += (dy / d) * REPEL_PUSH * fall + dvy * fall
            pushed = true
          }
        }
        if (!pushed && !awake[i >> 1]) continue
        for (let s = 0; s < steps; s++) {
          vel[i] += (STIFFNESS * (gx - pos[i]) - DAMPING * vel[i]) * h
          vel[i + 1] += (STIFFNESS * (gy - pos[i + 1]) - DAMPING * vel[i + 1]) * h
          pos[i] += vel[i] * h
          pos[i + 1] += vel[i + 1] * h
        }
        const m = Math.max(Math.abs(pos[i] - REST[i]), Math.abs(pos[i + 1] - REST[i + 1]), Math.abs(vel[i]) * 0.05, Math.abs(vel[i + 1]) * 0.05)
        if (!pushed && m < 0.01) {
          // settled: back to its rest spot exactly, and left alone from now on
          pos[i] = REST[i]
          pos[i + 1] = REST[i + 1]
          vel[i] = vel[i + 1] = 0
          awake[i >> 1] = 0
        } else awake[i >> 1] = 1
        moving = Math.max(moving, m)
      }

      // the canvas is only shown while something moves; at rest the static mark takes over
      const want = moving > 0.02
      if (!want) {
        pos.set(REST)
        vel.fill(0)
        awake.fill(0)
        Object.assign(star, { x: 0, y: 0, rot: 0, s: 1, vx: 0, vy: 0, vr: 0, vs: 0 })
      }
      show(want)
      if (!want) return

      // the canvas only covers the flag and the room its dots can be pushed into, not the whole screen
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const margin = (REPEL_PUSH + 2) * per
      const left = Math.floor(box.left - margin)
      const top = Math.floor(box.top - margin)
      const cw = Math.ceil(box.width + 2 * margin)
      const ch = Math.ceil(box.height + 2 * margin)
      if (cv.width !== Math.round(cw * dpr) || cv.height !== Math.round(ch * dpr)) {
        cv.width = Math.round(cw * dpr)
        cv.height = Math.round(ch * dpr)
        cv.style.width = `${cw}px`
        cv.style.height = `${ch}px`
      }
      cv.style.transform = `translate(${left}px, ${top}px)`
      const ctx = cv.getContext('2d')!
      ctx.setTransform(dpr, 0, 0, dpr, -left * dpr, -top * dpr)
      ctx.clearRect(left, top, cw, ch)

      // the flag at rest, as one image; then the dots that moved are rubbed out of it and drawn where they are
      if (!restImage || restImage.scale !== per * dpr) restImage = flagAtRest(per * dpr, brand)
      ctx.drawImage(restImage.canvas, box.left, box.top, FLAG_W * per, 70 * per)
      const pose: StarPose = { x: FLAG_STAR.x + star.x, y: FLAG_STAR.y + star.y, r: FLAG_STAR.r * star.s, rot: star.rot }
      const starMoved = moving > 0 && (star.x !== 0 || star.y !== 0 || star.rot !== 0 || star.s !== 1)
      const reach = Math.max(pose.r, FLAG_STAR.r) + Math.hypot(star.x, star.y) + 3 * DITHER_R
      const dirty = (i: number) => {
        if (awake[i >> 1]) return true
        if (!starMoved || i >= SQ_END) return false
        return Math.abs(REST[i] - FLAG_STAR.x) < reach && Math.abs(REST[i + 1] - FLAG_STAR.y) < reach
      }
      const r = DITHER_R * per
      ctx.globalCompositeOperation = 'destination-out'
      ctx.beginPath()
      for (let i = 0; i < REST.length; i += 2) {
        if (!dirty(i)) continue
        const x = box.left + REST[i] * per
        const y = box.top + REST[i + 1] * per
        ctx.moveTo(x + r * 1.15, y)
        ctx.arc(x, y, r * 1.15, 0, Math.PI * 2)
      }
      ctx.fill()
      ctx.globalCompositeOperation = 'source-over'
      for (const [from, to, color] of [
        [SQ_END, FIELD_END, FLAG_FIELD],
        [0, SQ_END, INK],
        [FIELD_END, REST.length, brand],
      ] as const) {
        ctx.fillStyle = color
        ctx.beginPath()
        for (let i = from; i < to; i += 2) {
          if (!dirty(i)) continue
          const rr = i < SQ_END ? r * holeScale(starDistance(pos[i], pos[i + 1], pose), DITHER_R) : r
          if (rr < 0.05) continue
          const x = box.left + pos[i] * per
          const y = box.top + pos[i + 1] * per
          ctx.moveTo(x + rr, y)
          ctx.arc(x, y, rr, 0, Math.PI * 2)
        }
        ctx.fill()
      }
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      cv.style.display = 'none'
      dotsEl.style.visibility = ''
    }
  }, [off, reduce])

  return (
    <>
      <StaticFlag className={className} svgRef={svgRef} />
      <canvas ref={canvas} aria-hidden className="pointer-events-none fixed top-0 left-0 z-30 hidden" />
    </>
  )
}
