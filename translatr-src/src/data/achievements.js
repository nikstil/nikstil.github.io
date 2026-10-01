// The Hall of Shame. Each check reads game state; the game loop unlocks them.
// Achievements are lifetime: they survive Prestige AND the Trap Ad. The game remembers.

import { DEFAULT_WINDOW_ORDER, isWindowAvailable } from './windows'
import { ENDINGS } from './endings'
import { EVENTS } from './events'
import { EQUIPPABLE_COUNT, SKILLS } from './gameData'
import { THEMES } from './themes'

const premiumCount = (s) => Object.values(s.premium).reduce((a, b) => a + b, 0)
const stat = (s, key) => s.stats[key] ?? 0
const allMinimized = (s) => DEFAULT_WINDOW_ORDER.every((id) => !isWindowAvailable(s, id) || s.layout.minimized.includes(id))
const ending = (s, id) => !!s.endings?.[id]
const runTime = (s) => (s.run?.endedAt && s.run?.startedAt ? s.run.endedAt - s.run.startedAt : Infinity)
const inboxMail = (s) => (s.mail ?? []).filter((m) => !m.folder || m.folder === 'inbox')

export const ACHIEVEMENTS = [
  { id: 'first_swing', icon: '⛏️', title: "Baby's First Swing", desc: 'Mine once.', check: (s) => stat(s, 'clicks') >= 1 },
  { id: 'carpal', icon: '🦴', title: 'Carpal Tunnel Speedrun', desc: 'Swing 500 times by hand.', check: (s) => stat(s, 'clicks') >= 500 },
  { id: 'exhausted', icon: '🥵', title: 'Cardio Is Pay-to-Win', desc: 'Run out of stamina.', check: (s) => stat(s, 'exhaustions') >= 1 },
  { id: 'trial_over', icon: '⌛', title: 'The Free Trial Is Over', desc: 'Translate 11 times.', check: (s) => stat(s, 'translations') > 10 },
  { id: 'vowel_tax', icon: '🅰️', title: 'Linguistic Taxpayer', desc: 'Pay $50 in Vowel Tax.', check: (s) => stat(s, 'taxPaid') >= 50 },
  { id: 'house_thanks', icon: '🎰', title: 'The House Thanks You', desc: 'Lose $1,000 gambling.', check: (s) => stat(s, 'gambleLosses') >= 1_000 },
  { id: 'statistically_trash', icon: '🗑️', title: 'Statistically Trash', desc: 'Open 100 loot boxes.', check: (s) => stat(s, 'boxesOpened') >= 100 },
  { id: 'platinum_member', icon: '💠', title: 'Platinum Member', desc: 'Open a Platinum Box. It cost a million dollars. It was probably trash.', check: (s) => stat(s, 'platinumBoxes') >= 1 },
  { id: 'collector', icon: '🗃️', title: 'Collector', desc: 'Find 10 different items.', check: (s) => (s.stats.itemIds?.length ?? 0) >= 10 },
  { id: 'full_set', icon: '🏛️', title: 'Museum Curator', desc: `Find all ${EQUIPPABLE_COUNT} items, rock included.`, check: (s) => (s.stats.itemIds?.length ?? 0) >= EQUIPPABLE_COUNT },
  { id: 'geologist', icon: '🪨', title: 'Geologist', desc: 'Own a Legendary Rock. It does nothing.', check: (s) => s.items.some((i) => i.itemId === 'legendary_rock') },
  { id: 'tax_season', icon: '⚖️', title: 'Tax Season', desc: 'Get audited by the Dev IRS.', check: (s) => stat(s, 'audited') >= 1 },
  { id: 'cat_person', icon: '😾', title: 'Cat Person', desc: 'Get scratched by your cat.', check: (s) => stat(s, 'catScratches') >= 1 },
  { id: 'hungry_cat', icon: '🥫', title: 'Cannot Afford Cat Food', desc: 'Try to feed your cat while broke.', check: (s) => stat(s, 'catFeedFails') >= 1 },
  { id: 'trust_issues', icon: '🤖', title: 'Trust Issues', desc: 'Get robbed by your own bot.', check: (s) => stat(s, 'botsLost') >= 1 },
  { id: 'beep_boop', icon: '🔒', title: 'Beep Boop', desc: 'Fail a CAPTCHA. Are you sure you are human?', check: (s) => stat(s, 'captchaFails') >= 1 },
  { id: 'read_the_ad', icon: '💀', title: 'Should Have Read the Ad', desc: 'Lose a save file to the Trap Ad.', check: (s) => s.saveFilesLost >= 1 },
  { id: 'ascended', icon: '✨', title: 'Ascended (Poorer)', desc: 'Prestige once.', check: (s) => s.prestige >= 1 },
  { id: 'enlightened', icon: '🧘', title: 'Enlightened', desc: 'Learn the skill that does nothing.', check: (s) => !!s.skills.enlightenment },
  { id: 'moms_card', icon: '💳', title: "Mom's Card", desc: 'Make 5 premium purchases.', check: (s) => premiumCount(s) >= 5 },
  { id: 'whale', icon: '🐋', title: 'Whale Watching', desc: 'Buy the Midas Ring.', check: (s) => !!s.premium.midas },
  { id: 'rank_boost', icon: '📈', title: 'Paid to Win Nothing', desc: 'Buy a Rank Boost. Gain 0 ranks.', check: (s) => !!s.premium.rank_boost },
  { id: 'in_debt', icon: '🦈', title: 'Financially Literate', desc: 'Owe QuickCash™ over $10,000.', check: (s) => (s.loan?.debt ?? 0) >= 10_000 },
  { id: 'repossessed', icon: '🚚', title: 'Repossessed', desc: 'Get a visit from the Repo Man.', check: (s) => stat(s, 'repos') >= 1 },
  { id: 'legally_binding', icon: '📜', title: 'Legally Binding', desc: 'Accept the Terms of Service.', check: (s) => stat(s, 'tosAccepted') >= 1 },
  { id: 'millionaire', icon: '💰', title: 'Millionaire (Temporarily)', desc: 'Hold $1,000,000 at once.', check: (s) => s.money >= 1_000_000 },
  { id: 'rock_bottom', icon: '🕳️', title: 'Rock Bottom', desc: 'Hit $0 after once holding $1,000+.', check: (s) => s.money === 0 && stat(s, 'peakMoney') >= 1_000 },
  { id: 'doomscroller', icon: '📏', title: 'Doomscroller', desc: 'Scroll 10 meters of DoomFeed™.', check: (s) => stat(s, 'doomMeters') >= 10 },
  { id: 'dopamine', icon: '🧠', title: 'Dopamine Farmer', desc: 'Like 50 DoomFeed™ posts.', check: (s) => stat(s, 'doomLikes') >= 50 },
  { id: 'lost_time', icon: '⏱️', title: 'Where Did the Time Go', desc: 'Spend 10 minutes with DoomFeed™ open.', check: (s) => stat(s, 'doomSeconds') >= 600 },
  { id: 'touch_grass', icon: '🌱', title: 'Touch Grass (Failed)', desc: 'Try to touch grass.', check: (s) => stat(s, 'grassAttempts') >= 1 },
  { id: 'corner_hit', icon: '📀', title: 'It Hit the Corner', desc: 'Watch a DVD ad hit the exact corner.', check: (s) => stat(s, 'dvdCorners') >= 1 },
  { id: 'deck_chairs', icon: '🪑', title: 'Rearranging Deck Chairs', desc: 'Drag ads around 10 times instead of closing them.', check: (s) => stat(s, 'adsDragged') >= 10 },
  { id: 'out_of_sight', icon: '🙈', title: 'Out of Sight, Out of Mind', desc: 'Minimize every window. The ads stay.', check: allMinimized },
  { id: 'cookie_crumbler', icon: '🍪', title: 'Cookie Crumbler', desc: 'Switch off all 20 trackers by hand. While they shuffled.', check: (s) => stat(s, 'trackersRefused') >= 1 },
  { id: 'unsubscribed', icon: '✂️', title: 'It Only Took 9 Screens', desc: 'Actually cancel a subscription.', check: (s) => stat(s, 'subsCancelled') >= 1 },
  { id: 'stockholm', icon: '🤝', title: 'Stockholm Syndrome', desc: 'Accept the "please stay" discount.', check: (s) => stat(s, 'retentionAccepted') >= 1 },
  { id: 'cancel_cancel', icon: '🔁', title: 'Cancelled the Cancellation', desc: 'Press "Cancel" on the final cancellation screen.', check: (s) => stat(s, 'cancelsCancelled') >= 1 },
  { id: 'streak_3', icon: '🔥', title: 'Habit Forming', desc: 'Reach a 3-day login streak.', check: (s) => (s.streak?.best ?? 0) >= 3 },
  { id: 'streak_7', icon: '📈', title: 'Clinically Engaged', desc: 'Reach a 7-day login streak.', check: (s) => (s.streak?.best ?? 0) >= 7 },
  { id: 'streak_broken', icon: '💔', title: 'It Was Nice While It Lasted', desc: 'Let a streak die.', check: (s) => stat(s, 'streaksLost') >= 1 },
  { id: 'insured', icon: '🛟', title: 'Insured Against Nothing', desc: 'Buy Streak Insurance™.', check: (s) => !!s.premium.streak_insurance },
  { id: 'gem_spender', icon: '💎', title: '13 Is a Lucky Number', desc: 'Spend gems on something.', check: (s) => stat(s, 'gemSpends') >= 1 },
  { id: 'leftovers', icon: '🥫', title: 'Leftover Gems', desc: 'Be left with 1–12 gems: too few to buy anything.', check: (s) => stat(s, 'gemSpends') >= 1 && s.gems > 0 && s.gems < 13 },
  { id: 'what_a_steal', icon: '🏷️', title: 'What a Steal', desc: 'Buy something at 98% off (keep visiting the store).', check: (s) => stat(s, 'bigDeals') >= 1 },
  { id: 'afk', icon: '💤', title: 'Went Outside (Briefly)', desc: 'Go AFK. Your debts did not.', check: (s) => stat(s, 'afkTimes') >= 1 },
  { id: 'afk_pro', icon: '🛋️', title: 'Professional Idler', desc: 'Go AFK 10 times.', check: (s) => stat(s, 'afkTimes') >= 10 },
  { id: 'left_on_read', icon: '📵', title: 'Left on Read', desc: 'Get refused by the translator 5 times.', check: (s) => stat(s, 'translationsRefused') >= 5 },
  { id: 'five_in_a_row', icon: '🎰', title: 'Five in a Row', desc: 'Land 5 of a kind on the slots.', check: (s) => stat(s, 'slotFives') >= 1 },
  { id: 'rock_solid', icon: '🪨', title: 'Rock Solid', desc: 'Hit a Legendary Rock line. It paid nothing.', check: (s) => stat(s, 'rockLines') >= 1 },
  { id: 'achievement_hunter', icon: '🏆', title: 'Achievement Hunter', desc: 'Open the Hall of Shame.', check: (s) => stat(s, 'trophyViews') >= 1 },
  { id: 'ad_connoisseur', icon: '🧐', title: 'Ad Connoisseur', desc: 'See all 6 kinds of ad.', check: (s) => (s.stats.adFormatsSeen?.length ?? 0) >= 6 },
  { id: 'dvd_enjoyer', icon: '📀', title: 'DVD Enjoyer', desc: 'Watch DVD ads bounce 100 times.', check: (s) => stat(s, 'dvdBounces') >= 100 },
  { id: 'window_shopper', icon: '👀', title: 'Window Shopper', desc: 'Visit the store 25 times.', check: (s) => (s.storeVisits ?? 0) >= 25 },
  { id: 'polyglot', icon: '🗣️', title: 'Polyglot (Interface Only)', desc: 'Switch the interface to every language in the Control Panel.', check: (s) => ['pirate', 'corporate', 'genz', 'latin'].every((l) => (s.stats.languagesTried ?? []).includes(l)) },
  { id: 'interior_decorator', icon: '🎨', title: 'Interior Decorator', desc: `Try all ${THEMES.length} themes. The game is still bad in every one.`, check: (s) => THEMES.every((t) => (s.stats.themesTried ?? []).includes(t.id)) },
  // ---- Endings ----
  { id: 'ending_buy', icon: '🏢', title: 'Hostile Takeover', desc: 'Buy TRANSLATR™ Inc.', check: (s) => ending(s, 'buy') },
  { id: 'ending_bankrupt', icon: '💀', title: 'Death by Cat', desc: 'Get scratched while you owe Vinnie more than you have.', check: (s) => ending(s, 'bankrupt') },
  { id: 'ending_grass', icon: '🌱', title: 'Touched Grass (For Real)', desc: 'Touch grass 50 times in a row.', check: (s) => ending(s, 'grass') },
  { id: 'ending_taught', icon: '✍️', title: 'Self-Taught', desc: 'Translate 10 sentences yourself in a row. TranslatrAI™ is obsolete.', check: (s) => ending(s, 'taught') },
  { id: 'ending_slave', icon: '👔', title: 'Corporate Slave', desc: 'Take the job instead of buying the company.', check: (s) => ending(s, 'slave') },
  { id: 'ending_shooter', icon: '👹', title: 'Knee-Deep in the Ads', desc: 'Beat DOOMSCROLL.EXE’s final boss.', check: (s) => ending(s, 'shooter') },
  { id: 'ad_free', icon: '🛡️', title: 'Ad-Free Experience', desc: 'Finish a DOOMSCROLL level without watching a single ad.', check: (s) => stat(s, 'shooterCleanLevels') >= 1 },
  { id: 'popup_blocker', icon: '🧹', title: 'Pop-up Blocker', desc: 'Close every pop-up on a DOOMSCROLL level (the boss’s backup too).', check: (s) => stat(s, 'shooterFullClears') >= 1 },
  { id: 'mines_win', icon: '💣', title: 'Upsell Sweeper', desc: 'Clear a board of Mine$weeper in the Arcade.', check: (s) => stat(s, 'minesWins') >= 1 },
  { id: 'mines_clean', icon: '🌱', title: 'Organic Growth', desc: 'Clear a Mine$weeper board without paying to continue.', check: (s) => stat(s, 'minesClean') >= 1 },
  { id: 'solitaire_win', icon: '🃏', title: 'Pay-Per-Win', desc: 'Win a game of Pay-Per-Card Solitaire.', check: (s) => stat(s, 'solitaireWins') >= 1 },
  { id: 'card_whale', icon: '🐋', title: 'Card Whale', desc: 'Pay for 100 cards in Solitaire.', check: (s) => stat(s, 'solitaireDraws') >= 100 },
  { id: 'hungry_wallet', icon: '🐍', title: 'Hungry Hungry Wallet', desc: 'Eat 20 bills in one game of Wallet Snake.', check: (s) => stat(s, 'snakeBest') >= 20 },
  { id: 'arcade_rat', icon: '🕹️', title: 'Arcade Rat', desc: 'Play every game in the Arcade.', check: (s) => ['mines', 'solitaire', 'snake'].every((g) => (s.stats.arcadePlayed ?? []).includes(g)) && stat(s, 'shooterRuns') >= 1 },
  { id: 'unskippable', icon: '📺', title: 'Unskippable', desc: 'Watch 10 ads in DOOMSCROLL.EXE (by getting hit).', check: (s) => stat(s, 'shooterAds') >= 10 },
  { id: 'ending_deleted', icon: '🗑️', title: 'Account Deleted', desc: 'Find the off switch. Use it.', check: (s) => ending(s, 'deleted') },
  { id: 'ending_snail', icon: '🐌', title: '5000 Years', desc: 'Let the snail finish its journey, then follow it.', check: (s) => ending(s, 'snail') },
  { id: 'ending_secret', icon: '🕊️', title: 'Not One Cent', desc: 'Buy TRANSLATR™ without a single microtransaction.', check: (s) => ending(s, 'secret') },
  { id: 'all_endings', icon: '🏁', title: 'Completionist (Derogatory)', desc: `See all ${ENDINGS.length} endings.`, check: (s) => ENDINGS.every((e) => ending(s, e.id)) },
  // ---- Speedrun ----
  { id: 'speedrunner', icon: '⏱️', title: 'Any%', desc: 'Finish a speedrun (any ending counts).', check: (s) => s.mode === 'speedrun' && !s.cheats && runTime(s) < Infinity },
  { id: 'sub_hour', icon: '⚡', title: 'Sub-Hour', desc: 'Buy TRANSLATR™ in a speedrun in under 60 minutes.', check: (s) => s.mode === 'speedrun' && !s.cheats && ['buy', 'secret'].includes(s.run?.ending) && runTime(s) < 3_600_000 },
  // ---- Leaderboard ----
  { id: 'rank_rising', icon: '📶', title: 'Statistically Relevant', desc: 'Climb above #9,999,999.', check: (s) => (s.stats.bestRank ?? Infinity) < 9_999_999 },
  { id: 'top_five', icon: '🎖️', title: 'Top 5 (Somehow)', desc: 'Break into the top 5 of the Global Leaderboard.', check: (s) => (s.stats.bestRank ?? Infinity) <= 5 },
  { id: 'silver_forever', icon: '🥈', title: 'Silver Medal, Forever', desc: 'Reach #2. #1 has their mom’s card.', check: (s) => (s.stats.bestRank ?? Infinity) <= 2 },
  // ---- Inbox ----
  { id: 'inbox_zero', icon: '📭', title: 'Inbox Zero', desc: 'Have 10+ emails in your inbox and every one of them read.', check: (s) => inboxMail(s).length >= 10 && inboxMail(s).every((m) => m.read) },
  { id: 'phished', icon: '🎣', title: 'Royally Scammed', desc: 'Pay a “processing fee” to a prince.', check: (s) => stat(s, 'phished') >= 1 },
  { id: 'unsubscribe_harder', icon: '📰', title: 'Unsubscribe Me Harder', desc: 'Unsubscribe 3 times. Get 6 newsletters.', check: (s) => stat(s, 'unsubscribes') >= 3 },
  { id: 'patient_zero', icon: '🦠', title: 'Patient Zero', desc: 'Open a suspicious attachment.', check: (s) => stat(s, 'virusOpened') >= 1 },
  // ---- Events ----
  { id: 'limited_time', icon: '⏳', title: 'Limited Time Only', desc: 'Take part in a limited-time event.', check: (s) => stat(s, 'eventsSeen') >= 1 },
  { id: 'seasonal_worker', icon: '📅', title: 'Seasonal Worker', desc: `Experience all ${EVENTS.length} events.`, check: (s) => (s.stats.eventIds?.length ?? 0) >= EVENTS.length },
  // ---- Skills & loot ----
  { id: 'skill_issue', icon: '🎓', title: 'Skill Issue', desc: 'Buy skill points with real (fake) money.', check: (s) => stat(s, 'skillPointsBought') >= 1 },
  { id: 'half_tree', icon: '🌳', title: 'Branching Out', desc: `Learn ${Math.ceil(SKILLS.length / 2)} skills.`, check: (s) => Object.keys(s.skills).length >= Math.ceil(SKILLS.length / 2) },
  { id: 'transcended', icon: '🌌', title: 'Transcended', desc: 'Learn Transcendence.', check: (s) => !!s.skills.transcendence },
  { id: 'pity_party', icon: '🥺', title: 'We Pity You', desc: 'Get a relic from the pity counter.', check: (s) => stat(s, 'pityRelics') >= 1 },
  { id: 'unwrapped', icon: '🎁', title: 'Year in Review', desc: 'Open your TRANSLATR™ Unwrapped.', check: (s) => stat(s, 'unwrappedViews') >= 1 },
  // ---- Contracts ----
  { id: 'first_contract', icon: '📝', title: 'Gainfully Employed', desc: 'Deliver a translation contract.', check: (s) => stat(s, 'contractsDone') >= 1 },
  { id: 'five_stars', icon: '⭐', title: 'Five Stars (Somehow)', desc: 'Get a five-star review.', check: (s) => stat(s, 'contractsPerfect') >= 1 },
  { id: 'lost_in_translation', icon: '🍌', title: 'Lost in Translation', desc: 'Deliver a wrong translation. They noticed.', check: (s) => stat(s, 'contractsBotched') >= 1 },
  { id: 'ghosted', icon: '👻', title: 'Ghosted', desc: 'Miss a contract deadline.', check: (s) => stat(s, 'contractsLate') >= 1 },
  { id: 'trusted', icon: '🤝', title: 'Trusted Professional', desc: 'Average 4.5 stars or more over 5+ reviews.', check: (s) => (s.ratings?.length ?? 0) >= 5 && s.ratings.reduce((a, b) => a + b, 0) / s.ratings.length >= 4.5 },
  { id: 'diy', icon: '📝', title: 'Do It Yourself', desc: 'Translate something yourself, correctly. For free. They hated that.', check: (s) => stat(s, 'selfCorrect') >= 1 },
  { id: 'plagiarist', icon: '📋', title: 'Plagiarist', desc: 'Pass off TranslatrAI™’s translation as your own.', check: (s) => stat(s, 'selfCopies') >= 1 },
  { id: 'cheater', icon: '🕹️', title: 'Cheater, Cheater', desc: 'Switch cheats on. We’re not mad. We’re just disappointed.', check: (s) => !!s.cheats },
  // ---- New Game+ and the Daily Challenge ----
  { id: 'ng_plus', icon: '✚', title: 'New Game+', desc: 'Start a New Game+.', check: (s) => (s.ngPlus ?? 0) >= 1 },
  { id: 'ng_plus_5', icon: '🔥', title: 'Every Curse', desc: 'Reach New Game+ 5.', check: (s) => (s.ngPlus ?? 0) >= 5 },
  { id: 'daily_done', icon: '📅', title: 'Daily Driver', desc: 'Complete a Daily Challenge.', check: (s) => (s.records?.dailyRuns ?? 0) >= 1 },
  { id: 'daily_7', icon: '🗓️', title: 'Weekly Regular', desc: 'Complete Daily Challenges on 7 different days.', check: (s) => Object.keys(s.records?.daily ?? {}).length >= 7 },
]

export const ACHIEVEMENT_POINTS = 10 // Gamerscore per achievement. Redeemable for nothing.
