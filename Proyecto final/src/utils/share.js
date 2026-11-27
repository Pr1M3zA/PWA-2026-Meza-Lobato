// navigator.share() abre el menú nativo de compartir del sistema operativo.
// La app no sabe a qué contactos o apps se comparte: eso lo decide el usuario.

// Si el navegador no la soporta, navigator.share simplemente no existe.
export function supportsShare() {
  return typeof navigator.share === "function";
}

// canShare() valida los datos ANTES de abrir el menú (también sirve para archivos).
// Algunos navegadores tienen share() pero no canShare(): en ese caso intentamos igual.
export function canShare(data) {
  if (!supportsShare()) return false;
  return typeof navigator.canShare === "function" ? navigator.canShare(data) : true;
}

// Devuelve cómo terminó: "shared", "cancelled" o "copied" (plan B).
// IMPORTANTE: debe llamarse directamente desde un gesto del usuario (clic).
// Si antes se hace un await lento, el navegador puede rechazar el share.
export async function shareContent(data) {
  if (canShare(data)) {
    try {
      await navigator.share(data);
      return "shared";
    } catch (error) {
      // AbortError = el usuario cerró el menú. No es un fallo de la app.
      if (error.name === "AbortError") return "cancelled";

      // NotAllowedError: el navegador ya no ve el gesto del usuario. Copiamos el enlace para no perder el trabajo.
      if (error.name === "NotAllowedError") {
        await copyToClipboard(data);
        return "copied";
      }

      throw error; // TypeError…: que los vea quien llamó
    }
  }

  // Plan B: sin menú nativo, copiamos el contenido al portapapeles.
  await copyToClipboard(data);
  return "copied";
}

async function copyToClipboard({ text, url }) {
  const content = [text, url].filter(Boolean).join("\n");

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(content);
    return;
  }

  // Contexto no seguro (http sin https) o navegador sin Clipboard API:
  // usamos el método clásico con un textarea temporal.
  const area = document.createElement("textarea");
  area.value = content;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  area.remove();
}

// ---------------------------------------------------------------------------
// Payload del enlace de compartir.
// ---------------------------------------------------------------------------

// [pregunta, información, r1, r2, r3, r4, correcta]
const QUESTION_FIELDS = [
  "question",
  "information",
  "answer_1",
  "answer_2",
  "answer_3",
  "answer_4",
  "answer_ok",
];

function toRows(payload) {
  return {
    // [id, descripción, detalles]
    s: [payload.subtopic.id, payload.subtopic.description, payload.subtopic.details],
    // [descripción, detalles]
    t: [payload.topic.description, payload.topic.details],
    // [id, nombre]
    d: [payload.discipline.id, payload.discipline.name],
    // [id]
    l: [payload.level.id],
    // [preguntas]
    q: payload.questions.map((q) => QUESTION_FIELDS.map((f) => q[f] ?? "")),
  };
}

function fromRows(rows) {
  if (!Array.isArray(rows?.s)) return null;

  const questions = (rows.q ?? []).map((row) => {
    const item = {};
    QUESTION_FIELDS.forEach((field, i) => (item[field] = row[i] ?? ""));
    return item;
  });

  return {
    subtopic: { id: rows.s[0], description: rows.s[1], details: rows.s[2] },
    topic: { description: rows.t?.[0], details: rows.t?.[1] },
    discipline: { id: rows.d?.[0], name: rows.d?.[1] },
    level: { id: rows.l?.[0] },
    questions,
  };
}

function toBase64Url(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(encoded) {
  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeSharePayload(payload) {
  return toBase64Url(JSON.stringify(toRows(payload)));
}

export function decodeSharePayload(encoded) {
  if (!encoded) return null;
  try {
    return fromRows(JSON.parse(fromBase64Url(encoded)));
  } catch (error) {
    console.warn("[PWA] Enlace de compartir inválido: ", error);
    return null;
  }
}