// Every achievement on nikstil.com, worked out from each game's own save (they all live in this
// site's localStorage). The hub (/achievements/) shows them; pages can call check() to pop a toast
// for anything newly unlocked.

const read = (k) => {
  try {
    return JSON.parse(localStorage.getItem(k) ?? 'null')
  } catch {
    return null
  }
}
/** COUNTER-STRIFE ranks: the most ranked matches played and the best skill group reached (on this device or online). */
function strifeRank() {
  const local = read('strife-rank') ?? {}
  const online = read('strife-rank-online') ?? {}
  const placed = (x) => (x.matches ?? 0) >= 3
  const at = [0, 750, 850, 950, 1050, 1150, 1250, 1350, 1450, 1550, 1650, 1750, 1850, 1950, 2050, 2150, 2250, 2350]
  const tier = (r) => at.filter((t) => r >= t).length - 1
  return {
    matches: Math.max(local.matches ?? 0, online.matches ?? 0),
    best: Math.max(placed(local) ? local.best ?? 0 : -1, placed(online) ? Math.max(online.best_tier ?? 0, tier(online.rating ?? 0)) : -1),
  }
}
/** Everything the checks need, read once. */
export function readSaves() {
  const tr = read('translatr-save')
  return {
    translatr: tr?.state ?? null,
    doom: read('doomscroll-save') ?? {},
    grass: read('touchgrass-save') ?? null,
    phone: read('touchphone-save') ?? null,
    loggle: read('loggle-save') ?? null,
    strife: read('strife-stats') ?? {},
    strifeRecord: read('strife-record') ?? {},
    strifeInv: read('strife-inventory') ?? null,
    strifeRank: strifeRank(),
    feats: read('nikstilos-feats') ?? {},
    kevin: read('kevin-gotchi'),
    arg: Number(read('nikstilos-arg')) || 0,
  }
}

export const GAMES = [
  { id: 'strife', name: 'COUNTER-STRIFE', icon: '💣', url: '/strife/', color: '#e8a33d' },
  { id: 'translatr', name: 'TRANSLATR™', icon: '🌐', url: '/translatr/', color: '#3da6e8' },
  { id: 'doom', name: 'DOOMSCROLL.EXE', icon: '👹', url: '/doomscroll/', color: '#c0392b' },
  { id: 'grass', name: 'LAWN OF THE DEAD', icon: '🌱', url: '/touchgrass/', color: '#4caf50' },
  { id: 'phone', name: 'BRAINS FIRST', icon: '🧠', url: '/touchphone/', color: '#9b59b6' },
  { id: 'loggle', name: 'LOGGLE', icon: '🟩', url: '/loggle/', color: '#2e8b3a' },
  { id: 'site', name: 'nikstil.com', icon: '🖥️', url: '/', color: '#7f8c8d' },
]

// progress helper: [current, target] -> a check result
const P = (cur, max) => ({ done: cur >= max, cur: Math.min(cur, max), max })
const B = (v) => ({ done: !!v })
const st = (s) => s.strife
const n = (v) => (typeof v === 'number' ? v : 0)

/**
 * id, game, name, desc, icon, points, check(saves) -> { done, cur?, max? }. `secret` ones hide
 * their description until unlocked.
 */
export const ACHIEVEMENTS = [
  // ---------------- COUNTER-STRIFE
  { id: 'cs-first', game: 'strife', icon: '🩸', name: 'First Blood', desc: 'Get a kill.', points: 5, check: (s) => P(n(st(s).kills), 1) },
  { id: 'cs-100', game: 'strife', icon: '💀', name: 'Body Count', desc: 'Get 100 kills.', points: 20, check: (s) => P(n(st(s).kills), 100) },
  { id: 'cs-1000', game: 'strife', icon: '☠️', name: 'Terminator', desc: 'Get 1,000 kills.', points: 50, check: (s) => P(n(st(s).kills), 1000) },
  { id: 'cs-hs', game: 'strife', icon: '🎯', name: 'Headhunter', desc: 'Get 50 headshot kills.', points: 20, check: (s) => P(n(st(s).headshots), 50) },
  { id: 'cs-ace', game: 'strife', icon: '🂡', name: 'Ace', desc: 'Kill all five enemies in a single round.', points: 30, check: (s) => B(st(s).aces) },
  { id: 'cs-clutch', game: 'strife', icon: '🧊', name: 'Ice in the Veins', desc: 'Win a round as the last one alive against two or more.', points: 25, check: (s) => B(st(s).clutches) },
  { id: 'cs-plant', game: 'strife', icon: '💣', name: 'The Bomb Has Been Planted', desc: 'Plant the bomb 10 times.', points: 10, check: (s) => P(n(st(s).plants), 10) },
  { id: 'cs-defuse', game: 'strife', icon: '✂️', name: 'Wire Cutter', desc: 'Defuse the bomb 10 times.', points: 15, check: (s) => P(n(st(s).defuses), 10) },
  { id: 'cs-ninja', game: 'strife', icon: '🥷', name: 'Ninja Defuse', desc: 'Defuse the bomb with less than a second to spare.', points: 25, check: (s) => B(st(s).ninja) },
  { id: 'cs-knife', game: 'strife', icon: '🔪', name: 'Knife to a Gunfight', desc: 'Kill someone with the knife.', points: 10, check: (s) => B(n(st(s).byWeapon?.knife)) },
  { id: 'cs-zeus', game: 'strife', icon: '⚡', name: 'Shocking', desc: 'Kill someone with the Zeus x27.', points: 10, check: (s) => B(n(st(s).byWeapon?.zeus)) },
  { id: 'cs-fire', game: 'strife', icon: '🔥', name: 'Burn Notice', desc: 'Kill someone with a molotov or an incendiary.', points: 10, check: (s) => B(n(st(s).byWeapon?.molotov) + n(st(s).byWeapon?.incendiary)) },
  { id: 'cs-he', game: 'strife', icon: '💥', name: 'Frag Out', desc: 'Kill someone with an HE grenade.', points: 10, check: (s) => B(n(st(s).byWeapon?.he)) },
  { id: 'cs-noscope', game: 'strife', icon: '👀', name: 'No-Scope', desc: 'Kill someone with a sniper rifle without scoping in.', points: 20, check: (s) => B(st(s).noscopes) },
  { id: 'cs-blind', game: 'strife', icon: '😵', name: 'Blind Fury', desc: 'Kill someone while you are flashed.', points: 15, check: (s) => B(st(s).blindKills) },
  { id: 'cs-air', game: 'strife', icon: '🦘', name: 'Airborne', desc: 'Kill someone while you are in the air.', points: 15, check: (s) => B(st(s).airKills) },
  { id: 'cs-arsenal', game: 'strife', icon: '🗄️', name: 'Arsenal', desc: 'Get kills with 20 different weapons.', points: 25, check: (s) => P(Object.keys(st(s).byWeapon ?? {}).length, 20) },
  { id: 'cs-win', game: 'strife', icon: '🏆', name: 'Victory', desc: 'Win a match.', points: 10, check: (s) => P(n(s.strifeRecord.wins), 1) },
  { id: 'cs-10wins', game: 'strife', icon: '🥇', name: 'Veteran', desc: 'Win 10 matches.', points: 25, check: (s) => P(n(s.strifeRecord.wins), 10) },
  { id: 'cs-nuke', game: 'strife', icon: '☢️', name: 'Nuclear Option', desc: 'Win a match on Nuke.', points: 10, check: (s) => B(st(s).winsOn?.nuke) },
  { id: 'cs-tour', game: 'strife', icon: '🗺️', name: 'World Tour', desc: 'Win a match on every map.', points: 30, check: (s) => P(['dust2', 'mirage', 'nuke', 'inferno', 'overpass', 'vertigo'].filter((m) => st(s).winsOn?.[m]).length, 6) },
  { id: 'cs-vertigo', game: 'strife', icon: '🏙️', name: 'Head for Heights', desc: 'Win a match on Vertigo.', points: 10, check: (s) => B(st(s).winsOn?.vertigo) },
  { id: 'cs-modes', game: 'strife', icon: '🎮', name: 'Variety Pack', desc: 'Win a game of Wingman, Retakes, Deathmatch and Arms Race.', points: 25, check: (s) => P(['wingman', 'retakes', 'deathmatch', 'armsrace'].filter((m) => st(s).winsMode?.[m]).length, 4) },
  { id: 'cs-golden', game: 'strife', icon: '🔪', name: 'Golden Knife', desc: 'Win Arms Race yourself, with the last knife kill.', points: 25, check: (s) => B(st(s).armsWins) },
  { id: 'cs-expert', game: 'strife', icon: '🧠', name: 'Expert Opinion', desc: 'Win a match against Expert bots.', points: 30, check: (s) => B(st(s).expertWin) },
  { id: 'cs-mvp', game: 'strife', icon: '⭐', name: 'Most Valuable', desc: 'Be the round MVP 10 times.', points: 15, check: (s) => P(n(st(s).mvps), 10) },
  { id: 'cs-case', game: 'strife', icon: '📦', name: 'Unboxing Video', desc: 'Open a case.', points: 5, check: (s) => P(n(s.strifeInv?.opened), 1) },
  { id: 'cs-10cases', game: 'strife', icon: '🎰', name: 'Problem Gambler', desc: 'Open 10 cases.', points: 15, check: (s) => P(n(s.strifeInv?.opened), 10) },
  { id: 'cs-covert', game: 'strife', icon: '🟥', name: 'Covert Operation', desc: 'Unbox a Covert skin.', points: 25, check: (s) => B(s.strifeInv?.items?.some((i) => (i.kind ?? 'skin') === 'skin' && i.r === 'covert')) },
  { id: 'cs-knifeskin', game: 'strife', icon: '★', name: '★ Rare Special Item', desc: 'Unbox a knife.', points: 50, check: (s) => B(s.strifeInv?.items?.some((i) => i.skin?.startsWith('knife-'))) },
  { id: 'cs-tradeup', game: 'strife', icon: '📝', name: 'Contract Signed', desc: 'Complete a trade-up contract.', points: 10, check: (s) => B(s.strifeInv?.tradeUps) },
  { id: 'cs-sticker', game: 'strife', icon: '🏷️', name: 'Sticker Collector', desc: 'Put four stickers on one gun.', points: 10, check: (s) => B(s.strifeInv?.items?.some((i) => (i.stickers ?? []).length >= 4)) },
  { id: 'cs-music', game: 'strife', icon: '🎵', name: 'DJ', desc: 'Equip a music kit.', points: 5, check: (s) => B(s.strifeInv?.equipped?.music) },
  { id: 'cs-trade', game: 'strife', icon: '🤝', name: 'Fair Trade', desc: 'Trade with another player online.', points: 15, check: (s) => B(s.strifeInv?.trades) },
  { id: 'cs-drip', game: 'strife', icon: '🎨', name: 'Fashion Week', desc: 'Have five skins equipped at once.', points: 10, check: (s) => P(Object.keys(s.strifeInv?.equipped ?? {}).length, 5) },
  { id: 'cs-online', game: 'strife', icon: '🌐', name: 'LAN Party', desc: 'Win a round in an online game.', points: 15, check: (s) => B(st(s).onlineRounds) },
  { id: 'cs-ranked', game: 'strife', icon: '🎖️', name: 'Placed', desc: 'Play three ranked matches and get a rank.', points: 10, check: (s) => P(s.strifeRank.matches, 3) },
  { id: 'cs-goldnova', game: 'strife', icon: '🌟', name: 'Gold Nova', desc: 'Reach Gold Nova I.', points: 15, check: (s) => B(s.strifeRank.best >= 6) },
  { id: 'cs-guardian', game: 'strife', icon: '🛡️', name: 'Master Guardian', desc: 'Reach Master Guardian I.', points: 25, check: (s) => B(s.strifeRank.best >= 10) },
  { id: 'cs-eagle', game: 'strife', icon: '🦅', name: 'Legendary', desc: 'Reach Legendary Eagle.', points: 40, check: (s) => B(s.strifeRank.best >= 14) },
  { id: 'cs-global', game: 'strife', icon: '🌍', name: 'The Global Elite', desc: 'Reach the top rank.', points: 75, check: (s) => B(s.strifeRank.best >= 17) },
  { id: 'cs-host', game: 'strife', icon: '🏠', name: 'Host with the Most', desc: 'Host a game that someone joins.', points: 15, check: (s) => B(st(s).hostedWithFriend) },

  // ---------------- TRANSLATR
  ...[
    ['buy', '🏢', 'Hostile Takeover'],
    ['slave', '⛓️', 'Corporate Slave'],
    ['bankrupt', '🐈', 'Death by Cat'],
    ['grass', '🌿', 'Touched Grass'],
    ['taught', '📚', 'Self-Taught'],
    ['shooter', '🔫', 'Knee-Deep in the Ads'],
    ['deleted', '🗑️', 'Account Deleted'],
    ['snail', '🐌', 'ive waited 4 no 5000 years for this'],
    ['secret', '🤫', 'Not One Cent'],
  ].map(([e, icon, name]) => ({ id: 'tr-end-' + e, game: 'translatr', icon, name, desc: `Reach the “${name}” ending.`, points: e === 'secret' || e === 'snail' ? 30 : 15, secret: e === 'secret' || e === 'snail', check: (s) => B(s.translatr?.endings?.[e]) })),
  { id: 'tr-all', game: 'translatr', icon: '👑', name: 'Seen It All', desc: 'Reach every TRANSLATR ending.', points: 50, check: (s) => P(Object.keys(s.translatr?.endings ?? {}).length, 9) },
  { id: 'tr-ach25', game: 'translatr', icon: '🏅', name: 'Achievement Unlocked', desc: 'Unlock 25 of TRANSLATR’s own achievements.', points: 15, check: (s) => P(Object.keys(s.translatr?.achievements ?? {}).length, 25) },
  { id: 'tr-ach75', game: 'translatr', icon: '🎖️', name: 'Achievement Hunter', desc: 'Unlock 75 of TRANSLATR’s own achievements.', points: 30, check: (s) => P(Object.keys(s.translatr?.achievements ?? {}).length, 75) },
  { id: 'tr-prestige', game: 'translatr', icon: '🔁', name: 'New Game Plus', desc: 'Prestige in TRANSLATR.', points: 10, check: (s) => B(n(s.translatr?.prestige) > 0) },
  { id: 'tr-ads', game: 'translatr', icon: '📺', name: 'Ad-Supported', desc: 'Sit through 1,000 ads.', points: 15, check: (s) => P(n(s.translatr?.adsSeen), 1000) },

  // ---------------- DOOMSCROLL
  { id: 'doom-e1', game: 'doom', icon: '📱', name: 'Knee-Deep in the Ads', desc: 'Finish episode 1.', points: 10, check: (s) => B(s.doom?.[1]?.done) },
  { id: 'doom-e2', game: 'doom', icon: '🛒', name: 'The Shores of Checkout', desc: 'Finish episode 2.', points: 15, check: (s) => B(s.doom?.[2]?.done) },
  { id: 'doom-e3', game: 'doom', icon: '🔥', name: 'Inferno of Influencers', desc: 'Finish episode 3.', points: 20, check: (s) => B(s.doom?.[3]?.done) },
  { id: 'doom-final', game: 'doom', icon: '🔨', name: 'Ban Hammer', desc: 'Beat the final boss.', points: 40, secret: true, check: (s) => B(s.doom?.FINAL?.done) },

  // ---------------- LAWN OF THE DEAD
  { id: 'grass-1', game: 'grass', icon: '🌱', name: 'Green Thumb', desc: 'Beat the first level.', points: 5, check: (s) => B(s.grass?.beaten?.includes('1-1')) },
  { id: 'grass-a1', game: 'grass', icon: '🏡', name: 'Front Yard', desc: 'Beat every level in the first area.', points: 10, check: (s) => P((s.grass?.beaten ?? []).filter((id) => /^1-/.test(id)).length, 10) },
  { id: 'grass-25', game: 'grass', icon: '🌻', name: 'Halfway Home', desc: 'Beat 25 levels.', points: 15, check: (s) => P((s.grass?.beaten ?? []).filter((id) => /^\d-\d+$/.test(id)).length, 25) },
  { id: 'grass-50', game: 'grass', icon: '🏆', name: 'Lawn and Order', desc: 'Beat all 50 levels.', points: 40, check: (s) => P((s.grass?.beaten ?? []).filter((id) => /^\d-\d+$/.test(id)).length, 50) },
  { id: 'grass-rich', game: 'grass', icon: '💰', name: 'Money Tree', desc: 'Have $10,000 in coins.', points: 10, check: (s) => P(n(s.grass?.coins), 10000) },

  // ---------------- BRAINS FIRST
  { id: 'phone-1', game: 'phone', icon: '🧠', name: 'Brain Food', desc: 'Solve a puzzle.', points: 5, check: (s) => P((s.phone?.beaten ?? []).length, 1) },
  { id: 'phone-all', game: 'phone', icon: '🧟', name: 'Mastermind', desc: 'Solve all nine puzzles.', points: 25, check: (s) => P((s.phone?.beaten ?? []).filter((x) => typeof x === 'number' || /^\d+$/.test(x)).length, 9) },
  { id: 'phone-endless', game: 'phone', icon: '♾️', name: 'Endless Appetite', desc: 'Reach wave 10 in endless mode.', points: 20, check: (s) => P(n(s.phone?.best), 10) },

  // ---------------- LOGGLE
  { id: 'loggle-1', game: 'loggle', icon: '🟩', name: 'Lobert Boggia', desc: 'Solve a LOGGLE.', points: 5, check: (s) => P(n(s.loggle?.stats?.wins), 1) },
  { id: 'loggle-first', game: 'loggle', icon: '🔮', name: 'Called It', desc: 'Solve a LOGGLE on the first guess.', points: 25, check: (s) => P(n(s.loggle?.stats?.firstTry), 1) },
  { id: 'loggle-7', game: 'loggle', icon: '📅', name: 'Daily Habit', desc: 'Win LOGGLE seven days in a row.', points: 20, check: (s) => P(n(s.loggle?.stats?.best), 7) },
  { id: 'loggle-30', game: 'loggle', icon: '🗓️', name: 'Robert Loggia Fan Club', desc: 'Play 30 LOGGLEs.', points: 15, check: (s) => P(n(s.loggle?.stats?.played), 30) },

  // ---------------- the site itself
  { id: 'site-cmd', game: 'site', icon: '⌨️', name: 'I’m In', desc: 'Run a command in the Command Prompt.', points: 5, check: () => B(read('nikstilos-terminal')?.runs) },
  { id: 'site-eggs', game: 'site', icon: '🥚', name: 'Easter Egg Hunter', desc: 'Find 5 hidden commands in the Command Prompt.', points: 20, check: () => P((read('nikstilos-terminal')?.found ?? []).length, 5) },
  { id: 'site-explorer', game: 'site', icon: '🗂️', name: 'Snooping Around', desc: 'Open a file in the File Explorer.', points: 5, check: () => B(read('nikstilos-files')?.opened) },
  // BloatOS's toys: the Task Manager, gravity, the desk plant, other visitors, the printer, dial-up
  { id: 'site-explorer-kill', game: 'site', icon: '💀', name: 'Have You Tried Ending It?', desc: 'End explorer.exe in the Task Manager.', points: 10, check: (s) => B(s.feats.explorerKilled) },
  { id: 'site-bsod', game: 'site', icon: '🟦', name: ':(', desc: 'Cause a blue screen.', points: 10, check: (s) => B(s.feats.bsod) },
  { id: 'site-speedreboot', game: 'site', icon: '⚡', name: 'Speedrun Reboot', desc: 'Type the stop code before the blue screen finishes.', points: 15, check: (s) => B(s.feats.speedReboot) },
  { id: 'site-algo', game: 'site', icon: '🤖', name: 'It Learned', desc: 'End TheAlgorithm four times.', points: 10, check: (s) => P(n(s.feats.algoKills), 4) },
  { id: 'site-hr', game: 'site', icon: '🗂️', name: 'HR Has Been Notified', desc: 'Try to end HR.', points: 5, check: (s) => B(s.feats.brendaTried) },
  { id: 'site-gravity', game: 'site', icon: '🪐', name: 'What Goes Up', desc: 'Turn gravity on.', points: 5, check: (s) => B(s.feats.gravity) },
  { id: 'site-yeet', game: 'site', icon: '🥏', name: 'Yeet', desc: 'Throw a window (or an icon) across the screen.', points: 10, check: (s) => B(s.feats.thrown) },
  { id: 'site-shake', game: 'site', icon: '🫨', name: 'Shake It Off', desc: 'Shake a window until things fall out.', points: 10, check: (s) => B(s.feats.shaken) },
  { id: 'site-plant', game: 'site', icon: '🪴', name: 'Green Thumb', desc: 'Water the desk plant on seven different days.', points: 20, check: (s) => P(n(s.feats.plantDays), 7) },
  { id: 'site-bonk', game: 'site', icon: '🧟', name: 'Bonk', desc: 'Bonk 25 zombies off your desktop.', points: 15, check: (s) => P(n(s.feats.zombiesBonked), 25) },
  { id: 'site-wave', game: 'site', icon: '🛡️', name: 'Lawn Defender', desc: 'Get through a zombie invasion.', points: 10, check: (s) => B(s.feats.wavesSurvived) },
  { id: 'site-ghosts', game: 'site', icon: '👻', name: 'Not Alone', desc: 'See another visitor’s cursor on the desktop.', points: 5, check: (s) => B(s.feats.ghostsSeen) },
  { id: 'site-plane', game: 'site', icon: '✈️', name: 'Air Mail', desc: 'Throw a paper plane at someone.', points: 5, check: (s) => B(s.feats.planes) },
  { id: 'site-unjam', game: 'site', icon: '🖨️', name: 'PC LOAD LETTER', desc: 'Unjam the printer.', points: 10, check: (s) => B(s.feats.unjammed) },
  { id: 'site-receipt', game: 'site', icon: '🧾', name: 'Itemised', desc: 'Print the receipt of everything you’ve done here.', points: 5, check: (s) => B(s.feats.printed) },
  { id: 'site-dialup', game: 'site', icon: '📞', name: 'Screeeech', desc: 'Get online with dial-up in BobbyBrowser.', points: 5, check: (s) => B(s.feats.dialup) },
  { id: 'site-haunted', game: 'site', icon: '🕯️', name: 'It Followed You Home', desc: 'Follow DO_NOT_OPEN.txt all the way to the end.', points: 25, secret: true, check: (s) => B(s.arg >= 5) },
  // KEVIN-GOTCHI™ and NASDANK (on the phone)
  { id: 'site-kevin-manager', game: 'site', icon: '👔', name: 'Middle Management', desc: 'Get Kevin promoted to Manager.', points: 20, check: (s) => B(s.kevin && s.kevin.xp >= 2000) },
  { id: 'site-kevin-ceo', game: 'site', icon: '👑', name: 'Kevin, CEO', desc: 'Get Kevin all the way to CEO.', points: 40, check: (s) => B(s.kevin?.ceo) },
  { id: 'site-kevin-quit', game: 'site', icon: '📨', name: 'Two Weeks’ Notice', desc: 'Let an intern quit.', points: 5, secret: true, check: (s) => B(s.kevin && (s.kevin.quit || s.kevin.gen > 1)) },
  { id: 'site-stonks', game: 'site', icon: '📈', name: 'Stonks', desc: 'Make ⓒ 50 on a single NASDANK sale.', points: 15, check: (s) => B(s.feats.stonksBigWin) },
  { id: 'site-not-stonks', game: 'site', icon: '📉', name: 'Not Stonks', desc: 'Lose ⓒ 50 on a single NASDANK sale.', points: 10, check: (s) => B(s.feats.stonksBigLoss) },
  { id: 'site-trader', game: 'site', icon: '💹', name: 'Day Trader', desc: 'Make 20 trades on NASDANK.', points: 10, check: (s) => P(n(s.feats.stonksTrades), 20) },
  { id: 'site-games', game: 'site', icon: '🕹️', name: 'Sampler Platter', desc: 'Earn an achievement in four different games.', points: 20, meta: true },
  { id: 'site-half', game: 'site', icon: '🌗', name: 'Halfway There', desc: 'Unlock half of all achievements.', points: 50, meta: true },
]

/** Works out every achievement. Returns [{ ...a, done, cur, max }]. */
export function evaluate(saves = readSaves()) {
  const out = ACHIEVEMENTS.map((a) => {
    if (a.meta) return { ...a, done: false }
    let r
    try {
      r = a.check(saves)
    } catch {
      r = { done: false }
    }
    return { ...a, ...r }
  })
  // the ones about the others
  const games = new Set(out.filter((a) => a.done && a.game !== 'site').map((a) => a.game))
  const meta = (id, r) => Object.assign(out.find((a) => a.id === id), r)
  meta('site-games', P(games.size, 4))
  const total = out.length
  meta('site-half', P(out.filter((a) => a.done).length, Math.ceil(total / 2)))
  return out
}

// ---------------- Remembering when things were unlocked
const UNLOCK_KEY = 'nikstil-achievements'
export function unlockedAt() {
  return read(UNLOCK_KEY) ?? {}
}
/**
 * Compares against what was already known; stamps and returns the newly unlocked ones.
 * The first run on a device only stamps (no flood of toasts for old progress).
 */
export function check() {
  const known = unlockedAt()
  const first = !Object.keys(known).length && !localStorage.getItem(UNLOCK_KEY + '-init')
  const all = evaluate()
  const fresh = []
  for (const a of all)
    if (a.done && !known[a.id]) {
      known[a.id] = Date.now()
      fresh.push(a)
    }
  try {
    localStorage.setItem(UNLOCK_KEY, JSON.stringify(known))
    localStorage.setItem(UNLOCK_KEY + '-init', '1')
  } catch {}
  return first ? [] : fresh
}

/** A toast in the corner of the page for each newly unlocked achievement. */
export function toast(list, root = document.body) {
  let t = 0
  // a lot at once (old progress, say): the first two, then one for the rest
  if (list.length > 3) {
    const rest = list.slice(2)
    list = [...list.slice(0, 2), { icon: '🎖️', points: rest.reduce((s, a) => s + a.points, 0), name: `…and ${rest.length} more` }]
  }
  for (const a of list) {
    setTimeout(() => {
      const el = document.createElement('div')
      el.className = 'nk-ach-toast'
      el.setAttribute('role', 'status')
      el.innerHTML = '<span class="i"></span><div><small>Achievement unlocked · <b class="p"></b></small><strong></strong></div>'
      el.querySelector('.i').textContent = a.icon
      el.querySelector('.p').textContent = `${a.points}G`
      el.querySelector('strong').textContent = a.name
      if (!document.getElementById('nk-ach-style')) {
        const st = document.createElement('style')
        st.id = 'nk-ach-style'
        st.textContent = `.nk-ach-toast{position:fixed;left:50%;bottom:28px;z-index:2147483000;display:flex;align-items:center;gap:12px;min-width:280px;padding:10px 18px 10px 10px;border-radius:999px;background:#1d2228;color:#fff;font:14px/1.25 system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.45);transform:translate(-50%,140%);transition:transform .45s cubic-bezier(.2,1.4,.4,1);pointer-events:none}.nk-ach-toast.on{transform:translate(-50%,0)}.nk-ach-toast .i{display:grid;place-items:center;width:44px;height:44px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#7ce08a,#1e7a32);font-size:22px}.nk-ach-toast small{display:block;opacity:.75;font-size:12px}.nk-ach-toast strong{font-size:15px}`
        document.head.append(st)
      }
      root.append(el)
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('on')))
      setTimeout(() => el.classList.remove('on'), 4200)
      setTimeout(() => el.remove(), 4800)
    }, t)
    t += 1600
  }
}

/**
 * Signed in to nikstil.com: puts the achievements unlocked on this device on the player's profile,
 * so other players can see them (only when something new has been unlocked since last time).
 */
export async function sync() {
  const net = window.nikstilOnline
  if (!net) return
  const known = new Set(ACHIEVEMENTS.map((a) => a.id))
  const ids = Object.keys(unlockedAt())
    .filter((id) => known.has(id))
    .sort()
  if (!ids.length) return
  const me = await net.me().catch(() => null)
  if (!me) return
  const sig = `${me.id}:${ids.join(',')}`
  if (read(UNLOCK_KEY + '-synced') === sig) return
  try {
    await net.syncAchievements(ids)
    localStorage.setItem(UNLOCK_KEY + '-synced', JSON.stringify(sig))
  } catch {}
}
