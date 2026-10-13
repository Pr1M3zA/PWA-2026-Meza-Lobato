export default function DisciplineCard(discipline, areaColor) {
  const { id, description, details } = discipline;
  return `
    <li class="discipline-item">
      <a class="discipline-card" href="/editar/temas/${id}" data-link>
        <span class="discipline-bar" style="background: ${areaColor}"></span>
        <div class="discipline-body">
          <div class="discipline-text">
            <h3 class="discipline-name">${description}</h3>
            <p class="discipline-details">${details ?? ""}</p>
          </div>
          <span class="discipline-chevron material-symbols-outlined" aria-hidden="true">chevron_right</span>
        </div>
      </a>
    </li>
  `;
}
