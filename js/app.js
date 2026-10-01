/* =============================================
   ElectroSpin - Motor DC Simulator
   Lógica Física, Animación y Sistema de Diagnóstico de Seguridad
   ============================================= */

'use strict';

/**
 * Elementos SVG y DOM
 */
const coilPoly = document.getElementById('coilPoly');
const conductorFront = document.getElementById('conductorFront');
const conductorBack = document.getElementById('conductorBack');
const rotCircle = document.getElementById('rotCircle');
const rotArc = document.getElementById('rotArc');
const forceSymbolFront = document.getElementById('forceSymbolFront');
const forceSymbolBack = document.getElementById('forceSymbolBack');
const forceLabelFront = document.getElementById('forceLabelFront');
const forceLabelBack = document.getElementById('forceLabelBack');
const currentArrowFront = document.getElementById('currentArrowFront');
const currentArrowBack = document.getElementById('currentArrowBack');
const fieldLinesEl = document.getElementById('fieldLines');
const voltageLabelSVG = document.getElementById('voltageLabelSVG');
const rpmValueSVG = document.getElementById('rpmValueSVG');
const motorSvgWrapper = document.getElementById('motorSvgWrapper');
const motorContainerCard = document.getElementById('motorContainerCard');
const motorHazardBorder = document.getElementById('motorHazardBorder');
const motorAlertHUD = document.getElementById('motorAlertHUD');
const sparksGroup = document.getElementById('sparksGroup');
const smokeGroup = document.getElementById('smokeGroup');
const bgHazardGlow = document.getElementById('bgHazardGlow');

// Sliders
const voltageSlider = document.getElementById('voltageSlider');
const resistanceSlider = document.getElementById('resistanceSlider');
const bFieldSlider = document.getElementById('bFieldSlider');
const lengthSlider = document.getElementById('lengthSlider');
const turnsSlider = document.getElementById('turnsSlider');
const radiusSlider = document.getElementById('radiusSlider');

// Slider labels
const voltageValue = document.getElementById('voltageValue');
const resistanceValue = document.getElementById('resistanceValue');
const bFieldValue = document.getElementById('bFieldValue');
const lengthValue = document.getElementById('lengthValue');
const turnsValue = document.getElementById('turnsValue');
const radiusValue = document.getElementById('radiusValue');

// Readings
const currentReading = document.getElementById('currentReading');
const forceReading = document.getElementById('forceReading');
const torqueReading = document.getElementById('torqueReading');
const omegaReading = document.getElementById('omegaReading');
const rpmReading = document.getElementById('rpmReading');
const powerReading = document.getElementById('powerReading');
const backEmfReading = document.getElementById('backEmfReading');
const efficiencyReading = document.getElementById('efficiencyReading');

// Safety Monitor HUD Elements
const safetyMonitorSection = document.getElementById('safetyMonitorSection');
const safetyIconIndicator = document.getElementById('safetyIconIndicator');
const safetyStatusSub = document.getElementById('safetyStatusSub');
const stressPercentText = document.getElementById('stressPercentText');
const stressBarFill = document.getElementById('stressBarFill');
const headerSafetyBadge = document.getElementById('headerSafetyBadge');
const headerSafetyDot = document.getElementById('headerSafetyDot');
const headerSafetyText = document.getElementById('headerSafetyText');
const breakerTripBanner = document.getElementById('breakerTripBanner');

// Safety Micro Chips
const chipVoltage = document.getElementById('chipVoltage');
const chipVoltageVal = document.getElementById('chipVoltageVal');
const chipVoltageStatus = document.getElementById('chipVoltageStatus');

const chipCurrent = document.getElementById('chipCurrent');
const chipCurrentVal = document.getElementById('chipCurrentVal');
const chipCurrentStatus = document.getElementById('chipCurrentStatus');

const chipHeat = document.getElementById('chipHeat');
const chipHeatVal = document.getElementById('chipHeatVal');
const chipHeatStatus = document.getElementById('chipHeatStatus');

const chipSpeed = document.getElementById('chipSpeed');
const chipSpeedVal = document.getElementById('chipSpeedVal');
const chipSpeedStatus = document.getElementById('chipSpeedStatus');

// Hazard Modal Elements
const hazardModal = document.getElementById('hazardModal');
const hazardModalTitle = document.getElementById('hazardModalTitle');
const hazardModalBadge = document.getElementById('hazardModalBadge');
const hazardModalIcon = document.getElementById('hazardModalIcon');
const hazardProblemList = document.getElementById('hazardProblemList');
const hazardConsequenceList = document.getElementById('hazardConsequenceList');
const hazardSolutionText = document.getElementById('hazardSolutionText');

// Audio Toggle Elements
const soundToggleBtn = document.getElementById('soundToggleBtn');
const soundIconOn = document.getElementById('soundIconOn');
const soundIconOff = document.getElementById('soundIconOff');
const soundText = document.getElementById('soundText');

/**
 * Estado Global de la Simulación y Seguridad
 */
const state = {
    // Parámetros de entrada
    voltage: 12,           // V (0 .. 30)
    resistance: 5,         // Ohm (0.5 .. 50)
    bField: 0.5,           // T (0.05 .. 2.0)
    length: 0.2,           // m (0.05 .. 0.50)
    turns: 100,            // espiras (10 .. 500)
    radius: 0.05,          // m (0.01 .. 0.15)

    // Dinámica
    running: false,
    omega: 0,              // rad/s
    angle: 0,              // rad
    targetOmega: 0,
    current: 0,            // A
    force: 0,              // N
    torque: 0,             // N·m
    powerElectrical: 0,    // W
    powerMechanical: 0,    // W
    powerJouleLoss: 0,     // W (I^2 * R)
    backEmf: 0,            // V
    efficiency: 0,         // %

    motorConstant: 0.035,

    // Sistema de Seguridad y Diagnóstico
    breakerTripped: false,
    hazardSeverity: 'safe', // 'safe' | 'warning' | 'critical'
    criticalTimeElapsed: 0, // Segundos en sobrecarga crítica
    tripThresholdSeconds: 5.0, // Tiempo hasta disparo automático del disyuntor
    dismissedHazardModal: false,
    hasPoppedModalForCurrentRisk: false,
    lastWarningSoundTime: 0,
    audioEnabled: false
};

/**
 * Constantes Dinámicas del Modelo Físico
 */
const PHYSICS = {
    omegaMax: 360,     // rad/s límite teórico
    friction: 0.85,
    inertia: 0.006,
    safeLimits: {
        voltageWarn: 18.0,
        voltageCrit: 22.0,
        currentWarn: 3.5,
        currentCrit: 5.0,
        jouleLossWarn: 35.0,
        jouleLossCrit: 55.0,
        rpmWarn: 2800,
        rpmCrit: 3300,
        minResistanceCrit: 2.0
    }
};

/**
 * Coordenadas visuales centrales de la bobina
 */
const COIL_C = {
    cx: 300,
    cy: 255
};

function coilRadius() {
    return 48 + state.radius * 360;
}

function coilHalfHeight() {
    return 48 + state.radius * 300;
}

/**
 * =============================================
 * Web Audio Synthesizer (Efectos de Sonido)
 * =============================================
 */
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.motorOsc = null;
        this.motorGain = null;
        this.sparkNoise = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            this.ctx = new AudioContext();

            // Oscilador del motor (zumbido electromagnético)
            this.motorOsc = this.ctx.createOscillator();
            this.motorGain = this.ctx.createGain();
            this.motorFilter = this.ctx.createBiquadFilter();

            this.motorOsc.type = 'sawtooth';
            this.motorOsc.frequency.setValueAtTime(45, this.ctx.currentTime);

            this.motorFilter.type = 'lowpass';
            this.motorFilter.frequency.setValueAtTime(400, this.ctx.currentTime);

            this.motorGain.gain.setValueAtTime(0, this.ctx.currentTime);

            this.motorOsc.connect(this.motorFilter);
            this.motorFilter.connect(this.motorGain);
            this.motorGain.connect(this.ctx.destination);

            this.motorOsc.start();
            this.initialized = true;
        } catch (e) {
            console.warn('AudioContext no soportado:', e);
        }
    }

    updateMotorSound(running, omega) {
        if (!this.initialized || !state.audioEnabled || !this.ctx) return;
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const now = this.ctx.currentTime;
        if (running && omega > 0.1 && !state.breakerTripped) {
            const freq = Math.min(800, 45 + omega * 3.4);
            const targetGain = Math.min(0.08, 0.01 + (omega / 250) * 0.05);

            this.motorOsc.frequency.setTargetAtTime(freq, now, 0.08);
            this.motorFilter.frequency.setTargetAtTime(250 + freq * 1.5, now, 0.08);
            this.motorGain.gain.setTargetAtTime(targetGain, now, 0.05);
        } else {
            this.motorGain.gain.setTargetAtTime(0, now, 0.1);
        }
    }

    playWarningBeep() {
        if (!this.initialized || !state.audioEnabled || !this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, now);
            osc.frequency.setValueAtTime(660, now + 0.12);

            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.36);
        } catch (e) {}
    }

    playSparkZap() {
        if (!this.initialized || !state.audioEnabled || !this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(1400 + Math.random() * 800, now);

            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.07);
        } catch (e) {}
    }

    playBreakerTrip() {
        if (!this.initialized || !state.audioEnabled || !this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);

            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.32);
        } catch (e) {}
    }

    stopAll() {
        if (this.motorGain && this.ctx) {
            this.motorGain.gain.setValueAtTime(0, this.ctx.currentTime);
        }
    }
}

const soundEngine = new SoundEngine();

function toggleSound() {
    state.audioEnabled = !state.audioEnabled;
    if (state.audioEnabled) {
        soundEngine.init();
        soundToggleBtn.classList.add('active');
        soundIconOn.style.display = 'block';
        soundIconOff.style.display = 'none';
        soundText.textContent = 'Audio: Activo';
    } else {
        soundEngine.stopAll();
        soundToggleBtn.classList.remove('active');
        soundIconOn.style.display = 'none';
        soundIconOff.style.display = 'block';
        soundText.textContent = 'Audio: Desactivado';
    }
}

/**
 * =============================================
 * Modelo Físico Completo
 * =============================================
 */
function computePhysics() {
    const { voltage, resistance, bField, length, turns, radius, omega, motorConstant, breakerTripped } = state;

    // Si el disyuntor térmico disparó, no hay corriente
    if (breakerTripped) {
        return {
            backEmf: 0,
            current: 0,
            force: 0,
            torque: 0,
            omegaTarget: 0,
            powerElectrical: 0,
            powerMechanical: 0,
            powerJouleLoss: 0,
            efficiency: 0
        };
    }

    // 1) Contrafuerza electromotriz (Back-EMF por Ley de Faraday): E_back = k * omega * B
    // A mayor velocidad y campo magnético, mayor oposición interna
    const effectiveKe = motorConstant * (bField / 0.5);
    const backEmf = omega * effectiveKe;

    // 2) Corriente neta por Ley de Ohm con oposición
    let current = (voltage - backEmf) / resistance;
    if (current < 0) current = 0;

    // 3) Fuerza de Lorentz sobre los dos lados activos de la bobina
    const force = 2 * turns * bField * current * length;

    // 4) Torque mecánico motriz
    const torque = force * radius;

    // 5) Velocidad angular de equilibrio
    let omegaTarget = 0;
    if (bField > 0.01 && voltage > 0 && resistance > 0) {
        // En régimen estacionario el torque motriz compensa la fricción interna
        const theoreticalMax = voltage / Math.max(0.005, effectiveKe);
        omegaTarget = Math.min(PHYSICS.omegaMax, theoreticalMax * 0.42);
    }

    // 6) Potencias
    const powerElectrical = voltage * current;
    const powerMechanical = torque * omega;
    const powerJouleLoss = (current * current) * resistance; // Pérdida por calor I^2 * R

    const efficiency = powerElectrical > 0
        ? Math.max(0, Math.min(100, (powerMechanical / powerElectrical) * 100))
        : 0;

    return {
        backEmf,
        current,
        force,
        torque,
        omegaTarget,
        powerElectrical,
        powerMechanical,
        powerJouleLoss,
        efficiency
    };
}

function rpmFromOmega(omega) {
    return ((omega * 60) / (2 * Math.PI));
}

/**
 * =============================================
 * Motor de Diagnóstico de Seguridad y Peligros
 * =============================================
 */
function evaluateMotorHealth(p, currentRpm) {
    const { voltage, resistance } = state;
    const limits = PHYSICS.safeLimits;

    const problems = [];
    const consequences = [];
    let severity = 'safe'; // 'safe', 'warning', 'critical'
    let stressIndex = 0;   // 0 .. 150+ %

    // --- Evaluación de Voltaje (Tensión Dieléctrica) ---
    const vRatio = voltage / limits.voltageWarn;
    let vStress = Math.min(100, vRatio * 50);

    if (voltage > limits.voltageCrit) {
        severity = 'critical';
        vStress = 95 + ((voltage - limits.voltageCrit) / 8) * 40;
        problems.push(`Sobretensión destructiva en bornes: ${voltage.toFixed(1)} V (Límite crítico seguro: ${limits.voltageWarn} V).`);
        consequences.push(`Perforación del aislamiento dieléctrico del colector y salto continuo de arco voltaico destructivo entre delgas adyacentes.`);
        consequences.push(`Carbonización prematura de las escobillas de grafito con riesgo de cortocircuito directo hacia la carcasa metálica.`);
    } else if (voltage > limits.voltageWarn) {
        if (severity !== 'critical') severity = 'warning';
        vStress = 65 + ((voltage - limits.voltageWarn) / (limits.voltageCrit - limits.voltageWarn)) * 25;
        problems.push(`Tensión elevada por encima del rango nominal: ${voltage.toFixed(1)} V (Máximo sugerido: ${limits.voltageWarn} V).`);
        consequences.push(`Chispas frecuentes en las escobillas del conmutador y calentamiento dieléctrico acelerado.`);
    }

    // --- Evaluación de Corriente y Efecto Joule (Calor) ---
    const iRatio = p.current / limits.currentWarn;
    const pJouleRatio = p.powerJouleLoss / limits.jouleLossWarn;
    let heatStress = Math.max(iRatio, pJouleRatio) * 55;

    if (p.current > limits.currentCrit || p.powerJouleLoss > limits.jouleLossCrit || (resistance < limits.minResistanceCrit && voltage >= 12)) {
        severity = 'critical';
        heatStress = Math.max(heatStress, 100 + (p.powerJouleLoss - limits.jouleLossCrit) * 1.2);
        problems.push(`Sobrecorriente crítica e hipertermia por Efecto Joule: I = ${p.current.toFixed(2)} A | Disipación Térmica = ${p.powerJouleLoss.toFixed(1)} W (Límite seguro: ${limits.jouleLossWarn} W).`);
        if (resistance < limits.minResistanceCrit) {
            problems.push(`Resistencia del bobinado anormalmente baja (${resistance.toFixed(1)} \u2126): condición de cuasi-cortocircuito.`);
        }
        consequences.push(`Degradación instantánea y derretimiento del barniz aislante de poliimida de las espiras a más de 180°C.`);
        consequences.push(`Cortocircuito irreversible entre espiras contiguas, desprendimiento de humo tóxico y peligro inminente de fuego.`);
    } else if (p.current > limits.currentWarn || p.powerJouleLoss > limits.jouleLossWarn) {
        if (severity !== 'critical') severity = 'warning';
        heatStress = Math.max(heatStress, 65 + ((p.current - limits.currentWarn) / 1.5) * 20);
        problems.push(`Sobrecorriente moderada en el bobinado: ${p.current.toFixed(2)} A (Disipación térmica: ${p.powerJouleLoss.toFixed(1)} W).`);
        consequences.push(`Sobrecalentamiento acumulativo del inducido, acortando drásticamente la vida útil del cobre.`);
    }

    // --- Evaluación Mecánica (Sobrevelocidad / RPM) ---
    let speedStress = (currentRpm / limits.rpmWarn) * 50;

    if (currentRpm > limits.rpmCrit) {
        severity = 'critical';
        speedStress = 95 + ((currentRpm - limits.rpmCrit) / 800) * 40;
        problems.push(`Régimen de sobrevelocidad mecánica descontrolada: ${currentRpm.toFixed(0)} RPM (Límite estructural: ${limits.rpmWarn} RPM).`);
        consequences.push(`Fuerzas centrífugas excesivas que superan la resistencia elástica del bobinado, causando deformación radial y desprendimiento.`);
        consequences.push(`Vibraciones mecánicas de alta frecuencia, rebote de escobillas y agarrotamiento fatal de los cojinetes/rodamientos.`);
    } else if (currentRpm > limits.rpmWarn) {
        if (severity !== 'critical') severity = 'warning';
        speedStress = 65 + ((currentRpm - limits.rpmWarn) / (limits.rpmCrit - limits.rpmWarn)) * 25;
        problems.push(`Velocidad angular cercana al límite seguro de cojinetes: ${currentRpm.toFixed(0)} RPM.`);
        consequences.push(`Vibración mecánica perceptible y desgaste acelerado del eje y bujes de soporte.`);
    }

    // Estrés global combinado
    stressIndex = Math.min(160, Math.max(vStress, heatStress, speedStress));

    return {
        severity,
        stressIndex: Math.round(stressIndex),
        problems,
        consequences,
        vStress,
        heatStress,
        speedStress
    };
}

/**
 * =============================================
 * Actualización de Interfaz y HUD de Seguridad
 * =============================================
 */
function updateReadings() {
    const p = computePhysics();
    const currentRpm = rpmFromOmega(state.omega);
    const health = evaluateMotorHealth(p, currentRpm);

    // Actualizar lecturas en tarjetas
    currentReading.textContent = p.current.toFixed(2) + ' A';
    forceReading.textContent = p.force.toFixed(3) + ' N';
    torqueReading.textContent = p.torque.toFixed(4) + ' N\u00B7m';
    omegaReading.textContent = state.omega.toFixed(1) + ' rad/s';
    rpmReading.textContent = currentRpm.toFixed(0) + ' rpm';
    rpmValueSVG.textContent = currentRpm.toFixed(0) + ' RPM';
    powerReading.textContent = p.powerElectrical.toFixed(2) + ' W';
    backEmfReading.textContent = p.backEmf.toFixed(2) + ' V';
    efficiencyReading.textContent = p.efficiency.toFixed(1) + ' %';
    voltageLabelSVG.textContent = state.voltage.toFixed(1) + ' V';

    // Guardar en el estado
    state.current = p.current;
    state.force = p.force;
    state.torque = p.torque;
    state.backEmf = p.backEmf;
    state.powerMechanical = p.powerMechanical;
    state.powerElectrical = p.powerElectrical;
    state.powerJouleLoss = p.powerJouleLoss;
    state.efficiency = p.efficiency;
    state.targetOmega = p.omegaTarget;
    state.hazardSeverity = health.severity;

    // Actualizar chips de métricas de seguridad
    chipVoltageVal.textContent = state.voltage.toFixed(1) + ' V';
    chipCurrentVal.textContent = p.current.toFixed(2) + ' A';
    chipHeatVal.textContent = p.powerJouleLoss.toFixed(1) + ' W';
    chipSpeedVal.textContent = currentRpm.toFixed(0) + ' RPM';

    updateSafetyChip(chipVoltage, chipVoltageStatus, state.voltage, PHYSICS.safeLimits.voltageWarn, PHYSICS.safeLimits.voltageCrit);
    updateSafetyChip(chipCurrent, chipCurrentStatus, p.current, PHYSICS.safeLimits.currentWarn, PHYSICS.safeLimits.currentCrit);
    updateSafetyChip(chipHeat, chipHeatStatus, p.powerJouleLoss, PHYSICS.safeLimits.jouleLossWarn, PHYSICS.safeLimits.jouleLossCrit);
    updateSafetyChip(chipSpeed, chipSpeedStatus, currentRpm, PHYSICS.safeLimits.rpmWarn, PHYSICS.safeLimits.rpmCrit);

    // Actualizar Barra de Estrés
    const barWidth = Math.min(100, (health.stressIndex / 140) * 100);
    stressBarFill.style.width = barWidth + '%';

    if (health.severity === 'critical') {
        stressBarFill.style.background = 'linear-gradient(90deg, #ff8800, #ff3344)';
        stressPercentText.style.color = '#ff4466';
        stressPercentText.textContent = `${health.stressIndex}% [¡PELIGRO CRÍTICO!]`;
    } else if (health.severity === 'warning') {
        stressBarFill.style.background = 'linear-gradient(90deg, #44ff88, #ffb703)';
        stressPercentText.style.color = '#ffb703';
        stressPercentText.textContent = `${health.stressIndex}% [Precaución]`;
    } else {
        stressBarFill.style.background = 'linear-gradient(90deg, #44ff88, #00c8ff)';
        stressPercentText.style.color = '#44ff88';
        stressPercentText.textContent = `${health.stressIndex}% [Seguro]`;
    }

    // Actualizar Header Badge y Estado
    if (state.breakerTripped) {
        headerSafetyBadge.className = 'header-safety-badge danger';
        headerSafetyText.textContent = 'Disyuntor Disparado';
        safetyIconIndicator.textContent = '💥';
        safetyStatusSub.textContent = 'Circuito desconectado automáticamente por protección térmica.';
        safetyStatusSub.style.color = '#ff6677';
        safetyMonitorSection.className = 'panel-section safety-monitor-section is-danger';
        motorContainerCard.classList.add('is-hazardous');
        breakerTripBanner.style.display = 'flex';
    } else if (health.severity === 'critical') {
        headerSafetyBadge.className = 'header-safety-badge danger';
        headerSafetyText.textContent = '¡Peligro Crítico!';
        safetyIconIndicator.textContent = '🚨';
        safetyStatusSub.textContent = '¡Sobrecarga extrema! Peligro de daño físico inminente al motor.';
        safetyStatusSub.style.color = '#ff6677';
        safetyMonitorSection.className = 'panel-section safety-monitor-section is-danger';
        motorContainerCard.classList.add('is-hazardous');
        breakerTripBanner.style.display = 'none';

        // Alerta visual de fondo y marco
        bgHazardGlow.style.opacity = '1';
        motorHazardBorder.style.opacity = '0.9';
        motorHazardBorder.classList.add('pulsing');
        motorAlertHUD.style.opacity = '1';
    } else if (health.severity === 'warning') {
        headerSafetyBadge.className = 'header-safety-badge warning';
        headerSafetyText.textContent = 'Advertencia';
        safetyIconIndicator.textContent = '⚠️';
        safetyStatusSub.textContent = 'Valores elevados cerca del umbral de fatiga térmica.';
        safetyStatusSub.style.color = '#ffb703';
        safetyMonitorSection.className = 'panel-section safety-monitor-section is-warning';
        motorContainerCard.classList.remove('is-hazardous');
        breakerTripBanner.style.display = 'none';

        bgHazardGlow.style.opacity = '0.4';
        motorHazardBorder.style.opacity = '0';
        motorHazardBorder.classList.remove('pulsing');
        motorAlertHUD.style.opacity = '0';
    } else {
        headerSafetyBadge.className = 'header-safety-badge';
        headerSafetyText.textContent = 'Estado: Seguro';
        safetyIconIndicator.textContent = '🛡️';
        safetyStatusSub.textContent = 'Parámetros operativos dentro del rango seguro.';
        safetyStatusSub.style.color = 'var(--text-muted)';
        safetyMonitorSection.className = 'panel-section safety-monitor-section';
        motorContainerCard.classList.remove('is-hazardous');
        breakerTripBanner.style.display = 'none';

        bgHazardGlow.style.opacity = '0';
        motorHazardBorder.style.opacity = '0';
        motorHazardBorder.classList.remove('pulsing');
        motorAlertHUD.style.opacity = '0';
    }

    // Vibración mecánica si RPM es crítica
    if (currentRpm > PHYSICS.safeLimits.rpmWarn && state.running) {
        motorSvgWrapper.classList.add('vibrating');
    } else {
        motorSvgWrapper.classList.remove('vibrating');
    }

    // --- Disparo automático de la ventana modal emergente ---
    if (health.severity === 'critical' && !state.dismissedHazardModal && !state.hasPoppedModalForCurrentRisk && !state.breakerTripped) {
        triggerHazardAlertModal(health);
    }
}

function updateSafetyChip(chipEl, statusEl, val, warnLimit, critLimit) {
    if (val >= critLimit) {
        chipEl.className = 'safety-chip danger';
        statusEl.textContent = 'Crítico';
    } else if (val >= warnLimit) {
        chipEl.className = 'safety-chip warn';
        statusEl.textContent = 'Alerta';
    } else {
        chipEl.className = 'safety-chip safe';
        statusEl.textContent = 'Seguro';
    }
}

/**
 * =============================================
 * Mecánica de Ventana Modal Emergente de Aviso
 * =============================================
 */
function triggerHazardAlertModal(health) {
    state.hasPoppedModalForCurrentRisk = true;
    soundEngine.playWarningBeep();

    renderModalContent(health);
    hazardModal.style.display = 'flex';
}

function openHazardModal() {
    const p = computePhysics();
    const currentRpm = rpmFromOmega(state.omega);
    const health = evaluateMotorHealth(p, currentRpm);

    renderModalContent(health);
    hazardModal.style.display = 'flex';
}

function renderModalContent(health) {
    hazardProblemList.innerHTML = '';
    hazardConsequenceList.innerHTML = '';

    if (state.breakerTripped) {
        hazardModalBadge.textContent = 'DISYUNTOR DE SEGURIDAD DISPARADO';
        hazardModalBadge.style.color = '#ff6677';
        hazardModalTitle.textContent = 'Alimentación Interrumpida por Sobrecalentamiento';
        hazardModalIcon.textContent = '💥';

        const liP = document.createElement('li');
        liP.textContent = 'El motor operó en estado de sobrecarga térmica crítica por más de 5 segundos consecutivos.';
        hazardProblemList.appendChild(liP);

        const liC = document.createElement('li');
        liC.textContent = 'El termostato bimetálico/fusible electrónico cortó la corriente para salvar los bobinados de cobre de una fundición total.';
        hazardConsequenceList.appendChild(liC);

        hazardSolutionText.textContent = 'Para continuar, pulsa "Calibrar a Parámetros Seguros (12V)" o pulsa "Rearmar Disyuntor" en el panel.';
        return;
    }

    if (health.severity === 'critical') {
        hazardModalBadge.textContent = 'ALERTA CRÍTICA DE SOBRECARGA';
        hazardModalBadge.style.color = '#ff6677';
        hazardModalTitle.textContent = '¡Límites Físicos Críticos Excedidos!';
        hazardModalIcon.textContent = '🚨';
    } else if (health.severity === 'warning') {
        hazardModalBadge.textContent = 'ADVERTENCIA OPERATIVA';
        hazardModalBadge.style.color = '#ffb703';
        hazardModalTitle.textContent = 'Parámetros Cerca del Límite Seguro';
        hazardModalIcon.textContent = '⚠️';
    } else {
        hazardModalBadge.textContent = 'DIAGNÓSTICO DEL SISTEMA';
        hazardModalBadge.style.color = 'var(--accent-green)';
        hazardModalTitle.textContent = 'Parámetros en Condición Óptima';
        hazardModalIcon.textContent = '✅';
    }

    // Llenar problemas
    if (health.problems.length > 0) {
        health.problems.forEach(prob => {
            const li = document.createElement('li');
            li.textContent = prob;
            hazardProblemList.appendChild(li);
        });
    } else {
        const li = document.createElement('li');
        li.textContent = 'El voltaje, corriente y velocidad se encuentran en niveles nominales de laboratorio.';
        hazardProblemList.appendChild(li);
    }

    // Llenar consecuencias
    if (health.consequences.length > 0) {
        health.consequences.forEach(cons => {
            const li = document.createElement('li');
            li.textContent = cons;
            hazardConsequenceList.appendChild(li);
        });
    } else {
        const li = document.createElement('li');
        li.textContent = 'No hay riesgo de fatiga dieléctrica, arco eléctrico ni desgaste centrífugo.';
        hazardConsequenceList.appendChild(li);
    }

    hazardSolutionText.textContent = health.severity === 'critical'
        ? 'Si no reduces la tensión o aumentas la resistencia en los próximos 5 segundos de funcionamiento, el disyuntor térmico cortará la corriente automáticamente.'
        : 'Recomendamos mantener el voltaje por debajo de 18V y la resistencia por encima de 4 \u2126 para una vida útil prolongada.';
}

function closeHazardModal() {
    hazardModal.style.display = 'none';
}

function dismissHazardModal(experimentalMode) {
    hazardModal.style.display = 'none';
    if (experimentalMode) {
        state.dismissedHazardModal = true;
    }
}

/**
 * Restablecer a Parámetros 100% Seguros
 */
function restoreSafeParameters() {
    state.voltage = 12.0;
    state.resistance = 5.0;
    state.bField = 0.50;
    state.length = 0.20;
    state.turns = 100;
    state.radius = 0.05;

    voltageSlider.value = 12.0;
    resistanceSlider.value = 5.0;
    bFieldSlider.value = 0.50;
    lengthSlider.value = 0.20;
    turnsSlider.value = 100;
    radiusSlider.value = 0.05;

    state.breakerTripped = false;
    state.criticalTimeElapsed = 0;
    state.dismissedHazardModal = false;
    state.hasPoppedModalForCurrentRisk = false;

    updateSliderLabels();
    updateReadings();
    updateFieldLines();
    updateCoil();
    closeHazardModal();
}

/**
 * Rearmar Disyuntor tras Disparo
 */
function rearmBreaker() {
    state.breakerTripped = false;
    state.criticalTimeElapsed = 0;
    breakerTripBanner.style.display = 'none';

    // Si aún tiene parámetros extremos, avisar o suavizar un poco
    if (state.voltage > 24) state.voltage = 20;
    if (state.resistance < 2) state.resistance = 3;

    voltageSlider.value = state.voltage;
    resistanceSlider.value = state.resistance;

    updateSliderLabels();
    updateReadings();
    updateCoil();
}

/**
 * =============================================
 * Presets de Prueba Rápida
 * =============================================
 */
function applyPreset(presetType) {
    document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));

    const btn = document.getElementById('preset' + presetType.charAt(0).toUpperCase() + presetType.slice(1));
    if (btn) btn.classList.add('active');

    state.breakerTripped = false;
    state.criticalTimeElapsed = 0;
    state.hasPoppedModalForCurrentRisk = false;
    state.dismissedHazardModal = false;

    switch (presetType) {
        case 'nominal':
            state.voltage = 12.0;
            state.resistance = 5.0;
            state.bField = 0.50;
            state.length = 0.20;
            state.turns = 100;
            state.radius = 0.05;
            break;
        case 'overvoltage':
            state.voltage = 25.0; // Dispara sobretensión y arco en escobillas
            state.resistance = 6.0;
            state.bField = 0.60;
            state.length = 0.20;
            state.turns = 120;
            state.radius = 0.05;
            break;
        case 'thermal':
            state.voltage = 28.0; // Dispara sobrecorriente extrema y humo
            state.resistance = 1.0;
            state.bField = 0.50;
            state.length = 0.20;
            state.turns = 100;
            state.radius = 0.05;
            break;
        case 'overspeed':
            state.voltage = 26.0; // Campo débil -> sin contrafem -> sobrevelocidad
            state.resistance = 5.0;
            state.bField = 0.05;
            state.length = 0.20;
            state.turns = 80;
            state.radius = 0.04;
            break;
        case 'highEff':
            state.voltage = 16.0;
            state.resistance = 10.0;
            state.bField = 1.20;
            state.length = 0.25;
            state.turns = 150;
            state.radius = 0.06;
            break;
    }

    voltageSlider.value = state.voltage;
    resistanceSlider.value = state.resistance;
    bFieldSlider.value = state.bField;
    lengthSlider.value = state.length;
    turnsSlider.value = state.turns;
    radiusSlider.value = state.radius;

    updateSliderLabels();
    updateReadings();
    updateFieldLines();
    updateCoil();
}

/**
 * =============================================
 * Animaciones SVG Dinámicas (Chispas, Humo, Calor)
 * =============================================
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

function updateDynamicSparks() {
    // Generar arco voltaico si hay sobrevoltaje o corriente excesiva con el motor en marcha
    const hasArcing = state.running && !state.breakerTripped && (state.voltage > 19 || state.current > 4.2);

    if (!hasArcing) {
        sparksGroup.innerHTML = '';
        sparksGroup.style.opacity = '0';
        return;
    }

    sparksGroup.style.opacity = '1';
    let html = '';

    // Contacto escobilla izquierda: (266, 385), derecha: (334, 385)
    const contacts = [ { x: 266, y: 385 }, { x: 334, y: 385 } ];
    contacts.forEach(pt => {
        const numSparks = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < numSparks; i++) {
            const dx1 = (Math.random() - 0.5) * 16;
            const dy1 = (Math.random() - 0.5) * 12;
            const dx2 = dx1 + (Math.random() - 0.5) * 14;
            const dy2 = dy1 + (Math.random() - 0.5) * 10;
            const color = Math.random() > 0.4 ? '#00e5ff' : '#ffff66';

            html += `<path d="M ${pt.x} ${pt.y} Q ${pt.x + dx1} ${pt.y + dy1} ${pt.x + dx2} ${pt.y + dy2}" 
                          stroke="${color}" stroke-width="${1.2 + Math.random() * 1.5}" fill="none" class="spark-arc" />`;
        }
    });

    sparksGroup.innerHTML = html;
    if (Math.random() > 0.6) {
        soundEngine.playSparkZap();
    }
}

let smokeCounter = 0;
function updateDynamicSmoke() {
    // Generar humo si la disipación térmica por Joule excede 45W
    const isSmoking = state.running && !state.breakerTripped && state.powerJouleLoss > 45;

    if (!isSmoking) {
        smokeGroup.innerHTML = '';
        smokeGroup.style.opacity = '0';
        return;
    }

    smokeGroup.style.opacity = '0.75';
    smokeCounter++;

    if (smokeCounter % 6 === 0) {
        // Añadir una nueva partícula de humo
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        const rX = 285 + (Math.random() - 0.5) * 35;
        const rY = 240 + (Math.random() - 0.5) * 40;
        circle.setAttribute('cx', rX);
        circle.setAttribute('cy', rY);
        circle.setAttribute('r', 8 + Math.random() * 6);
        circle.setAttribute('fill', 'rgba(180, 190, 205, 0.45)');
        circle.setAttribute('filter', 'url(#glow)');
        circle.setAttribute('class', 'smoke-particle');

        smokeGroup.appendChild(circle);

        if (smokeGroup.children.length > 9) {
            smokeGroup.removeChild(smokeGroup.children[0]);
        }
    }
}

/**
 * Redibuja la bobina en su rotación y modula el calentamiento del cobre
 */
function updateCoil() {
    const { cx, cy } = COIL_C;
    const r = coilRadius();
    const h = coilHalfHeight();
    const cos = Math.cos(state.angle);
    const sin = Math.sin(state.angle);

    const nNorm = Math.min(1, state.turns / 500);
    const strokeF = 5 + nNorm * 8;
    const strokeB = 3 + nNorm * 5;

    const fX = cx + r * cos;
    const bX = cx - r * cos;
    const front = sin >= 0;
    const frontX = front ? fX : bX;
    const backX = front ? bX : fX;

    const pts = [
        cx + r * cos, cy - h,
        cx - r * cos, cy - h,
        cx - r * cos, cy + h,
        cx + r * cos, cy + h
    ];
    coilPoly.setAttribute('points', pts.join(','));

    conductorFront.setAttribute('x1', frontX);
    conductorFront.setAttribute('x2', frontX);
    conductorFront.setAttribute('y1', cy - h);
    conductorFront.setAttribute('y2', cy + h);
    conductorFront.setAttribute('stroke-width', strokeF);

    conductorBack.setAttribute('x1', backX);
    conductorBack.setAttribute('x2', backX);
    conductorBack.setAttribute('y1', cy - h);
    conductorBack.setAttribute('y2', cy + h);
    conductorBack.setAttribute('stroke-width', strokeB);

    // Color del conductor según sobrecalentamiento
    const heatRatio = Math.min(1, state.powerJouleLoss / 70);
    if (heatRatio > 0.6) {
        conductorFront.setAttribute('stroke', '#ff3311'); // Rojo incandescente
    } else if (heatRatio > 0.3) {
        conductorFront.setAttribute('stroke', '#ff7700'); // Naranja caliente
    } else {
        conductorFront.setAttribute('stroke', '#ffaa00'); // Cobre normal
    }

    // Indicador circular de rotación
    const r2 = r - 12;
    rotCircle.setAttribute('r', r2);
    const arcTo = Math.PI / 3;
    const ex = cx + r2 * Math.cos(arcTo);
    const ey = cy + r2 * Math.sin(arcTo);
    rotArc.setAttribute('d', `M ${cx + r2} ${cy} A ${r2} ${r2} 0 0 1 ${ex} ${ey}`);

    // Brillo de calentamiento
    const intensity = Math.min(1, state.current / 3.0);
    if (intensity > 0.05 && !state.breakerTripped) {
        const glowPx = 3 + intensity * 12;
        const glowA = 0.3 + intensity * 0.7;
        const glowColor = heatRatio > 0.5 ? '255,60,40' : '255,200,90';
        conductorFront.style.filter = `drop-shadow(0 0 ${glowPx}px rgba(${glowColor},${glowA}))`;
    } else {
        conductorFront.style.filter = 'none';
    }

    // Símbolos de fuerza
    const showForce = state.current > 0.001 && !state.breakerTripped;
    const fScale = Math.min(1, state.force / 6);
    const hue = 120 - fScale * 90;
    const color = `hsl(${hue}, 100%, 62%)`;

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

    forceSymbolFront.setAttribute('opacity', showForce ? '1' : '0.15');
    forceSymbolBack.setAttribute('opacity', showForce ? '0.5' : '0.15');
    forceLabelFront.setAttribute('visibility', showForce ? 'visible' : 'hidden');
    forceLabelBack.setAttribute('visibility', showForce ? 'visible' : 'hidden');

    // Flechas de corriente
    const half = Math.floor(state.angle / Math.PI) % 2;
    const up = half === 0;
    currentArrowFront.textContent = up ? '\u25B2' : '\u25BC';
    currentArrowBack.textContent = up ? '\u25BC' : '\u25B2';
    currentArrowFront.setAttribute('x', frontX);
    currentArrowFront.setAttribute('y', cy + 6);
    currentArrowBack.setAttribute('x', backX);
    currentArrowBack.setAttribute('y', cy + 6);

    const iOpacity = showForce ? Math.min(1, state.current / 1.5) : 0;
    currentArrowFront.style.opacity = iOpacity;
    currentArrowBack.style.opacity = iOpacity * 0.6;
}

/**
 * =============================================
 * Bucle Principal de Animación
 * =============================================
 */
let lastTime = 0;

function animate(time) {
    const dt = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;

    if (state.running && !state.breakerTripped) {
        // Dinámica motriz
        const torqueNet = state.torque - PHYSICS.friction * state.omega * 0.18;
        state.omega += (torqueNet / PHYSICS.inertia) * dt * 0.28;
        state.omega += (state.targetOmega - state.omega) * dt * 1.5;

        state.omega = Math.max(0, Math.min(state.omega, PHYSICS.omegaMax));
        state.angle += state.omega * dt;

        // Temporizador de disyuntor térmico en peligro crítico
        if (state.hazardSeverity === 'critical') {
            state.criticalTimeElapsed += dt;
            if (state.criticalTimeElapsed >= state.tripThresholdSeconds) {
                // ¡Disparar disyuntor!
                state.breakerTripped = true;
                soundEngine.playBreakerTrip();
                updateReadings();
            }
        } else {
            state.criticalTimeElapsed = Math.max(0, state.criticalTimeElapsed - dt * 0.5);
        }
    } else {
        // Frenado
        state.omega *= Math.exp(-dt * 3.2);
        if (state.omega < 0.01) state.omega = 0;
    }

    // Actualizar audio del motor
    soundEngine.updateMotorSound(state.running, state.omega);

    // Efectos dinámicos
    updateReadings();
    updateCoil();
    updateFieldLines();
    updateDynamicSparks();
    updateDynamicSmoke();

    requestAnimationFrame(animate);
}

/**
 * =============================================
 * Controles de Simulación
 * =============================================
 */
function toggleSimulation() {
    state.running = !state.running;

    const playBtn = document.getElementById('playBtn');
    const playIcon = document.getElementById('playIcon');
    const stopIcon = document.getElementById('stopIcon');
    const playBtnText = document.getElementById('playBtnText');
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');

    if (state.running) {
        playBtn.classList.add('stopped');
        playIcon.style.display = 'none';
        stopIcon.style.display = 'block';
        playBtnText.textContent = 'Detener Simulación';
        statusDot.classList.add('running');
        statusText.textContent = 'En rotación';
        fieldLinesEl.style.opacity = '0.7';

        if (state.audioEnabled) {
            soundEngine.init();
        }
    } else {
        playBtn.classList.remove('stopped');
        playIcon.style.display = 'block';
        stopIcon.style.display = 'none';
        playBtnText.textContent = 'Iniciar Simulación';
        statusDot.classList.remove('running');
        statusText.textContent = 'Detenido';
        fieldLinesEl.style.opacity = '0.4';
    }

    updateReadings();
    updateCoil();
}

function resetSimulation() {
    state.omega = 0;
    state.angle = 0;
    state.running = false;
    state.breakerTripped = false;
    state.criticalTimeElapsed = 0;
    state.dismissedHazardModal = false;
    state.hasPoppedModalForCurrentRisk = false;

    voltageSlider.value = 12.0;
    resistanceSlider.value = 5.0;
    bFieldSlider.value = 0.50;
    lengthSlider.value = 0.20;
    turnsSlider.value = 100;
    radiusSlider.value = 0.05;

    Object.assign(state, {
        voltage: 12.0,
        resistance: 5.0,
        bField: 0.50,
        length: 0.20,
        turns: 100,
        radius: 0.05
    });

    const playBtn = document.getElementById('playBtn');
    const playIcon = document.getElementById('playIcon');
    const stopIcon = document.getElementById('stopIcon');
    const playBtnText = document.getElementById('playBtnText');
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');

    playBtn.classList.remove('stopped');
    playIcon.style.display = 'block';
    stopIcon.style.display = 'none';
    playBtnText.textContent = 'Iniciar Simulación';
    statusDot.classList.remove('running');
    statusText.textContent = 'Detenido';
    fieldLinesEl.style.opacity = '0.4';

    updateSliderLabels();
    updateReadings();
    updateFieldLines();
    updateCoil();
}

function updateSliderLabels() {
    voltageValue.textContent = state.voltage.toFixed(1) + ' V';
    resistanceValue.textContent = state.resistance.toFixed(1) + ' \u2126';
    bFieldValue.textContent = state.bField.toFixed(2) + ' T';
    lengthValue.textContent = state.length.toFixed(2) + ' m';
    turnsValue.textContent = state.turns;
    radiusValue.textContent = state.radius.toFixed(3) + ' m';
}

function setupControls() {
    const binders = [
        [voltageSlider, (v) => { 
            state.voltage = v; 
            if (v <= PHYSICS.safeLimits.voltageWarn) {
                state.hasPoppedModalForCurrentRisk = false;
            }
        }],
        [resistanceSlider, (v) => { 
            state.resistance = v; 
            if (v >= PHYSICS.safeLimits.minResistanceCrit) {
                state.hasPoppedModalForCurrentRisk = false;
            }
        }],
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

    // Cerrar modal al pulsar Escape
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && hazardModal.style.display === 'flex') {
            closeHazardModal();
        }
    });

    // Cerrar modal al hacer clic en el backdrop exterior
    hazardModal.addEventListener('click', (e) => {
        if (e.target === hazardModal) {
            closeHazardModal();
        }
    });
}

function setupScrollSpy() {
    const targets = document.querySelectorAll('main, section');
    const navLinks = document.querySelectorAll('.nav-link');

    window.addEventListener('scroll', () => {
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
 * Inicialización
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