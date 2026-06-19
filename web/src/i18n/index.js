import { createI18n } from 'vue-i18n';
import en from './en';
import th from './th';

const savedLocale = localStorage.getItem('lang') || 'en';

export const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: 'en',
  messages: { en, th },
});
