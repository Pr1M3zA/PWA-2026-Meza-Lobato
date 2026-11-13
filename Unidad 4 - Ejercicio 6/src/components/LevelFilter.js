export default function LevelFilter(levels, selectedId) {
  const chips = levels
    .map((lvl) => {
      const isActive = String(lvl.id) === String(selectedId);
      return `
        <button type="button"
                class="level-badge${isActive ? " is-active" : ""}"
                data-level-id="${lvl.id}"
                aria-pressed="${isActive}">
          ${lvl.description}
        </button>
      `;
    })
    .join("");
  return `<div class="level-filter" role="group" aria-label="Filtrar por nivel">${chips}</div>`;
}
