import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// Only use HTTP backend in the browser to avoid SSR URL parsing errors
const isBrowser = typeof window !== 'undefined';
if (isBrowser) {
  i18n.use(Backend);
}
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // Do NOT provide static resources here – allowing the backend plugin to load them dynamically.
    fallbackLng: 'en',
    ns: ['translation'],
    defaultNS: 'translation',
    debug: process.env.NODE_ENV === 'development',
    interpolation: {
      escapeValue: false, // React already safes from XSS
    },
    react: {
      useSuspense: false,
    },
    // Load the translations from the locales folder in public directory
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    supportedLngs: ['en', 'ar', 'fa', 'tr', 'zh'],
    nonExplicitSupportedLngs: false,
    // Language detection options
    detection: {
      order: ['querystring', 'cookie', 'localStorage', 'navigator', 'htmlTag'],
      lookupQuerystring: 'lng',
      lookupCookie: 'i18next',
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage', 'cookie'],
    }
  });

export default i18n; 