let initialized = false;

async function queryPermissionState() {
  if (typeof Notification === "undefined") return "unsupported";
  try {
    const status = await navigator.permissions.query({ name: "notifications" });
    const state = status.state === "prompt" ? "default" : status.state;
    return state;
  } catch {
    return Notification.permission;
  }
}

function paintButtons(state) {
  const visible = state === "default";
  document.querySelectorAll(".notify-btn").forEach((btn) => {
    btn.hidden = !visible;
  });
}

async function handleClick() {
  const state = await queryPermissionState();
  if (state !== "default") {
    await repaint();
    return;
  }

  const result = await Notification.requestPermission();
  console.info("[PWA] El usuario respondió el permiso de notificaciones:", result);
  await repaint();
}

async function repaint() {
  const state = await queryPermissionState();
  paintButtons(state);
  return state;
}

export async function mountNotificationButton() {
  if (initialized) return;
  initialized = true;

  if (typeof Notification === "undefined") {
    console.info("[PWA] Notification API no disponible, no se monta el control.");
    return;
  }

  const BTN_HTML = `
    <button type="button" class="notify-btn" hidden aria-label="Activar notificaciones"
            title="Permitir notificaciones de sincronización">
      <span class="material-symbols-outlined" aria-hidden="true">notifications</span>
    </button>
  `;

  document.querySelectorAll(".shell-actions").forEach((actions) => {
    if (actions.querySelector(".notify-btn")) return;
    actions.insertAdjacentHTML("afterbegin", BTN_HTML);
    const btn = actions.querySelector(".notify-btn");
    const themeToggle = actions.querySelector(".theme-toggle");
    if (themeToggle) actions.insertBefore(btn, themeToggle);
  });

  document.querySelectorAll(".notify-btn").forEach((btn) => {
    btn.addEventListener("click", handleClick);
  });

  try {
    const status = await navigator.permissions.query({ name: "notifications" });
    status.onchange = () => {
      console.info("[PWA] Cambió el permiso de notificaciones, repintando el control.");
      repaint();
    };
  } catch {
    /* sin Permissions API: se pinta con Notification.permission */
  }

  const state = await repaint();
  console.info(`[PWA] Control de notificaciones montado · estado inicial: ${state}`);
}
