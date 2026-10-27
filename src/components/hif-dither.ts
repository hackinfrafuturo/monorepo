/**
 * The Hack Infra Futuro mark as a dithered 64 × 64 dot field, in the mark's 70 × 70 units.
 *
 * The logo is Chile's flag in dots (FLAG): a black square top left with a white star cut out of it, the
 * white field as pale dots, and the purple lower half (the band): every one an even grid of dots.
 *
 * The games also need the star as an object (DITHER.rider): a five-point star, raised like a low faceted
 * pyramid and lit from the top left, Bayer-dithered into dots with a solid one-dot outline. It is what the
 * flag's star turns into once it leaves the square.
 *
 * Computed once at load.
 */

const N = 64
const PITCH = 70 / N
/** dot radius in the mark's units */
export const DITHER_R = PITCH * 0.46

const RIDER_CENTER = [35, 25] as const
const BOARD_CENTER = [35, 60] as const

/** the flag is 3:2, as Chile's: 105 × 70 units, the same 70-unit height and dot pitch as the old square mark */
export const FLAG_W = 105
const FLAG_COLS = Math.round(FLAG_W / PITCH)
/** the band's centre: half way across the flag, and the old band's height (60) so the games' maths holds */
export const BAND_CX = FLAG_W / 2
/** where the flag's top half (square and white field) ends and the purple band starts */
export const FLAG_SPLIT = 35
/** the band's darkness down its height: solid, a clean grid of dots like the rest of the flag */
const bandDark = (_py: number) => 1

export type RiderDotData = {
  dx: number
  dy: number
  /** position relative to the star's centre (the root every limb bends from) */
  lx: number
  ly: number
  /** which point of the star this dot belongs to: 0 head, 1 right arm, 2 right leg, 3 left leg, 4 left arm */
  limb: number
  /** how much it bends with its limb: 0 in the core, 1 at the tip */
  bend: number
  /** pump sink, from the shoulders (most) to the feet (least) */
  sink: number
  stiffness: number
  damping: number
}
export type BoardDotData = { bx: number; by: number; along: number; across: number }

/** the star's five points as limbs, in rider-centre coordinates (y down) */
export const STAR_CENTER_DY = 50 / (1 + Math.cos((36 * Math.PI) / 180)) - 25
export const LIMB_ANGLES = [-90, -18, 54, 126, 198] // head, right arm, right leg, left leg, left arm
/** star centre to tip, in the mark's units; the star's centre is at (35, STAR_R) */
export const STAR_R = 50 / (1 + Math.cos((36 * Math.PI) / 180))

const BAYER8 = [
  [0, 32, 8, 40, 2, 34, 10, 42], [48, 16, 56, 24, 50, 18, 58, 26], [12, 44, 4, 36, 14, 46, 6, 38], [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41], [51, 19, 59, 27, 49, 17, 57, 25], [15, 47, 7, 39, 13, 45, 5, 37], [63, 31, 55, 23, 61, 29, 53, 21],
]

const SINK = [2.2, 2, 1.7, 1.2, 0.2]

function build() {
  // the star: point up, tip-to-feet height 50
  const R = 50 / (1 + Math.cos((36 * Math.PI) / 180))
  const CX = 35
  const CY = R
  const K = 0.382
  const V: [number, number][] = []
  for (let i = 0; i < 10; i++) {
    const a = ((-90 + i * 36) * Math.PI) / 180
    const r = i % 2 === 0 ? R : R * K
    V.push([CX + r * Math.cos(a), CY + r * Math.sin(a)])
  }
  // facets: centre raised, lit from the top left
  const H = 9
  const L = (() => {
    const l = [-0.55, -0.65, 0.52]
    const n = Math.hypot(...l)
    return l.map((c) => c / n)
  })()
  const lam: number[] = []
  for (let i = 0; i < 10; i++) {
    const [ax, ay] = V[i]
    const [bx, by] = V[(i + 1) % 10]
    const u = [bx - CX, by - CY, -H]
    const w = [ax - CX, ay - CY, -H]
    let n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]
    const len = Math.hypot(...n)
    n = n.map((c) => c / len)
    if (n[2] < 0) n = n.map((c) => -c)
    lam.push(Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]))
  }
  const lo = Math.min(...lam)
  const hi = Math.max(...lam)
  const shade = lam.map((l) => (l - lo) / (hi - lo))

  const inside = (x: number, y: number) => {
    let c = false
    for (let i = 0, j = 9; i < 10; j = i++) {
      const [xi, yi] = V[i]
      const [xj, yj] = V[j]
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c
    }
    return c
  }

  // per cell: star coverage, darkness, band
  const S = 4
  const cov: number[][] = []
  const dark: number[][] = []
  const band: boolean[][] = []
  const bdark: number[][] = []
  for (let y = 0; y < N; y++) {
    cov.push([])
    dark.push([])
    band.push([])
    bdark.push([])
    for (let x = 0; x < N; x++) {
      let cv = 0
      let dk = 0
      let bandCount = 0
      let bk = 0
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const px = (x + (sx + 0.5) / S) * PITCH
          const py = (y + (sy + 0.5) / S) * PITCH
          if (py >= FLAG_SPLIT) {
            bandCount++
            bk += bandDark(py)
          }
          if (py < 50 && inside(px, py)) {
            cv++
            const ang = (((Math.atan2(py - CY, px - CX) * 180) / Math.PI + 90) % 360 + 360) % 360
            dk += 1 - 0.82 * Math.pow(shade[Math.floor(ang / 36)], 1.2)
          }
        }
      }
      cov[y].push(cv / (S * S))
      dark[y].push(dk / (S * S))
      band[y].push(bandCount / (S * S) > 0.5)
      bdark[y].push(bk / (S * S))
    }
  }

  const star = (x: number, y: number) => x >= 0 && y >= 0 && x < N && y < N && cov[y][x] >= 0.5
  const rider: RiderDotData[] = []
  const board: BoardDotData[] = []
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const t = (BAYER8[y % 8][x % 8] + 0.5) / 64
      const cx = (x + 0.5) * PITCH
      const cy = (y + 0.5) * PITCH
      if (!star(x, y)) continue
      const edge = !(star(x - 1, y) && star(x + 1, y) && star(x, y - 1) && star(x, y + 1))
      if (!edge && !(dark[y][x] > t)) continue
      const dx = cx - RIDER_CENTER[0]
      const dy = cy - RIDER_CENTER[1]
      // 0 at the tip, 1 at the feet
      const h = Math.min(1, Math.max(0, (dy + 25) / 50))
      const row = h * 4
      const i0 = Math.min(3, Math.floor(row))
      const sink = SINK[i0] + (SINK[i0 + 1] - SINK[i0]) * (row - i0)
      // limb rig: which point it belongs to, and how far out along it (the core stays put)
      const lx = dx
      const ly = dy - STAR_CENTER_DY
      const ang = (Math.atan2(ly, lx) * 180) / Math.PI
      let limb = 0
      let best = 1e9
      LIMB_ANGLES.forEach((t, li) => {
        const d = Math.abs(((ang - t + 540) % 360) - 180)
        if (d < best) {
          best = d
          limb = li
        }
      })
      const radius = Math.hypot(lx, ly)
      const bend = Math.pow(Math.min(1, Math.max(0, (radius - 8) / (STAR_R - 8))), 1.3)
      // jelly: tips softer than the core, the same all the way round (no head-to-feet shear)
      const jitter = 1 + (((x * 7919 + y * 104729) % 97) / 97 - 0.5) * 0.06
      rider.push({
        dx,
        dy,
        sink,
        lx,
        ly,
        limb,
        bend,
        stiffness: (760 - 360 * bend) * jitter,
        damping: 26 - 9 * bend,
      })
    }
  }
  // the band: the full width of the flag (its darkness only changes down it)
  for (let y = 0; y < N; y++) {
    if (!band[y][0]) continue
    for (let x = 0; x < FLAG_COLS; x++) {
      const cx = (x + 0.5) * PITCH
      const cy = (y + 0.5) * PITCH
      if (bdark[y][0] > (BAYER8[y % 8][x % 8] + 0.5) / 64) {
        board.push({ bx: cx - BAND_CX, by: cy - BOARD_CENTER[1], along: cx / FLAG_W, across: (cy - FLAG_SPLIT) / (70 - FLAG_SPLIT) })
      }
    }
  }
  return { rider, board }
}

export const DITHER = build()

/**
 * The band as rows that repeat every 8 columns: its darkness only changes down the band and the dither
 * is a Bayer 8 × 8, so it can be drawn at any width. `dy` is relative to the band's centre (BAND_CX, 60);
 * column `col` sits at x = (col + 0.5) × DITHER_PITCH, the same columns as the flag.
 */
export const DITHER_PITCH = PITCH
export const BAND_ROWS = (() => {
  const rows: { row: number; dy: number; dark: number }[] = []
  const S = 4
  for (let y = 0; y < N; y++) {
    let n = 0
    let dk = 0
    for (let sy = 0; sy < S; sy++) {
      const py = (y + (sy + 0.5) / S) * PITCH
      if (py < FLAG_SPLIT) continue
      n++
      dk += bandDark(py)
    }
    if (n / S > 0.5) rows.push({ row: y, dy: (y + 0.5) * PITCH - BOARD_CENTER[1], dark: dk / S })
  }
  return rows
})()
export const bandHas = (row: (typeof BAND_ROWS)[number], col: number) => row.dark > (BAYER8[row.row % 8][((col % 8) + 8) % 8] + 0.5) / 64

// ---------------------------------------------------------------------------------------------------------
// the star as one sprite, for the games: drawn once at 8 px per unit, centred on the star's centre

/** star centre to the tips of the two lower points */
export const STAR_FEET = 50 - STAR_R
/** half the sprite's size, in the mark's units */
export const SPRITE_EXT = STAR_R + DITHER_R + 0.5

export function starSprite(ink: string) {
  const U = 8
  const c = document.createElement('canvas')
  c.width = c.height = Math.ceil(SPRITE_EXT * 2 * U)
  const g = c.getContext('2d')!
  g.fillStyle = ink
  g.beginPath()
  for (const d of DITHER.rider) {
    const x = (d.lx + SPRITE_EXT) * U
    const y = (d.ly + SPRITE_EXT) * U
    g.moveTo(x + DITHER_R * U, y)
    g.arc(x, y, DITHER_R * U, 0, Math.PI * 2)
  }
  g.fill()
  return c
}

// ---------------------------------------------------------------------------------------------------------
// the flag: the black square with the star cut out, and the white field beside it

/** the star in the square: its centre (the circle through its five tips) and tip radius, in mark units */
export const FLAG_STAR = { x: FLAG_SPLIT / 2, y: FLAG_SPLIT / 2 + 1, r: 9.5 }
export const FLAG_FIELD = '#e3e0d9'

/** dot centres in mark units: the square (every dot, ink) and the white field (every dot, a pale grey) */
export const FLAG = (() => {
  const square: number[] = []
  const field: number[] = []
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < FLAG_COLS; x++) {
      const cx = (x + 0.5) * PITCH
      const cy = (y + 0.5) * PITCH
      if (cy >= FLAG_SPLIT) continue
      if (cx < FLAG_SPLIT) square.push(cx, cy)
      else field.push(cx, cy)
    }
  }
  return { square: Float32Array.from(square), field: Float32Array.from(field) }
})()

/** where the star is: centre, tip radius and rotation (degrees), in whatever units the caller uses */
export type StarPose = { x: number; y: number; r: number; rot: number }

const STAR_K = 0.382 // inner radius / tip radius, as the dithered star
const UNIT_STAR = Array.from({ length: 10 }, (_, i) => {
  const a = ((-90 + i * 36) * Math.PI) / 180
  const r = i % 2 === 0 ? 1 : STAR_K
  return [Math.cos(a) * r, Math.sin(a) * r] as const
})

/** Signed distance from (px, py) to the star's outline: negative inside. */
export function starDistance(px: number, py: number, s: StarPose) {
  const a = (-s.rot * Math.PI) / 180
  const dx = px - s.x
  const dy = py - s.y
  // into the star's own frame, in tip radii
  const ux = (dx * Math.cos(a) - dy * Math.sin(a)) / s.r
  const uy = (dx * Math.sin(a) + dy * Math.cos(a)) / s.r
  let best = Infinity
  let inside = false
  for (let i = 0, j = 9; i < 10; j = i++) {
    const [xi, yi] = UNIT_STAR[i]
    const [xj, yj] = UNIT_STAR[j]
    if (yi > uy !== yj > uy && ux < ((xj - xi) * (uy - yi)) / (yj - yi) + xi) inside = !inside
    const ex = xi - xj
    const ey = yi - yj
    const t = Math.max(0, Math.min(1, ((ux - xj) * ex + (uy - yj) * ey) / (ex * ex + ey * ey)))
    best = Math.min(best, Math.hypot(ux - xj - ex * t, uy - yj - ey * t))
  }
  return (inside ? -best : best) * s.r
}

/**
 * How big a square dot is next to the star: 0 inside it, full size a dot away from it, shrinking smoothly
 * across the outline, so the cut-out moves without dots popping in and out. `r` is the dot radius.
 */
export function holeScale(d: number, r: number) {
  const s = Math.max(0, Math.min(1, 0.5 + d / (1.2 * r)))
  // no specks: a dot that would be tiny is left out
  return s < 0.55 ? 0 : s
}

/**
 * Draws the flag's top half (square and white field) at a mark placed at (left, top) with `k` pixels per
 * unit, the star cut out of the square wherever `star` is (in pixels). `pos` can override dot positions
 * (square then field, in mark units) for a moving field.
 */
export function drawFlagTop(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  k: number,
  star: StarPose,
  ink: string,
  pos?: { square: Float32Array; field: Float32Array },
  image?: { canvas: HTMLCanvasElement; scale: number },
) {
  const r = DITHER_R * k
  // only dots this close to the star's centre can be inside it or on its edge
  const reach = star.r + 2 * r
  const side = FLAG_SPLIT * k
  const clear = star.x + reach < left || star.x - reach > left + side || star.y + reach < top || star.y - reach > top + side
  if (image && !pos && clear) {
    ctx.drawImage(image.canvas, left, top, (image.canvas.width / image.scale) * k, (image.canvas.height / image.scale) * k)
    return
  }
  const sq = pos?.square ?? FLAG.square
  const fd = pos?.field ?? FLAG.field
  ctx.fillStyle = FLAG_FIELD
  ctx.beginPath()
  for (let i = 0; i < fd.length; i += 2) {
    const x = left + fd[i] * k
    const y = top + fd[i + 1] * k
    ctx.moveTo(x + r, y)
    ctx.arc(x, y, r, 0, Math.PI * 2)
  }
  ctx.fill()
  ctx.fillStyle = ink
  ctx.beginPath()
  for (let i = 0; i < sq.length; i += 2) {
    const x = left + sq[i] * k
    const y = top + sq[i + 1] * k
    const near = Math.abs(x - star.x) < reach && Math.abs(y - star.y) < reach
    const rr = near ? r * holeScale(starDistance(x, y, star), r) : r
    if (rr < 0.05) continue
    ctx.moveTo(x + rr, y)
    ctx.arc(x, y, rr, 0, Math.PI * 2)
  }
  ctx.fill()
}

/**
 * Draws the game star (the sprite) as it comes out of the flag: inside the square it is still the cut-out,
 * so it only shows there as the square fades (`flag` is the square's opacity); outside it, it's the star.
 * `ext` is the sprite's half size in pixels; the caller has already moved the canvas to the star's centre
 * and rotated it. `rect` is the square, in the canvas's coordinates before that move.
 */
export function drawStarFromFlag(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement,
  ext: number,
  alpha: number,
  flag: number,
  rect: { x: number; y: number; w: number; h: number },
  toLocal: () => void,
) {
  const draw = (a: number, clip: (c: CanvasRenderingContext2D) => void) => {
    if (a <= 0.01) return
    ctx.save()
    clip(ctx)
    toLocal()
    ctx.globalAlpha = a
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(sprite, -ext, -ext, ext * 2, ext * 2)
    ctx.restore()
  }
  if (flag <= 0.001) {
    draw(alpha, () => {})
    return
  }
  // outside the square: the star as itself
  draw(alpha, (c) => {
    c.beginPath()
    c.rect(-1e5, -1e5, 2e5, 2e5)
    c.rect(rect.x, rect.y, rect.w, rect.h)
    c.clip('evenodd')
  })
  // inside it: only as the square fades away
  draw(alpha * (1 - flag), (c) => {
    c.beginPath()
    c.rect(rect.x, rect.y, rect.w, rect.h)
    c.clip()
  })
}

// ---------------------------------------------------------------------------------------------------------
// the band, pre-drawn: it repeats every 8 columns, so one 8-column tile drawn once covers any width with a
// handful of image copies a frame (instead of thousands of dots), and a column can still be moved on its own

export type BandTile = { canvas: HTMLCanvasElement; scale: number; top: number; height: number }
const TILE_COLS = 8

/**
 * The 8-column tile of the band's rows that `keep` accepts, at `scale` pixels per mark unit. `top` and
 * `height` are its extent in mark units, relative to the band's centre (BAND_CX, 60).
 */
export function bandTile(scale: number, color: string, keep: (row: (typeof BAND_ROWS)[number]) => boolean): BandTile {
  const rows = BAND_ROWS.filter(keep)
  const top = Math.min(...rows.map((r) => r.dy)) - DITHER_R - 0.5
  const height = Math.max(...rows.map((r) => r.dy)) + DITHER_R + 0.5 - top
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(TILE_COLS * PITCH * scale)
  canvas.height = Math.ceil(height * scale)
  const g = canvas.getContext('2d')!
  g.fillStyle = color
  g.beginPath()
  for (let col = 0; col < TILE_COLS; col++) {
    for (const row of rows) {
      if (!bandHas(row, col)) continue
      const x = (col + 0.5) * PITCH * scale
      const y = (row.dy - top) * scale
      g.moveTo(x + DITHER_R * scale, y)
      g.arc(x, y, DITHER_R * scale, 0, Math.PI * 2)
    }
  }
  g.fill()
  return { canvas, scale, top, height }
}

/**
 * Draws band columns `first`…`last` (column c sits at x = (c + 0.5) × DITHER_PITCH in the flag) from a tile,
 * the band centred at (x, y) with `k` pixels per unit and scrolled left by `scroll` units. `shift(c)` moves a
 * column down (a dip); columns it leaves at 0 are copied in runs, the rest one by one.
 */
export function drawBandTile(
  ctx: CanvasRenderingContext2D,
  tile: BandTile,
  x: number,
  y: number,
  k: number,
  scroll: number,
  first: number,
  last: number,
  shift?: (col: number) => number,
) {
  const colW = PITCH * tile.scale
  const destW = PITCH * k
  const dy = y + tile.top * k
  const dh = tile.height * k
  const colX = (c: number) => x + (c * PITCH - BAND_CX - scroll) * k
  let c = first
  while (c <= last) {
    const s = shift ? shift(c) : 0
    if (s !== 0) {
      const j = ((c % TILE_COLS) + TILE_COLS) % TILE_COLS
      ctx.drawImage(tile.canvas, j * colW, 0, colW, tile.canvas.height, colX(c), dy + s, destW, dh)
      c++
      continue
    }
    // a run of unshifted columns, up to the end of this tile
    const j = ((c % TILE_COLS) + TILE_COLS) % TILE_COLS
    let n = Math.min(TILE_COLS - j, last - c + 1)
    if (shift) for (let m = 1; m < n; m++) if (shift(c + m) !== 0) n = m
    ctx.drawImage(tile.canvas, j * colW, 0, n * colW, tile.canvas.height, colX(c), dy, n * destW, dh)
    c += n
  }
}

/**
 * The flag's top half (square and white field) pre-drawn at `scale` pixels per unit, with no star cut out:
 * while the star is clear of the square it is one image copy instead of three thousand dots.
 */
export function flagTopImage(scale: number, ink: string) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(FLAG_W * scale)
  canvas.height = Math.ceil(FLAG_SPLIT * scale)
  const g = canvas.getContext('2d')!
  const r = DITHER_R * scale
  for (const [dots, color] of [
    [FLAG.field, FLAG_FIELD],
    [FLAG.square, ink],
  ] as const) {
    g.fillStyle = color
    g.beginPath()
    for (let i = 0; i < dots.length; i += 2) {
      g.moveTo(dots[i] * scale + r, dots[i + 1] * scale)
      g.arc(dots[i] * scale, dots[i + 1] * scale, r, 0, Math.PI * 2)
    }
    g.fill()
  }
  return { canvas, scale }
}
