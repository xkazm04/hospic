'use server'

import { createClient } from '@/lib/supabase/server'

export type Currency = 'EUR' | 'CZK' | 'PLN'

export interface ExchangeRates {
  EUR_CZK: number
  EUR_PLN: number
  effectiveDate: string
}

const FRANKFURTER_URL = 'https://api.frankfurter.dev/v1/latest?base=EUR&symbols=CZK,PLN'

/**
 * Get EUR→CZK and EUR→PLN exchange rates.
 * Lazy-refresh: returns cached rates from Supabase if fetched today,
 * otherwise fetches from Frankfurter API (ECB data), caches, and returns.
 */
export async function getExchangeRates(): Promise<ExchangeRates | null> {
  const supabase = await createClient()

  // Check for fresh rates (fetched today)
  const today = new Date().toISOString().slice(0, 10)
  const { data: cached } = await supabase
    .from('exchange_rates')
    .select('target_currency, rate, effective_date, fetched_at')
    .eq('base_currency', 'EUR')
    .gte('fetched_at', `${today}T00:00:00`)

  if (cached && cached.length >= 2) {
    const czk = cached.find((r) => r.target_currency === 'CZK')
    const pln = cached.find((r) => r.target_currency === 'PLN')
    if (czk && pln) {
      return {
        EUR_CZK: Number(czk.rate),
        EUR_PLN: Number(pln.rate),
        effectiveDate: czk.effective_date,
      }
    }
  }

  // Fetch fresh rates from Frankfurter (ECB data)
  try {
    const res = await fetch(FRANKFURTER_URL, { cache: 'no-store' })
    if (!res.ok) {
      // If API is down, return stale cached rates if available
      return getStaleRates(supabase)
    }

    const data: { base: string; date: string; rates: Record<string, number> } = await res.json()
    const czkRate = data.rates.CZK
    const plnRate = data.rates.PLN

    if (!czkRate || !plnRate) {
      return getStaleRates(supabase)
    }

    // Upsert both rates
    await supabase.from('exchange_rates').upsert(
      [
        {
          base_currency: 'EUR',
          target_currency: 'CZK',
          rate: czkRate,
          effective_date: data.date,
          fetched_at: new Date().toISOString(),
        },
        {
          base_currency: 'EUR',
          target_currency: 'PLN',
          rate: plnRate,
          effective_date: data.date,
          fetched_at: new Date().toISOString(),
        },
      ],
      { onConflict: 'base_currency,target_currency' }
    )

    return {
      EUR_CZK: czkRate,
      EUR_PLN: plnRate,
      effectiveDate: data.date,
    }
  } catch {
    // Network error — return stale rates
    return getStaleRates(supabase)
  }
}

/** Fallback: return any cached rates regardless of age */
async function getStaleRates(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<ExchangeRates | null> {
  const { data } = await supabase
    .from('exchange_rates')
    .select('target_currency, rate, effective_date')
    .eq('base_currency', 'EUR')

  if (!data || data.length < 2) return null

  const czk = data.find((r) => r.target_currency === 'CZK')
  const pln = data.find((r) => r.target_currency === 'PLN')
  if (!czk || !pln) return null

  return {
    EUR_CZK: Number(czk.rate),
    EUR_PLN: Number(pln.rate),
    effectiveDate: czk.effective_date,
  }
}
