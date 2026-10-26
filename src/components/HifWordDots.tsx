import { useEffect, useRef, type RefObject } from 'react'
import { useReducedMotion } from 'motion/react'

/**
 * The hover field of the logo's star, applied to the wordmark: the dots of "Hack Infra Futuro" near the
 * cursor slide away from it and flow back as it passes.
 *
 * The real text stays in the page. While anything moves, its dots are drawn on a canvas instead (the text
 * goes transparent underneath), and at rest the text takes over again, as HifSkater does with the star.
 *
 * Geist Pixel Circle puts every dot on a 38-unit grid (units per 1000 em), centred 19 units in, so each
 * letter's dots are found by drawing it once off screen and checking the ink at each grid centre.
 */

const GRID = 0.038 // em
const GRID_OFFSET = 0.019 // em
const DOT_R = 0.019 // em: the dots touch their neighbours

// the star's repel field (HifSkater), converted from the mark's units: the mark is 1.772em across 70 units
const UNIT = 1.772 / 70
const REPEL_RADIUS = 19 * UNIT // em
const REPEL_PUSH = 8.5 * UNIT // em
const REPEL_DRAG = 0.016
const STIFFNESS = 700
const DAMPING = 26

const INK = '#181818'

type Field = { width: number; size: number; n: number; rest: Float32Array; pos: Float32Array; vel: Float32Array }

/** every dot of the word, relative to its box, in CSS pixels */
function sample(word: HTMLElement): Field {
  const css = getComputedStyle(word)
  const size = parseFloat(css.fontSize)
  const box = word.getBoundingClientRect()
  const g = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
  g.font = `${css.fontWeight} ${size}px ${css.fontFamily}`
  const m = g.measureText('H')
  const ascent = m.fontBoundingBoxAscent
  const descent = m.fontBoundingBoxDescent
  const pad = Math.ceil(size * 0.1)
  const pitch = GRID * size
  const off = GRID_OFFSET * size

  const pts: number[] = []
  const walker = document.createTreeWalker(word, NodeFilter.SHOW_TEXT)
  const range = document.createRange()
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent ?? ''
    for (let i = 0; i < text.length; i++) {
      if (/\s/.test(text[i])) continue
      range.setStart(node, i)
      range.setEnd(node, i + 1)
      const r = range.getBoundingClientRect()
      const adv = g.measureText(text[i]).width
      const w = Math.ceil(adv + pad * 2)
      const h = Math.ceil(ascent + descent + pad * 2)
      g.canvas.width = w
      g.canvas.height = h
      g.font = `${css.fontWeight} ${size}px ${css.fontFamily}`
      g.fillStyle = '#000'
      g.fillText(text[i], pad, pad + ascent)
      const ink = g.getImageData(0, 0, w, h).data
      const baseline = r.top + ascent - box.top
      for (let x = off; x < adv; x += pitch) {
        for (let y = off - descent; y < ascent; y += pitch) {
          const px = Math.round(pad + x)
          const py = Math.round(pad + ascent - y)
          if (px < 0 || py < 0 || px >= w || py >= h || ink[(py * w + px) * 4 + 3] < 128) continue
          pts.push(r.left - box.left + x, baseline - y)
        }
      }
    }
  }
  const rest = Float32Array.from(pts)
  return { width: box.width, size, n: rest.length / 2, rest, pos: rest.slice(), vel: new Float32Array(rest.length) }
}

export function HifWordDots({ word, off = false }: { word: RefObject<HTMLElement | null>; off?: boolean }) {
  const reduce = useReducedMotion()
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const el = word.current
    const cv = canvas.current
    if (reduce || off || !el || !cv) return
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

    let field: Field | null = null
    let shown = false
    const show = (on: boolean) => {
      if (on === shown) return
      shown = on
      cv.style.display = on ? 'block' : 'none'
      el.style.color = on ? 'transparent' : ''
    }

    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const box = el.getBoundingClientRect()
      const size = parseFloat(getComputedStyle(el).fontSize)
      const radius = REPEL_RADIUS * size
      const near =
        pointer.x > box.left - radius && pointer.x < box.right + radius && pointer.y > box.top - radius && pointer.y < box.bottom + radius
      pointer.vx *= 0.9
      pointer.vy *= 0.9
      if (!near && !shown) return
      // (re)measure after a resize or once the font has loaded
      if (!field || Math.abs(field.width - box.width) > 0.5 || field.size !== size) {
        field = sample(el)
        if (!field.n) return
      }
      const F = field

      const ux = pointer.x - box.left
      const uy = pointer.y - box.top
      const push = REPEL_PUSH * size
      const dvx = pointer.vx * REPEL_DRAG
      const dvy = pointer.vy * REPEL_DRAG
      const r2 = radius * radius
      const steps = 3
      const h = dt / steps
      let moving = 0
      for (let i = 0; i < F.n; i++) {
        let tx = F.rest[i * 2]
        let ty = F.rest[i * 2 + 1]
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
          F.vel[i * 2] += (STIFFNESS * (tx - F.pos[i * 2]) - DAMPING * F.vel[i * 2]) * h
          F.vel[i * 2 + 1] += (STIFFNESS * (ty - F.pos[i * 2 + 1]) - DAMPING * F.vel[i * 2 + 1]) * h
          F.pos[i * 2] += F.vel[i * 2] * h
          F.pos[i * 2 + 1] += F.vel[i * 2 + 1] * h
        }
        moving = Math.max(
          moving,
          Math.abs(F.pos[i * 2] - F.rest[i * 2]),
          Math.abs(F.pos[i * 2 + 1] - F.rest[i * 2 + 1]),
          Math.abs(F.vel[i * 2]) * 0.05,
          Math.abs(F.vel[i * 2 + 1]) * 0.05,
        )
      }

      // the canvas is only shown while something moves; at rest the real text takes over
      const want = moving > 0.05
      if (!want) {
        F.pos.set(F.rest)
        F.vel.fill(0)
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
      const r = DOT_R * size
      ctx.fillStyle = INK
      ctx.beginPath()
      for (let i = 0; i < F.n; i++) {
        const x = box.left + F.pos[i * 2]
        const y = box.top + F.pos[i * 2 + 1]
        ctx.moveTo(x + r, y)
        ctx.arc(x, y, r, 0, Math.PI * 2)
      }
      ctx.fill()
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      cv.style.display = 'none'
      el.style.color = ''
    }
  }, [word, off, reduce])

  return <canvas ref={canvas} aria-hidden className="pointer-events-none fixed inset-0 z-30 hidden h-screen w-screen" />
}
