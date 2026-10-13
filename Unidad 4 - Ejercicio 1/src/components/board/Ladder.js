// Pieza del contenido dinamico renderizado por las vistas dentro de <main id="app">.
// Port de web/src/app/components/Ladder.tsx: escalera con postes verticales y peldanos.
// NO emite <defs>: el contenedor debe incluir ladderRungDef(rungColor, baseColor)
// una sola vez por <svg> raiz con los colores globales del tablero.

function getAngle(from, to) {
  return -90 - (Math.atan(-(to.y - from.y) / (to.x - from.x)) * (180 / Math.PI)) + ((to.x - from.x) < 0 ? 180 : 0);
}

export default function ladderHTML({ from, to, scale, color, selected }) {
  const length = Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2);
  const ladderRungs = [15];
  for (let i = 40; i < length - 15; i += 25) ladderRungs.push(i);

  let selection = '';
  if (selected) {
    selection = `<circle cx="27.5" cy="${length / 2}" r="${Math.max(length / 2 + 10, 30)}" fill="none" stroke="#3b82f6" stroke-width="3" stroke-dasharray="5,3" />`;
  }

  let rungs = '';
  for (const point of ladderRungs) {
    rungs += `<use href="#wl-rung" y="${point}" />`;
  }

  return `<g transform="scale(${scale}) translate(${from.x - 27.5}, ${from.y}) rotate(${getAngle(from, to)}, 27.5, 0)" fill-opacity="0.5">${selection}<circle cx="11.5" cy="5" r="5" fill="${color.base}" /><circle cx="11.5" cy="${length - 5}" r="5" fill="${color.base}" /><rect x="6.5" y="5" width="10" height="${length - 10}" fill="${color.base}" /><circle cx="43.5" cy="5" r="5" fill="${color.base}" /><circle cx="43.5" cy="${length - 5}" r="5" fill="${color.base}" /><rect x="38.5" y="5" width="10" height="${length - 10}" fill="${color.base}" />${rungs}</g>`;
}