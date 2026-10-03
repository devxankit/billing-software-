import React, { useState, useEffect } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { translateText } from "../services/translationService";
import { getCachedTranslationSync } from "../utils/translationCache";

export default function TranslatedText({ children, sourceLang = "en" }) {
  const { language } = useLanguage();
  // Start from the cached translation so already-translated text doesn't flash English
  const [translated, setTranslated] = useState(() =>
    (typeof children === "string" && language !== sourceLang && getCachedTranslationSync(children, sourceLang, language)) || children
  );

  useEffect(() => {
    if (!children || typeof children !== "string") {
      setTranslated(children);
      return;
    }

    async function fetchTranslation() {
      const result = await translateText(children, language, sourceLang);
      setTranslated(result);
    }

    fetchTranslation();
  }, [children, language, sourceLang]);

  return <>{translated}</>;
}
