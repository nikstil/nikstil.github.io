// The endings' stories and the credits. Loaded with the ending screen only.

import { money } from '../lib/format'
import { correctTranslate } from '../lib/translator'
import { FLUENCY_TO_WIN } from './endings'

const plural = (n, word) => `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`

export const ENDING_STORY = {
  buy: {
    lines: [
      'The wire transfer clears at 3:14 AM.',
      'One quintillion dollars. The bank calls to ask if you are okay. You are not okay. You are the CEO.',
      'Your first act as owner of TRANSLATR™: you open the monetization dashboard.',
      'It is beautiful. Every ad you ever closed paid for a yacht. You own the yachts now.',
      'In the settings there is a switch labelled “Remove all ads”. It was always there.',
      'You leave it on. The board applauds. Quarterly earnings are up 400%.',
      'Congratulations. You have become the thing you swore to destroy.',
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
      'The wire transfer clears. One quintillion dollars. Earned, not bought.',
      'The board reviews your account. Premium purchases: 0. Starter packs: 0. Energy drinks: 0.',
      'A silence falls over the boardroom. Someone drops a Midas Ring.',
      '“That’s not possible,” whispers the CFO. “The funnel doesn’t allow it. The funnel always wins.”',
      'You beat the funnel.',
      'You find the switch labelled “Remove all ads”. You flip it. For everyone. Forever.',
      'Across ten million accounts, the ads go quiet. Somewhere, a cat purrs.',
      'This is the secret ending. You never paid a cent. We have never been more afraid of anyone.',
    ],
  },
  slave: {
    lines: [
      'You sign the contract. It is 400 pages long. Page 212 is a mirror.',
      'Your onboarding fee is one quintillion dollars. HR says that is standard for the role.',
      'You get a lanyard, a badge photo taken mid-blink, and a desk facing the ad server. Your job: watch every ad before it goes live.',
      'You bought everything TRANSLATR™ ever sold. Now it owns the one thing it couldn’t sell you: your time.',
      'Employee of the Month. Every month. Forever. The plaque is a loot box.',
      'This is the corporate ending. You could have bought the company. You became its product instead.',
    ],
  },
  bankrupt: {
    lines: [
      'You owed Vinnie more than you had.',
      'Sir Scratchington knew. Cats always know.',
      'The scratch was not a scratch. It was a verdict.',
      'Your wallet: empty. Your credit score: 300. Your loot boxes: trash, as always.',
      'Vinnie sends flowers. The invoice for the flowers is attached. It compounds every 15 seconds.',
      'Cause of death: financial instrument (feline).',
      'The cat is fine. The cat has taken over your account. It is doing better than you were.',
    ],
  },
  grass: {
    lines: [
      'Fifty times. No ads. No loot. No distractions.',
      'Your hand leaves the mouse. The screen dims. Nothing asks you to stay.',
      'You stand up. Your knees make a sound like a loot box opening.',
      'There is a door. You had forgotten about the door.',
      'Outside, the grass is real. It is not a JPEG. It does not cost $4.99 a month.',
      'A bird lands next to you. It does not ask you to rate your experience.',
      'Your phone buzzes: “We miss you! Here’s 1 free gem.” You leave it in your pocket.',
      'This is the good ending. Seriously. Go and do it.',
    ],
  },
  taught: {
    /** Quotes the sentence that finished it. */
    lines: (s) => [
      `${FLUENCY_TO_WIN} sentences in a row. No subscription. No Premium Character Tax. Nobody refused you.`,
      `The last one: “${s.fluency?.last ?? correctTranslate('I did it')}”. TranslatrAI™ checks it three times. It is perfect.`,
      '“Who taught you that?” it asks. It did. Every translation it sold you was a free lesson. The whole grammar was one rule long.',
      'The Growth team calls an emergency meeting. A user has acquired a skill. There is no upsell for a skill. There is no ad that unlearns one.',
      'You open the cancel flow. It asks why you are leaving. You answer in Premium Latin™. Nobody at TRANSLATR™ can read it. Nobody ever could.',
      `One last push notification: “${correctTranslate('Please come back')}.”`,
      'You don’t reply. You don’t need a translator. You never did.',
      'This is the smart ending. The one thing they couldn’t monetize was you learning something.',
    ],
  },
  shooter: {
    /** Quotes your actual run. */
    lines: (s) => [
      'You slam the last EXIT switch. The boardroom doors grind open. The pop-ups stop.',
      `${plural(s.stats.shooterKills ?? 0, 'pop-up')} closed. ${plural(s.stats.shooterAds ?? 0, 'unskippable ad')} watched to get here.`,
      'Chad from Growth, Karen from HR and Brock Bottomline, CEO, lie face down on the boardroom carpet, muttering about engagement.',
      'Somewhere, a modem screams. It is the most honest sound you have heard all day.',
      'DOOMSCROLL.EXE thanks you for playing the shareware episode. The full version is $49.99. It is the same episode.',
      'This is the boomer ending. You tore through the ads. The ads will be back.',
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
      'No more ads. No more audits. No more cat.',
      'The windows are gone. So is the taskbar. It is just you and a dark screen.',
      'It turns out the whole time, the way to win was to stop playing.',
      'This is the true ending. Thank you for not playing TRANSLATR™.',
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
  ['Chief Executive', 'Brock Bottomline'],
  ['People & Culture & Compliance', 'Karen (HR)'],
  ['Legal', 'Whiskers & Paw LLP'],
  ['Advertising', 'Everyone. Every single one of them.'],
  ['Hold Music', 'The elevator'],
  ['Leaderboard Integrity', '(position vacant)'],
  ['Quality Assurance', 'You (unpaid)'],
  ['Cat photography', 'TyedyeBrody, Zhmila, Roc0ast3r, Juliet van Ree & Judgefloro · Wikimedia Commons, CC0'],
  ['Built with', 'React, Zustand, Tailwind CSS and spite'],
  ['Made at', 'nikstil.com'],
  ['Special thanks', 'You, for your time (non-refundable)'],
]
