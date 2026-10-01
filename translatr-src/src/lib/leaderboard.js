// The Global Leaderboard, now real (in the worst way). Ranked by peak wallet.
//   · Below 10% of #5's score you are #9,999,999, like everyone who has ever played anything.
//   · From 10% to 100% of #5 you climb, on a log scale, towards #6.
//   · Past #5 you're in the top 5 for real. #1 (xX_Whale_Xx) stays at least 2× ahead. Forever.

import { LEADERBOARD } from '../data/gameData'

const LN_FLOOR = Math.log(LEADERBOARD.playerRank)
const LN_SIX = Math.log(LEADERBOARD.players.length + 1)

/** The top 5, grown by your play time. The whale always keeps its lead on `you`. */
export function npcStandings(you, playSeconds = 0, wobble = 0) {
  const growth = 1 + (LEADERBOARD.growthPerHour * playSeconds) / 3600
  return LEADERBOARD.players.map((p, id) => ({
    ...p,
    id,
    score: id === 0 ? Math.max(p.score * growth, you * (LEADERBOARD.whaleLead + 0.05 + wobble)) : p.score * growth,
  }))
}

/** Your rank for a peak wallet of `you`. */
export function rankFor(you, playSeconds = 0) {
  const npcs = npcStandings(you, playSeconds)
  const fifth = npcs[npcs.length - 1].score
  if (you >= fifth) return 1 + npcs.filter((n) => n.score > you).length
  const floor = fifth * LEADERBOARD.riseFrom
  if (!(you > floor)) return LEADERBOARD.playerRank
  const t = Math.log(you / floor) / Math.log(fifth / floor) // 0 → 1 across the climb
  return Math.max(npcs.length + 1, Math.round(Math.exp(LN_FLOOR + (LN_SIX - LN_FLOOR) * t)))
}
