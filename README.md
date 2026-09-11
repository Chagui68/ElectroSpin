# ElectroSpin - Simulador de Motor DC

Simulador web interactivo para el analisis y visualizacion de un motor de corriente continua (DC) basico. Integra principios de Electricidad y Magnetismo (voltaje, corriente, campo magnetico y fuerza de Lorentz) con tecnicas de desarrollo frontend, permitiendo explorar de forma visual como los cambios en las variables afectan el comportamiento del motor.

## Contenido

| Seccion | Descripcion |
|---------|-------------|
| **Simulador** | Vista animada del motor DC en SVG: imanes N/S, lineas de campo magnetico animadas, bobina que rota sobre su eje central (proyeccion 3D a 2D), simbolos de fuerza (regla de la mano derecha: &#x2299; sale / &#x2297; entra), flechas de corriente, conmutador, escobillas y eje de rotacion. |
| **Panel de Control** | Deslizadores para modificar el voltaje (V), la resistencia del bobinado (R), el campo magnetico (B), la longitud del conductor (L), las vueltas de la bobina (N) y el radio del eje (r). |
| **Lecturas en Tiempo Real** | Corriente (I), fuerza de Lorentz (F), torque (tau), velocidad angular (omega), RPM, potencia (P), back-EMF y eficiencia. |
| **Efecto de cada Variable** | Explicacion de que ocurre en las ecuaciones y en la animacion al aumentar cada variable. |
| **Marco Teorico** | Tarjetas con las formulas clave: Fuerza de Lorentz, Ley de Ohm, Torque, Back-EMF, Potencia y Conmutador. |

## Caracteristicas

- Simulacion continua con `requestAnimationFrame`.
- Modelo fisico con back-EMF: `I = (V - E_back) / R`, `E_back = k * omega`.
- Fuerza de Lorentz: `F = 2 * N * B * I * L`.
- Torque: `tau = F * r`.
- El conmutador invierte la corriente cada media vuelta, manteniendo el torque en el mismo sentido.
- El tamano del rotor se adapta al radio (r) y el grosor de los conductores al numero de vueltas (N).
- Las lineas de campo se vuelven mas brillantes y rapidas al aumentar B.
- Fondos decorativos animados en SVG, tema oscuro y diseno responsive.

## Como ejecutar

No requiere compilacion ni dependencias: es HTML + CSS + JavaScript puro.

**Opcion 1 - Abrir directamente:** haz doble clic en `index.html`.

**Opcion 2 - Servidor local:**
```bash
cd electrospin
python -m http.server 8000
```
Luego abre `http://localhost:8000`.

## Estructura del proyecto

```
electrospin/
├── index.html      # Estructura y SVG del motor
├── css/
│   └── styles.css  # Diseno, tema oscuro y animaciones
└── js/
    └── app.js      # Logica de simulacion, fisica y animacion
```

## Uso

1. Pulsa **Iniciar Simulacion** para poner el motor en marcha.
2. Mueve los deslizadores del panel mientras el motor gira y observa los cambios.
3. Revisa el apartado **Efecto de cada Variable** para entender cada variable.
4. Usa **Reiniciar** para volver a los valores iniciales.

## Tecnologias

- HTML5
- CSS3 (animaciones, grid, responsive)
- JavaScript (ES6)
- SVG (animaciones vectoriales del motor y fondo)

## Autores

- Julian Alejandro Gil Peralta
- Daniel Ramiro Galeano Teyes
- Juan David Galeano Barrera

Ingenieria de Sistemas - 2026

## Demo en linea

Disponible en GitHub Pages: [https://chagui68.github.io/ElectroSpin/](https://chagui68.github.io/ElectroSpin/)