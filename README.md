# ElectroSpin - Simulador Avanzado de Motor DC

Simulador web interactivo de alto rendimiento para el análisis, diagnóstico físico y visualización de un motor de corriente continua (DC). Integra principios fundamentales de Electricidad, Magnetismo y Termodinámica aplicada (fuerza de Lorentz, ley de Ohm, contrafuerza electromotriz, efecto Joule y límites dieléctricos) con técnicas modernas de desarrollo frontend e ingeniería visual.

## Contenido de la Aplicación

| Sección | Descripción |
|---------|-------------|
| **Vista anatómica** | Figura isométrica en corte de un motor DC de imanes permanentes (~70 piezas: carcasa, imanes N/S, inducido laminado, devanado de cobre, colector de 24 delgas, escobillas con muelle, anillo portaescobillas, rodamientos, tapas, polea, bornera y cables). Al pasar el cursor o elegir una pieza de la lista se resalta y se muestra su descripción y su relación con las variables del simulador. La cámara se gira arrastrando (azimut 15°–80°, elevación 12°–58°), se acerca con la rueda o pellizcando y se desplaza con Mayús o el botón derecho; doble clic vuelve a la vista inicial. «Desmontar» (o el deslizador «Despiece») separa el motor en el orden real de desarme: cables, polea y tapas, anillo portaescobillas y, por último, el inducido. |
| **Esquema 2D** | Vista alternativa de una sola espira entre los polos N y S, con el sentido de la corriente (▲/▼) y de la fuerza (⊙/⊗) según F = I·L × B; el colector invierte la corriente de cada lado al cruzar el plano neutro. |
| **Lecturas en tiempo real** | Velocidad (RPM), corriente (I), par (τ), fuerza de Lorentz (F), potencia eléctrica (P), contrafem y eficiencia (η), en una franja sobre el visor. |
| **Panel de control** | Iniciar/detener, reiniciar y ajuste seguro; escenarios de prueba; seis deslizadores: tensión V (0–30 V), resistencia R (0,5–50 Ω), campo B (0,05–2 T), longitud activa L (0,05–0,5 m), vueltas N (10–500) y radio del rotor r (0,01–0,15 m). |
| **Escenarios** | *Nominal 12 V* (12 V, 5 Ω), *Máxima eficiencia* (16 V, 10 Ω, 1,2 T), *Sobrevoltaje* (25 V), *Sobrevelocidad* (26 V con B = 0,05 T) y *Sobrecarga térmica* (28 V, 1 Ω). |
| **Seguridad** | Índice de estrés global, indicadores de tensión, corriente, calor I²R y velocidad con su límite, ventana de diagnóstico y disyuntor térmico con disparo automático. |
| **Cómo funciona** | Seis tarjetas con las ecuaciones que resuelve el simulador (Lorentz, par, Ley de Ohm del inducido, contrafem, conmutación, potencia y calor) y los deslizadores que afectan a cada una. |

---

## Límites de seguridad

Cada magnitud tiene un umbral de precaución y uno crítico. Al pasar a zona crítica se abre la ventana de diagnóstico con el problema, lo que le ocurriría a un motor real y qué hacer.

| Magnitud | Precaución | Crítico | Qué ocurriría en un motor real |
|----------|-----------|---------|--------------------------------|
| Tensión V | > 18 V | > 22 V | Arco entre delgas del colector y carbonización de las escobillas. |
| Corriente I | > 3,5 A | > 5 A | Sobrecalentamiento del bobinado. |
| Calor I²R | > 35 W | > 55 W | El esmalte de las espiras se degrada (> 180 °C): cortocircuito entre espiras, humo y riesgo de fuego. |
| Resistencia R | — | < 2 Ω con V ≥ 12 V | Condición de casi cortocircuito. |
| Velocidad | > 2800 RPM | > 3300 RPM | Deformación del devanado por fuerza centrífuga y daño en los rodamientos. |

- **Disyuntor térmico:** si el motor sigue en zona crítica más de 5 segundos seguidos, corta la alimentación. Se rearma con un clic.
- **Ventana de diagnóstico:** ofrece «Parámetros seguros (12 V)» o «Seguir en modo experimental».

---

## Efectos visuales y sonoros

- **Chispas** en las escobillas con más de 19 V o más de 4,2 A, en ambas vistas.
- **Calentamiento:** el devanado pasa de cobre a rojo al aumentar la pérdida Joule.
- **Humo** (esquema 2D) cuando el calor supera 45 W.
- **Vibración** del esquema 2D por encima de 2800 RPM.
- **Sonido (Web Audio API):** zumbido cuya frecuencia sigue a la velocidad angular ω, chasquidos de chispas, pitido de alerta y corte del disyuntor. Se activa con el botón del altavoz.

---

## Cómo Ejecutar

No requiere compilación ni dependencias para usarse: es HTML5, CSS3 y JavaScript nativo. Solo regenerar la vista anatómica necesita Node 18+.

**Opción 1 - Abrir directamente:**
Haz doble clic sobre el archivo `index.html` en tu navegador favorito.

**Opción 2 - Servidor local con Python:**
```bash
python -m http.server 8000
```
Luego accede a `http://localhost:8000`.

---

## Estructura del Proyecto

```
ElectroSpin/
├── index.html              # Página: visor, panel de control, «Cómo funciona» y ventana de diagnóstico
├── css/
│   ├── styles.css          # Diseño de la página (grafito + cobre), modal y responsive
│   ├── iso.css             # Estilos del kit isométrico (generado)
│   └── motor-anatomy.css   # Integración de la vista anatómica
├── js/
│   ├── app.js              # Dinámica física, sistema de diagnóstico, Web Audio y presets
│   └── motor-anatomy.js    # Vista anatómica (generado: no editar a mano)
└── tools/anatomy/
    ├── figure.mjs          # Geometría del motor para cualquier cámara y grado de despiece
    ├── build.mjs           # Empaqueta kit + figura + runtime → node tools/anatomy/build.mjs
    ├── runtime.js          # Cámara, despiece, rotación, chispas, calor, piezas y descripciones
    ├── preview.html        # Vista previa aislada de la figura
    └── kit/                # Kit isométrico "anatomy" (MIT)
```

Para cambiar la figura, edita `tools/anatomy/figure.mjs` o `runtime.js` y regenera con `node tools/anatomy/build.mjs` (Node 18+).

---

## Autores del Proyecto

- **Julian Alejandro Gil Peralta**
- **Daniel Ramiro Galeano Teyes**
- **Juan David Galeano Barrera**

*Facultad de Ingeniería de Sistemas — 2026*