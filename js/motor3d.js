/* =============================================
   ElectroSpin - Simulador 3D de Motor DC
   Módulo WebGL con Three.js y OrbitControls
   ============================================= */

'use strict';

class Motor3D {
    constructor() {
        this.container = null;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.initialized = false;

        // Jerarquía de mallas
        this.rootGroup = null;
        this.statorGroup = null;
        this.rotorGroup = null;
        this.coilGroup = null;
        this.commutatorGroup = null;

        // Mallas individuales
        this.shaftMesh = null;
        this.conductorFrontMesh = null;
        this.conductorBackMesh = null;
        this.conductorTopMesh = null;
        this.conductorBottomMesh = null;
        this.magnetNMesh = null;
        this.magnetSMesh = null;

        // Materiales interactivos
        this.copperMaterial = null;
        this.magnetNMaterial = null;
        this.magnetSMaterial = null;

        // Vectores dinámicos
        this.arrowForceFront = null;
        this.arrowForceBack = null;
        this.arrowCurrentFront = null;
        this.arrowCurrentBack = null;
        this.fieldLinesGroup = null;
        this.fieldArrows = [];

        // Sistemas de partículas 3D
        this.sparksGroup = null;
        this.smokeParticles = [];
        this.smokeGroup = null;

        // Animación de cámara
        this.targetCameraPos = null;
        this.isTransitioningCamera = false;
        this.showVectors = true;
        this.autoRotateCamera = false;
    }

    init(containerElement) {
        if (!containerElement || typeof THREE === 'undefined') {
            console.error('Three.js no está disponible o contenedor no encontrado.');
            return false;
        }

        this.container = containerElement;
        const width = this.container.clientWidth || 600;
        const height = this.container.clientHeight || 500;

        // 1. Escena
        this.scene = new THREE.Scene();

        // 2. Cámara
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
        this.camera.position.set(7.5, 5.5, 9.5);

        // 3. Renderizador WebGL
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // 4. OrbitControls
        if (typeof THREE.OrbitControls !== 'undefined') {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.06;
            this.controls.minDistance = 4.5;
            this.controls.maxDistance = 22;
            this.controls.maxPolarAngle = Math.PI / 2 + 0.12; // Permitir ligero ángulo desde abajo
            this.controls.target.set(0, 0.2, 0);
        }

        // 5. Iluminación de Laboratorio
        this.setupLighting();

        // 6. Construcción del Modelo 3D del Motor
        this.buildMotorModel();

        // 7. Sistemas de Flujo Magnético, Chispas y Humo
        this.buildMagneticFieldLines();
        this.buildParticleSystems();

        // 8. Eventos de redimensión
        window.addEventListener('resize', () => this.onResize());
        if (window.ResizeObserver) {
            new ResizeObserver(() => this.onResize()).observe(this.container);
        }

        this.initialized = true;
        return true;
    }

    setupLighting() {
        // Luz ambiental suave
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
        this.scene.appendChild ? this.scene.appendChild(ambientLight) : this.scene.add(ambientLight);

        // Luz direccional principal (Key Light)
        const keyLight = new THREE.DirectionalLight(0xffffff, 0.95);
        keyLight.position.set(8, 12, 10);
        keyLight.castShadow = true;
        this.scene.add(keyLight);

        // Luz de relleno azulada desde atrás
        const fillLight = new THREE.DirectionalLight(0x7850ff, 0.45);
        fillLight.position.set(-8, 6, -8);
        this.scene.add(fillLight);

        // Luz cian de resplandor para resaltar el entrehierro
        const rimCyan = new THREE.PointLight(0x00c8ff, 1.2, 16);
        rimCyan.position.set(0, 2, 4);
        this.scene.add(rimCyan);

        // Luz inferior cálida
        const bottomLight = new THREE.PointLight(0xffaa00, 0.4, 10);
        bottomLight.position.set(0, -3.5, 0);
        this.scene.add(bottomLight);
    }

    buildMotorModel() {
        this.rootGroup = new THREE.Group();
        this.scene.add(this.rootGroup);

        // =============================================
        // Pedestal y Base de Soporte
        // =============================================
        const baseGeo = new THREE.CylinderGeometry(4.8, 5.2, 0.35, 48);
        const baseMat = new THREE.MeshStandardMaterial({
            color: 0x0f172a,
            metalness: 0.8,
            roughness: 0.3
        });
        const baseMesh = new THREE.Mesh(baseGeo, baseMat);
        baseMesh.position.y = -3.8;
        baseMesh.receiveShadow = true;
        this.rootGroup.add(baseMesh);

        // Anillo neón cian en la base
        const ringGeo = new THREE.TorusGeometry(4.7, 0.04, 16, 64);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x00c8ff });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2;
        ringMesh.position.y = -3.62;
        this.rootGroup.add(ringMesh);

        // Soportes de cojinetes superior e inferior
        const bearingGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.4, 24);
        const bearingMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9, roughness: 0.2 });
        const bearingTop = new THREE.Mesh(bearingGeo, bearingMat);
        bearingTop.position.set(0, 3.4, 0);
        this.rootGroup.add(bearingTop);

        const bearingBottom = new THREE.Mesh(bearingGeo, bearingMat);
        bearingBottom.position.set(0, -3.2, 0);
        this.rootGroup.add(bearingBottom);

        // =============================================
        // Estator: Imanes N (Rojo) y S (Azul)
        // =============================================
        this.statorGroup = new THREE.Group();
        this.rootGroup.add(this.statorGroup);

        this.magnetNMaterial = new THREE.MeshStandardMaterial({
            color: 0xd90429,
            metalness: 0.3,
            roughness: 0.35
        });

        this.magnetSMaterial = new THREE.MeshStandardMaterial({
            color: 0x1d4ed8,
            metalness: 0.3,
            roughness: 0.35
        });

        // Imán Norte (Izquierda)
        const magnetGeo = new THREE.BoxGeometry(1.6, 5.2, 3.2);
        this.magnetNMesh = new THREE.Mesh(magnetGeo, this.magnetNMaterial);
        this.magnetNMesh.position.set(-3.6, 0.2, 0);
        this.magnetNMesh.castShadow = true;
        this.magnetNMesh.receiveShadow = true;
        this.statorGroup.add(this.magnetNMesh);

        // Placas identificadoras N en las caras exteriores del imán
        this.attachMagnetFaceLabels(this.magnetNMesh, 'N', 'NORTE', '#ff4466');

        // Imán Sur (Derecha)
        this.magnetSMesh = new THREE.Mesh(magnetGeo, this.magnetSMaterial);
        this.magnetSMesh.position.set(3.6, 0.2, 0);
        this.magnetSMesh.castShadow = true;
        this.magnetSMesh.receiveShadow = true;
        this.statorGroup.add(this.magnetSMesh);

        // Placas identificadoras S en las caras exteriores del imán
        this.attachMagnetFaceLabels(this.magnetSMesh, 'S', 'SUR', '#38bdf8');

        // Yugo magnético exterior (arco de hierro que cierra el flujo del estator)
        const yokeMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.4 });
        const yokeTopGeo = new THREE.CylinderGeometry(4.2, 4.2, 0.4, 32, 1, false, 0, Math.PI);
        const yokeTop = new THREE.Mesh(yokeTopGeo, yokeMat);
        yokeTop.position.set(0, 2.9, 0);
        this.statorGroup.add(yokeTop);

        // =============================================
        // Rotor y Eje Central
        // =============================================
        this.rotorGroup = new THREE.Group();
        this.rootGroup.add(this.rotorGroup);

        // Eje de acero cromado
        const shaftGeo = new THREE.CylinderGeometry(0.18, 0.18, 7.8, 32);
        const shaftMat = new THREE.MeshStandardMaterial({
            color: 0xe2e8f0,
            metalness: 0.95,
            roughness: 0.15
        });
        this.shaftMesh = new THREE.Mesh(shaftGeo, shaftMat);
        this.shaftMesh.castShadow = true;
        this.rotorGroup.add(this.shaftMesh);

        // =============================================
        // Bobina / Devanado de Cobre Rectangular
        // =============================================
        this.coilGroup = new THREE.Group();
        this.rotorGroup.add(this.coilGroup);

        this.copperMaterial = new THREE.MeshStandardMaterial({
            color: 0xcd7f32,
            metalness: 0.85,
            roughness: 0.22,
            emissive: 0x000000,
            emissiveIntensity: 0
        });

        // Conductores verticales (lados activos donde actúa Lorentz)
        const condSideGeo = new THREE.CylinderGeometry(0.14, 0.14, 3.8, 16);
        this.conductorFrontMesh = new THREE.Mesh(condSideGeo, this.copperMaterial);
        this.conductorFrontMesh.position.set(1.8, 0.2, 0);
        this.conductorFrontMesh.castShadow = true;
        this.coilGroup.add(this.conductorFrontMesh);

        this.conductorBackMesh = new THREE.Mesh(condSideGeo, this.copperMaterial);
        this.conductorBackMesh.position.set(-1.8, 0.2, 0);
        this.conductorBackMesh.castShadow = true;
        this.coilGroup.add(this.conductorBackMesh);

        // Cruces superior e inferior para cerrar la espira
        const crossGeo = new THREE.CylinderGeometry(0.12, 0.12, 3.6, 16);
        this.conductorTopMesh = new THREE.Mesh(crossGeo, this.copperMaterial);
        this.conductorTopMesh.rotation.z = Math.PI / 2;
        this.conductorTopMesh.position.set(0, 2.1, 0);
        this.coilGroup.add(this.conductorTopMesh);

        this.conductorBottomMesh = new THREE.Mesh(crossGeo, this.copperMaterial);
        this.conductorBottomMesh.rotation.z = Math.PI / 2;
        this.conductorBottomMesh.position.set(0, -1.7, 0);
        this.coilGroup.add(this.conductorBottomMesh);

        // Brazos conectores hacia el conmutador
        const leadGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.8, 12);
        const lead1 = new THREE.Mesh(leadGeo, this.copperMaterial);
        lead1.position.set(0.2, -2.1, 0);
        this.coilGroup.add(lead1);

        const lead2 = new THREE.Mesh(leadGeo, this.copperMaterial);
        lead2.position.set(-0.2, -2.1, 0);
        this.coilGroup.add(lead2);

        // =============================================
        // Conmutador (Split-Ring Commutator)
        // =============================================
        this.commutatorGroup = new THREE.Group();
        this.commutatorGroup.position.set(0, -2.5, 0);
        this.rotorGroup.add(this.commutatorGroup);

        const commMat = new THREE.MeshStandardMaterial({
            color: 0xd97706,
            metalness: 0.9,
            roughness: 0.25
        });

        // Segmento 1 (delga semicilíndrica)
        const segGeo1 = new THREE.CylinderGeometry(0.48, 0.48, 0.65, 24, 1, false, 0.12, Math.PI - 0.24);
        const commSeg1 = new THREE.Mesh(segGeo1, commMat);
        this.commutatorGroup.add(commSeg1);

        // Segmento 2 (delga semicilíndrica opuesta)
        const segGeo2 = new THREE.CylinderGeometry(0.48, 0.48, 0.65, 24, 1, false, Math.PI + 0.12, Math.PI - 0.24);
        const commSeg2 = new THREE.Mesh(segGeo2, commMat);
        this.commutatorGroup.add(commSeg2);

        // Aislante interno entre delgas
        const insGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.68, 24);
        const insMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
        const insulator = new THREE.Mesh(insGeo, insMat);
        this.commutatorGroup.add(insulator);

        // =============================================
        // Escobillas de Grafito y Bornes de Alimentación DC
        // =============================================
        const brushMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.2, roughness: 0.85 });
        const brushHolderMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8, roughness: 0.3 });
        const terminalMetalMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.9, roughness: 0.2 });
        const wirePosMat = new THREE.MeshStandardMaterial({ color: 0xff2a4d, roughness: 0.5 });
        const wireNegMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.5 });
        const brushGeo = new THREE.BoxGeometry(0.28, 0.32, 0.35);

        // Escobilla izquierda (Polo Positivo +)
        const brushLeft = new THREE.Mesh(brushGeo, brushMat);
        brushLeft.position.set(-0.62, -2.5, 0);
        this.statorGroup.add(brushLeft);

        const brushHolderL = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.22), brushHolderMat);
        brushHolderL.position.set(-0.9, -2.5, 0);
        this.statorGroup.add(brushHolderL);

        // Borne terminal positivo (+) de latón
        const terminalL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.26, 16), terminalMetalMat);
        terminalL.position.set(-1.14, -2.5, 0);
        this.statorGroup.add(terminalL);

        // Placas de polaridad en el borne izquierdo (+)
        this.attachPolarityBadge(brushHolderL, '+', 'POS', '#ff3355', 0.42, 0.13);

        // Escobilla derecha (Polo Negativo −)
        const brushRight = new THREE.Mesh(brushGeo, brushMat);
        brushRight.position.set(0.62, -2.5, 0);
        this.statorGroup.add(brushRight);

        const brushHolderR = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.22), brushHolderMat);
        brushHolderR.position.set(0.9, -2.5, 0);
        this.statorGroup.add(brushHolderR);

        // Borne terminal negativo (−) de latón
        const terminalR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.26, 16), terminalMetalMat);
        terminalR.position.set(1.14, -2.5, 0);
        this.statorGroup.add(terminalR);

        // Placas de polaridad en el borne derecho (−)
        this.attachPolarityBadge(brushHolderR, '−', 'NEG', '#38bdf8', 0.42, 0.13);

        // =============================================
        // Regleta de Alimentación DC en la Base del Estator
        // =============================================
        const dcBlockMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.7, roughness: 0.35 });
        const dcBlockGeo = new THREE.BoxGeometry(2.3, 0.32, 0.65);
        const dcBlock = new THREE.Mesh(dcBlockGeo, dcBlockMat);
        dcBlock.position.set(0, -3.42, 0.75);
        this.statorGroup.add(dcBlock);

        // Borne banana positivo rojo (+) en la regleta base
        const bananaGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.24, 16);
        const bananaPos = new THREE.Mesh(bananaGeo, new THREE.MeshStandardMaterial({ color: 0xd90429, metalness: 0.3, roughness: 0.3 }));
        bananaPos.position.set(-0.68, -3.22, 0.75);
        this.statorGroup.add(bananaPos);
        this.attachPolarityBadge(bananaPos, '+', '12V', '#ff3355', 0.26, 0.12);

        // Borne banana negativo azul (−) en la regleta base
        const bananaNeg = new THREE.Mesh(bananaGeo, new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.3, roughness: 0.3 }));
        bananaNeg.position.set(0.68, -3.22, 0.75);
        this.statorGroup.add(bananaNeg);
        this.attachPolarityBadge(bananaNeg, '−', 'GND', '#38bdf8', 0.26, 0.12);

        // Cables flexibles de conexión conectando bornas con escobillas
        const wireRadius = 0.04;
        const curvePos = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-1.14, -2.5, 0),
            new THREE.Vector3(-1.25, -2.9, 0.35),
            new THREE.Vector3(-0.95, -3.28, 0.68),
            new THREE.Vector3(-0.68, -3.22, 0.75)
        ]);
        const wirePosMesh = new THREE.Mesh(new THREE.TubeGeometry(curvePos, 20, wireRadius, 8, false), wirePosMat);
        this.statorGroup.add(wirePosMesh);

        const curveNeg = new THREE.CatmullRomCurve3([
            new THREE.Vector3(1.14, -2.5, 0),
            new THREE.Vector3(1.25, -2.9, 0.35),
            new THREE.Vector3(0.95, -3.28, 0.68),
            new THREE.Vector3(0.68, -3.22, 0.75)
        ]);
        const wireNegMesh = new THREE.Mesh(new THREE.TubeGeometry(curveNeg, 20, wireRadius, 8, false), wireNegMat);
        this.statorGroup.add(wireNegMesh);

        // =============================================
        // Flechas Vectoriales Dinámicas en 3D
        // =============================================
        this.buildVectorArrows();
    }

    attachMagnetFaceLabels(parentMesh, letter, subtitle, accentColor) {
        // Generar textura de alta resolución en canvas 512x512
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Fondo oscuro de placa técnica
        ctx.fillStyle = 'rgba(10, 15, 26, 0.9)';
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(16, 16, 480, 480, 40);
        } else {
            ctx.rect(16, 16, 480, 480);
        }
        ctx.fill();

        // Marco neon brillante
        ctx.lineWidth = 16;
        ctx.strokeStyle = accentColor;
        ctx.shadowColor = accentColor;
        ctx.shadowBlur = 24;
        ctx.stroke();

        // Letra principal grande ("N" o "S")
        ctx.shadowBlur = 35;
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 260px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(letter, 256, 215);

        // Subtítulo ("NORTE" o "SUR")
        ctx.shadowBlur = 12;
        ctx.fillStyle = accentColor;
        ctx.font = 'bold 50px Orbitron, sans-serif';
        ctx.fillText(subtitle, 256, 385);

        const texture = new THREE.CanvasTexture(canvas);
        texture.anisotropy = 4;

        // Material con polygonOffset y depthWrite para evitar z-fighting
        const plateMat = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -2,
            polygonOffsetUnits: -2
        });

        const plateGeo = new THREE.PlaneGeometry(1.35, 1.35);

        // 1. Placa FRONTAL (mirando a +Z hacia el usuario, en z = +1.62 sobre la superficie)
        const frontPlate = new THREE.Mesh(plateGeo, plateMat);
        frontPlate.position.set(0, 0.4, 1.62);
        frontPlate.rotation.set(0, 0, 0);
        parentMesh.add(frontPlate);

        // 2. Placa TRASERA (mirando a -Z, en z = -1.62)
        const backPlate = new THREE.Mesh(plateGeo, plateMat);
        backPlate.position.set(0, 0.4, -1.62);
        backPlate.rotation.set(0, Math.PI, 0);
        parentMesh.add(backPlate);

        // 3. Placa SUPERIOR (mirando a +Y, en y = +2.62)
        const topPlate = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), plateMat);
        topPlate.position.set(0, 2.62, 0);
        topPlate.rotation.set(-Math.PI / 2, 0, 0);
        parentMesh.add(topPlate);
    }

    attachPolarityBadge(parentMesh, symbol, subtitle, accentColor, size = 0.38, zOffset = 0.12) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // Círculo de fondo con estilo técnico oscuro
        ctx.fillStyle = 'rgba(8, 12, 22, 0.95)';
        ctx.beginPath();
        ctx.arc(128, 128, 116, 0, Math.PI * 2);
        ctx.fill();

        // Borde circular de neón brillante
        ctx.lineWidth = 14;
        ctx.strokeStyle = accentColor;
        ctx.shadowColor = accentColor;
        ctx.shadowBlur = 20;
        ctx.stroke();

        // Símbolo grande (+ o −)
        ctx.shadowBlur = 30;
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 130px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(symbol, 128, 110);

        // Subtítulo técnico
        ctx.shadowBlur = 10;
        ctx.fillStyle = accentColor;
        ctx.font = 'bold 30px Orbitron, sans-serif';
        ctx.fillText(subtitle, 128, 195);

        const texture = new THREE.CanvasTexture(canvas);
        texture.anisotropy = 4;

        const plateMat = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -2,
            polygonOffsetUnits: -2
        });

        const plateGeo = new THREE.PlaneGeometry(size, size);

        // Placa frontal (mirando a +Z)
        const frontPlate = new THREE.Mesh(plateGeo, plateMat);
        frontPlate.position.set(0, 0, zOffset);
        parentMesh.add(frontPlate);

        // Placa trasera (mirando a -Z)
        const backPlate = new THREE.Mesh(plateGeo, plateMat);
        backPlate.position.set(0, 0, -zOffset);
        backPlate.rotation.set(0, Math.PI, 0);
        parentMesh.add(backPlate);
    }

    buildVectorArrows() {
        // Flechas de Fuerza de Lorentz en los lados activos
        // En Conductor 1: apunta en +Z o -Z
        const dirZ = new THREE.Vector3(0, 0, 1);
        const origin1 = new THREE.Vector3(1.8, 0.2, 0);
        this.arrowForceFront = new THREE.ArrowHelper(dirZ, origin1, 1.4, 0x44ff88, 0.45, 0.25);
        this.coilGroup.add(this.arrowForceFront);

        // En Conductor 2: apunta en sentido opuesto
        const dirOppZ = new THREE.Vector3(0, 0, -1);
        const origin2 = new THREE.Vector3(-1.8, 0.2, 0);
        this.arrowForceBack = new THREE.ArrowHelper(dirOppZ, origin2, 1.4, 0x44ff88, 0.45, 0.25);
        this.coilGroup.add(this.arrowForceBack);

        // Flechas de Corriente Eléctrica (I) a lo largo del conductor
        const dirUp = new THREE.Vector3(0, 1, 0);
        const curOrigin1 = new THREE.Vector3(1.8, -0.6, 0);
        this.arrowCurrentFront = new THREE.ArrowHelper(dirUp, curOrigin1, 1.1, 0xffdd44, 0.35, 0.2);
        this.coilGroup.add(this.arrowCurrentFront);

        const dirDown = new THREE.Vector3(0, -1, 0);
        const curOrigin2 = new THREE.Vector3(-1.8, 0.6, 0);
        this.arrowCurrentBack = new THREE.ArrowHelper(dirDown, curOrigin2, 1.1, 0xffdd44, 0.35, 0.2);
        this.coilGroup.add(this.arrowCurrentBack);
    }

    buildMagneticFieldLines() {
        this.fieldLinesGroup = new THREE.Group();
        this.rootGroup.add(this.fieldLinesGroup);

        const numLines = 8;
        const yStarts = [-1.4, -0.9, -0.4, 0.1, 0.6, 1.1, 1.6, 2.1];
        const zPositions = [-0.8, -0.3, 0.3, 0.8];

        for (let i = 0; i < numLines; i++) {
            const y = yStarts[i];
            const z = zPositions[i % zPositions.length];

            // Línea discontinua luminosa
            const points = [new THREE.Vector3(-2.8, y, z), new THREE.Vector3(2.8, y, z)];
            const geo = new THREE.BufferGeometry().setFromPoints(points);
            const mat = new THREE.LineDashedMaterial({
                color: 0x00c8ff,
                dashSize: 0.35,
                gapSize: 0.25,
                linewidth: 1.5,
                transparent: true,
                opacity: 0.65
            });

            const line = new THREE.Line(geo, mat);
            line.computeLineDistances();
            this.fieldLinesGroup.add(line);

            // Flechita guía en el centro
            const arrowDir = new THREE.Vector3(1, 0, 0);
            const arrowOrigin = new THREE.Vector3(-1.0 + (i % 3) * 0.8, y, z);
            const arrow = new THREE.ArrowHelper(arrowDir, arrowOrigin, 0.45, 0x00c8ff, 0.2, 0.12);
            arrow.line.material.transparent = true;
            arrow.line.material.opacity = 0.7;
            this.fieldLinesGroup.add(arrow);
            this.fieldArrows.push({ arrow, initialX: arrowOrigin.x, y, z });
        }
    }

    buildParticleSystems() {
        // =============================================
        // Chispas 3D en las Escobillas
        // =============================================
        this.sparksGroup = new THREE.Group();
        this.rootGroup.add(this.sparksGroup);

        const sparkCount = 40;
        const sparkGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(sparkCount * 3);
        const colors = new Float32Array(sparkCount * 3);

        for (let i = 0; i < sparkCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 0.4;
            positions[i * 3 + 1] = -2.5 + (Math.random() - 0.5) * 0.3;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 0.4;

            colors[i * 3] = 0;
            colors[i * 3 + 1] = 0.9;
            colors[i * 3 + 2] = 1;
        }

        sparkGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        sparkGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const sparkMat = new THREE.PointsMaterial({
            size: 0.16,
            vertexColors: true,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending
        });

        this.sparksPoints = new THREE.Points(sparkGeo, sparkMat);
        this.sparksGroup.add(this.sparksPoints);

        // =============================================
        // Humo 3D Térmico
        // =============================================
        this.smokeGroup = new THREE.Group();
        this.rootGroup.add(this.smokeGroup);

        const smokeCount = 20;
        const smokeGeo = new THREE.SphereGeometry(0.18, 8, 8);
        const smokeMat = new THREE.MeshBasicMaterial({
            color: 0x94a3b8,
            transparent: true,
            opacity: 0
        });

        for (let i = 0; i < smokeCount; i++) {
            const mesh = new THREE.Mesh(smokeGeo, smokeMat.clone());
            mesh.position.set(
                (Math.random() - 0.5) * 0.8,
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.8
            );
            mesh.userData = {
                speedY: 0.03 + Math.random() * 0.04,
                speedX: (Math.random() - 0.5) * 0.02,
                life: Math.random(),
                baseScale: 0.8 + Math.random() * 0.6
            };
            this.smokeGroup.add(mesh);
            this.smokeParticles.push(mesh);
        }
    }

    /**
     * Actualiza la geometría cuando el usuario mueve los deslizadores (r, L, N)
     */
    updateGeometry(state) {
        if (!this.initialized) return;

        // Escalar anchura según el radio r
        const rVisual = 1.0 + (state.radius / 0.15) * 1.8; // 1.0 .. 2.8 unidades 3D
        this.conductorFrontMesh.position.x = rVisual;
        this.conductorBackMesh.position.x = -rVisual;

        this.conductorTopMesh.scale.y = rVisual / 1.8;
        this.conductorBottomMesh.scale.y = rVisual / 1.8;

        // Escalar altura según la longitud L
        const hVisual = 2.4 + (state.length / 0.5) * 2.8; // 2.4 .. 5.2 unidades 3D
        this.conductorFrontMesh.scale.y = hVisual / 3.8;
        this.conductorBackMesh.scale.y = hVisual / 3.8;

        this.conductorTopMesh.position.y = (hVisual / 2) + 0.15;
        this.conductorBottomMesh.position.y = -(hVisual / 2) + 0.15;

        // Grosor del conductor según vueltas N
        const nNorm = Math.min(1, state.turns / 500);
        const thickness = 0.8 + nNorm * 0.8;
        this.conductorFrontMesh.scale.x = thickness;
        this.conductorFrontMesh.scale.z = thickness;
        this.conductorBackMesh.scale.x = thickness;
        this.conductorBackMesh.scale.z = thickness;

        // Actualizar orígenes de flechas de fuerza y corriente
        this.arrowForceFront.position.set(rVisual, 0.2, 0);
        this.arrowForceBack.position.set(-rVisual, 0.2, 0);
        this.arrowCurrentFront.position.set(rVisual, -0.6, 0);
        this.arrowCurrentBack.position.set(-rVisual, 0.6, 0);
    }

    /**
     * Bucle de actualización por frame sincronizado con app.js
     */
    update(state, dt) {
        if (!this.initialized || !this.renderer) return;

        // 1. Rotación del rotor
        this.rotorGroup.rotation.y = state.angle;

        // 2. Efecto térmico en el cobre: brillo e incandescencia
        const heatNorm = Math.min(1, state.powerJouleLoss / 65);
        if (heatNorm > 0.45) {
            this.copperMaterial.color.setHex(0xff3311); // Rojo incandescente
            this.copperMaterial.emissive.setHex(0xff2200);
            this.copperMaterial.emissiveIntensity = heatNorm * 1.5;
        } else if (heatNorm > 0.25) {
            this.copperMaterial.color.setHex(0xff7700); // Naranja cálido
            this.copperMaterial.emissive.setHex(0xaa3300);
            this.copperMaterial.emissiveIntensity = heatNorm * 0.8;
        } else {
            this.copperMaterial.color.setHex(0xcd7f32); // Cobre natural
            this.copperMaterial.emissive.setHex(0x000000);
            this.copperMaterial.emissiveIntensity = 0;
        }

        // 3. Flechas de Fuerza y Corriente
        if (this.showVectors && state.current > 0.01 && !state.breakerTripped) {
            this.arrowForceFront.visible = true;
            this.arrowForceBack.visible = true;
            this.arrowCurrentFront.visible = true;
            this.arrowCurrentBack.visible = true;

            // Escala de longitud de la flecha de fuerza
            const fLen = Math.min(2.8, 0.5 + (state.force / 4.5) * 1.8);
            this.arrowForceFront.setLength(fLen, 0.35, 0.2);
            this.arrowForceBack.setLength(fLen, 0.35, 0.2);

            // Inversión de corriente por conmutador cada media vuelta
            const half = Math.floor(state.angle / Math.PI) % 2;
            const up = half === 0;

            this.arrowCurrentFront.setDirection(new THREE.Vector3(0, up ? 1 : -1, 0));
            this.arrowCurrentBack.setDirection(new THREE.Vector3(0, up ? -1 : 1, 0));
        } else {
            this.arrowForceFront.visible = false;
            this.arrowForceBack.visible = false;
            this.arrowCurrentFront.visible = false;
            this.arrowCurrentBack.visible = false;
        }

        // 4. Animación del flujo magnético
        const fluxSpeed = 0.8 + (state.bField / 1.5) * 2.5;
        this.fieldArrows.forEach(item => {
            item.arrow.position.x += fluxSpeed * dt;
            if (item.arrow.position.x > 2.6) {
                item.arrow.position.x = -2.6;
            }
        });

        // 5. Chispas 3D en las escobillas
        const hasArcing = state.running && !state.breakerTripped && (state.voltage > 19 || state.current > 4.2);
        if (hasArcing) {
            this.sparksPoints.material.opacity = 0.95;
            const positions = this.sparksPoints.geometry.attributes.position.array;
            const sparkCount = positions.length / 3;

            for (let i = 0; i < sparkCount; i++) {
                const side = i % 2 === 0 ? -0.62 : 0.62;
                positions[i * 3] = side + (Math.random() - 0.5) * 0.45;
                positions[i * 3 + 1] = -2.5 + (Math.random() - 0.5) * 0.35;
                positions[i * 3 + 2] = (Math.random() - 0.5) * 0.45;
            }
            this.sparksPoints.geometry.attributes.position.needsUpdate = true;
        } else {
            this.sparksPoints.material.opacity = 0;
        }

        // 6. Humo 3D Térmico
        const isSmoking = state.running && !state.breakerTripped && state.powerJouleLoss > 45;
        this.smokeParticles.forEach(p => {
            if (isSmoking) {
                p.material.opacity = Math.max(0, 0.45 * (1 - p.userData.life));
                p.position.y += p.userData.speedY;
                p.position.x += p.userData.speedX;
                p.userData.life += dt * 0.8;

                const sc = p.userData.baseScale * (1 + p.userData.life * 1.8);
                p.scale.set(sc, sc, sc);

                if (p.userData.life >= 1.0) {
                    p.userData.life = 0;
                    p.position.set((Math.random() - 0.5) * 0.7, -0.4, (Math.random() - 0.5) * 0.7);
                }
            } else {
                p.material.opacity = 0;
            }
        });

        // 7. Vibración física en sobrevelocidad
        const currentRpm = (state.omega * 60) / (2 * Math.PI);
        if (state.running && currentRpm > 2900) {
            this.rootGroup.position.x = (Math.random() - 0.5) * 0.05;
            this.rootGroup.position.z = (Math.random() - 0.5) * 0.05;
        } else {
            this.rootGroup.position.set(0, 0, 0);
        }

        // 8. Auto-rotación y transición de cámara
        if (this.controls) {
            this.controls.autoRotate = this.autoRotateCamera;
            this.controls.autoRotateSpeed = 1.5;
            this.controls.update();
        }

        if (this.isTransitioningCamera && this.targetCameraPos) {
            this.camera.position.lerp(this.targetCameraPos, 0.08);
            if (this.camera.position.distanceTo(this.targetCameraPos) < 0.08) {
                this.isTransitioningCamera = false;
            }
        }

        // Renderizado final del frame 3D
        this.renderer.render(this.scene, this.camera);
    }

    setCameraView(type) {
        if (!this.camera || !this.controls) return;
        this.isTransitioningCamera = true;
        this.autoRotateCamera = false;

        switch (type) {
            case 'isometric':
                this.targetCameraPos = new THREE.Vector3(7.5, 5.5, 9.5);
                this.controls.target.set(0, 0.2, 0);
                break;
            case 'front':
                this.targetCameraPos = new THREE.Vector3(0, 0.5, 11.5);
                this.controls.target.set(0, 0.2, 0);
                break;
            case 'top':
                this.targetCameraPos = new THREE.Vector3(0.1, 13.5, 0.1);
                this.controls.target.set(0, 0, 0);
                break;
            case 'commutator':
                this.targetCameraPos = new THREE.Vector3(0, -2.1, 4.2);
                this.controls.target.set(0, -2.5, 0);
                break;
        }
    }

    toggleVectors(visible) {
        this.showVectors = visible;
        if (this.arrowForceFront) {
            this.arrowForceFront.visible = visible;
            this.arrowForceBack.visible = visible;
            this.arrowCurrentFront.visible = visible;
            this.arrowCurrentBack.visible = visible;
        }
    }

    toggleAutoRotate() {
        this.autoRotateCamera = !this.autoRotateCamera;
        return this.autoRotateCamera;
    }

    resetCamera() {
        this.setCameraView('isometric');
    }

    onResize() {
        if (!this.container || !this.renderer || !this.camera) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight || 500;
        if (width === 0 || height === 0) return;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
}

// Instancia global del visor 3D
window.motor3D = new Motor3D();
