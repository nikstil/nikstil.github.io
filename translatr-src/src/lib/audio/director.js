// Maps game-state changes to sounds. Game logic stays audio-free: the director just
// watches the store and reacts. Component-local moments (a reel stopping, a pickaxe
// swing) call sfx() directly instead.

import { sfx, setAudioSettings, duckMusic, unlockAudio, prepareMusic } from './engine'

const MODAL_SFX = { bad: 'error', good: 'ascend', warn: 'uac' }
const TOAST_SFX = { bad: 'error', good: 'success', info: 'notify' }
// (The trap ad isn't one: it's meant to pass for an ordinary ad, so it gets no alarm or ducking.)
const isDanger = (s) => !!s.resetting || !!s.over || !!s.audit

function onChange(s, p) {
  if (s.audio !== p.audio) setAudioSettings(s.audio)

  if (s.ads.length > p.ads.length) sfx('popup')
  if (s.saveFilesLost > p.saveFilesLost || (s.resetting && !p.resetting)) sfx('shutdown')
  if (s.modal && s.modal !== p.modal && s.modal.sfx !== 'none') sfx(s.modal.sfx ?? MODAL_SFX[s.modal.tone] ?? 'notify')
  if (s.audit && s.audit !== p.audit) sfx('audit')
  if (s.scratches.length > p.scratches.length) sfx('scratch')
  if (s.catScratchIn != null && p.catScratchIn == null) sfx('hiss')
  if (s.achievementPopup && s.achievementPopup !== p.achievementPopup) sfx('achievement')
  if (s.checkout?.phase === 'done' && p.checkout?.phase !== 'done') sfx('kaching')
  if (s.receipt && s.receipt !== p.receipt) sfx('printer')
  if ((s.tos && !p.tos) || (s.captcha && !p.captcha)) sfx('uac')
  if (s.fomo && s.fomo !== p.fomo) sfx('ping')
  if (s.stamina === 0 && p.stamina > 0) sfx('exhausted')
  if ((s.stats.captchaFails ?? 0) > (p.stats.captchaFails ?? 0)) sfx('denied')
  if (s.pickaxeLevel > p.pickaxeLevel || s.staminaLevel > p.staminaLevel || Object.keys(s.skills).length > Object.keys(p.skills).length) sfx('levelup')
  if (s.autoMineEvent && s.autoMineEvent !== p.autoMineEvent) sfx('mine', { vol: 0.35 })

  // Toasts are background feedback: only sound if nothing more specific just played.
  const last = s.toasts.at(-1)
  if (last && !p.toasts.some((t) => t.id === last.id)) sfx(TOAST_SFX[last.tone] ?? 'notify', { low: true })

  // Dramatic moments lower the music; DOOMSCROLL.EXE plays its own soundtrack instead.
  const level = (st) => (st.shooterOpen ? 0 : isDanger(st) ? 0.25 : 1)
  if (level(s) !== level(p)) duckMusic(level(s))
}

/**
 * Wires audio to the app: store → sounds, first gesture → unlock + music,
 * button presses → click. Returns a cleanup function.
 */
export function startAudio(store) {
  setAudioSettings(store.getState().audio)
  const unsubscribe = store.subscribe(onChange)

  // Render the hold music in the background once the browser is idle (at most 3s from now:
  // idle callbacks can be deferred indefinitely in busy or throttled tabs).
  const idle = window.requestIdleCallback ?? ((fn) => setTimeout(fn, 1200))
  const cancelIdle = window.cancelIdleCallback ?? clearTimeout
  const idleId = idle(() => prepareMusic().catch(() => {}), { timeout: 3000 })

  const onPointer = (e) => {
    unlockAudio()
    const btn = e.target.closest?.('button')
    if (btn && !btn.disabled && !btn.closest('[data-nosfx]')) sfx('click')
  }
  const onKey = () => unlockAudio()
  document.addEventListener('pointerdown', onPointer, true)
  document.addEventListener('keydown', onKey, true)

  return () => {
    unsubscribe()
    cancelIdle(idleId)
    document.removeEventListener('pointerdown', onPointer, true)
    document.removeEventListener('keydown', onKey, true)
  }
}
