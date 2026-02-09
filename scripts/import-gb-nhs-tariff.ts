/**
 * Import GB NHS England HRG (Healthcare Resource Group) tariffs
 * for orthopedic joint replacement and revision procedures.
 *
 * Source: NHS England 2024/25 National Payment Scheme — Annex A
 * URL: https://www.england.nhs.uk/publication/2023-25-nhs-payment-scheme/
 *
 * These are procedure-level prices (price_scope = 'procedure') that include
 * the full cost of surgery, NOT just the implant. Implant cost is typically
 * estimated at 15-20% of the total procedure tariff.
 *
 * Prices are elective (planned surgery) tariffs in GBP, converted to EUR
 * at a fixed ECB reference rate.
 *
 * Usage: npm run import:gb-nhs
 *        npm run import:gb-nhs -- --dry-run
 */

import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'
import { config } from 'dotenv'

config({ path: '.env.local' })
config({ path: '.env' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY

const isDryRun = process.argv.includes('--dry-run')

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ECB reference rate (Jan 2026 average) — GBP is relatively stable vs EUR
const GBP_TO_EUR = 1.18

const SOURCE_URL = 'https://www.england.nhs.uk/publication/2023-25-nhs-payment-scheme/'

// Curated list of orthopedic HRG tariffs for joint replacement & revision.
// Selected: elective prices, lowest CC band (standard patient) for each
// procedure level, plus higher CC bands for range context.
//
// HN = Non-Trauma, HT = Trauma
// x2 = Very Major (joint replacement), x3 = Major, x4 = Intermediate
// 80/81 = Complex/Revision hip/knee, 85/86 = Complex other joints
const NHS_TARIFFS: Array<{
  hrg_code: string
  description: string
  body_part: string
  cc_score: string
  price_gbp: number
  is_revision: boolean
}> = [
  // ─── Hip (primary, elective, non-trauma) ───────────────
  { hrg_code: 'HN12F', description: 'Very Major Hip Procedures, CC 0-1', body_part: 'Hip', cc_score: '0-1', price_gbp: 6788, is_revision: false },
  { hrg_code: 'HN12E', description: 'Very Major Hip Procedures, CC 2-3', body_part: 'Hip', cc_score: '2-3', price_gbp: 7011, is_revision: false },
  { hrg_code: 'HN12D', description: 'Very Major Hip Procedures, CC 4-5', body_part: 'Hip', cc_score: '4-5', price_gbp: 7733, is_revision: false },
  { hrg_code: 'HN12A', description: 'Very Major Hip Procedures, CC 10+', body_part: 'Hip', cc_score: '10+', price_gbp: 13014, is_revision: false },

  // ─── Knee (primary, elective, non-trauma) ──────────────
  { hrg_code: 'HN22E', description: 'Very Major Knee Procedures, CC 0-1', body_part: 'Knee', cc_score: '0-1', price_gbp: 6762, is_revision: false },
  { hrg_code: 'HN22D', description: 'Very Major Knee Procedures, CC 2-3', body_part: 'Knee', cc_score: '2-3', price_gbp: 7095, is_revision: false },
  { hrg_code: 'HN22C', description: 'Very Major Knee Procedures, CC 4-5', body_part: 'Knee', cc_score: '4-5', price_gbp: 7778, is_revision: false },
  { hrg_code: 'HN22A', description: 'Very Major Knee Procedures, CC 10+', body_part: 'Knee', cc_score: '10+', price_gbp: 10136, is_revision: false },

  // ─── Shoulder (primary, elective, non-trauma) ──────────
  { hrg_code: 'HN52C', description: 'Very Major Shoulder Procedures, CC 0-1', body_part: 'Shoulder', cc_score: '0-1', price_gbp: 5919, is_revision: false },
  { hrg_code: 'HN52B', description: 'Very Major Shoulder Procedures, CC 2-3', body_part: 'Shoulder', cc_score: '2-3', price_gbp: 6329, is_revision: false },
  { hrg_code: 'HN52A', description: 'Very Major Shoulder Procedures, CC 4+', body_part: 'Shoulder', cc_score: '4+', price_gbp: 6940, is_revision: false },

  // ─── Elbow (primary, elective, non-trauma) ─────────────
  { hrg_code: 'HN62B', description: 'Very Major Elbow Procedures, CC 0-1', body_part: 'Elbow', cc_score: '0-1', price_gbp: 5919, is_revision: false },
  { hrg_code: 'HN62A', description: 'Very Major Elbow Procedures, CC 2+', body_part: 'Elbow', cc_score: '2+', price_gbp: 6339, is_revision: false },

  // ─── Hip/Knee Revision (elective, non-trauma) ─────────
  { hrg_code: 'HN80D', description: 'Very Complex Hip/Knee Revision, CC 0-2', body_part: 'Hip/Knee', cc_score: '0-2', price_gbp: 11147, is_revision: true },
  { hrg_code: 'HN80C', description: 'Very Complex Hip/Knee Revision, CC 3-5', body_part: 'Hip/Knee', cc_score: '3-5', price_gbp: 14189, is_revision: true },
  { hrg_code: 'HN80B', description: 'Very Complex Hip/Knee Revision, CC 6-8', body_part: 'Hip/Knee', cc_score: '6-8', price_gbp: 18354, is_revision: true },
  { hrg_code: 'HN80A', description: 'Very Complex Hip/Knee Revision, CC 9+', body_part: 'Hip/Knee', cc_score: '9+', price_gbp: 25982, is_revision: true },
  { hrg_code: 'HN81E', description: 'Complex Hip/Knee Revision, CC 0-1', body_part: 'Hip/Knee', cc_score: '0-1', price_gbp: 9191, is_revision: true },
  { hrg_code: 'HN81D', description: 'Complex Hip/Knee Revision, CC 2-3', body_part: 'Hip/Knee', cc_score: '2-3', price_gbp: 9780, is_revision: true },

  // ─── Other Joint Revision (elective, non-trauma) ──────
  { hrg_code: 'HN85Z', description: 'Very Complex Foot/Hand/Shoulder/Elbow Revision', body_part: 'Multi-Joint', cc_score: 'any', price_gbp: 8832, is_revision: true },
  { hrg_code: 'HN86B', description: 'Complex Foot/Hand/Shoulder/Elbow Revision, CC 0-1', body_part: 'Multi-Joint', cc_score: '0-1', price_gbp: 6699, is_revision: true },
  { hrg_code: 'HN86A', description: 'Complex Foot/Hand/Shoulder/Elbow Revision, CC 2+', body_part: 'Multi-Joint', cc_score: '2+', price_gbp: 8237, is_revision: true },

  // ─── Trauma Hip (non-elective, with BPT) ──────────────
  { hrg_code: 'HT12E', description: 'Very Major Hip Trauma, CC 0-2 (BPT)', body_part: 'Hip', cc_score: '0-2', price_gbp: 8589, is_revision: false },
  { hrg_code: 'HT12D', description: 'Very Major Hip Trauma, CC 3-5 (BPT)', body_part: 'Hip', cc_score: '3-5', price_gbp: 10072, is_revision: false },
  { hrg_code: 'HT12A', description: 'Very Major Hip Trauma, CC 12+ (BPT)', body_part: 'Hip', cc_score: '12+', price_gbp: 16447, is_revision: false },
]

// Body part → EMDN category hint for AI mapping
const BODY_PART_EMDN_HINTS: Record<string, string> = {
  'Hip': 'P0908 (Hip Prostheses) or P090801-P090899',
  'Knee': 'P0909 (Knee Prostheses) or P090901-P090999',
  'Shoulder': 'P0910 (Shoulder Prostheses) or similar',
  'Elbow': 'P091003 (Elbow Prostheses) or similar',
  'Hip/Knee': 'P0908/P0909 (Hip or Knee revision)',
  'Multi-Joint': 'P09 (Joint Prostheses, general)',
}

/**
 * Map HRG body parts to EMDN categories via Gemini AI.
 */
async function mapEMDNCategories(): Promise<Map<string, string>> {
  const mappings = new Map<string, string>()

  if (!GEMINI_API_KEY) {
    console.log('  No GEMINI_API_KEY — skipping AI EMDN mapping')
    return mappings
  }

  const { data: categories, error } = await supabase
    .from('emdn_categories')
    .select('id, code, name')
    .like('code', 'P%')
    .order('code')

  if (error || !categories?.length) {
    console.log('  No EMDN categories found')
    return mappings
  }

  const categoryList = categories.map(c => `${c.code}: ${c.name}`).join('\n')
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })

  // Get unique body parts to map
  const bodyParts = [...new Set(NHS_TARIFFS.map(t => t.body_part))]

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Map these orthopedic procedure body parts to EMDN (European Medical Device Nomenclature) category codes.

Body parts to map:
${bodyParts.map(bp => `- "${bp}" (hint: ${BODY_PART_EMDN_HINTS[bp] || 'unknown'})`).join('\n')}

Available EMDN codes:
${categoryList}

For each body part, pick the BEST matching EMDN code for the prosthesis category.
- Hip → hip prostheses category
- Knee → knee prostheses category
- Shoulder → shoulder prostheses category
- Elbow → elbow prostheses category
- Hip/Knee → use the broader joint prostheses parent (hip or knee are both valid)
- Multi-Joint → use the broadest prostheses parent

Return ONLY a JSON array: [{"body_part":"Hip","emdn":"P0908"},...]`,
    })

    const text = response.text || ''
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const results: Array<{ body_part: string; emdn: string }> = JSON.parse(jsonMatch[0])
      for (const r of results) {
        const matched = categories.find(c => c.code === r.emdn)
        if (matched) {
          mappings.set(r.body_part, matched.id)
          console.log(`  ${r.body_part} → ${matched.code} (${matched.name})`)
        }
      }
    }
  } catch (err) {
    console.error('  AI mapping error:', (err as Error).message)
  }

  return mappings
}

async function main() {
  console.log(`GB NHS Tariff Import${isDryRun ? ' (DRY RUN)' : ''}\n`)
  console.log(`Importing ${NHS_TARIFFS.length} HRG procedure tariffs\n`)

  // Step 1: Map body parts to EMDN categories
  console.log('Step 1: Mapping body parts to EMDN categories via AI...')
  const emdnMappings = await mapEMDNCategories()
  console.log(`  Mapped ${emdnMappings.size} body part groups\n`)

  // Step 2: Delete existing GB/NHS tariffs (idempotent)
  if (!isDryRun) {
    const { count: existingCount } = await supabase
      .from('reference_prices')
      .select('*', { count: 'exact', head: true })
      .eq('source_name', 'NHS Tariff')
      .eq('source_country', 'GB')

    if (existingCount && existingCount > 0) {
      console.log(`  Deleting ${existingCount} existing NHS Tariff prices...`)
      const { error: delError } = await supabase
        .from('reference_prices')
        .delete()
        .eq('source_name', 'NHS Tariff')
        .eq('source_country', 'GB')

      if (delError) {
        console.error('  Delete error:', delError.message)
        process.exit(1)
      }
    }
    console.log()
  }

  // Step 3: Prepare rows
  const rows = NHS_TARIFFS.map(tariff => {
    const priceEur = Math.round(tariff.price_gbp * GBP_TO_EUR * 100) / 100

    return {
      product_id: null,
      emdn_category_id: emdnMappings.get(tariff.body_part) || null,
      price_original: tariff.price_gbp,
      currency_original: 'GBP',
      price_eur: priceEur,
      price_type: 'reference',
      price_scope: 'procedure',
      source_country: 'GB',
      source_name: 'NHS Tariff',
      source_url: SOURCE_URL,
      source_code: tariff.hrg_code,
      manufacturer_name: null,
      product_family: tariff.body_part,
      component_description: `${tariff.description} (elective${tariff.is_revision ? ', revision' : ''})`,
      component_type: tariff.is_revision ? 'revision_set' : 'set',
      valid_from: '2024-04-01',
      valid_until: '2025-03-31',
      extraction_method: 'manual',
      notes: `NHS HRG ${tariff.hrg_code}, CC ${tariff.cc_score}, GBP ${tariff.price_gbp} × ${GBP_TO_EUR} = EUR ${Math.round(tariff.price_gbp * GBP_TO_EUR * 100) / 100}`,
    }
  })

  // Check linkage constraint
  const insertable = rows.filter(r => r.emdn_category_id !== null)
  const skipped = rows.filter(r => r.emdn_category_id === null)

  if (skipped.length > 0) {
    console.log(`Warning: ${skipped.length} tariffs have no EMDN mapping and will be skipped:`)
    skipped.forEach(r => console.log(`  - ${r.source_code}: ${r.component_description}`))
    console.log()
  }

  if (isDryRun) {
    console.log('DRY RUN — would insert:')
    for (const r of insertable) {
      console.log(`  ${r.source_code} | GBP ${r.price_original} → EUR ${r.price_eur} | ${r.component_description}`)
    }
    console.log(`\n  Total: ${insertable.length} rows (${skipped.length} skipped — no EMDN mapping)`)
    return
  }

  // Step 4: Insert
  if (insertable.length === 0) {
    console.log('No rows to insert (all tariffs lack EMDN mapping)')
    return
  }

  console.log(`Step 2: Inserting ${insertable.length} reference prices...`)
  const { data, error } = await supabase
    .from('reference_prices')
    .insert(insertable)
    .select('id')

  if (error) {
    console.error('Insert error:', error.message)
    // Try one-by-one to identify failing rows
    console.log('  Retrying one-by-one...')
    let inserted = 0
    for (const row of insertable) {
      const { error: singleErr } = await supabase.from('reference_prices').insert(row)
      if (singleErr) {
        console.error(`  Failed: ${row.source_code} — ${singleErr.message}`)
      } else {
        inserted++
      }
    }
    console.log(`  Inserted ${inserted} of ${insertable.length} rows`)
  } else {
    console.log(`  Inserted ${data?.length || 0} reference prices`)
  }

  // Step 5: Verify
  const { count } = await supabase
    .from('reference_prices')
    .select('*', { count: 'exact', head: true })
    .eq('source_name', 'NHS Tariff')
    .eq('source_country', 'GB')

  console.log(`\nVerification: ${count} NHS Tariff prices in database`)

  // Summary
  console.log('\nPrice ranges (EUR):')
  const byPart = new Map<string, number[]>()
  for (const r of insertable) {
    const prices = byPart.get(r.product_family!) || []
    prices.push(r.price_eur)
    byPart.set(r.product_family!, prices)
  }
  for (const [part, prices] of byPart) {
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    console.log(`  ${part}: EUR ${min.toLocaleString()} — ${max.toLocaleString()} (${prices.length} codes)`)
  }

  console.log('\nDone!')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
