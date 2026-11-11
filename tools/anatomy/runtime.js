// Runtime for the anatomy motor figure. Inlined by build.mjs after k, G, T (kit) and figure.mjs (buildFigure).
const PARTS = [
  { id: "yoke", name: "Carcasa / yugo del estator", desc: "Tubo de acero laminado en frío que sostiene los imanes y cierra el circuito magnético: el flujo sale del polo N, cruza el inducido, entra al polo S y regresa por la carcasa.", sim: "Sin carcasa el flujo se dispersa y B cae: el par τ = N·B·I·L·r baja en proporción." },
  { id: "magnetN", name: "Imán permanente · polo N", desc: "Segmento de ferrita (o neodimio) pegado a la carcasa. Su cara curva deja un entrehierro uniforme de ~2 mm con el inducido.", sim: "Fija el campo B del deslizador «Campo magnético»." },
  { id: "magnetS", name: "Imán permanente · polo S", desc: "Polo opuesto, enfrentado al N. Juntos crean un campo radial casi constante bajo cada polo, así el par no depende del ángulo.", sim: "Con B débil desaparece la contrafem: es el escenario «Sobrevelocidad»." },
  { id: "core", name: "Núcleo del inducido", desc: "Paquete de chapas de acero al silicio de 0,5 mm aisladas entre sí (las líneas finas) para cortar las corrientes de Foucault. Sus 12 ranuras alojan el bobinado.", sim: "Su radio es el brazo de palanca r del par." },
  { id: "winding", name: "Devanado del inducido", desc: "Hilo de cobre esmaltado en las ranuras; las cabezas de bobina asoman en cada extremo. Por él circula la corriente I que, dentro del campo B, recibe la fuerza de Lorentz F = B·I·L.", sim: "N vueltas y longitud L; se calienta por efecto Joule I²R (color)." },
  { id: "commutator", name: "Colector (conmutador)", desc: "24 delgas de cobre aisladas con mica. Cada par de delgas está soldado a una bobina por las «risers» (puntos). Invierte la corriente en cada bobina cada media vuelta para que el par siempre empuje en el mismo sentido.", sim: "Por encima de ~19 V salta arco entre delgas: chispas en las escobillas." },
  { id: "brushes", name: "Escobillas y portaescobillas", desc: "Bloques de carbón-grafito que rozan el colector, empujados por un muelle. La trenza de cobre (pigtail) lleva la corriente al borne del brazo.", sim: "Aquí entra la tensión V aplicada; las chispas aparecen con sobrevoltaje." },
  { id: "rocker", name: "Anillo portaescobillas", desc: "Anillo aislante sujeto a la tapa por tres columnas; sitúa las escobillas en la línea neutra, a 90° eléctricos de los polos, donde la conmutación es más limpia.", sim: "Escobillas a 60° y 240°: perpendiculares al eje N–S de los imanes." },
  { id: "shaft", name: "Eje", desc: "Eje de acero rectificado que atraviesa el núcleo y el colector y transmite el par a la polea.", sim: "Gira a la velocidad ω de las lecturas (rad/s y RPM)." },
  { id: "bearing", name: "Rodamiento y buje", desc: "Rodamiento de bolas alojado en el buje de la tapa, con tapa de grasa atornillada. Soporta el eje y su carga radial.", sim: "Por encima de ~3000 RPM se agarrotan: riesgo de sobrevelocidad." },
  { id: "bells", name: "Tapas (escudos) y tirante", desc: "Tapas de aluminio fundido con nervios; un tirante pasante las aprieta contra la carcasa. La delantera está cortada para ver el interior.", sim: "Estructura: no cambia la física del modelo." },
  { id: "pulley", name: "Polea de transmisión", desc: "Polea de dos gargantas en V con chaveta, en el lado de accionamiento. Entrega la potencia mecánica P = τ·ω a la carga.", sim: "Potencia mecánica de las lecturas." },
  { id: "leads", name: "Cables de alimentación", desc: "Conductores flexibles que llevan la corriente desde la bornera a cada brazo portaescobillas; el de la escobilla oculta rodea el interior de la carcasa. Son lo primero que se desconecta al desmontar.", sim: "Llevan la corriente I = (V − fem)/R." },
  { id: "terminals", name: "Bornera (+ / −)", desc: "Bloque aislante con dos bornes roscados y tuercas moleteadas. Invertir la polaridad invierte el sentido de giro.", sim: "Tensión V del deslizador «Voltaje»." },
  { id: "nameplate", name: "Placa de características", desc: "Datos nominales del fabricante: tensión, corriente, potencia y velocidad. Trabajar por encima de ellos dispara las alertas del simulador.", sim: "Régimen nominal = escenario «Nominal Seguro (12 V)»." },
  { id: "feet", name: "Patas y placa base", desc: "Patas de fundición atornilladas a la placa del banco de pruebas, que absorben la reacción del par.", sim: "La reacción al par τ aparece aquí." },
];
const ALIAS = { base: "feet" };
// The order a technician takes the motor apart, shown under the drawing while it opens (see STAGES).
const STEPS = [
  [0, "Montado"],
  [0.001, "1 · Desconectar cables, sacar la polea y la tapa delantera"],
  [0.4, "2 · Retirar el anillo portaescobillas con las escobillas"],
  [0.66, "3 · Extraer el inducido por la ventana del estator"],
  [1, "Despiece completo"],
];

const { W, H, CORE, COMM, SHAFT_R, BRUSH_AT, AZIMUTH, ELEVATION } = FIGURE;
const DEG = Math.PI / 180;
const HOME = { azimuth: 50, elevation: 30 };
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
let stage = null, svgEl = null, rot = {}, sparkEls = [], readoutEl = null, infoEl = null, listEl = null, toolEls = {};
let fig = null, theta = 0.35, visible = true, selected = null, hovered = null, lastText = "";
let cam = { ...HOME }, zoom = 1, pan = [0, 0];
let t = 0, target = 0, dirty = true, sparking = false;

function texturesAt(a) {
  const { P, rotor: F } = fig;
  const fade = [0.06, 0.5];
  const slots = [...G.ribsOf(F, CORE.s0, CORE.s1, CORE.r, CORE.slots, P, { phase: a - 4 * DEG, fade }), ...G.ribsOf(F, CORE.s0, CORE.s1, CORE.r, CORE.slots, P, { phase: a + 4 * DEG, fade })];
  const wind = [...G.ribsOf(F, 40, 43.6, 21.4, 30, P, { phase: a, twist: 0.42, fade: [0.1, 0.55], seams: "last" }), ...G.ribsOf(F, 40, 43.6, 21.4, 30, P, { phase: a + 0.1, twist: -0.42, fade: [0.1, 0.55] })];
  const bars = G.ribsOf(F, COMM.s0 + 1.2, COMM.s1 - 1.2, COMM.r, COMM.bars, P, { phase: a, fade });
  const end = G.pointOf(F, 77, 0, 0);
  const tip = G.pointOf(F, 77, SHAFT_R * 0.72, a);
  const FP = G.frameOf(G.add3(F.o, G.sub3([fig.pulleyX, 0, FIGURE.AX], F.o)), F.a, F.u, F.v);
  return {
    core: k.fadedSvg(slots, { tone: "mid" }),
    winding: k.fadedSvg(wind, { tone: "lo" }),
    risers: k.dotsSvg(G.dotsOf(F, 48.5, 12.8, COMM.bars, P, { phase: a + 7.5 * DEG, all: true }), { size: 0.5, tone: "mid" }),
    commutator: k.fadedSvg(bars, { tone: "lo" }),
    key: k.lineSvg(k.pathOf([k.iso(end, P), k.iso(tip, P)]), { tone: "mid", free: "end" }) + k.dotsSvg([k.iso(end, P)], { size: 0.45, tone: "mid" }),
    pulley: k.dotsSvg(G.dotsOf(FP, -95, 8, 2, P, { phase: a, fade: [0.04, 0.42] }), { size: 0.55, tone: "mid" }),
  };
}

function drawRotor() {
  const tex = texturesAt(theta);
  for (const name in rot) if (rot[name]) rot[name].innerHTML = tex[name] || "";
}

function sparksAt(on) {
  sparkEls.forEach((el, index) => {
    if (!on) { if (el.innerHTML) el.innerHTML = ""; return; }
    const [x, y] = k.iso(G.pointOf(fig.rotor, 54, COMM.r, BRUSH_AT[index]), fig.P);
    let d = "";
    const n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2, len = 3 + Math.random() * 6;
      const mx = x + Math.cos(ang) * len * 0.5 + (Math.random() - 0.5) * 2, my = y + Math.sin(ang) * len * 0.5 + (Math.random() - 0.5) * 2;
      d += `M${x.toFixed(1)} ${y.toFixed(1)}L${mx.toFixed(1)} ${my.toFixed(1)}L${(x + Math.cos(ang) * len).toFixed(1)} ${(y + Math.sin(ang) * len).toFixed(1)}`;
    }
    el.innerHTML = `<path class="ma-spark" d="${d}"/>`;
  });
}

function applyViewBox() {
  if (!svgEl) return;
  const w = W / zoom, h = H / zoom;
  pan = [clamp(pan[0], -W / 2, W / 2), clamp(pan[1], -H / 2, H / 2)];
  svgEl.setAttribute("viewBox", `${(W / 2 + pan[0] - w / 2).toFixed(2)} ${(H / 2 + pan[1] - h / 2).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}`);
}

function rebuild() {
  dirty = false;
  fig = buildFigure({ azimuth: cam.azimuth, elevation: cam.elevation, t });
  fig.pulleyX = -40 * fig.share.pulley; // the pulley's own offset, for its set-screw dot
  const heat = svgEl ? svgEl.style.getPropertyValue("--ma-heat") : "";
  stage.innerHTML = fig.svg;
  svgEl = stage.querySelector("svg");
  if (heat) svgEl.style.setProperty("--ma-heat", heat);
  rot = {};
  svgEl.querySelectorAll("[data-rot]").forEach((g) => { rot[g.dataset.rot] = g; });
  sparkEls = [...svgEl.querySelectorAll("[data-spark]")].sort((a, b) => a.dataset.spark - b.dataset.spark);
  sparking = false;
  applyViewBox();
  drawRotor();
  paintSelection();
  syncTools();
}

function paintSelection() {
  const show = hovered || selected;
  if (svgEl) {
    svgEl.toggleAttribute("data-focus", Boolean(show));
    svgEl.querySelectorAll("[data-part]").forEach((g) => g.toggleAttribute("data-on", (ALIAS[g.dataset.part] || g.dataset.part) === show));
  }
  if (listEl) listEl.querySelectorAll("[data-pick]").forEach((b) => { b.classList.toggle("active", b.dataset.pick === show); b.setAttribute("aria-pressed", String(b.dataset.pick === selected)); });
  if (infoEl) {
    const part = PARTS.find((p) => p.id === show);
    const index = PARTS.indexOf(part);
    infoEl.innerHTML = part
      ? `<span class="ma-num">${String(index + 1).padStart(2, "0")}</span><div><h4>${part.name}</h4><p>${part.desc}</p><p class="ma-sim"><b>En el simulador:</b> ${part.sim}</p></div>`
      : `<span class="ma-num">··</span><div><h4>Anatomía del motor</h4><p>Pasa el cursor sobre cualquier pieza, o elígela en la lista, para ver qué es y qué papel cumple; haz clic para fijarla. Arrastra para girar la cámara, usa la rueda para acercarte y pulsa «Desmontar» para ver cómo está construido.</p></div>`;
  }
}
function hover(id) { id = id ? ALIAS[id] || id : null; if (id !== hovered) { hovered = id; paintSelection(); } }
function pick(id) { id = id ? ALIAS[id] || id : null; selected = selected === id ? null : id; paintSelection(); }

function syncTools() {
  if (!toolEls.explode) return;
  const open = target > 0.5;
  toolEls.explode.textContent = open ? "Montar" : "Desmontar";
  toolEls.explode.setAttribute("aria-pressed", String(open));
  if (document.activeElement !== toolEls.slider) toolEls.slider.value = String(Math.round(t * 100));
  const step = [...STEPS].reverse().find(([from]) => t >= from);
  toolEls.step.textContent = step[1];
  toolEls.cam.textContent = `cámara ${Math.round(cam.azimuth)}° · ${Math.round(cam.elevation)}° · ${zoom.toFixed(1)}×`;
}

function toolbarHtml() {
  return `<button type="button" class="ma-tool ma-tool-main" data-tool="explode" aria-pressed="false">Desmontar</button>
<label class="ma-range"><span>Despiece</span><input type="range" min="0" max="100" value="0" data-tool="slider" aria-label="Grado de despiece"></label>
<span class="ma-tool-group"><button type="button" class="ma-tool" data-tool="zoomout" aria-label="Alejar">−</button><button type="button" class="ma-tool" data-tool="zoomin" aria-label="Acercar">+</button></span>
<button type="button" class="ma-tool" data-tool="home">Vista inicial</button>
<span class="ma-step" data-tool="step" aria-live="polite"></span>
<span class="ma-cam" data-tool="cam"></span>`;
}

function zoomAt(factor, sx = W / 2 + pan[0], sy = H / 2 + pan[1]) {
  // Keep the viewBox point under (sx, sy) fixed while zooming.
  const before = zoom;
  zoom = clamp(zoom * factor, 1, 6);
  const cx = W / 2 + pan[0], cy = H / 2 + pan[1];
  pan[0] += (sx - cx) * (1 - before / zoom);
  pan[1] += (sy - cy) * (1 - before / zoom);
  if (zoom === 1) pan = [0, 0];
  applyViewBox();
  syncTools();
}
function viewPoint(event) {
  const box = svgEl.getBoundingClientRect();
  const vb = svgEl.viewBox.baseVal;
  return [vb.x + ((event.clientX - box.left) / box.width) * vb.width, vb.y + ((event.clientY - box.top) / box.height) * vb.height];
}
function orbit(dAz, dEl) {
  cam.azimuth = clamp(cam.azimuth + dAz, AZIMUTH[0], AZIMUTH[1]);
  cam.elevation = clamp(cam.elevation + dEl, ELEVATION[0], ELEVATION[1]);
  dirty = true;
}
function goHome() { cam = { ...HOME }; zoom = 1; pan = [0, 0]; dirty = true; }
function setTarget(next) { target = clamp(next, 0, 1); if (still.matches) { t = target; dirty = true; } syncTools(); }

function bindPointer() {
  const pointers = new Map();
  let drag = null, pinch = 0;
  stage.addEventListener("contextmenu", (e) => e.preventDefault());
  stage.addEventListener("pointerdown", (e) => {
    pointers.set(e.pointerId, [e.clientX, e.clientY]);
    stage.setPointerCapture(e.pointerId);
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); drag = null; return; }
    drag = { x: e.clientX, y: e.clientY, moved: 0, mode: e.button === 2 || e.button === 1 || e.shiftKey ? "pan" : "orbit", target: e.target };
  });
  stage.addEventListener("pointermove", (e) => {
    if (!pointers.has(e.pointerId)) {
      if (e.pointerType === "mouse") { const g = e.target.closest && e.target.closest("[data-part]"); hover(g ? g.dataset.part : null); }
      return;
    }
    pointers.set(e.pointerId, [e.clientX, e.clientY]);
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (pinch) zoomAt(d / pinch);
      pinch = d;
      return;
    }
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.x = e.clientX; drag.y = e.clientY;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    if (drag.moved < 4) return;
    stage.classList.add("is-dragging");
    hover(null);
    if (drag.mode === "pan") {
      const box = svgEl.getBoundingClientRect();
      pan[0] -= (dx / box.width) * (W / zoom);
      pan[1] -= (dy / box.height) * (H / zoom);
      applyViewBox();
    } else orbit(-dx * 0.25, dy * 0.2);
  });
  const end = (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = 0;
    if (drag && drag.moved < 4 && e.type === "pointerup") { const g = drag.target.closest && drag.target.closest("[data-part]"); pick(g ? g.dataset.part : selected); }
    if (!pointers.size) { drag = null; stage.classList.remove("is-dragging"); syncTools(); }
  };
  stage.addEventListener("pointerup", end);
  stage.addEventListener("pointercancel", end);
  stage.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse" && !pointers.size) hover(null); });
  stage.addEventListener("wheel", (e) => { e.preventDefault(); const [x, y] = viewPoint(e); zoomAt(Math.exp(-e.deltaY * 0.0015), x, y); }, { passive: false });
  stage.addEventListener("dblclick", (e) => { e.preventDefault(); goHome(); });
  stage.addEventListener("keydown", (e) => {
    const keys = { ArrowLeft: () => orbit(5, 0), ArrowRight: () => orbit(-5, 0), ArrowUp: () => orbit(0, 4), ArrowDown: () => orbit(0, -4), "+": () => zoomAt(1.25), "=": () => zoomAt(1.25), "-": () => zoomAt(0.8), "0": goHome, d: () => setTarget(target > 0.5 ? 0 : 1) };
    const run = keys[e.key];
    if (!run) return;
    e.preventDefault();
    run();
  });
}

function mount({ stage: stageEl, list, info, readout, toolbar }) {
  stage = stageEl; readoutEl = readout; infoEl = info; listEl = list;
  stage.tabIndex = 0;
  stage.setAttribute("role", "application");
  stage.setAttribute("aria-label", "Motor DC en corte. Arrastra o usa las flechas para girar la cámara, rueda o + y − para acercar, Mayús+arrastrar para desplazar, D para desmontar, 0 para la vista inicial.");
  if (toolbar) {
    toolbar.innerHTML = toolbarHtml();
    toolbar.querySelectorAll("[data-tool]").forEach((el) => { toolEls[el.dataset.tool] = el; });
    toolEls.explode.addEventListener("click", () => setTarget(target > 0.5 ? 0 : 1));
    toolEls.slider.addEventListener("input", () => { target = t = Number(toolEls.slider.value) / 100; dirty = true; syncTools(); });
    toolEls.zoomin.addEventListener("click", () => zoomAt(1.3));
    toolEls.zoomout.addEventListener("click", () => zoomAt(1 / 1.3));
    toolEls.home.addEventListener("click", goHome);
  }
  if (list) {
    list.innerHTML = PARTS.map((p, i) => `<li><button type="button" data-pick="${p.id}" aria-pressed="false"><span>${String(i + 1).padStart(2, "0")}</span>${p.name}</button></li>`).join("");
    list.addEventListener("pointerover", (e) => { const b = e.target.closest("[data-pick]"); if (b) hover(b.dataset.pick); });
    list.addEventListener("pointerleave", () => hover(null));
    list.addEventListener("click", (e) => { const b = e.target.closest("[data-pick]"); if (b) pick(b.dataset.pick); });
    list.addEventListener("focusin", (e) => { const b = e.target.closest("[data-pick]"); if (b) hover(b.dataset.pick); });
    list.addEventListener("focusout", () => hover(null));
  }
  bindPointer();
  new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; }, { rootMargin: "80px 0px" }).observe(stage);
  rebuild();
}

function update(state, dt) {
  if (!stage || !visible) return;
  dt = Math.max(0, Math.min(dt || 0, 0.1));
  if (t !== target) {
    // About 3 s for the whole sequence; each assembly eases inside its own window (STAGES in figure.mjs).
    t = target > t ? Math.min(target, t + dt / 3) : Math.max(target, t - dt / 3);
    dirty = true;
  }
  if (dirty) rebuild();
  // Shown speed is compressed so the slots and commutator bars never strobe; the readout is the true speed.
  const shown = 7 * Math.tanh((state.omega || 0) / 120);
  if (!still.matches && shown > 0.001) { theta += shown * dt; drawRotor(); }
  const powered = state.running && !state.breakerTripped;
  const spark = t === 0 && powered && (state.voltage > 19 || state.current > 4.2) && !still.matches;
  if (spark || sparking) sparksAt(spark);
  sparking = spark;
  const heat = Math.max(0, Math.min(1, ((state.powerJouleLoss || 0) - 15) / 60));
  svgEl.style.setProperty("--ma-heat", (powered ? heat : heat * 0.5).toFixed(3));
  if (readoutEl) {
    const rpm = (state.omega || 0) * 60 / (2 * Math.PI);
    const text = `${Math.round(rpm)} rpm · ${(powered ? state.current : 0).toFixed(2)} A · τ ${(powered ? state.torque : 0).toFixed(3)} N·m`;
    if (text !== lastText) { readoutEl.textContent = text; lastText = text; }
  }
}

window.motorAnatomy = { mount, update, select: pick, explode: setTarget, camera: (azimuth, elevation) => { cam = { azimuth: clamp(azimuth, AZIMUTH[0], AZIMUTH[1]), elevation: clamp(elevation, ELEVATION[0], ELEVATION[1]) }; dirty = true; } };
