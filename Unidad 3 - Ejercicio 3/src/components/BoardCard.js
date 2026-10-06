// Pieza del contenido dinámico renderizado por las vistas dentro de <main id="app">.

// Conteos de casillas por tipo de efecto: { key, label, color, text }.
// `color` es el fondo de la pill y `text` el color de texto legible sobre él.
// Orden de render: positivas, negativas, especiales, informativas, preguntas, sin_efecto.
const TILE_TYPE_BADGES = [
  { key: "positivas", label: "Positivas", color: "#6CB46B", text: "#ffffff" },
  { key: "negativas", label: "Negativas", color: "#B46B6B", text: "#ffffff" },
  { key: "especiales", label: "Especiales", color: "#946BB4", text: "#ffffff" },
  { key: "informativas", label: "Informativas", color: "#6B93B4", text: "#ffffff" },
  { key: "preguntas", label: "Preguntas", color: "#B3B46B", text: "#1f2326" },
  { key: "sin_efecto", label: "Sin efecto", color: "#A8A8A8", text: "#1f2326" },
];

export default function BoardCard(board) {
  const bgName = board.background_name ?? " — ";
  const width = board.width ?? " — ";
  const height = board.height ?? " — ";

  const pills = TILE_TYPE_BADGES.map(({ key, label, color, text }) => {
    const n = Number(board[key]) || 0;
    if (n <= 0) return "";
    return `<span class="board-pill" title="${label}: ${n}" style="background:${color};color:${text}">${label} ${n}</span>`;
  })
    .filter(Boolean)
    .join("");

  const pillRow = pills ? `<div class="board-pills">${pills}</div>` : "";

  return `
    <article class="board-card" data-board-id="${board.id}">
      <header class="board-header">
        <h3 class="board-title">${board.board_name}</h3>
        <div class="board-actions">
          <a class="board-icon-btn" data-link href="/editar/tableros/${board.id}/editar" aria-label="Editar tablero" title="Editar tablero">
            <span class="material-symbols-outlined" aria-hidden="true">edit</span>
          </a>
          <button type="button" class="board-icon-btn" data-action="duplicate-board" data-board-id="${board.id}" aria-label="Duplicar tablero" title="Duplicar tablero">
            <span class="material-symbols-outlined" aria-hidden="true">content_copy</span>
          </button>
        </div>
      </header>
      <p class="board-description">${board.board_description ?? ""}</p>
      <p class="board-meta">
        <span class="board-bg">Fondo: ${bgName}</span>
        <span class="board-dims">Dimensiones: ${width} × ${height}</span>
      </p>
      ${pillRow}
    </article>
  `;
}
