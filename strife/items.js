// What an inventory item looks like and what it's worth: pictures (guns painted with their skin,
// stickers, music kits), its rarity, its short name, and its value in credits. Shared by the
// inventory screen and SKINSINK.GG (the skins casino at /casino/).

import { WEAPONS } from './weapons.js'
import { gunIcon, drawnGunIcon } from './icons.js'
import {
  RARITY, CASES, STICKER_GRADE, skinById, caseById, stickerById, musicById, kindOf, wearOf, skinMaterial, stickerMaterial, stickerUrl, itemKey,
} from './skins.js'

// ---------------- Pictures of things
const musicIcons = new Map()
function musicIcon(id) {
  if (!musicIcons.has(id)) {
    const k = musicById[id]
    const c = document.createElement('canvas')
    c.width = 150
    c.height = 60
    const g = c.getContext('2d')
    const hue = (k.seed * 47) % 360
    const gr = g.createLinearGradient(0, 0, 150, 60)
    gr.addColorStop(0, `hsl(${hue} 60% 40%)`)
    gr.addColorStop(1, `hsl(${(hue + 60) % 360} 60% 22%)`)
    g.fillStyle = gr
    g.beginPath()
    g.roundRect(30, 4, 90, 52, 8)
    g.fill()
    g.fillStyle = '#fff'
    g.font = '30px sans-serif'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText('♫', 75, 31)
    musicIcons.set(id, c.toDataURL())
  }
  return musicIcons.get(id)
}
/** A picture of an item (a data URL). */
export function iconFor(it, w = 150, h = 60) {
  const kind = kindOf(it)
  if (kind === 'sticker') return stickerUrl(it.sticker)
  if (kind === 'music') return musicIcon(it.music)
  const s = skinById[it.skin]
  return gunIcon(s.weapon, w, h, { skin: skinMaterial(it), key: itemKey(it), stickers: (it.stickers ?? []).map(stickerMaterial) })
}
/** The same picture, but only if it's ready (drawing a skin the first time takes a moment): or null. */
export function drawnIcon(it, w = 150, h = 60) {
  const kind = kindOf(it)
  if (kind !== 'skin') return iconFor(it, w, h)
  return drawnGunIcon(skinById[it.skin].weapon, w, h, { key: itemKey(it) }) ?? null
}
/** Its rarity: { name, color }. */
export function rarityOf(it) {
  const kind = kindOf(it)
  if (kind === 'sticker') return { ...RARITY[stickerById[it.sticker]?.rarity ?? 'milspec'], name: STICKER_GRADE[stickerById[it.sticker]?.rarity ?? 'milspec'] }
  if (kind === 'music') return { ...RARITY.milspec, name: 'High Grade' }
  return RARITY[skinById[it.skin].rarity]
}
/** "AK-47 | Q3 Earnings" (no StatTrak™ or ★). */
export function shortName(it) {
  const kind = kindOf(it)
  if (kind === 'sticker') return `Sticker | ${stickerById[it.sticker]?.name}`
  if (kind === 'music') return `Music Kit | ${musicById[it.music]?.name}`
  const s = skinById[it.skin]
  return `${WEAPONS[s.weapon].name} | ${s.name}`
}

// ---------------- What things are worth (in credits)
// Rarer is worth more; so is a better float, StatTrak™, and stickers stuck on it. A key is 5.
const SKIN_VALUE = { consumer: 1, industrial: 1, milspec: 2, restricted: 8, classified: 30, covert: 120, gold: 600 }
const STICKER_VALUE = { milspec: 1, restricted: 4, classified: 15, covert: 60 }
const WEAR_MULT = { 'Factory New': 1.5, 'Minimal Wear': 1.2, 'Field-Tested': 1, 'Well-Worn': 0.85, 'Battle-Scarred': 0.7 }
const round2 = (v) => Math.round(v * 100) / 100
export function itemValue(it) {
  const kind = kindOf(it)
  if (kind === 'sticker') return STICKER_VALUE[stickerById[it.sticker]?.rarity] ?? 1
  if (kind === 'music') return it.st != null ? 16 : 10
  const s = skinById[it.skin]
  if (!s) return 0
  let v = SKIN_VALUE[s.rarity] * WEAR_MULT[wearOf(it.wear).name] * (it.st != null ? 1.6 : 1)
  for (const k of it.stickers ?? []) v += (STICKER_VALUE[stickerById[k]?.rarity] ?? 1) * 0.1
  return round2(v)
}
/** What a skin is worth Field-Tested, no StatTrak™ (for price lists). */
export const skinValue = (skinId) => SKIN_VALUE[skinById[skinId]?.rarity] ?? 0
/** What opening one of these is worth on average (a skin case, the sticker capsule or the music box). */
export function caseValue(caseId) {
  const c = caseById[caseId]
  if (!c) return 0
  if (c.kind === 'music') return 10.6
  if (c.kind === 'sticker') return round2(0.8 * 1 + 0.16 * 4 + 0.032 * 15 + 0.008 * 60)
  const pool = c.skins.map((id) => skinById[id])
  const present = [...new Set(pool.map((s) => s.rarity))]
  const total = present.reduce((t, r) => t + RARITY[r].odds, 0)
  // (floats cluster around Field-Tested; StatTrak™ one time in ten)
  return round2(present.reduce((t, r) => t + (RARITY[r].odds / total) * SKIN_VALUE[r], 0) * 1.06)
}
export const SKIN_CASES = CASES.filter((c) => !c.kind)
