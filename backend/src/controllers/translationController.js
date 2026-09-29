const translationService = require("../services/translationService");

const MAX_TEXTS = 128;       // Google's per-request segment limit
const MAX_TEXT_LENGTH = 2000;

const tooLong = (t) => typeof t === "string" && t.length > MAX_TEXT_LENGTH;

async function translateSingle(req, res, next) {
  try {
    const { text, targetLang, sourceLang = "en" } = req.body;

    if (!text) {
      return res.status(400).json({ success: false, message: "Text is required" });
    }
    if (tooLong(text)) {
      return res.status(400).json({ success: false, message: `Text is longer than ${MAX_TEXT_LENGTH} characters` });
    }
    if (!targetLang) {
      return res.status(400).json({ success: false, message: "Target language is required" });
    }

    const translation = await translationService.translateText(text, targetLang, sourceLang);

    return res.json({
      success: true,
      data: {
        original: text,
        translation,
        sourceLang,
        targetLang,
      },
    });
  } catch (e) {
    next(e);
  }
}

async function translateBatch(req, res, next) {
  try {
    const { texts, targetLang, sourceLang = "en" } = req.body;

    if (!Array.isArray(texts)) {
      return res.status(400).json({ success: false, message: "Texts must be an array" });
    }
    if (texts.length > MAX_TEXTS || texts.some(tooLong)) {
      return res.status(400).json({ success: false, message: `Send at most ${MAX_TEXTS} texts of up to ${MAX_TEXT_LENGTH} characters` });
    }
    if (!targetLang) {
      return res.status(400).json({ success: false, message: "Target language is required" });
    }

    const translations = await translationService.translateBatch(texts, targetLang, sourceLang);

    return res.json({
      success: true,
      data: {
        original: texts,
        translation: translations,
        sourceLang,
        targetLang,
      },
    });
  } catch (e) {
    next(e);
  }
}

async function translateObject(req, res, next) {
  try {
    const { obj, targetLang, sourceLang = "en", keysToTranslate = [] } = req.body;

    if (!obj || typeof obj !== "object") {
      return res.status(400).json({ success: false, message: "Object is required" });
    }
    if (JSON.stringify(obj).length > MAX_TEXTS * MAX_TEXT_LENGTH) {
      return res.status(400).json({ success: false, message: "Object is too large to translate" });
    }
    if (!targetLang) {
      return res.status(400).json({ success: false, message: "Target language is required" });
    }

    const translatedObj = await translationService.translateObject(obj, targetLang, sourceLang, keysToTranslate);

    return res.json({
      success: true,
      data: {
        original: obj,
        translation: translatedObj,
        sourceLang,
        targetLang,
      },
    });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  translateSingle,
  translateBatch,
  translateObject,
};
