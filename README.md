# Asteroids

Clon del clásico arcade **Asteroids** implementado en canvas HTML5 puro, sin dependencias ni bundler.

## Descripción

Nave espacial en un campo de asteroides con envolvimiento de bordes (el espacio es toroidal). Destruye asteroides para sumar puntos: los grandes se parten en medianos, los medianos en pequeños. Los asteroides destruidos pueden soltar un power-up de velocidad. De vez en cuando cruza la pantalla una **estrella fugaz**: un asteroide dorado mucho más veloz que se desvanece sola con el tiempo.

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

| Tecla     | Acción     |
| --------- | ---------- |
| `←` `→`   | Rotar nave |
| `↑`       | Propulsar  |
| `Espacio` | Disparar   |

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
- Power-up de **velocidad**: 12% de probabilidad de que un asteroide destruido suelte un rayo cian; al recogerlo la nave se propulsa al doble durante 5 segundos (llama cian y contador en el HUD). Se pierde al morir
- **Estrella fugaz**: cada 7–12 s aparece junto a un borde un asteroide dorado (estrella de 5 puntas girando, con estela) mucho más veloz que el resto. No se parte al destruirse: suma 500 puntos si se logra cazar, destruye la nave al tocarla y se desvanece sola a los pocos segundos (parpadea antes de desaparecer)
