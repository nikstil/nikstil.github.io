// THE BUTTON: the story. Every step has two choices: a click (a) and a one-second hold (b).
//
// A step: { scene, place, text(s), a, b, timer?, timeout?, enter?(s) }
//   scene    what the picture above shows (scene.js)
//   place    where you are, for the bad ending ("You are <place> when the sky turns white")
//   timer    seconds to decide (a number or s => number); run out and you get a strike, and `timeout` happens
//   enter    runs when you arrive (picking things up, getting hurt)
// A choice: { label, to, cost?, set?, say? } (any of them can be s => value)
//   cost     minutes it takes; the warhead lands when the clock runs out
//   say      a line shown at the top of the next step (what happened)
//   to       a step, or 'end:<ending>'
// s = { t: minutes left, fails, f: flags }

export const START_MINUTES = 15
export const MAX_STRIKES = 3

const j = (...parts) => parts.filter(Boolean).join(' ')
const both = (s) => s.f.codeA && s.f.codeB
const toDish = (s) => (s.f.okafor ? 'dish' : 'dishAlone')

export const STEPS = {
  sirens: {
    scene: 'room',
    place: 'standing in your bedroom',
    text: (s) =>
      j(
        s.f.memory && 'Wait. You know these sirens: this pitch, this morning, this light. You have done this before.',
        '06:42. Every siren in New Halden starts at once. Your phone lights up on the pillow: BALLISTIC MISSILE INBOUND · SEEK SHELTER · THIS IS NOT A DRILL.',
        'Under the bed, Biscuit the cat is a ball of fur and bad opinions.',
      ),
    timer: 12,
    timeout: { to: 'news', cost: 1, say: 'You stand there with the phone in your hand until the screen goes dark.' },
    a: { label: 'Grab Biscuit and go', cost: 1, set: (s) => (s.f.cat = true), to: 'hallway' },
    b: { label: 'Check the news first', cost: 1, to: 'news' },
  },

  news: {
    scene: 'tv',
    place: 'in front of the TV',
    text: () =>
      j(
        'Channel 4. The anchor is the colour of paper: "…a single warhead, origin unknown. The orbital defence grid has not responded…"',
        'The picture tears into static and a different voice comes through, close and calm: "If you can hear this: not the basement. The roof. Bring the old woman’s case."',
      ),
    a: { label: 'Grab Biscuit and run', cost: 1, set: (s) => (s.f.cat = true), to: 'hallway' },
    b: {
      label: 'Write down the frequency',
      cost: 1,
      set: (s) => (s.f.freq = true),
      to: 'hallway',
      say: 'You scrawl 104.7 on the back of your hand. Biscuit stays under the bed, which is what Biscuit wanted anyway.',
    },
  },

  hallway: {
    scene: 'hall',
    place: 'in the ninth-floor corridor',
    text: (s) =>
      j(
        s.f.cat && 'Biscuit is zipped inside your jacket, furious.',
        'The corridor is chaos: doors banging, someone crying, someone praying. Mrs. Okafor from 9B (seventy-three, retired orbital engineer, frankly terrifying) is dragging a steel case across the carpet.',
        '"You! Take the other handle. This is more important than either of us."',
      ),
    timer: 10,
    timeout: { to: 'stairs', cost: 1, say: 'A wave of neighbours sweeps you past her door and into the stairwell.' },
    a: { label: 'Take the handle', cost: 1, set: (s) => (s.f.okafor = true), to: 'okafor' },
    b: { label: 'Sorry. Run for the stairs', cost: 0, to: 'stairs' },
  },

  okafor: {
    scene: 'flat',
    place: 'in Mrs. Okafor’s flat',
    text: (s) =>
      j(
        'Her flat is star charts and cold coffee. She snaps the case open: a terminal older than you are.',
        '"AEGIS-7. An interceptor I helped put in orbit. They switched her off in ’41 to save money, but she’s still up there, asleep. Wake her from the roof dish and she can knock that thing out of the sky."',
        s.f.freq && 'The roof, you think. The voice on the TV said the roof.',
      ),
    a: { label: '"Then we go up"', cost: 1, to: 'roofstairs' },
    b: { label: '"We need to get underground"', cost: 1, to: 'stairs', say: '"Fine," she snaps, "but the case comes with us."' },
  },

  stairs: {
    scene: 'stairs',
    place: 'in the stairwell',
    text: (s) =>
      j(
        'The stairwell is a waterfall of people pouring down nine floors in the green emergency light.',
        s.f.okafor && 'Mrs. Okafor hugs the steel case to her chest.',
        'High above you, the roof door bangs in the wind. Someone has wedged it open.',
      ),
    timer: 8,
    timeout: { to: 'lobby', cost: 2, say: 'The crowd decides for you. Down you go, one shove at a time.' },
    a: { label: 'Go down with everyone', cost: 2, to: 'lobby' },
    b: { label: 'Go up, against the flow', cost: 1, to: 'roof' },
  },

  roofstairs: {
    scene: 'stairsDark',
    place: 'on the top landing',
    text: () =>
      'Two floors up, the lights die. You haul the case between you, step by step in the dark, up to the roof door. It is chained shut with a padlock the size of a fist.',
    a: { label: 'Kick it down', cost: 1, to: 'kickdoor' },
    b: { label: 'Try the maintenance hatch', cost: 2, to: 'hatch' },
  },

  kickdoor: {
    scene: 'door',
    place: 'at the roof door',
    enter: (s) => (s.f.hurt = true),
    text: () => 'One kick. Two. On the third the chain holds but the hinges don’t, and the door folds out into the wind. Something in your ankle goes pop.',
    a: { label: 'Limp on', cost: 0, to: 'roof' },
    b: { label: 'Strap it up first', cost: 2, set: (s) => (s.f.hurt = false), to: 'roof' },
  },

  hatch: {
    scene: 'machine',
    place: 'in the lift machine room',
    text: () =>
      'The hatch opens onto the lift machine room: cables, dust, a red toolbox, and a lanyard on a hook that reads HALDEN OBSERVATORY · SERVICE ACCESS. Someone in this building has been somewhere interesting.',
    a: { label: 'Take the card and go', cost: 0, set: (s) => (s.f.keycard = true), to: 'roof' },
    b: {
      label: 'Take the card and the toolbox',
      cost: 1,
      set: (s) => {
        s.f.keycard = true
        s.f.tools = true
      },
      to: 'roof',
    },
  },

  roof: {
    scene: 'roof',
    place: 'on the roof',
    text: (s) =>
      j(
        'The roof. New Halden spreads out below you: traffic frozen, sirens everywhere. In the northern sky a thin bright line is climbing, slow and sure.',
        'At the far edge of the roof stands someone in a long coat that seems to be made of light, watching you.',
        s.f.okafor && 'Mrs. Okafor grips your arm. "Tell me you see that too."',
        s.f.hurt && 'Your ankle throbs.',
      ),
    timer: (s) => (s.f.hurt ? 7 : 10),
    timeout: { to: toDish, cost: 1, set: (s) => (s.f.courierGone = true), say: 'The figure flickers once, like a bad bulb, and is gone.' },
    a: { label: 'Walk over to the figure', cost: 1, to: 'courier' },
    b: { label: (s) => (s.f.okafor ? 'Ignore it. Set up the dish' : 'Ignore it. Find the dish'), cost: 0, set: (s) => (s.f.courierGone = true), to: toDish },
  },

  courier: {
    scene: 'courier',
    place: 'face to face with the Courier',
    enter: (s) => (s.f.shard = true),
    text: (s) =>
      j(
        'Up close, the face is yours: older, scarred, kind.',
        s.f.memory ? '"Twelve times now," it says, "and this time you remember. Good."' : '"I’m what you would call a Courier. I have lived this morning eleven times."',
        '"I know two ways out of it. A door under the observatory, or the sky." It presses a cold shard of glass into your palm. "Choose."',
      ),
    a: { label: '"Show me the door"', cost: 2, set: (s) => (s.f.courierGone = true), to: 'fly' },
    b: {
      label: '"How do I stop the missile?"',
      cost: 1,
      set: (s) => {
        s.f.codeB = true
        s.f.quiet = true
        s.f.courierGone = true
      },
      to: toDish,
      say: '"Her code ends in 0451," the Courier says. "And when you aim, the real one is the quiet one." Then it isn’t there.',
    },
  },

  fly: {
    scene: 'fly',
    place: 'in the sky over the river',
    text: (s) =>
      j(
        'The Courier takes your hand and the roof drops away. You are flying: over the frozen motorway, over the river, north towards a white dome on a hill.',
        s.f.okafor && 'Mrs. Okafor has your other hand and is swearing in three languages.',
        s.f.cat && 'Biscuit has gone completely silent, which is worse.',
        'Ahead of you, the bright line has started to curve down.',
      ),
    a: { label: 'Land at the front door', cost: 2, to: 'observatory' },
    b: { label: 'Land on top of the dome', cost: 1, to: 'domeTop' },
  },

  dish: {
    scene: 'dish',
    place: 'beside the roof dish',
    text: (s) =>
      j(
        'Mrs. Okafor plugs the case into the rusted dish. Fans whine. Green letters crawl across the screen: AEGIS-7 · DORMANT · AUTHORISATION REQUIRED.',
        both(s) ? 'She looks at you. You already know the code.' : '"The code. It’s in my notes downstairs, or in my head. A name, and a number."',
      ),
    a: { label: (s) => (both(s) ? 'Type the code' : 'Run down for her notes'), cost: (s) => (both(s) ? 0 : 3), to: (s) => (both(s) ? 'terminal' : 'notes') },
    b: { label: (s) => (both(s) ? 'Let her type it. It’s her bird' : 'Help her remember'), cost: (s) => (both(s) ? 1 : 2), to: (s) => (both(s) ? 'terminal' : 'remember') },
  },

  dishAlone: {
    scene: 'dish',
    place: 'beside the roof dish',
    text: () =>
      j(
        'The dish is here, rusted and enormous, and dead. Whatever wakes it is in that steel case, nine floors down with Mrs. Okafor.',
        'To the north, the bright line is bending towards the city.',
      ),
    a: { label: 'Run back down for her', cost: 3, to: 'okaforLate' },
    b: { label: 'Try the dish’s radio', cost: 1, to: 'broadcast' },
  },

  broadcast: {
    scene: 'dish',
    place: 'at the dish’s transmitter',
    enter: (s) => (s.f.echo = true),
    text: () =>
      j(
        'The dish’s emergency transmitter still has power. You don’t know why, but you lean into the microphone and say it:',
        '"If you can hear this: not the basement. The roof. Bring the old woman’s case."',
        'Then you go cold all over, because now you know whose voice that was on the TV this morning.',
      ),
    a: { label: 'Go down for Mrs. Okafor', cost: 3, to: 'okaforLate' },
    b: { label: 'Wait for whoever is coming', to: 'end:white' },
  },

  okaforLate: {
    scene: 'hall',
    place: 'in the ninth-floor corridor',
    enter: (s) => (s.f.okafor = true),
    text: () => '9B’s door is open. Mrs. Okafor is sitting on her steel case in the empty corridor, out of breath. "Took you long enough," she says. "Lift. Up. Now."',
    a: { label: 'Carry the case up', cost: 2, to: 'dish' },
    b: { label: 'Forget the roof. Get underground', cost: 1, to: 'stairs' },
  },

  notes: {
    scene: 'flat',
    place: 'in Mrs. Okafor’s flat',
    enter: (s) => (s.f.codeA = true),
    text: () =>
      '9B again. Drawers of handwritten notes, decades deep. There! A card in her writing: AEGIS AUTH: LYRA-… and then a brown coffee ring where the rest should be. Of course.',
    timer: 10,
    timeout: { to: 'terminal', cost: 2, say: 'You panic, grab the card and run back up.' },
    a: { label: 'Run back up with it', cost: 2, to: 'terminal' },
    b: {
      label: 'Keep digging for the rest',
      cost: 2,
      set: (s) => (s.f.codeB = true),
      to: 'terminal',
      say: 'Taped inside the drawer: a photo of a young Mrs. Okafor holding a cat on a launch gantry. On the back, "Lyra, born 04:51". You run.',
    },
  },

  remember: {
    scene: 'dish',
    place: 'beside the roof dish',
    enter: (s) => (s.f.codeA = true),
    text: () => 'She shuts her eyes. "Lyra. It was Lyra, the cat we had at mission control. And then a number. Zero… four…" Her hands are shaking. "It’s going."',
    a: { label: 'Try the terminal now', cost: 1, to: 'terminal' },
    b: {
      label: (s) => (s.f.shard ? 'Press the Courier’s shard to the screen' : 'Hold her hands. Take it slow'),
      cost: (s) => (s.f.shard ? 1 : 3),
      set: (s) => (s.f.codeB = true),
      to: 'terminal',
      say: (s) =>
        s.f.shard ? 'The shard turns warm in your hand. On the screen, letters type themselves: LYRA-0451.' : '"…five. One. Zero-four-five-one, the minute she was born." She laughs, and cries a bit.',
    },
  },

  terminal: {
    scene: 'terminal',
    place: 'at the AEGIS terminal',
    text: (s) =>
      j(
        'AEGIS-7 · AUTHORISATION: _ _ _ _ - _ _ _ _',
        both(s) ? 'You know it: LYRA-0451.' : s.f.codeA ? 'You have LYRA, and a blinking cursor.' : 'You have nothing but hope.',
        s.f.tools && 'The toolbox is at your feet.',
      ),
    a: { label: (s) => (both(s) ? 'Type LYRA-0451' : s.f.codeA ? 'Guess: LYRA-1234' : 'Guess: PASSWORD'), cost: 1, to: (s) => (both(s) ? 'aegisWake' : 'aegisFail') },
    b: {
      label: (s) => (s.f.tools ? 'Pry the panel off and hot-wire it' : 'Give up and run for the stairs'),
      cost: (s) => (s.f.tools ? 2 : 1),
      to: (s) => (s.f.tools ? 'manualAim' : 'stairs'),
    },
  },

  aegisFail: {
    scene: 'terminal',
    place: 'at the locked AEGIS terminal',
    text: () => 'AUTHORISATION FAILED · TERMINAL LOCKED FOR 5 MINUTES. Mrs. Okafor sits down on the gravel. "Five minutes," she says. "We don’t have five minutes."',
    a: {
      label: 'Wait out the lockout',
      cost: 5,
      set: (s) => {
        s.f.codeA = true
        s.f.codeB = true
      },
      to: 'terminal',
      say: 'While you wait, it comes back to her: "0451. The minute Lyra was born."',
    },
    b: { label: (s) => (s.f.tools ? 'Pry the panel off' : 'Run for the stairs'), cost: (s) => (s.f.tools ? 2 : 1), to: (s) => (s.f.tools ? 'manualAim' : 'stairs') },
  },

  aegisWake: {
    scene: 'radar',
    place: 'at the AEGIS terminal',
    text: (s) =>
      j(
        'AEGIS-7 · AWAKE. Somewhere above the clouds, something very old opens its eyes.',
        'The screen shows three tracks falling on New Halden. Two blaze with radar noise; the third is so faint it is barely there. ONE INTERCEPTOR REMAINING · SELECT TARGET.',
        s.f.quiet && 'The real one is the quiet one.',
      ),
    timer: 10,
    timeout: { to: 'aegisMiss', cost: 0, say: 'The tracks blur together while you stare, and AEGIS picks one for you.' },
    a: { label: 'Target the faint track', to: 'end:aegis' },
    b: { label: 'Target the brightest track', to: 'aegisMiss' },
  },

  manualAim: {
    scene: 'radar',
    place: 'steering the dish by hand',
    text: () =>
      j(
        'Sparks fly, and AEGIS-7 wakes up without asking anyone’s permission. But the targeting is fried: you’ll have to steer the dish by hand while it locks.',
        'On the screen, a faint track drifts towards the crosshair. Not yet. Not yet…',
      ),
    timer: 7,
    timeout: { to: 'aegisMiss', cost: 0, say: 'Your hands shake, and the dish drifts off target.' },
    a: { label: 'FIRE NOW', to: 'aegisMiss', say: 'Too early. The interceptor goes wide.' },
    b: { label: 'Hold it steady until it locks', to: 'end:aegis' },
  },

  aegisMiss: {
    scene: 'radar',
    place: 'on the roof',
    text: () =>
      'The interceptor climbs, curves, and hits a decoy dead centre: a beautiful, useless flash. The real warhead doesn’t even flinch. AEGIS-7 · NO INTERCEPTORS REMAINING.',
    a: { label: 'Grab Mrs. Okafor and run', cost: 1, to: 'stairs' },
    b: { label: 'Stay. Watch it come', to: 'end:white' },
  },

  lobby: {
    scene: 'lobby',
    place: 'in the lobby',
    text: (s) =>
      j(
        'The lobby. Through the glass the street is a stampede. Mr. Pell the doorman is bellowing: "METRO LINE 4! THE DEEP STATION! GO, GO, GO!"',
        s.f.okafor && 'Mrs. Okafor is still lugging her case.',
        'At the kerb, a delivery van idles with its door open and nobody in it.',
      ),
    a: { label: 'Run for the metro', cost: 3, to: 'street' },
    b: { label: 'Take the van', cost: 1, to: 'van' },
  },

  street: {
    scene: 'street',
    place: 'on Kessel Street',
    text: () => 'Halfway down Kessel Street a little boy is crying beside a fallen scooter, shouting for his mum. People flow round him like water round a stone.',
    timer: 8,
    timeout: { to: 'metroGate', cost: 1, say: 'Someone shoves you on. When you look back, he’s gone.' },
    a: { label: 'Pick him up and carry him', cost: 2, set: (s) => (s.f.theo = true), to: 'metroGate', say: '"I’m Theo," he says into your collar. "I’m eight."' },
    b: { label: 'Keep running', cost: 1, to: 'metroGate' },
  },

  van: {
    scene: 'van',
    place: 'in a borrowed delivery van',
    text: (s) =>
      j(
        'The van’s autopilot wakes up far too cheerful: "Hi there! Where are we delivering today?" Two options glow on the dash: METRO LINE 4 · 2 MIN, or HALDEN OBSERVATORY · 14 KM.',
        s.f.freq && 'You tune the radio to the number on your hand. Under the static, the calm voice: "…the door under the observatory…"',
      ),
    a: { label: 'The metro', cost: 2, to: 'metroGate' },
    b: { label: 'The observatory', cost: 1, to: 'road' },
  },

  metroGate: {
    scene: 'metro',
    place: 'at the metro blast door',
    text: (s) =>
      j(
        'The deep station. The blast door is already rolling shut, and a soldier behind it is screaming "CAPACITY! STAND BACK!" The gap is a metre wide. Then less.',
        s.f.theo && 'Theo has his arms locked round your neck.',
        s.f.okafor && 'Mrs. Okafor is somewhere behind you in the crush.',
      ),
    timer: 6,
    timeout: { to: 'metroClosed', cost: 1, say: 'You hesitate, and the gap is gone.' },
    a: { label: 'Squeeze through', cost: 1, set: (s) => (s.f.inside = true), to: 'deep' },
    b: { label: 'Brace it open for the people behind you', cost: 1, to: 'metroHold' },
  },

  metroHold: {
    scene: 'metro',
    place: 'wedged in the blast door',
    enter: (s) => {
      s.f.inside = true
      s.f.hero = true
    },
    text: (s) =>
      j(
        'You jam your shoulder into the door and it closes on you like a slow, enormous handshake. Four people squeeze past.',
        s.f.okafor && 'Then Mrs. Okafor, case and all.',
        s.f.theo ? 'Then a woman screaming "THEO!", and the boy in your arms twists towards her.' : 'Then a woman screaming her son’s name, searching every face.',
        'The soldier grabs your collar and drags you in as the door seals.',
      ),
    a: { label: 'Find somewhere to sit', cost: 1, to: 'deep' },
    b: { label: 'Help with the head count', cost: 1, to: 'deep', say: '"One thousand two hundred and four," the soldier says. "Air for twelve days, if the intake gets shut."' },
  },

  metroClosed: {
    scene: 'metroOut',
    place: 'on the station steps',
    text: () =>
      j(
        'The blast door seals with a sound like a bank vault. You are outside.',
        'Above the rooftops the bright line has turned and is falling. Beside the entrance is a rusted grille: SERVICE TUNNEL · NO ENTRY.',
      ),
    a: { label: 'Break into the service tunnel', cost: (s) => (s.f.tools ? 1 : 2), to: 'tunnel' },
    b: { label: 'Sit on the steps and watch the sky', to: 'end:white' },
  },

  tunnel: {
    scene: 'tunnel',
    place: 'in the service tunnel',
    under: true,
    enter: (s) => (s.f.inside = true),
    text: () => 'The tunnel is pitch black and slopes down forever. You run with one hand on the wall. Ahead: voices and light. Off to one side, a ventilation shaft roars like a throat.',
    a: { label: 'Follow the voices', cost: 2, to: 'deep' },
    b: { label: 'Climb into the shaft', cost: 1, to: 'vent' },
  },

  deep: {
    scene: 'deep',
    place: 'eighty metres underground',
    under: true,
    text: (s) =>
      j(
        'Eighty metres down. A thousand people on the platforms, pale under the emergency lights.',
        s.f.theo && !s.f.hero && 'Theo’s mother finds him and holds him so hard he squeaks.',
        'The station master is shouting into a radio: "Intake six is still open! If the blast comes down that shaft, we’re all done. Someone has to close it by hand!"',
        s.f.okafor && 'Mrs. Okafor looks at you. Then at the shaft.',
      ),
    a: { label: '"I’ll go"', cost: 1, to: 'vent' },
    b: { label: 'Stay with the crowd', cost: 2, to: 'deepWait' },
  },

  deepWait: {
    scene: 'deep',
    place: 'on the crowded platform',
    under: true,
    text: (s) =>
      s.f.okafor
        ? 'Nobody moves. Then Mrs. Okafor stands up, puts her steel case in your arms and walks into the dark of the shaft. "My turn," she says. "I’ve had a good long go."'
        : 'Nobody moves. Everyone is looking at somebody else. The intake roars on.',
    a: {
      label: (s) => (s.f.okafor ? 'Let her go' : 'Go after all'),
      cost: 1,
      set: (s) => s.f.okafor && (s.f.sacrifice = true),
      to: (s) => (s.f.okafor ? 'end:below' : 'vent'),
    },
    b: { label: (s) => (s.f.okafor ? 'Go with her' : 'Close your eyes'), cost: 1, to: (s) => (s.f.okafor ? 'vent' : 'end:white') },
  },

  vent: {
    scene: 'vent',
    place: 'halfway up the intake shaft',
    under: true,
    text: (s) =>
      j(
        'Forty rungs up the shaft, the wind is tearing at your clothes. The valve wheel is the size of a car tyre and rusted solid.',
        s.f.hurt && 'Your ankle screams on every rung.',
        'Far above, the square of sky is getting very, very bright.',
      ),
    timer: (s) => (s.f.hurt ? 6 : 8),
    timeout: { to: 'ventStuck', cost: 1, say: 'Your hands won’t stop shaking.' },
    a: { label: (s) => (s.f.tools ? 'Hammer it loose with the wrench' : 'Wrench at it with your arms'), cost: 1, to: (s) => (s.f.tools ? 'end:below' : 'ventStuck') },
    b: { label: 'Hang your whole weight off it', cost: 1, to: 'end:below' },
  },

  ventStuck: {
    scene: 'vent',
    place: 'clinging to the valve wheel',
    under: true,
    text: () => 'It moves an inch. Just an inch. The light above is turning from white into something worse.',
    timer: 5,
    timeout: { to: 'end:white', cost: 0 },
    a: { label: 'Brace your feet and heave', cost: 0, to: 'end:below' },
    b: { label: 'Let go and drop', to: 'end:white' },
  },

  road: {
    scene: 'road',
    place: 'on the north motorway',
    text: (s) =>
      j(
        'The van races up an empty motorway. New Halden shrinks in the mirror; ahead is a white dome on a hill.',
        '"Estimated arrival: just in time, probably!" says the autopilot.',
        s.f.freq && 'On 104.7, the calm voice again: "…under the telescope…"',
      ),
    a: { label: 'Stay on the motorway', cost: 3, to: 'observatory' },
    b: { label: 'Take the quarry shortcut', cost: 1, to: 'quarry' },
  },

  quarry: {
    scene: 'quarry',
    place: 'on the quarry road',
    text: () => 'The quarry road is half the distance, and a fallen power pylon is lying right across it, spitting sparks.',
    timer: 8,
    timeout: { to: 'observatory', cost: 3, say: 'You sit there arguing with yourself, then take the long way round.' },
    a: { label: 'Ram it', cost: 1, set: (s) => (s.f.hurt = true), to: 'observatory', say: 'The van wins. Barely. Your ribs don’t.' },
    b: { label: (s) => (s.f.tools ? 'Winch it aside with the toolbox' : 'Drag it aside by hand'), cost: (s) => (s.f.tools ? 1 : 3), to: 'observatory' },
  },

  observatory: {
    scene: 'observatory',
    place: 'outside the observatory',
    text: () =>
      j(
        'Halden Observatory. The gates are open and nobody is here. The great white dome is glowing pink with the dawn, or with something else.',
        'The service door has a card reader blinking red.',
      ),
    a: { label: (s) => (s.f.keycard ? 'Swipe the service card' : 'Smash a window'), cost: (s) => (s.f.keycard ? 0 : 2), to: 'dome' },
    b: { label: 'Climb the dome and look at the sky', cost: 1, to: 'domeTop' },
  },

  domeTop: {
    scene: 'domeTop',
    place: 'on top of the observatory dome',
    enter: (s) => (s.f.quiet = true),
    text: () =>
      'From the top of the dome you can see everything: the city, the river, and the warhead, a falling needle of light whose tail has split into three. Two burn bright. One is barely there. Below you, through the open slit, the floor inside is glowing blue.',
    a: { label: 'Climb down the ladder', cost: 2, to: 'dome' },
    b: { label: 'Drop through the slit', cost: 0, set: (s) => (s.f.hurt = true), to: 'dome', say: 'You land badly. Very badly. But fast.' },
  },

  dome: {
    scene: 'domeIn',
    place: 'under the great telescope',
    text: (s) =>
      j(
        'Under the great telescope, a seam in the floor glows faint blue in the shape of a door.',
        s.f.cat && 'Biscuit wriggles out of your jacket, trots over to the seam and sits on it, as if she has been here before.',
        'A hatch. Below it, stairs going down further than stairs should.',
      ),
    a: { label: 'Go down', cost: 1, to: 'cavern' },
    b: { label: 'Aim the telescope at the warhead first', cost: 2, to: 'telescope' },
  },

  telescope: {
    scene: 'telescope',
    place: 'at the telescope’s eyepiece',
    enter: (s) => (s.f.truth = true),
    text: () =>
      'Through the eyepiece the warhead is close enough to read. No flag, no serial number, just one word stencilled on the casing: HALCYON. That’s New Halden’s own defence AI. Nobody attacked the city. The city attacked itself.',
    a: { label: 'Go down the stairs', cost: 1, to: 'cavern' },
    b: {
      label: (s) => (s.f.freq ? 'Broadcast on 104.7' : 'Shout it into the van’s radio'),
      cost: 1,
      set: (s) => s.f.freq && (s.f.echo = true),
      to: 'cavern',
      say: (s) =>
        s.f.freq ? 'You lean into the mic and hear yourself say: "If you can hear this: not the basement. The roof." The voice on the TV was yours.' : 'Static. Nobody hears you. Or maybe somebody does.',
    },
  },

  cavern: {
    scene: 'cavern',
    place: 'in the cavern under the observatory',
    under: true,
    text: (s) =>
      j(
        'The stairs end in a cavern bigger than a cathedral. In the middle hangs a ship, smooth as a river stone, humming a note you can feel in your teeth.',
        'A hatch slides open. A voice that is almost the Courier’s says: "Departure in one minute. There is room."',
        s.f.cat && 'Biscuit walks straight up the ramp without looking back.',
      ),
    timer: 10,
    timeout: { to: 'shipAsk', cost: 1, say: 'You hover at the hatch, unable to move.' },
    a: { label: 'Get on board', to: 'end:passengers' },
    b: { label: '"Can this ship stop the missile?"', cost: 0, to: 'shipAsk' },
  },

  shipAsk: {
    scene: 'cavern',
    place: 'at the ship’s hatch',
    under: true,
    text: (s) =>
      j(
        '"Stop it? No. This ship can only do two things: leave, or go back. I can fold you back to 06:42 this morning with everything you know now. You might do better. You might do worse."',
        s.f.truth && '"And this time," it adds, "you will know about HALCYON."',
      ),
    a: { label: 'Leave Earth', to: 'end:passengers' },
    b: { label: 'Go back. Try again', to: 'end:again' },
  },
}

// ================= The five endings =================
const who = (s) => {
  const w = [s.f.okafor && 'Mrs. Okafor', s.f.theo && !s.f.inside && 'Theo', s.f.cat && 'Biscuit'].filter(Boolean)
  return w.length ? w.join(' and ') : ''
}

export const ENDINGS = {
  white: {
    n: 1,
    title: 'WHITE',
    kind: 'bad',
    scene: 'flash',
    text: (s, why) =>
      j(
        why === 'frozen' && 'You froze one time too many. While you stood there deciding, the clock simply ran out.',
        why === 'clock' && 'You ran out of minutes.',
        s.under ? `You are ${s.place} when the blast finds its way down to you.` : `You are ${s.place} when the sky turns white.`,
        'The light arrives long before the sound, and there is no time to be afraid. New Halden, all of it and everyone in it, is gone in the time it takes to blink.',
        s.f.echo && 'Somewhere, a voice on the radio is still saying "the roof".',
      ),
  },
  below: {
    n: 2,
    title: 'DOWN BELOW',
    kind: 'good',
    scene: 'below',
    text: (s) =>
      j(
        s.f.sacrifice
          ? 'The intake slams shut with a boom that runs through the rock. Mrs. Okafor never comes back down the shaft.'
          : 'The valve screams, turns, and slams shut a heartbeat before the shockwave goes over.',
        'Eighty metres up, New Halden is gone. Down here, one thousand two hundred and four people are alive, with twelve days of air and a long walk ahead into a very different world.',
        s.f.sacrifice && 'Her steel case stays in your arms. Inside, on top of the terminal, a star chart with your name added in pen.',
        s.f.theo && 'Theo falls asleep with his head on your shoulder.',
        s.f.cat && 'Biscuit makes a thousand new friends and despises all of them.',
      ),
  },
  aegis: {
    n: 3,
    title: 'AEGIS',
    kind: 'best',
    scene: 'dawn',
    text: (s) =>
      j(
        'Seven hundred kilometres up, AEGIS-7 fires the last thing she has. For a moment there is a new star in the morning sky: very bright, very far away, harmless.',
        'Then, one by one, the sirens of New Halden wind down into silence.',
        s.f.okafor && 'Mrs. Okafor sits down on the gravel and laughs until she cries. "Good girl," she tells the sky.',
        s.f.cat && 'Biscuit comes out of your jacket and goes to sleep in the warm curve of the dish.',
        s.f.echo && 'You never tell anyone that the voice on the TV was yours.',
        'The city never learns how close it came. You do.',
      ),
  },
  passengers: {
    n: 4,
    title: 'PASSENGERS',
    kind: 'good',
    scene: 'space',
    text: (s) =>
      j(
        'The ship rises through the hill as if the rock were mist. Through the window you watch a light bloom on the coast where New Halden used to be, small and silent from up here.',
        who(s) && `${who(s)} ${who(s).includes(' and ') ? 'are' : 'is'} beside you.`,
        s.f.truth && 'You tell the crew about HALCYON. They nod as if they have heard it before.',
        'Then the Earth is a marble, then a star, then just one of the stars, all of them coming closer.',
      ),
  },
  again: {
    n: 5,
    title: 'AGAIN',
    kind: 'loop',
    scene: 'loop',
    text: (s) =>
      j(
        'The cavern folds up like paper. The ship, the stairs, the dome, the whole morning, all of it is pulled back through a very small hole.',
        'You open your eyes. 06:42. Every siren in New Halden starts at once.',
        'This time, you remember.',
        s.f.truth && 'You remember a word on a casing: HALCYON.',
      ),
  },
}
export const ENDING_LIST = Object.keys(ENDINGS)
