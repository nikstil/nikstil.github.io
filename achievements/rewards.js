// Rewards for achievement points, claimed on the hub (/achievements/): nikstilOS wallpapers and a
// theme, and COUNTER-STRIFE cases, keys and a knife. What's claimed lives in this browser, like the
// achievements; COUNTER-STRIFE things go into 'strife-gifts', which its inventory unpacks.

const KEY = 'nikstil-rewards'
const GIFTS = 'strife-gifts'

export const REWARDS = [
  { id: 'r-case', at: 25, icon: '📦', name: 'A case and a key', desc: 'A Synergy Case for COUNTER-STRIFE, and the key to open it.', gift: { cases: ['synergy'], keys: 1 } },
  { id: 'r-wall-dust', at: 50, icon: '🏜️', name: 'Wallpaper: Dust II', desc: 'A desert afternoon for the nikstilOS desktop.', wallpaper: 'dust' },
  { id: 'r-keys', at: 100, icon: '🔑', name: 'Two keys and a sticker capsule', desc: 'For COUNTER-STRIFE.', gift: { keys: 2, cases: ['capsule'] } },
  { id: 'r-wall-lawn', at: 150, icon: '🌱', name: 'Wallpaper: Front Lawn', desc: 'Freshly mown. Zombie-free (for now).', wallpaper: 'lawn' },
  { id: 'r-theme-terminal', at: 200, icon: '🖥️', name: 'Theme: Terminal', desc: 'Green on black, the whole desktop. Like a hacker in a film.', theme: 'terminal' },
  { id: 'r-music', at: 300, icon: '🎵', name: 'A music kit box and a key', desc: 'For COUNTER-STRIFE: your own round-start tune.', gift: { keys: 1, cases: ['musicbox'] } },
  { id: 'r-wall-grid', at: 400, icon: '🌆', name: 'Wallpaper: Midnight Grid', desc: 'A neon sun setting on an endless grid.', wallpaper: 'grid' },
  { id: 'r-cases', at: 500, icon: '🎁', name: 'Two cases and two keys', desc: 'A Quarterly Case and an Overtime Case for COUNTER-STRIFE.', gift: { keys: 2, cases: ['quarterly', 'overtime'] } },
  { id: 'r-wall-elite', at: 750, icon: '🌍', name: 'Wallpaper: The Global Elite', desc: 'For people who take this seriously.', wallpaper: 'elite' },
  { id: 'r-knife', at: 1000, icon: '★', name: 'A knife', desc: 'A ★ knife for COUNTER-STRIFE, straight into your inventory. No case, no key, no gambling.', gift: { knife: true } },
]
export const WALLPAPERS = [
  { id: 'dust', name: 'Dust II', reward: 'r-wall-dust' },
  { id: 'lawn', name: 'Front Lawn', reward: 'r-wall-lawn' },
  { id: 'grid', name: 'Midnight Grid', reward: 'r-wall-grid' },
  { id: 'elite', name: 'The Global Elite', reward: 'r-wall-elite' },
]

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null')
    return v && typeof v.claimed === 'object' ? v : { claimed: {} }
  } catch {
    return { claimed: {} }
  }
}
/** id -> when it was claimed. */
export const claimed = () => read().claimed
export const isClaimed = (id) => !!claimed()[id]
export const rewardById = (id) => REWARDS.find((r) => r.id === id)
/** Is this theme (or wallpaper) unlocked? (Ones that aren't rewards always are.) */
export const themeUnlocked = (id) => {
  const r = REWARDS.find((x) => x.theme === id)
  return !r || isClaimed(r.id)
}
export const wallpaperUnlocked = (id) => {
  const w = WALLPAPERS.find((x) => x.id === id)
  return !!w && isClaimed(w.reward)
}

/** Claims a reward with `points` to spend (they're never used up: it's a track). Returns '' or why not. */
export function claim(id, points) {
  const r = rewardById(id)
  if (!r) return 'There’s no such reward.'
  const s = read()
  if (s.claimed[id]) return 'Already claimed.'
  if (points < r.at) return `You need ${r.at - points} more points.`
  if (r.gift) {
    try {
      const list = JSON.parse(localStorage.getItem(GIFTS) || '[]')
      list.push({ ...r.gift, from: 'Achievement rewards', at: Date.now() })
      localStorage.setItem(GIFTS, JSON.stringify(list.slice(-50)))
    } catch {
      return 'Couldn’t save that (is storage switched off?).'
    }
  }
  s.claimed[id] = Date.now()
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    return 'Couldn’t save that (is storage switched off?).'
  }
  return ''
}
