// Weapon skins: finishes painted procedurally onto a texture (camo, fades, hexes, tiger stripes,
// case hardening...), with rarity and wear like the real thing. Cases hold a set of skins; you get
// cases by playing, open them with keys, and equip what you unbox. Everything is saved locally.

import * as THREE from './lib/three.min.js'
import { WEAPONS } from './weapons.js'

// ---------------- Rarity
export const RARITY = {
  consumer: { name: 'Consumer Grade', color: '#b0c3d9', odds: 0 },
  industrial: { name: 'Industrial Grade', color: '#5e98d9', odds: 0 },
  milspec: { name: 'Mil-Spec', color: '#4b69ff', odds: 0.7992 },
  restricted: { name: 'Restricted', color: '#8847ff', odds: 0.1598 },
  classified: { name: 'Classified', color: '#d32ce6', odds: 0.032 },
  covert: { name: 'Covert', color: '#eb4b4b', odds: 0.0064 },
  gold: { name: '★ Rare Special Item', color: '#e4ae39', odds: 0.0026 },
}
export const RARITY_ORDER = ['consumer', 'industrial', 'milspec', 'restricted', 'classified', 'covert', 'gold']

export const WEAR = [
  { max: 0.07, name: 'Factory New', short: 'FN' },
  { max: 0.15, name: 'Minimal Wear', short: 'MW' },
  { max: 0.38, name: 'Field-Tested', short: 'FT' },
  { max: 0.45, name: 'Well-Worn', short: 'WW' },
  { max: 1.0, name: 'Battle-Scarred', short: 'BS' },
]
export const wearOf = (f) => WEAR.find((w) => f <= w.max) ?? WEAR[4]

// ---------------- The skins: weapon | name, a pattern and its colours
// Patterns: solid, camo, digital, hex, tiger, fade, marble, hardened, damascus, carbon, splatter,
// blocks (big flat graphic panels), stripes, scales, circuit, waves; and for knives doppler, gamma,
// marblefade, lore, mesh, freehand, rust, stained, laminate, bluesteel (see patternOf for what
// the pattern template does to some of them).
const S = (weapon, name, pattern, colors, rarity) => ({ id: `${weapon}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, weapon, name, pattern, colors, rarity })
const CASE_SKINS = {
  synergy: [
    S('ak47', 'Q3 Earnings', 'blocks', ['#1d1d1f', '#c22a2a', '#e8e3d7'], 'classified'),
    S('awp', 'Dragon Synergy', 'scales', ['#2e6a3c', '#d9b54a', '#7a1f1a'], 'covert'),
    S('m4a4', 'Howl of the Intern', 'blocks', ['#e85d1e', '#1c1c1c', '#f2e9da'], 'covert'),
    S('deagle', 'Blaze of Overtime', 'fade', ['#ff4a1c', '#ffcf3a', '#1a1a1a'], 'classified'),
    S('glock', 'Fade to Friday', 'fade', ['#ff69b4', '#ffd23a', '#3ab0ff'], 'restricted'),
    S('usp', 'Kill Confirmed Meeting', 'splatter', ['#2a2c2f', '#c33', '#e0e0e0'], 'restricted'),
    S('m4a1s', 'Hyper Beast Mode', 'splatter', ['#26b3a8', '#ff5ea8', '#1d1d24'], 'restricted'),
    S('p90', 'Asii-move Fast', 'blocks', ['#f0f0f0', '#ff7a00', '#111111'], 'milspec'),
    S('mac10', 'Neon Standup', 'stripes', ['#16161c', '#38ffc8', '#ff3ac0'], 'milspec'),
    S('galil', 'Cerberus Compliance', 'tiger', ['#2b2b2b', '#d4682c'], 'milspec'),
    S('famas', 'Djinn Detergent', 'waves', ['#1d3b6e', '#6fd2ff', '#f5f0e6'], 'milspec'),
    S('nova', 'Hyper Graveyard Shift', 'digital', ['#3a3f47', '#6e7b8c', '#a8b4c4'], 'milspec'),
    S('p250', 'See Ya Monday', 'hex', ['#1e2330', '#ffb000'], 'milspec'),
    S('mp9', 'Hot Rod Desk', 'solid', ['#c8102e'], 'milspec'),
    S('knife', 'Case Hardened', 'hardened', ['#3a62c4', '#d8a23a', '#9aa0a6'], 'gold'),
    S('knife', 'Fade', 'fade', ['#ff4fb8', '#ffd23a', '#5b8cff'], 'gold'),
  ],
  quarterly: [
    S('ak47', 'Fire Serpent Retreat', 'scales', ['#2c5a2a', '#d8c27a', '#8b1d1d'], 'covert'),
    S('awp', 'Lightning Strike Bonus', 'circuit', ['#1a0f2a', '#b05bff', '#e9d9ff'], 'classified'),
    S('m4a1s', 'Golden Parachute', 'damascus', ['#7a5a1a', '#e4c76a'], 'covert'),
    S('ssg08', 'Blood in the Water Cooler', 'waves', ['#0d3a5c', '#d9e8f5', '#c22'], 'classified'),
    S('ump45', 'Primal Spreadsheet', 'camo', ['#4b5a2c', '#7e8a4a', '#2c3018', '#a8a26a'], 'milspec'),
    S('famas', 'Roll Cage Commute', 'stripes', ['#f2c230', '#1c1c1c', '#2b6cd6'], 'restricted'),
    S('aug', 'Akihabara Accept', 'blocks', ['#f6e9ef', '#ff6fa8', '#28324a'], 'covert'),
    S('fiveseven', 'Case Hardened', 'hardened', ['#3a62c4', '#d8a23a', '#9aa0a6'], 'restricted'),
    S('tec9', 'Fuel Injector', 'carbon', ['#1b1b1d', '#ff7b00'], 'restricted'),
    S('xm1014', 'Tranquility (Pending)', 'marble', ['#e9eef2', '#7b8a99', '#33414f'], 'milspec'),
    S('mp7', 'Nemesis Neighbour', 'hex', ['#e6e6e6', '#7ad8ff'], 'milspec'),
    S('negev', 'Power Loader', 'blocks', ['#f2c230', '#1c1c1c', '#7b7b7b'], 'milspec'),
    S('mag7', 'Heat Wave', 'fade', ['#ff2a00', '#ffb300', '#3b0a00'], 'milspec'),
    S('cz75', 'Victoria Secretary', 'damascus', ['#2b1b0f', '#c9a25a'], 'milspec'),
    S('knife', 'Doppler', 'doppler', ['#2a0f45', '#9b3bff', '#ff4fb8'], 'gold'),
    S('knife', 'Tiger Tooth', 'tiger', ['#e8a21a', '#5a2a00'], 'gold'),
  ],
  overtime: [
    S('ak47', 'Vulcan Vacation', 'stripes', ['#f2f2f2', '#2a6fd6', '#111'], 'covert'),
    S('awp', 'Hyper Beast Mode', 'splatter', ['#26b3a8', '#ff5ea8', '#1d1d24'], 'covert'),
    S('m4a4', 'Desolate Spacebar', 'circuit', ['#0b1d2a', '#ff5a1f', '#f2e9da'], 'classified'),
    S('deagle', 'Printstream Printer', 'marble', ['#f5f5f5', '#cfcfd4', '#151515'], 'classified'),
    S('usp', 'Cortex Calendar', 'waves', ['#1b1b29', '#e44', '#f0e6d2'], 'restricted'),
    S('glock', 'Water Elemental Cooler', 'waves', ['#a52a1a', '#2b7bd6', '#f2f2f2'], 'restricted'),
    S('sg553', 'Integrale Expense', 'stripes', ['#ececec', '#c8102e', '#1a3a8a'], 'restricted'),
    S('p2000', 'Ocean Foam Party', 'fade', ['#e8f6ff', '#3ec2ff', '#1258a8'], 'milspec'),
    S('bizon', 'Judgement of Review', 'hex', ['#3a1a1a', '#e5b73b'], 'milspec'),
    S('mp5', 'Lab Rats', 'digital', ['#dedede', '#9fd56b', '#2a2a2a'], 'milspec'),
    S('m249', 'Spectre Sprint', 'carbon', ['#222', '#7a7af0'], 'milspec'),
    S('g3sg1', 'Flux Capacitor', 'circuit', ['#141414', '#00e0ff', '#444'], 'milspec'),
    S('scar20', 'Cyrex Firewall', 'blocks', ['#e8e8e8', '#e01b24', '#1a1a1a'], 'milspec'),
    S('r8', 'Fade', 'fade', ['#ff4fb8', '#ffd23a', '#5b8cff'], 'milspec'),
    S('dualies', 'Twin Turbo Reports', 'stripes', ['#1a1a1a', '#e01b24', '#ffd23a'], 'milspec'),
    S('sawedoff', 'The Kraken Meeting', 'scales', ['#14404a', '#59c2a8', '#e8d9a8'], 'milspec'),
    S('zeus', 'Static Discharge', 'circuit', ['#1a1a1a', '#ffe14d', '#555'], 'milspec'),
    S('knife', 'Crimson Web', 'damascus', ['#4a0a0a', '#e52a2a'], 'gold'),
    S('knife', 'Slaughter', 'splatter', ['#e9d5d5', '#c22', '#7a1414'], 'gold'),
  ],
  review: [
    S('ak47', 'Asiimov Appraisal', 'blocks', ['#f0f0f0', '#ff7a00', '#111111'], 'covert'),
    S('m4a1s', 'Printstream Performance', 'marble', ['#f5f5f5', '#d9d9de', '#141414'], 'covert'),
    S('awp', 'Neo-Noir Notes', 'blocks', ['#151515', '#e8e3d7', '#c8102e'], 'classified'),
    S('usp', 'Kill Confirmed KPI', 'splatter', ['#1f2124', '#d63a2a', '#e6e6e6'], 'classified'),
    S('deagle', 'Code Red Review', 'stripes', ['#b3001b', '#151515', '#f2f2f2'], 'restricted'),
    S('glock', 'Vogue Variance', 'waves', ['#f2d7e6', '#2a2a2a', '#ff4fb8'], 'restricted'),
    S('mp9', 'Starlight Stretch Goal', 'fade', ['#1a1a3a', '#7a5cff', '#ffd1f0'], 'restricted'),
    S('p250', 'Muertos Metrics', 'splatter', ['#2a1a3a', '#ffcf3a', '#ff4fb8'], 'restricted'),
    S('famas', 'Mecha Industries Metrics', 'circuit', ['#e8e8e8', '#2a6fd6', '#1a1a1a'], 'milspec'),
    S('ump45', 'Gold Bismuth Bonus', 'hex', ['#2a2410', '#e4c76a'], 'milspec'),
    S('mac10', 'Disco Tech Deadline', 'stripes', ['#1a1a24', '#ff3ac0', '#38ffc8'], 'milspec'),
    S('nova', 'Antique Appraisal', 'damascus', ['#3a2a1a', '#b08a5a'], 'milspec'),
    S('mag7', 'Justice Justification', 'carbon', ['#1b1b1d', '#e8e8e8'], 'milspec'),
    S('tec9', 'Isaac Improvement Plan', 'digital', ['#2e3a2e', '#8fd06b', '#e8f5d0'], 'milspec'),
    S('knife', 'Marble Fade', 'marblefade', ['#c8102e', '#ffd23a', '#2a6fd6'], 'gold'),
    S('knife', 'Lore', 'lore', ['#1a140a', '#e4c76a', '#6a4a1a'], 'gold'),
    S('knife', 'Ultraviolet', 'solid', ['#4b2a6e'], 'gold'),
  ],
  teambuilding: [
    S('ak47', 'Neon Rider Retreat', 'stripes', ['#1a0d2e', '#ff2bd6', '#2be1ff'], 'covert'),
    S('awp', 'Containment Breach Icebreaker', 'circuit', ['#0f1f12', '#9cff2e', '#2a2a2a'], 'covert'),
    S('m4a4', 'The Emperor Escape Room', 'scales', ['#1a2a5c', '#e4c76a', '#c8102e'], 'classified'),
    S('usp', 'Orion Offsite', 'waves', ['#0d1a3a', '#6fa8ff', '#e8f0ff'], 'classified'),
    S('galil', 'Chatterbox Brainstorm', 'blocks', ['#f2f2f2', '#c8102e', '#1a1a1a'], 'restricted'),
    S('p90', 'Death by Kitty Karaoke', 'splatter', ['#ffb6d9', '#2a2a2a', '#ff3a8c'], 'restricted'),
    S('deagle', 'Trust Fall Kumicho', 'damascus', ['#1a1a1a', '#c8102e'], 'restricted'),
    S('sg553', 'Cyrex Collaboration', 'blocks', ['#e8e8e8', '#e01b24', '#1a1a1a'], 'restricted'),
    S('mp7', 'Bloodsport Bonding', 'splatter', ['#151515', '#c8102e', '#f2f2f2'], 'milspec'),
    S('p2000', 'Fire Elemental Icebreaker', 'fade', ['#ff4a1c', '#ffcf3a', '#2a6fd6'], 'milspec'),
    S('xm1014', 'Ziggy Zipline', 'stripes', ['#f2c230', '#2a2a2a', '#ff5a1f'], 'milspec'),
    S('cz75', 'Tigris Tuesday', 'tiger', ['#1a1a1a', '#e8a21a'], 'milspec'),
    S('bizon', 'Night Riot Raft Race', 'waves', ['#0d0d1a', '#5a3aff', '#ff3a8c'], 'milspec'),
    S('m249', 'Emerald Poison Dart Paintball', 'splatter', ['#0d2a1a', '#2ee67a', '#f2f2f2'], 'milspec'),
    S('knife', 'Gamma Doppler', 'gamma', ['#0d2a1a', '#2ee67a', '#2a6fd6'], 'gold'),
    S('knife', 'Autotronic', 'circuit', ['#1a1a1a', '#c8102e', '#9aa0a6'], 'gold'),
    S('knife', 'Boreal Forest', 'camo', ['#4a5a3a', '#2c3a24', '#6e7b5a', '#8a8a6a'], 'gold'),
  ],
  casualfriday: [
    S('ak47', 'Bloodsport Brunch', 'splatter', ['#141414', '#e01b24', '#f2f2f2'], 'covert'),
    S('m4a1s', 'Hawaiian Hot Rod', 'waves', ['#ff5a1f', '#ffd23a', '#2a9d8f'], 'covert'),
    S('awp', 'Fever Dream Flip-Flops', 'splatter', ['#1a2a3a', '#ff4fb8', '#2be1ff'], 'classified'),
    S('glock', 'Wasteland Rebel Weekend', 'tiger', ['#2a2a2a', '#c86a2a'], 'classified'),
    S('p90', 'Shapewood Sandals', 'hex', ['#3a2a1a', '#d9a25a'], 'restricted'),
    S('ssg08', 'Dragonfire Barbecue', 'fade', ['#2b0a00', '#ff3a00', '#ffd23a'], 'restricted'),
    S('fiveseven', 'Monkey Business Casual', 'blocks', ['#2a2a2a', '#ffd23a', '#6a4a2a'], 'restricted'),
    S('aug', 'Chameleon Cardigan', 'camo', ['#2a4a2a', '#6aa02a', '#1a2a1a', '#a0c04a'], 'restricted'),
    S('mac10', 'Tie Dye Thursday', 'fade', ['#ff4fb8', '#ffd23a', '#2be1ff'], 'milspec'),
    S('mp5', 'Gnar Jeans', 'digital', ['#2a3a5c', '#4a6a9a', '#1a2a3a'], 'milspec'),
    S('negev', 'Loudmouth Lounge', 'stripes', ['#ff3a8c', '#1a1a1a', '#ffd23a'], 'milspec'),
    S('dualies', 'Cobra Strike Sneakers', 'scales', ['#1a1a1a', '#e8c46a', '#c8102e'], 'milspec'),
    S('sawedoff', 'Wasteland Princess Picnic', 'camo', ['#c8a26a', '#8a6a3a', '#e8d9a8', '#5a4a2a'], 'milspec'),
    S('r8', 'Llama Cannon Lunch', 'blocks', ['#e8e0d0', '#c8102e', '#2a6fd6'], 'milspec'),
    S('knife', 'Bright Water', 'waves', ['#0d3a5c', '#2be1ff', '#a8e8ff'], 'gold'),
    S('knife', 'Safari Mesh', 'mesh', ['#8a8a6a', '#5a5a3a', '#b0a888'], 'gold'),
    S('knife', 'Freehand', 'freehand', ['#d9d9d9', '#1a1a1a', '#5a6a7a'], 'gold'),
  ],
  replyall: [
    S('ak47', 'Wild Lotus Thread', 'waves', ['#0d3b2e', '#e8c46a', '#f2f2f2'], 'covert'),
    S('awp', 'Medusa Mailbox', 'scales', ['#2e5a2a', '#c9b06a', '#3b1d0d'], 'covert'),
    S('m4a4', 'Poseidon Postmaster', 'waves', ['#0d2a5c', '#e4c76a', '#2be1ff'], 'classified'),
    S('deagle', 'Hypnotic Inbox', 'fade', ['#8a8f99', '#d0d4da', '#5a6070'], 'classified'),
    S('usp', 'Overgrowth Out-of-Thread', 'camo', ['#3a5a2a', '#1a2a1a', '#6a8a3a', '#2a3a1a'], 'restricted'),
    S('glock', 'Grinder Group Chat', 'carbon', ['#1b1b1d', '#c8102e'], 'restricted'),
    S('famas', 'Pulse Notification', 'stripes', ['#1a1a2a', '#2be1ff', '#f2f2f2'], 'restricted'),
    S('mp7', 'Fade to Unread', 'fade', ['#ff4fb8', '#7a5cff', '#2be1ff'], 'restricted'),
    S('p250', 'Undertow Unsubscribe', 'waves', ['#3a0d0d', '#c8102e', '#f2d7d7'], 'milspec'),
    S('ump45', 'Primal Saber Spam', 'splatter', ['#2a2a1a', '#c8a23a', '#7a1a1a'], 'milspec'),
    S('nova', 'Bloomstick BCC', 'splatter', ['#2a1a1a', '#ff4a5a', '#ffd23a'], 'milspec'),
    S('mag7', 'Bulldozer Bounce', 'blocks', ['#f2c230', '#1c1c1c', '#7b7b7b'], 'milspec'),
    S('g3sg1', 'The Executioner (CC)', 'carbon', ['#1a1a1a', '#9aa0a6'], 'milspec'),
    S('tec9', 'Red Quartz Read Receipt', 'marble', ['#3a0d0d', '#c8102e', '#f2d7d7'], 'milspec'),
    S('knife', 'Night', 'solid', ['#1a1d22'], 'gold'),
    S('knife', 'Damascus Steel', 'damascus', ['#5a5f66', '#b8bec6'], 'gold'),
    S('knife', 'Rust Coat', 'rust', ['#6a6e72', '#8a4a1a', '#c86a2a'], 'gold'),
  ],
  ooo: [
    S('ak47', 'Aquamarine Autoreply', 'fade', ['#0a3d4a', '#2ee6d6', '#e8fffb'], 'covert'),
    S('m4a4', 'Neo-Noir Vacation Mode', 'blocks', ['#151515', '#f2f2f2', '#2a6fd6'], 'covert'),
    S('awp', 'Gungnir Gone Fishing', 'scales', ['#0d2a5c', '#e4c76a', '#f2f2f2'], 'classified'),
    S('m4a1s', 'Icarus Fell Asleep', 'fade', ['#f2f2f2', '#ffd27a', '#3a7bd6'], 'classified'),
    S('usp', 'The Traitor Timezone', 'blocks', ['#2a2a2a', '#e8a21a', '#c8102e'], 'restricted'),
    S('deagle', 'Ocean Drive Holiday', 'waves', ['#2be1ff', '#ff4fb8', '#f2f2f2'], 'restricted'),
    S('galil', 'Sunset Storm Staycation', 'fade', ['#ff5a1f', '#ff4fb8', '#3a1a5c'], 'restricted'),
    S('p90', 'Trigon Timesheet', 'hex', ['#1a1a2a', '#c8102e'], 'restricted'),
    S('mp9', 'Hydra Hammock', 'scales', ['#0d3a2a', '#2ee6a0', '#e8fff2'], 'milspec'),
    S('famas', 'Commemoration Cruise', 'stripes', ['#f2f2f2', '#2a6fd6', '#c8102e'], 'milspec'),
    S('xm1014', 'Seasons Sabbatical', 'camo', ['#8a6a3a', '#c8a26a', '#4a3a2a', '#e8d9a8'], 'milspec'),
    S('scar20', 'Bloodsport Beach', 'splatter', ['#f2e9d0', '#e01b24', '#1a1a1a'], 'milspec'),
    S('cz75', 'Xiangliu Away Message', 'circuit', ['#1a0d2a', '#2ee67a', '#c8102e'], 'milspec'),
    S('zeus', 'Olympus Offline', 'fade', ['#f2f2f2', '#e4c76a', '#2a6fd6'], 'milspec'),
    S('knife', 'Blue Steel', 'bluesteel', ['#2a3a5c', '#5a7aa0', '#9ab0c8'], 'gold'),
    S('knife', 'Stained', 'stained', ['#5a5f66', '#3a3d42', '#8a8f96'], 'gold'),
    S('knife', 'Black Laminate', 'laminate', ['#1a1a1a', '#3a3a3a', '#5a4a3a'], 'gold'),
  ],
}
export const SKINS = Object.values(CASE_SKINS).flat()
export const skinById = Object.fromEntries(SKINS.map((s) => [s.id, s]))

const ids = (k) => CASE_SKINS[k].map((s) => s.id)
export const CASES = [
  { id: 'synergy', name: 'Synergy Case', color: '#c22a2a', skins: ids('synergy') },
  { id: 'quarterly', name: 'Quarterly Case', color: '#2e6a3c', skins: ids('quarterly') },
  { id: 'overtime', name: 'Overtime Case', color: '#2a6fd6', skins: ids('overtime') },
  { id: 'review', name: 'Performance Review Case', color: '#7a3fc4', skins: ids('review') },
  { id: 'teambuilding', name: 'Team Building Case', color: '#d6862a', skins: ids('teambuilding') },
  { id: 'casualfriday', name: 'Casual Friday Case', color: '#2aa6a0', skins: ids('casualfriday') },
  { id: 'replyall', name: 'Reply All Case', color: '#c4385a', skins: ids('replyall') },
  { id: 'ooo', name: 'Out of Office Case', color: '#3a8a3a', skins: ids('ooo') },
]
// ---------------- Stickers and music kits
// Sticker grades use the same colours as skin rarities.
export const STICKER_GRADE = { milspec: 'High Grade', restricted: 'Remarkable', classified: 'Exotic', covert: 'Extraordinary' }
const K = (id, name, text, bg, fg, rarity, style = 'paper', emoji = '') => ({ id, name, text, bg, fg, rarity, style, emoji })
export const STICKERS = [
  K('gg', 'GG', 'GG', '#2b2b2b', '#7ce08a', 'milspec'),
  K('ez', 'ez', 'ez', '#f2c230', '#1c1c1c', 'milspec'),
  K('nt', 'nice try', 'nt', '#3b7bd6', '#fff', 'milspec'),
  K('rush-b', 'Rush B', 'RUSH B', '#c8102e', '#fff', 'milspec'),
  K('eco', 'Eco Round', 'ECO', '#4a6b3a', '#e8f5d0', 'milspec'),
  K('kevin', 'Kevin (Sales)', 'KEVIN', '#d9d0b8', '#2b2b2b', 'milspec', 'paper', '📈'),
  K('translatr', 'TRANSLATR™', 'TR™', '#3da6e8', '#fff', 'milspec', 'paper', '🌐'),
  K('bomb', 'Bomb Has Been Planted', '', '#2b2b2b', '#ff4d4d', 'restricted', 'holo', '💣'),
  K('headshot', 'Headshot', '', '#1c1c24', '#ffd23a', 'restricted', 'holo', '🎯'),
  K('ninja', 'Ninja Defuse', '', '#1a1a1a', '#9fe0ff', 'restricted', 'holo', '🥷'),
  K('dragon', 'Synergy Dragon', '', '#2e6a3c', '#d9b54a', 'restricted', 'holo', '🐉'),
  K('nikstil', 'nikstil.com', 'nikstil', '#101418', '#f2c14e', 'restricted', 'holo'),
  K('ceo-dog', 'The CEO Dog', '', '#e8e0d0', '#2b2b2b', 'classified', 'foil', '🐕'),
  K('crown', 'Crown', '', '#3a2a10', '#ffd23a', 'classified', 'foil', '👑'),
  K('snail', 'Patient Snail', '', '#2a3a2a', '#c8e0a0', 'classified', 'foil', '🐌'),
  K('ace', 'Ace', 'ACE', '#1a1a1a', '#e4ae39', 'covert', 'gold', '🂡'),
  K('howl', 'Howl of the Intern', '', '#1c1c1c', '#e85d1e', 'covert', 'gold', '🐺'),
]
export const stickerById = Object.fromEntries(STICKERS.map((k) => [k.id, k]))

/** Music kits: a sound (wave), a tempo and a scale. The tunes are made up from them as they play. */
export const MUSIC_KITS = [
  { id: 'default', name: 'COUNTER-STRIFE', artist: 'nikstil.com', wave: 'square', bpm: 126, root: 220, scale: [0, 3, 5, 7, 10], seed: 1 },
  { id: 'elevator', name: 'Corporate Elevator', artist: 'Brenda (HR)', wave: 'sine', bpm: 96, root: 261.6, scale: [0, 4, 7, 9, 11], seed: 7 },
  { id: 'spreadsheet', name: '8-bit Spreadsheet', artist: 'Lil Spreadsheet', wave: 'square', bpm: 150, root: 293.7, scale: [0, 2, 4, 7, 9], seed: 13 },
  { id: 'lofi', name: 'Lo-fi Cubicle', artist: 'Kevin (Sales)', wave: 'triangle', bpm: 84, root: 196, scale: [0, 3, 5, 7, 10], seed: 21 },
  { id: 'synergy', name: 'Synergy Beats', artist: 'The Founder & CEO', wave: 'sawtooth', bpm: 132, root: 233.1, scale: [0, 2, 3, 7, 8], seed: 33 },
  { id: 'overtime', name: 'Overtime Anthem', artist: 'Motivational Eagle', wave: 'sawtooth', bpm: 140, root: 164.8, scale: [0, 4, 5, 7, 11], seed: 45 },
  { id: 'dialup', name: 'Dial-Up Dreams', artist: 'Captain Captcha', wave: 'square', bpm: 110, root: 349.2, scale: [0, 1, 5, 7, 8], seed: 57 },
  { id: 'algorithm', name: 'The Algorithm', artist: 'TheAlgorithm', wave: 'triangle', bpm: 118, root: 207.7, scale: [0, 2, 5, 7, 9], seed: 69 },
]
export const musicById = Object.fromEntries(MUSIC_KITS.map((k) => [k.id, k]))

// ---------------- Agents: who you are in a match (one for each side)
// look: the outfit the soldier model wears (models.js): jacket and pants [colour, [accents],
// fabric], vest, head (balaclava, shemagh, beanie, helmet, gasmask, cap, bare, beret, hood, cowboy),
// hat and hair colours, skin, shades, a tie, a pack.
export const AGENT_GRADE = { milspec: 'Distinguished', restricted: 'Exceptional', classified: 'Superior', covert: 'Master' }
const A = (id, team, name, title, rarity, look) => ({ id, team, name, title, rarity, look: { name: id, pack: false, ...look } })
export const AGENTS = [
  A('intern', 'T', 'Kevin (Sales)', 'Elite Intern', 'milspec', { jacket: ['#9db8d6', ['#8aa6c4'], 'knit'], pants: ['#b39b6e', ['#a08a60'], 'camo'], vest: '#3a3a3a', head: 'bare', hair: '#5a3a1a', tie: '#c8102e' }),
  A('hr', 'T', 'Brenda (HR)', 'Compliance Officer', 'restricted', { jacket: ['#5a5f66', ['#4a4f56'], 'knit'], pants: ['#2a2a2e', ['#222226'], 'knit'], vest: '#2a2a2e', head: 'beret', hat: '#7a1a2a', hair: '#2a1a10', shades: true }),
  A('cleaner', 'T', 'The Night Shift', 'Cleaner', 'restricted', { jacket: ['#2a3a4a', ['#22303e'], 'knit'], pants: ['#2a3a4a', ['#22303e'], 'knit'], vest: '#1a2028', head: 'hood', hat: '#1a1f26', pack: true }),
  A('analyst', 'T', 'Lil Spreadsheet', 'Data Analyst', 'classified', { jacket: ['#1f6e3a', ['#2f9e55', '#145028'], 'digital'], pants: ['#1a3a22', ['#145028'], 'digital'], vest: '#14301c', head: 'cap', hat: '#1f6e3a', shades: true }),
  A('pro', 'T', 'Sir Overtime', 'The Professional', 'covert', { jacket: ['#141414', ['#222222'], 'knit'], pants: ['#141414', ['#1a1a1a'], 'knit'], vest: '#0d0d0d', head: 'bare', hair: '#111111', shades: true, tie: '#c8102e' }),
  A('founder', 'T', 'The Founder & CEO', 'Golden Parachute', 'covert', { jacket: ['#b8902f', ['#d9b54a', '#8a6a1f'], 'camo'], pants: ['#3a2a10', ['#2a1e0a'], 'knit'], vest: '#5a4010', head: 'cowboy', hat: '#3a2a1a', shades: true, tie: '#e4c76a' }),
  A('recruiter', 'CT', 'Motivational Eagle', 'Recruiter', 'milspec', { jacket: ['#2a4a8a', ['#24407a'], 'knit'], pants: ['#3a3f4a', ['#2c3038'], 'knit'], vest: '#1f2b3d', head: 'cap', hat: '#1a2a5c' }),
  A('swatlead', 'CT', 'Officer Spreadsheet', 'SWAT Lead', 'restricted', { jacket: ['#1a1a1a', ['#262626', '#111111'], 'digital'], pants: ['#1a1a1a', ['#262626'], 'digital'], vest: '#141414', head: 'helmet' }),
  A('captcha', 'CT', 'Captain Captcha', 'Verified Human', 'restricted', { jacket: ['#e8e8e8', ['#c8102e', '#bbbbbb'], 'digital'], pants: ['#3a3f4a', ['#2c3038'], 'digital'], vest: '#c8102e', head: 'helmet' }),
  A('ghillie', 'CT', 'Patient Snail', 'Ghillie Sniper', 'classified', { jacket: ['#4a5a2a', ['#3a4a1a', '#6a7a3a', '#2a3a1a'], 'camo'], pants: ['#4a5a2a', ['#3a4a1a', '#6a7a3a'], 'camo'], vest: '#3a4a22', head: 'hood', hat: '#4a5a2a', pack: true }),
  A('ceodog', 'CT', 'The CEO Dog', 'Good Boy Commander', 'covert', { jacket: ['#6a4a2a', ['#5a3a1a', '#8a6a4a'], 'camo'], pants: ['#3a2a1a', ['#2a1e10'], 'knit'], vest: '#2a1e10', head: 'beret', hat: '#1a3a8a', shades: true }),
  A('algorithm', 'CT', 'TheAlgorithm', 'Black Ops', 'covert', { jacket: ['#0d0d0d', ['#2ee67a', '#111111'], 'digital'], pants: ['#0d0d0d', ['#2ee67a'], 'digital'], vest: '#0a0a0a', head: 'gasmask' }),
]
export const agentById = Object.fromEntries(AGENTS.map((a) => [a.id, a]))
/** The outfit an actor wears: their agent for the side they're on, or null (a standard one). */
export const agentLook = (a) => agentById[a?.agents?.[a.team]]?.look ?? null
/** A random agent for a side (bots dress up too, sometimes). */
export const randomAgent = (team) => {
  const of = AGENTS.filter((a) => a.team === team)
  return of[Math.floor(Math.random() * of.length)].id
}

CASES.push(
  { id: 'capsule', name: 'Sticker Capsule', color: '#8a5ad6', kind: 'sticker', stickers: STICKERS.map((k) => k.id) },
  { id: 'musicbox', name: 'Music Kit Box', color: '#d68a2a', kind: 'music', music: MUSIC_KITS.filter((k) => k.id !== 'default').map((k) => k.id) },
  { id: 'agents', name: 'Agent Dossier', color: '#4a6a8a', kind: 'agent', agents: AGENTS.map((a) => a.id) },
)
export const caseById = Object.fromEntries(CASES.map((c) => [c.id, c]))
/** What kind of thing an item is. */
export const kindOf = (it) => it?.kind ?? 'skin'
export const KEY_PRICE = 5 // credits

// ---------------- Rolling
/** Picks what comes out of a case: rarity by the classic odds, then a skin of that rarity. */
export function rollCase(caseId, rand = Math.random) {
  const c = caseById[caseId]
  if (c.kind === 'music') return { kind: 'music', music: c.music[Math.floor(rand() * c.music.length)], r: 'milspec', st: rand() < 0.1 ? 0 : null }
  if (c.kind === 'agent') {
    const x = rand()
    const grade = x < 0.03 ? 'covert' : x < 0.12 ? 'classified' : x < 0.4 ? 'restricted' : 'milspec'
    const of = AGENTS.filter((a) => a.rarity === grade)
    return { kind: 'agent', agent: of[Math.floor(rand() * of.length)].id, r: grade }
  }
  if (c.kind === 'sticker') {
    const odds = { milspec: 0.8, restricted: 0.16, classified: 0.032, covert: 0.008 }
    let x = rand()
    let grade = 'milspec'
    for (const [k, p] of Object.entries(odds)) {
      x -= p
      if (x <= 0) {
        grade = k
        break
      }
    }
    const of = STICKERS.filter((k) => k.rarity === grade)
    return { kind: 'sticker', sticker: of[Math.floor(rand() * of.length)].id, r: grade }
  }
  const pool = c.skins.map((id) => skinById[id])
  const present = RARITY_ORDER.filter((r) => pool.some((s) => s.rarity === r))
  const total = present.reduce((s, r) => s + RARITY[r].odds, 0)
  let r = rand() * total
  let rarity = present[0]
  for (const k of present) {
    r -= RARITY[k].odds
    if (r <= 0) {
      rarity = k
      break
    }
  }
  const of = pool.filter((s) => s.rarity === rarity)
  const skin = of[Math.floor(rand() * of.length)]
  return makeItem(skin.id, rand)
}
/** A concrete item: a skin plus its float (wear), pattern seed and maybe StatTrak™. */
export function makeItem(skinId, rand = Math.random) {
  // floats cluster in Field-Tested like the real thing
  const wear = Math.min(0.999, Math.max(0.0001, Math.pow(rand(), 1.6) * 0.8 + rand() * 0.06))
  return { skin: skinId, r: skinById[skinId]?.rarity, wear: Number(wear.toFixed(4)), seed: Math.floor(rand() * 1000), st: rand() < 0.1 ? 0 : null }
}
export function itemName(it) {
  if (kindOf(it) === 'agent') {
    const a = agentById[it.agent]
    return `${a?.name ?? '?'} | ${a?.title ?? ''}`
  }
  if (kindOf(it) === 'sticker') return `Sticker | ${stickerById[it.sticker]?.name ?? '?'}`
  if (kindOf(it) === 'music') {
    const k = musicById[it.music]
    return `${it.st != null ? 'StatTrak™ ' : ''}Music Kit | ${k?.artist}, ${k?.name}`
  }
  const s = skinById[it.skin]
  const w = WEAPONS[s.weapon]
  const p = patternOf(it)
  return `${s.rarity === 'gold' ? '★ ' : ''}${it.st != null ? 'StatTrak™ ' : ''}${w.name} | ${s.name}${p?.gem ? ` (${p.note.split(' · ')[0]})` : ''}`
}

// ---------------- Pattern templates
// An item's seed (0-999) is its pattern template. On most finishes it only moves the pattern
// around, but on some knives it decides what you actually got, like the real thing: a Doppler's
// phase (or, rarely, a Ruby, Sapphire or Black Pearl), a Gamma Doppler's phase (or an Emerald),
// a Fade's percentage, how blue a Case Hardened is (the "blue gems"), and a Marble Fade's Fire & Ice.
const DOPPLER_PHASES = [
  { note: 'Phase 1', colors: ['#14070f', '#3a1a4a', '#ff4fb8'] },
  { note: 'Phase 2', colors: ['#2a0f45', '#ff4fb8', '#9b3bff'], value: 1.15 },
  { note: 'Phase 3', colors: ['#0f2a45', '#2bd6a8', '#3b7bff'] },
  { note: 'Phase 4', colors: ['#1a0f45', '#3b7bff', '#9b3bff'], value: 1.15 },
]
const DOPPLER_GEMS = [
  { note: 'Ruby', colors: ['#3a0008', '#c8102e', '#ff4a5a'], value: 8, gem: true },
  { note: 'Sapphire', colors: ['#00103a', '#1e4fff', '#4ac8ff'], value: 8, gem: true },
  { note: 'Black Pearl', colors: ['#07070f', '#2a1a4a', '#6a4aa0'], value: 6, gem: true },
]
const GAMMA_PHASES = [
  { note: 'Phase 1', colors: ['#0d2a1a', '#2ee67a', '#0d4a3a'] },
  { note: 'Phase 2', colors: ['#0d2a1a', '#2ee67a', '#2a6fd6'], value: 1.15 },
  { note: 'Phase 3', colors: ['#0a1f2a', '#1ec8a0', '#3b7bff'] },
  { note: 'Phase 4', colors: ['#0d1a3a', '#2a6fd6', '#2ee6d6'], value: 1.15 },
]
const EMERALD = { note: 'Emerald', colors: ['#003a1a', '#00c060', '#5affa0'], value: 7, gem: true }
const BLUE_GEMS = new Set([661, 670, 321, 151, 555, 179, 387, 868, 592, 760])
const unit = (seed, salt) => {
  let h = Math.imul((seed | 0) + 1, 2654435761) ^ Math.imul(salt, 40503)
  h = Math.imul(h ^ (h >>> 15), 2246822519)
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296
}
/** How blue a Case Hardened is (%), from its pattern template. */
export const bluePct = (seed) => (BLUE_GEMS.has(seed) ? 90 + (seed % 9) : Math.round(5 + 70 * Math.pow(unit(seed, 7), 2.2)))
/** How far a Fade goes (%): 80 to 100. */
export const fadePct = (seed) => 80 + Math.floor(unit(seed, 3) * 21)
/**
 * What an item's pattern template means, if anything: { note, value (a price multiplier), gem,
 * colors (for finishes whose colours depend on it) } or null.
 */
export function patternOf(it) {
  const skin = skinById[it?.skin]
  if (!skin) return null
  const seed = it.seed ?? 0
  if (skin.pattern === 'doppler') {
    const r = seed % 100
    return r < 3 ? DOPPLER_GEMS[r] : DOPPLER_PHASES[seed % 4]
  }
  if (skin.pattern === 'gamma') return seed % 100 < 2 ? EMERALD : GAMMA_PHASES[seed % 4]
  if (skin.weapon !== 'knife') return null
  if (skin.pattern === 'fade') {
    const p = fadePct(seed)
    return { note: `${p}% Fade`, value: p >= 98 ? 1.5 : 1 }
  }
  if (skin.pattern === 'hardened') {
    const b = bluePct(seed)
    return { note: b >= 85 ? `Blue Gem · ${b}% blue` : `${b}% blue`, value: b >= 85 ? 5 : b >= 50 ? 1.5 : 1, gem: b >= 85 }
  }
  if (skin.pattern === 'marblefade' && seed % 25 === 0) return { note: 'Fire & Ice', value: 3, gem: true }
  return null
}

// ---------------- Painting the textures
function rng(seed) {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return (s >>> 0) / 4294967296
  }
}
function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const ch = (p, k) => (p >> k) & 255
  const c = (k) => Math.round(ch(pa, k) + (ch(pb, k) - ch(pa, k)) * t)
  return `rgb(${c(16)},${c(8)},${c(0)})`
}
const hex6 = (c) => (c.length === 4 ? '#' + [...c.slice(1)].map((x) => x + x).join('') : c)

/** Marble swirls in three colours (warp: extra swirl). */
function marbleFill(g, N, c0, c1, c2, seed, warp) {
  const img = g.createImageData(N, N)
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const v = Math.sin((x + Math.sin(y * 0.05 + seed) * 30 + Math.sin(x * 0.031 + y * 0.017) * 40 + warp * Math.sin(y * 0.11 + x * 0.02) * 18) * 0.05) * 0.5 + 0.5
      const a = v < 0.5 ? mix(c0, c1, v * 2) : mix(c1, c2, (v - 0.5) * 2)
      const m = a.match(/\d+/g)
      const i = (y * N + x) * 4
      img.data[i] = +m[0]
      img.data[i + 1] = +m[1]
      img.data[i + 2] = +m[2]
      img.data[i + 3] = 255
    }
  g.putImageData(img, 0, 0)
}
/** Paints a skin's pattern onto a canvas (size × size). */
export function paintSkin(skin, seed = 1, wear = 0.1, size = 256) {
  const cv = document.createElement('canvas')
  cv.width = cv.height = size
  const g = cv.getContext('2d')
  const R = rng(seed * 7919 + skin.id.length * 31)
  const col = (patternOf({ skin: skin.id, seed })?.colors ?? skin.colors).map(hex6)
  const [c0, c1 = c0, c2 = c1, c3 = c2] = col
  const N = size
  g.fillStyle = c0
  g.fillRect(0, 0, N, N)
  switch (skin.pattern) {
    case 'solid':
      for (let i = 0; i < 400; i++) {
        g.fillStyle = `rgba(255,255,255,${R() * 0.04})`
        g.fillRect(R() * N, R() * N, 2, 2)
      }
      break
    case 'camo':
      for (const c of [c1, c2, c3]) {
        g.fillStyle = c
        for (let i = 0; i < 9; i++) {
          g.beginPath()
          const x = R() * N
          const y = R() * N
          for (let k = 0; k < 9; k++) {
            const a = (k / 9) * Math.PI * 2
            const r = N * (0.06 + R() * 0.08)
            k ? g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
          }
          g.fill()
        }
      }
      break
    case 'digital': {
      const px = N / 32
      for (let y = 0; y < 32; y++)
        for (let x = 0; x < 32; x++) {
          const v = Math.sin(x * 0.5 + seed) + Math.cos(y * 0.6 - seed * 0.3) + R() * 1.4
          g.fillStyle = v > 1.4 ? c2 : v > 0.4 ? c1 : c0
          g.fillRect(x * px, y * px, px, px)
        }
      break
    }
    case 'hex': {
      const r = N / 14
      g.strokeStyle = c1
      g.lineWidth = 2
      for (let row = -1; row < 16; row++)
        for (let q = -1; q < 12; q++) {
          const x = q * r * 1.75 + (row % 2) * r * 0.87
          const y = row * r * 1.5
          g.beginPath()
          for (let k = 0; k < 7; k++) {
            const a = (k / 6) * Math.PI * 2 + Math.PI / 6
            k ? g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
          }
          if (R() < 0.18) {
            g.fillStyle = c1
            g.fill()
          }
          g.stroke()
        }
      break
    }
    case 'tiger':
      g.fillStyle = c1
      for (let i = 0; i < 16; i++) {
        const x = R() * N
        g.beginPath()
        g.moveTo(x, -10)
        for (let y = 0; y <= N + 10; y += 16) g.lineTo(x + Math.sin(y * 0.05 + i) * 14 + (R() - 0.5) * 8, y)
        for (let y = N + 10; y >= 0; y -= 16) g.lineTo(x + Math.sin(y * 0.05 + i) * 14 + 6 + R() * 10, y)
        g.fill()
      }
      break
    case 'fade': {
      // (a knife's fade percentage: the higher, the further the first colour reaches)
      const f = skin.weapon === 'knife' ? (fadePct(seed) - 80) / 20 : 0.5
      const gr = g.createLinearGradient(0, 0, N, N * 0.35)
      gr.addColorStop(0, c0)
      gr.addColorStop(0.35 + f * 0.3, c1)
      gr.addColorStop(1, c2)
      g.fillStyle = gr
      g.fillRect(0, 0, N, N)
      break
    }
    case 'marble':
      marbleFill(g, N, c0, c1, c2, seed, 0)
      break
    case 'hardened': {
      // blue, gold and steel in rippling blotches (how much blue depends on the seed: bluePct)
      const blueAt = skin.weapon === 'knife' ? 1.15 - (bluePct(seed) / 100) * 2.2 : 0.35
      const img = g.createImageData(N, N)
      const ph = R() * 10
      for (let y = 0; y < N; y++)
        for (let x = 0; x < N; x++) {
          const v = Math.sin(x * 0.04 + ph) * Math.cos(y * 0.05 - ph) + Math.sin((x + y) * 0.021 + ph * 2) * 0.7 + Math.sin(x * 0.13) * 0.15
          const c = v > blueAt ? c0 : v < -0.45 ? c1 : c2
          const m = parseInt(c.slice(1), 16)
          const i = (y * N + x) * 4
          const sh = 0.8 + 0.2 * Math.sin(x * 0.3 + y * 0.2)
          img.data[i] = ((m >> 16) & 255) * sh
          img.data[i + 1] = ((m >> 8) & 255) * sh
          img.data[i + 2] = (m & 255) * sh
          img.data[i + 3] = 255
        }
      g.putImageData(img, 0, 0)
      break
    }
    case 'damascus':
      g.strokeStyle = c1
      g.lineWidth = 2
      for (let k = 0; k < 40; k++) {
        g.beginPath()
        for (let x = 0; x <= N; x += 4) {
          const y = k * 7 + Math.sin(x * 0.04 + k * 0.4 + seed) * 10 + Math.sin(x * 0.11) * 3
          x ? g.lineTo(x, y) : g.moveTo(x, y)
        }
        g.stroke()
      }
      break
    case 'carbon': {
      const s = 8
      for (let y = 0; y < N; y += s)
        for (let x = 0; x < N; x += s) {
          const gr = g.createLinearGradient(x, y, x + s, y + s)
          const on = ((x + y) / s) % 2
          gr.addColorStop(0, on ? '#2a2a2e' : '#141416')
          gr.addColorStop(1, on ? '#141416' : '#2a2a2e')
          g.fillStyle = gr
          g.fillRect(x, y, s, s)
        }
      g.fillStyle = c1
      g.fillRect(0, N * 0.45, N, N * 0.06)
      break
    }
    case 'splatter':
      for (const [c, n] of [[c1, 30], [c2, 22]]) {
        g.fillStyle = c
        for (let i = 0; i < n; i++) {
          const x = R() * N
          const y = R() * N
          const r = 3 + R() * 18
          g.beginPath()
          g.arc(x, y, r, 0, 7)
          g.fill()
          for (let d = 0; d < 5; d++) {
            g.beginPath()
            g.arc(x + (R() - 0.5) * r * 4, y + (R() - 0.5) * r * 4, 1 + R() * 3, 0, 7)
            g.fill()
          }
        }
      }
      break
    case 'blocks':
      // big flat graphic panels, like the poster-art skins
      for (let i = 0; i < 9; i++) {
        g.fillStyle = [c1, c2, c0][i % 3]
        g.save()
        g.translate(R() * N, R() * N)
        g.rotate(Math.floor(R() * 4) * (Math.PI / 4))
        g.fillRect(-N * 0.25, -N * 0.06, N * (0.25 + R() * 0.4), N * (0.06 + R() * 0.12))
        g.restore()
      }
      g.strokeStyle = c2
      g.lineWidth = 3
      for (let i = 0; i < 5; i++) {
        g.beginPath()
        const y = R() * N
        g.moveTo(0, y)
        g.lineTo(N, y + (R() - 0.5) * 40)
        g.stroke()
      }
      break
    case 'stripes':
      for (let i = -N; i < N * 2; i += 36) {
        g.fillStyle = c1
        g.beginPath()
        g.moveTo(i, 0)
        g.lineTo(i + 14, 0)
        g.lineTo(i + 14 - N * 0.6, N)
        g.lineTo(i - N * 0.6, N)
        g.fill()
        g.fillStyle = c2
        g.fillRect(i - N * 0.3 + 18, N * 0.48, 8, N * 0.04)
      }
      break
    case 'scales':
      for (let y = 0; y < N + 16; y += 14)
        for (let x = 0; x < N + 16; x += 16) {
          const ox = (y / 14) % 2 ? 8 : 0
          const gr = g.createRadialGradient(x + ox, y, 2, x + ox, y, 12)
          gr.addColorStop(0, c1)
          gr.addColorStop(1, c0)
          g.fillStyle = gr
          g.beginPath()
          g.arc(x + ox, y, 10, 0, Math.PI)
          g.fill()
        }
      g.fillStyle = c2
      for (let i = 0; i < 4; i++) {
        g.beginPath()
        g.arc(R() * N, R() * N, 10 + R() * 20, 0, 7)
        g.globalAlpha = 0.7
        g.fill()
        g.globalAlpha = 1
      }
      break
    case 'circuit':
      g.strokeStyle = c1
      g.lineWidth = 2
      for (let i = 0; i < 40; i++) {
        let x = Math.round((R() * N) / 8) * 8
        let y = Math.round((R() * N) / 8) * 8
        g.beginPath()
        g.moveTo(x, y)
        for (let k = 0; k < 5; k++) {
          if (R() < 0.5) x += (R() < 0.5 ? -1 : 1) * 8 * (1 + Math.floor(R() * 4))
          else y += (R() < 0.5 ? -1 : 1) * 8 * (1 + Math.floor(R() * 4))
          g.lineTo(x, y)
        }
        g.stroke()
        g.fillStyle = c2
        g.fillRect(x - 3, y - 3, 6, 6)
      }
      break
    case 'doppler':
    case 'gamma':
      marbleFill(g, N, c0, c1, c2, seed, 1)
      // the dark swirls and the glitter
      for (let i = 0; i < 260; i++) {
        g.fillStyle = `rgba(255,255,255,${R() * 0.18})`
        g.fillRect(R() * N, R() * N, 1 + R() * 2, 1)
      }
      break
    case 'marblefade': {
      // red, yellow and blue in warped bands; Fire & Ice has no yellow
      const fi = seed % 25 === 0
      const bands = fi ? [c0, c2, c0, c2] : [c0, c1, c2, c1]
      const img = g.createImageData(N, N)
      for (let y = 0; y < N; y++)
        for (let x = 0; x < N; x++) {
          const t = (x / N + Math.sin(y * 0.04 + seed) * 0.12 + Math.sin(x * 0.03 + y * 0.02) * 0.08) * (bands.length - 1)
          const k = Math.max(0, Math.min(bands.length - 2, Math.floor(t)))
          const m = mix(bands[k], bands[k + 1], Math.max(0, Math.min(1, t - k))).match(/\d+/g)
          const i = (y * N + x) * 4
          img.data[i] = +m[0]
          img.data[i + 1] = +m[1]
          img.data[i + 2] = +m[2]
          img.data[i + 3] = 255
        }
      g.putImageData(img, 0, 0)
      break
    }
    case 'lore': {
      // engraved gold filigree on dark steel
      g.lineWidth = 2.5
      for (let k = 0; k < 26; k++) {
        const x = R() * N
        const y = R() * N
        const r0 = 6 + R() * 16
        g.strokeStyle = k % 3 ? c1 : c2
        g.beginPath()
        for (let a = 0; a < Math.PI * 3.2; a += 0.2) {
          const r = r0 * (1 - a / (Math.PI * 4))
          const px = x + Math.cos(a + k) * r
          const py = y + Math.sin(a + k) * r
          a ? g.lineTo(px, py) : g.moveTo(px, py)
        }
        g.stroke()
      }
      g.strokeStyle = c1
      g.lineWidth = 3
      for (let y = 20; y < N; y += 64) {
        g.beginPath()
        for (let x = 0; x <= N; x += 4) g.lineTo(x, y + Math.sin(x * 0.08 + seed) * 6)
        g.stroke()
      }
      break
    }
    case 'mesh':
      for (let i = 0; i < 18; i++) {
        g.fillStyle = i % 2 ? c1 : c2
        g.globalAlpha = 0.7
        g.beginPath()
        g.ellipse(R() * N, R() * N, 10 + R() * 26, 6 + R() * 16, R() * 3, 0, 7)
        g.fill()
      }
      g.globalAlpha = 0.55
      g.strokeStyle = '#2a2a1a'
      g.lineWidth = 1
      for (let k = -N; k < N * 2; k += 7) {
        g.beginPath()
        g.moveTo(k, 0)
        g.lineTo(k + N, N)
        g.moveTo(k + N, 0)
        g.lineTo(k, N)
        g.stroke()
      }
      g.globalAlpha = 1
      break
    case 'freehand':
      // a ballpoint doodled over every inch of it
      g.strokeStyle = c1
      g.lineWidth = 1.6
      for (let k = 0; k < 90; k++) {
        g.beginPath()
        const x = R() * N
        const y = R() * N
        g.moveTo(x, y)
        g.bezierCurveTo(x + (R() - 0.5) * 60, y + (R() - 0.5) * 60, x + (R() - 0.5) * 60, y + (R() - 0.5) * 60, x + (R() - 0.5) * 50, y + (R() - 0.5) * 50)
        g.stroke()
      }
      g.strokeStyle = c2
      for (let k = 0; k < 30; k++) {
        g.beginPath()
        g.arc(R() * N, R() * N, 3 + R() * 9, 0, 7)
        g.stroke()
      }
      break
    case 'rust':
      for (let i = 0; i < 1400; i++) {
        g.fillStyle = R() < 0.6 ? c1 : c2
        g.globalAlpha = 0.15 + R() * 0.5
        g.beginPath()
        g.arc(R() * N, R() * N, 1 + R() * 5, 0, 7)
        g.fill()
      }
      g.globalAlpha = 1
      break
    case 'stained':
      for (let i = 0; i < 30; i++) {
        g.fillStyle = R() < 0.5 ? c1 : c2
        g.globalAlpha = 0.25 + R() * 0.3
        g.beginPath()
        const x = R() * N
        const y = R() * N
        for (let k = 0; k < 10; k++) {
          const a = (k / 10) * Math.PI * 2
          const r = 8 + R() * 22
          g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
        }
        g.fill()
      }
      g.globalAlpha = 1
      break
    case 'laminate':
      for (let y = 0; y < N; y += 3) {
        g.fillStyle = [c0, c1, c2][Math.floor((y / 3 + Math.sin(y * 0.05 + seed) * 2) % 3 + 3) % 3]
        g.beginPath()
        g.moveTo(0, y)
        for (let x = 0; x <= N; x += 8) g.lineTo(x, y + Math.sin(x * 0.03 + y * 0.01) * 4)
        g.lineTo(N, y + 4)
        g.lineTo(0, y + 4)
        g.fill()
      }
      break
    case 'bluesteel': {
      const gr = g.createLinearGradient(0, 0, N, N)
      gr.addColorStop(0, c0)
      gr.addColorStop(0.5, c1)
      gr.addColorStop(1, c2)
      g.fillStyle = gr
      g.fillRect(0, 0, N, N)
      g.globalAlpha = 0.18
      for (let y = 0; y < N; y += 2) {
        g.fillStyle = R() < 0.5 ? '#fff' : '#000'
        g.fillRect(0, y, N, 1)
      }
      g.globalAlpha = 1
      break
    }
    case 'waves':
      for (let k = 0; k < 14; k++) {
        g.fillStyle = k % 2 ? c1 : c2
        g.beginPath()
        g.moveTo(0, N)
        for (let x = 0; x <= N; x += 6) g.lineTo(x, k * 20 + Math.sin(x * 0.05 + k) * 8)
        g.lineTo(N, N)
        g.globalAlpha = 0.55
        g.fill()
        g.globalAlpha = 1
      }
      break
  }
  // Wear: scratches and chipped paint showing grey metal, more the higher the float.
  const scratches = Math.floor(wear * 900)
  for (let i = 0; i < scratches; i++) {
    g.strokeStyle = `rgba(150,155,160,${0.25 + R() * 0.5})`
    g.lineWidth = R() < 0.8 ? 1 : 2
    g.beginPath()
    const x = R() * N
    const y = R() * N
    g.moveTo(x, y)
    g.lineTo(x + (R() - 0.5) * 18, y + (R() - 0.5) * 6)
    g.stroke()
  }
  if (wear > 0.38) {
    for (let i = 0; i < wear * 80; i++) {
      g.fillStyle = `rgba(120,124,130,${0.4 + R() * 0.4})`
      g.beginPath()
      g.arc(R() * N, R() * N, 2 + R() * 7 * wear, 0, 7)
      g.fill()
    }
  }
  // grime
  g.fillStyle = `rgba(40,32,24,${wear * 0.25})`
  g.fillRect(0, 0, N, N)
  return cv
}

const matCache = new Map()
/** A material for an item: { skin, wear, seed } (cached). */
export function skinMaterial(item) {
  if (!item || !skinById[item.skin] || typeof document === 'undefined') return null
  const key = `${item.skin}|${item.seed}|${Math.round(item.wear * 50)}`
  if (!matCache.has(key)) {
    const skin = skinById[item.skin]
    const tex = new THREE.CanvasTexture(paintSkin(skin, item.seed, item.wear))
    tex.colorSpace = THREE.SRGBColorSpace
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(3.2, 3.2) // extruded parts are UV-mapped in metres
    tex.anisotropy = 4
    const metal = ['fade', 'marble', 'hardened', 'damascus', 'doppler', 'gamma', 'marblefade', 'bluesteel', 'lore'].includes(skin.pattern)
    matCache.set(key, new THREE.MeshPhongMaterial({ map: tex, shininess: metal ? 90 : 30, specular: metal ? '#8a8a8a' : '#2a2a2a' }))
  }
  return matCache.get(key)
}
export const itemKey = (it) => (it ? `${it.skin}|${it.seed}|${Math.round(it.wear * 50)}|${(it.stickers ?? []).join(',')}` : '')

// ---------------- The inventory (saved in localStorage)
const KEY = 'strife-inventory'
function blank() {
  return { items: [], equipped: {}, credits: 0, keys: 1, cases: { synergy: 1 }, nextUid: 1, opened: 0 }
}
export function loadInventory() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (v && Array.isArray(v.items)) return { ...blank(), ...v }
  } catch {}
  return blank()
}
export function saveInventory(inv) {
  try {
    localStorage.setItem(KEY, JSON.stringify(inv))
  } catch {}
}
export function addItem(inv, item) {
  const it = { ...item, uid: inv.nextUid++, at: Date.now() }
  inv.items.unshift(it)
  return it
}
/** Equip (or unequip) an item for its weapon. */
export function toggleEquip(inv, uid) {
  const it = inv.items.find((x) => x.uid === uid)
  if (!it) return
  // (an agent goes in its side's slot: agentT or agentCT)
  const w = kindOf(it) === 'agent' ? `agent${agentById[it.agent]?.team}` : skinById[it.skin].weapon
  if (inv.equipped[w] === uid) delete inv.equipped[w]
  else inv.equipped[w] = uid
}
/** Your agents: { T, CT } agent ids (or null for the standard look). */
export function equippedAgents(inv) {
  const id = (k) => {
    const it = equippedFor(inv, k)
    return it && kindOf(it) === 'agent' ? it.agent : null
  }
  return { T: id('agentT'), CT: id('agentCT') }
}
export function equippedFor(inv, weaponId) {
  const uid = inv.equipped[weaponId]
  return uid ? inv.items.find((x) => x.uid === uid) ?? null : null
}
/** A skin descriptor for a gun in play (small, serialisable). */
export const skinDesc = (it) => (it ? { skin: it.skin, wear: it.wear, seed: it.seed, key: itemKey(it), uid: it.uid, stickers: it.stickers ?? [] } : null)

// ---------------- Painting stickers
const stickerMats = new Map()
export function paintSticker(k, size = 128) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')
  const S = size
  // a die-cut shape with a white border
  g.fillStyle = '#ffffff'
  g.beginPath()
  g.roundRect(4, 4, S - 8, S - 8, S * 0.22)
  g.fill()
  let fill = k.bg
  if (k.style === 'holo') {
    const gr = g.createLinearGradient(0, 0, S, S)
    for (const [t, col] of [[0, '#ff7ad9'], [0.25, '#7ae0ff'], [0.5, '#c4ff7a'], [0.75, '#ffd27a'], [1, '#b07aff']]) gr.addColorStop(t, col)
    fill = gr
  } else if (k.style === 'foil') {
    const gr = g.createLinearGradient(0, 0, S, S)
    gr.addColorStop(0, '#d8dde2')
    gr.addColorStop(0.5, '#8f99a3')
    gr.addColorStop(1, '#eef2f5')
    fill = gr
  } else if (k.style === 'gold') {
    const gr = g.createLinearGradient(0, 0, S, S)
    gr.addColorStop(0, '#fff1b0')
    gr.addColorStop(0.45, '#e4ae39')
    gr.addColorStop(1, '#8a5a12')
    fill = gr
  }
  g.fillStyle = fill
  g.beginPath()
  g.roundRect(10, 10, S - 20, S - 20, S * 0.18)
  g.fill()
  if (k.style === 'holo' || k.style === 'foil' || k.style === 'gold') {
    g.globalAlpha = 0.55
    g.fillStyle = k.bg
    g.beginPath()
    g.roundRect(18, 18, S - 36, S - 36, S * 0.14)
    g.fill()
    g.globalAlpha = 1
  }
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  if (k.emoji) {
    g.font = `${S * (k.text ? 0.36 : 0.52)}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`
    g.fillText(k.emoji, S / 2, k.text ? S * 0.38 : S / 2 + 2)
  }
  if (k.text) {
    const fs = Math.min(S * 0.34, (S * 1.5) / Math.max(2, k.text.length))
    g.font = `900 ${fs}px Impact, "Arial Black", sans-serif`
    g.lineWidth = fs * 0.14
    g.strokeStyle = 'rgba(0,0,0,0.55)'
    const y = k.emoji ? S * 0.72 : S / 2 + 2
    g.strokeText(k.text, S / 2, y)
    g.fillStyle = k.fg
    g.fillText(k.text, S / 2, y)
  }
  return c
}
/** A material for a sticker on a gun (cached). */
export function stickerMaterial(id) {
  const k = stickerById[id]
  if (!k || typeof document === 'undefined') return null
  if (!stickerMats.has(id)) {
    const t = new THREE.CanvasTexture(paintSticker(k))
    t.colorSpace = THREE.SRGBColorSpace
    stickerMats.set(id, new THREE.MeshPhongMaterial({ map: t, transparent: true, alphaTest: 0.2, shininess: k.style === 'paper' ? 10 : 90, specular: k.style === 'paper' ? '#222' : '#aaa', polygonOffset: true, polygonOffsetFactor: -2 }))
  }
  return stickerMats.get(id)
}
const stickerUrls = new Map()
export function stickerUrl(id) {
  if (!stickerUrls.has(id)) stickerUrls.set(id, stickerById[id] ? paintSticker(stickerById[id], 96).toDataURL() : '')
  return stickerUrls.get(id)
}

// ---------------- Trade-up contracts
/** What a contract of these items could give: [{ skin, weight }], or why it can't be signed. */
export function tradeUpOutcomes(items) {
  const grades = ['milspec', 'restricted', 'classified', 'covert']
  if (!items.length) return { error: 'Add skins of one grade.' }
  const r0 = skinById[items[0].skin]?.rarity
  if (!items.every((it) => kindOf(it) === 'skin' && skinById[it.skin]?.rarity === r0)) return { error: 'Every skin in a contract must be the same grade.' }
  if (!grades.includes(r0)) return { error: 'Knives can’t go into a contract.' }
  const need = r0 === 'covert' ? 5 : 10
  const next = r0 === 'covert' ? 'gold' : grades[grades.indexOf(r0) + 1]
  const weights = new Map()
  for (const it of items) {
    const c = CASES.find((cs) => cs.skins?.includes(it.skin))
    const pool = (c?.skins ?? []).map((id) => skinById[id]).filter((s) => s.rarity === next)
    for (const s of pool) weights.set(s.id, (weights.get(s.id) ?? 0) + 1 / pool.length)
  }
  return { need, grade: r0, next, outcomes: [...weights].map(([skin, weight]) => ({ skin, weight: weight / items.length })).sort((a, b) => b.weight - a.weight) }
}
/** Signs it: the result (wear is the average of the inputs; StatTrak™ only if they all were). */
export function signTradeUp(items, rand = Math.random) {
  const o = tradeUpOutcomes(items)
  if (o.error || items.length !== o.need || !o.outcomes.length) return null
  let x = rand()
  let pick = o.outcomes[0].skin
  for (const out of o.outcomes) {
    x -= out.weight
    if (x <= 0) {
      pick = out.skin
      break
    }
  }
  const wear = items.reduce((s, it) => s + it.wear, 0) / items.length
  const it = makeItem(pick, rand)
  return { ...it, wear: Number(wear.toFixed(4)), st: items.every((i) => i.st != null) ? 0 : null }
}

/** Random skins for bots, so the server looks lived-in. */
export function randomSkinFor(weaponId, rand = Math.random) {
  const pool = SKINS.filter((s) => s.weapon === weaponId)
  if (!pool.length) return null
  const it = makeItem(pool[Math.floor(rand() * pool.length)].id, rand)
  return skinDesc({ ...it, uid: 0 })
}
