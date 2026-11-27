// Pieza del contenido dinamico renderizado por las vistas dentro de <main id="app">.
// Port de web/src/app/components/StartFinishLine.tsx: linea ajedrezada de salida/meta.
// Patron 3 filas x N columnas; cada cuadro alterna color de fondo y blanco.

export default function startFinishLineHTML({ pos, size, color }) {
  const squareSide = size.height / 3;
  const numSquareInLine = Math.trunc(size.width / squareSide) + 1;
  const adjustedWidth = numSquareInLine * squareSide;
  let squares = '';
  for (let col = 0; col < numSquareInLine; col++) {
    const x = pos.x + col * squareSide;
    squares += `<rect x="${x}" y="${pos.y}" width="${squareSide}" height="${squareSide}" fill="${col % 2 === 0 ? color.fill : 'white'}" />`;
    squares += `<rect x="${x}" y="${pos.y + squareSide}" width="${squareSide}" height="${squareSide}" fill="${col % 2 !== 0 ? color.fill : 'white'}" />`;
    squares += `<rect x="${x}" y="${pos.y + squareSide * 2}" width="${squareSide}" height="${squareSide}" fill="${col % 2 === 0 ? color.fill : 'white'}" />`;
  }
  return `<g style="z-index:0" width="${adjustedWidth}" height="${size.height}"><rect x="${pos.x}" y="${pos.y}" width="${adjustedWidth}" height="${size.height}" stroke="${color.border}" stroke-width="2" fill="none" />${squares}</g>`;
}