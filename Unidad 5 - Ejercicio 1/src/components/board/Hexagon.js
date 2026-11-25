// Pieza del contenido dinamico renderizado por las vistas dentro de <main id="app">.
// Port de web/src/app/components/Hexagon.tsx: un hexagono regular (poligono de 6 vertices)
// posicionado y rotado, con relleno y borde.

export default function hexagonHTML({ pos, radius, rotation, colors, borderWidth }) {
  const sqrt = Math.sqrt(3) * radius / 2;
  const points = `${radius},0 ${radius / 2},${sqrt} ${-radius / 2},${sqrt} ${-radius},0 ${-radius / 2},${-sqrt} ${radius / 2},${-sqrt}`;
  return `<g transform="translate(${pos.x}, ${pos.y}) rotate(${rotation})"><polygon points="${points}" fill="${colors.fill}" stroke="${colors.border}" stroke-width="${borderWidth}" /></g>`;
}