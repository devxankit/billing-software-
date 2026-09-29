const DB_NAME = "TranslationCache";
const STORE_NAME = "translations";
const DB_VERSION = 1;
const TTL = 30 * 24 * 60 * 60 * 1000; // 30 days — UI strings rarely change

// In-memory layer so repeat lookups (and first paint) don't wait on IndexedDB
const memoryCache = new Map();

function getCacheId(text, sourceLang, targetLang) {
  try {
    return `${sourceLang}_${targetLang}_${btoa(unescape(encodeURIComponent(text.trim())))}`;
  } catch (e) {
    return `${sourceLang}_${targetLang}_${text.trim().substring(0, 50)}`;
  }
}

export function getCachedTranslationSync(text, sourceLang, targetLang) {
  if (!text || typeof text !== "string") return null;
  const id = getCacheId(text, sourceLang, targetLang);
  if (memoryCache.has(id)) return memoryCache.get(id);
  try {
    const localCached = localStorage.getItem(`tx_${id}`);
    if (localCached) {
      const parsed = JSON.parse(localCached);
      if (Date.now() < parsed.expiry) {
        memoryCache.set(id, parsed.translation);
        return parsed.translation;
      }
    }
  } catch (e) {
    // Ignore
  }
  return null;
}

let dbPromise = null;

function getDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });

  return dbPromise;
}

export async function getCachedTranslation(text, sourceLang, targetLang) {
  if (!text) return null;
  const id = getCacheId(text, sourceLang, targetLang);

  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    
    const cached = await new Promise((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (cached) {
      if (Date.now() < cached.expiry) {
        memoryCache.set(id, cached.translation);
        return cached.translation;
      } else {
        const deleteTx = db.transaction(STORE_NAME, "readwrite");
        deleteTx.objectStore(STORE_NAME).delete(id);
      }
    }
  } catch (e) {
    // fallback
  }

  try {
    const localCached = localStorage.getItem(`tx_${id}`);
    if (localCached) {
      const parsed = JSON.parse(localCached);
      if (Date.now() < parsed.expiry) {
        return parsed.translation;
      } else {
        localStorage.removeItem(`tx_${id}`);
      }
    }
  } catch (e) {
    // Ignore
  }

  return null;
}

export async function setCachedTranslation(text, translation, sourceLang, targetLang) {
  if (!text || !translation || text.trim() === translation.trim()) return;

  const id = getCacheId(text, sourceLang, targetLang);
  
  const expiry = Date.now() + TTL;
  memoryCache.set(id, translation);
  const item = { id, translation, expiry };

  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(item);
  } catch (e) {
    // fallback
  }

  try {
    localStorage.setItem(`tx_${id}`, JSON.stringify({ translation, expiry }));
  } catch (e) {
    // Ignore
  }
}

export async function clearExpiredCache() {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    
    store.openCursor().onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        if (Date.now() > cursor.value.expiry) {
          cursor.delete();
        }
        cursor.continue();
      }
    };
  } catch (e) {
    // Ignore
  }

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("tx_")) {
        const item = localStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          if (Date.now() > parsed.expiry) {
            localStorage.removeItem(key);
          }
        }
      }
    }
  } catch (e) {
    // Ignore
  }
}

setTimeout(clearExpiredCache, 5000);
