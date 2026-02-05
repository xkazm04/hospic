export const locales = ['en', 'cs'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';
export const LOCALE_COOKIE_NAME = 'NEXT_LOCALE';

/**
 * Sets the locale cookie for SSR.
 * Cookie is set with 1-year expiration and Lax SameSite policy.
 * @param locale - The locale to set (e.g., 'en', 'cs')
 */
export function setLocaleCookie(locale: Locale): void {
  document.cookie = `${LOCALE_COOKIE_NAME}=${locale};path=/;max-age=31536000;SameSite=Lax`;
}
