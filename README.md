# Asteroids

Clon del clásico arcade **Asteroids** implementado en canvas HTML5 puro, sin dependencias ni bundler.

## Descripción

Nave espacial en un campo de asteroides con envolvimiento de bordes (el espacio es toroidal). Destruye asteroides para sumar puntos: los grandes se parten en medianos, los medianos en pequeños. Los asteroides destruidos pueden soltar power-ups: de velocidad, de escudo o de triple disparo. De vez en cuando cruza la pantalla una **estrella fugaz**: un asteroide dorado mucho más veloz que se desvanece sola con el tiempo.

## Tecnologías

- **HTML5 Canvas** — renderizado 2D
- **JavaScript (ES6+)** — lógica del juego en un solo archivo `game.js`
- Sin frameworks, sin bundler, sin dependencias

## Cómo correr

Abre `index.html` directamente en el navegador (doble clic), o usa un servidor local:

```bash
npx serve .
```

Luego visita `http://localhost:3000`.

## Controles

| Tecla     | Acción                    |
| --------- | ------------------------- |
| `←` `→`   | Rotar nave               |
| `↑`       | Propulsar                |
| `Espacio` | Disparar                 |
| `C`       | Cambiar skin de la nave  |

## Puntuación

| Asteroide        | Puntos |
| ---------------- | ------ |
| Grande           | 20     |
| Mediano          | 50     |
| Pequeño          | 100    |
| Estrella fugaz   | 500    |

## Características

- 3 vidas con invencibilidad temporal al reaparecer (parpadeo)
- Asteroides se parten en fragmentos más pequeños al ser destruidos
- Partículas de explosión al destruir asteroides
- **Power-ups**: 12% de probabilidad de que un asteroide destruido suelte uno (un tercio de probabilidad por tipo); se pierden al morir o al cambiar de nivel
- Power-up de **velocidad** (rayo cian): al recogerlo la nave se propulsa al doble durante 5 segundos (llama cian y contador en el HUD)
- Power-up de **escudo** (contorno azul claro): al recogerlo la nave queda envuelta 6 segundos en una burbuja que absorbe los impactos de asteroides y estrellas fugaces, destruyéndolos al tocarla (sin puntos ni fragmentos); cada golpe absorbido resta 1.5 s y al agotarse el escudo se rompe (parpadea como aviso cuando queda poco tiempo)
- Power-up de **triple disparo** (tres rayitas magenta): al recogerlo, durante 5 segundos cada disparo es una ráfaga de 3 balas en línea recta (una detrás de otra, con el ángulo de la nave al momento de cada bala). Contador `TRIPLE` en el HUD
- **Estrella fugaz**: cada 7–12 s aparece junto a un borde un asteroide dorado (estrella de 5 puntas girando, con estela) mucho más veloz que el resto. No se parte al destruirse: suma 500 puntos si se logra cazar, destruye la nave al tocarla y se desvanece sola a los pocos segundos (parpadea antes de desaparecer)
- **Skins de la nave**: la tecla `C` rota entre 5 diseños (CLÁSICA, DARDO, COLIBRÍ, TITÁN, ESPECTRO), cada uno con su silueta, color y llama de propulsor; los íconos de vidas acompañan la skin activa. Es puramente cosmético (el hitbox no cambia) y la elección se recuerda entre sesiones (localStorage)
