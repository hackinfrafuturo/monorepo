import { useEffect, useRef, type RefObject } from 'react'
import { useReducedMotion } from 'motion/react'

/**
 * The hover field of the logo's star, applied to the wordmark: the dots of "Hack Infra Futuro" near the
 * cursor slide away from it and flow back as it passes.
 *
 * The real text stays in the page. While anything moves, the word is drawn on a canvas instead (the text
 * goes transparent underneath), and at rest the text takes over again, as HifFlag does with the mark.
 *
 * Geist Pixel Circle puts every dot on a 38-unit grid (units per 1000 em), centred 19 units in, so each
 * letter's dots are found by drawing it once off screen and checking the ink at each grid centre.
 *
 * The canvas doesn't draw its own circles: the browser renders the font's dots fuller than plain circles
 * of the same size, so the word would visibly thin out the moment the canvas took over. Instead the word
 * is rendered with the font onto a sheet, on the same device-pixel grid as the page, and the canvas shows
 * that sheet, lifting each displaced dot's cell off its place and putting it down where the dot is now.
 * With nothing displaced the canvas is the text, pixel for pixel.
 */

const GRID = 0.038 // em
const GRID_OFFSET = 0.019 // em

// the mark's repel field (HifFlag), converted from the mark's units: the mark is 1.772em across 70 units
const UNIT = 1.772 / 70
const REPEL_RADIUS = 19 * UNIT // em
const REPEL_PUSH = 8.5 * UNIT // em
const REPEL_DRAG = 0.016
const STIFFNESS = 700
const DAMPING = 26

const INK = '#181818'

type Field = { width: number; size: number; n: number; rest: Float32Array; pos: Float32Array; vel: Float32Array }

/** the word rendered with its font, in device pixels; `pad` of room on every side for ink past the box */
type Sheet = { canvas: HTMLCanvasElement; dpr: number; size: number; width: number; pad: number; x: number; y: number }

function drawSheet(word: HTMLElement, dpr: number, canvas = document.createElement('canvas')): Sheet {
  const css = getComputedStyle(word)
  const size = parseFloat(css.fontSize)
  const box = word.getBoundingClientRect()
  const pad = Math.ceil(size * 0.1 * dpr)
  // the sheet's origin sits on a whole device pixel, so the glyphs keep the page's sub-pixel offsets
  const ox = Math.floor(box.left * dpr) - pad
  const oy = Math.floor(box.top * dpr) - pad
  canvas.width = Math.ceil(box.width * dpr) + 2 * pad + 1
  canvas.height = Math.ceil(box.height * dpr) + 2 * pad + 1
  const g = canvas.getContext('2d')!
  g.setTransform(dpr, 0, 0, dpr, -ox, -oy)
  g.font = `${css.fontWeight} ${size}px ${css.fontFamily}`
  g.fillStyle = INK
  const ascent = g.measureText('H').fontBoundingBoxAscent
  const walker = document.createTreeWalker(word, NodeFilter.SHOW_TEXT)
  const range = document.createRange()
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent ?? ''
    for (let i = 0; i < text.length; i++) {
      if (/\s/.test(text[i])) continue
      range.setStart(node, i)
      range.setEnd(node, i + 1)
      const r = range.getBoundingClientRect()
      g.fillText(text[i], r.left, r.top + ascent)
    }
  }
  return { canvas, dpr, size, width: box.width, pad, x: box.left * dpr, y: box.top * dpr }
}

/** whether the word has moved by a fraction of a device pixel since the sheet was drawn */
const offGrid = (now: number, then: number) => Math.abs(now - then - Math.round(now - then)) > 0.01

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
      // rows count from the baseline, the font's descent isn't a whole number of them
      const low = off - Math.ceil(descent / pitch) * pitch
      for (let x = off; x < adv; x += pitch) {
        for (let y = low; y < ascent; y += pitch) {
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
    let sheet: Sheet | null = null
    const moved: number[] = []
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

      const dpr = window.devicePixelRatio || 1
      if (
        !sheet ||
        sheet.dpr !== dpr ||
        sheet.size !== size ||
        Math.abs(sheet.width - box.width) > 0.5 ||
        offGrid(box.left * dpr, sheet.x) ||
        offGrid(box.top * dpr, sheet.y)
      ) {
        sheet = drawSheet(el, dpr, sheet?.canvas)
      }
      const S = sheet

      // the canvas only covers the name and the room its dots can be pushed into, not the whole screen; it
      // works in device pixels and sits on whole ones, so the sheet lands on the page's own pixels
      const margin = push + GRID * size + 4
      const left = Math.floor((box.left - margin) * dpr)
      const top = Math.floor((box.top - margin) * dpr)
      const cw = Math.ceil((box.width + 2 * margin) * dpr)
      const ch = Math.ceil((box.height + 2 * margin) * dpr)
      if (cv.width !== cw || cv.height !== ch) {
        cv.width = cw
        cv.height = ch
        cv.style.width = `${cw / dpr}px`
        cv.style.height = `${ch / dpr}px`
      }
      cv.style.left = `${left / dpr}px`
      cv.style.top = `${top / dpr}px`
      const ctx = cv.getContext('2d')!
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.imageSmoothingEnabled = false
      ctx.clearRect(0, 0, cw, ch)
      const sx = Math.floor(box.left * dpr) - S.pad
      const sy = Math.floor(box.top * dpr) - S.pad
      ctx.drawImage(S.canvas, sx - left, sy - top)

      // each displaced dot owns one cell of the grid (edges rounded the same way for neighbours, so the
      // cells tile): clear all of them first, then put every dot down where it is now
      const half = (GRID * size) / 2
      moved.length = 0
      for (let i = 0; i < F.n; i++) {
        if (Math.abs(F.pos[i * 2] - F.rest[i * 2]) * dpr >= 0.5 || Math.abs(F.pos[i * 2 + 1] - F.rest[i * 2 + 1]) * dpr >= 0.5) {
          moved.push(i)
        }
      }
      for (const i of moved) {
        const x0 = Math.round((box.left + F.rest[i * 2] - half) * dpr)
        const y0 = Math.round((box.top + F.rest[i * 2 + 1] - half) * dpr)
        const x1 = Math.round((box.left + F.rest[i * 2] + half) * dpr)
        const y1 = Math.round((box.top + F.rest[i * 2 + 1] + half) * dpr)
        ctx.clearRect(x0 - left, y0 - top, x1 - x0, y1 - y0)
      }
      for (const i of moved) {
        const x0 = Math.round((box.left + F.rest[i * 2] - half) * dpr)
        const y0 = Math.round((box.top + F.rest[i * 2 + 1] - half) * dpr)
        const x1 = Math.round((box.left + F.rest[i * 2] + half) * dpr)
        const y1 = Math.round((box.top + F.rest[i * 2 + 1] + half) * dpr)
        const dx = Math.round((F.pos[i * 2] - F.rest[i * 2]) * dpr)
        const dy = Math.round((F.pos[i * 2 + 1] - F.rest[i * 2 + 1]) * dpr)
        ctx.drawImage(S.canvas, x0 - sx, y0 - sy, x1 - x0, y1 - y0, x0 - left + dx, y0 - top + dy, x1 - x0, y1 - y0)
      }
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

  return <canvas ref={canvas} aria-hidden className="pointer-events-none fixed top-0 left-0 z-30 hidden" />
}
