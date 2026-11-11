// The cutaway DC motor, built for any camera (azimuth, elevation) and any disassembly progress t (0..1).
// Runs in Node (build check) and in the browser (inlined into js/motor-anatomy.js by build.mjs).
import * as k from "./kit/iso-kit.mjs";
import * as G from "./kit/lathe.mjs";
import * as T from "./kit/tube.mjs";

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;

// ---------- World (1 unit ~ 1.5 mm). Motor axis along +x at height AX. ----------
export const FIGURE = {
  W: 760, H: 470, AX: 54,
  CORE: { s0: -40, s1: 40, r: 22, slots: 12 },
  COMM: { s0: 48.5, s1: 58, r: 11, bars: 24 },
  SHAFT_R: 4.5,
  BRUSH_AT: [60 * DEG, 240 * DEG],
  // Camera range in which the cut window faces the viewer and the painter's order below holds.
  AZIMUTH: [15, 80], ELEVATION: [12, 58],
};
const { W, H, AX, CORE, COMM, SHAFT_R, BRUSH_AT } = FIGURE;
const YOKE = { s0: -60, s1: 60, rIn: 30, rOut: 35 };
const CUT = { a0: 115 * DEG, a1: 350 * DEG }; // material kept from 115° to 350°: the front-top is cut away
// Magnets end 22.2 from the rotor's lift line (60°), so the 22-radius rotor lifts out between them.
const MAGNETS = [{ part: "magnetN", a0: 128 * DEG, a1: 188 * DEG }, { part: "magnetS", a0: 290 * DEG, a1: 350 * DEG }];
const MAG = { s0: -42, s1: 42, rIn: 24, rOut: 30 };
const BELL_R = 39;
const RING = { s0: 44, s1: 47, rIn: 24, rOut: 28.5 };
const PLATE = { x: -126, y: -50, w: 222, d: 126, r: 8 };
const BLOCK = { x: 6, y: 52, w: 56, d: 18, r: 2 };
const POSTS = [[20, 61], [48, 61]];
const LIFT = [0, Math.cos(60 * DEG), Math.sin(60 * DEG)];

// Disassembly: each assembly's window in t, and how far it travels.
export const STAGES = {
  leads: [0, 0.25],
  pulley: [0, 0.3],
  near: [0, 0.4],
  far: [0.15, 0.45],
  gear: [0.4, 0.65],
  rotor: [0.66, 1],
};
const TRAVEL = { pulley: [-40, 0, 0], far: [-34, 0, 0], near: [56, 0, 0], gear: [36, 0, 0], rotor: G.mul3(LIFT, 64) };
const ease = (x) => x * x * (3 - 2 * x);
export const shareOf = (t, [a, b]) => ease(Math.max(0, Math.min(1, (t - a) / (b - a))));

export function buildFigure({ azimuth = 50, elevation = 30, t = 0 } = {}) {
  const share = Object.fromEntries(Object.entries(STAGES).map(([name, win]) => [name, shareOf(t, win)]));
  const off = Object.fromEntries(Object.entries(TRAVEL).map(([name, v]) => [name, G.mul3(v, share[name])]));
  const F = G.frameOf([0, 0, AX], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  const frameFor = (name) => (name ? G.frameOf(G.add3(F.o, off[name]), F.a, F.u, F.v) : F);
  const FR = frameFor("rotor"), FG = frameFor("gear"), FN = frameFor("near"), FF = frameFor("far"), FP = frameFor("pulley");

  // Fit the whole motor in its current pose, so the view pulls back smoothly as it comes apart.
  const box = (x0, x1, r, o = [0, 0, 0]) => [x0, x1].flatMap((x) => [[-r, -r], [r, -r], [-r, r], [r, r]].map(([y, z]) => G.add3([x, y, AX + z], o)));
  const fit = [
    ...k.boxCorners(PLATE, -16, 0), ...box(-60, 60, 35), ...box(-77, -60, BELL_R, off.far), ...box(-108, -88, 15, off.pulley),
    ...box(60, 72, BELL_R, off.near), ...box(44, 57, 28.5, off.gear), ...box(-90, 77, 22, off.rotor),
  ];
  const P = k.fitProjection(fit, W, H, { pad: 18, azimuth, elevation });
  const V = G.viewOf(P);
  const PHI = Math.atan2(G.dot3(V, F.v), G.dot3(V, F.u)); // view direction angle in the motor's cross-section
  const facing = (angle) => Math.cos(angle - PHI);
  const at = (s, r, a, Fx = F) => G.pointOf(Fx, s, r, a);
  const flat = (p) => k.iso(p, P);
  const S = (paths, style) => k.solidSvg(paths, style);
  const Ln = (d, style) => k.lineSvg(d, style);
  const Dt = (points, style) => k.dotsSvg(points, style);
  const depth = (p) => G.dot3(p, V);

  // Painter's order: items sorted by layer. An assembly slid fully out along the axis is x-disjoint from
  // everything behind it, and a view ray only ever moves toward +x, so it is drawn after all of them.
  const items = [];
  let seq = 0;
  const lift = { gear: 100, near: 200 };
  const put = (layer, part, svg, { key = seq, of = null } = {}) => {
    if (!svg) return;
    const shifted = of && lift[of] && share[of] >= 1 ? layer + lift[of] : layer;
    items.push({ layer: shifted, part, svg, key, n: seq++ });
  };

  // ---------- Custom solids: an annular sector of a tube along the motor axis ----------
  const emptyPaths = () => ({ fill: "", outline: "", crease: "", top: "", shades: ["", "", "", ""], seamless: true });
  const bucketPush = (paths, tone, d) => { if (tone >= 4) paths.top += d; else paths.shades[tone] += d; };
  function faceSolid(points3, normal) {
    const d = k.pathOf(points3.map(flat), true);
    const paths = emptyPaths();
    paths.fill = d;
    paths.outline = d;
    paths.seamless = false;
    bucketPush(paths, G.toneOf(normal, P), d);
    return paths;
  }
  function curvedSolid(Fx, s0, s1, r, lo, hi, sign) {
    const n = Math.max(2, Math.ceil((hi - lo) / (1.2 * DEG)));
    const ts = Array.from({ length: n + 1 }, (_, j) => lo + ((hi - lo) * j) / n);
    const near = ts.map((a) => flat(at(s0, r, a, Fx)));
    const far = ts.map((a) => flat(at(s1, r, a, Fx)));
    const region = k.pathOf([...near, ...far.slice().reverse()], true);
    const paths = emptyPaths();
    paths.fill = region;
    paths.outline = region;
    let start = 0;
    const toneAt = (j) => G.toneOf(G.mul3(G.radialOf(Fx, (ts[j] + ts[j + 1]) / 2), sign), P);
    for (let j = 1; j <= n; j++) {
      if (j < n && toneAt(j) === toneAt(start)) continue;
      bucketPush(paths, toneAt(start), k.pathOf([...near.slice(start, j + 1), ...far.slice(start, j + 1).reverse()], true));
      start = j;
    }
    return paths;
  }
  function within(a0, a1, c0, c1) {
    const out = [];
    for (let turn = -2; turn <= 2; turn++) {
      const lo = Math.max(a0, c0 + turn * TAU), hi = Math.min(a1, c1 + turn * TAU);
      if (hi - lo > 1e-4) out.push([lo, hi]);
    }
    return out;
  }
  // The visible faces of a sector as { kind, mid, paths }.
  function sector({ s0, s1, rIn, rOut, a0, a1, caps = [false, true], cuts = [true, true], Fx = F }) {
    const out = [];
    for (const [lo, hi] of within(a0, a1, PHI - Math.PI / 2, PHI + Math.PI / 2))
      out.push({ kind: "outer", mid: (lo + hi) / 2, paths: curvedSolid(Fx, s0, s1, rOut, lo, hi, 1) });
    if (rIn > 0)
      for (const [lo, hi] of within(a0, a1, PHI + Math.PI / 2, PHI + 1.5 * Math.PI))
        out.push({ kind: "inner", mid: (lo + hi) / 2, paths: curvedSolid(Fx, s0, s1, rIn, lo, hi, -1) });
    const faces = [[a0, G.mul3(G.tangentOf(Fx, a0), -1), cuts[0]], [a1, G.tangentOf(Fx, a1), cuts[1]]];
    for (const [a, normal, keep] of faces) {
      if (!keep || G.dot3(normal, V) <= 1e-6) continue;
      out.push({ kind: "cut", mid: a, paths: faceSolid([at(s0, rIn, a, Fx), at(s0, rOut, a, Fx), at(s1, rOut, a, Fx), at(s1, rIn, a, Fx)], normal) });
    }
    [[s0, G.mul3(Fx.a, -1)], [s1, Fx.a]].forEach(([s, normal], index) => {
      if (!caps[index] || G.dot3(normal, V) <= 1e-6) return;
      const n = Math.max(4, Math.ceil((a1 - a0) / (2 * DEG)));
      const arc = (r) => Array.from({ length: n + 1 }, (_, j) => at(s, r, a0 + ((a1 - a0) * j) / n, Fx));
      const ring = [...arc(rOut), ...(rIn > 0 ? arc(rIn).reverse() : [at(s, 0, 0, Fx)])];
      out.push({ kind: "cap", mid: (a0 + a1) / 2, paths: faceSolid(ring, normal) });
    });
    return out;
  }
  const frontish = (piece) => piece.kind !== "inner" && facing(piece.mid) > 0.3;
  const cutClass = (p) => (p.kind === "cut" ? "ma-cut" : undefined);
  // Box in the motor's cross-section at angle `a`: radial r0..r1, tangential ±w, axial s0..s1.
  const radialBox = (Fx, a, r0, r1, w, s0, s1) =>
    G.prismOf({ o: Fx.o, a: Fx.a, u: G.radialOf(Fx, a), v: G.tangentOf(Fx, a) }, [[r0, -w], [r1, -w], [r1, w], [r0, w]], s0, s1, P);
  // Helix along any direction, split into back and front halves.
  function helix(base, dir, length, radius, turns) {
    const HF = G.frameAlong(base, dir);
    const n = Math.ceil(turns * 28);
    const back = [], front = [];
    let run = [], side = null;
    for (let j = 0; j <= n; j++) {
      const ang = (j / n) * turns * TAU;
      const p = G.pointOf(HF, (j / n) * length, radius, ang);
      const s = G.dot3(G.radialOf(HF, ang), V) >= 0;
      if (side !== null && s !== side) { (side ? front : back).push(k.pathOf([...run, flat(p)])); run = []; }
      side = s;
      run.push(flat(p));
    }
    if (run.length > 1) (side ? front : back).push(k.pathOf(run));
    return { back: back.join(""), front: front.join("") };
  }
  // sidesOnly: the piece overlays another piece of the same shaft, so only its two silhouette lines are drawn.
  const shaft = (s0, s1, layer, extra = "", sidesOnly = false) => {
    if (s1 - s0 <= 0.05) return;
    const paths = G.disc(s0, s1, SHAFT_R, FR, P);
    if (sidesOnly) paths.outline = paths.crease = [PHI - Math.PI / 2, PHI + Math.PI / 2].map((a) => k.pathOf([flat(at(s0, SHAFT_R, a, FR)), flat(at(s1, SHAFT_R, a, FR))])).join("");
    put(layer, "shaft", S(paths, { tone: "hi" }) + extra, { of: "rotor" });
  };

  // ---------- Base plate, ruler, label plate ----------
  {
    const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -16, 10, P)}"/>`];
    const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
    for (const [x, y] of byDepth(k.corners(PLATE, 20))) {
      out.push(S(k.cylinder(x, y, 7, -16, 1.6, P, 28), { tone: "lo" }));
      out.push(S(k.cylinder(x, y, 5.4, -14.4, 4.4, P, 28), { tone: "mid" }));
    }
    out.push(S(k.slabOf(PLATE, -10, 10, P, 8, 1.6), { tone: "mid" }));
    out.push(Ln(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
    const screws = k.corners(PLATE, 10);
    out.push(Ln(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
    out.push(Dt(screws.map(([x, y]) => flat([x, y, 0])), { size: 0.5 }));
    const strip = { x: -112, y: PLATE.y + PLATE.d - 13, w: 104, d: 6, r: 1 };
    out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
    const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.6, 0.6, [1.8, 3.4], P);
    out.push(Ln(ticks.minor, { tone: "lo" }), Ln(ticks.major, { tone: "mid" }));
    out.push(Dt([flat([strip.x + 2, strip.y + 3, 0.6]), flat([strip.x + strip.w - 2, strip.y + 3, 0.6])], { size: 0.45 }));
    const label = { x: -116, y: -42, w: 34, d: 18, r: 1.5 };
    out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: "lo" }));
    out.push(Ln(k.planOutline(k.insetPlan(label, 1.6), 0.8, P), { tone: "faint" }));
    [[22, -37.5], [16, -33.5], [26, -29.5]].forEach(([len, y]) => out.push(Ln(k.lineOnTop([label.x + 4, y], [label.x + 4 + len, y], 0.8, P), { tone: "lo", free: true })));
    out.push(Dt([flat([label.x + label.w - 3, label.y + 3, 0.8]), flat([label.x + label.w - 3, label.y + label.d - 3, 0.8])], { size: 0.45 }));
    put(0, "base", out.join(""));
  }

  // Motor feet: cast trapezoid webs on flanges, bolted down with hex bolts.
  const footTop = AX - Math.sqrt(YOKE.rOut ** 2 - 13 ** 2) + 0.6;
  const FX = G.frameOf([0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  for (const x of [-44, 30].sort((a, b) => a - b)) {
    const out = [];
    const flange = { x: x - 3, y: -34, w: 20, d: 68, r: 2 };
    out.push(`<path class="iso-halo" d="${k.haloOf(flange, 0, 2, P)}" style="filter:blur(5px)"/>`);
    out.push(S(k.slabOf(flange, 0, 3, P, 3, 0.5), { tone: "mid" }));
    out.push(S(G.prismOf(FX, [[-27, 3], [27, 3], [13, footTop], [-13, footTop]], x + 1, x + 13, P), { tone: "mid" }));
    for (const y of [-28, 28].sort((a, b) => k.depthOf([0, a, 0], P) - k.depthOf([0, b, 0], P))) {
      out.push(S(k.cylinder(x + 7, y, 3.2, 3, 0.8, P, 20), { tone: "lo" }));
      out.push(S(k.cylinder(x + 7, y, 2.6, 3.8, 2.4, P, 6), { tone: "mid" }));
    }
    put(0, "feet", out.join(""));
  }

  // ---------- Drive pulley, then the shaft beyond the far bearing boss ----------
  const pulley = [[-108, 15], [-106.5, 15], [-105, 12.6], [-103.5, 15], [-102, 15], [-100.5, 12.6], [-99, 15], [-97.5, 15], [-97.5, 8], [-92, 8]];
  put(1, "pulley", S(G.solidOf(pulley, FP, P), { tone: "mid" }) + `<g data-rot="pulley"></g>`);
  // Shaft pieces in the rotor's frame (s is along the axis). Hidden stretches inside a hub are not drawn.
  const dFar = -off.far[0], dPul = -off.pulley[0], dNear = off.near[0];
  shaft(Math.max(-90, -88 - dPul), -77 - dFar, 1.5);

  // ---------- Far end bell with bearing boss ----------
  put(2, "bells", S(G.disc(-77, -68, 15, FF, P), { tone: "mid", inner: Ln(G.arcOf(FF, -72, 15, P), { tone: "faint" }) })
    + S(G.solidOf([[-68, BELL_R - 1.5], [-66.5, BELL_R], [-60, BELL_R]], FF, P), { tone: "mid", inner: Ln(G.arcOf(FF, -64, BELL_R, P), { tone: "faint" }) }));
  // Behind the yoke plane; once the far bell is off it runs on under the inner piece, so no joint shows at -60.
  if (dFar > 0) shaft(Math.max(-90, -60 - dFar), -46.4, 2.5);

  // ---------- Yoke and magnets: the pieces behind the rotor ----------
  const yoke = sector({ ...YOKE, a0: CUT.a0, a1: CUT.a1, caps: [false, false] });
  yoke.filter((p) => !frontish(p)).forEach((p) => put(3, "yoke", S(p.paths, { tone: "mid", className: cutClass(p) })));
  const magnets = MAGNETS.flatMap(({ part, a0, a1 }) => sector({ ...MAG, a0, a1, caps: [false, true] }).filter((p) => p.kind !== "outer").map((p) => ({ ...p, part })));
  magnets.filter((p) => !frontish(p)).forEach((p) => put(4, p.part, S(p.paths, { tone: "hi", crease: "lo", className: cutClass(p) })));

  // ---------- Brush gear: rocker ring (back half), posts ----------
  const ringBack = sector({ ...RING, Fx: FG, a0: PHI + Math.PI / 2, a1: PHI + 1.5 * Math.PI, caps: [false, true], cuts: [false, false] });
  const ringFront = sector({ ...RING, Fx: FG, a0: PHI - Math.PI / 2, a1: PHI + Math.PI / 2, caps: [false, true], cuts: [false, false] });
  const post = (a) => S(G.disc(RING.s1, 60, 1.6, G.frameAlong(at(0, 26.2, a, FG), F.a), P), { tone: "mid" });
  put(4.5, "rocker", ringBack.map((p) => S(p.paths, { tone: "mid" })).join("") + post(160 * DEG) + post(275 * DEG), { of: "gear" });

  // ---------- Rotor ----------
  shaft(-60, -46.4, 4.9, "", dFar > 0);
  put(5, "winding", S(G.lathe([[-46.4, 0], [-46.4, 13], [-46.2, 17.6, 1], [-45.2, 20.2, 1], [-43.6, 21.4, 1], [-40, 21.4], [-40, 0]], FR, P), { tone: "hi", lit: true }));
  {
    const laminations = [];
    for (let s = CORE.s0 + 4; s < CORE.s1; s += 4) laminations.push(G.arcOf(FR, s, CORE.r, P));
    put(6, "core", S(G.disc(CORE.s0, CORE.s1, CORE.r, FR, P), { tone: "hi", crease: "lo", inner: Ln(laminations.join(""), { tone: "faint" }) }) + `<g data-rot="core"></g>`);
  }
  put(7, "winding", S(G.lathe([[40, 0], [40, 21.4], [43.6, 21.4, 1], [45.2, 20.2, 1], [46.2, 17.6, 1], [46.4, 13], [46.4, 0]], FR, P), { tone: "hi", lit: true }) + `<g data-rot="winding"></g>`);
  put(8, "commutator", S(G.ringBand(46.4, COMM.s0, 6, 14.6, FR, P), { tone: "mid" }) + `<g data-rot="risers"></g>`);

  function brushGear(a, layer) {
    const out = [];
    out.push(S(radialBox(FG, a, COMM.r, 17, 2.6, 51.9, 56.1), { tone: "hi", crease: "lo", className: "ma-carbon" }));
    out.push(S(radialBox(FG, a, 13.6, 18.6, 3.6, 51, 57), { tone: "mid" }));
    const sp = helix(at(54, 18.6, a, FG), G.radialOf(F, a), 2.4, 1.5, 3.5);
    out.push(Ln(sp.back, { tone: "lo" }), Ln(sp.front, { tone: "mid" }));
    out.push(S(radialBox(FG, a, 21, 25, 3.2, RING.s1, 56.6), { tone: "mid" }));
    out.push(S(G.disc(0, 1.2, 1.6, G.frameAlong(at(53, 25, a, FG), G.radialOf(F, a)), P), { tone: "mid" }));
    const tan = G.tangentOf(F, a);
    const p0 = G.add3(at(54.5, 17.2, a, FG), G.mul3(tan, -2.9));
    const p1 = G.add3(at(54.5, 21, a, FG), G.mul3(tan, -3.4));
    out.push(k.wireSvg(flat(p0), flat(at(53, 26.2, a, FG)), { via: [flat(p1), flat(G.add3(at(54, 23.6, a, FG), G.mul3(tan, -3.8)))], tone: "mid", size: 0.5 }));
    out.push(`<g data-spark="${a > Math.PI ? 1 : 0}"></g>`);
    put(layer, "brushes", out.join(""), { of: "gear" });
  }
  brushGear(BRUSH_AT[1], 10);
  put(11, "commutator", S(G.disc(COMM.s0, COMM.s1, COMM.r, FR, P), { tone: "hi", crease: "lo", inner: Ln(G.arcOf(FR, COMM.s0 + 1.2, COMM.r, P) + G.arcOf(FR, COMM.s1 - 1.2, COMM.r, P), { tone: "faint" }) }) + `<g data-rot="commutator"></g>`);
  // A ring round the commutator is always nearer than it where they overlap on screen.
  put(11.5, "rocker", ringFront.map((p) => S(p.paths, { tone: "mid" })).join(""), { of: "gear" });
  const keyHere = 71.8 + dNear >= 77; // the stub beyond the bearing cap is gone once the bell slides past it
  shaft(COMM.s1, Math.min(77, 60 + dNear), 12, keyHere ? `<g data-rot="key"></g>` : "");
  brushGear(BRUSH_AT[0], 13);
  put(14, "rocker", post(345 * DEG), { of: "gear" });

  // ---------- In front of the rotor: yoke wall, magnet faces, nameplate ----------
  yoke.filter(frontish).forEach((p) => put(20, "yoke", S(p.paths, { tone: "mid", className: cutClass(p) })));
  magnets.filter(frontish).forEach((p) => put(20, p.part, S(p.paths, { tone: "hi", crease: "lo", className: cutClass(p) })));
  {
    const pts = [];
    const a0 = 318 * DEG, a1 = 346 * DEG, s0 = -26, s1 = 18, r = YOKE.rOut + 0.3, n = 14;
    for (let j = 0; j <= n; j++) pts.push(at(s0, r, a0 + ((a1 - a0) * j) / n));
    for (let j = n; j >= 0; j--) pts.push(at(s1, r, a0 + ((a1 - a0) * j) / n));
    const plate = k.pathOf(pts.map(flat), true);
    const rule = (s, len, a) => k.pathOf(Array.from({ length: 8 }, (_, j) => flat(at(s + (len * j) / 7, r, a))));
    const rules = [rule(-22, 26, 338 * DEG), rule(-22, 18, 333 * DEG), rule(-22, 32, 328 * DEG), rule(-22, 12, 323 * DEG)].join("");
    const rivets = [[-24, 343], [16, 343], [-24, 321], [16, 321]].map(([s, a]) => flat(at(s, r, a * DEG)));
    if (facing(332 * DEG) > 0.05)
      put(21, "nameplate", `<g class="iso-solid"><path class="iso-fill" d="${plate}"/><path class="iso-top" d="${plate}"/>${Ln(rules, { tone: "lo", free: true })}<path class="iso-line iso-edge" data-tone="mid" d="${plate}"/></g>${Dt(rivets, { size: 0.5 })}`);
  }

  // ---------- Near bell (cut like the yoke), tie rod, bearing hub ----------
  put(22, "bells", S(G.disc(-60, 60, 1.4, G.frameAlong(at(0, 37.2, 338 * DEG, FN), F.a), P), { tone: "mid" }), { of: "near" });
  const bell = sector({ s0: 60, s1: 68, rIn: 10, rOut: BELL_R, a0: CUT.a0, a1: CUT.a1, caps: [false, true], Fx: FN });
  bell.filter((p) => p.kind === "cut").forEach((p) => put(23, "bells", S(p.paths, { tone: "mid", className: "ma-cut" }), { of: "near" }));
  bell.filter((p) => p.kind === "outer").forEach((p) => put(24, "bells", S(p.paths, { tone: "mid" }), { of: "near" }));
  bell.filter((p) => p.kind === "cap").forEach((p) => {
    const ribs = [200, 270, 330].map((d) => k.pathOf([flat(at(68, 10, d * DEG, FN)), flat(at(68, BELL_R - 2.5, d * DEG, FN))])).join("");
    const rim = k.pathOf(Array.from({ length: 241 }, (_, j) => flat(at(68, BELL_R - 2.5, CUT.a0 + ((CUT.a1 - CUT.a0) * j) / 240, FN))));
    put(25, "bells", S(p.paths, { tone: "mid", inner: Ln(ribs, { tone: "faint" }) + Ln(rim, { tone: "faint" }) }), { of: "near" });
  });
  put(26, "bells", Dt([150, 205, 275, 335].map((d) => flat(at(68, 33, d * DEG, FN))), { size: 0.55 }) + S(G.disc(0, 1.6, 2.4, G.frameAlong(at(68, 37.2, 338 * DEG, FN), F.a), P, { steps: 6 }), { tone: "mid" }), { of: "near" });
  put(27, "bearing", S(G.disc(60, 69.5, 10, FN, P), { tone: "mid", inner: Ln(G.arcOf(FN, 68, 10, P), { tone: "faint" }) }), { of: "near" });
  put(28, "bearing", S(G.solidOf([[69.5, 7.2], [71.2, 7.2], [71.8, 6.4]], FN, P), { tone: "mid" }) + Dt([0, 120, 240].map((d) => flat(at(69.5, 8.7, (d + 30) * DEG, FN))), { size: 0.5 }), { of: "near" });
  if (!keyHere) shaft(71.8 + dNear, 77, 29, `<g data-rot="key"></g>`);

  // ---------- Terminal block with binding posts ----------
  {
    const out = [];
    out.push(`<path class="iso-halo" d="${k.haloOf(BLOCK, 0, 8, P)}" style="filter:blur(5px)"/>`);
    out.push(S(k.slabOf(BLOCK, 0, 8, P, 4, 0.6), { tone: "mid" }));
    out.push(Ln(k.planOutline(k.insetPlan(BLOCK, 2), 8, P, 4), { tone: "faint" }));
    out.push(Dt([[BLOCK.x + 3.5, BLOCK.y + BLOCK.d / 2], [BLOCK.x + BLOCK.w - 3.5, BLOCK.y + BLOCK.d / 2]].map(([x, y]) => flat([x, y, 8])), { size: 0.5 }));
    const [px, py] = POSTS[0], [nx, ny] = POSTS[1];
    out.push(Ln(k.lineOnTop([px + 6, py + 5], [px + 10, py + 5], 8, P) + k.lineOnTop([px + 8, py + 3], [px + 8, py + 7], 8, P), { tone: "hi", free: true }));
    out.push(Ln(k.lineOnTop([nx + 6, ny + 5], [nx + 10, ny + 5], 8, P), { tone: "hi", free: true }));
    for (const [x, y] of [...POSTS].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P))) {
      out.push(S(k.cylinder(x, y, 4.6, 8, 1, P, 28), { tone: "lo" }));
      out.push(S(k.cylinder(x, y, 3.6, 9, 2.6, P, 6), { tone: "mid" }));
      out.push(S(k.cylinder(x, y, 1.5, 11.6, 2, P, 16), { tone: "hi" }));
      out.push(S(k.cylinder(x, y, 3.4, 13.6, 4.4, P, 72), { tone: "mid" }));
      out.push(Ln(k.knurl(x, y, 3.4, 13.6, 18, 26, P, 0), { tone: "lo" }));
    }
    put(40, "terminals", out.join(""));
  }

  // ---------- Leads: unplugged and faded out first when the motor comes apart ----------
  if (share.leads < 1) {
    const fade = (svg) => (share.leads > 0 ? `<g opacity="${(1 - share.leads).toFixed(3)}">${svg}</g>` : svg);
    const routes = [
      [at(53, 26.2, BRUSH_AT[0]), at(52, 28.4, 56 * DEG), ...G.arcPoints(F, 51.5, 28.4, 52 * DEG, 24 * DEG, 10), at(51.5, 44, 24 * DEG), [44, 52, 46], [POSTS[0][0] + 4, POSTS[0][1], 30], [POSTS[0][0], POSTS[0][1], 24], [POSTS[0][0], POSTS[0][1], 18]],
      [at(53, 26.2, BRUSH_AT[1]), at(54.5, 28.4, 244 * DEG), ...G.arcPoints(F, 55, 28.4, 248 * DEG, 372 * DEG, 30), at(55, 44, 12 * DEG), [53, 54, 40], [POSTS[1][0], POSTS[1][1], 26], [POSTS[1][0], POSTS[1][1], 18]],
    ];
    routes.forEach((route) => {
      const pts = G.fillet(route, 3.2, 7, { P, tube: 0.75 });
      for (const piece of T.tubePieces(pts, 0.75, P, { maxLength: 10, caps: [true, true] })) {
        const m = piece.mid;
        const inside = Math.hypot(m[1], m[2] - AX) < YOKE.rIn && m[0] < 60;
        const behind = inside && facing(Math.atan2(m[2] - AX, m[1])) < 0.1;
        put(behind ? 9.5 : inside ? 15 : 30, "leads", fade(T.tubeSvg(piece, { tone: "mid" })), { key: depth(m) });
      }
      put(40.5, "leads", fade(Dt([flat(route[route.length - 1])], { size: 0.9, tone: "hi" })));
    });
  }

  // ---------- Assemble ----------
  const byKey = new Set([9.5, 15, 30]);
  items.sort((a, b) => a.layer - b.layer || (byKey.has(a.layer) ? a.key - b.key : a.n - b.n));
  const groups = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.part === item.part) last.svg += item.svg;
    else groups.push({ part: item.part, svg: item.svg });
  }
  const body = groups.map((g) => `<g data-part="${g.part}">${g.svg}</g>`).join("");
  const svg = k.figureSvg({
    width: W,
    height: H,
    label: "Motor de corriente continua de imanes permanentes en corte: carcasa, imanes, inducido laminado con devanado de cobre, colector, escobillas, rodamientos, polea y bornera sobre una placa base.",
    body,
  });
  return { svg, P, rotor: FR, share, items: items.length };
}
