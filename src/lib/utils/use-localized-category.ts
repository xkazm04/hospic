import { useLocale } from 'next-intl';
import type { EMDNCategory } from '@/lib/types';
import type { CategoryNode } from '@/lib/queries';

/**
 * Hook to get localized category name based on current locale
 * Falls back to English name if Czech translation not available
 */
export function useLocalizedCategoryName(
  category: EMDNCategory | CategoryNode | null | undefined
): string {
  const locale = useLocale();

  if (!category) return '';

  // Use Czech name if locale is 'cs' and translation exists
  if (locale === 'cs' && category.name_cs) {
    return category.name_cs;
  }

  // Fall back to English name
  return category.name;
}

/**
 * Get localized category name (non-hook version for server components)
 */
export function getLocalizedCategoryName(
  category: EMDNCategory | CategoryNode | null | undefined,
  locale: string
): string {
  if (!category) return '';

  if (locale === 'cs' && category.name_cs) {
    return category.name_cs;
  }

  return category.name;
}
