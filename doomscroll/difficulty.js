// DOOMSCROLL difficulties: twenty of them, all "easy". Listed from the "easiest" to the "hardest",
// except the joke is the other way round: the easiest one doubles every level's enemies (bosses
// excepted) and is the hardest by far; the rest only nudge enemy health, damage and speed.
// Shared by nikstil.com/doomscroll/ and TRANSLATR™'s arcade (same site, so one choice covers both).

const BRAINROT =
  "ok so like hear me out this one is easy no cap fr fr because the skibidi pop-ups are literally mewing " +
  "in the ohio boardroom while the rizzler CFO edges the quarterly earnings and im lowkey highkey " +
  "gyatt-maxxing my ban hammer like bro it's easy bro just trust the sigma grindset, the algorithm said " +
  "sheesh so we ball, erm what the sigma, it's giving easy, it's giving fanum tax on my ammo, it's giving " +
  "we're so back, it's so over, we're so back again, delulu is the solulu, anyway easy mode is bussin on " +
  "god no printer, grimace shake, only in ohio, the rizz is immeasurable, i am steve, chicken jockey, " +
  "six seven, easy.";

// count: how many of each normal enemy (bosses never double) · hp, dmg, speed: enemy multipliers
export const DIFFICULTIES = [
  { name: "Baby’s First Easy Mode 🍼 (the easiest)", count: 2, hp: 1, dmg: 1, speed: 1 },
  { name: "Easy Peasy Lemon Squeezy", count: 1, hp: 0.6, dmg: 0.5, speed: 0.8 },
  { name: "Easy Mode (Tax Included)", count: 1, hp: 0.65, dmg: 0.55, speed: 0.85 },
  { name: "Easy (7-Day Premium Trial)", count: 1, hp: 0.7, dmg: 0.6, speed: 0.85 },
  { name: "Easy-ish", count: 1, hp: 0.75, dmg: 0.65, speed: 0.9 },
  { name: "Easy But Make It Fashion", count: 1, hp: 0.8, dmg: 0.7, speed: 0.9 },
  { name: "Easy Like Sunday Morning", count: 1, hp: 0.8, dmg: 0.75, speed: 0.95 },
  { name: "Easy, Said Nobody", count: 1, hp: 0.85, dmg: 0.8, speed: 0.95 },
  { name: "Easy Mode (Now With More Ads)", count: 1, hp: 0.9, dmg: 0.85, speed: 1 },
  { name: "Fairly Easy For A Tuesday", count: 1, hp: 0.9, dmg: 0.9, speed: 1 },
  { name: "Easy (As Advertised)", count: 1, hp: 1, dmg: 1, speed: 1 },
  { name: "Easy If You’re Built Different", count: 1, hp: 1, dmg: 1.05, speed: 1 },
  { name: "Easy According To The Tutorial", count: 1, hp: 1.05, dmg: 1.05, speed: 1.05 },
  { name: "Easy Once You Git Gud", count: 1, hp: 1.05, dmg: 1.1, speed: 1.05 },
  { name: "Technically Easy", count: 1, hp: 1.1, dmg: 1.1, speed: 1.05 },
  { name: "Easy (Source: Trust Me Bro)", count: 1, hp: 1.1, dmg: 1.15, speed: 1.1 },
  { name: "Deceptively Easy", count: 1, hp: 1.15, dmg: 1.15, speed: 1.1 },
  { name: "Easy With A Side Of Suffering", count: 1, hp: 1.15, dmg: 1.2, speed: 1.1 },
  { name: "The Easy Way Out (There Is None)", count: 1, hp: 1.2, dmg: 1.2, speed: 1.15 },
  { name: BRAINROT, count: 1, hp: 1.2, dmg: 1.25, speed: 1.15 },
];

const KEY = "doomscroll-difficulty";
/** The saved choice (its index), or null if the player hasn't picked one yet. */
export function savedDifficulty() {
  try {
    const i = Number(localStorage.getItem(KEY));
    return localStorage.getItem(KEY) !== null && DIFFICULTIES[i] ? i : null;
  } catch {
    return null;
  }
}
export function saveDifficulty(i) {
  try {
    localStorage.setItem(KEY, String(i));
  } catch {
    // private mode: they'll be asked again next time
  }
}
