// Pieza del contenido dinamico renderizado por las vistas dentro de <main id="app">.
// Port de web/src/app/components/Wire.tsx: serpiente con cuerpo de escamas Q/T,
// cabeza y cola rectangulares. NO emite <defs>: el contenedor debe incluir
// escamasPatternDef(fillColor, borderColor) una vez por <svg> raiz.

function getAngle(from, to) {
  return -90 - (Math.atan(-(to.y - from.y) / (to.x - from.x)) * (180 / Math.PI)) + ((to.x - from.x) < 0 ? 180 : 0);
}

function getSnakePath(head, queue) {
  const snakeLength = queue.y - head.y;
  const segments = Math.round(snakeLength / 250);
  const segmentLength = snakeLength / segments;
  let path = `M${head.x},${head.y}`;
  for (let segment = 0; segment < segments; segment++) {
    const middle = { x: head.x, y: head.y + segment * segmentLength + segmentLength / 2 };
    const curveRef = { x: head.x - Math.sqrt((segmentLength / 2) ** 2 - (segmentLength / 4) ** 2), y: head.y + (segment * segmentLength) + segmentLength / 4 };
    path += ` Q${curveRef.x},${curveRef.y} ${middle.x},${middle.y} T${middle.x},${head.y + (segment * segmentLength) + segmentLength}`;
  }
  return path;
}

export default function wireHTML({ from, to, width, selected }) {
  const length = Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2);
  const virtualTo = { x: from.x, y: from.y + length };

  let selection = '';
  if (selected) {
    selection = `<circle cx="${(from.x + to.x) / 2}" cy="${(from.y + to.y) / 2}" r="${Math.max(length / 2 + 15, 40)}" fill="none" stroke="#3b82f6" stroke-width="3" stroke-dasharray="5,3" />`;
  }

  return `<g>${selection}<g transform="rotate(${getAngle(from, to)}, ${from.x}, ${from.y})"><path d="${getSnakePath(from, virtualTo)}" stroke="url(#wl-escamas)" fill="none" stroke-width="${width}" /><g transform="rotate(55, ${from.x}, ${from.y})"><rect x="${from.x - 10}" y="${from.y}" width="20" height="10" fill="white" stroke="black" stroke-width="2" /><rect x="${from.x - 15}" y="${from.y + 10}" width="30" height="30" /></g><g transform="rotate(55, ${virtualTo.x}, ${virtualTo.y})"><rect x="${virtualTo.x - 10}" y="${virtualTo.y - 10}" width="20" height="10" fill="white" stroke="black" stroke-width="2" /><rect x="${virtualTo.x - 15}" y="${virtualTo.y - 40}" width="30" height="30" /></g></g></g>`;
}