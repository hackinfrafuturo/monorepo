/** The Hack Infra Futuro mark as dots (brand-kit C1). */

// 7 x 7 dot grid, pitch 10, radius 4. Star occupies rows 0–4; band is rows 5–6.
export const STAR: readonly [number, number][] = [
  [3, 0],
  [3, 1],
  [1, 2], [2, 2], [3, 2], [4, 2], [5, 2],
  [2, 3], [3, 3], [4, 3],
  [2, 4], [4, 4],
]
export const BAND: readonly [number, number][] = [5, 6].flatMap((y) =>
  [0, 1, 2, 3, 4, 5, 6].map((x) => [x, y] as [number, number]),
)
