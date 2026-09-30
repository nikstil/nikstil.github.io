// DOOMSCROLL.EXE (TRANSLATR™'s arcade shooter). nikstil.com: the engine now lives in /doomscroll/engine.js
// (shared with nikstil.com/doomscroll/), which adds the Ban Hammer, the auto-rifle and the weapon
// animations. This file is the game's original menus and ad breaks around it.
import { a as Ye, j as f, r as U } from "./vendor-C6OhNUgE.js";
import { u as ye, s as qe } from "./index-Bp0o3VTX.js";
import { D as O } from "./doomLevels-TAD7AXCp.js";
import { u as Ge, A as _e } from "./AdBreak-UT1NLF3y.js";
import { createEngine } from "/doomscroll/engine.js";
import { DIFFICULTIES as Df, savedDifficulty as Ds, saveDifficulty as Dw } from "/doomscroll/difficulty.js";
const Je = (canvas, callbacks) => createEngine(canvas, O, callbacks);
const ze = 4500,
  De = { hp: 60, ammo: 30 },
  ge = (e) => `${Math.floor(e / 60)}:${String(e % 60).padStart(2, "0")}`;
function nl() {
  return ye((t) => t.shooterOpen) ? Ye.createPortal(f.jsx(el, {}), document.body) : null;
}
function el() {
  const e = U.useRef(null),
    t = U.useRef(null),
    [a, r] = U.useState(() => (Ds() === null ? "difficulty" : "title")), // first time: pick a difficulty
    [dI, dS] = U.useState(() => Ds() ?? 10),
    [h, v] = U.useState(0),
    [o, L] = U.useState(null),
    [A] = U.useState(() => matchMedia("(pointer: coarse)").matches),
    E = ye((T) => Math.min(O.length - 1, T.stats.shooterLevel ?? 0)),
    H = U.useRef(null),
    { closeShooter: W, noteShooter: P, noteBest: se, triggerEnding: F } = ye.getState(),
    [X, l] = Ge(() => P({ shooterAds: 1 }));
  (U.useEffect(() => {
    const T = createEngine(e.current, O, {
      difficulty: Df[Ds() ?? 10],
      onHit: () => l(() => T.resume()),
      onDeath: () => {
        (P({ shooterDeaths: 1 }), r("dead"));
      },
      onWin: (S) => {
        (P({
          shooterLevels: 1,
          shooterCleanLevels: S.ads === 0 ? 1 : 0,
          shooterFullClears: S.kills >= S.total ? 1 : 0,
        }),
          S.last ? P({ shooterWins: 1 }) : se({ shooterLevel: S.level + 1 }),
          L(S),
          r(S.last ? "victory" : "won"));
      },
      onSound: (S) => qe(S),
      onKill: () => P({ shooterKills: 1 }),
    });
    return (
      (t.current = T),
      new URLSearchParams(location.search).has("debug") && (window.doom = T),
      document.documentElement.classList.add("shooter-open"),
      () => {
        (T.destroy(), document.documentElement.classList.remove("shooter-open"));
      }
    );
  }, []),
    U.useEffect(() => {
      if (a !== "victory") return;
      const T = setTimeout(() => F("shooter"), ze);
      return () => clearTimeout(T);
    }, [a, F]));
  const D = (T, S = null) => {
      ((H.current = S), t.current.start(T, S), v(T), r("play"));
    },
    J = (T = 0) => {
      (D(T, T ? { hp: 100, ammo: 40 } : null), P({ shooterRuns: 1 }));
    },
    B = () =>
      D(o.level + 1, { hp: Math.max(De.hp, o.hp), ammo: Math.max(De.ammo, o.ammo), rifle: o.rifle, weapon: o.weapon }),
    u = () => {
      var T;
      return D(h, {
        hp: 100,
        ammo: Math.max(30, ((T = H.current) == null ? void 0 : T.ammo) ?? 0),
        rifle: H.current?.rifle,
        weapon: H.current?.weapon,
      });
    },
    p = () => {
      (t.current.pause(), r("paused"));
    },
    z = () => {
      (t.current.resume(), r("play"));
    };
  return (
    U.useEffect(() => {
      const T = (S) => {
        S.key !== "Escape" ||
          X ||
          (a === "play" ? p() : a === "paused" ? z() : a === "difficulty" ? r("title") : (a === "title" || a === "dead") && W());
      };
      return (window.addEventListener("keydown", T), () => window.removeEventListener("keydown", T));
    }),
    f.jsx("div", {
      className: "shooter-screen",
      role: "dialog",
      "aria-modal": "true",
      "aria-label": "DOOMSCROLL.EXE",
      children: f.jsxs("div", {
        className: "shooter-frame",
        children: [
          f.jsxs("div", {
            className: "shooter-bar",
            children: [
              f.jsx("span", { children: "DOOMSCROLL.EXE" }),
              f.jsxs("span", {
                className: "shooter-sub",
                children: ["Shareware · Episode 1", a === "title" ? "" : ` · ${O[h].id}`],
              }),
              !X &&
                a !== "victory" &&
                f.jsx("button", { className: "shooter-x", onClick: W, "aria-label": "Quit DOOMSCROLL", children: "✕" }),
            ],
          }),
          f.jsxs("div", {
            className: "shooter-view",
            children: [
              f.jsx("canvas", { ref: e, className: "shooter-canvas" }),
              a === "title" &&
                f.jsxs("div", {
                  className: "shooter-overlay",
                  children: [
                    f.jsx("div", { className: "shooter-title", children: "DOOMSCROLL" }),
                    f.jsxs("div", {
                      className: "shooter-episode",
                      children: ["Episode 1: Knee-Deep in the Ads · ", O.length, " levels"],
                    }),
                    f.jsx("p", {
                      className: "shooter-copy",
                      children:
                        "Hell has pop-ups. Close them with the Ad Blocker 3000 and walk into each level’s EXIT switch. Management waits at the end.",
                    }),
                    f.jsx("p", {
                      className: "shooter-copy shooter-warn",
                      children: "⚠️ Every hit you take plays a 5-second ad. You can’t skip it. We checked.",
                    }),
                    f.jsxs("div", {
                      className: "flex flex-wrap justify-center gap-2",
                      children: [
                        E > 0 &&
                          f.jsxs("button", {
                            className: "btn btn-blood",
                            onClick: () => J(E),
                            children: ["▶ Continue: ", O[E].id, " ", O[E].name],
                          }),
                        f.jsx("button", {
                          className: `btn ${E > 0 ? "" : "btn-blood"}`,
                          onClick: () => J(0),
                          children: "▶ New game",
                        }),
                        f.jsx("button", { className: "btn", onClick: W, children: "Quit to TRANSLATR™" }),
                      ],
                    }),
                    f.jsxs("p", {
                      className: "shooter-copy",
                      style: { fontSize: "0.75rem", opacity: 0.8, overflowWrap: "anywhere" },
                      children: [
                        "Difficulty: ",
                        f.jsx("b", { children: Df[dI].name }),
                        " ",
                        f.jsx("button", { className: "btn", onClick: () => r("difficulty"), children: "Change" }),
                      ],
                    }),
                  ],
                }),
              a === "difficulty" &&
                f.jsxs("div", {
                  className: "shooter-overlay",
                  children: [
                    f.jsx("div", { className: "shooter-title", children: "CHOOSE YOUR DIFFICULTY" }),
                    f.jsx("p", {
                      className: "shooter-copy",
                      children: "They’re all easy. Some are easier than others. Pick carefully.",
                    }),
                    f.jsx("div", {
                      style: {
                        display: "grid",
                        gap: "6px",
                        width: "min(100%, 40rem)",
                        maxHeight: "min(55vh, 26rem)",
                        overflowY: "auto",
                        padding: "2px 6px 2px 2px",
                      },
                      children: Df.map((D, K) =>
                        f.jsxs(
                          "button",
                          {
                            className: `btn ${K === dI ? "btn-blood" : ""}`,
                            style: { justifyContent: "flex-start", textAlign: "left", whiteSpace: "normal", overflowWrap: "anywhere", height: "auto" },
                            onClick: () => {
                              (Dw(K), dS(K), t.current.setDifficulty(Df[K]), r("title"));
                            },
                            children: [`${K + 1}. `, D.name],
                          },
                          K,
                        ),
                      ),
                    }),
                  ],
                }),
              a === "paused" &&
                f.jsxs("div", {
                  className: "shooter-overlay",
                  children: [
                    f.jsx("div", { className: "shooter-title", children: "PAUSED" }),
                    f.jsxs("div", {
                      className: "flex flex-wrap justify-center gap-2",
                      children: [
                        f.jsx("button", { className: "btn btn-blood", onClick: z, children: "▶ Resume" }),
                        f.jsx("button", { className: "btn", onClick: W, children: "Quit to TRANSLATR™" }),
                      ],
                    }),
                  ],
                }),
              a === "dead" &&
                !X &&
                f.jsxs("div", {
                  className: "shooter-overlay shooter-dead",
                  children: [
                    f.jsx("div", { className: "shooter-title", children: "YOU DIED" }),
                    f.jsx("p", { className: "shooter-copy", children: "Customer Support has closed your ticket." }),
                    f.jsxs("div", {
                      className: "flex flex-wrap justify-center gap-2",
                      children: [
                        f.jsxs("button", {
                          className: "btn btn-blood",
                          onClick: () => l(u),
                          children: ["📺 Watch an ad to respawn (", O[h].id, ")"],
                        }),
                        f.jsx("button", { className: "btn", onClick: W, children: "Quit" }),
                      ],
                    }),
                  ],
                }),
              (a === "won" || a === "victory") &&
                o &&
                f.jsxs("div", {
                  className: "shooter-overlay",
                  children: [
                    f.jsxs("div", { className: "shooter-episode", children: [O[o.level].id, ": ", O[o.level].name] }),
                    f.jsx("div", {
                      className: "shooter-title",
                      children: o.last ? "EPISODE COMPLETE" : "LEVEL COMPLETE",
                    }),
                    f.jsxs("div", {
                      className: "shooter-stats",
                      children: [
                        f.jsxs("span", {
                          children: ["Pop-ups closed ", f.jsxs("b", { children: [o.kills, "/", o.total] })],
                        }),
                        f.jsxs("span", { children: ["Ads watched ", f.jsx("b", { children: o.ads })] }),
                        f.jsxs("span", { children: ["Time ", f.jsx("b", { children: ge(o.seconds) })] }),
                      ],
                    }),
                    (o.ads === 0 || o.kills >= o.total) &&
                      f.jsx("p", {
                        className: "shooter-copy shooter-warn",
                        children: [o.ads === 0 && "Ad-free!", o.kills >= o.total && "Every pop-up closed!"]
                          .filter(Boolean)
                          .join(" "),
                      }),
                    o.last
                      ? f.jsxs(f.Fragment, {
                          children: [
                            f.jsx("p", {
                              className: "shooter-copy",
                              children:
                                "Brock Bottomline has been downsized. Management will return in Episode 2 (paid DLC).",
                            }),
                            f.jsx("button", {
                              className: "btn btn-blood",
                              onClick: () => F("shooter"),
                              children: "Continue ▶",
                            }),
                          ],
                        })
                      : f.jsxs(f.Fragment, {
                          children: [
                            f.jsxs("p", {
                              className: "shooter-copy",
                              children: [
                                "Next: ",
                                O[o.level + 1].id,
                                " ",
                                O[o.level + 1].name,
                                ". Health and ammo carry over.",
                              ],
                            }),
                            f.jsxs("div", {
                              className: "flex flex-wrap justify-center gap-2",
                              children: [
                                f.jsx("button", { className: "btn btn-blood", onClick: B, children: "Next level ▶" }),
                                f.jsx("button", { className: "btn", onClick: W, children: "Save & quit" }),
                              ],
                            }),
                          ],
                        }),
                  ],
                }),
              X && f.jsx(_e, { ad: X }),
            ],
          }),
          A && a === "play" && !X && f.jsx(ll, { engine: t, onPause: p }),
          f.jsx("p", {
            className: "shooter-help",
            children: A
              ? "Hold the arrows to move and turn · FIRE shoots · BAN swings the Ban Hammer (knocks shots back) · ⇄ switches guns"
              : "WASD / arrows move · ← → or the mouse turn (click the screen to grab the mouse) · Space or click fires · P, V, left Alt or right-click swings the Ban Hammer (it knocks shots back) · 1 / 2 or scroll switches guns · Shift runs · Esc pauses",
          }),
        ],
      }),
    })
  );
}
function ll({ engine: e, onPause: t }) {
  const a = (r) => ({
    onPointerDown: (h) => {
      e.current.press(r, !0);
      try {
        h.currentTarget.setPointerCapture(h.pointerId);
      } catch {}
    },
    onPointerUp: () => e.current.press(r, !1),
    onPointerCancel: () => e.current.press(r, !1),
  });
  return f.jsxs("div", {
    className: "shooter-pad",
    children: [
      f.jsxs("div", {
        className: "shooter-dpad",
        children: [
          f.jsx("button", {
            className: "shooter-key",
            style: { gridArea: "up" },
            ...a("up"),
            "aria-label": "Forward",
            children: "▲",
          }),
          f.jsx("button", {
            className: "shooter-key",
            style: { gridArea: "left" },
            ...a("left"),
            "aria-label": "Turn left",
            children: "◀",
          }),
          f.jsx("button", {
            className: "shooter-key",
            style: { gridArea: "right" },
            ...a("right"),
            "aria-label": "Turn right",
            children: "▶",
          }),
          f.jsx("button", {
            className: "shooter-key",
            style: { gridArea: "down" },
            ...a("down"),
            "aria-label": "Back",
            children: "▼",
          }),
        ],
      }),
      f.jsx("button", { className: "shooter-key", onClick: t, "aria-label": "Pause", children: "❚❚" }),
      f.jsx("button", {
        className: "shooter-key",
        onClick: () => e.current.nextWeapon(),
        "aria-label": "Switch gun",
        children: "⇄",
      }),
      f.jsx("button", { className: "shooter-key shooter-fire", ...a("melee"), "aria-label": "Ban Hammer", children: "BAN" }),
      f.jsx("button", { className: "shooter-key shooter-fire", ...a("fire"), children: "FIRE" }),
    ],
  });
}
export { nl as default };
