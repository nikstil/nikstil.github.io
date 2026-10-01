// Third-party ad creatives. Deliberately tacky: that's the joke.
// Every creative has a `format` that picks its layout in components/AdFormats.jsx:
//   card   — the classic: stock photo, headline, flashing button
//   alert  — a fake operating-system warning dialog
//   video  — a "video" you can skip… straight into the next ad
//   chat   — a DM from someone who definitely wants something
//   banner — a 2003 flashing banner, CLICK HERE
//   survey — one quick question (your answer is sold)

const CARDS = [
  { headline: '$MOONRUG IS UP 48,000%', body: 'Financial advisors are FURIOUS. Buy now before it goes to exactly zero.', cta: 'INVEST MY RENT', art: '🚀📈💎', theme: 'from-green-400 to-emerald-800' },
  { headline: 'Doctors HATE this one weird pickaxe', body: 'Local man mines $4 in only 6 hours. Click to learn his secret (it is clicking).', cta: 'TELL ME', art: '⛏️👨‍⚕️😡', theme: 'from-sky-400 to-indigo-700' },
  { headline: 'Hot Singles in Your RAM', body: '3 lonely bytes are 0.2 miles from your CPU and they want to cache you.', cta: 'MEET THEM', art: '💾😍💾', theme: 'from-pink-400 to-rose-700' },
  { headline: 'Download More Translators', body: 'Why pay $10/word when our partner app charges only $20/word?', cta: 'DOWNLOAD (virus-free*)', art: '📥🦠📥', theme: 'from-lime-300 to-green-700' },
  { headline: 'CONGRATULATIONS!!! 1,000,000th VISITOR', body: 'Claim your free iPad (a photograph of an iPad, printed on paper).', cta: 'CLAIM PRIZE', art: '🎉📱🎁', theme: 'from-yellow-300 to-orange-600' },
  { headline: 'Businessman Laughing Alone With Salad', body: 'Our synergy-driven blockchain leverages salad at scale.', cta: 'LEVERAGE', art: '👔🥗😂', theme: 'from-teal-300 to-cyan-700' },
  { headline: 'Is your pickaxe SLOW?', body: 'We detected 3,812 viruses on your pickaxe. Scan now for only $49.99.', cta: 'SCAN NOW', art: '🛡️⛏️⚠️', theme: 'from-red-400 to-red-800' },
  { headline: 'NFT: Non-Functional Toaster', body: 'Own a JPEG of a toaster that does not toast. Only 9 ETH.', cta: 'MINT NOW', art: '🍞🖼️🔥', theme: 'from-violet-400 to-purple-800' },
  { headline: "Grandma's Crypto Casserole", body: "Retire at 23 with this one recipe. Banks don't want you to know.", cta: 'SHOW RECIPE', art: '👵🥘🪙', theme: 'from-amber-300 to-amber-700' },
  { headline: 'Your Cat Has Been Pre-Approved', body: 'Sir Scratchington qualifies for a premium catnip loan at 49% APR.', cta: 'APPLY FOR CAT', art: '🐈💳📈', theme: 'from-orange-300 to-rose-600' },
  { headline: 'Local Rock Now Worth $4 Million', body: 'Experts stunned. The rock did nothing to earn it. Neither will you.', cta: 'SEE ROCK', art: '🪨💰🤯', theme: 'from-stone-300 to-stone-700' },
  { headline: 'One Weird Trick to Close Ads', body: "Ad agencies HATE it. (It's the X. We moved it.)", cta: 'SHOW ME THE X', art: '❌🖱️😱', theme: 'from-fuchsia-300 to-fuchsia-700' },
  { headline: 'Your Extended Warranty Is Expiring', body: "We've been trying to reach you about your car. You don't have a car. We know.", cta: 'CALL BACK', art: '📞🚗📜', theme: 'from-slate-300 to-slate-700' },
  { headline: 'Buy Followers, Get Friends FREE*', body: '*Friends are bots. The bots are lonely too.', cta: 'BE POPULAR', art: '🤖🫂📈', theme: 'from-blue-300 to-blue-700' },
  { headline: 'Ergonomic Clicking Glove', body: 'Mine 400% faster. Carpal tunnel sold separately.', cta: 'GLOVE UP', art: '🧤⛏️💥', theme: 'from-orange-300 to-orange-700' },
  { headline: 'Premium Air™ Subscription', body: 'Breathe freely for $9.99/mo. The free tier is every other breath.', cta: 'START BREATHING', art: '💨💳😮‍💨', theme: 'from-cyan-200 to-sky-600' },
  { headline: 'Therapists Recommend This Slot Machine', body: 'Studies show gambling is relaxing right up until it isn’t.', cta: 'RELAX NOW', art: '🎰🛋️🧠', theme: 'from-purple-300 to-indigo-700' },
  { headline: 'Timeshare on the Moon', body: 'Low monthly fee. Very low oxygen. Views to die for (literally).', cta: 'RESERVE CRATER', art: '🌕🏠🚀', theme: 'from-neutral-300 to-neutral-800' },
  { headline: 'Upgrade Your Cursor to Premium', body: 'Point at things 12% more confidently. Now with dollar-sign targeting.', cta: 'UPGRADE POINTER', art: '🖱️✨👆', theme: 'from-emerald-200 to-teal-700' },
  { headline: 'Ancient Tax Secret Revealed', body: "The IRS doesn't want you to know about vowels. (They invented them.)", cta: 'LEARN THE SECRET', art: '🏛️🅰️🤫', theme: 'from-yellow-200 to-yellow-700' },
  { headline: 'FREE MONEY (Terms Apply)', body: "Terms: it isn't free, and technically it isn't money.", cta: 'GET FREE MONEY', art: '💸📜🙃', theme: 'from-lime-200 to-lime-700' },
]

const ALERTS = [
  { format: 'alert', title: 'Windows Defendr™', icon: '⚠️', headline: '(3) viruses detected on your pickaxe!', body: 'Your pickaxe is sending your mining data to 40 countries. Remove now for only $19.99/month.', buttons: ['Remove Now', 'Also Remove Now'] },
  { format: 'alert', title: 'Low Disk Space', icon: '💽', headline: 'Your disk is 99% full of regret.', body: 'Upgrade to RegretCloud™ Pro for unlimited regret storage.', buttons: ['Buy 1 TB', 'Buy 2 TB'] },
  { format: 'alert', title: 'Browser Update Required', icon: '🧭', headline: 'Your browser is out of date.', body: "(It's fine.) Install BrowsrPro™ Ultra+ to keep seeing these warnings.", buttons: ['Update', 'Update Later (Now)'] },
  { format: 'alert', title: 'Unusual Activity', icon: '👁️', headline: 'We noticed you blinked 14 times.', body: 'For your security, verify your identity by paying a small $2.99 blink fee.', buttons: ['Verify', 'Verify Harder'] },
  { format: 'alert', title: 'Session Expiring', icon: '⌛', headline: 'Your session will expire in 00:59.', body: 'Buy SessionPlus™ to continue existing on this website.', buttons: ['Extend ($4.99)', 'Cease to Exist'] },
]

const VIDEOS = [
  { format: 'video', headline: 'Raid: Shadow Mega Legends', body: 'Epic. Free*. The ad is the best part of the game.', art: '⚔️🐉🏰', theme: 'from-red-900 to-black', cta: 'INSTALL' },
  { format: 'video', headline: 'Pull the Pin! (Real Gameplay*)', body: '*The real game is a farming simulator. The pins are not in it.', art: '🧩🚰👑', theme: 'from-sky-800 to-black', cta: 'PLAY NOW' },
  { format: 'video', headline: 'Meal Kits Delivered by Drone', body: 'Cook dinner yourself, but pay a lot more for it.', art: '🥡🚁📦', theme: 'from-emerald-900 to-black', cta: 'ORDER' },
  { format: 'video', headline: 'Crypto Kitchen Knives', body: 'Sharper than your portfolio. Duller than your prospects.', art: '🔪🪙🔥', theme: 'from-amber-900 to-black', cta: 'SHOP' },
]

const CHATS = [
  { format: 'chat', name: 'Brittany_Crypto', avatar: '👩', lines: ['hey 👋', 'r u single?', 'single-handedly interested in an NFT?'], cta: 'Reply ❤️' },
  { format: 'chat', name: 'Your Bank (Real)', avatar: '🏦', lines: ['URGENT!!', 'please send us your password so we can keep it safe', 'this is 100% your bank 🙂'], cta: 'Send password' },
  { format: 'chat', name: 'Mom', avatar: '👵', lines: ['honey did you buy gems again', 'there is $4,999.99 on my card', 'from "TRANSLATR PREMIUM VAULT"'], cta: 'It was the cat' },
  { format: 'chat', name: 'Vinnie (QuickCash™)', avatar: '🦈', lines: ['heyyy pal', 'nice kneecaps you got there', 'be a shame if the interest compounded'], cta: 'Borrow more' },
]

const BANNERS = [
  { format: 'banner', headline: 'PUNCH THE MONKEY, WIN $20!!!', art: '🐒👊', cta: 'PUNCH', theme: 'from-yellow-300 via-orange-400 to-red-500' },
  { format: 'banner', headline: 'SHOOT THE DUCK, WIN AN MP3 PLAYER', art: '🦆🎯', cta: 'SHOOT', theme: 'from-lime-300 via-green-400 to-emerald-600' },
  { format: 'banner', headline: 'YOUR IP ADDRESS IS 127.0.0.1 — HACKERS KNOW IT TOO', art: '🖥️🔓', cta: 'PROTECT ME', theme: 'from-red-300 via-red-500 to-red-800' },
]

const SURVEYS = [
  { format: 'survey', headline: 'Quick 1-question survey!', question: 'How likely are you to recommend TRANSLATR™ to someone you hate?', options: ['Very likely', 'Extremely likely', 'I am the person I hate'], cta: 'Submit' },
  { format: 'survey', headline: 'Rate this ad', question: 'How many stars does this ad deserve?', options: ['⭐⭐⭐⭐⭐', '⭐⭐⭐⭐⭐ (sarcastically)', '⭐⭐⭐⭐⭐ (under duress)'], cta: 'Rate' },
  { format: 'survey', headline: 'Which loot box are YOU?', question: 'Pick the answer that describes you best:', options: ['Trash', 'Trash (Rare)', 'Legendary Rock'], cta: 'Find out' },
]

export const AD_CREATIVES = [...CARDS, ...ALERTS, ...VIDEOS, ...CHATS, ...BANNERS, ...SURVEYS]
/** Only the classic cards: used where a stock-photo layout is required (the rewarded video ad). */
export const CARD_CREATIVES = CARDS
