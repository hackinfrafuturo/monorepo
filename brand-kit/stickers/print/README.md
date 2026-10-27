# Hack Infra Futuro: stickers for print

11 die-cut stickers, all vector. `preview.png` shows them side by side at true relative size.

## Files

| Folder | What | Use it for |
|---|---|---|
| `artwork/` | One PDF per sticker: the design plus 1.5 mm bleed past the cut. No cut line. | Send to the printer |
| `cutlines/` | One PDF per sticker: only the die-cut path, a 0.25 pt magenta line. Same page size as the artwork, so they line up exactly. | Send to the printer with the artwork |
| `svg/` | Editable masters with three named layers: `bleed`, `art`, `CutContour` | Opening in Affinity, Illustrator or Inkscape |
| `all-11-artwork.pdf` | All 11 artwork files in one PDF, one per page | Quoting, proofing, emailing |

Everything is vector: no raster images and no live fonts. All type is converted to outlines.

## The stickers

Size is the cut size. The PDF pages are 4 mm larger in each direction (bleed plus a small margin).

| # | Sticker | Cut size | Cut shape | Suggested stock |
|---|---|---|---|---|
| 01 | Star (logo) | 55 × 55 mm | Contour, follows the dots | Matte vinyl |
| 02 | Dot flag | 79 × 58 mm | Contour, wavy | Matte vinyl |
| 03 | Andes at dusk | 62 mm | Circle | Matte vinyl |
| 04 | Postage stamp | 44 × 54 mm | Perforated rectangle | Matte vinyl or paper |
| 05 | Hola, mi humano se llama | 86 × 56 mm | Rounded rectangle | Writable matte (paper or uncoated vinyl) |
| 06 | Santiago 3:47 a.m. | 84 × 52 mm | Rounded rectangle | Matte vinyl |
| 07 | Deploy key | 50 × 50 mm | Rounded square | Gloss vinyl |
| 08 | Constellation | 60 mm | Circle | Matte vinyl |
| 09 | Volcano | 60 mm | Circle | Matte vinyl |
| 10 | Observatory | 80 × 54 mm | Rounded rectangle | Matte vinyl |
| 11 | Bajo en tokens | 49 × 49 mm | Octagon with white rim | Gloss vinyl |

## Notes for the printer

- **Colour.** Files are RGB. The brand purple is `#6d4aff`, a bright screen colour that is outside CMYK. Please convert with your usual profile and send a proof. Purple is the colour to check. Other colours: ground `#181818`, ink `#d6d4d0`, paper `#f4f3ef`.
- **Fine dots.** Stickers 03, 06, 08, 09 and 10 are halftones; the smallest dots are about 0.25 mm. Please confirm they hold on a proof.
- **Small type.** The smallest type is about 1.9 mm cap height (05, 04, 06). It should hold at 600 dpi or better.
- **Cut paths.** 01 and 02 have contour cuts, and 04 has a perforated edge with 1.25 mm notches. Please confirm your cutter handles them. 04 has no bleed past its notches because its edge is the paper colour.
- **White rim.** 01, 02 and 11 have a 2.2 mm white rim printed inside the cut. It's part of the artwork, not a separate white ink layer.
- **Cut line as a spot colour.** If your workflow needs the cut as a spot colour (e.g. `CutContour`), open the SVG in `svg/`. The `CutContour` layer is already separate, so you can assign the spot swatch there and export.

Contact: benjamin@velum-labs.com
