// DOOMSCROLL.EXE on nikstil.com: three episodes of five levels, each episode's maps bigger than the
// last, then the final boss. One player, or two on one keyboard (split screen). The game itself is /doomscroll/engine.js (the same engine as TRANSLATR™'s arcade).
import { createEngine } from "/doomscroll/engine.js";
import { EPISODES, FINAL } from "/doomscroll/levels.js";
import { DIFFICULTIES, savedDifficulty, saveDifficulty } from "/doomscroll/difficulty.js";
import { playSfx, setMusic, setSound } from "/doomscroll/audio.js";

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
// Synthesized effects and a soundtrack per episode: /doomscroll/audio.js.
let muted = (() => {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
})();
setSound({ sfx: !muted, music: !muted });
const play = (name) => playSfx(name);
function showMute() {
  $("#mute").textContent = muted ? "🔇" : "🔊";
}
$("#mute").addEventListener("click", () => {
  muted = !muted;
  setSound({ sfx: !muted, music: !muted });
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
  $("#pad").hidden = !(coarse && name === "play" && !coop);
  $("#bar-sub").textContent =
    name === "title" || name === "difficulty" ? "Shareware · 3 episodes" : `${episode.final ? "Final boss" : `Episode ${episode.id}: ${episode.name}`} · ${episode.levels[levelIndex].id}`;
  // The episode's soundtrack plays in the game (and its menus); the title screen is quiet.
  setMusic(name === "title" || name === "difficulty" ? null : episode.final ? "final" : episode.id);
}

// The final boss, as a one-level "episode". Unlocked by finishing all three episodes.
const FINAL_EPISODE = { id: "final", final: true, name: "The Shareholder Meeting", levels: [FINAL] };
let episode = EPISODES[0];
let levelIndex = 0;
let levelCarry = null; // what the current level started with (for a retry)
let engine = null;

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const ENDINGS = {
  1: "Brock Bottomline has been downsized. Management will return in Episode 2.",
  2: "The CFO has been audited. The checkout goes on without her.",
  3: "The Algorithm has been unplugged. Somebody still has to answer to the shareholders.",
  final: "The Shareholders have been divested. Line goes down. You did that.",
};

// ================= Co-op =================
const COOP_KEY = "doomscroll-coop";
let coop = (() => {
  try {
    return localStorage.getItem(COOP_KEY) === "1";
  } catch {
    return false;
  }
})();
function setCoop(on) {
  coop = on;
  try {
    localStorage.setItem(COOP_KEY, on ? "1" : "0");
  } catch {}
  $("#view").classList.toggle("coop", on);
  $("#help-solo").hidden = on;
  $("#help-coop").hidden = !on;
  engine?.setCoop(on);
}

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

const allDone = () => EPISODES.every((ep) => loadSave()[ep.id]?.done);
function renderTitle() {
  $("#diff-name").textContent = diffOf().name;
  $("#coop").checked = coop;
  const saved = loadSave();
  const card = (ep, meta, buttons) => {
    const el = document.createElement("div");
    el.className = `ep${ep.final ? " ep-final" : ""}`;
    el.innerHTML = `<span class="ep-num"></span><span class="ep-name"></span><span class="ep-meta"></span><div class="row"></div>`;
    el.querySelector(".ep-num").textContent = ep.final ? "FINAL BOSS" : `EPISODE ${ep.id}`;
    el.querySelector(".ep-name").textContent = ep.name;
    el.querySelector(".ep-meta").innerHTML = meta;
    const row = el.querySelector(".row");
    for (const [text, primary, onClick, disabled] of buttons) {
      const b = document.createElement("button");
      b.className = `btn${primary ? " blood" : ""}`;
      b.textContent = text;
      b.disabled = !!disabled;
      b.addEventListener("click", onClick);
      row.append(b);
    }
    return el;
  };
  const cards = EPISODES.map((ep) => {
    const s = saved[ep.id] ?? {};
    const [first, lastLevel] = [ep.levels[0], ep.levels[ep.levels.length - 1]];
    const size = `${first.map[0].length}×${first.map.length} to ${lastLevel.map[0].length}×${lastLevel.map.length}`;
    const meta = `5 levels · maps ${size}${s.done ? ' · <span class="ep-done">✓ finished</span>' : ""}`;
    const buttons =
      s.level > 0 && s.level < ep.levels.length
        ? [
            [`▶ Continue ${ep.levels[s.level].id}`, true, () => begin(ep, s.level, startCarry(ep, s.level))],
            ["New", false, () => begin(ep, 0, startCarry(ep, 0))],
          ]
        : [["▶ Play", ep.id === 1 || !!saved[ep.id - 1]?.done, () => begin(ep, 0, startCarry(ep, 0))]];
    return card(ep, meta, buttons);
  });
  const unlocked = allDone();
  cards.push(
    card(
      FINAL_EPISODE,
      unlocked
        ? `One arena. 20 Ban Hammer hits to break them, 30 more to finish them.${saved.final?.done ? ' · <span class="ep-done">✓ beaten</span>' : ""}`
        : "🔒 Finish all three episodes to unlock.",
      [[unlocked ? "▶ Fight" : "🔒 Locked", unlocked, () => begin(FINAL_EPISODE, 0, { hp: 100, ammo: 80, rifle: true }), !unlocked]],
    ),
  );
  $("#episodes").replaceChildren(...cards);
}

/** What you start a level with when you jump straight to it (Episodes 2 and 3 come with the rifle). */
function startCarry(ep, level) {
  if (level === 0) return ep.id > 1 ? { hp: 100, ammo: 50, rifle: true } : null;
  return { hp: 100, ammo: 40, ...(ep.id > 1 ? { rifle: true } : {}) };
}

function makeEngine(levels) {
  engine?.destroy();
  engine = createEngine($("#screen"), levels, {
    difficulty: diffOf(),
    coop,
    onHit: () => engine.resume(), // no ads here: just a moment of invulnerability
    onDeath: () => show("dead"),
    onWin: (stats) => levelDone(stats),
    onSound: play,
  });
  new URLSearchParams(location.search).has("debug") && (window.doom = engine);
}

function begin(ep, level, carry) {
  if (ep !== episode || !engine) {
    episode = ep;
    makeEngine(ep.levels);
  }
  engine.setCoop(coop);
  levelIndex = level;
  levelCarry = carry;
  ep.final || save({ [ep.id]: { ...loadSave()[ep.id], level } });
  engine.start(level, carry);
  show("play");
  $("#screen").focus?.();
}

function levelDone(stats) {
  const lv = episode.levels[stats.level];
  const last = stats.last;
  const lastEpisode = episode.id === EPISODES.length;
  save({ [episode.id]: { level: last ? 0 : stats.level + 1, done: !!loadSave()[episode.id]?.done || last } });
  const unlockedNow = last && !episode.final && allDone();
  $("#won-level").textContent = `${lv.id}: ${lv.name}`;
  $("#won-title").textContent = episode.final ? "SHAREHOLDERS DIVESTED" : last ? "EPISODE COMPLETE" : "LEVEL COMPLETE";
  $("#won-stats").innerHTML = `<span>Pop-ups closed <b>${stats.kills}/${stats.total}</b></span><span>Hits taken <b>${stats.ads}</b></span><span>Time <b>${fmt(stats.seconds)}</b></span>`;
  $("#won-extra").textContent = [stats.ads === 0 && "Untouched!", stats.kills >= stats.total && "Every pop-up closed!", unlockedNow && "🔓 The final boss is unlocked."]
    .filter(Boolean)
    .join(" ");
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
  // Co-op: each player keeps their own health and ammo (a player who went down comes back).
  const keep = (p) => ({ hp: Math.max(60, p.hp), ammo: Math.max(30, p.ammo), rifle: p.rifle, weapon: p.weapon });
  const carry = coop ? stats.players.map(keep) : keep(stats);
  if (!last) add("Next level ▶", true, () => begin(episode, stats.level + 1, carry));
  else if (unlockedNow) add("Fight the final boss ▶", true, () => begin(FINAL_EPISODE, 0, { hp: 100, ammo: 80, rifle: true }));
  else if (!lastEpisode && !episode.final)
    add(`Episode ${episode.id + 1} ▶`, true, () => begin(EPISODES[episode.id], 0, coop ? carry.map((c) => ({ ...c, hp: 100, rifle: true })) : { ...carry, hp: 100, rifle: true }));
  add("Menu", last && (lastEpisode || episode.final) && !unlockedNow, toMenu);
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
  if (act === "retry") {
    const again = (c) => ({ ...(c ?? {}), hp: 100, ammo: Math.max(30, c?.ammo ?? 0) });
    begin(episode, levelIndex, Array.isArray(levelCarry) ? levelCarry.map(again) : again(levelCarry));
  }
  if (act === "pause") (engine.pause(), show("paused"));
  if (act === "switch") engine.nextWeapon();
  if (act === "difficulty") (renderDifficulty(), show("difficulty"));
});
$("#coop").addEventListener("change", (e) => setCoop(e.target.checked));
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
makeEngine(EPISODES[0].levels);
setCoop(coop);
renderTitle();
// First time here: pick a difficulty before anything else.
if (difficulty === null) (renderDifficulty(), show("difficulty"));
else show("title");
