# Hack Infra Futuro: brand kit

The Chilean flag's star drawn in dots, standing on a purple band. Purple takes the place of the flag's red, as it does across the site.

## What's in here

| Folder | What | Use it for |
|---|---|---|
| `logo/svg/` | Master logo files (text converted to outlines, so no fonts needed) | Website, Figma, anything that scales |
| `logo/png/` | The same logos as transparent PNGs (mark 1024 px, lockups 2400 px wide) | Word, Google Docs, Slides, Canva, email |
| `web/icons/` | Favicons, Apple touch icon, PWA icons | Website `<head>` |
| `web/` | `brand.css`, `tokens.json`, `head-snippet.html`, `site.webmanifest` | Website setup |
| `social/` | Instagram profile pictures, post, story, OG image, LinkedIn and X banners | Ready to upload |
| `print/` | A3 poster (vector PDF, plus PNG preview) | Printing, screens at the venue |
| `documents/` | A4 letterhead (`.docx`, opens in Word, Google Docs and Pages) | Letters, sponsor proposals, one-pagers |
| `fonts/` | Geist Pixel Circle (`.ttf` for desktop, `.woff2` for web) | Install before editing designs |

## Logo versions

File names follow `hif-<version>-<colorway>`.

- **mark**: the star and band alone. Profile pictures, favicons, stickers, anywhere square.
- **horizontal**: mark plus "Hack Infra / Futuro" on two lines. **This is the default.**
- **oneline**: mark plus the name on one line. Wide, short spaces: website headers, email signatures, banners.
- **stacked**: name centered under the mark. Centered layouts: badges, lanyards, the stage.
- **wordmark**: the name alone. Only where the mark already appears nearby.

Colorways:

- **dark**: light star and text, purple band. Use it on `#181818` or on dark photos. This is the primary colorway.
- **light**: black star and text, purple band. Use it on white or `#f4f3ef`.
- **white** / **black**: one color. Use it on purple or busy photos, on single-color print (t-shirts, stamps, laser engraving), and in fax-grade situations.

## Clear space and minimum size

- Keep empty space around the logo equal to **two dots of the mark**: 2/7 of the mark's width, on every side.
- The mark alone is legible down to **16 px** on screen or **6 mm** in print.
- The horizontal lockup needs at least **120 px** or **30 mm** wide. Below that, use the mark alone.

## Color

| | Hex | RGB | Role |
|---|---|---|---|
| Ground | `#181818` | 24 24 24 | Background. The brand lives on dark. |
| Ink | `#d6d4d0` | 214 212 208 | Text and the star on dark |
| Muted | `#9a9890` | 154 152 144 | Supporting text on dark |
| Purple | `#6d4aff` | 109 74 255 | The band. The only accent. |
| Paper | `#f4f3ef` | 244 243 239 | Light background |
| Black | `#181818` | 24 24 24 | Text and the star on light |

Purple is a bright screen color, so print a proof before running large jobs. Don't add other accent colors.

## Type

- **Geist Pixel Circle** is for the name, headlines and big numbers. Use sentence case and the font's default spacing. It's included in `fonts/` under the SIL Open Font License.
- **iA Writer Quattro** is for everything else: dates, body copy, captions. It's free from [github.com/iaolo/iA-Fonts](https://github.com/iaolo/iA-Fonts), or `@fontsource/ia-writer-quattro` on npm. The letterhead asks for "iA Writer Quattro S", so install it before editing, or Word will substitute another font.

## The band

The dotted purple band is the brand's second element. Use it as a rule under the name, or along the bottom edge of posters, slides and social posts. Size its dots to roughly match the mark's dots in the same layout. On the web, use the `.hif-band` class in `brand.css`, which always ends on a whole dot.

## Don'ts

- Don't recolor the star purple or the band any color other than purple (or the one-color version).
- Don't rearrange, rotate, outline or add shadows to the dots.
- Don't stretch or squash the logo. Scale it proportionally.
- Don't set the name in another font, and don't retype it next to the mark. Use the lockup files.
- Don't put the dark colorway on light backgrounds, or the reverse.
- Don't add the full flag's blue or red.

## Website setup

1. Copy `web/icons/` to `/icons/` and `web/site.webmanifest` to the site root.
2. Copy `social/og-image-1200x630.png` to `/og-image.png`.
3. Paste `web/head-snippet.html` into `<head>`.
4. For the header logo, use `logo/svg/hif-horizontal-dark.svg` (or `hif-oneline-dark.svg` in tight spaces). Inline it or use it as an `<img>`, at 32–48 px tall.

## Social

- **Instagram profile**: upload `instagram-profile-dark-1080.png`. The mark stays inside the circle crop. Purple and light versions are also included.
- **Post** (4:5) and **story** (9:16): ready to post. The story keeps the top 250 px and bottom 340 px clear of Instagram's interface.
- **OG image**: what shows up when someone shares hackinfrafuturo.cl in WhatsApp, Slack or LinkedIn.
- **LinkedIn / X banners**: the left side is left empty so the profile photo doesn't cover anything.
