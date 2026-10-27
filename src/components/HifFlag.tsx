import { useEffect, useRef, type Ref } from 'react'
import { useReducedMotion } from 'motion/react'
import { DITHER, DITHER_R, FLAG, FLAG_FIELD, FLAG_STAR, drawFlagTop, holeScale, starDistance, type StarPose } from './hif-dither'

/**
 * The Hack Infra Futuro mark: Chile's flag in dots (see hif-dither), with the star cut out of the black
 * square.
 *
 * Hovering, the dots near the cursor slide away from it and flow back as it passes (the repel field the
 * old star had), and the star itself, a hole in the square, shies away from the cursor and wobbles back on
 * springs. The dots along its edge shrink and grow with it, so it moves smoothly through the grid.
 *
 * As with the old star, the static SVG shows at rest and a canvas takes over only while anything moves.
 * Units are the mark's own: 70 × 70. Never moves under prefers-reduced-motion.
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
const BAND = Float32Array.from(DITHER.board.flatMap((d) => [d.bx + 35, d.by + 60]))

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
    <svg ref={svgRef} viewBox="0 0 70 70" aria-hidden className={className}>
      <g fill={FLAG_FIELD}>{dots(SQ_END, FIELD_END)}</g>
      <g fill={INK}>{dots(0, SQ_END, (x, y) => holeScale(starDistance(x, y, REST_STAR), DITHER_R))}</g>
      <g className="fill-brand">{dots(FIELD_END, REST.length)}</g>
    </svg>
  )
}

export function HifFlag({ className, off = false }: { className?: string; off?: boolean }) {
  const reduce = useReducedMotion()
  const svgRef = useRef<SVGSVGElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const svg = svgRef.current
    const cv = canvas.current
    if (reduce || off || !svg || !cv) return
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
    const views = { square: pos.subarray(0, SQ_END), field: pos.subarray(SQ_END, FIELD_END) }
    // the star's offset, rotation and scale, each on a loose spring
    const star = { x: 0, y: 0, rot: 0, s: 1, vx: 0, vy: 0, vr: 0, vs: 0 }
    let shown = false
    const show = (on: boolean) => {
      if (on === shown) return
      shown = on
      cv.style.display = on ? 'block' : 'none'
      svg.style.visibility = on ? 'hidden' : ''
    }

    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const box = svg.getBoundingClientRect()
      const per = box.width / 70
      const ux = (pointer.x - box.left) / per
      const uy = (pointer.y - box.top) / per
      const near = ux > -REPEL_RADIUS && ux < 70 + REPEL_RADIUS && uy > -REPEL_RADIUS && uy < 70 + REPEL_RADIUS
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

      // the dots: pushed away from the cursor, on stiff springs
      const dvx = (pointer.vx / per) * REPEL_DRAG
      const dvy = (pointer.vy / per) * REPEL_DRAG
      const r2 = REPEL_RADIUS * REPEL_RADIUS
      let moving = Math.max(Math.abs(star.x), Math.abs(star.y), Math.abs(star.rot) * 0.1, Math.abs(star.s - 1) * 10, Math.abs(star.vx) * 0.05, Math.abs(star.vr) * 0.01)
      for (let i = 0; i < REST.length; i += 2) {
        let gx = REST[i]
        let gy = REST[i + 1]
        if (near) {
          const dx = gx - ux
          const dy = gy - uy
          const d2 = dx * dx + dy * dy
          if (d2 < r2) {
            const d = Math.sqrt(d2) || 0.001
            const fall = (1 - d / REPEL_RADIUS) ** 2
            gx += (dx / d) * REPEL_PUSH * fall + dvx * fall
            gy += (dy / d) * REPEL_PUSH * fall + dvy * fall
          }
        }
        for (let s = 0; s < steps; s++) {
          vel[i] += (STIFFNESS * (gx - pos[i]) - DAMPING * vel[i]) * h
          vel[i + 1] += (STIFFNESS * (gy - pos[i + 1]) - DAMPING * vel[i + 1]) * h
          pos[i] += vel[i] * h
          pos[i + 1] += vel[i + 1] * h
        }
        moving = Math.max(moving, Math.abs(pos[i] - REST[i]), Math.abs(pos[i + 1] - REST[i + 1]), Math.abs(vel[i]) * 0.05, Math.abs(vel[i + 1]) * 0.05)
      }

      // the canvas is only shown while something moves; at rest the static mark takes over
      const want = moving > 0.02
      if (!want) {
        pos.set(REST)
        vel.fill(0)
        Object.assign(star, { x: 0, y: 0, rot: 0, s: 1, vx: 0, vy: 0, vr: 0, vs: 0 })
      }
      show(want)
      if (!want) return

      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const W = window.innerWidth
      const H = window.innerHeight
      if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
        cv.width = Math.round(W * dpr)
        cv.height = Math.round(H * dpr)
      }
      const ctx = cv.getContext('2d')!
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      const brand = getComputedStyle(svg).getPropertyValue('--color-brand').trim() || '#7c3aec'
      const r = DITHER_R * per
      ctx.fillStyle = brand
      ctx.beginPath()
      for (let i = FIELD_END; i < pos.length; i += 2) {
        const x = box.left + pos[i] * per
        const y = box.top + pos[i + 1] * per
        ctx.moveTo(x + r, y)
        ctx.arc(x, y, r, 0, Math.PI * 2)
      }
      ctx.fill()
      drawFlagTop(
        ctx,
        box.left,
        box.top,
        per,
        { x: box.left + (FLAG_STAR.x + star.x) * per, y: box.top + (FLAG_STAR.y + star.y) * per, r: FLAG_STAR.r * star.s * per, rot: star.rot },
        INK,
        views,
      )
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      cv.style.display = 'none'
      svg.style.visibility = ''
    }
  }, [off, reduce])

  return (
    <>
      <StaticFlag className={className} svgRef={svgRef} />
      <canvas ref={canvas} aria-hidden className="pointer-events-none fixed inset-0 z-30 hidden h-screen w-screen" />
    </>
  )
}
