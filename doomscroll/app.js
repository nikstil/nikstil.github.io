// DOOMSCROLL.EXE on nikstil.com: three episodes of five levels, each episode's maps bigger than the
// last. The game itself is /doomscroll/engine.js (the same engine as TRANSLATR™'s arcade).
import { createEngine } from "/doomscroll/engine.js";
import { EPISODES } from "/doomscroll/levels.js";
import { DIFFICULTIES, savedDifficulty, saveDifficulty } from "/doomscroll/difficulty.js";

const $ = (sel) => document.querySelector(sel);
const embed = new URLSearchParams(location.search).has("embed");
embed && document.documentElement.classList.add("embed");
const coarse = matchMedia("(pointer: coarse)").matches;
coarse && document.documentElement.classList.add("coarse");

// ================= Saved progress =================
// { [episode id]: { level: next level to play, done: finished at least once } }
const SAVE_KEY = "doomscroll-save";
const MUTE_KEY = "doomscroll-mute";
function loadSave() {
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY)) ?? {};
  } catch {
    return {};
  }
}
function save(update) {
  const data = { ...loadSave(), ...update };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // private mode: progress just isn't kept
  }
}

// ================= Sound =================
// Little synth blips for the engine's sound names (the TRANSLATR™ version uses the game's sounds).
let audio = null;
let muted = (() => {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
})();
const SOUNDS = {
  thud: [[110, 0.08, "square", 0.25], [55, 0.12, "sawtooth", 0.15]],
  crit: [[320, 0.05, "square", 0.12]],
  kaching: [[880, 0.06, "square", 0.12], [1320, 0.12, "square", 0.1]],
  coin: [[1046, 0.05, "triangle", 0.18], [1568, 0.09, "triangle", 0.14]],
  error: [[180, 0.18, "sawtooth", 0.2]],
  denied: [[90, 0.1, "square", 0.15]],
  popup: [[520, 0.05, "sine", 0.08]],
  horn: [[98, 0.5, "sawtooth", 0.22], [147, 0.5, "sawtooth", 0.12]],
  levelup: [[523, 0.1, "square", 0.12], [659, 0.1, "square", 0.12], [784, 0.2, "square", 0.12]],
};
function play(name) {
  if (muted || !SOUNDS[name]) return;
  try {
    audio ??= new AudioContext();
    let t = audio.currentTime;
    for (const [freq, dur, type, vol] of SOUNDS[name]) {
      const osc = audio.createOscillator(),
        gain = audio.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain).connect(audio.destination);
      osc.start(t);
      osc.stop(t + dur);
      t += dur * 0.8;
    }
  } catch {
    // no audio: that's fine
  }
}
function showMute() {
  $("#mute").textContent = muted ? "🔇" : "🔊";
}
$("#mute").addEventListener("click", () => {
  muted = !muted;
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {}
  showMute();
});
showMute();

// ================= Screens =================
const screens = ["title", "difficulty", "paused", "dead", "won"];
let screen = "title";
function show(name) {
  screen = name;
  for (const s of screens) $(`#${s}`).hidden = s !== name;
  $("#pad").hidden = !(coarse && name === "play");
  $("#bar-sub").textContent = name === "title" || name === "difficulty" ? "Shareware · 3 episodes" : `Episode ${episode.id}: ${episode.name} · ${episode.levels[levelIndex].id}`;
}

let episode = EPISODES[0];
let levelIndex = 0;
let levelCarry = null; // what the current level started with (for a retry)
let result = null; // the last level's stats
let engine = null;

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const ENDINGS = {
  1: "Brock Bottomline has been downsized. Management will return in Episode 2.",
  2: "The CFO has been audited. The checkout goes on without her.",
  3: "The Algorithm has been unplugged. You are free. (Until the next update.)",
};

// ================= Difficulty =================
let difficulty = savedDifficulty(); // null until the player picks one (the first time they play)
const diffOf = () => DIFFICULTIES[difficulty ?? 10];
function renderDifficulty() {
  $("#diff-list").replaceChildren(
    ...DIFFICULTIES.map((d, i) => {
      const li = document.createElement("li"),
        b = document.createElement("button");
      b.textContent = d.name;
      b.setAttribute("aria-pressed", String(i === difficulty));
      b.addEventListener("click", () => {
        difficulty = i;
        saveDifficulty(i);
        engine?.setDifficulty(DIFFICULTIES[i]);
        renderTitle();
        show("title");
      });
      li.append(b);
      return li;
    }),
  );
}

function renderTitle() {
  $("#diff-name").textContent = diffOf().name;
  const saved = loadSave();
  const list = $("#episodes");
  list.replaceChildren(
    ...EPISODES.map((ep) => {
      const s = saved[ep.id] ?? {};
      const card = document.createElement("div");
      card.className = "ep";
      const [first, lastLevel] = [ep.levels[0], ep.levels[ep.levels.length - 1]];
      const size = `${first.map[0].length}×${first.map.length} to ${lastLevel.map[0].length}×${lastLevel.map.length}`;
      card.innerHTML = `<span class="ep-num">EPISODE ${ep.id}</span><span class="ep-name"></span><span class="ep-meta"></span><div class="row"></div>`;
      card.querySelector(".ep-name").textContent = ep.name;
      card.querySelector(".ep-meta").innerHTML = `5 levels · maps ${size}${s.done ? ' · <span class="ep-done">✓ finished</span>' : ""}`;
      const row = card.querySelector(".row");
      const button = (text, primary, onClick) => {
        const b = document.createElement("button");
        b.className = `btn${primary ? " blood" : ""}`;
        b.textContent = text;
        b.addEventListener("click", onClick);
        row.append(b);
      };
      if (s.level > 0 && s.level < ep.levels.length) {
        button(`▶ Continue ${ep.levels[s.level].id}`, true, () => begin(ep, s.level, startCarry(ep, s.level)));
        button("New", false, () => begin(ep, 0, startCarry(ep, 0)));
      } else button("▶ Play", ep.id === 1 || !!saved[ep.id - 1]?.done, () => begin(ep, 0, startCarry(ep, 0)));
      return card;
    }),
  );
}

/** What you start a level with when you jump straight to it (Episodes 2 and 3 come with the rifle). */
function startCarry(ep, level) {
  if (level === 0) return ep.id > 1 ? { hp: 100, ammo: 50, rifle: true } : null;
  return { hp: 100, ammo: 40, ...(ep.id > 1 ? { rifle: true } : {}) };
}

function begin(ep, level, carry) {
  if (ep !== episode || !engine) {
    engine?.destroy();
    episode = ep;
    engine = createEngine($("#screen"), ep.levels, {
      difficulty: diffOf(),
      onHit: () => engine.resume(), // no ads here: just a moment of invulnerability
      onDeath: () => show("dead"),
      onWin: (stats) => levelDone(stats),
      onSound: play,
    });
    new URLSearchParams(location.search).has("debug") && (window.doom = engine);
  }
  levelIndex = level;
  levelCarry = carry;
  save({ [ep.id]: { ...loadSave()[ep.id], level } });
  engine.start(level, carry);
  show("play");
  $("#screen").focus?.();
}

function levelDone(stats) {
  result = stats;
  const lv = episode.levels[stats.level];
  const last = stats.last;
  const lastEpisode = episode.id === EPISODES.length;
  save({ [episode.id]: { level: last ? 0 : stats.level + 1, done: !!loadSave()[episode.id]?.done || last } });
  $("#won-level").textContent = `${lv.id}: ${lv.name}`;
  $("#won-title").textContent = last ? "EPISODE COMPLETE" : "LEVEL COMPLETE";
  $("#won-stats").innerHTML = `<span>Pop-ups closed <b>${stats.kills}/${stats.total}</b></span><span>Hits taken <b>${stats.ads}</b></span><span>Time <b>${fmt(stats.seconds)}</b></span>`;
  $("#won-extra").textContent = [stats.ads === 0 && "Untouched!", stats.kills >= stats.total && "Every pop-up closed!"].filter(Boolean).join(" ");
  $("#won-extra").hidden = !$("#won-extra").textContent;
  const next = episode.levels[stats.level + 1];
  $("#won-next").textContent = last ? ENDINGS[episode.id] : `Next: ${next.id} ${next.name}. Health, ammo and guns carry over.`;
  const buttons = $("#won-buttons");
  buttons.replaceChildren();
  const add = (text, primary, action) => {
    const b = document.createElement("button");
    b.className = `btn${primary ? " blood" : ""}`;
    b.textContent = text;
    b.addEventListener("click", action);
    buttons.append(b);
  };
  const carry = { hp: Math.max(60, stats.hp), ammo: Math.max(30, stats.ammo), rifle: stats.rifle, weapon: stats.weapon };
  if (!last) add("Next level ▶", true, () => begin(episode, stats.level + 1, carry));
  else if (!lastEpisode) add(`Episode ${episode.id + 1} ▶`, true, () => begin(EPISODES[episode.id], 0, { ...carry, hp: 100, rifle: true }));
  add("Menu", last && lastEpisode, toMenu);
  show("won");
}

function toMenu() {
  engine?.pause();
  document.pointerLockElement && document.exitPointerLock?.();
  renderTitle();
  show("title");
}

// ================= Buttons & keys =================
document.addEventListener("click", (e) => {
  const act = e.target.closest("[data-do]")?.dataset.do;
  if (!act) return;
  if (act === "resume") (engine.resume(), show("play"));
  if (act === "menu") toMenu();
  if (act === "retry") begin(episode, levelIndex, { ...(levelCarry ?? {}), hp: 100, ammo: Math.max(30, levelCarry?.ammo ?? 0) });
  if (act === "pause") (engine.pause(), show("paused"));
  if (act === "switch") engine.nextWeapon();
  if (act === "difficulty") (renderDifficulty(), show("difficulty"));
});
for (const b of document.querySelectorAll("[data-press]")) {
  const name = b.dataset.press;
  b.addEventListener("pointerdown", (e) => {
    engine?.press(name, true);
    try {
      b.setPointerCapture(e.pointerId);
    } catch {}
  });
  for (const ev of ["pointerup", "pointercancel"]) b.addEventListener(ev, () => engine?.press(name, false));
}
window.addEventListener("keydown", (e) => {
  if (e.code === "KeyM" && screen !== "title") {
    $("#mute").click();
    return;
  }
  if (e.key !== "Escape") return;
  if (screen === "play") (engine.pause(), show("paused"));
  else if (screen === "paused") (engine.resume(), show("play"));
});
// Leaving the tab pauses the game.
document.addEventListener("visibilitychange", () => {
  document.hidden && screen === "play" && (engine.pause(), show("paused"));
});

// A live demo behind the title screen: Episode 1's first map, idle.
engine = createEngine($("#screen"), EPISODES[0].levels, {
  difficulty: diffOf(),
  onHit: () => engine.resume(),
  onDeath: () => show("dead"),
  onWin: (stats) => levelDone(stats),
  onSound: play,
});
new URLSearchParams(location.search).has("debug") && (window.doom = engine);
renderTitle();
// First time here: pick a difficulty before anything else.
if (difficulty === null) (renderDifficulty(), show("difficulty"));
else show("title");
