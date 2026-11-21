import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Bundle all translations inline — no runtime fetch.
// This guarantees every language is available from app boot,
// which is critical for offline-first / mesh-first operation.
import en from './locales/en/translation.json';
import ar from './locales/ar/translation.json';
import es from './locales/es/translation.json';
import fr from './locales/fr/translation.json';
import gr from './locales/gr/translation.json';
import hi from './locales/hi/translation.json';
import it from './locales/it/translation.json';
import ja from './locales/ja/translation.json';
import ko from './locales/ko/translation.json';
import ptBR from './locales/pt-BR/translation.json';
import ru from './locales/ru/translation.json';
import tr from './locales/tr/translation.json';
import zh from './locales/zh/translation.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: false,
    interpolation: { escapeValue: false },
    resources: {
      en: { translation: en },
      ar: { translation: ar },
      es: { translation: es },
      fr: { translation: fr },
      gr: { translation: gr },
      hi: { translation: hi },
      it: { translation: it },
      ja: { translation: ja },
      ko: { translation: ko },
      'pt-BR': { translation: ptBR },
      ru: { translation: ru },
      tr: { translation: tr },
      zh: { translation: zh },
    },
  });

export default i18n;