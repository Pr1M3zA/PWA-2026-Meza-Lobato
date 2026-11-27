export default function AreaCard(area) {
  const { id, description, details, color, material_design_icon } = area;
  return `
    <li class="area-item">
      <a class="area-card" href="/editar/disciplinas/${id}" data-link>
        <span class="area-icon" style="background: ${color}">
          <span class="material-symbols-outlined" aria-hidden="true">${material_design_icon}</span>
        </span>
        <div class="area-content">
          <h3 class="area-name">${description}</h3>
          <p class="area-details">${details}</p>
        </div>
        <span class="area-chevron material-symbols-outlined" aria-hidden="true">chevron_right</span>
      </a>
    </li>
  `;
}
