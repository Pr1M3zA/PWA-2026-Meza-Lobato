import { subscribe, getCurrentUser, isAuthenticated } from "./authService.js";
import { addLog } from "./dbService.js";

let lastUser = null;

function getFullName(user) {
  if (!user) return "";
  const parts = [user.first_name, user.last_name].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return user.username || user.email || "";
}

function getUserLabel(user) {
  return getFullName(user) || user?.username || user?.email || "Invitado";
}

function getDescription({ user, identifier }) {
  const fullName = getFullName(user);
  if (identifier && fullName && fullName !== identifier) {
    return `${identifier} — ${fullName}`;
  }
  return identifier || fullName || "Sesión";
}

async function logSafely(record) {
  try {
    await addLog(record);
  } catch (err) {
    console.warn("[activityLogger] no se pudo registrar:", err);
  }
}

export function initActivityLogger() {
  const initialUser = getCurrentUser();
  lastUser = initialUser;
  let skipNext = isAuthenticated() && initialUser === null;

  subscribe((detail) => {
    if (skipNext) {
      skipNext = false;
      lastUser = detail.user;
      return;
    }

    const wasAuthed = Boolean(lastUser);
    const isAuthed = Boolean(detail.user);

    if (!wasAuthed && isAuthed) {
      logSafely({
        dateTime: Date.now(),
        user: getUserLabel(detail.user),
        action: "Iniciar sesión",
        description: getDescription(detail),
      });
    } else if (wasAuthed && !isAuthed) {
      logSafely({
        dateTime: Date.now(),
        user: getUserLabel(lastUser),
        action: "Cerrar sesión",
        description: getDescription({ user: lastUser }),
      });
    }

    lastUser = detail.user;
  });
}
