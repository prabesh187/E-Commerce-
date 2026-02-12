import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslations from '../locales/en.json';
import neTranslations from '../locales/ne.json';

// Configure i18next with language detection and namespaces
i18n
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n instance to react-i18next
  .init({
    resources: {
      en: {
        translation: enTranslations,
      },
      ne: {
        translation: neTranslations,
      },
    },
    // Language detection configuration
    detection: {
      // Order of detection methods
      order: ['localStorage', 'navigator', 'htmlTag'],
      // Keys to lookup language from
      lookupLocalStorage: 'language',
      // Cache user language
      caches: ['localStorage'],
    },
    lng: localStorage.getItem('language') || 'en', // Default language
    fallbackLng: 'en', // Fallback language if translation is missing
    // Namespace configuration
    ns: ['translation'], // Default namespace
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    // React specific options
    react: {
      useSuspense: false, // Disable suspense for SSR compatibility
    },
    // Debug mode (disable in production)
    debug: false,
  });

// Save language preference when it changes
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('language', lng);
  // Update HTML lang attribute for accessibility
  document.documentElement.lang = lng;
});

export default i18n;
