import { openDB } from "https://esm.sh/idb@8";

export const DB_NAME = "wlweb";
export const DB_VERSION = 3;
export const STORE = "api_topics";
export const INDEX = "by_id";

export const OUTBOX_STORE = "outbox";

const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db, oldVersion) {
    // v1 · api_topics. Si ya existe se respeta intacto: nunca se borra caché.
    if (!db.objectStoreNames.contains(STORE)) {
      const store = db.createObjectStore(STORE, {
        keyPath: "id",
        autoIncrement: true,
      });
      store.createIndex(INDEX, "action");
    }

    // v2 · outbox (cola de salida). Add-only, con id autoincremental.
    if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
      db.createObjectStore(OUTBOX_STORE, {
        keyPath: "id",
        autoIncrement: true,
      });
    }

    console.log("[db] upgrade", oldVersion, "→", DB_VERSION);
  },
  blocking() {
    console.warn("[db] otra pestaña pidió una versión superior, cerrando conexión");
  },
});

function wrap(fn) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (cause) {
      const err = new Error(
        `dbService: ${cause?.message || "operación de base de datos fallida"}`
      );
      err.context = "db";
      err.cause = cause;
      throw err;
    }
  };
}

export const addToOutbox = wrap(async (item) =>
  (await dbPromise).add(OUTBOX_STORE, item)
);

export const getOutbox = wrap(async () =>
  (await dbPromise).getAll(OUTBOX_STORE)
);

export const removeFromOutbox = wrap(async (id) =>
  (await dbPromise).delete(OUTBOX_STORE, id)
);

export const countOutbox = wrap(async () =>
  (await dbPromise).count(OUTBOX_STORE)
);

export const patchOutbox = wrap(async (id, patch) => {
  const db = await dbPromise;
  const tx = db.transaction(OUTBOX_STORE, "readwrite");
  const current = await tx.store.get(id);
  if (!current) {
    await tx.done;
    return null;
  }
  await tx.store.put({ ...current, ...patch, id });
  await tx.done;
  return { ...current, ...patch, id };
});