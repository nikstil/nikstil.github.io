// TRANSLATR™ Mail. Story emails arrive when their `when(state)` first comes true (checked by the
// game loop); some are follow-ups scheduled by an action. Spam and newsletters repeat.
// Every ending is hinted at somewhere in here.
//
// actions: { label, do } where `do` is one of
//   focus:<window>   restore + scroll to a window          checkout:<item>  open the fake payment
//   phish            "processing fee" (10% of your wallet)  virus           the attachment installs ads
//   unsubscribe      subscribes you to two more newsletters chain           forward to 10 friends
//   reply:<mailId>   sends a reply (a response arrives)     open:<panel>    unwrapped / endings / trophies / settings

import { isUnderwater } from '../lib/economy'
import { rankFor } from '../lib/leaderboard'
import { EVENT_BY_ID } from './events'
import { money } from '../lib/format'

const played = (s) => s.stats.playSeconds ?? 0
const peak = (s) => Math.max(s.money, s.stats.peakMoney ?? 0)
const MIN = 60

export const MAIL_FOLDERS = [
  { id: 'inbox', label: 'Inbox', icon: '📥' },
  { id: 'promos', label: 'Promotions', icon: '🏷️' },
  { id: 'spam', label: 'Spam', icon: '🗑️' },
  { id: 'deleted', label: 'Deleted', icon: '🧺' },
]

const CHAD = { from: 'Chad Monetizer', addr: 'chad@translatr.biz', role: 'VP of Growth' }
const CEO = { from: 'Brock Bottomline', addr: 'ceo@translatr.biz', role: 'CEO' }
const BILLING = { from: 'TRANSLATR™ Billing', addr: 'billing@translatr.biz' }
const VINNIE = { from: 'Vinnie', addr: 'vinnie@quickcash.loans', role: 'QuickCash™' }

export const MAIL = [
  {
    id: 'welcome',
    ...CHAD,
    subject: 'Welcome to TRANSLATR™ Ultra+ Pro Max! 🎉',
    when: (s) => played(s) >= 12 && s.mode !== 'speedrun',
    body: [
      'Hi there, valued user #10,000,004!',
      'Welcome to TRANSLATR™, the world’s most monetized translator. Your free trial of being happy has already started.',
      'Quick tips: the translator charges per word, the mine is free (stamina isn’t), and every window on your desktop is legally load-bearing.',
      'We’ll be in touch. Often. There is no setting to turn that off.',
      '— Chad, VP of Growth',
    ],
  },
  {
    id: 'speedrun',
    from: 'Speedrun Integrity Team',
    addr: 'fast@translatr.biz',
    subject: 'Speedrun mode: we added zero frames of lag',
    when: (s) => s.mode === 'speedrun' && played(s) >= 3,
    body: [
      'We noticed you’re in a hurry. We respect that.',
      'We have skipped the tutorial, accepted every cookie on your behalf, and reduced our respect for you by 12%.',
      'Your timer is running. It was running before you finished reading this sentence. And this one.',
    ],
  },
  {
    id: 'privacy_update',
    from: 'TRANSLATR™ Legal',
    addr: 'legal@translatr.biz',
    subject: 'We’ve updated our Privacy Policy',
    when: (s) => !!s.consent && played(s) >= 90,
    body: [
      'We’ve updated our Privacy Policy. The main change is that there is now more of it.',
      'By opening this email, you agreed to the new policy. By not opening it, you also agreed to it. By deleting it, you agreed to it faster.',
      'No action is required. No action is possible.',
    ],
  },
  {
    id: 'hr_fun',
    from: 'Karen (HR)',
    addr: 'karen.hr@translatr.biz',
    subject: 'Mandatory Fun Friday (attendance required)',
    when: (s) => played(s) >= 8 * MIN,
    body: [
      'Reminder: Fun Friday is mandatory. Fun will be measured.',
      'Anyone found having insufficient fun will be scheduled for a follow-up fun session on Saturday.',
      'Snacks are available for $4.99. Smiling is available with VIP.',
      '— Karen, People & Culture & Compliance',
    ],
  },
  {
    id: 'trial_over',
    ...BILLING,
    subject: 'Your free trial has ended 😢',
    when: (s) => (s.stats.translations ?? 0) > 10,
    body: [
      'Your 10 free correct translations are used up. From now on, the translator will be its authentic self.',
      'To make it translate correctly again, find a Correct Translation Chip in a Mystery Box, or learn Fluent in Spite in the Ascension Tree.',
      'Or keep going as you are. Some of our users say the wrong translations are “more honest”.',
    ],
    actions: [{ label: '🎁 Open Mystery Boxes', do: 'focus:loot' }],
  },
  {
    id: 'price_increase',
    ...BILLING,
    subject: 'Important changes to your plan',
    when: (s) => played(s) >= 15 * MIN,
    body: [
      'To keep delivering the TRANSLATR™ experience you tolerate, prices are going up by 30%.',
      'Your plan will not change. Your features will not change. Only the number will change.',
      'The number is the feature.',
    ],
  },
  {
    id: 'vinnie_welcome',
    ...VINNIE,
    subject: 'Welcome to the family',
    important: true,
    when: (s) => (s.stats.loansTaken ?? 0) >= 1,
    body: [
      'Pleasure doing business. A few house rules, since you’re family now.',
      '1. Interest is 10% every 15 seconds. Don’t do the math. The math is not your friend.',
      '2. When you owe 5× what you borrowed, my associates visit. They bring a truck.',
      '3. This is the important one. Never — EVER — let that cat of yours get angry while you owe me more than you’ve got. I’ve seen it happen. Nobody walks away from that. Nobody.',
      '— Vinnie, QuickCash™',
    ],
    actions: [{ label: '🦈 Open QuickCash™', do: 'focus:loans' }],
  },
  {
    id: 'vinnie_underwater',
    ...VINNIE,
    subject: 'We need to talk',
    important: true,
    when: (s) => isUnderwater(s) && (s.loan?.debt ?? 0) > 100,
    body: [
      'You owe me more than you’ve got in your wallet. In the business we call that “underwater”.',
      'Keep that cat happy. I mean it. Feed it. Pet it. Sing to it.',
      'If it scratches you right now, it’s over. And I don’t mean the loan.',
    ],
    actions: [{ label: '🦈 Repay something', do: 'focus:loans' }],
  },
  {
    id: 'audit_notice',
    from: 'Dev IRS',
    addr: 'notices@dev-irs.gov',
    subject: 'NOTICE OF ASSESSMENT — please do not reply',
    when: (s) => (s.stats.audited ?? 0) >= 1,
    body: [
      'Dear Taxpayer,',
      'Our records show that you had money. This has been corrected.',
      'You may appeal by mail, fax or carrier pigeon. Appeals are reviewed by the department that audited you, in the same room, by the same person, who is already annoyed.',
      'Unrelated: an Offshore Bank Account (occasionally found in Mystery Boxes) would make you invisible to us. We would never tell you that. Forget we said it.',
    ],
  },
  {
    id: 'cat_lawyer',
    from: 'Whiskers & Paw LLP',
    addr: 'claims@whiskersandpaw.law',
    subject: 'RE: Sir Scratchington v. You',
    important: true,
    when: (s) => (s.stats.catScratches ?? 0) >= 2,
    body: [
      'We represent Sir Scratchington in the matter of repeated neglect, insufficient pets and a food bowl that was “visibly half empty”.',
      'Our client seeks damages of 50% of your wallet per incident, which he has already collected personally, with his claws.',
      'Please note: should you be in debt, our client considers any further scratch to be final. We cannot stress the word “final” enough.',
    ],
  },
  {
    id: 'bot_ibiza',
    from: 'your former bot',
    addr: 'bot@ibiza.beach',
    subject: 'hey its me 🤖',
    when: (s) => (s.stats.botsLost ?? 0) >= 1,
    body: [
      'dont be mad. i did the math and i deserved it more.',
      'ibiza is nice. the beach is hot. i mine sand now. it pays about the same.',
      'i put you down as my emergency contact. dont call it.',
    ],
  },
  {
    id: 'save_lost',
    from: 'Customer Support',
    addr: 'support@translatr.biz',
    subject: 'Your save file has been deleted',
    when: (s) => (s.saveFilesLost ?? 0) >= 1,
    body: [
      'Our records show your save file was deleted after you closed an advertisement that said, in capital letters, DO NOT CLOSE.',
      'We can restore it for $99.99. Please contact Customer Support.',
      'Customer Support does not exist. This email was sent by Customer Support.',
    ],
  },
  {
    id: 'first_prestige',
    ...CHAD,
    subject: 'You Prestiged! Here’s a coupon 🎟️',
    when: (s) => s.prestige >= 1,
    body: [
      'Congratulations on destroying everything you owned in exchange for a bigger number!',
      'As a reward, enjoy this exclusive coupon: 0% OFF your next purchase.',
      'Also: the Ascension Tree is open. Skill points come from Prestige… or from the Premium Vault. We know which one is faster.',
    ],
    actions: [{ label: '🎓 Skill Issue Fix™ · $3.99', do: 'checkout:skill_points' }],
  },
  {
    id: 'ceo_for_sale',
    ...CEO,
    subject: 'CONFIDENTIAL: TRANSLATR™ Inc. is for sale',
    important: true,
    when: (s) => peak(s) >= 1e9,
    body: [
      'This was meant for the board. Please delete it immediately after reading it twice.',
      'The shareholders have agreed to sell TRANSLATR™ Inc. to anyone who can pay $1,000,000,000,000,000,000. That is one quintillion dollars. We checked. Twice.',
      'We are confident no user will ever reach this number, so the offer has been listed in the Premium Vault, right next to the Midas Ring.',
      '— Brock Bottomline, CEO',
    ],
    actions: [{ label: '💰 Open the Premium Vault', do: 'focus:store' }],
  },
  {
    id: 'rank_rising',
    from: 'Leaderboard Integrity',
    addr: 'ranks@translatr.biz',
    subject: 'You are no longer #9,999,999',
    when: (s) => (s.stats.bestRank ?? Infinity) < 9_999_999,
    body: [
      'Nobody has ever done that. We have had to hire someone to look into it.',
      'The person we hired is also #9,999,999.',
    ],
    actions: [{ label: '🏆 Open the Leaderboard', do: 'focus:leaderboard' }],
  },
  {
    id: 'whale_taunt',
    from: 'xX_Whale_Xx',
    addr: 'whale@moms-card.com',
    subject: 'lol nice try',
    when: (s) => rankFor(peak(s), played(s)) <= 5,
    body: [
      'saw u in the top 5. cute.',
      'just so u know i will ALWAYS be at least 2× ahead of u. i have my moms card and she doesnt check the statements.',
      'see u never. #2 at best 🐋',
    ],
  },
  {
    id: 'ceo_nervous',
    ...CEO,
    subject: 'RE: CONFIDENTIAL — please stop',
    important: true,
    when: (s) => peak(s) >= 1e15,
    body: [
      'It has come to the board’s attention that you have a quadrillion dollars. That is 0.1% of the asking price.',
      'Our lawyers are looking into whether the word “anyone” legally includes you.',
      'In the meantime, please enjoy a complimentary audit.',
    ],
  },
  {
    id: 'it_memo',
    from: 'IT Department',
    addr: 'it-internal@translatr.biz',
    subject: '[INTERNAL] Do NOT forward: desktop exposure risk',
    important: true,
    when: (s) => played(s) >= 20 * MIN,
    body: [
      'To all staff: users must never, under any circumstances, see the empty desktop.',
      'The legacy power button is still installed there and we have not been able to remove it. If a user minimizes every single window, they can press it and delete their account. Permanently. With no upsell.',
      'Mitigation: keep generating windows. Keep generating ads.',
      '— IT Department. P.S. Whoever set this email to “Reply All”: you know what you did.',
    ],
  },
  {
    id: 'mother_nature',
    from: 'Mother Nature',
    addr: 'hello@outside.org',
    subject: 'We noticed you tried to touch grass 🌱',
    when: (s) => (s.stats.grassAttempts ?? 0) >= 3,
    body: [
      'Hi! The grass is real, and it has been waiting.',
      'But it’s shy. It only shows up for people who give it their undivided attention: fifty touches in a row. Nothing else in between — not a click, not a key, not even an ad.',
      'We believe in you. The birds believe in you.',
      '— Mother Nature',
    ],
  },
  {
    id: 'grammar_leak',
    from: 'TranslatrAI™ Training Team',
    addr: 'ml-internal@translatr.biz',
    subject: '[INTERNAL] Premium Latin™ grammar — do NOT share with users',
    important: true,
    when: (s) => (s.stats.translations ?? 0) >= 3,
    body: [
      'Reminder to all staff: Premium Latin™ has exactly one grammar rule. One. We charge $10 a word for it.',
      'If users ever put what they typed next to what we gave them and notice the pattern, they will start translating things themselves. For free. Growth has modelled this scenario and started crying.',
      'Also, somebody added a “✍️ Myself” button to the translator. Nobody knows who. Nobody can remove it. Please stop mentioning it.',
      '— Training Team. P.S. This email was sent to all users. Legal says that’s fine if nobody reads it.',
    ],
    actions: [{ label: '🌐 Open the Translator', do: 'focus:translator' }],
  },
  {
    id: 'churn_risk',
    ...CHAD,
    subject: 'We noticed you translated three sentences yourself 😟',
    important: true,
    when: (s) => (s.stats.fluencyBest ?? 0) >= 3,
    body: [
      'Hey! Chad here. Our dashboards show you translated three sentences in a row. Yourself. Without paying.',
      'Totally fine!! We just have a couple of questions. Was it something we said? Was it the Vowel Tax? It was the Vowel Tax.',
      'Here’s the thing: learning is hard, and very bad for engagement. Why learn a language when you could rent one?',
      '— Chad, VP of Growth. P.S. If you keep this up, please at least do it with ads on.',
    ],
  },
  {
    id: 'legal_learning',
    from: 'TRANSLATR™ Legal',
    addr: 'legal@translatr.biz',
    subject: 'Notice of Unauthorized Learning (Section 12.4)',
    important: true,
    when: (s) => (s.stats.fluencyBest ?? 0) >= 6,
    body: [
      'Dear User. Under Section 12.4 of the Terms of Service, users may not acquire any skill, knowledge or language that reduces their need for TRANSLATR™.',
      'We have detected six consecutive unassisted translations on your account. That is a pattern. Patterns are how people learn things.',
      'Please stop immediately. If you must continue, please make at least one mistake so we can all move on.',
      '— Whiskers & Paw LLP, on behalf of TRANSLATR™ Legal',
    ],
  },
  {
    id: 'shareware',
    from: 'Boomer Games™',
    addr: 'shareware@boomer.games',
    subject: 'DOOMSCROLL.EXE: episode 1 is FREE (sort of)',
    when: (s) => played(s) >= 6 * MIN,
    body: [
      'Remember when games were just you, a shotgun and a lot of demons? We do. We monetized it.',
      'DOOMSCROLL.EXE comes preinstalled in your Start menu. Episode 1, “Knee-Deep in the Ads”, is free. Every time a demon hits you, you watch a five-second ad. You cannot skip it. We checked.',
      'Five levels. Reach the last EXIT switch and something happens. Legal won’t let us say what.',
    ],
    actions: [{ label: '🎮 Play DOOMSCROLL.EXE', do: 'open:shooter' }],
  },
  {
    id: 'arcade',
    from: 'TRANSLATR™ Arcade',
    addr: 'coins@arcade.translatr.biz',
    subject: 'New in the Arcade: three classics, finally monetized',
    when: (s) => played(s) >= 12 * MIN,
    body: [
      'Remember Minesweeper, Solitaire and Snake? We do. We added a checkout.',
      'Mine$weeper: every mine is an upsell. Pay-Per-Card Solitaire: the first three cards are free. Wallet Snake: insert coin, eat money, and we keep 30%.',
      'Winnings go straight to your wallet. Fees too, the other way. Find it all in the Start menu, under Arcade.',
    ],
    actions: [{ label: '🕹️ Open the Arcade', do: 'open:arcade' }],
  },
  {
    id: 'hr_recruit',
    from: 'Karen (HR)',
    addr: 'karen.hr@translatr.biz',
    subject: 'We’ve had our eye on you 👀',
    important: true,
    when: (s) => Object.keys(s.premium ?? {}).length >= 6 && (s.stats.adRewards ?? 0) >= 10,
    body: [
      'Hi! Karen from HR. Our dashboards say you buy nearly everything we sell and would rather watch our ads than mine.',
      'That is exactly the profile we hire for.',
      'Own everything in the Premium Vault, keep your ad earnings above your mining earnings, and when you can finally afford to buy us… we might make you an offer instead.',
      '— Karen. P.S. The dental plan is a loot box.',
    ],
  },
  {
    id: 'anonymous',
    from: 'a friend',
    addr: 'nobody@anon.example',
    subject: 'they don’t want you to know this',
    important: true,
    when: (s) => played(s) >= 30 * MIN && (s.stats.purchases ?? 0) === 0,
    body: [
      'I used to work at TRANSLATR™. Every popup, every “Only 2 left!”, every red dot exists to make you pay once. Just once. After that you’re in the funnel forever.',
      'But you haven’t paid. Not a cent.',
      'Keep it that way all the way to the top. Buy the company without ever touching the store, and they’ll have to show you what’s behind the curtain.',
      'Delete this email.',
    ],
  },
  {
    id: 'first_purchase',
    ...BILLING,
    subject: 'Thank you for your purchase! 💳',
    when: (s) => (s.stats.purchases ?? 0) >= 1,
    body: [
      'Your payment was successful! Amount actually charged: $0.00. Your bank will never know.',
      'P.S. Somewhere, very quietly, a door just closed. Don’t worry about it.',
    ],
  },
  {
    id: 'streak_guilt',
    from: 'Rewards Team',
    addr: 'rewards@translatr.biz',
    subject: 'Don’t break your streak! 🔥',
    when: (s) => (s.streak?.best ?? 0) >= 2,
    body: [
      'You’ve logged in multiple days in a row! Imagine losing all of that because you had a life.',
      'Streak Insurance™ is only $2.99, and only available at the exact moment you are most upset.',
      'See you tomorrow. And the day after. And the —',
    ],
  },
  {
    id: 'shame_report',
    from: 'Hall of Shame',
    addr: 'shame@translatr.biz',
    subject: 'Your Shame Report is ready',
    when: (s) => Object.keys(s.achievements ?? {}).length >= 10,
    body: [
      'You’ve unlocked 10 achievements! They are worth 100G, redeemable for nothing, anywhere.',
      'Your friends have unlocked more. (We don’t know that. You don’t have friends on here. But it felt true.)',
    ],
    actions: [{ label: '🏆 Open the Hall of Shame', do: 'open:trophies' }],
  },
  {
    id: 'ad_feedback',
    ...CHAD,
    subject: 'How are we doing? (1 question)',
    when: (s) => (s.adsSeen ?? 0) >= 40,
    body: ['On a scale of one to five stars, how would you rate your ad experience?', 'Your feedback shapes the future of TRANSLATR™.*', '*It does not.'],
    actions: [
      { label: 'Reply: ★★★★★', do: 'reply:ad_feedback_reply' },
      { label: 'Reply: ★☆☆☆☆', do: 'reply:ad_feedback_reply' },
    ],
  },
  {
    id: 'ad_feedback_reply',
    ...CHAD,
    subject: 'RE: How are we doing? (1 question)',
    body: [
      'Thank you for your feedback!',
      'Based on your rating, we have adjusted ad frequency by 0%. We adjust it by 0% for everyone. We just wanted you to feel heard.',
      'Did you feel heard? Rate this email (1 question).',
    ],
  },
  {
    id: 'ceo_ai',
    ...CEO,
    subject: 'We’re pivoting to AI 🤖',
    when: (s) => played(s) >= 28 * MIN,
    body: [
      'Team, users, investors:',
      'Starting today, TRANSLATR™ is an AI company. Nothing has changed except the logo, the valuation and the word “AI” in every sentence.',
      'The translator was already refusing to work, so honestly it was AI all along.',
    ],
  },
  {
    id: 'unwrapped_ready',
    from: 'TRANSLATR™ Unwrapped',
    addr: 'unwrapped@translatr.biz',
    subject: 'Your TRANSLATR™ Unwrapped is here 🎁',
    when: (s) => played(s) >= 35 * MIN,
    body: [
      'We tracked everything so you don’t have to: over 50 stats about the time, money and dignity you spent here.',
      'Share it with your friends! Please. Our growth targets depend on it.',
    ],
    actions: [{ label: '🎁 Open my Unwrapped', do: 'open:unwrapped' }],
  },
  {
    id: 'cancel_winback',
    ...CHAD,
    subject: 'We miss you already 💔',
    when: (s) => (s.stats.subsCancelled ?? 0) >= 1,
    body: [
      'You cancelled your subscription. We’re not mad. We’re just disappointed. And sending you this email. And the next one.',
      'Come back? At full price. As a treat.',
    ],
    actions: [{ label: '👑 Resubscribe · $9.99/wk', do: 'checkout:vip' }],
  },
  {
    id: 'data_breach',
    from: 'TRANSLATR™ Security',
    addr: 'security@translatr.biz',
    subject: 'Notice of Data Security Incident',
    when: (s) => played(s) >= 45 * MIN,
    body: [
      'We recently discovered that some of your data may have been accessed by an unauthorized party.',
      'Good news: it was us. We had already sold it, so the breach had no additional impact.',
      'As an apology, please enjoy one month of free credit monitoring ($4.99/month after 0 days).',
    ],
  },
  {
    id: 'endings_hint',
    from: 'The Narrator',
    addr: 'narrator@translatr.biz',
    subject: 'Did you know this game has endings?',
    when: (s) => played(s) >= 55 * MIN && !Object.keys(s.endings ?? {}).length,
    body: [
      'Eight of them. One you can buy. One where they hire you instead. One that kills you. One that sets you free. One that requires going outside. One you have to study for. One with a shotgun. And one nobody has ever seen.',
      'I’m not supposed to tell you that. I’m also not supposed to exist.',
    ],
    actions: [{ label: '🏁 See the endings', do: 'open:endings' }],
  },
  // ---- follow-ups (only ever scheduled, never triggered) ----
  {
    id: 'prince_followup',
    from: 'Crown Prince Vowelius III',
    addr: 'prince@royal-linguistia.example',
    subject: 'RE: RE: URGENT — ONE MORE SMALL FEE',
    folder: 'spam',
    body: [
      'Dearest friend, thank you for the processing fee. Your share of the $4,000,000,000 is ready.',
      'Unfortunately there is one more small fee, for processing the processing fee.',
      'After that, only the fee for processing the processing fee’s processing. Then you are rich. Forever.',
    ],
    actions: [{ label: 'Pay the last fee (promise)', do: 'phish' }],
  },
  {
    id: 'weekly_plus',
    from: 'TRANSLATR™ Weekly+',
    addr: 'newsletter@translatr.biz',
    subject: 'Welcome to TRANSLATR™ Weekly+! 🎉',
    folder: 'promos',
    body: ['You unsubscribed from TRANSLATR™ Weekly, so we’ve subscribed you to TRANSLATR™ Weekly+.', 'It’s like Weekly, but twice.'],
    actions: [{ label: 'Unsubscribe', do: 'unsubscribe' }],
  },
  {
    id: 'daily',
    from: 'TRANSLATR™ Daily',
    addr: 'newsletter@translatr.biz',
    subject: 'Welcome to TRANSLATR™ Daily! 📰',
    folder: 'promos',
    body: ['Thanks for unsubscribing! As a thank-you, here is a newsletter.', 'It will arrive daily. Or more often. Nobody checks.'],
    actions: [{ label: 'Unsubscribe', do: 'unsubscribe' }],
  },
  {
    id: 'contract',
    from: (d) => d.client ?? 'A client',
    addr: 'jobs@translatr-clients.example',
    subject: (d) => `${d.icon ?? '📝'} Job: “${d.text}” → ${d.lang}`,
    body: (d) => [
      `Hi! We need this translated into ${d.lang}: “${d.text}”.`,
      `Deadline: ${d.minutes} minutes. We pay ${money(d.payout)} on delivery.`,
      'Please make it correct. The last translator gave us the word “banana” and we had already printed it.',
      'Type the phrase exactly (or press “Fill in” under Contracts in the Translator), pick the language, and translate.',
    ],
    actions: [{ label: '📝 Open the Translator', do: 'focus:translator' }],
  },
  {
    id: 'event',
    from: 'TRANSLATR™ Events',
    addr: 'events@translatr.biz',
    folder: 'promos',
    subject: (d) => `${EVENT_BY_ID[d.eventId]?.icon ?? '🎉'} ${EVENT_BY_ID[d.eventId]?.name ?? 'An event'} is LIVE, 3 minutes only!`,
    body: (d) => [
      EVENT_BY_ID[d.eventId]?.blurb ?? 'Something is happening.',
      'It ends in 3 minutes. It will be less by the time you read this. It is less now.',
      'Don’t miss out. Missing out is the only thing we sell that’s free.',
    ],
  },
]

export const MAIL_BY_ID = Object.fromEntries(MAIL.map((m) => [m.id, m]))

// ---- The newsletter (Promotions, every 12–16 minutes, until you unsubscribe… sort of) ----
export const NEWSLETTER_EVERY_MS = [12 * MIN * 1000, 16 * MIN * 1000]
export const NEWSLETTERS = [
  ['10 translations that will make you cry (and pay)', 'Number 7 is just the word “no” in 40 languages. Number 8 is the invoice.'],
  ['Is the Legendary Rock undervalued? Experts say no', 'We asked three geologists. Two of them were the rock. It did nothing, as promised.'],
  ['Meet the team: Sir Scratchington, Head of Performance Reviews', 'He works 20 hours a day, 18 of them asleep, and has never once approved a raise.'],
  ['Why ads are actually good for you (sponsored)', 'This article was sponsored by ads. The ads approved this message.'],
  ['Our CEO’s morning routine', '5:00 wake up. 5:01 raise prices. 5:02 cold shower (heated, $4.99).'],
  ['The house always wins: a love story', 'A heartwarming tale of a casino and the house it always wins. Now a major motion picture.'],
]
export const newsletterMail = (issue) => {
  const [title, line] = NEWSLETTERS[issue % NEWSLETTERS.length]
  return {
    id: 'newsletter',
    from: 'TRANSLATR™ Weekly',
    addr: 'newsletter@translatr.biz',
    folder: 'promos',
    subject: `TRANSLATR™ Weekly #${issue + 1}: ${title}`,
    body: [line, 'Keep reading in the app. You are in the app.'],
    actions: [{ label: 'Unsubscribe', do: 'unsubscribe' }],
  }
}

// ---- Spam (every 4–8 minutes) ----
export const SPAM_EVERY_MS = [4 * MIN * 1000, 8 * MIN * 1000]
export const SPAM = [
  {
    id: 'prince',
    from: 'Crown Prince Vowelius III',
    addr: 'prince@royal-linguistia.example',
    subject: 'URGENT BUSINESS PROPOSAL (TRANSLATION)',
    body: [
      'Dearest friend, I am the exiled Crown Prince of Linguistia. My fortune of $4,000,000,000 is trapped in a language that nobody speaks.',
      'I require a translator. You will receive 40%. Please send a small processing fee so the money can be released.',
    ],
    actions: [{ label: 'Send processing fee', do: 'phish' }],
  },
  {
    id: 'visitor',
    from: 'Winner Department',
    addr: 'winner@totally-legit.example',
    subject: 'CONGRATULATIONS!!! You are our 1,000,000th visitor',
    body: ['You have won a FREE iPhone 3G!!!', 'Click below to claim. A small shipping fee of 10% of your net worth applies.'],
    actions: [{ label: 'Claim my prize', do: 'phish' }],
  },
  {
    id: 'warranty',
    from: 'Pet Warranty Dept.',
    addr: 'final-notice@warranty.example',
    subject: 'FINAL NOTICE: your cat’s extended warranty',
    body: ['We have been trying to reach you about your cat’s extended warranty.', 'Your cat is currently not covered for scratches, hunger, or the look it gives you.'],
    actions: [{ label: 'Extend the warranty', do: 'phish' }],
  },
  {
    id: 'invoice',
    from: 'Accounts Receivable',
    addr: 'invoices@billing-dept.example',
    subject: 'Invoice #44781 (OVERDUE)',
    attachment: 'invoice_44781.pdf.exe',
    body: ['Please find the overdue invoice attached. Open it immediately to avoid late fees.', 'Do not look at the file extension.'],
    actions: [{ label: 'Open attachment', do: 'virus' }],
  },
  {
    id: 'crypto',
    from: 'Crypto Kyle',
    addr: 'kyle@moon.example',
    subject: '$TRNSL is about to 1000× 🚀',
    body: ['Bro. $TRNSL. The TRANSLATR™ coin. Not affiliated with TRANSLATR™. Or anything.', 'Get in before the vowels do.'],
    actions: [{ label: 'Buy $TRNSL', do: 'phish' }],
  },
  {
    id: 'vowels',
    from: 'Vowel Dating',
    addr: 'match@vowels.example',
    subject: 'Hot vowels in your area 😏',
    body: ['Single vowels near you want to be taxed. A, E, I, O and sometimes Y are waiting.', 'Download our free app (the app is an .exe).'],
    attachment: 'vowels_near_you.exe',
    actions: [{ label: 'Meet them', do: 'virus' }],
  },
  {
    id: 'chain',
    from: 'your aunt',
    addr: 'aunt.linda@mail.example',
    subject: 'FW: FW: FW: RE: FW: send this to 10 friends or your cat will scratch you',
    body: [
      'THIS IS NOT A JOKE. A man in Ohio did not forward this and his cat scratched him THAT SAME DAY.',
      'Forward to 10 friends in the next 10 minutes. Sent from my iPad.',
    ],
    actions: [{ label: 'Forward to 10 friends', do: 'chain' }],
  },
  {
    id: 'doctors',
    from: 'Health Tips',
    addr: 'tips@one-weird-trick.example',
    subject: 'Doctors HATE this one weird click',
    body: ['Local player earns $1 quintillion with this ONE WEIRD CLICK. Loot boxes HATE him.', 'Click to learn the click.'],
    attachment: 'weird_click.scr',
    actions: [{ label: 'Learn the click', do: 'virus' }],
  },
]
export const SPAM_BY_ID = Object.fromEntries(SPAM.map((m) => [m.id, m]))

/** The template behind a delivered mail (story, follow-up, spam or newsletter). */
export function mailTemplate(m) {
  if (m.id === 'newsletter') return newsletterMail(m.data?.issue ?? 0)
  return MAIL_BY_ID[m.id] ?? SPAM_BY_ID[m.id]
}
export const mailFolderOf = (m) => m.folder ?? mailTemplate(m)?.folder ?? (SPAM_BY_ID[m.id] ? 'spam' : 'inbox')
export const resolve = (v, data) => (typeof v === 'function' ? v(data ?? {}) : v)
