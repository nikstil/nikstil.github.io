// Weapons and equipment. Damage is per bullet before armour and hit location; speed is how fast
// you run holding it (m/s); spread is in radians; recoil is a pattern the spray climbs through.

export const SLOTS = { primary: 1, pistol: 2, knife: 3, grenade: 4, bomb: 5 }

// A spray pattern: [yaw, pitch] kick (radians) for each bullet in a burst.
function pattern(n, climb, sway) {
  const out = []
  for (let i = 0; i < n; i++) {
    const up = Math.min(i, 9) * climb + Math.max(0, i - 9) * climb * 0.15
    const side = i < 8 ? 0 : Math.sin((i - 8) * 0.45) * sway * Math.min(1, (i - 8) / 4)
    out.push([side, up])
  }
  return out
}

// Speeds are CS units scaled to metres (250 u/s = 6.35 m/s).
const U = 6.35 / 250
// How each kind sits in the buy menu, and what a bot treats as its range (m).
export const KINDS = { pistol: 'Pistols', smg: 'SMGs', heavy: 'Heavy', rifle: 'Rifles', sniper: 'Rifles' }

/** A gun from CS-style numbers: rpm, speed in units/s, spread multipliers. */
function gun(id, o) {
  const rate = o.rpm / 60
  const kick = o.kick ?? 0.016
  return {
    id, slot: o.kind === 'pistol' ? 'pistol' : 'primary', auto: false, reward: 300, pellets: 1,
    spread: 0.004, moveSpread: 0.07, airSpread: 0.2, range: 0.9, reload: 2.5,
    sound: 'rifle', ...o, rate, speed: o.speed * U,
    scopedSpeed: o.scopedSpeed ? o.scopedSpeed * U : undefined,
    recoil: o.recoil ?? pattern(o.mag, kick, o.sway ?? kick * 1.2),
  }
}

export const WEAPONS = {
  knife: { id: 'knife', name: 'Knife', slot: 'knife', kind: 'knife', dmg: 40, alt: 65, range: 1.8, rate: 2.3, speed: 6.35, price: 0 },

  // ---- Pistols
  glock: gun('glock', { name: 'Glock-18', kind: 'pistol', team: 'T', price: 200, dmg: 30, pen: 0.47, rpm: 400, mag: 20, reserve: 120, reload: 2.2, speed: 240, spread: 0.006, moveSpread: 0.03, airSpread: 0.1, range: 0.85, kick: 0.012, sound: 'pistol', modes: 'burst', look: 'glock' }),
  usp: gun('usp', { name: 'USP-S', kind: 'pistol', team: 'CT', price: 200, dmg: 35, pen: 0.505, rpm: 352, mag: 12, reserve: 24, reload: 2.2, speed: 240, spread: 0.004, moveSpread: 0.028, airSpread: 0.1, range: 0.91, kick: 0.014, sound: 'pistol', modes: 'silencer', silenced: true, look: 'usp' }),
  p2000: gun('p2000', { name: 'P2000', kind: 'pistol', team: 'CT', price: 200, dmg: 35, pen: 0.505, rpm: 352, mag: 13, reserve: 52, reload: 2.2, speed: 240, spread: 0.0045, moveSpread: 0.03, airSpread: 0.1, range: 0.91, kick: 0.014, sound: 'pistol', look: 'p2000' }),
  dualies: gun('dualies', { name: 'Dual Berettas', kind: 'pistol', price: 300, dmg: 38, pen: 0.575, rpm: 500, mag: 30, reserve: 120, reload: 3.8, speed: 240, spread: 0.007, moveSpread: 0.035, airSpread: 0.1, range: 0.79, kick: 0.012, sound: 'pistol', look: 'dualies' }),
  p250: gun('p250', { name: 'P250', kind: 'pistol', price: 300, dmg: 38, pen: 0.64, rpm: 400, mag: 13, reserve: 26, reload: 2.2, speed: 240, spread: 0.006, moveSpread: 0.035, airSpread: 0.1, range: 0.85, kick: 0.016, sound: 'pistol', look: 'p250' }),
  fiveseven: gun('fiveseven', { name: 'Five-SeveN', kind: 'pistol', team: 'CT', price: 500, dmg: 32, pen: 0.911, rpm: 400, mag: 20, reserve: 100, reload: 2.2, speed: 240, spread: 0.006, moveSpread: 0.032, airSpread: 0.1, range: 0.81, kick: 0.016, sound: 'pistol', look: 'fiveseven' }),
  tec9: gun('tec9', { name: 'Tec-9', kind: 'pistol', team: 'T', price: 500, dmg: 33, pen: 0.903, rpm: 500, mag: 18, reserve: 90, reload: 2.5, speed: 240, spread: 0.007, moveSpread: 0.03, airSpread: 0.1, range: 0.83, kick: 0.017, sound: 'pistol', look: 'tec9' }),
  cz75: gun('cz75', { name: 'CZ75-Auto', kind: 'pistol', price: 500, reward: 100, dmg: 31, pen: 0.776, rpm: 600, mag: 12, reserve: 12, reload: 2.7, speed: 240, auto: true, spread: 0.007, moveSpread: 0.035, airSpread: 0.1, range: 0.85, kick: 0.015, sound: 'pistol', look: 'cz75' }),
  deagle: gun('deagle', { name: 'Desert Eagle', kind: 'pistol', price: 700, dmg: 53, pen: 0.932, rpm: 267, mag: 7, reserve: 35, reload: 2.2, speed: 230, spread: 0.006, moveSpread: 0.07, airSpread: 0.16, range: 0.81, kick: 0.04, sway: 0.01, sound: 'deagle', look: 'deagle' }),
  r8: gun('r8', { name: 'R8 Revolver', kind: 'pistol', price: 600, dmg: 86, pen: 0.932, rpm: 120, mag: 8, reserve: 8, reload: 2.3, speed: 220, spread: 0.005, moveSpread: 0.08, airSpread: 0.16, range: 0.94, kick: 0.05, sway: 0.01, sound: 'deagle', prime: 0.35, look: 'r8' }),

  // ---- SMGs
  mac10: gun('mac10', { name: 'MAC-10', kind: 'smg', team: 'T', price: 1050, reward: 600, dmg: 29, pen: 0.575, rpm: 800, mag: 30, reserve: 100, reload: 2.6, speed: 240, auto: true, spread: 0.011, moveSpread: 0.02, airSpread: 0.09, range: 0.8, kick: 0.009, sway: 0.014, sound: 'smg', look: 'mac10' }),
  mp9: gun('mp9', { name: 'MP9', kind: 'smg', team: 'CT', price: 1250, reward: 600, dmg: 26, pen: 0.6, rpm: 857, mag: 30, reserve: 120, reload: 2.1, speed: 240, auto: true, spread: 0.009, moveSpread: 0.02, airSpread: 0.09, range: 0.87, kick: 0.009, sway: 0.012, sound: 'smg', look: 'mp9' }),
  mp7: gun('mp7', { name: 'MP7', kind: 'smg', price: 1500, reward: 600, dmg: 29, pen: 0.625, rpm: 800, mag: 30, reserve: 120, reload: 3.1, speed: 220, auto: true, spread: 0.007, moveSpread: 0.02, airSpread: 0.09, range: 0.85, kick: 0.009, sway: 0.01, sound: 'smg', look: 'mp7' }),
  mp5: gun('mp5', { name: 'MP5-SD', kind: 'smg', price: 1500, reward: 600, dmg: 27, pen: 0.625, rpm: 750, mag: 30, reserve: 120, reload: 2.6, speed: 235, auto: true, spread: 0.007, moveSpread: 0.018, airSpread: 0.09, range: 0.85, kick: 0.008, sway: 0.01, sound: 'smg', silenced: true, look: 'mp5' }),
  ump45: gun('ump45', { name: 'UMP-45', kind: 'smg', price: 1200, reward: 600, dmg: 35, pen: 0.65, rpm: 666, mag: 25, reserve: 100, reload: 3.5, speed: 230, auto: true, spread: 0.008, moveSpread: 0.022, airSpread: 0.09, range: 0.75, kick: 0.011, sway: 0.012, sound: 'smg', look: 'ump45' }),
  p90: gun('p90', { name: 'P90', kind: 'smg', price: 2350, reward: 300, dmg: 26, pen: 0.69, rpm: 857, mag: 50, reserve: 100, reload: 3.3, speed: 230, auto: true, spread: 0.009, moveSpread: 0.022, airSpread: 0.09, range: 0.86, kick: 0.007, sway: 0.01, sound: 'smg', look: 'p90' }),
  bizon: gun('bizon', { name: 'PP-Bizon', kind: 'smg', price: 1400, reward: 600, dmg: 27, pen: 0.575, rpm: 750, mag: 64, reserve: 120, reload: 2.4, speed: 240, auto: true, spread: 0.011, moveSpread: 0.022, airSpread: 0.09, range: 0.8, kick: 0.007, sway: 0.012, sound: 'smg', look: 'bizon' }),

  // ---- Heavy: shotguns (pellets) and machine guns
  nova: gun('nova', { name: 'Nova', kind: 'heavy', type: 'shotgun', price: 1050, reward: 900, dmg: 26, pellets: 9, pen: 0.5, rpm: 68, mag: 8, reserve: 32, reload: 3.6, speed: 220, spread: 0.05, moveSpread: 0.02, airSpread: 0.1, range: 0.7, kick: 0.04, sound: 'shotgun', look: 'nova' }),
  xm1014: gun('xm1014', { name: 'XM1014', kind: 'heavy', type: 'shotgun', price: 2000, reward: 600, dmg: 20, pellets: 6, pen: 0.8, rpm: 171, mag: 7, reserve: 32, reload: 3.4, speed: 215, auto: true, spread: 0.055, moveSpread: 0.02, airSpread: 0.1, range: 0.7, kick: 0.03, sound: 'shotgun', look: 'xm1014' }),
  sawedoff: gun('sawedoff', { name: 'Sawed-Off', kind: 'heavy', type: 'shotgun', team: 'T', price: 1100, reward: 900, dmg: 32, pellets: 8, pen: 0.75, rpm: 71, mag: 7, reserve: 32, reload: 3.6, speed: 210, spread: 0.075, moveSpread: 0.02, airSpread: 0.1, range: 0.45, kick: 0.045, sound: 'shotgun', look: 'sawedoff' }),
  mag7: gun('mag7', { name: 'MAG-7', kind: 'heavy', type: 'shotgun', team: 'CT', price: 1300, reward: 900, dmg: 30, pellets: 8, pen: 0.75, rpm: 71, mag: 5, reserve: 32, reload: 2.5, speed: 225, spread: 0.04, moveSpread: 0.02, airSpread: 0.1, range: 0.45, kick: 0.045, sound: 'shotgun', look: 'mag7' }),
  m249: gun('m249', { name: 'M249', kind: 'heavy', type: 'mg', price: 5200, reward: 300, dmg: 32, pen: 0.8, rpm: 750, mag: 100, reserve: 200, reload: 5.7, speed: 195, auto: true, spread: 0.01, moveSpread: 0.1, airSpread: 0.25, range: 0.97, kick: 0.012, sway: 0.02, sound: 'mg', look: 'm249' }),
  negev: gun('negev', { name: 'Negev', kind: 'heavy', type: 'mg', price: 1700, reward: 300, dmg: 35, pen: 0.71, rpm: 800, mag: 150, reserve: 300, reload: 5.7, speed: 150, auto: true, spread: 0.02, moveSpread: 0.1, airSpread: 0.25, range: 0.97, kick: 0.01, sway: 0.02, sound: 'mg', settles: true, look: 'negev' }),

  // ---- Rifles
  galil: gun('galil', { name: 'Galil AR', kind: 'rifle', team: 'T', price: 1800, dmg: 30, pen: 0.775, rpm: 666, mag: 35, reserve: 90, reload: 3.0, speed: 215, auto: true, spread: 0.0045, moveSpread: 0.09, airSpread: 0.2, range: 0.98, kick: 0.016, sway: 0.02, sound: 'm4', look: 'galil' }),
  famas: gun('famas', { name: 'FAMAS', kind: 'rifle', team: 'CT', price: 2050, dmg: 30, pen: 0.7, rpm: 666, mag: 25, reserve: 90, reload: 3.3, speed: 220, auto: true, spread: 0.0045, moveSpread: 0.085, airSpread: 0.2, range: 0.96, kick: 0.015, sway: 0.02, sound: 'm4', modes: 'burst', look: 'famas' }),
  ak47: gun('ak47', { name: 'AK-47', kind: 'rifle', team: 'T', price: 2700, dmg: 36, pen: 0.775, rpm: 600, mag: 30, reserve: 90, reload: 2.5, speed: 215, auto: true, spread: 0.0035, moveSpread: 0.09, airSpread: 0.2, range: 0.98, kick: 0.019, sway: 0.022, sound: 'ak', look: 'ak47' }),
  m4a4: gun('m4a4', { name: 'M4A4', kind: 'rifle', team: 'CT', price: 3100, dmg: 33, pen: 0.7, rpm: 666, mag: 30, reserve: 90, reload: 3.1, speed: 225, auto: true, spread: 0.003, moveSpread: 0.08, airSpread: 0.2, range: 0.97, kick: 0.016, sway: 0.018, sound: 'm4', look: 'm4a4' }),
  m4a1s: gun('m4a1s', { name: 'M4A1-S', kind: 'rifle', team: 'CT', price: 2900, dmg: 38, pen: 0.7, rpm: 600, mag: 20, reserve: 80, reload: 3.1, speed: 225, auto: true, spread: 0.0025, moveSpread: 0.08, airSpread: 0.2, range: 0.99, kick: 0.014, sway: 0.014, sound: 'm4', modes: 'silencer', silenced: true, look: 'm4a1s' }),
  sg553: gun('sg553', { name: 'SG 553', kind: 'rifle', team: 'T', price: 3000, dmg: 30, pen: 1.0, rpm: 545, mag: 30, reserve: 90, reload: 2.8, speed: 210, scopedSpeed: 150, auto: true, spread: 0.004, scopedSpread: 0.002, moveSpread: 0.09, airSpread: 0.2, range: 0.98, kick: 0.017, sway: 0.02, sound: 'ak', zoom: [45], look: 'sg553' }),
  aug: gun('aug', { name: 'AUG', kind: 'rifle', team: 'CT', price: 3300, dmg: 28, pen: 0.9, rpm: 600, mag: 30, reserve: 90, reload: 3.8, speed: 220, scopedSpeed: 150, auto: true, spread: 0.004, scopedSpread: 0.002, moveSpread: 0.085, airSpread: 0.2, range: 0.98, kick: 0.015, sway: 0.018, sound: 'm4', zoom: [45], look: 'aug' }),
  ssg08: gun('ssg08', { name: 'SSG 08', kind: 'sniper', price: 1700, dmg: 88, pen: 0.85, rpm: 48, mag: 10, reserve: 90, reload: 3.7, speed: 230, scopedSpeed: 230, spread: 0.05, scopedSpread: 0.0012, moveSpread: 0.1, airSpread: 0.05, range: 0.98, kick: 0.035, sway: 0, sound: 'scout', zoom: [40, 15], bolt: true, look: 'ssg08' }),
  awp: gun('awp', { name: 'AWP', kind: 'sniper', price: 4750, reward: 100, dmg: 115, pen: 0.975, rpm: 41, mag: 5, reserve: 30, reload: 3.6, speed: 200, scopedSpeed: 100, spread: 0.08, scopedSpread: 0.0008, moveSpread: 0.15, airSpread: 0.3, range: 0.99, kick: 0.04, sway: 0, sound: 'awp', zoom: [40, 15], bolt: true, look: 'awp' }),
  g3sg1: gun('g3sg1', { name: 'G3SG1', kind: 'sniper', team: 'T', price: 5000, dmg: 80, pen: 0.825, rpm: 240, mag: 20, reserve: 90, reload: 4.7, speed: 215, scopedSpeed: 120, auto: true, spread: 0.06, scopedSpread: 0.0015, moveSpread: 0.15, airSpread: 0.3, range: 0.98, kick: 0.022, sway: 0.01, sound: 'auto', zoom: [40, 15], look: 'g3sg1' }),
  scar20: gun('scar20', { name: 'SCAR-20', kind: 'sniper', team: 'CT', price: 5000, dmg: 80, pen: 0.825, rpm: 240, mag: 20, reserve: 90, reload: 3.1, speed: 215, scopedSpeed: 120, auto: true, spread: 0.06, scopedSpread: 0.0015, moveSpread: 0.15, airSpread: 0.3, range: 0.98, kick: 0.022, sway: 0.01, sound: 'auto', zoom: [40, 15], look: 'scar20' }),

  // ---- Zeus x27: one charge, point blank
  zeus: { id: 'zeus', name: 'Zeus x27', slot: 'zeus', kind: 'taser', pellets: 1, price: 200, reward: 0, dmg: 500, pen: 1, rate: 1, mag: 1, reserve: 0, reload: 0, speed: 6.1, range: 1, reach: 3.6, spread: 0.002, moveSpread: 0.01, airSpread: 0.05, recoil: [[0, 0.01]], sound: 'zeus', look: 'zeus' },

  // ---- Grenades
  he: { id: 'he', name: 'HE Grenade', slot: 'grenade', kind: 'grenade', nade: 'he', price: 300, speed: 6.1, fuse: 1.6 },
  flash: { id: 'flash', name: 'Flashbang', slot: 'grenade', kind: 'grenade', nade: 'flash', price: 200, speed: 6.1, fuse: 1.6, carry: 2 },
  smoke: { id: 'smoke', name: 'Smoke Grenade', slot: 'grenade', kind: 'grenade', nade: 'smoke', price: 300, speed: 6.1, fuse: 1.8 },
  molotov: { id: 'molotov', name: 'Molotov', slot: 'grenade', kind: 'grenade', nade: 'fire', team: 'T', price: 400, speed: 6.1, fuse: 2.0, group: 'fire' },
  incendiary: { id: 'incendiary', name: 'Incendiary', slot: 'grenade', kind: 'grenade', nade: 'fire', team: 'CT', price: 500, speed: 6.1, fuse: 2.0, group: 'fire' },
  decoy: { id: 'decoy', name: 'Decoy Grenade', slot: 'grenade', kind: 'grenade', nade: 'decoy', price: 50, speed: 6.1, fuse: 2.0 },
  bomb: { id: 'bomb', name: 'C4', slot: 'bomb', kind: 'bomb', speed: 6.1, price: 0 },
}
export const MAX_GRENADES = 4

/**
 * Aiming down the sights (right mouse), for every gun without a scope: how much the view zooms in
 * and how long it takes to get the sights up. Guns with a scope use the scope instead.
 */
export function adsOf(w) {
  if (!w?.mag || w.zoom || w.kind === 'taser') return null
  if (w.kind === 'pistol') return { fov: 0.86, time: 0.14 }
  if (w.kind === 'smg') return { fov: 0.82, time: 0.18 }
  if (w.type === 'shotgun') return { fov: 0.88, time: 0.2 }
  if (w.type === 'mg') return { fov: 0.8, time: 0.3 }
  return { fov: 0.76, time: 0.22 }
}

// The buy menu, by category, as in CS: five per row. Team-only items show for that team.
export const SHOP = [
  { cat: 'Pistols', items: ['glock', 'usp', 'p2000', 'dualies', 'p250', 'tec9', 'fiveseven', 'cz75', 'deagle', 'r8'] },
  { cat: 'Mid-Tier', items: ['mac10', 'mp9', 'mp7', 'mp5', 'ump45', 'p90', 'bizon', 'nova', 'xm1014', 'sawedoff', 'mag7', 'm249', 'negev'] },
  { cat: 'Rifles', items: ['galil', 'famas', 'ak47', 'm4a4', 'm4a1s', 'sg553', 'aug', 'ssg08', 'awp', 'g3sg1', 'scar20'] },
  { cat: 'Grenades', items: ['he', 'flash', 'smoke', 'molotov', 'incendiary', 'decoy'] },
  { cat: 'Gear', items: ['vest', 'vesthelm', 'kit', 'zeus'] },
]
export const GEAR = {
  vest: { id: 'vest', name: 'Kevlar Vest', price: 650 },
  vesthelm: { id: 'vesthelm', name: 'Kevlar + Helmet', price: 1000 },
  kit: { id: 'kit', name: 'Defuse Kit', price: 400, team: 'CT' },
}

export const ECONOMY = {
  start: 800,
  max: 16000,
  win: { elimination: 3250, bomb: 3500, defuse: 3500, time: 3250 },
  loss: [1400, 1900, 2400, 2900, 3400],
  plantBonus: 800, // to every T when the bomb was planted but they lost
  plant: 300, // to the planter
  defuse: 300,
}

/** Damage to a body after armour, the way the classics do it. */
export function applyDamage(target, raw, pen, part) {
  const mult = part === 'head' ? 4 : part === 'stomach' ? 1.25 : part === 'legs' ? 0.75 : 1
  let dmg = raw * mult
  let armorLoss = 0
  const armoured = part === 'head' ? target.helmet && target.armor > 0 : part !== 'legs' && target.armor > 0
  if (armoured) {
    const reduced = dmg * pen
    armorLoss = Math.min(target.armor, (dmg - reduced) * 0.5)
    dmg = reduced
  }
  return { dmg: Math.round(dmg), armorLoss: Math.round(armorLoss) }
}
