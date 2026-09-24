import { subscribe, getCurrentUser } from "../services/authService.js";

function displayName(user) {
  if (!user) return "Invitado";
  const parts = [user.first_name, user.last_name].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return user.username || "Invitado";
}

function applyUserToShell(user) {
  const userEls = document.querySelectorAll("#app-user-name");
  const avatars = document.querySelectorAll("#app-avatar-img");

  const name = displayName(user);
  userEls.forEach((el) => {
    el.textContent = name;
  });

  avatars.forEach((av) => {
    if (user && user.profile_image) {
      av.innerHTML = `<img src="data:image/webp;base64,${user.profile_image}" alt="Foto de ${name}" />`;
      av.classList.add("has-image");
    } else {
      av.innerHTML = "";
      av.classList.remove("has-image");
    }
  });

  // Mostrar/ocultar las opciones de navegación protegidas según la sesión.
  const isAuthed = Boolean(user);
  document.querySelectorAll(".protected-nav").forEach((el) => {
    el.hidden = !isAuthed;
  });
}

export default function mountUserShell() {
  applyUserToShell(getCurrentUser());
  subscribe(({ user }) => applyUserToShell(user));
}
