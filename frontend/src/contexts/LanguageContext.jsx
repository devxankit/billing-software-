import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { normalizeLanguageCode, isRTLLanguage } from "../utils/languageUtils";
import i18n from "../i18n/i18n";
import { useAuth } from "../context/AuthContext";
import dayjs from 'dayjs';

// Import dayjs locale objects
import hiLocale from 'dayjs/locale/hi';
import guLocale from 'dayjs/locale/gu';
import mrLocale from 'dayjs/locale/mr';
import taLocale from 'dayjs/locale/ta';
import teLocale from 'dayjs/locale/te';
import knLocale from 'dayjs/locale/kn';
import bnLocale from 'dayjs/locale/bn';
import mlLocale from 'dayjs/locale/ml';
import paLocale from 'dayjs/locale/pa-in';

const LanguageContext = createContext();

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

// Language is remembered per account (app_lang_<userId>) so switching accounts
// on the same device opens each one in its own language. app_lang is the
// device-level fallback used on logged-out screens.
const userLangKey = (userId) => `app_lang_${userId}`;

function getStoredUserId() {
  try {
    const saved = JSON.parse(localStorage.getItem("billing_user") || "null");
    return saved?._id || saved?.id || null;
  } catch (_) {
    return null;
  }
}

export function LanguageProvider({ children }) {
  const { user } = useAuth();
  const userId = user?._id || user?.id || null;
  // Account that was already logged in when the app opened (existing session)
  const sessionUserId = useRef(getStoredUserId());

  const [language, setLanguage] = useState(() => {
    const storedUserId = sessionUserId.current;
    return (storedUserId && localStorage.getItem(userLangKey(storedUserId)))
      || localStorage.getItem("app_lang")
      || "en";
  });
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);

  // When the logged-in account changes, switch to that account's language
  useEffect(() => {
    if (!userId) return;
    const saved = localStorage.getItem(userLangKey(userId));
    if (saved) {
      setLanguage(saved);
      localStorage.setItem("app_lang", saved);
    } else if (userId === sessionUserId.current) {
      // Existing session from before per-account languages: keep what they use now
      localStorage.setItem(userLangKey(userId), language);
    } else {
      // Fresh login on an account with no saved preference → its default (English)
      setLanguage("en");
      localStorage.setItem("app_lang", "en");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    const langCode = normalizeLanguageCode(language);
    
    // Set text direction
    const dir = isRTLLanguage(language) ? "rtl" : "ltr";
    document.documentElement.dir = dir;
    document.documentElement.lang = langCode;
    
    // Load and set Dayjs locale
    const setupDayjs = () => {
      try {
        const locales = {
          hi: hiLocale,
          gu: guLocale,
          mr: mrLocale,
          ta: taLocale,
          te: teLocale,
          kn: knLocale,
          bn: bnLocale,
          ml: mlLocale,
          pa: paLocale
        };

        if (language === 'en') {
          dayjs.locale('en');
        } else if (locales[language]) {
          // Explicitly register the locale object to avoid import/export conflicts
          const name = language === 'pa' ? 'pa-in' : language;
          dayjs.locale(name, locales[language]);
        }
      } catch (e) {
        console.warn("Dayjs locale load failed", e);
        dayjs.locale('en');
      }
    };

    setupDayjs();

    // Sync with i18n
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language]);

  const changeLanguage = async (newLang) => {
    setIsChangingLanguage(true);
    try {
      setLanguage(newLang);
      localStorage.setItem("app_lang", newLang);
      if (userId) localStorage.setItem(userLangKey(userId), newLang);
      await new Promise((resolve) => setTimeout(resolve, 400));
    } finally {
      setIsChangingLanguage(false);
    }
  };

  const value = {
    language,
    languages: {
      en: { label: "English" },
      hi: { label: "Hindi" },
      gu: { label: "Gujarati" },
      mr: { label: "Marathi" },
      pa: { label: "Punjabi" },
      ta: { label: "Tamil" },
      te: { label: "Telugu" },
      kn: { label: "Kannada" },
      ml: { label: "Malayalam" },
      bn: { label: "Bengali" }
    },
    changeLanguage,
    isChangingLanguage,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
