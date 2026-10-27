import { defineSound, ensureReady, type VoiceHandle } from '@web-kits/audio'

const sounds = {
  jump: defineSound({
    source: { type: 'triangle', frequency: { start: 360, end: 780 } },
    envelope: { attack: 0.003, decay: 0.09, sustain: 0, release: 0.025 },
    gain: 0.1,
  }),
  land: defineSound({
    source: { type: 'sine', frequency: { start: 140, end: 55 } },
    envelope: { attack: 0.002, decay: 0.045, sustain: 0, release: 0.02 },
    gain: 0.12,
  }),
  duck: defineSound({
    source: { type: 'triangle', frequency: { start: 240, end: 110 } },
    envelope: { attack: 0.003, decay: 0.05, sustain: 0, release: 0.02 },
    gain: 0.07,
  }),
  crash: defineSound({
    layers: [
      {
        source: { type: 'triangle', frequency: { start: 200, end: 45 } },
        envelope: { attack: 0.003, decay: 0.18, sustain: 0, release: 0.06 },
        gain: 0.13,
      },
      {
        source: { type: 'noise', color: 'brown' },
        filter: { type: 'lowpass', frequency: 700 },
        envelope: { attack: 0.003, decay: 0.1, sustain: 0, release: 0.04 },
        gain: 0.08,
      },
    ],
  }),
}

const MUTE_KEY = 'hif-runner-muted'

export function createRunnerAudio() {
  let muted = false
  try { muted = localStorage.getItem(MUTE_KEY) === 'true' } catch { /* storage is optional */ }
  let context: AudioContext | undefined
  let ready: Promise<AudioContext | undefined> | undefined
  let voice: VoiceHandle | undefined
  let generation = 0

  const stop = () => {
    generation++
    voice?.stop()
    voice = undefined
  }

  return {
    get muted() { return muted },
    // Called only from a key press, tap, or the sound button, never from animation frames.
    unlock() {
      if (muted || document.hidden || context?.state === 'running') return
      ready = ensureReady().then((audio) => { context = audio; return audio }).catch(() => undefined)
    },
    play(name: keyof typeof sounds) {
      if (muted || document.hidden) return
      const version = generation
      const requestedAt = performance.now()
      const play = () => {
        if (muted || document.hidden || version !== generation || context?.state !== 'running') return
        try {
          voice?.stop()
          voice = sounds[name]()
        } catch { /* audio must never interrupt a game */ }
      }
      if (context?.state === 'running') play()
      else void ready?.then(() => {
        // Discard sounds if the browser took too long to unlock audio.
        if (performance.now() - requestedAt < 150) play()
      })
    },
    setMuted(value: boolean) {
      muted = value
      if (muted) stop()
      try { localStorage.setItem(MUTE_KEY, String(muted)) } catch { /* storage is optional */ }
    },
    stop,
  }
}
