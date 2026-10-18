import type { PointerEvent } from 'react'
import { defineSound, ensureReady } from '@web-kits/audio'
import { crisp } from './audio'

const hover = defineSound(crisp.hover)
const tap = defineSound(crisp.tap)

// Hovering can't unlock audio; only a click or key press can. Hover sounds
// scheduled while the context is suspended would all fire at once on resume.
let unlocked = false
const unlock = () => {
  unlocked = true
  void ensureReady()
}
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', unlock, { once: true, capture: true })
  window.addEventListener('keydown', unlock, { once: true, capture: true })
}

/** Crisp `hover` on mouse enter, `tap` on click. Spread onto the element. */
export const uiSound = {
  onPointerEnter: (e: PointerEvent) => {
    if (unlocked && e.pointerType === 'mouse') hover()
  },
  onClick: () => {
    tap()
  },
}
