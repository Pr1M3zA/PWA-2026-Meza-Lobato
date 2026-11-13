// Helpers para los componentes SVG del tablero (BoardView, HexTile, etc.).
// `escapeXml` cierra el hueco de inyeccion cuando valores de la DB
// (colores, path strings) se interpolan en atributos SVG.
// Las `*PatternDef` izan <defs> que el original declaraba DENTRO de cada
// instancia de Ladder/Wire/Background, lo que colisiona cuando hay varias
// en el mismo DOM. Aqui se emiten UNA vez por <svg> raiz con prefijo `wl-`.

const SVG_NS_ESCAMAS_PATTERN =
  'M-10-10A10 10 0 0 0-20 0a10 10 0 0 0 10 10A10 10 0 0 1 0 0a10 10 0 0 0-10-10zm20 0A10 10 0 0 0 0 0a10 10 0 0 1 10 10A10 10 0 0 1 20 0a10 10 0 0 0-10-10zm20 0A10 10 0 0 0 20 0a10 10 0 0 1 10 10A10 10 0 0 1 40 0a10 10 0 0 0-10-10zm-40 20a10 10 0 0 0-10 10 10 10 0 0 0 10 10A10 10 0 0 1 0 20a10 10 0 0 0-10-10zm20 0a10 10 0 0 0 0 20 10 10 0 0 1 10 10 10 10 0 0 1 10-10 10 10 0 0 0-10-10zm20 0a10 10 0 0 0-10 10 10 10 0 0 1 10 10 10 10 0 0 1 10-10 10 10 0 0 0-10-10z';

export function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function escamasPatternDef(fillColor, borderColor) {
  return `<defs><pattern id="wl-escamas" patternUnits="userSpaceOnUse" width="40" height="30"><rect width="40" height="30" fill="${escapeXml(fillColor)}" fillOpacity="0.4" /><path fill="none" stroke="${escapeXml(borderColor)}" stroke-width="1" d="${SVG_NS_ESCAMAS_PATTERN}" /></pattern></defs>`;
}

export function ladderRungDef(rungColor, baseColor) {
  return `<defs><g id="wl-rung"><circle cx="5" cy="5" r="5" fill="${escapeXml(rungColor)}" /><circle cx="50" cy="5" r="5" fill="${escapeXml(rungColor)}" /><rect x="5" y="0" width="45" height="10" fill="${escapeXml(rungColor)}" /><circle cx="11.5" cy="5" r="1.5" fill="${escapeXml(baseColor)}" /><circle cx="43.5" cy="5" r="1.5" fill="${escapeXml(baseColor)}" /></g></defs>`;
}

export function backgroundPatternDef(patternWidth, patternHeight, colors, svgPath1, svgPath2) {
  return `<defs><pattern id="wl-background" patternUnits="userSpaceOnUse" width="${patternWidth}" height="${patternHeight}"><rect width="${patternWidth}" height="${patternHeight}" fill="${escapeXml(colors.color1)}" /><path d="${escapeXml(svgPath1)}" fill="${escapeXml(colors.color2)}" /><path d="${escapeXml(svgPath2)}" fill="${escapeXml(colors.color3)}" /></pattern></defs>`;
}