// The taskbar ticker's useless tips (components/Overlays.jsx shows a shuffled handful at a time).
// A tip is a string, or a function of the game state for the ones that quote your own save.
// The "Fun fact" and "Did you know" trivia is true; everything else is TRANSLATR™'s opinion.

import { money } from '../lib/format'

const count = (n) => Math.floor(n ?? 0).toLocaleString('en')
const plural = (n, word) => `${count(n)} ${word}${Math.floor(n ?? 0) === 1 ? '' : 's'}`
const weekday = () => new Date().toLocaleDateString('en', { weekday: 'long' })

export const TIPS = [
  // ---- Tips, in the loosest sense ----
  'Tip: You are currently wasting your life.',
  'Tip: Blinking is free. For now.',
  'Tip: The Legendary Rock does nothing. We checked twice.',
  'Tip: Closing ads early is a great way to learn about consequences.',
  'Tip: Gems are worthless. So is this tip.',
  'Tip: Have you tried turning your wallet off and on again?',
  'Tip: The house always wins. You are not the house.',
  'Tip: Hydrate. Then mine.',
  'Tip: Remove Ads does not remove ads. That is the feature.',
  'Tip: Your parents are proud of you (unverified).',
  'Tip: Buying the Midas Ring is the only way to experience true joy.',
  'Tip: This ticker loops forever. So do you.',
  'Tip: Vowels are a premium feature. Try writing in consonants.',
  'Tip: Rank #9,999,999 is still technically a number.',
  'Tip: If a button moved, no it didn’t.',
  'Tip: Breathe in. Now breathe out. You’re welcome.',
  'Tip: If you can read this, the ticker is working.',
  'Tip: Stand up every hour. Then sit back down. You have translating to do.',
  'Tip: To save money, earn money, then don’t spend it. We don’t know how either.',
  'Tip: Clean your keyboard. There is a whole meal in there.',
  'Tip: Nothing in this ticker is clickable. You tried anyway, didn’t you.',
  'Tip: Tilting your screen does not make the wallet number go up. We tried.',
  'Tip: Close your eyes to skip an ad. The ad keeps playing. So does your life.',
  'Tip: The best time to plant a tree was 20 years ago. The second best time is after this ad.',
  'Tip: Left-click is on the left. Right-click is still free, for now.',
  'Tip: Count the pixels on your screen for a free sense of accomplishment.',
  'Tip: Save early, save often. Your save is only mildly cursed.',
  'Tip: Unplug your router and plug it back in. It won’t help, but it’s tradition.',
  'Tip: Stop reading tips and go outside. There is an ending for that.',
  'Tip: Walking away from the screen is a valid strategy. Nobody here will tell you that.',
  'Tip: The stamina bar refills while you rest. So do you, in theory.',
  'Tip: A tip about tips is a meta-tip. That’s two tips for the price of one.',
  'Pro tip: Pressing keys harder does not make them work faster.',
  'Pro tip: You can’t lose money you never earned. Apply this philosophically.',
  'Pro tip: Hover over the ticker to pause it. Now you’re reading a tip about reading tips.',
  'Pro tip: The loading bar at 99% is a lifestyle, not a bug.',
  'Pro tip: Read the Terms of Service. Nobody will ever know. That’s the point.',
  'Pro tip: Every “limited time offer” is back tomorrow. And the day after.',

  // ---- How the game works (as far as we’ll admit) ----
  'Tip: Drag any window by its title bar to rearrange your desktop. It will not make you richer.',
  'Tip: ▁ minimizes a window to the taskbar. Ads cannot be minimized. Ads are forever.',
  'Tip: Ads can be dragged out of the way. Not off the screen, though. We checked.',
  'Tip: Every 5th ad is a DVD screensaver. Watch it long enough and it WILL hit the corner. Probably.',
  'Tip: Change the whole theme from the Start button. The prices stay the same in every theme.',
  'Tip: The red notification dots are just there to make you anxious. It is working, isn’t it.',
  'Tip: Your cursor movements are being sold. Move slower to lower their value.',
  'Tip: 99.5% of Cardboard Boxes contain trash. Platinum Boxes: only 90%. That’s called progress.',
  'Tip: The Dev IRS has never lost an audit. It has also never been audited.',
  'Tip: The interface speaks Pirate now. Control Panel → Display → Language. Arr.',
  'Tip: The Arcade, DoomFeed™ and a browser all live on the TRANSLATR™ Phone. The phone lives in the Premium Store.',
  'Tip: DOOMSCROLL.EXE has five levels. The sixth is your inbox.',
  'Tip: Premium Latin™ has exactly one grammar rule. We charge $10 a word for it.',
  'Tip: Every theme is a different decade. The ads are the same in all of them.',
  'Tip: The Arcade pays out in real in-game money. The platform fee is also real.',
  'Tip: Sir Scratchington can be minimized. His hunger cannot.',

  // ---- Real facts, delivered with no context ----
  'Fun fact: Wombat poop is cube-shaped.',
  'Fun fact: Octopuses have three hearts and zero loot boxes.',
  'Fun fact: Honey never spoils. Your save file might.',
  'Fun fact: A group of flamingos is called a flamboyance.',
  'Fun fact: Bananas are berries. Strawberries are not. Sleep well.',
  'Fun fact: Scotland’s national animal is the unicorn.',
  'Fun fact: Sea otters hold hands while sleeping so they don’t drift apart.',
  'Fun fact: A day on Venus is longer than a year on Venus.',
  'Fun fact: Sharks are older than trees.',
  'Fun fact: The Eiffel Tower grows about 15 cm in summer. The metal expands. So does your screen time.',
  'Fun fact: Oxford University is older than the Aztec Empire.',
  'Fun fact: Cleopatra lived closer in time to the Moon landing than to the building of the Great Pyramid.',
  'Fun fact: Butterflies taste with their feet.',
  'Fun fact: Koala fingerprints are almost impossible to tell apart from human ones.',
  'Fun fact: Nintendo was founded in 1889. It made playing cards.',
  'Fun fact: Bubble wrap was invented as textured wallpaper. It did not catch on as wallpaper.',
  'Fun fact: The dot over a lowercase i is called a tittle.',
  'Fun fact: Crows remember human faces. And they hold grudges.',
  'Fun fact: Pigeons have been trained to tell a Picasso from a Monet.',
  'Fun fact: The inventor of the Pringles can is buried in one.',
  'Fun fact: Lightning is about five times hotter than the surface of the Sun.',
  'Fun fact: Sloths can hold their breath longer than dolphins.',
  'Fun fact: The Moon has moonquakes.',
  'Fun fact: There are more possible games of chess than atoms in the observable universe.',
  'Did you know? The first webcam was pointed at a coffee pot, so people knew when it was empty.',
  'Did you know? The hill in the Windows XP wallpaper is a real place in California.',
  'Did you know? The first banner ad, in 1994, was clicked by 44% of the people who saw it. We are still chasing that high.',
  'Did you know? A jiffy is a real unit of time. We don’t make things in one.',
  'Did you know? Cows have best friends. You have DoomFeed™.',

  // ---- Fake news, real weather ----
  'Breaking: Local man closes pop-up. Pop-up announces a sequel.',
  'Breaking: Scientists confirm the loading bar is, in fact, loading.',
  'Breaking: Area wallet found empty. Police say it “looked like this when we found it.”',
  'Breaking: Chad Monetizer promoted to Chief Chad.',
  'Breaking: Loot box opened. Contents: trash. More at 11.',
  'Breaking: Cat knocks glass off table. Experts say it was “on purpose” and “deeply personal”.',
  'Weather: 100% chance of ads, with scattered pop-ups this afternoon.',
  'Weather: A high-pressure sales system is moving in from the east.',
  'Weather: Forecast for your wallet: dry, with no relief in sight.',
  'Weather: Clouds over the Luna hills. Bring an umbrella. Umbrellas are $4.99.',
  'Traffic: Heavy congestion on the Information Superhighway near your router.',
  'Traffic: A pop-up has jack-knifed across all lanes of your screen.',

  // ---- The stars have opinions ----
  'Horoscope (Aries): A stranger will ask you to rate your experience. Say five stars. It is safer.',
  'Horoscope (Taurus): Money is coming your way. It will then leave, in the other direction.',
  'Horoscope (Gemini): Both of you will see an ad today.',
  'Horoscope (Cancer): Retreat into your shell. The shell has ads now.',
  'Horoscope (Leo): Today you are the main character. Main characters pay extra.',
  'Horoscope (Virgo): Organise your inventory. The cat will shred it anyway.',
  'Horoscope (Libra): Balance is important. Yours is low.',
  'Horoscope (Scorpio): Someone is watching you. It’s the DataHarvester™. Wave.',
  'Horoscope (Sagittarius): Adventure awaits in the Loot Box Warehouse. Bring ammo.',
  'Horoscope (Capricorn): Hard work pays off. Microtransactions pay off faster.',
  'Horoscope (Aquarius): Hydrate. It’s literally your sign.',
  'Horoscope (Pisces): Swim against the current today. The DoomFeed™ can’t.',
  'Fortune cookie: You will find a loot box. It will contain trash.',
  'Fortune cookie: Help! I’m trapped in a taskbar ticker.',
  'Fortune cookie: The fortune you seek is in another ticker.',
  'Fortune cookie: Your lucky numbers are 404, 500 and $4.99.',
  'Fortune cookie: A beautiful stranger will offer you a starter pack.',

  // ---- Self-care, monetized ----
  'Today’s affirmation: I am more than my wallet. My wallet is less than me.',
  'Today’s affirmation: I deserve nice things. The nice things are in the Premium Vault.',
  'Today’s affirmation: I am enough. My stamina is not.',
  'Today’s affirmation: I will not open one more loot box. (Opens one more loot box.)',
  'Motivational quote: “You miss 100% of the ads you close.” — TRANSLATR™ Marketing',
  'Motivational quote: “Every loot box is a lottery ticket that knows your name.” — The Algorithm',
  'Motivational quote: “Believe in yourself. Also believe in our refund policy.” — Legal (it does not exist)',
  'Motivational quote: “The grind never stops. That’s the whole problem.” — your wrist',
  'Fitness: Scrolling burns 0.0001 calories a post. You’re basically an athlete.',
  'Fitness: Do one push-up for every ad you see. See you never.',
  'Wellness: Look at something 20 metres away for 20 seconds. Not the ad. Further than the ad.',
  'Wellness: Unclench your jaw. Now unclench your wallet. One of those was a trick.',

  // ---- Life, but worse ----
  'Life hack: Put your phone in another room. Then walk to the other room. Congratulations, you exercised.',
  'Life hack: Tired? Sleep.',
  'Life hack: If you’re cold, you can simply be warmer.',
  'Life hack: Write “gym” in your calendar. Look at it. That counts.',
  'Life hack: Drink water out of a wine glass. Now you’re fancy and hydrated.',
  'Recipe: Toast. Step 1: bread. Step 2: wait. Step 3: toast. Butter is a Premium ingredient.',
  'Recipe: Ice. Freeze water. Serves everyone.',
  'Recipe: Cereal. Milk first. We know. We’ve stopped caring.',
  'Gardening tip: Water your plants. They can’t order drinks.',
  'Parenting tip: If the baby cries, have you tried the Premium baby?',
  'Travel tip: The Loot Box Warehouse is lovely this time of year. Bring a shotgun.',
  'Travel tip: Pack light. Your wallet already has.',
  'Dating advice: Be yourself. Unless you can be Premium.',
  'Financial advice (not financial advice): Buy low, sell high. Or in your case, buy high and cry.',
  'Financial advice (not financial advice): Diversify. Lose money in several places at once.',
  'Financial advice (not financial advice): Never borrow from a man called Vinnie. You have borrowed from Vinnie.',

  // ---- Words, riddles and deep thoughts ----
  'Word of the day: “Monetization”, the art of charging for the word of the day.',
  'Word of the day: “Petrichor”, the smell of rain. Not available in TRANSLATR™. Go outside.',
  'Word of the day: “Defenestration”, throwing something out of a window. Please don’t, the windows are load-bearing.',
  'Word of the day: “Sonder”, the realisation that every other player also has an empty wallet.',
  'Riddle: What has keys but can’t open locks? Your keyboard. What has locks but no keys? Your wallet.',
  'Riddle: The more you take, the more you leave behind. What are they? Microtransactions.',
  'Philosophy: If a pop-up opens and nobody sees it, is it still an impression? (Yes. We bill for it.)',
  'Philosophy: Are you playing the game, or is the game playing you? Find out after this ad.',
  'Shower thought: A loot box is just a box that hasn’t disappointed you yet.',
  'Shower thought: “Recently deleted” is a graveyard with a 30-day return policy.',
  'Shower thought: Every ad you skip is an ad you watched the first three seconds of.',
  'Ancient proverb: He who clicks the ad, clicks it twice.',
  'Ancient proverb: A watched loading bar never loads.',
  'Conspiracy: The DVD logo has hit the corner. They just don’t want you to know.',
  'Conspiracy: Birds are real. The ads are the ones watching you.',

  // ---- Management would like a word ----
  'Reminder: Your free trial of free trials has expired.',
  'Reminder: The cat is always hungry. It’s not personal. It’s a business model.',
  'HR reminder: Smiling at your desk is mandatory between 9 and 5.',
  'HR reminder: Please stop reporting Karen to Karen.',
  'HR reminder: The dental plan is a loot box. Open it responsibly.',
  'Vinnie says: Interest compounds. So does regret.',
  'Vinnie says: Nice wallet. Be a shame if something happened to it.',
  'The cat says: Mrrp. (Translation: $4.99, please.)',
  'The cat says: I have knocked your drink off the table. Emotionally.',
  'Legal: By reading this ticker you agree to keep reading this ticker.',
  'Legal: All tips are provided “as is”. “As is” means useless.',
  'Terms update: Clause 12 now reads “we win”. Please re-read clause 12.',
  'Patch notes: Fixed a bug where players were having fun.',
  'Patch notes: Ads now load 40% faster. Everything else now loads 40% slower. Balance.',
  'Patch notes: The Legendary Rock has been buffed. It still does nothing, but more confidently.',
  'Patch notes: Removed the skip button from the skip button.',
  'Tech support: Have you tried turning it off and on again? Have you tried not doing that?',
  'Tech support: Your call is important to us. Please enjoy 45 minutes of hold music.',
  'Accessibility: Pixel fonts are available in Retro 95 for the extra-squinty.',
  'Sponsored tip: This tip is brought to you by Tips™. Tips™: we tip, so you don’t have to.',
  'Sponsored tip: Hungry? Eat.',
  'Lost & found: One (1) sense of purpose, last seen before the first loot box. Reward: 3 gems.',
  'Lost & found: Found, a wallet. Empty. It’s yours.',
  'Poll: 97% of people who answered this poll answered this poll.',
  'Customer review: “I read every tip. I learned nothing. Five stars.” (verified reader)',
  'Customer review: “The tips were useless, exactly as advertised.” (satisfied customer)',
  'Error: Tip not found. Please enjoy this tip instead.',
  'Please note: This space has been left intentionally useless.',
  'Warning: Objects in the ticker are less useful than they appear.',
  'Warning: Reading tips may cause mild enlightenment. No cases have been reported.',
  'Historical fact: In 1995, people waited three minutes for one picture to load, and they were grateful.',

  // ---- Personalised uselessness, straight from your save ----
  (s) => `Did you know? You have clicked ${plural(s.stats.clicks, 'time')}. Your mouse has filed a complaint.`,
  (s) => `Reminder: You have seen ${plural(s.adsSeen, 'ad')}. Your eyes have been billed accordingly.`,
  (s) => `Fun fact: Your wallet holds ${money(s.money)}. That is not enough. It is never enough.`,
  (s) => `The cat says: Hunger at ${Math.round(s.cat.hunger)}%. Patience at 0%.`,
  (s) => `Did you know? You own ${plural(s.gems, 'gem')}. They are shiny. That is all they are.`,
  (s) =>
    s.loan
      ? `Vinnie says: You owe me ${money(s.loan.debt)}. It was ${money(s.loan.principal)} when we started. Math!`
      : 'Vinnie says: No loan yet? My door is always open. The exit is not.',
  () => `Horoscope for ${weekday()}: The same as yesterday, with more ads.`,
  () => `Tip: It is roughly ${new Date().toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })}. You could be asleep.`,
]

let deck = [] // tip indexes still to come this round
/** The next `n` tips, shuffled, with no repeats until every tip has had its turn. */
export function nextTips(state, n) {
  const out = []
  while (out.length < n) {
    if (!deck.length) {
      deck = TIPS.map((_, i) => i)
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[deck[i], deck[j]] = [deck[j], deck[i]]
      }
    }
    const tip = TIPS[deck.pop()]
    out.push(typeof tip === 'function' ? tip(state) : tip)
  }
  return out
}
