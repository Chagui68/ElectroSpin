# ElectroSpin - Simulador Avanzado de Motor DC

Simulador web interactivo de alto rendimiento para el análisis, diagnóstico físico y visualización de un motor de corriente continua (DC). Integra principios fundamentales de Electricidad, Magnetismo y Termodinámica aplicada (fuerza de Lorentz, ley de Ohm, contrafuerza electromotriz, efecto Joule y límites dieléctricos) con técnicas modernas de desarrollo frontend e ingeniería visual.

## Contenido de la Aplicación

| Sección | Descripción |
|---------|-------------|
| **Simulador 3D WebGL y 2D** | Visor 3D interactivo en tiempo real con WebGL y Three.js: orbitación 360°, zoom, paneo, vistas de cámara (isométrica, frontal, superior, conmutador), bobina volumétrica de cobre, eje cromado, conmutador con escobillas de grafito, flechas vectoriales 3D de Fuerza de Lorentz \(\vec{F}\) y Corriente \(\vec{I}\), flujo magnético tridimensional, chispas y humo 3D volumétrico, y opción de alternar al modo 2D en cualquier momento. |
| **Barra de Escenarios (Presets)** | Botones de prueba rápida para cargar instantáneamente regímenes operativos: *Nominal Seguro (12V)*, *Sobrevoltaje (24V)*, *Sobrecarga Térmica (30V, 1Ω)*, *Sobrevelocidad Crítica* y *Máxima Eficiencia*. |
| **Sistema de Diagnóstico y Seguridad** | Monitor de estrés global con barra dinámica de sobrecarga (0% a 150%+), chips de estado en tiempo real (Tensión, Corriente, Pérdida Joule $I^2R$, Velocidad RPM), aviso emergente interactivo y disyuntor térmico con disparo automático. |
| **Panel de Control** | Deslizadores interactivos con marcadores de zonas seguras y peligrosas: Voltaje (V: 0 a 30V), Resistencia del bobinado (R: 0.5 a 50Ω), Campo magnético (B: 0.05 a 2.0T), Longitud del conductor (L: 0.05 a 0.50m), Vueltas de la bobina (N: 10 a 500) y Radio del rotor (r: 0.01 a 0.15m). |
| **Lecturas en Tiempo Real** | Corriente neta (I), fuerza de Lorentz (F), torque mecánico (\(\tau\)), velocidad angular (\(\omega\)), régimen de giro (RPM), potencia eléctrica (P), contrafem (Back-EMF) y eficiencia porcentual (\(\eta\)). |
| **Efecto de cada Variable** | Explicación pedagógica de cómo afecta cada parámetro a las ecuaciones físicas, a la animación y a la seguridad operativa. |
| **Marco Teórico** | Tarjetas didácticas con fórmulas clave: Fuerza de Lorentz, Ley de Ohm, Torque, Back-EMF, Balance de Potencia, Conmutador e Inversión, y Efecto Joule con Límites de Seguridad Dieléctrica. |

---

## Mecánica de Alerta y Protección de Seguridad

El simulador incorpora un sistema activo de advertencias que le indica al usuario el problema exacto y las consecuencias físicas cuando se exceden los límites tolerables:

1. **⚡ Sobrevoltaje Crítico (\(V > 18\text{V} - 22\text{V}\)):**
   - **Problema:** La tensión aplicada supera la rigidez dieléctrica del aire y aislantes entre las delgas del conmutador.
   - **Consecuencias reales:** Se produce una ruptura dieléctrica que genera chispas y arco eléctrico destructivo permanente en las escobillas de grafito, carbonizando los contactos y arriesgando un cortocircuito hacia la carcasa.
2. **🔥 Sobrecorriente y Pérdida Joule Extrema (\(I > 4.5\text{A}\) o \(I^2 R > 50\text{W}\)):**
   - **Problema:** Resistencia muy baja (\(R < 2\ \Omega\)) combinada con alta tensión provoca un consumo desmedido de amperios.
   - **Consecuencias reales:** El calor disipado por efecto Joule derrite el esmalte de barniz de poliimida de las espiras a más de 180°C, originando cortocircuito interno entre espiras contiguas, desprendimiento de humo denso y peligro inminente de combustión/fuego.
3. **🌪️ Sobrevelocidad Mecánica (\(\text{RPM} > 3000\text{ - }3300\text{ RPM}\)):**
   - **Problema:** Campo magnético débil (\(B < 0.1\text{T}\)) o sobretensión extrema sin carga que elimina la contrafem protectora.
   - **Consecuencias reales:** Las fuerzas centrífugas deforman y desprenden los alambres de cobre del inducido, causando vibraciones de resonancia violenta y gripado de rodamientos.
4. **🛡️ Disparo Automático del Disyuntor Térmico:**
   - Si el motor se mantiene operando en sobrecarga crítica por más de 5 segundos consecutivos, el sistema de protección corta la corriente automáticamente (*TRIP*) para simular un fusible bimetálico real, protegiendo el devanado. El usuario puede rearmarlo con un clic.
5. **Aviso Emergente (Modal de Seguridad):**
   - Salta automáticamente en pantalla con un resumen técnico detallado del diagnóstico, las consecuencias y opciones de solución rápida (*"Calibrar a Parámetros Seguros (12V)"* o *"Continuar en Modo Experimental"*).

---

## Efectos Visuales y Sonoros

- **Arco voltaico dinámico (Chispas):** Generación vectorial en tiempo real de rayos y chispas eléctricas entre las delgas del conmutador y las escobillas.
- **Calentamiento incandescente:** El color del bobinado transiciona de cobre dorado a naranja vivo y rojo incandescente al aumentar la disipación térmica.
- **Partículas de humo:** Partículas animadas en SVG que se elevan desde el inducido cuando la temperatura sobrepasa el límite seguro.
- **Vibración mecánica:** Efecto de temblor en el chasis cuando el régimen sobrepasa las 3000 RPM.
- **Sintetizador Web Audio API:** Zumbido de motor con frecuencia modulada por la velocidad angular (\(\omega\)), chasquidos de chispas, pitido de alerta y sonido de corte de disyuntor.

---

## Cómo Ejecutar

No requiere compilación ni dependencias externas: es HTML5, CSS3 y JavaScript moderno nativo.

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
├── index.html      # Estructura semántica, SVG del motor, modal de alerta y diagnóstico
├── css/
    └── styles.css  # Tema Cyber-Lab, animaciones de chispas/humo, modal y responsive
└── js/
    └── app.js      # Dinámica física, sistema de diagnóstico, Web Audio y presets
```

---

## Autores del Proyecto

- **Julian Alejandro Gil Peralta**
- **Daniel Ramiro Galeano Teyes**
- **Juan David Galeano Barrera**

*Facultad de Ingeniería de Sistemas — 2026*