import i18n from '../i18n';

/**
 * Smart translator — uses i18n if key exists, falls back to English text.
 * Usage: t('marketplace') or t('buy_sell_tagline', 'Buy and sell products')
 */
export function t(key: string, fallback?: string): string {
  const translated = i18n.t(key);
  if (translated && translated !== key) return translated;
  return fallback || key;
}