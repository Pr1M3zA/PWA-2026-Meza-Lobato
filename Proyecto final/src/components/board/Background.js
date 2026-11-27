// Pieza del contenido dinamico renderizado por las vistas dentro de <main id="app">.
// Port de web/src/app/components/Background.tsx: rectangulo grande con relleno
// procedural (pattern con dos paths y un fondo). NO emite <defs>: el contenedor
// debe incluir backgroundPatternDef(patternWidth, patternHeight, colors, svgPath1, svgPath2)
// una vez por <svg> raiz.

export default function backgroundHTML({ width, height, selected }) {
  let selection = '';
  if (selected) {
    selection = `<rect x="-5" y="-5" width="${width + 10}" height="${height + 10}" fill="none" stroke="#3b82f6" stroke-width="3" stroke-dasharray="5,3" />`;
  }
  return `<g>${selection}<rect fill="url(#wl-background)" x="0" y="0" width="${width}" height="${height}" /></g>`;
}