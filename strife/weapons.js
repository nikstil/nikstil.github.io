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

export const WEAPONS = {
  knife: { id: 'knife', name: 'Knife', slot: 'knife', kind: 'knife', dmg: 40, alt: 65, range: 1.8, rate: 2.3, speed: 6.35, price: 0 },
  glock: {
    id: 'glock', name: '9mm Pistol', slot: 'pistol', kind: 'pistol', team: 'T', price: 200, reward: 300,
    dmg: 30, pen: 0.47, rate: 6.7, mag: 20, reserve: 120, reload: 2.2, speed: 6.1, auto: false,
    spread: 0.006, moveSpread: 0.03, airSpread: 0.1, range: 0.85, recoil: pattern(20, 0.012, 0.004), sound: 'pistol',
  },
  usp: {
    id: 'usp', name: 'Silenced Pistol', slot: 'pistol', kind: 'pistol', team: 'CT', price: 200, reward: 300,
    dmg: 35, pen: 0.5, rate: 5.9, mag: 12, reserve: 24, reload: 2.2, speed: 6.1, auto: false,
    spread: 0.004, moveSpread: 0.028, airSpread: 0.1, range: 0.89, recoil: pattern(12, 0.014, 0.004), sound: 'silenced',
  },
  deagle: {
    id: 'deagle', name: 'Desert Hawk', slot: 'pistol', kind: 'pistol', price: 700, reward: 300,
    dmg: 63, pen: 0.93, rate: 3.6, mag: 7, reserve: 35, reload: 2.2, speed: 5.85, auto: false,
    spread: 0.006, moveSpread: 0.07, airSpread: 0.16, range: 0.81, recoil: pattern(7, 0.04, 0.01), sound: 'deagle',
  },
  smg: {
    id: 'smg', name: 'SMG-9', slot: 'primary', kind: 'smg', price: 1250, reward: 600,
    dmg: 26, pen: 0.6, rate: 14, mag: 30, reserve: 120, reload: 2.1, speed: 6.1, auto: true,
    spread: 0.009, moveSpread: 0.02, airSpread: 0.09, range: 0.87, recoil: pattern(30, 0.009, 0.012), sound: 'smg',
  },
  ak47: {
    id: 'ak47', name: 'AK-47', slot: 'primary', kind: 'rifle', team: 'T', price: 2700, reward: 300,
    dmg: 36, pen: 0.775, rate: 10, mag: 30, reserve: 90, reload: 2.5, speed: 5.46, auto: true,
    spread: 0.0035, moveSpread: 0.09, airSpread: 0.2, range: 0.98, recoil: pattern(30, 0.019, 0.022), sound: 'ak',
  },
  m4: {
    id: 'm4', name: 'M4', slot: 'primary', kind: 'rifle', team: 'CT', price: 3100, reward: 300,
    dmg: 33, pen: 0.7, rate: 11.1, mag: 30, reserve: 90, reload: 3.0, speed: 5.72, auto: true,
    spread: 0.003, moveSpread: 0.08, airSpread: 0.2, range: 0.97, recoil: pattern(30, 0.016, 0.018), sound: 'm4',
  },
  awp: {
    id: 'awp', name: 'AWP', slot: 'primary', kind: 'sniper', price: 4750, reward: 100,
    dmg: 115, pen: 0.975, rate: 0.68, mag: 5, reserve: 30, reload: 3.6, speed: 5.08, scopedSpeed: 2.6, auto: false,
    spread: 0.08, scopedSpread: 0.0008, moveSpread: 0.15, airSpread: 0.3, range: 0.99, recoil: pattern(5, 0.04, 0), sound: 'awp', zoom: [40, 15],
  },
  he: { id: 'he', name: 'HE Grenade', slot: 'grenade', kind: 'grenade', nade: 'he', price: 300, speed: 6.1, fuse: 1.6 },
  flash: { id: 'flash', name: 'Flashbang', slot: 'grenade', kind: 'grenade', nade: 'flash', price: 200, speed: 6.1, fuse: 1.6 },
  smoke: { id: 'smoke', name: 'Smoke Grenade', slot: 'grenade', kind: 'grenade', nade: 'smoke', price: 300, speed: 6.1, fuse: 1.8 },
  bomb: { id: 'bomb', name: 'Bomb', slot: 'bomb', kind: 'bomb', speed: 6.1, price: 0 },
}

// The buy menu, by category. Team-only items show for that team.
export const SHOP = [
  { cat: 'Pistols', items: ['glock', 'usp', 'deagle'] },
  { cat: 'SMGs', items: ['smg'] },
  { cat: 'Rifles', items: ['ak47', 'm4', 'awp'] },
  { cat: 'Grenades', items: ['he', 'flash', 'smoke'] },
  { cat: 'Gear', items: ['vest', 'vesthelm', 'kit'] },
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
