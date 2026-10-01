// DOOMSCROLL.EXE engine: a tiny raycaster, shared by TRANSLATR™'s arcade (translatr/assets/Shooter-*.js)
// and the stand-alone game at nikstil.com/doomscroll/.
//
// Co-op: createEngine(..., { coop: true }) splits the screen for two players on one keyboard.
//
// Weapons: the shotgun (1), the AUTO-RIFLE 3000 (2, picked up on Episode 1's third level) and the Ban
// Hammer (P, V, left Alt or right-click): a melee swing with twice the shotgun's damage that knocks
// enemy shots back wherever you're looking. A knocked-back shot stuns whoever it hits for 3 seconds.
//
// The textures, map format and parser below come from the game's original build, unchanged (hence
// the short names). Maps are rows of characters: '#' wall (the level's texture), other capitals and
// '$' wall textures, 'X' exit switch, '@' start, i/c/n/m (and e/o/u/t, added below) enemies, b the
// level's boss, h health, a ammo, r the rifle.
const R = 320,
  de = 200,
  b = 168,
  $ = 64,
  ue = 9,
  Z = {
    imp: { hp: 30, speed: 1.4, cool: 2.4, dmg: 8, scale: 0.9, ranged: !0 },
    cookie: { hp: 55, speed: 2.1, cool: 1.3, dmg: 12, scale: 0.8, melee: !0 },
    bell: { hp: 18, speed: 3, cool: 1, dmg: 5, scale: 0.55, melee: !0, fly: !0 },
    mimic: { hp: 90, speed: 1.8, cool: 1.1, dmg: 16, scale: 0.75, melee: !0, ambush: 2.6 },
    boss: {
      hp: 320,
      speed: 1.1,
      cool: 1.5,
      dmg: 12,
      scale: 1.35,
      ranged: !0,
      spread: 3,
      name: "CHAD MONETIZER · VP OF GROWTH",
    },
    karen: {
      hp: 420,
      speed: 1.3,
      cool: 1.3,
      dmg: 10,
      scale: 1.3,
      ranged: !0,
      spread: 3,
      summon: { type: "bell", every: 6, max: 3 },
      name: "KAREN · HEAD OF HR",
    },
    ceo: {
      hp: 800,
      speed: 1,
      cool: 1.2,
      dmg: 12,
      scale: 1.5,
      ranged: !0,
      spread: 5,
      summon: { type: "imp", every: 9, max: 2 },
      name: "BROCK BOTTOMLINE · CEO",
    },
  },
  Ne = { R: 0, T: 1, $: 2, F: 3, X: 4, K: 5, S: 6, O: 7, L: 8, W: 9 },
  Le = { i: "imp", c: "cookie", n: "bell", m: "mimic" },
  Pe = { h: "health", a: "ammo", r: "rifle" },
  Ce = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] },
  Qe = (e, t, a) => (4278190080 | (a << 16) | (t << 8) | e) >>> 0;
function Oe(e, t) {
  const a = Math.min(255, (e & 255) * t) | 0,
    r = Math.min(255, ((e >> 8) & 255) * t) | 0;
  return (4278190080 | ((Math.min(255, ((e >> 16) & 255) * t) | 0) << 16) | (r << 8) | a) >>> 0;
}
function M(e, t = $) {
  const a = document.createElement("canvas");
  ((a.width = t), (a.height = t));
  const r = a.getContext("2d");
  return (e(r, t), new Uint32Array(r.getImageData(0, 0, t, t).data.buffer));
}
function ie(e) {
  let t = e;
  return () => (t = (t * 1664525 + 1013904223) >>> 0) / 4294967296;
}
function oe(e, t, a, r) {
  const h = ie(r);
  for (let v = 0; v < a; v++)
    ((e.fillStyle = t[(h() * t.length) | 0]), e.fillRect((h() * 64) | 0, (h() * 64) | 0, (1 + h() * 2) | 0, 1));
}
const Ie = [
  M((e) => {
    ((e.fillStyle = "#3a160e"), e.fillRect(0, 0, 64, 64));
    const t = ie(7);
    for (let a = 0; a < 4; a++) {
      const r = a % 2 ? 16 : 0;
      for (let h = -r; h < 64; h += 32) {
        const v = 110 + ((t() * 40) | 0);
        ((e.fillStyle = `rgb(${v + 20},${(v * 0.38) | 0},${(v * 0.25) | 0})`), e.fillRect(h + 1, a * 16 + 1, 30, 14));
      }
    }
    oe(e, ["#2a0f08", "#8e3b27", "#5a2415"], 220, 3);
  }),
  M((e) => {
    ((e.fillStyle = "#4b5057"), e.fillRect(0, 0, 64, 64));
    for (const [t, a] of [
      [0, 0],
      [32, 0],
      [0, 32],
      [32, 32],
    ]) {
      ((e.fillStyle = "#666c74"),
        e.fillRect(t + 1, a + 1, 30, 30),
        (e.fillStyle = "#80868e"),
        e.fillRect(t + 1, a + 1, 30, 2),
        (e.fillStyle = "#383c42"),
        e.fillRect(t + 1, a + 29, 30, 2),
        (e.fillStyle = "#a8aeb6"));
      for (const [r, h] of [
        [4, 5],
        [27, 5],
        [4, 26],
        [27, 26],
      ])
        e.fillRect(t + r, a + h, 2, 2);
    }
    ((e.fillStyle = "#1d6b10"), e.fillRect(6, 30, 52, 4), (e.fillStyle = "#39ff14"));
    for (let t = 8; t < 56; t += 8) e.fillRect(t, 31, 3, 2);
    oe(e, ["#3a3e44", "#72787f"], 120, 5);
  }),
  M((e) => {
    const t = e.createLinearGradient(0, 0, 0, 64);
    (t.addColorStop(0, "#ffe14d"),
      t.addColorStop(1, "#ff4fa3"),
      (e.fillStyle = "#222"),
      e.fillRect(0, 0, 64, 64),
      (e.fillStyle = t),
      e.fillRect(3, 3, 58, 58),
      (e.fillStyle = "#b3001b"),
      (e.font = 'bold 22px Impact, "Arial Black", sans-serif'),
      (e.textAlign = "center"),
      e.fillText("BUY", 32, 30),
      (e.fillStyle = "#1a1a1a"),
      (e.font = "bold 12px Arial, sans-serif"),
      e.fillText("NOW!!!", 32, 46),
      (e.fillStyle = "#fff"),
      e.fillRect(46, 5, 12, 8),
      (e.fillStyle = "#000"),
      (e.font = "bold 7px Arial"),
      e.fillText("AD", 52, 12));
  }),
  M((e) => {
    ((e.fillStyle = "#4a0c0c"), e.fillRect(0, 0, 64, 64));
    const t = ie(11);
    ((e.strokeStyle = "#8b1a1a"), (e.lineWidth = 2));
    for (let a = 0; a < 9; a++) {
      e.beginPath();
      let r = t() * 64,
        h = t() * 64;
      e.moveTo(r, h);
      for (let v = 0; v < 4; v++) ((r += (t() - 0.5) * 30), (h += (t() - 0.5) * 30), e.lineTo(r, h));
      e.stroke();
    }
    oe(e, ["#2a0404", "#a3261e", "#6b0f0f"], 260, 13);
  }),
  M((e) => {
    ((e.fillStyle = "#5a5f66"),
      e.fillRect(0, 0, 64, 64),
      (e.fillStyle = "#2b2b2b"),
      e.fillRect(8, 6, 48, 18),
      (e.fillStyle = "#ff2020"),
      (e.font = "bold 14px Arial, sans-serif"),
      (e.textAlign = "center"),
      e.fillText("EXIT", 32, 20),
      (e.fillStyle = "#383c42"),
      e.fillRect(22, 30, 20, 28),
      (e.fillStyle = "#39ff14"),
      e.fillRect(28, 34, 8, 14),
      (e.fillStyle = "#d6d6d6"),
      e.fillRect(29, 44, 6, 10));
  }),
  M((e) => {
    ((e.fillStyle = "#3a2412"),
      e.fillRect(0, 0, 64, 64),
      (e.fillStyle = "#f4e6c8"),
      e.fillRect(3, 3, 58, 58),
      oe(e, ["#e6d4ae", "#fff6e0"], 60, 17),
      (e.fillStyle = "#c0833f"),
      e.beginPath(),
      e.arc(14, 15, 8, 0, Math.PI * 2),
      e.fill(),
      (e.fillStyle = "#5a3212"));
    for (const [t, a] of [
      [10, 12],
      [16, 11],
      [13, 17],
      [18, 16],
    ])
      e.fillRect(t, a, 2, 2);
    ((e.fillStyle = "#2b2b2b"),
      (e.font = "bold 7px Arial, sans-serif"),
      e.fillText("WE VALUE", 25, 13),
      e.fillText("YOUR DATA", 25, 21),
      (e.fillStyle = "#b9ab90"));
    for (const [t, a] of [
      [28, 50],
      [32, 44],
      [36, 48],
    ])
      e.fillRect(7, t, a, 2);
    ((e.fillStyle = "#2e9e3e"),
      e.fillRect(6, 44, 52, 12),
      (e.fillStyle = "#fff"),
      (e.textAlign = "center"),
      e.fillText("ACCEPT ALL", 32, 53));
  }),
  M((e) => {
    ((e.fillStyle = "#101317"),
      e.fillRect(0, 0, 64, 64),
      (e.fillStyle = "#2b3038"),
      e.fillRect(2, 0, 3, 64),
      e.fillRect(59, 0, 3, 64));
    const t = ie(23);
    for (let a = 2; a < 62; a += 8) {
      ((e.fillStyle = "#262b33"), e.fillRect(6, a, 52, 6), (e.fillStyle = "#1a1e24"));
      for (let r = 30; r < 56; r += 3) e.fillRect(r, a + 1, 1, 4);
      for (let r = 0; r < 4; r++) {
        const h = t();
        ((e.fillStyle = h < 0.6 ? "#39ff14" : h < 0.85 ? "#ffb000" : "#ff2a2a"), e.fillRect(9 + r * 5, a + 2, 2, 2));
      }
    }
  }),
  M((e) => {
    ((e.fillStyle = "#c9bd9c"),
      e.fillRect(0, 0, 64, 64),
      oe(e, ["#b8ab88", "#d8cdb0"], 200, 29),
      (e.fillStyle = "#6b5a3e"),
      e.fillRect(0, 56, 64, 8),
      (e.fillStyle = "#3a2b1a"),
      e.fillRect(14, 8, 36, 28));
    const t = e.createLinearGradient(0, 10, 0, 34);
    (t.addColorStop(0, "#f5a623"),
      t.addColorStop(1, "#d0021b"),
      (e.fillStyle = t),
      e.fillRect(16, 10, 32, 24),
      (e.fillStyle = "#4a1020"),
      e.beginPath(),
      e.moveTo(16, 27),
      e.lineTo(25, 17),
      e.lineTo(31, 23),
      e.lineTo(38, 15),
      e.lineTo(48, 27),
      e.fill(),
      (e.fillStyle = "#fff"),
      (e.font = "bold 6px Arial, sans-serif"),
      (e.textAlign = "center"),
      e.fillText("SYNERGY", 32, 32));
  }),
  M((e) => {
    ((e.fillStyle = "#4a300a"),
      e.fillRect(0, 0, 64, 64),
      (e.font = "bold 18px Arial, sans-serif"),
      (e.textAlign = "center"));
    for (const [t, a] of [
      [0, 0],
      [32, 0],
      [0, 32],
      [32, 32],
    ]) {
      ((e.fillStyle = "#b07d1e"), e.fillRect(t + 1, a + 1, 30, 30), (e.fillStyle = "#8a5e12"));
      for (let r = 6; r < 30; r += 6) e.fillRect(t + 1, a + 1 + r, 30, 1);
      ((e.fillStyle = "#e0b23a"), e.fillRect(t + 1, a + 1, 30, 2), (e.fillStyle = "#6d6d74"));
      for (const [r, h] of [
        [1, 1],
        [27, 1],
        [1, 27],
        [27, 27],
      ])
        e.fillRect(t + r, a + h, 4, 4);
      ((e.fillStyle = "#7b2cbf"), e.fillText("?", t + 16, a + 24));
    }
  }),
  M((e) => {
    ((e.fillStyle = "#3b1c0f"), e.fillRect(0, 0, 64, 64));
    const t = ie(31);
    for (let a = 0; a < 64; a += 16) {
      const r = 70 + ((t() * 20) | 0);
      ((e.fillStyle = `rgb(${r + 20},${(r * 0.45) | 0},${(r * 0.25) | 0})`),
        e.fillRect(a + 1, 0, 14, 64),
        (e.fillStyle = "rgba(0,0,0,0.18)"));
      for (let h = 0; h < 5; h++) e.fillRect(a + 2 + ((t() * 12) | 0), 0, 1, 64);
    }
    ((e.fillStyle = "#c9a227"), e.fillRect(0, 38, 64, 2), e.fillRect(0, 8, 64, 1));
  }),
];
function Ve(e) {
  const t = [],
    a = [],
    r = [],
    h = [];
  let v = { x: 1.5, y: 1.5 };
  return (
    e.map.forEach((o, L) => {
      (t.push(new Uint8Array(o.length)),
        a.push([]),
        [...o].forEach((A, E) => {
          const H = A === "#" ? e.wall : A;
          ((a[L][E] = null),
            H in Ne
              ? ((t[L][E] = A === "X" ? ue : 1), (a[L][E] = Ie[Ne[H]]))
              : A === "@"
                ? (v = { x: E + 0.5, y: L + 0.5 })
                : A === "b"
                  ? r.push([e.boss ?? "boss", E + 0.5, L + 0.5])
                  : Le[A]
                    ? r.push([Le[A], E + 0.5, L + 0.5])
                    : Pe[A] && h.push([Pe[A], E + 0.5, L + 0.5]));
        }));
    }),
    { grid: t, tex: a, start: v, spawns: r, pickups: h }
  );
}
const he = {
  imp: M((e) => {
    ((e.fillStyle = "#f4f4f4"),
      e.fillRect(8, 12, 48, 44),
      (e.fillStyle = "#1f5fd1"),
      e.fillRect(8, 12, 48, 9),
      (e.fillStyle = "#e03030"),
      e.fillRect(47, 13, 8, 7),
      (e.fillStyle = "#fff"),
      e.fillRect(50, 15, 2, 3),
      (e.fillStyle = "#111"),
      e.fillRect(8, 12, 48, 1),
      e.fillRect(8, 55, 48, 1),
      e.fillRect(8, 12, 1, 44),
      e.fillRect(55, 12, 1, 44),
      (e.fillStyle = "#111"),
      e.fillRect(16, 26, 12, 6),
      e.fillRect(36, 26, 12, 6),
      (e.fillStyle = "#ff1f1f"),
      e.fillRect(20, 28, 4, 3),
      e.fillRect(40, 28, 4, 3),
      (e.fillStyle = "#300"),
      e.fillRect(16, 38, 32, 12),
      (e.fillStyle = "#fff"));
    for (let t = 17; t < 47; t += 6) (e.fillRect(t, 38, 4, 4), e.fillRect(t + 3, 46, 4, 4));
    ((e.fillStyle = "#e03030"), (e.font = "bold 6px Arial"), e.fillText("YOU WON!!!", 11, 19));
  }),
  cookie: M((e) => {
    ((e.fillStyle = "#7a1010"),
      e.beginPath(),
      e.moveTo(14, 20),
      e.lineTo(8, 2),
      e.lineTo(24, 14),
      e.moveTo(50, 20),
      e.lineTo(56, 2),
      e.lineTo(40, 14),
      e.fill(),
      (e.fillStyle = "#c0833f"),
      e.beginPath(),
      e.arc(32, 38, 24, 0, Math.PI * 2),
      e.fill(),
      (e.fillStyle = "#5a3212"));
    for (const [t, a] of [
      [20, 30],
      [42, 26],
      [30, 48],
      [46, 44],
      [16, 44],
    ])
      e.fillRect(t, a, 5, 4);
    ((e.fillStyle = "#ff1f1f"),
      e.fillRect(22, 34, 6, 4),
      e.fillRect(36, 34, 6, 4),
      (e.fillStyle = "#300"),
      e.fillRect(24, 44, 16, 6),
      (e.fillStyle = "#fff"),
      e.fillRect(25, 44, 3, 5),
      e.fillRect(36, 44, 3, 5));
  }),
  boss: M((e) => {
    ((e.fillStyle = "#1b2440"),
      e.beginPath(),
      e.moveTo(12, 64),
      e.lineTo(18, 34),
      e.lineTo(46, 34),
      e.lineTo(52, 64),
      e.fill(),
      (e.fillStyle = "#fff"),
      e.fillRect(28, 34, 8, 30),
      (e.fillStyle = "#d4202a"),
      e.fillRect(30, 36, 4, 22),
      (e.fillStyle = "#ffd24a"),
      (e.font = "bold 12px Arial"),
      e.fillText("$", 16, 52),
      e.fillText("$", 42, 52),
      (e.fillStyle = "#f1c27d"),
      e.beginPath(),
      e.arc(32, 20, 13, 0, Math.PI * 2),
      e.fill(),
      (e.fillStyle = "#e8c547"),
      e.fillRect(19, 6, 26, 7),
      (e.fillStyle = "#111"),
      e.fillRect(21, 16, 10, 5),
      e.fillRect(33, 16, 10, 5),
      e.fillRect(31, 17, 2, 2),
      (e.fillStyle = "#7a2b1f"),
      e.fillRect(26, 27, 12, 2));
  }),
  bell: M((e) => {
    ((e.fillStyle = "#f2c230"),
      e.beginPath(),
      e.moveTo(14, 46),
      e.quadraticCurveTo(20, 40, 20, 26),
      e.arc(32, 26, 12, Math.PI, 0),
      e.quadraticCurveTo(44, 40, 50, 46),
      e.closePath(),
      e.fill(),
      (e.fillStyle = "#c4901a"),
      e.fillRect(14, 45, 36, 3),
      (e.fillStyle = "#8a5e12"),
      e.beginPath(),
      e.arc(32, 51, 4, 0, Math.PI * 2),
      e.fill(),
      (e.fillStyle = "#111"),
      e.fillRect(24, 28, 6, 4),
      e.fillRect(34, 28, 6, 4),
      (e.fillStyle = "#ff1f1f"),
      e.fillRect(26, 29, 2, 2),
      e.fillRect(36, 29, 2, 2),
      (e.fillStyle = "#e02020"),
      e.beginPath(),
      e.arc(46, 16, 9, 0, Math.PI * 2),
      e.fill(),
      (e.fillStyle = "#fff"),
      (e.font = "bold 7px Arial, sans-serif"),
      (e.textAlign = "center"),
      e.fillText("99+", 46, 19));
  }),
  mimicIdle: M((e) => {
    ((e.fillStyle = "#6a1fa8"),
      e.fillRect(12, 32, 40, 28),
      (e.fillStyle = "#8b3fd1"),
      e.fillRect(10, 24, 44, 10),
      (e.fillStyle = "#ffd24a"),
      e.fillRect(30, 24, 4, 36),
      e.fillRect(10, 32, 44, 3),
      (e.fillStyle = "#fff3b0"),
      (e.font = "bold 12px Arial, sans-serif"),
      (e.textAlign = "center"),
      e.fillText("?", 21, 52),
      e.fillText("?", 43, 52));
  }),
  mimic: M((e) => {
    ((e.fillStyle = "#8b3fd1"),
      e.fillRect(10, 6, 44, 12),
      (e.fillStyle = "#ffd24a"),
      e.fillRect(30, 6, 4, 12),
      (e.fillStyle = "#ff1f1f"),
      e.fillRect(16, 10, 5, 4),
      e.fillRect(43, 10, 5, 4),
      (e.fillStyle = "#300"),
      e.fillRect(12, 18, 40, 18),
      (e.fillStyle = "#fff"));
    for (let t = 13; t < 50; t += 6) (e.fillRect(t, 18, 4, 5), e.fillRect(t + 2, 31, 4, 5));
    ((e.fillStyle = "#d23a6a"),
      e.fillRect(26, 26, 12, 5),
      (e.fillStyle = "#6a1fa8"),
      e.fillRect(12, 36, 40, 24),
      (e.fillStyle = "#ffd24a"),
      e.fillRect(30, 36, 4, 24));
  }),
  karen: M((e) => {
    ((e.fillStyle = "#6a2c91"),
      e.beginPath(),
      e.moveTo(14, 64),
      e.lineTo(20, 36),
      e.lineTo(44, 36),
      e.lineTo(50, 64),
      e.fill(),
      (e.fillStyle = "#e9e1d3"),
      e.fillRect(29, 36, 6, 28),
      (e.fillStyle = "#1f5fd1"),
      e.fillRect(26, 36, 2, 14),
      e.fillRect(36, 36, 2, 14),
      (e.fillStyle = "#fff"),
      e.fillRect(27, 48, 10, 8),
      (e.fillStyle = "#d4202a"),
      (e.font = "bold 5px Arial, sans-serif"),
      (e.textAlign = "center"),
      e.fillText("HR", 32, 54),
      (e.fillStyle = "#f1c27d"),
      e.beginPath(),
      e.arc(32, 22, 11, 0, Math.PI * 2),
      e.fill(),
      (e.fillStyle = "#e8c170"),
      e.beginPath(),
      e.moveTo(18, 32),
      e.lineTo(16, 14),
      e.quadraticCurveTo(26, 2, 44, 10),
      e.lineTo(46, 22),
      e.lineTo(40, 14),
      e.quadraticCurveTo(28, 14, 22, 20),
      e.lineTo(23, 34),
      e.fill(),
      (e.fillStyle = "#111"),
      e.fillRect(24, 11, 7, 3),
      e.fillRect(33, 11, 7, 3),
      e.fillRect(26, 20, 4, 3),
      e.fillRect(35, 20, 4, 3),
      (e.fillStyle = "#7a1f1f"),
      e.fillRect(28, 27, 8, 4));
  }),
  ceo: M((e) => {
    ((e.fillStyle = "#23262b"),
      e.beginPath(),
      e.moveTo(10, 64),
      e.lineTo(16, 32),
      e.lineTo(48, 32),
      e.lineTo(54, 64),
      e.fill(),
      (e.fillStyle = "#fff"),
      e.beginPath(),
      e.moveTo(26, 32),
      e.lineTo(32, 46),
      e.lineTo(38, 32),
      e.fill(),
      (e.fillStyle = "#e8b923"),
      e.fillRect(31, 34, 3, 22),
      (e.fillStyle = "#6b8e23"));
    for (const t of [9, 55]) (e.beginPath(), e.arc(t, 52, 7, 0, Math.PI * 2), e.fill());
    ((e.fillStyle = "#ffd24a"),
      (e.font = "bold 8px Arial, sans-serif"),
      (e.textAlign = "center"),
      e.fillText("$", 9, 55),
      e.fillText("$", 55, 55),
      (e.fillStyle = "#f1c27d"),
      e.beginPath(),
      e.arc(32, 21, 11, 0, Math.PI * 2),
      e.fill(),
      (e.fillStyle = "#111"),
      e.fillRect(22, 0, 20, 10),
      e.fillRect(18, 9, 28, 3),
      (e.fillStyle = "#e8b923"),
      e.fillRect(22, 7, 20, 2),
      (e.fillStyle = "#111"),
      e.fillRect(25, 19, 4, 3),
      e.fillRect(35, 19, 4, 3),
      (e.strokeStyle = "#e8b923"),
      (e.lineWidth = 1),
      e.beginPath(),
      e.arc(37, 20.5, 4, 0, Math.PI * 2),
      e.stroke(),
      (e.fillStyle = "#7a2b1f"),
      e.fillRect(27, 27, 10, 2));
  }),
  shot: M((e) => {
    ((e.fillStyle = "#ff3040"),
      e.fillRect(24, 24, 16, 14),
      (e.fillStyle = "#fff"),
      e.fillRect(24, 24, 16, 3),
      e.fillRect(31, 29, 2, 5),
      e.fillRect(31, 35, 2, 2));
  }),
  health: M((e) => {
    ((e.fillStyle = "#2c9a1e"),
      e.fillRect(24, 34, 16, 26),
      (e.fillStyle = "#c9ced8"),
      e.fillRect(24, 32, 16, 3),
      (e.fillStyle = "#ffd800"),
      e.beginPath(),
      e.moveTo(34, 38),
      e.lineTo(27, 49),
      e.lineTo(32, 49),
      e.lineTo(29, 57),
      e.lineTo(37, 45),
      e.lineTo(32, 45),
      e.fill());
  }),
  ammo: M((e) => {
    ((e.fillStyle = "#5b5a2b"),
      e.fillRect(18, 42, 28, 18),
      (e.fillStyle = "#7a7a3a"),
      e.fillRect(18, 42, 28, 4),
      (e.fillStyle = "#c0392b"));
    for (let t = 21; t < 44; t += 6) e.fillRect(t, 36, 4, 8);
    e.fillStyle = "#ffd24a";
    for (let t = 21; t < 44; t += 6) e.fillRect(t, 42, 4, 2);
  }),
};
function Ze({ sky: e, floor: t }) {
  const a = new Uint32Array(R * b),
    r = b / 2,
    h = ([v, o], L) => Qe(...v.map((A, E) => (A + (o[E] - A) * L) | 0));
  for (let v = 0; v < b; v++) a.fill(v < r ? h(e, v / r) : h(t, (v - r) / r), v * R, (v + 1) * R);
  return a;
}

// ================= Extra enemies and sprites =================
// Episode 2 and 3 enemies and bosses, and the final boss (the nikstil.com app).
Object.assign(Z, {
  // Episode 2
  spam: { hp: 26, speed: 2.6, cool: 1.6, dmg: 6, scale: 0.6, ranged: !0, fly: !0 },
  bot: { hp: 120, speed: 1.5, cool: 1.2, dmg: 14, scale: 0.85, melee: !0 },
  upsell: {
    hp: 560,
    speed: 1.4,
    cool: 1.2,
    dmg: 11,
    scale: 1.4,
    ranged: !0,
    spread: 5,
    summon: { type: "spam", every: 6, max: 4 },
    name: "UPSELL UNICORN · CHIEF REVENUE OFFICER",
  },
  cfo: {
    hp: 650,
    speed: 1.2,
    cool: 1.1,
    dmg: 12,
    scale: 1.4,
    ranged: !0,
    spread: 4,
    summon: { type: "cookie", every: 7, max: 3 },
    name: "PENNY PINCHER · CFO",
  },
  // Episode 3
  influencer: { hp: 70, speed: 1.6, cool: 1.6, dmg: 9, scale: 0.85, ranged: !0, spread: 2 },
  troll: { hp: 140, speed: 2.3, cool: 1, dmg: 15, scale: 0.9, melee: !0 },
  mega: {
    hp: 900,
    speed: 1.3,
    cool: 1,
    dmg: 12,
    scale: 1.5,
    ranged: !0,
    spread: 6,
    summon: { type: "influencer", every: 7, max: 3 },
    name: "MEGA-INFLUENCER · 40M FOLLOWERS",
  },
  algorithm: {
    hp: 1400,
    speed: 1.15,
    cool: 1,
    dmg: 13,
    scale: 1.6,
    ranged: !0,
    spread: 7,
    summon: { type: "mimic", every: 8, max: 3 },
    name: "THE ALGORITHM · IT KNOWS WHAT YOU WANT",
  },
  // The final boss: bullets bounce off, only the Ban Hammer hurts it. hp counts hammer hits: 20 to
  // reach phase 2, then 30 more (on every difficulty).
  final: {
    hp: 20,
    phase2: 30,
    hits: !0,
    speed: 1.1,
    cool: 1.3,
    dmg: 12,
    scale: 1.75,
    ranged: !0,
    spread: 5,
    summon: { type: "troll", every: 9, max: 2 },
    name: "THE SHAREHOLDERS · INFINITE GROWTH",
    final: !0,
  },
});
Object.assign(Le, { e: "spam", o: "bot", u: "influencer", t: "troll" });

/** A copy of a sprite with its colour channels swapped around (a quick new look). */
function recolour(tex, order) {
  const out = new Uint32Array(tex.length);
  for (let i = 0; i < tex.length; i++) {
    const c = tex[i],
      ch = [c & 255, (c >> 8) & 255, (c >> 16) & 255];
    out[i] = ((c & 0xff000000) | (ch[order[2]] << 16) | (ch[order[1]] << 8) | ch[order[0]]) >>> 0;
  }
  return out;
}
const eyes = (e, x, y, gap, colour = "#ff1f1f") => {
  e.fillStyle = "#111";
  e.fillRect(x, y, 7, 5);
  e.fillRect(x + gap, y, 7, 5);
  e.fillStyle = colour;
  e.fillRect(x + 2, y + 1, 3, 3);
  e.fillRect(x + gap + 2, y + 1, 3, 3);
};
Object.assign(he, {
  cfo: recolour(he.boss, [1, 2, 0]),
  algorithm: recolour(he.ceo, [2, 0, 1]),
  // Spam email: an angry envelope that won't stop arriving.
  spam: M((e) => {
    e.fillStyle = "#f2f2f2";
    e.fillRect(10, 20, 44, 30);
    e.strokeStyle = "#999";
    e.lineWidth = 2;
    e.beginPath();
    e.moveTo(10, 20);
    e.lineTo(32, 38);
    e.lineTo(54, 20);
    e.stroke();
    eyes(e, 20, 36, 17);
    e.fillStyle = "#e02020";
    e.beginPath();
    e.arc(50, 18, 8, 0, Math.PI * 2);
    e.fill();
    e.fillStyle = "#fff";
    e.font = "bold 9px Arial";
    e.textAlign = "center";
    e.fillText("99+", 50, 21);
  }),
  // Chatbot: "How can I help you today?" (it can't).
  bot: M((e) => {
    e.fillStyle = "#2b9fd9";
    e.beginPath();
    e.roundRect?.(8, 10, 48, 38, 8) ?? e.rect(8, 10, 48, 38);
    e.fill();
    e.beginPath();
    e.moveTo(18, 46);
    e.lineTo(14, 58);
    e.lineTo(28, 47);
    e.fill();
    e.fillStyle = "#dff4ff";
    e.fillRect(16, 18, 32, 18);
    e.fillStyle = "#111";
    e.fillRect(22, 23, 6, 6);
    e.fillRect(36, 23, 6, 6);
    e.fillRect(26, 31, 12, 2);
    e.fillStyle = "#ffd24a";
    e.fillRect(31, 4, 2, 7);
    e.fillRect(29, 2, 6, 3);
    e.fillStyle = "#fff";
    e.font = "bold 5px Arial";
    e.textAlign = "center";
    e.fillText("HOW CAN I HELP?", 32, 44);
  }),
  // Influencer: a phone on a ring light.
  influencer: M((e) => {
    e.strokeStyle = "#fff5c4";
    e.lineWidth = 5;
    e.beginPath();
    e.arc(32, 26, 20, 0, Math.PI * 2);
    e.stroke();
    e.fillStyle = "#555";
    e.fillRect(30, 44, 4, 18);
    e.fillStyle = "#111";
    e.fillRect(22, 10, 20, 34);
    e.fillStyle = "#f7c6a3";
    e.fillRect(25, 14, 14, 18);
    e.fillStyle = "#5a3212";
    e.fillRect(25, 13, 14, 4);
    e.fillStyle = "#111";
    e.fillRect(27, 20, 3, 2);
    e.fillRect(34, 20, 3, 2);
    e.fillStyle = "#ff2d6f";
    e.fillRect(29, 26, 6, 3);
    e.fillStyle = "#ff2d6f";
    e.fillRect(24, 35, 16, 5);
    e.fillStyle = "#fff";
    e.font = "bold 4px Arial";
    e.textAlign = "center";
    e.fillText("LIVE", 32, 39);
  }),
  // Comment troll: green, grinning, typing "ratio".
  troll: M((e) => {
    e.fillStyle = "#5fa33a";
    e.beginPath();
    e.ellipse(32, 34, 22, 24, 0, 0, Math.PI * 2);
    e.fill();
    e.fillStyle = "#3f7a22";
    e.fillRect(12, 20, 8, 6);
    e.fillRect(44, 20, 8, 6);
    eyes(e, 20, 24, 17, "#ffe14d");
    e.fillStyle = "#1a1a1a";
    e.fillRect(18, 40, 28, 8);
    e.fillStyle = "#fff";
    for (let x = 19; x < 45; x += 5) e.fillRect(x, 40, 3, 4);
    e.fillStyle = "#e02020";
    e.font = "bold 9px Impact, Arial";
    e.textAlign = "center";
    e.fillText("RATIO", 32, 62);
  }),
  // The Upsell Unicorn (Episode 2 boss): pink, horned, always offering an upgrade.
  upsell: M((e) => {
    e.fillStyle = "#ff8fd0";
    e.beginPath();
    e.ellipse(32, 38, 20, 22, 0, 0, Math.PI * 2);
    e.fill();
    e.fillStyle = "#ffd24a";
    e.beginPath();
    e.moveTo(28, 18);
    e.lineTo(32, 0);
    e.lineTo(36, 18);
    e.fill();
    e.fillStyle = "#8a2be2";
    e.fillRect(12, 20, 8, 20);
    eyes(e, 21, 30, 15);
    e.fillStyle = "#fff";
    e.fillRect(22, 44, 20, 6);
    e.fillStyle = "#b3001b";
    e.font = "bold 7px Arial";
    e.textAlign = "center";
    e.fillText("UPGRADE?", 32, 49);
  }),
  // The Mega-Influencer (Episode 3 boss): sunglasses, ring light, 40M followers.
  mega: M((e) => {
    e.strokeStyle = "#fff5c4";
    e.lineWidth = 6;
    e.beginPath();
    e.arc(32, 28, 26, 0, Math.PI * 2);
    e.stroke();
    e.fillStyle = "#f7c6a3";
    e.beginPath();
    e.ellipse(32, 30, 16, 19, 0, 0, Math.PI * 2);
    e.fill();
    e.fillStyle = "#f5d142";
    e.fillRect(15, 10, 34, 9);
    e.fillStyle = "#111";
    e.fillRect(18, 24, 12, 6);
    e.fillRect(34, 24, 12, 6);
    e.fillRect(30, 25, 4, 2);
    e.fillStyle = "#ff2d6f";
    e.fillRect(26, 38, 12, 4);
    e.fillStyle = "#111";
    e.fillRect(18, 52, 28, 9);
    e.fillStyle = "#fff";
    e.font = "bold 7px Arial";
    e.textAlign = "center";
    e.fillText("40M ♥", 32, 59);
  }),
  // The Shareholders: a suit with a stock chart for a head.
  final: M((e) => {
    e.fillStyle = "#1c1c24";
    e.fillRect(14, 30, 36, 34);
    e.fillRect(8, 32, 8, 26);
    e.fillRect(48, 32, 8, 26);
    e.fillStyle = "#fff";
    e.beginPath();
    e.moveTo(26, 30);
    e.lineTo(32, 42);
    e.lineTo(38, 30);
    e.fill();
    e.fillStyle = "#c0141c";
    e.fillRect(30, 32, 4, 18);
    e.fillStyle = "#0e3b1c";
    e.fillRect(12, 2, 40, 28);
    e.strokeStyle = "#39ff14";
    e.lineWidth = 3;
    e.beginPath();
    e.moveTo(15, 26);
    e.lineTo(24, 18);
    e.lineTo(30, 22);
    e.lineTo(38, 12);
    e.lineTo(48, 5);
    e.stroke();
    e.fillStyle = "#39ff14";
    e.beginPath();
    e.moveTo(49, 2);
    e.lineTo(50, 10);
    e.lineTo(43, 6);
    e.fill();
    eyes(e, 17, 8, 13);
  }),
  // The other player, in co-op.
  marine: M((e) => {
    e.fillStyle = "#3f6f2a";
    e.fillRect(20, 22, 24, 30);
    e.fillStyle = "#2d4f1e";
    e.fillRect(22, 52, 8, 12);
    e.fillRect(34, 52, 8, 12);
    e.fillStyle = "#4f8a34";
    e.fillRect(22, 6, 20, 18);
    e.fillStyle = "#9fe0ff";
    e.fillRect(25, 12, 14, 6);
    e.fillStyle = "#333";
    e.fillRect(40, 30, 14, 5);
  }),
  // A knocked-back enemy shot.
  shotBack: M((e) => {
    e.fillStyle = "#28e0ff";
    e.fillRect(24, 24, 16, 14);
    e.fillStyle = "#fff";
    e.fillRect(24, 24, 16, 3);
    e.fillRect(28, 30, 8, 2);
  }),
  // The AUTO-RIFLE 3000, lying on the floor.
  rifle: M((e) => {
    e.fillStyle = "#1c1c1c";
    e.fillRect(8, 44, 44, 6);
    e.fillRect(4, 45, 6, 3);
    e.fillStyle = "#3b3b3b";
    e.fillRect(22, 42, 18, 10);
    e.fillStyle = "#6b4226";
    e.fillRect(40, 46, 16, 8);
    e.fillStyle = "#111";
    e.fillRect(28, 52, 6, 9);
    e.fillStyle = "#39ff14";
    e.fillRect(24, 44, 3, 2);
    e.fillStyle = "#888";
    e.fillRect(8, 44, 14, 1);
  }),
});
he.final2 = recolour(he.final, [0, 2, 1]);
he.marine2 = recolour(he.marine, [2, 1, 0]);

// ================= The engine =================
const W = R, // screen width (320)
  H = de, // screen height (200)
  VIEW = b, // 3D view height (the status bar is below it)
  TEX = $, // texture size
  EXIT = ue; // grid value of an exit switch

// Weapons. The Ban Hammer (melee) hits twice as hard as the shotgun and knocks enemy shots back
// wherever you're looking; a knocked-back shot stuns whoever it hits.
const SHOTGUN_COOL = 0.8, // one shot, then the break-open reload
  RIFLE_COOL = 0.25, // 4 rounds a second while the trigger is held
  SWING = 0.34, // how long a hammer swing lasts
  MELEE_COOL = 0.45,
  MELEE_RANGE = 1.5,
  DEFLECT_WINDOW = 0.22, // how long after swinging a shot can still be knocked back
  DEFLECT_RANGE = 2,
  REFLECT_SPEED = 7.5,
  STUN = 3;

// Controls. Alone, player 1 also has the arrow keys and P. In co-op (split screen), player 2 gets them.
const SOLO = {
    fwd: ["KeyW", "ArrowUp", "touch-up"],
    back: ["KeyS", "ArrowDown", "touch-down"],
    left: ["KeyA"],
    right: ["KeyD"],
    turnL: ["KeyQ", "ArrowLeft", "touch-left"],
    turnR: ["KeyE", "ArrowRight", "touch-right"],
    fire: ["Space", "ControlLeft", "KeyF", "mouse", "touch-fire"],
    melee: ["KeyP", "KeyV", "AltLeft", "mouse2", "touch-melee"],
    run: ["ShiftLeft", "ShiftRight"],
  },
  P1 = {
    fwd: ["KeyW"],
    back: ["KeyS"],
    left: ["KeyA"],
    right: ["KeyD"],
    turnL: ["KeyQ"],
    turnR: ["KeyE"],
    fire: ["Space", "ControlLeft", "KeyF", "mouse"],
    melee: ["KeyV", "AltLeft", "mouse2"],
    run: ["ShiftLeft"],
  },
  P2 = {
    fwd: ["ArrowUp"],
    back: ["ArrowDown"],
    left: ["Comma"],
    right: ["Period"],
    turnL: ["ArrowLeft"],
    turnR: ["ArrowRight"],
    fire: ["ControlRight", "Enter", "NumpadEnter", "Numpad0"],
    melee: ["KeyP", "ShiftRight", "Slash", "Numpad1"],
    run: [],
  };
const GAME_KEYS = new Set([
  ...Object.values(SOLO).flat(),
  ...Object.values(P2).flat(),
  "Digit1",
  "Digit2",
  "KeyO",
].filter((k) => !k.startsWith("touch-") && !k.startsWith("mouse")));

const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const shotgunDamage = (depth) => (16 + Math.random() * 12) * (depth < 3 ? 1.5 : 1);
const rifleDamage = (depth) => (9 + Math.random() * 6) * (depth < 3 ? 1.2 : 1);

/** Blends a colour toward icy blue (stunned enemies). */
function frozen(c) {
  const r = c & 255,
    g = (c >> 8) & 255,
    bl = (c >> 16) & 255;
  return (0xff000000 | (Math.min(255, bl * 0.5 + 150) << 16) | (Math.min(255, g * 0.7 + 60) << 8) | ((r * 0.45) | 0)) >>> 0;
}

/**
 * Runs DOOMSCROLL in `canvas`. `levels` is the list of maps to play (one episode).
 * Callbacks: onHit() (the engine pauses: call resume()), onDeath(), onWin(stats), onSound(name), onKill().
 * Sounds: shotgun, rifle, swing, whack, deflect, stun, phase, plus the game's own names.
 * difficulty: { count, hp, dmg, speed } (see difficulty.js). coop: two players, split screen.
 */
export function createEngine(
  canvas,
  levels,
  { onHit, onDeath, onWin, onSound = () => {}, onKill = () => {}, difficulty = null, coop = !1 } = {},
) {
  let diff = { count: 1, hp: 1, dmg: 1, speed: 1, ...difficulty };
  // Each player's view is drawn at 320×200 off screen, then copied into place (side by side in co-op).
  const view = document.createElement("canvas");
  view.width = W;
  view.height = H;
  const ctx = view.getContext("2d"),
    out = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = !1;
  const frame = ctx.createImageData(W, VIEW),
    px = new Uint32Array(frame.data.buffer),
    zbuf = new Float64Array(W),
    parsed = [],
    skies = [],
    rifleLevel = levels.findIndex((l) => l.map.some((row) => row.includes("r")));
  let level, sky, grid, walls, players, pl, enemies, pickups, shots, run;
  const keys = new Set();
  let raf = 0,
    last = 0,
    paused = !0,
    turnBy = 0,
    switchedAt = 0,
    lastHurt = null;
  const held = (list) => list.some((k) => keys.has(k));
  const alive = () => players.filter((p) => !p.down);
  function size() {
    canvas.width = coop ? W * 2 : W;
    canvas.height = H;
    out.imageSmoothingEnabled = !1;
  }

  const makeEnemy = (type, x, y, from = null) => {
    const kind = Z[type],
      hpMult = kind.hits ? 1 : diff.hp; // the final boss counts hits, not health
    return {
      type,
      x,
      y,
      from,
      hp: kind.hp * hpMult,
      maxHp: kind.hp * hpMult,
      phase: 1,
      cool: 1 + Math.random(),
      flash: 0,
      stun: 0,
      shield: 0,
      awake: !!from,
      dead: !1,
      dieT: 0,
      wobble: Math.random() * 6,
      summonT: kind.summon?.every ?? 0,
    };
  };
  function makePlayer(n, start, fx, fy, carry, levelIndex) {
    const hasRifle = carry?.rifle ?? (rifleLevel >= 0 && levelIndex > rifleLevel);
    // Player 2 starts beside player 1 (on the first free side), not inside them.
    const side = n ? [[-fy, fx], [fy, -fx], [-fx, -fy]].find(([ox, oy]) => grid[(start.y + oy) | 0]?.[(start.x + ox) | 0] === 0) ?? [0.3, 0.3] : [0, 0];
    return {
      n,
      x: start.x + side[0] * 0.8,
      y: start.y + side[1] * 0.8,
      dx: fx,
      dy: fy,
      px: -fy * 0.66,
      py: fx * 0.66,
      hp: carry?.hp ?? 100,
      ammo: carry?.ammo ?? 30,
      hasRifle,
      weapon: hasRifle && carry?.weapon !== "shotgun" ? "rifle" : "shotgun",
      down: !1,
      cool: 0,
      flash: 0,
      hurt: 0,
      invuln: 0,
      bob: 0,
      recoil: 0,
      reload: 0, // shotgun reload animation, counting down
      shots: 0,
      sinceShot: 9,
      swing: 0, // hammer swing, counting down
      meleeCool: 0,
      deflect: 0,
      struck: !1, // this swing has landed (or missed) already
      whack: 0, // impact flash
      casings: [],
      keys: coop ? (n ? P2 : P1) : SOLO,
    };
  }

  function load(i = 0, carry = null) {
    level = levels[i];
    const d = parsed[i] ?? (parsed[i] = Ve(level));
    sky = skies[i] ?? (skies[i] = Ze(level));
    grid = d.grid;
    walls = d.tex;
    const [fx, fy] = Ce[level.face] ?? Ce.N,
      carries = Array.isArray(carry) ? carry : [carry, carry];
    players = Array.from({ length: coop ? 2 : 1 }, (_, n) => makePlayer(n, d.start, fx, fy, carries[n], i));
    pl = players[0];
    enemies = d.spawns.map(([t, x, y]) => makeEnemy(t, x, y));
    // More enemies: each normal one brings company, on a free tile next to it (bosses stay single).
    for (let n = 1; n < diff.count; n++)
      for (const [t, x, y] of d.spawns) {
        if (Z[t].name) continue;
        const spot = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].find(
          ([ox, oy]) => grid[(y + oy) | 0]?.[(x + ox) | 0] === 0 && !(((x + ox) | 0) === (d.start.x | 0) && ((y + oy) | 0) === (d.start.y | 0)),
        );
        enemies.push(makeEnemy(t, spot ? x + spot[0] : x + 0.3, spot ? y + spot[1] : y + 0.3));
      }
    pickups = d.pickups.map(([type, x, y]) => ({ type, x, y, taken: !1 }));
    shots = [];
    run = { level: i, kills: 0, total: enemies.length, ads: 0, seconds: 0, over: !1, boss: null, banner: 3.5, message: "", messageT: 0 };
  }

  const solid = (x, y) => grid[y | 0]?.[x | 0] !== 0;
  function clearLine(x1, y1, x2, y2) {
    const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 0.2);
    for (let n = 1; n < steps; n++) {
      const t = n / steps;
      if (solid(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t)) return !1;
    }
    return !0;
  }
  function turn(p, a) {
    const c = Math.cos(a),
      s = Math.sin(a);
    [p.dx, p.dy] = [p.dx * c - p.dy * s, p.dx * s + p.dy * c];
    [p.px, p.py] = [p.px * c - p.py * s, p.px * s + p.py * c];
  }
  function move(p, mx, my) {
    const nx = p.x + mx + Math.sign(mx) * 0.22,
      ny = p.y + my + Math.sign(my) * 0.22;
    if (grid[p.y | 0][nx | 0] === EXIT || grid[ny | 0][p.x | 0] === EXIT) return win();
    solid(nx, p.y) || (p.x += mx);
    solid(p.x, ny) || (p.y += my);
  }
  function say(text, time = 2.8) {
    run.message = text;
    run.messageT = time;
  }
  function hurt(p, amount) {
    if (p.invuln > 0 || p.down || run.over) return;
    p.hp -= amount;
    p.hurt = 0.3;
    run.ads += 1;
    lastHurt = p;
    onSound("error");
    if (p.hp <= 0) {
      p.hp = 0;
      if (alive().length > 1) {
        // Co-op: one player down, the other fights on (both back next level).
        p.down = !0;
        say(`PLAYER ${p.n + 1} IS DOWN`, 3);
        return;
      }
      p.down = !0;
      run.over = !0;
      paused = !0;
      render();
      onDeath?.();
      return;
    }
    paused = !0;
    render();
    onHit?.();
  }
  function win() {
    if (run.over) return;
    run.over = !0;
    paused = !0;
    onSound("levelup");
    render();
    const p1 = players[0];
    onWin?.({
      level: run.level,
      last: run.level === levels.length - 1,
      final: !!level.final,
      kills: run.kills,
      total: run.total,
      ads: run.ads,
      seconds: Math.round(run.seconds),
      hp: Math.ceil(p1.hp),
      ammo: p1.ammo,
      rifle: p1.hasRifle,
      weapon: p1.weapon,
      players: players.map((p) => ({ hp: Math.max(50, Math.ceil(p.hp)), ammo: p.ammo, rifle: p.hasRifle, weapon: p.weapon })),
    });
  }
  /** Where a map point lands on the current player's screen: column and depth, or null behind. */
  function project(x, y) {
    const rx = x - pl.x,
      ry = y - pl.y,
      inv = 1 / (pl.px * pl.dy - pl.dx * pl.py),
      tx = inv * (pl.dy * rx - pl.dx * ry),
      ty = inv * (-pl.py * rx + pl.px * ry);
    return ty <= 0.1 ? null : { col: (W / 2) * (1 + tx / ty), depth: ty };
  }
  function damage(e, amount, sound = "crit", melee = !1) {
    if (e.shield > 0) return; // the final boss, changing phase
    const kind = Z[e.type];
    if (kind.hits && !melee) {
      // Bullets (and knocked-back shots) bounce off: it takes the Ban Hammer.
      e.awake = !0;
      run.messageT < 0.5 && say("BULLETS BOUNCE OFF · USE THE BAN HAMMER", 1.6);
      return onSound("denied");
    }
    e.hp -= kind.hits ? 1 : amount;
    e.flash = 0.12;
    e.awake = !0;
    if (e.hp > 0) return onSound(sound);
    if (kind.phase2 && e.phase === 1) {
      // Phase 2: tougher, faster, angrier.
      e.phase = 2;
      e.hp = e.maxHp = kind.phase2;
      e.shield = 2;
      e.stun = 0;
      say("PHASE 2: THE EARNINGS CALL", 3.5);
      onSound("phase");
      return;
    }
    e.dead = !0;
    e.stun = 0;
    run.kills += 1;
    onSound("kaching");
    onKill();
    if (kind.final) {
      say("THE SHAREHOLDERS HAVE BEEN DIVESTED", 4);
      setTimeout(win, 1800);
    }
  }

  // ----- weapons (for player p)
  function setWeapon(p, w) {
    if (w === p.weapon || (w === "rifle" && !p.hasRifle)) return;
    p.weapon = w;
    p.cool = Math.max(p.cool, 0.2);
    p.reload = 0;
  }
  const nextWeapon = (p = players[0]) => p.hasRifle && setWeapon(p, p.weapon === "rifle" ? "shotgun" : "rifle");
  /** The nearest enemy under player p's crosshair (nudged sideways by `spread` pixels). */
  function aim(p, spread = 0) {
    const was = pl;
    pl = p;
    castWalls(!0);
    let best = null;
    for (const e of enemies) {
      if (e.dead) continue;
      const hit = project(e.x, e.y);
      if (!hit || hit.depth > zbuf[W / 2] + 0.3) continue;
      const half = (VIEW / hit.depth) * Z[e.type].scale * 0.32;
      Math.abs(hit.col - (W / 2 + spread)) < half + 2 && (!best || hit.depth < best.depth) && (best = { e, depth: hit.depth });
    }
    pl = was;
    return best;
  }
  function fire(p) {
    if (paused || run.over || p.down || p.cool > 0 || p.swing > 0) return;
    if (p.ammo <= 0) {
      p.cool = 0.4;
      onSound("denied");
      return;
    }
    const rifle = p.weapon === "rifle";
    p.ammo -= 1;
    p.shots += 1;
    p.sinceShot = 0;
    if (rifle) {
      p.cool = RIFLE_COOL;
      p.flash = 0.07;
      p.recoil = 0.4;
      p.casings.push({ x: 0, y: 0, vx: 70 + Math.random() * 40, vy: -80 - Math.random() * 40, t: 0 });
    } else {
      p.cool = SHOTGUN_COOL;
      p.reload = SHOTGUN_COOL;
      p.flash = 0.08;
      p.recoil = 1;
    }
    onSound(rifle ? "rifle" : "shotgun");
    const hit = aim(p, rifle ? (Math.random() - 0.5) * 8 : 0);
    hit && damage(hit.e, (rifle ? rifleDamage : shotgunDamage)(hit.depth));
  }
  function melee(p) {
    if (paused || run.over || p.down || p.meleeCool > 0) return;
    p.swing = SWING;
    p.meleeCool = MELEE_COOL;
    p.deflect = DEFLECT_WINDOW;
    p.struck = !1;
    onSound("swing");
  }
  /** The hammer lands: the nearest enemy in front of p, in reach, takes double shotgun damage. */
  function strike(p) {
    p.struck = !0;
    let best = null;
    for (const e of enemies) {
      if (e.dead) continue;
      const dx = e.x - p.x,
        dy = e.y - p.y,
        dist = Math.hypot(dx, dy);
      if (dist > MELEE_RANGE + Z[e.type].scale * 0.3) continue;
      if (dist > 0.3 && (dx * p.dx + dy * p.dy) / dist < Math.cos(0.75)) continue;
      if (!clearLine(p.x, p.y, e.x, e.y)) continue;
      (!best || dist < best.dist) && (best = { e, dist });
    }
    if (best) {
      damage(best.e, shotgunDamage(best.dist) * 2, "whack", !0);
      p.whack = 0.15;
    }
  }
  /** Knocks back any enemy shot in front of p, toward wherever p is looking. */
  function deflect(p) {
    for (const s of shots) {
      if (s.back) continue;
      const dx = s.x - p.x,
        dy = s.y - p.y,
        dist = Math.hypot(dx, dy);
      if (dist > DEFLECT_RANGE) continue;
      if (dist > 0.3 && (dx * p.dx + dy * p.dy) / dist < Math.cos(1.2)) continue;
      s.back = !0;
      s.vx = p.dx * REFLECT_SPEED;
      s.vy = p.dy * REFLECT_SPEED;
      s.x = p.x + p.dx * 0.45;
      s.y = p.y + p.dy * 0.45;
      p.whack = 0.15;
      onSound("deflect");
    }
  }

  // ----- one step of the game
  function tickPlayer(p, dt) {
    for (const k of ["cool", "flash", "hurt", "invuln", "reload", "swing", "meleeCool", "deflect", "whack"]) p[k] = Math.max(0, p[k] - dt);
    p.recoil = Math.max(0, p.recoil - dt * 4);
    p.sinceShot += dt;
    for (const c of p.casings) {
      c.t += dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.vy += 420 * dt;
    }
    p.casings = p.casings.filter((c) => c.t < 0.6);
    if (p.down) return;
    const k = p.keys,
      speed = 3 * (held(k.run) ? 1.5 : 1) * dt;
    let fwd = 0,
      side = 0,
      rot = 0;
    held(k.fwd) && (fwd += 1);
    held(k.back) && (fwd -= 1);
    held(k.right) && (side += 1);
    held(k.left) && (side -= 1);
    held(k.turnR) && (rot += 1);
    held(k.turnL) && (rot -= 1);
    rot && turn(p, rot * 2.6 * dt);
    if (p.n === 0 && turnBy) {
      turn(p, turnBy);
      turnBy = 0;
    }
    if (fwd || side) {
      move(p, (p.dx * fwd + (p.px / 0.66) * side) * speed, (p.dy * fwd + (p.py / 0.66) * side) * speed);
      p.bob += dt * 9;
    }
    if (run.over) return;
    held(k.melee) && melee(p);
    held(k.fire) && fire(p);
    if (p.swing > 0 && !p.struck && p.swing <= SWING * 0.6) strike(p);
    p.deflect > 0 && deflect(p);
    for (const it of pickups) {
      if (it.taken || Math.hypot(it.x - p.x, it.y - p.y) > 0.6 || (it.type === "health" && p.hp >= 100)) continue;
      it.taken = !0;
      if (it.type === "health") p.hp = Math.min(100, p.hp + 25);
      else if (it.type === "ammo") p.ammo += 12;
      else if (it.type === "rifle") {
        for (const q of players) (q.hasRifle = !0), setWeapon(q, "rifle");
        p.ammo += 20;
        say("YOU GOT THE AUTO-RIFLE 3000!  (switch guns: 2 / scroll" + (coop ? " · player 2: O" : "") + ")", 3.5);
        onSound("levelup");
        continue;
      }
      onSound("coin");
    }
  }
  function tick(dt) {
    run.seconds += dt;
    run.messageT = Math.max(0, run.messageT - dt);
    run.banner = Math.max(0, run.banner - dt);
    for (const p of players) {
      tickPlayer(p, dt);
      if (paused) return;
    }
    if (run.over) return;
    const targets = alive();
    for (const e of enemies) {
      if (e.dead) {
        e.dieT += dt;
        continue;
      }
      const kind = Z[e.type],
        fast = e.phase === 2 ? 1.5 : 1;
      e.flash = Math.max(0, e.flash - dt);
      e.shield = Math.max(0, e.shield - dt);
      if (e.stun > 0) {
        e.stun = Math.max(0, e.stun - dt); // seeing stars: no moving, shooting or summoning
        continue;
      }
      e.cool -= dt;
      // Chase the nearest player it can see (or just the nearest).
      let target = null,
        dist = 1 / 0,
        sees = !1;
      for (const p of targets) {
        const dd = Math.hypot(p.x - e.x, p.y - e.y),
          s = dd < 11 && clearLine(e.x, e.y, p.x, p.y);
        if ((s && !sees) || (s === sees && dd < dist)) (target = p), (dist = dd), (sees = s);
      }
      if (!target) continue;
      const tx = target.x - e.x,
        ty = target.y - e.y;
      !e.awake && sees && dist < (kind.ambush ?? 9) && (e.awake = !0);
      if (!e.awake) continue;
      kind.name && sees && !run.boss && ((run.boss = e), onSound("horn"));
      if (kind.summon && (e.summonT -= dt * fast) <= 0) {
        e.summonT = kind.summon.every;
        const room =
          enemies.filter((m) => m.from === e && !m.dead).length < kind.summon.max * (e.phase === 2 ? 2 : 1) &&
          [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ].find(([ox, oy]) => !solid(e.x + ox, e.y + oy));
        room && (enemies.push(makeEnemy(kind.summon.type, e.x + room[0], e.y + room[1], e)), (run.total += 1), onSound("popup"));
      }
      if (dist > (kind.melee ? 0.85 : 3.5)) {
        const step = kind.speed * diff.speed * fast * dt,
          mx = (tx / dist) * step,
          my = (ty / dist) * step;
        solid(e.x + mx + Math.sign(mx) * 0.3, e.y) || (e.x += mx);
        solid(e.x, e.y + my + Math.sign(my) * 0.3) || (e.y += my);
      }
      if (e.cool > 0) continue;
      if (kind.melee && dist < 1.05) {
        e.cool = kind.cool;
        hurt(target, kind.dmg * diff.dmg);
      } else if (kind.ranged && sees && dist < 10) {
        e.cool = (kind.cool + Math.random() * 0.6) / fast;
        const spread = (kind.spread ?? 0) + (e.phase === 2 ? 4 : 0),
          ang = Math.atan2(ty, tx),
          fan = spread ? Array.from({ length: spread }, (_, n) => (n - (spread - 1) / 2) * 0.18) : [(Math.random() - 0.5) * 0.12];
        for (const f of fan) shots.push({ x: e.x, y: e.y, vx: Math.cos(ang + f) * 4.5, vy: Math.sin(ang + f) * 4.5, dmg: kind.dmg * diff.dmg, back: !1 });
        onSound("popup");
      }
      if (paused) return;
    }

    for (const s of shots) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (solid(s.x, s.y)) {
        s.dead = !0;
        continue;
      }
      if (s.back) {
        // A knocked-back shot stuns (and hurts) the first enemy it meets.
        const e = enemies.find((m) => !m.dead && Math.hypot(m.x - s.x, m.y - s.y) < 0.35 + Z[m.type].scale * 0.25);
        if (e) {
          s.dead = !0;
          if (e.shield <= 0) {
            e.stun = STUN;
            onSound("stun");
          }
          damage(e, s.dmg);
        }
      } else {
        const p = targets.find((q) => Math.hypot(s.x - q.x, s.y - q.y) < 0.35);
        if (p) {
          s.dead = !0;
          hurt(p, s.dmg);
          if (paused) break;
        }
      }
    }
    shots = shots.filter((s) => !s.dead);
  }

  // ----- drawing
  function sprite(tex, x, y, scale, { flash = 0, dying = 0, lift = 0, stun = 0 } = {}) {
    const p = project(x, y);
    if (!p) return;
    const { depth } = p,
      col = p.col + (stun ? Math.sin(run.seconds * 30) * 1.5 : 0),
      size = (VIEW / depth) * scale,
      drop = ((VIEW / depth) * (1 - scale)) / 2 + lift / depth,
      squash = dying ? Math.max(0.15, 1 - dying * 2) : 1,
      h = size * squash,
      top = VIEW / 2 - size / 2 + drop + (size - h),
      left = col - size / 2,
      light = Math.max(0.3, 1 - depth / 14) * (dying ? 0.55 : 1) * (flash ? 2.2 : 1),
      x0 = Math.max(0, left | 0),
      x1 = Math.min(W - 1, (left + size) | 0),
      y0 = Math.max(0, top | 0),
      y1 = Math.min(VIEW - 1, (top + h) | 0);
    for (let sx = x0; sx <= x1; sx++) {
      if (depth >= zbuf[sx]) continue;
      const u = (((sx - left) / size) * TEX) | 0;
      if (u < 0 || u >= TEX) continue;
      for (let sy = y0; sy <= y1; sy++) {
        const v = (((sy - top) / h) * TEX) | 0;
        if (v < 0 || v >= TEX) continue;
        const c = tex[v * TEX + u];
        if (c >>> 24 < 128) continue;
        const lit = Oe(c, light);
        px[sy * W + sx] = stun ? frozen(lit) : lit;
      }
    }
    return { col, top, size, depth };
  }

  /** Casts the walls for the current player: fills zbuf (and the frame, unless onlyDepth). */
  function castWalls(onlyDepth = !1) {
    onlyDepth || px.set(sky);
    for (let x = 0; x < W; x++) {
      const cam = (2 * x) / W - 1,
        rx = pl.dx + pl.px * cam,
        ry = pl.dy + pl.py * cam;
      let mx = pl.x | 0,
        my = pl.y | 0;
      const ddx = Math.abs(1 / rx),
        ddy = Math.abs(1 / ry);
      let sx, sy, distX, distY;
      rx < 0 ? ((sx = -1), (distX = (pl.x - mx) * ddx)) : ((sx = 1), (distX = (mx + 1 - pl.x) * ddx));
      ry < 0 ? ((sy = -1), (distY = (pl.y - my) * ddy)) : ((sy = 1), (distY = (my + 1 - pl.y) * ddy));
      let side = 0;
      for (let n = 0; n < 200; n++) {
        distX < distY ? ((distX += ddx), (mx += sx), (side = 0)) : ((distY += ddy), (my += sy), (side = 1));
        if (grid[my]?.[mx] !== 0) break;
      }
      const dist = Math.max(0.05, side === 0 ? distX - ddx : distY - ddy);
      zbuf[x] = dist;
      if (onlyDepth) continue;
      const tall = VIEW / dist,
        y0 = Math.max(0, (VIEW / 2 - tall / 2) | 0),
        y1 = Math.min(VIEW - 1, (VIEW / 2 + tall / 2) | 0),
        tex = walls[my]?.[mx] ?? Ie[0];
      let hit = side === 0 ? pl.y + dist * ry : pl.x + dist * rx;
      hit -= Math.floor(hit);
      let u = (hit * TEX) | 0;
      ((side === 0 && rx < 0) || (side === 1 && ry > 0)) && (u = TEX - 1 - u);
      const step = TEX / tall;
      let v = (y0 - VIEW / 2 + tall / 2) * step;
      const light = Math.max(0.22, 1 - dist / 13) * (side ? 0.75 : 1);
      for (let y = y0; y <= y1; y++) {
        px[y * W + x] = Oe(tex[(v & (TEX - 1)) * TEX + u], light);
        v += step;
      }
    }
  }

  function render() {
    for (const p of players) {
      pl = p;
      renderView();
      out.drawImage(view, p.n * W, 0);
    }
    pl = players[0];
    coop && ((out.fillStyle = "#000"), out.fillRect(W - 1, 0, 2, H));
  }
  function renderView() {
    castWalls();
    const things = [
      ...pickups.filter((it) => !it.taken).map((it) => ({ tex: he[it.type], x: it.x, y: it.y, scale: 0.5, opts: {} })),
      ...enemies
        .filter((e) => !e.dead || e.dieT < 0.6)
        .map((e) => ({
          tex: he[e.type === "mimic" && !e.awake ? "mimicIdle" : e.type === "final" && e.phase === 2 ? "final2" : e.type],
          x: e.x,
          y: e.y,
          scale: Z[e.type].scale,
          opts: {
            flash: e.flash > 0 || e.shield > 0,
            dying: e.dead ? e.dieT : 0,
            stun: e.stun > 0,
            lift: Z[e.type].fly ? -30 - Math.sin(run.seconds * 5 + e.wobble) * 8 : 0,
          },
        })),
      ...players.filter((q) => q !== pl && !q.down && Math.hypot(q.x - pl.x, q.y - pl.y) > 0.5).map((q) => ({ tex: q.n ? he.marine2 : he.marine, x: q.x, y: q.y, scale: 0.8, opts: {} })),
      ...shots.map((s) => ({ tex: s.back ? he.shotBack : he.shot, x: s.x, y: s.y, scale: 0.6, opts: { lift: -20 } })),
    ].sort((a, c) => Math.hypot(c.x - pl.x, c.y - pl.y) - Math.hypot(a.x - pl.x, a.y - pl.y));
    const dazed = [];
    for (const t of things) {
      const box = sprite(t.tex, t.x, t.y, t.scale, t.opts);
      box && t.opts.stun && dazed.push(box);
    }
    ctx.putImageData(frame, 0, 0);
    pl.hurt > 0 && ((ctx.fillStyle = `rgba(200,0,0,${pl.hurt})`), ctx.fillRect(0, 0, W, VIEW));
    for (const d of dazed) stars(d);
    if (pl.down) {
      ctx.fillStyle = "rgba(90,0,0,0.55)";
      ctx.fillRect(0, 0, W, VIEW);
      ctx.fillStyle = "#fff";
      ctx.font = 'bold 12px "Courier New", monospace';
      ctx.textAlign = "center";
      ctx.fillText("YOU'RE DOWN · BACK NEXT LEVEL", W / 2, VIEW / 2);
    } else drawWeapons();
    drawHud();
    drawStatusBar();
  }

  /** Little stars circling a stunned enemy's head. */
  function stars({ col, top, size, depth }) {
    const r = Math.max(3, size * 0.28);
    ctx.fillStyle = "#ffe14d";
    for (let n = 0; n < 3; n++) {
      const a = run.seconds * 5 + (n * Math.PI * 2) / 3,
        x = col + Math.cos(a) * r,
        y = top - 2 + Math.sin(a) * r * 0.3;
      if (x < 0 || x >= W || y < 0 || y >= VIEW || zbuf[x | 0] < depth) continue;
      ctx.fillRect(x - 1, y, 3, 1);
      ctx.fillRect(x, y - 1, 1, 3);
    }
  }

  // ----- the weapons on screen, seen from behind: barrels run away from you toward the middle
  function drawWeapons() {
    const bobX = Math.sin(pl.bob) * 4,
      bobY = Math.abs(Math.cos(pl.bob)) * 3,
      swingT = pl.swing > 0 ? 1 - pl.swing / SWING : 0,
      duck = pl.swing > 0 ? Math.sin(swingT * Math.PI) * 60 : 0; // the gun ducks out of the way of the hammer
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, VIEW);
    ctx.clip();
    pl.weapon === "rifle" ? drawRifle(W / 2 + 24 + bobX, VIEW + 8 + bobY + duck) : drawShotgun(W / 2 + bobX, VIEW + bobY + duck);
    pl.swing > 0 && drawHammer(swingT);
    ctx.restore();
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillRect(W / 2 - 3, VIEW / 2, 2, 1);
    ctx.fillRect(W / 2 + 2, VIEW / 2, 2, 1);
    ctx.fillRect(W / 2, VIEW / 2 - 3, 1, 2);
    ctx.fillRect(W / 2, VIEW / 2 + 2, 1, 2);
  }
  function muzzleFlash(x, y, r) {
    const g = ctx.createRadialGradient(x, y, 1, x, y, r);
    g.addColorStop(0, "rgba(255,255,210,1)");
    g.addColorStop(0.45, "rgba(255,190,40,0.85)");
    g.addColorStop(1, "rgba(255,120,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  /** A quadrilateral: near edge (x0±w0/2, y0), far edge (x1±w1/2, y1). */
  function taper(x0, y0, w0, x1, y1, w1, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(x0 - w0 / 2, y0);
    ctx.lineTo(x1 - w1 / 2, y1);
    ctx.lineTo(x1 + w1 / 2, y1);
    ctx.lineTo(x0 + w0 / 2, y0);
    ctx.closePath();
    ctx.fill();
  }
  /** A gun barrel seen from behind: a dark tube narrowing away, a highlight, and its open end. */
  function barrel(x0, y0, w0, x1, y1, w1, light = "#6a6a6a") {
    taper(x0, y0, w0, x1, y1, w1, "#232323");
    taper(x0 - w0 * 0.22, y0, w0 * 0.18, x1 - w1 * 0.22, y1, w1 * 0.18, light);
    ctx.fillStyle = "#0a0a0a";
    ctx.beginPath();
    ctx.ellipse(x1, y1, w1 / 2, w1 / 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  function hand(x, y, w, h) {
    ctx.fillStyle = "#e0ac69";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#b9844a";
    ctx.fillRect(x, y + h - 3, w, 3);
    ctx.fillRect(x + w - 2, y, 2, h);
  }
  function shell(x, y) {
    ctx.fillStyle = "#c0392b";
    ctx.fillRect(x, y, 5, 10);
    ctx.fillStyle = "#e74c3c";
    ctx.fillRect(x, y, 2, 10);
    ctx.fillStyle = "#d4a017";
    ctx.fillRect(x, y + 8, 5, 3);
  }
  /**
   * The double-barrelled shotgun, from behind. After each shot it plays the classic reload: kick,
   * drop and break open, a hand thumbs in two shells, snap shut, back up.
   */
  function drawShotgun(cx, by) {
    const t = pl.reload > 0 ? 1 - pl.reload / SHOTGUN_COOL : 1,
      kick = t < 0.12 ? -8 * (1 - t / 0.12) : 0,
      lower = t < 0.12 ? 0 : t < 0.28 ? ease((t - 0.12) / 0.16) : t < 0.8 ? 1 : t < 0.96 ? 1 - ease((t - 0.8) / 0.16) : 0,
      open = t < 0.24 ? 0 : t < 0.34 ? ease((t - 0.24) / 0.1) : t < 0.68 ? 1 : t < 0.74 ? 1 - ease((t - 0.68) / 0.06) : 0;
    ctx.save();
    ctx.translate(cx - lower * 30, by + lower * 30 + kick + pl.recoil * 6);
    ctx.scale(1.4, 1.4);
    ctx.rotate(-lower * 0.5);
    // Barrels: they run from the bottom of the screen up toward the middle, getting narrower.
    // Broken open, they tip down and the breech faces you.
    const far = -62 + open * 34;
    if (pl.flash > 0 && t < 0.12) muzzleFlash(0, far - 4, 26);
    barrel(-11, -8, 20, -3.5, far, 7.5);
    barrel(11, -8, 20, 3.5, far, 7.5);
    if (open > 0.4) {
      const loaded = t > 0.56;
      ctx.fillStyle = "#8a6d1c";
      ctx.fillRect(-21, -18, 20, 14);
      ctx.fillRect(1, -18, 20, 14);
      ctx.fillStyle = loaded ? "#c0392b" : "#050505";
      ctx.beginPath();
      ctx.arc(-11, -11, 5.5, 0, Math.PI * 2);
      ctx.arc(11, -11, 5.5, 0, Math.PI * 2);
      ctx.fill();
      loaded && ((ctx.fillStyle = "#d4a017"), ctx.fillRect(-14, -13, 6, 2), ctx.fillRect(8, -13, 6, 2));
    }
    // wooden fore-end under the barrels, and the grip
    taper(0, 0, 50, 0, -30, 24, "#6b4226");
    taper(0, -2, 50, 0, -6, 44, "#4a2c18");
    taper(-8, -1, 8, -4, -28, 5, "#8a5a36");
    hand(14, -18, 22, 26);
    if (t > 0.3 && t < 0.72) {
      // the other hand, bringing in two fresh shells
      const h = (t - 0.3) / 0.42,
        reach = h < 0.5 ? ease(h / 0.5) : h < 0.65 ? 1 : 1 - ease((h - 0.65) / 0.35),
        hx = -90 + reach * 72,
        hy = 40 - reach * 52;
      if (h < 0.62) {
        shell(hx + 4, hy - 10);
        shell(hx + 12, hy - 9);
      }
      hand(hx, hy, 24, 26);
    } else hand(-36, -16, 22, 26);
    ctx.restore();
  }
  /** The AUTO-RIFLE 3000, from behind: muzzle flash, kick, a cycling bolt and flying brass. */
  function drawRifle(cx, by) {
    const firing = pl.sinceShot < 0.09,
      odd = pl.shots % 2,
      kick = firing ? 4 + odd * 2 : 0,
      jit = firing ? (odd ? 1 : -1) : 0;
    ctx.save();
    ctx.translate(cx + jit, by + kick + pl.recoil * 5);
    ctx.scale(1.25, 1.25);
    if (firing) {
      const fx = -16,
        fy = -82;
      muzzleFlash(fx, fy, odd ? 20 : 15);
      ctx.fillStyle = "#fff6c0";
      ctx.beginPath();
      const spikes = odd ? 5 : 4;
      for (let n = 0; n < spikes * 2; n++) {
        const a = (n * Math.PI) / spikes + (odd ? 0.3 : 0),
          r = n % 2 ? 3 : 10;
        ctx.lineTo(fx + Math.cos(a) * r, fy + Math.sin(a) * r);
      }
      ctx.fill();
    }
    // curved magazine, sticking out under the left side
    taper(-18, -2, 12, -14, -26, 10, "#151515");
    // stock and receiver near you, the handguard with its vents, then the barrel toward the middle
    taper(0, 2, 46, -6, -36, 30, "#2b2b2b");
    taper(0, 2, 10, -5, -36, 7, "#444");
    taper(-6, -34, 28, -12, -62, 17, "#3a3a3a");
    for (let n = 0; n < 4; n++) {
      const t = n / 4,
        y = -38 - t * 22,
        x = -6.5 - t * 6,
        w = 22 - t * 9;
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(x - w / 2 + 2, y, w - 4, 2);
    }
    barrel(-12, -60, 9, -16, -80, 5, "#555");
    // rear sight with its glowing dot, and the front sight post
    ctx.fillStyle = "#111";
    ctx.fillRect(-10, -42, 8, 5);
    ctx.fillRect(-17, -86, 2, 6);
    ctx.fillStyle = "#39ff14";
    ctx.fillRect(-7, -41, 2, 2);
    // the bolt handle cycles back with each shot
    ctx.fillStyle = "#777";
    ctx.fillRect(14 + (firing ? 5 : 0), -22, 9, 5);
    hand(-40, -60, 20, 20);
    hand(8, -10, 24, 26);
    ctx.restore();
    ctx.fillStyle = "#d4a017";
    for (const c of pl.casings) ctx.fillRect(cx + 30 + c.x, by - 30 + c.y, 4, 2);
  }
  /**
   * The Ban Hammer, only on screen while it swings: wind-up from the right, a hard sweep across the
   * middle, then it drops away.
   */
  function drawHammer(t) {
    // wind up (to 0.15), sweep across (hitting at ~0.4, over the crosshair), then drop away
    const angle = t < 0.15 ? 0.55 + ease(t / 0.15) * 0.3 : t < 0.42 ? 0.85 - ((t - 0.15) / 0.27) ** 1.6 * 1.75 : -0.9 - (t - 0.42) * 0.6,
      sink = t < 0.45 ? 0 : ease((t - 0.45) / 0.55) * 100,
      pivotX = W - 40,
      pivotY = VIEW + 36 + sink;
    const draw = (a, alpha) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(pivotX, pivotY);
      ctx.rotate(a);
      ctx.fillStyle = "#6b4226";
      ctx.fillRect(-4, -150, 8, 150);
      ctx.fillStyle = "#8a5a36";
      ctx.fillRect(-4, -150, 3, 150);
      ctx.fillStyle = "#2a2a2a";
      ctx.fillRect(-4, -40, 8, 22);
      ctx.fillStyle = "#5d6168";
      ctx.fillRect(-24, -172, 48, 28);
      ctx.fillStyle = "#8a8f97";
      ctx.fillRect(-24, -172, 48, 4);
      ctx.fillStyle = "#3a3d42";
      ctx.fillRect(-24, -148, 48, 4);
      ctx.fillStyle = "#e02020";
      ctx.font = 'bold 13px Impact, "Arial Black", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText("BAN", 0, -153);
      ctx.restore();
    };
    if (t > 0.15 && t < 0.5) {
      draw(angle + 0.28, 0.18);
      draw(angle + 0.14, 0.35);
    }
    draw(angle, 1);
    ctx.globalAlpha = 1;
    if (pl.whack > 0) {
      ctx.strokeStyle = `rgba(255,255,255,${pl.whack / 0.15})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let n = 0; n < 8; n++) {
        const a = (n * Math.PI) / 4,
          cx = W / 2,
          cy = VIEW / 2 + 8;
        ctx.moveTo(cx + Math.cos(a) * 6, cy + Math.sin(a) * 6);
        ctx.lineTo(cx + Math.cos(a) * 16, cy + Math.sin(a) * 16);
      }
      ctx.stroke();
    }
  }

  function drawHud() {
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = 'bold 7px "Courier New", monospace';
    ctx.fillText(coop ? `${level.id} · PLAYER ${pl.n + 1}` : level.id, 4, 10);
    // weapon slots
    ctx.textAlign = "right";
    const slot = (text, y, on, have) => {
      if (!have) return;
      ctx.fillStyle = on ? "#e8331f" : "rgba(255,255,255,0.5)";
      ctx.fillText(text, W - 4, y);
    };
    slot(coop && pl.n ? "O SHOTGUN" : "1 SHOTGUN", 10, pl.weapon === "shotgun", !0);
    slot(coop && pl.n ? "O AUTO-RIFLE" : "2 AUTO-RIFLE", 18, pl.weapon === "rifle", pl.hasRifle);
    const boss = run.boss;
    if (boss && !boss.dead) {
      const kind = Z[boss.type];
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(60, 4, 200, 16);
      ctx.fillStyle = "#4a0808";
      ctx.fillRect(62, 13, 196, 5);
      ctx.fillStyle = boss.shield > 0 ? "#ffe14d" : boss.phase === 2 ? "#ff7a00" : "#e02020";
      ctx.fillRect(62, 13, (196 * Math.max(0, boss.hp)) / boss.maxHp, 5);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 7px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(kind.hits ? `${kind.name} · PHASE ${boss.phase}/2 · ${boss.hp} HITS LEFT` : kind.name, W / 2, 11);
    }
    if (run.banner > 0) {
      ctx.globalAlpha = Math.min(1, run.banner);
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, 30, W, 30);
      ctx.textAlign = "center";
      ctx.fillStyle = "#b8b8b8";
      ctx.font = "7px Arial, sans-serif";
      ctx.fillText(level.final ? "THE FINAL BOSS" : level.banner ?? `LEVEL ${run.level + 1} OF ${levels.length}`, W / 2, 40);
      ctx.fillStyle = "#e8331f";
      ctx.font = 'bold 13px "Courier New", monospace';
      ctx.fillText(`${level.id}: ${level.name.toUpperCase()}`, W / 2, 54);
      ctx.globalAlpha = 1;
    }
    if (run.messageT > 0) {
      ctx.globalAlpha = Math.min(1, run.messageT);
      ctx.textAlign = "center";
      ctx.font = 'bold 8px "Courier New", monospace';
      ctx.fillStyle = "#000";
      ctx.fillText(run.message, W / 2 + 1, 75);
      ctx.fillStyle = "#ffe14d";
      ctx.fillText(run.message, W / 2, 74);
      ctx.globalAlpha = 1;
    }
  }
  function drawStatusBar() {
    ctx.fillStyle = "#3a3a3a";
    ctx.fillRect(0, VIEW, W, H - VIEW);
    ctx.fillStyle = "#5a5a5a";
    ctx.fillRect(0, VIEW, W, 1);
    ctx.fillStyle = "#1e1e1e";
    ctx.fillRect(0, H - 1, W, 1);
    const box = (x, w) => {
        ctx.fillStyle = "#2a2a2a";
        ctx.fillRect(x, VIEW + 3, w, 26);
        ctx.fillStyle = "#4c4c4c";
        ctx.fillRect(x, VIEW + 28, w, 1);
        ctx.fillRect(x + w - 1, VIEW + 3, 1, 26);
      },
      readout = (x, w, value, label) => {
        box(x, w);
        ctx.fillStyle = "#d3261e";
        ctx.font = 'bold 16px "Courier New", monospace';
        ctx.textAlign = "center";
        ctx.fillText(value, x + w / 2, VIEW + 20);
        ctx.fillStyle = "#b8b8b8";
        ctx.font = "6px Arial, sans-serif";
        ctx.fillText(label, x + w / 2, VIEW + 27);
      };
    readout(4, 56, String(pl.ammo), pl.weapon === "rifle" ? "AMMO · RIFLE" : "AMMO");
    readout(64, 64, `${Math.ceil(pl.hp)}%`, "HEALTH");
    box(132, 56);
    ctx.font = '20px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText(pl.down ? "😵" : pl.hurt > 0 ? "🙀" : pl.hp < 35 ? "😾" : "😼", 160, VIEW + 24);
    readout(192, 60, `${run.kills}/${run.total}`, "POP-UPS CLOSED");
    readout(256, 60, String(run.ads), "ADS WATCHED");
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1e3 || 0.016);
    last = now;
    if (!paused) {
      tick(dt);
      render();
    }
  }

  // ----- input
  const onKeyDown = (e) => {
      if (!GAME_KEYS.has(e.code)) return;
      e.preventDefault();
      keys.add(e.code);
      const p1 = players[0],
        p2 = players[1];
      e.code === "Digit1" && setWeapon(p1, "shotgun");
      e.code === "Digit2" && setWeapon(p1, "rifle");
      e.code === "KeyO" && p2 && nextWeapon(p2);
    },
    onKeyUp = (e) => {
      e.code === "AltLeft" && e.preventDefault(); // (Alt on its own would open the browser's menu bar)
      keys.delete(e.code);
    },
    onMouseMove = (e) => {
      document.pointerLockElement === canvas && (turnBy += e.movementX * 0.0028);
    },
    onMouseDown = (e) => {
      if (e.button === 2) return keys.add("mouse2");
      if (e.button !== 0) return;
      document.pointerLockElement !== canvas && !paused && canvas.requestPointerLock?.()?.catch?.(() => {});
      keys.add("mouse");
    },
    onMouseUp = (e) => keys.delete(e.button === 2 ? "mouse2" : "mouse"),
    onMenu = (e) => e.preventDefault(),
    onWheel = (e) => {
      if (paused) return;
      e.preventDefault();
      const now = performance.now();
      now - switchedAt > 180 && ((switchedAt = now), nextWeapon(players[0]));
    },
    onBlur = () => keys.clear();
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("mousedown", onMouseDown);
  canvas.addEventListener("contextmenu", onMenu);
  canvas.addEventListener("wheel", onWheel, { passive: !1 });
  window.addEventListener("mouseup", onMouseUp);
  window.addEventListener("blur", onBlur);
  size();
  load();
  render();
  raf = requestAnimationFrame(loop);

  return {
    /** Starts level i. carry: what player 1 (or, as an array, each player) starts with. */
    start(i = 0, carry = null) {
      load(Math.max(0, Math.min(levels.length - 1, i)), carry);
      paused = !1;
      last = performance.now();
    },
    resume() {
      if (run.over) return;
      (lastHurt ?? pl).invuln = 1.5;
      paused = !1;
      last = performance.now();
    },
    pause() {
      paused = !0;
      keys.clear();
    },
    /** On-screen buttons: up, down, left, right, fire, melee. */
    press(name, down) {
      down ? keys.add(`touch-${name}`) : keys.delete(`touch-${name}`);
    },
    nextWeapon: () => nextWeapon(players[0]),
    setWeapon: (w) => setWeapon(players[0], w),
    /** Takes effect from the next level started. */
    setDifficulty(d) {
      diff = { count: 1, hp: 1, dmg: 1, speed: 1, ...d };
    },
    /** Two players, split screen (takes effect from the next level started). */
    setCoop(on) {
      coop = !!on;
      size();
    },
    get coop() {
      return coop;
    },
    get stats() {
      return { ...run, hp: players[0].hp, ammo: players[0].ammo, rifle: players[0].hasRifle, weapon: players[0].weapon };
    },
    get debug() {
      return {
        player: players[0],
        players,
        enemies,
        shots,
        state: run,
        step(dt = 1 / 60) {
          paused || tick(dt);
          render();
        },
        win,
      };
    },
    destroy() {
      cancelAnimationFrame(raf);
      document.pointerLockElement === canvas && document.exitPointerLock?.();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("contextmenu", onMenu);
      canvas.removeEventListener("wheel", onWheel);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("blur", onBlur);
    },
  };
}
