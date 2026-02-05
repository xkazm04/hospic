/**
 * Memoized Intl.NumberFormat instances for price formatting.
 * Created once per locale, reused across all price renders for performance.
 *
 * Creating Intl.NumberFormat instances is expensive, so we create them once
 * and reuse them throughout the application.
 */
const priceFormatters: Record<string, Intl.NumberFormat> = {
  cs: new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }),
  en: new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "CZK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }),
};

/**
 * Formats a price value using the memoized formatter for the given locale.
 * @param price - The price to format (in CZK)
 * @param locale - The locale to use for formatting ('cs' or 'en')
 * @returns Formatted price string (e.g., "1 234 Kč" for cs, "CZK 1,234" for en)
 */
export function formatPrice(price: number, locale: string): string {
  const formatter = priceFormatters[locale] || priceFormatters.en;
  return formatter.format(price);
}

/**
 * Get the memoized price formatter for a specific locale.
 * Useful when you need the formatter instance directly.
 * @param locale - The locale to get the formatter for
 * @returns The Intl.NumberFormat instance for the locale
 */
export function getPriceFormatter(locale: string): Intl.NumberFormat {
  return priceFormatters[locale] || priceFormatters.en;
}
