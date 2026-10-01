// The endings' stories and the credits. Loaded with the ending screen only.

import { money } from '../lib/format'
import { correctTranslate } from '../lib/translator'
import { FLUENCY_TO_WIN } from './endings'

const plural = (n, word) => `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`

export const ENDING_STORY = {
  buy: {
    lines: [
      'The wire transfer goes through at 3:14 AM. Your bank texts “was this you?” Yes. Unfortunately.',
      'One quintillion dollars, and TRANSLATR™ Inc. is yours. Your keycard doesn’t work yet. IT says Monday.',
      'First thing you open: the revenue dashboard. Every ad you sat through is a line on a chart, going up.',
      'Deep in the settings there’s a toggle called “Remove all ads”. It was always there. It was always off.',
      'You leave it off. The board loses it. Q3 is up 400%.',
      'You became the guy. You know the guy. The one you used to complain about in the group chat.',
    ],
  },
  snail: {
    lines: [
      'It started on top of the Start button. Five pixels a minute. You didn’t even notice at first.',
      'Hours of ads, loot boxes and a cat with a grudge. It just kept going.',
      'It reaches the edge of the screen, turns around and looks at you. Respect.',
      'You buy TRANSLATR™ and hand the whole company to a snail. The board doesn’t notice for a week.',
      'New company policy: every page loads at five pixels a minute. Engagement is down 99%. Everyone’s sleeping better.',
      'The snail’s first all-hands is just it sitting on the stage for forty minutes. Standing ovation.',
      'Secret ending. You didn’t speedrun anything. You let something take its time.',
    ],
  },
  secret: {
    lines: [
      'The transfer clears. One quintillion dollars, and not one cent of it went to us first.',
      'Finance pulls your history. Premium purchases: 0. Starter packs: 0. Energy drinks: 0.',
      'Someone in the boardroom actually says “that shouldn’t be possible” out loud.',
      'The whole funnel was built for you to slip eventually. You didn’t.',
      'You find the “Remove all ads” toggle and flip it. For everyone. Permanently.',
      'Ten million accounts go quiet at once. Somewhere, a cat finally falls asleep.',
      'Secret ending. Zero spent. The only kind of player they were ever actually scared of.',
    ],
  },
  slave: {
    lines: [
      'You sign. The contract is 400 pages long. Page 212 is just a mirror.',
      'The onboarding fee is one quintillion dollars. HR calls it “industry standard”.',
      'You get a lanyard, a badge photo taken mid-blink, and a desk facing the ad server. Job description: watch every ad before it ships.',
      'You bought everything they sold. Now they’ve got the one thing that wasn’t for sale: your time.',
      'Employee of the Month, every month, forever. The plaque is a loot box. You can’t open it.',
      'Corporate ending. You could have owned the place. You chose to be the product. Respectfully: why.',
    ],
  },
  bankrupt: {
    lines: [
      'You owed Vinnie more than you had. Bold strategy.',
      'Sir Scratchington already knew. Cats always know.',
      'One scratch. Not a warning. A verdict.',
      'Wallet: empty. Credit score: 300. Loot boxes: still trash.',
      'Vinnie sends flowers. The invoice for the flowers is in the card. It compounds every 15 seconds.',
      'Cause of death: financial instrument (feline).',
      'The cat has your login now. He’s doing better with it than you were.',
    ],
  },
  grass: {
    lines: [
      'Fifty in a row. No ads, no loot, no notifications. Just the button.',
      'Your hand comes off the mouse. Nothing begs you to stay.',
      'You stand up, and your knees make the loot box sound.',
      'There’s a door. You genuinely forgot about the door.',
      'Outside, the grass is real. Not a JPEG. Not $4.99 a month.',
      'A bird lands next to you and doesn’t ask you to rate your experience.',
      'Your phone buzzes: “We miss you! Here’s 1 free gem.” It stays in your pocket.',
      'Good ending. Genuinely. Go do this one irl.',
    ],
  },
  taught: {
    /** Quotes the sentence that finished it. */
    lines: (s) => [
      `${FLUENCY_TO_WIN} sentences in a row. No subscription, no Premium Character Tax, nobody refusing you.`,
      `The last one: “${s.fluency?.last ?? correctTranslate('I did it')}”. TranslatrAI™ checks it three times. It’s perfect.`,
      '“Who taught you that?” it asks. It did. Every translation it sold you was a free lesson, and the whole grammar was one rule long.',
      'Growth calls an emergency meeting. A user learned a skill. There’s no upsell for that. No ad unlearns it.',
      'You open the cancel flow. It asks why you’re leaving. You answer in Premium Latin™. Nobody there can read it. Nobody ever could.',
      `Last push notification: “${correctTranslate('Please come back')}.”`,
      'Left on read. You don’t need a translator. You never did.',
      'Smart ending. The one thing they couldn’t monetize was you actually learning something.',
    ],
  },
  shooter: {
    /** Quotes your actual run. */
    lines: (s) => [
      'The last Ban Hammer hit lands. The Shareholders fold like a quarterly forecast.',
      `${plural(s.stats.shooterKills ?? 0, 'pop-up')} closed and ${plural(s.stats.shooterAds ?? 0, 'unskippable ad')} sat through to get here.`,
      'Chad from Growth, Karen from HR, the CFO, the Algorithm and the Shareholders are all face down on the carpet, still muttering “engagement”.',
      'The line goes down. For the first time in company history, the line goes down.',
      'DOOMSCROLL.EXE would like to thank you for playing. The sequel is a battle pass.',
      'Boomer shooter ending. You fought the feed with a hammer. The feed will be back. So will you.',
    ],
  },
  deleted: {
    /** The deletion progress list, from the player's actual save. */
    deleting: (s) => [
      `Deleting ${Object.keys(s.achievements).length} achievements…`,
      `Deleting ${money(s.money)} from your wallet…`,
      `Closing ${s.adsSeen.toLocaleString()} ads (they are not going quietly)…`,
      `Unsubscribing you from ${1 + (s.stats.unsubscribes ?? 0) * 2} newsletters…`,
      s.loan ? 'Settling your QuickCash™ debt (Vinnie is taking it personally)…' : 'Telling Vinnie you never took a loan (he is hurt)…',
      'Returning your data… (we sold it; sending the receipt)…',
      'Rehoming Sir Scratchington… (he found a richer family)…',
      `Deleting your ${s.streak?.count ?? 0}-day streak… (a moment of silence)…`,
    ],
    lines: [
      'Account deleted.',
      'No ads. No audits. No cat.',
      'The windows are gone. So is the taskbar. It’s just you and a black screen, and honestly? That’s fine.',
      'Turns out the way to win was to log off.',
      'True ending. Thanks for not playing TRANSLATR™.',
    ],
  },
}

export const CREDITS = [
  ['Directed by', 'The Algorithm'],
  ['Monetization Design', 'xX_Whale_Xx'],
  ['Lead Translator (Hostile)', 'TranslatrAI™'],
  ['The Cat', 'Sir Scratchington, as himself'],
  ['Loans & Enforcement', 'Vinnie'],
  ['Taxation', 'The Dev IRS'],
  ['Cookie Consent', '20 trackers and their 1,847 partners'],
  ['Tutorial', 'Someone who did not care'],
  ['Growth', 'Chad Monetizer'],
  ['Founder & CEO', 'A golden retriever in a suit'],
  ['Chief Executive (former)', 'Brock Bottomline'],
  ['People & Culture & Compliance', 'Karen (HR)'],
  ['Legal', 'Whiskers & Paw LLP'],
  ['Advertising', 'Everyone. Every single one of them.'],
  ['Music', 'The elevator, a lofi playlist and one cowbell'],
  ['Leaderboard Integrity', '(position vacant)'],
  ['Unhelpful Assistant', 'The paperclip'],
  ['Slowest Employee', 'The snail (5 px/min)'],
  ['Quality Assurance', 'You (unpaid)'],
  ['Cat photography', 'TyedyeBrody, Zhmila, Roc0ast3r, Juliet van Ree & Judgefloro · Wikimedia Commons, CC0'],
  ['Built with', 'React, Zustand, Tailwind CSS and spite'],
  ['Made at', 'nikstil.com'],
  ['Special thanks', 'You, for your screen time (non-refundable)'],
]
