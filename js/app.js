/* =============================================
   ElectroSpin - Motor DC Simulator
   Logica de simulacion y animacion
   ============================================= */

'use strict';

/**
 * Obtencion de elementos SVG y DOM
 */
const coilPoly = document.getElementById('coilPoly');
const conductorFront = document.getElementById('conductorFront');
const conductorBack = document.getElementById('conductorBack');
const forceSymbolFront = document.getElementById('forceSymbolFront');
const forceSymbolBack = document.getElementById('forceSymbolBack');
const forceLabelFront = document.getElementById('forceLabelFront');
const forceLabelBack = document.getElementById('forceLabelBack');
const currentArrowFront = document.getElementById('currentArrowFront');
const currentArrowBack = document.getElementById('currentArrowBack');
const fieldLinesEl = document.getElementById('fieldLines');
const voltageLabelSVG = document.getElementById('voltageLabelSVG');
const rpmValueSVG = document.getElementById('rpmValueSVG');

const voltageSlider = document.getElementById('voltageSlider');
const resistanceSlider = document.getElementById('resistanceSlider');
const bFieldSlider = document.getElementById('bFieldSlider');
const lengthSlider = document.getElementById('lengthSlider');
const turnsSlider = document.getElementById('turnsSlider');
const radiusSlider = document.getElementById('radiusSlider');

const voltageValue = document.getElementById('voltageValue');
const resistanceValue = document.getElementById('resistanceValue');
const bFieldValue = document.getElementById('bFieldValue');
const lengthValue = document.getElementById('lengthValue');
const turnsValue = document.getElementById('turnsValue');
const radiusValue = document.getElementById('radiusValue');

const currentReading = document.getElementById('currentReading');
const forceReading = document.getElementById('forceReading');
const torqueReading = document.getElementById('torqueReading');
const omegaReading = document.getElementById('omegaReading');
const rpmReading = document.getElementById('rpmReading');
const powerReading = document.getElementById('powerReading');
const backEmfReading = document.getElementById('backEmfReading');
const efficiencyReading = document.getElementById('efficiencyReading');

/**
 * Estado de la simulacion
 */
const state = {
    voltage: 12,
    resistance: 5,
    bField: 0.5,
    length: 0.2,
    turns: 100,
    radius: 0.05,

    running: false,
    omega: 0,                // velocidad angular actual (rad/s)
    angle: 0,                // angulo de rotacion de la bobina (rad)
    targetOmega: 0,

    current: 0,
    force: 0,
    torque: 0,
    powerMechanical: 0,
    backEmf: 0,
    efficiency: 0,

    motorConstant: 0.035
};

/**
 * Constantes del modelo dinamico
 */
const PHYSICS = {
    omegaMax: 220,     // rad/s (limite de velocidad)
    friction: 0.9,     // resistencia al giro
    inertia: 0.006,    // kg·m2
};

/**
 * Geometria de la bobina en pantalla.
 * La bobina rota sobre el eje vertical central (punto C).
 * Cada conductor activo se ubica en una circunferencia de radio r:
 *   frente  -> (cx + r·cos θ, cz = +r·sin θ)
 *   detras  -> (cx - r·cos θ, cz = -r·sin θ)
 * Proyectamos solo X/Y: el ancho de la bobina se "achata" con cos θ
 * y los conductores avanzan/retroceden con sin θ (profundidad).
 */
const COIL = {
    cx: 300,
    cy: 255,
    r: 70,       // medio ancho (radio de giro de los conductores)
    h: 70        // media altura
};

/**
 * Modelo fisico del motor DC.
 *
 * 1) Back-EMF:  e_back = k * omega
 * 2) Corriente neta (Ley de Ohm con oposicion):
 *      I = (V - e_back) / R
 * 3) Fuerza de Lorentz sobre 2 conductores activos:
 *      F = 2 * N * B * I * L
 * 4) Torque:  tau = F * r
 * 5) Velocidad estacionaria aproximada:
 *      omega = V / (k * B)  (modelo educativo simplificado)
 */
function computePhysics() {
    const { voltage, resistance, bField, length, turns, radius, omega, motorConstant } = state;

    const backEmf = omega * motorConstant;
    let current = (voltage - backEmf) / resistance;
    if (current < 0) current = 0;

    const force = 2 * turns * bField * current * length;
    const torque = force * radius;

    let omegaTarget = 0;
    if (bField > 0.001 && voltage > 0) {
        omegaTarget = (voltage / (motorConstant * bField)) * 0.2;
    }

    const powerElectrical = voltage * current;
    const powerMechanical = torque * omega;
    const efficiency = powerElectrical > 0
        ? Math.max(0, Math.min(100, (powerMechanical / powerElectrical) * 100))
        : 0;

    return {
        backEmf,
        current,
        force,
        torque,
        omegaTarget: Math.min(omegaTarget, PHYSICS.omegaMax),
        powerElectrical,
        powerMechanical,
        efficiency
    };
}

function rpmLabel() {
    const rpm = (state.omega * 60) / (2 * Math.PI);
    return rpm.toFixed(0);
}

/**
 * Actualiza todas las lecturas e indicadores
 */
function updateReadings() {
    const p = computePhysics();

    currentReading.textContent = p.current.toFixed(2) + ' A';
    forceReading.textContent = p.force.toFixed(3) + ' N';
    torqueReading.textContent = p.torque.toFixed(4) + ' N\u00B7m';
    omegaReading.textContent = state.omega.toFixed(1) + ' rad/s';
    rpmReading.textContent = rpmLabel() + ' rpm';
    rpmValueSVG.textContent = rpmLabel();
    powerReading.textContent = p.powerElectrical.toFixed(2) + ' W';
    backEmfReading.textContent = p.backEmf.toFixed(2) + ' V';
    efficiencyReading.textContent = p.efficiency.toFixed(1) + ' %';

    voltageLabelSVG.textContent = state.voltage.toFixed(1) + ' V';

    state.current = p.current;
    state.force = p.force;
    state.torque = p.torque;
    state.backEmf = p.backEmf;
    state.powerMechanical = p.powerMechanical;
    state.efficiency = p.efficiency;
    state.targetOmega = p.omegaTarget;
}

/**
 * Ajusta opacidad y velocidad de las lineas de campo segun B
 */
function updateFieldLines() {
    const lines = fieldLinesEl.children;
    const normalized = Math.min(1, state.bField / 1.5);
    const baseOpacity = 0.25 + 0.5 * normalized;
    const duration = 2 / Math.max(normalized, 0.1);

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        line.style.opacity = baseOpacity * (0.75 + i * 0.12);

        const anims = line.getElementsByTagName('animate');
        for (const anim of anims) {
            anim.setAttribute('dur', duration + 's');
        }
    }
}

/**
 * Redibuja la bobina en su estado actual de rotacion.
 * - Proyeccion 3D -> 2D (los conductores recorren circunferencias).
 * - El conductor frontal se ve mas luminoso que el trasero.
 * - Los simbolos de fuerza (regla de la mano derecha) acompanan
 *   a cada conductor y cambian de color/con tamano segun |F|.
 * - El conmutador invierte la corriente cada media vuelta.
 */
function updateCoil() {
    const { cx, cy, r, h } = COIL;
    const cos = Math.cos(state.angle);
    const sin = Math.sin(state.angle);

    // Conductores en la tralectoria circular (frente y detras)
    const fX = cx + r * cos;
    const bX = cx - r * cos;
    const front = sin >= 0;          // el de la trayectoria +x esta al frente si sin>0
    const frontX = front ? fX : bX;
    const backX = front ? bX : fX;

    // Vertices proyectados del marco de la bobina
    const pts = [
        cx + r * cos, cy - h,
        cx - r * cos, cy - h,
        cx - r * cos, cy + h,
        cx + r * cos, cy + h
    ];
    coilPoly.setAttribute('points', pts.join(','));

    // Conductores (lineas verticales en su posicion proyectada)
    conductorFront.setAttribute('x1', frontX);
    conductorFront.setAttribute('x2', frontX);
    conductorFront.setAttribute('y1', cy - h);
    conductorFront.setAttribute('y2', cy + h);

    conductorBack.setAttribute('x1', backX);
    conductorBack.setAttribute('x2', backX);
    conductorBack.setAttribute('y1', cy - h);
    conductorBack.setAttribute('y2', cy + h);

    // Brillo de la bobina segun corriente (calentamiento electrico)
    const intensity = Math.min(1, state.current / 2);
    if (intensity > 0.02) {
        const glowPx = 3 + intensity * 9;
        const glowA = 0.3 + intensity * 0.7;
        conductorFront.style.filter =
            `drop-shadow(0 0 ${glowPx}px rgba(255,200,90,${glowA}))`;
    } else {
        conductorFront.style.filter = 'none';
    }

    // Simbolos de fuerza (solo cuando hay corriente circulante)
    const showForce = state.current > 0.001;
    const fScale = Math.min(1, state.force / 6);
    const hue = 120 - fScale * 90;
    const color = `hsl(${hue}, 100%, 62%)`;

    // Ubicacion: un conductor arriba y el otro abajo del centro
    const frontY = cy - h * 0.55;
    const backY = cy + h * 0.55;

    forceSymbolFront.setAttribute('x', frontX);
    forceSymbolFront.setAttribute('y', frontY);
    forceSymbolFront.setAttribute('fill', color);
    forceSymbolBack.setAttribute('x', backX);
    forceSymbolBack.setAttribute('y', backY);
    forceSymbolBack.setAttribute('fill', color);

    forceLabelFront.setAttribute('x', frontX);
    forceLabelFront.setAttribute('y', frontY + 24);
    forceLabelFront.setAttribute('fill', color);
    forceLabelBack.setAttribute('x', backX);
    forceLabelBack.setAttribute('y', backY + 24);
    forceLabelBack.setAttribute('fill', color);

    const visible = showForce ? '1' : '0.15';
    forceSymbolFront.setAttribute('opacity', showForce ? '1' : '0.15');
    forceSymbolBack.setAttribute('opacity', showForce ? '0.5' : '0.15');
    forceLabelFront.setAttribute('visibility', showForce ? 'visible' : 'hidden');
    forceLabelBack.setAttribute('visibility', showForce ? 'visible' : 'hidden');

    // Flechas de corriente: el conmutador las invierte cada media vuelta
    const half = Math.floor(state.angle / Math.PI) % 2;
    const up = half === 0;
    currentArrowFront.textContent = up ? '\u25B2' : '\u25BC';
    currentArrowBack.textContent = up ? '\u25BC' : '\u25B2';
    currentArrowFront.setAttribute('x', frontX);
    currentArrowFront.setAttribute('y', cy + 6);
    currentArrowBack.setAttribute('x', backX);
    currentArrowBack.setAttribute('y', cy + 6);

    const iOpacity = state.current > 0.01 ? Math.min(1, state.current / 1.5) : 0;
    currentArrowFront.style.opacity = iOpacity;
    currentArrowBack.style.opacity = iOpacity * 0.6;
}

/**
 * Bucle principal de animacion
 */
let lastTime = 0;

function animate(time) {
    const dt = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;

    if (state.running) {
        // Dinamica: acelera manteniendo torque y friccion
        const torqueNet = state.torque - PHYSICS.friction * state.omega * 0.2;
        state.omega += (torqueNet / PHYSICS.inertia) * dt * 0.25;

        // Convergencia suave hacia la velocidad objetivo
        state.omega += (state.targetOmega - state.omega) * dt * 1.5;

        state.omega = Math.max(0, Math.min(state.omega, PHYSICS.omegaMax));
        state.angle += state.omega * dt;
    } else {
        // Frenado suave al detenerse
        state.omega *= Math.exp(-dt * 3);
        if (state.omega < 0.01) state.omega = 0;
    }

    // Recalcula toda la fisica con la nueva velocidad angular
    // (el back-EMF crece con omega, reduciendo la corriente neta)
    updateReadings();

    // Redibuja la bobina (rotacion en su propio eje)
    updateCoil();
    updateFieldLines();

    requestAnimationFrame(animate);
}

/**
 * Inicia/detiene la simulacion
 */
function toggleSimulation() {
    state.running = !state.running;

    const playBtn = document.getElementById('playBtn');
    const playIcon = document.getElementById('playIcon');
    const stopIcon = document.getElementById('stopIcon');
    const playBtnText = document.getElementById('playBtnText');
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const fieldLineGroup = document.getElementById('fieldLines');

    if (state.running) {
        playBtn.classList.add('stopped');
        playIcon.style.display = 'none';
        stopIcon.style.display = 'block';
        playBtnText.textContent = 'Detener Simulacion';
        statusDot.classList.add('running');
        statusText.textContent = 'En movimiento';
        fieldLineGroup.style.opacity = '0.7';
    } else {
        playBtn.classList.remove('stopped');
        playIcon.style.display = 'block';
        stopIcon.style.display = 'none';
        playBtnText.textContent = 'Iniciar Simulacion';
        statusDot.classList.remove('running');
        statusText.textContent = 'Detenido';
        fieldLineGroup.style.opacity = '0.4';
    }

    updateReadings();
    updateCoil();
}

/**
 * Reinicia la simulacion
 */
function resetSimulation() {
    state.omega = 0;
    state.angle = 0;
    state.running = false;

    // Poner sliders a valores iniciales
    voltageSlider.value = 12;
    resistanceSlider.value = 5;
    bFieldSlider.value = 0.5;
    lengthSlider.value = '0.20';
    turnsSlider.value = 100;
    radiusSlider.value = '0.05';

    Object.assign(state, {
        voltage: 12,
        resistance: 5,
        bField: 0.5,
        length: 0.2,
        turns: 100,
        radius: 0.05
    });

    const playBtn = document.getElementById('playBtn');
    const playIcon = document.getElementById('playIcon');
    const stopIcon = document.getElementById('stopIcon');
    const playBtnText = document.getElementById('playBtnText');
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const fieldLineGroup = document.getElementById('fieldLines');

    playBtn.classList.remove('stopped');
    playIcon.style.display = 'block';
    stopIcon.style.display = 'none';
    playBtnText.textContent = 'Iniciar Simulacion';
    statusDot.classList.remove('running');
    statusText.textContent = 'Detenido';
    fieldLineGroup.style.opacity = '0.4';

    updateSliderLabels();
    updateReadings();
    updateFieldLines();
    updateCoil();
}

/**
 * Actualiza las etiquetas de los sliders
 */
function updateSliderLabels() {
    voltageValue.textContent = state.voltage.toFixed(1) + ' V';
    resistanceValue.textContent = state.resistance.toFixed(1) + ' \u2126';
    bFieldValue.textContent = state.bField.toFixed(2) + ' T';
    lengthValue.textContent = state.length.toFixed(2) + ' m';
    turnsValue.textContent = state.turns;
    radiusValue.textContent = state.radius.toFixed(3) + ' m';
}

/**
 * Vigila el scroll para resaltar el nav activo
 */
function setupScrollSpy() {
    const targets = document.querySelectorAll('main, section');
    const navLinks = document.querySelectorAll('.nav-link');

    window.addEventListener('scroll', (event) => {
        let current = '';
        const scrollPos = window.scrollY + 200;
        targets.forEach((el) => {
            if (scrollPos >= el.offsetTop) {
                current = el.getAttribute('id');
            }
        });
        navLinks.forEach((link) => {
            link.classList.toggle('active', link.getAttribute('href') === '#' + current);
        });
    }, { passive: true });
}

/**
 * Vincula los controles
 */
function setupControls() {
    const binders = [
        [voltageSlider, (v) => { state.voltage = v; }],
        [resistanceSlider, (v) => { state.resistance = v; }],
        [bFieldSlider, (v) => { state.bField = v; }],
        [lengthSlider, (v) => { state.length = v; }],
        [turnsSlider, (v) => { state.turns = Math.round(v); }],
        [radiusSlider, (v) => { state.radius = v; }]
    ];

    for (const [slider, apply] of binders) {
        slider.addEventListener('input', (e) => {
            apply(parseFloat(e.target.value));
            updateSliderLabels();
            updateReadings();
            updateFieldLines();
            updateCoil();
        });
    }
}

/**
 * Inicializacion
 */
function init() {
    setupControls();
    setupScrollSpy();
    updateSliderLabels();
    updateReadings();
    updateFieldLines();
    updateCoil();

    requestAnimationFrame((t) => {
        lastTime = t;
        requestAnimationFrame(animate);
    });
}

document.addEventListener('DOMContentLoaded', init);