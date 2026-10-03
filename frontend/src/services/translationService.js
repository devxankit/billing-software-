import { apiClient } from "../api/apiClient";
import { getCachedTranslation, getCachedTranslationSync, setCachedTranslation } from "../utils/translationCache";

let queue = [];
let isProcessing = false;
// Google Translate accepts up to 128 segments per request; send big batches
// so a page's strings arrive in one round-trip instead of many small ones.
const BATCH_SIZE = 100;
const WAIT_WINDOW = 50;
const MIN_INTERVAL = 0;

async function processQueue() {
  if (isProcessing || queue.length === 0) return;
  isProcessing = true;

  await new Promise(resolve => setTimeout(resolve, WAIT_WINDOW));

  while (queue.length > 0) {
    const currentBatch = queue.splice(0, BATCH_SIZE);
    
    const byLang = {};
    currentBatch.forEach(item => {
      if (!byLang[item.targetLang]) byLang[item.targetLang] = [];
      byLang[item.targetLang].push(item);
    });

    for (const targetLang in byLang) {
      const items = byLang[targetLang];
      const sourceLang = items[0].sourceLang; 
      const texts = items.map(i => i.text);

      try {
        const { data } = await apiClient.post("/v1/translate/batch", {
          texts,
          targetLang,
          sourceLang
        });

        if (data.success && data.data && data.data.translation) {
          const translations = data.data.translation;
          items.forEach((item, index) => {
            const translation = translations[index] || item.text;
            setCachedTranslation(item.text, translation, item.sourceLang, item.targetLang);
            item.resolve(translation);
          });
        } else {
          items.forEach(item => item.resolve(item.text));
        }
      } catch (error) {
        console.error("Translation batch failed:", error);
        items.forEach(item => item.resolve(item.text));
      }

      if (MIN_INTERVAL) await new Promise(resolve => setTimeout(resolve, MIN_INTERVAL));
    }
  }

  isProcessing = false;
}

// `background` requests (the all-pages preload) wait behind anything a visible page asks for
export async function translateText(text, targetLang, sourceLang = "en", background = false) {
  if (!text || String(text).trim() === "") return text;
  if (targetLang === sourceLang) return text;

  const syncCached = getCachedTranslationSync(text, sourceLang, targetLang);
  if (syncCached) return syncCached;

  const cached = await getCachedTranslation(text, sourceLang, targetLang);
  if (cached) return cached;

  return new Promise((resolve) => {
    const item = { text, targetLang, sourceLang, resolve, background };
    const firstBackground = background ? -1 : queue.findIndex(q => q.background);
    if (firstBackground === -1) queue.push(item);
    else queue.splice(firstBackground, 0, item);
    processQueue();
  });
}

export async function translateBatch(texts, targetLang, sourceLang = "en", background = false) {
  if (!Array.isArray(texts)) return texts;
  return Promise.all(texts.map(t => translateText(t, targetLang, sourceLang, background)));
}

export async function translateObject(obj, targetLang, sourceLang = "en", keysToTranslate = []) {
  if (!obj || typeof obj !== "object") return obj;

  const clonedObj = Array.isArray(obj) ? [...obj] : { ...obj };
  const textsToTranslate = [];
  const mapPaths = [];

  const traverse = (current) => {
    if (!current) return;

    if (Array.isArray(current)) {
      for (let i = 0; i < current.length; i++) {
        traverse(current[i]);
      }
    } else if (typeof current === "object") {
      for (const key in current) {
        if (keysToTranslate.length > 0 && !keysToTranslate.includes(key)) {
          traverse(current[key]);
          continue;
        }

        if (typeof current[key] === "string" && current[key].trim() !== "") {
          textsToTranslate.push(current[key]);
          mapPaths.push({ obj: current, key });
        } else {
          traverse(current[key]);
        }
      }
    }
  };

  traverse(clonedObj);

  if (textsToTranslate.length > 0) {
    const translations = await translateBatch(textsToTranslate, targetLang, sourceLang);
    for (let i = 0; i < mapPaths.length; i++) {
      const { obj: targetObj, key } = mapPaths[i];
      targetObj[key] = translations[i];
    }
  }

  return clonedObj;
}

// Synchronous cache lookup so pages can render already-translated text on first paint
export function translateBatchSync(texts, targetLang, sourceLang = "en") {
  const map = {};
  if (!Array.isArray(texts) || targetLang === sourceLang) return map;
  texts.forEach(t => {
    const cached = getCachedTranslationSync(t, sourceLang, targetLang);
    if (cached) map[t] = cached;
  });
  return map;
}
