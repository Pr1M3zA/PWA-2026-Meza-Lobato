import { openDB } from "https://esm.sh/idb@8";

export const DB_NAME = "wlweb";
export const DB_VERSION = 2;
export const STORE = "api_logs";
export const INDEX = "by_action";

let dbPromise = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, {
            keyPath: "id",
            autoIncrement: true,
          });
          store.createIndex(INDEX, "action");
        }
      },
    });
  }
  return dbPromise;
}

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

export const addLog = wrap(async (record) => {
  const db = await getDB();
  return db.put(STORE, record);
});

export const getAllLogs = wrap(async () => {
  const db = await getDB();
  return db.getAll(STORE);
});

export const getLogsByAction = wrap(async (action) => {
  const db = await getDB();
  return db.getAllFromIndex(STORE, INDEX, action);
});

export const deleteLog = wrap(async (id) => {
  const db = await getDB();
  return db.delete(STORE, id);
});
