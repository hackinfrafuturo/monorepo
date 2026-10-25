---
name: Infrastructure Hackathon
description: Dark ASCII stage. Date left. Title left on the field. One type size.
colors:
  bg: "#181818"
  ink: "#d6d4d0"
  muted: "#9a9890"
  invert: "#d6d4d0"
  primary: "#6d4aff"
  rule: "#3a3a3a"
typography:
  headline:
    fontFamily: "Geist Pixel Circle, ui-monospace, monospace"
    fontSize: "32px"
    fontWeight: 500
    lineHeight: "1.1"
    letterSpacing: "0"
  display:
    fontFamily: "Geist Pixel Circle, ui-monospace, monospace"
    fontSize: "48px"
    fontWeight: 500
    lineHeight: "1.1"
    letterSpacing: "0"
  body:
    fontFamily: "iA Writer Quattro, ui-monospace, monospace"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: "28px"
    letterSpacing: "0"
rounded:
  none: "0px"
spacing:
  pad: "16px"
  section: "64px"
  line: "18px"
components:
  invert-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.bg}"
    rounded: "{rounded.none}"
    padding: "0 4px"
    height: "18px"
---

## Overview

The first screen is On-Site: an empty dark stage, date on the left, Geist Pixel title and one-liner at the bottom of the field. Below the fold the page becomes Kernel: large Pixel titles, readable Quattro, a proof row, numbered asks, then the same facts.

Ground is `#181818`. Ink is `#d6d4d0`. Purple `#6d4aff` lives in the flag's red, passed through the ASCII field, and in focus. Geist Pixel Circle is for headlines. iA Writer Quattro is for everything else. Hero chrome stays 16px / 18px. The document opens up.

## Colors

Background `#181818`. Ink `#d6d4d0`. Muted `#9a9890` for supporting lines. Invert hover paints the ink as the field. Selection is the same invert. Purple is the flag's red in the ASCII field, and the focus ring.

## Typography

Geist Pixel Circle for the hero title, document titles, and proof figures. iA Writer Quattro for the date, the one-liner, and the document. Sentence case. Prose measure stays near 65ch. Hero title: 32 / 48 / 64. Section titles: 32 / 48. Proof figures: 32 / 48.

## Layout

Fixed header, 16px from the edges: `5-6 Dec 2026. Santiago de Chile` on the left. The stage is one viewport tall. The Pixel title sits bottom-left on the field, two lines: Infrastructure / Hackathon. The one-liner sits under it. Below the fold: 1060px, manifesto, four figures, numbered asks, orgs, tracks, tiers, then the mail.

## Elevation & Depth

No shadows, no blur, no cards. The depth is a slowed Chilean flag, drawn as ASCII, under the Pixel title.

## Shapes

Squares. Invert hover is a rectangle behind the glyphs. No pills, no buttons.

## Components

Links invert on hover. The title is Geist Pixel. Behind it, a looping flag video is sampled onto an ASCII grid through a shader, played at 0.75×. Under `prefers-reduced-motion` the video holds one frame. Source: Pixabay 313898 at `/brand/stage-313898.mp4`. Previous: Pexels 20452931 at `/brand/stage.mp4`.

## Do's and Don'ts

- Do keep the date, city, and duration on the first screen.
- Do change hierarchy with face and size in the document; keep the hero chrome at one size.
- Don't add a totem date, a mountain plate, or a marketing close.
