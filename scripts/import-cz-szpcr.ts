/**
 * Import Czech SZP CR reference prices for orthopedic implants.
 *
 * Source: SZP CR (Association of Health Insurance Companies of Czech Republic)
 * URL: https://szpcr.cz/zdravotnicke_prostredky
 * File: ZP{YYMMDD}.txt — comma-delimited CSV, CP852 encoding
 *
 * Pre-requisite: Convert the TXT file from CP852 to UTF-8 before running:
 *   iconv -f CP852 -t UTF-8 scripts/data/cz-szpcr-2026.txt > scripts/data/cz-szpcr-2026-utf8.txt
 *
 * Orthopedic TYP groups imported:
 *   84 = Osteosynthesis (screws, plates, nails)
 *   86 = Knee joint replacement components
 *   87 = Hip joint replacement components
 *   88 = Other joint replacement components (shoulder, elbow, ankle)
 *   89 = Bone cements
 *   91 = External fixation components
 *
 * Usage: npm run import:cz-szpcr
 *        npm run import:cz-szpcr -- --dry-run
 *        npm run import:cz-szpcr -- --joints-only  (skip osteosynthesis & fixation)
 */

import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'
import { config } from 'dotenv'
import { readFileSync, existsSync, writeFileSync } from 'fs'

config({ path: '.env.local' })
config({ path: '.env' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const isDryRun = process.argv.includes('--dry-run')
const jointsOnly = process.argv.includes('--joints-only')

const DATA_FILE = 'scripts/data/cz-szpcr-2026-utf8.txt'
const MAPPING_CACHE_FILE = 'scripts/data/cz-typ-emdn-mapping.json'

// ECB reference rate (Jan 2026) — CZK/EUR is relatively stable around 25.0-25.5
const CZK_TO_EUR = 1 / 25.3

const SOURCE_URL = 'https://szpcr.cz/zdravotnicke_prostredky'

// Orthopedic TYP groups
const ORTHO_GROUPS_JOINTS = new Set(['86', '87', '88', '89'])
const ORTHO_GROUPS_ALL = new Set(['84', '86', '87', '88', '89', '91'])

const TYP_LABELS: Record<string, string> = {
  '84': 'Osteosynthesis',
  '86': 'Knee Replacement',
  '87': 'Hip Replacement',
  '88': 'Other Joint Replacement',
  '89': 'Bone Cement',
  '91': 'External Fixation',
}

// CSV column indices (0-based, from SZP CR TXT file format)
const COL = {
  KOD: 0,        // Device code (7 chars)
  NAZ: 2,        // Device name (Czech)
  DOP: 3,        // Description supplement
  PRO: 4,        // "M" = ZUM (separately invoiced material)
  TYP: 5,        // Device type/group (84, 86, 87, 88, 89, 91)
  MJD: 8,        // Unit of measure (ks, den, par)
  VYR: 9,        // Manufacturer 3-letter code
  ZEM: 10,       // Manufacturer country (ISO 2-letter)
  AKC: 12,       // Current active price (CZK)
  MAX: 21,       // Maximum insurance reimbursement (CZK)
  DAT: 29,       // Date of last change (DDMMYYYY)
}

// ─── Types ───────────────────────────────────────────────────────────

interface DeviceEntry {
  kod: string
  name: string
  description: string
  typ: string
  unit: string
  manufacturer: string
  country: string
  price_czk: number
  max_reimbursement_czk: number
  date: string
}

// ─── CSV Parsing ────────────────────────────────────────────────────

function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let i = 0
  while (i < line.length) {
    if (line[i] === '"') {
      i++ // skip opening quote
      let val = ''
      while (i < line.length && line[i] !== '"') {
        val += line[i]
        i++
      }
      i++ // skip closing quote
      if (i < line.length && line[i] === ',') i++ // skip comma
      fields.push(val)
    } else if (line[i] === ',') {
      fields.push('')
      i++
    } else {
      let val = ''
      while (i < line.length && line[i] !== ',') {
        val += line[i]
        i++
      }
      if (i < line.length && line[i] === ',') i++
      fields.push(val.trim())
    }
  }
  return fields
}

function parseFile(): DeviceEntry[] {
  if (!existsSync(DATA_FILE)) {
    console.error(`Data file not found: ${DATA_FILE}`)
    console.error('Download from: https://szpcr.cz/zdravotnicke_prostredky')
    console.error('Then convert: iconv -f CP852 -t UTF-8 cz-szpcr-2026.txt > cz-szpcr-2026-utf8.txt')
    process.exit(1)
  }

  const data = readFileSync(DATA_FILE, 'utf8')
  const lines = data.split('\n').filter(l => l.trim())
  const orthoGroups = jointsOnly ? ORTHO_GROUPS_JOINTS : ORTHO_GROUPS_ALL
  const entries: DeviceEntry[] = []

  for (const line of lines) {
    const f = parseCsvLine(line)
    if (f.length < 22) continue

    const pro = f[COL.PRO]
    const typ = f[COL.TYP]

    // Only ZUM items in orthopedic groups
    if (pro !== 'M' || !orthoGroups.has(typ)) continue

    const priceCzk = parseFloat(f[COL.AKC]) || 0
    const maxCzk = parseFloat(f[COL.MAX]) || 0

    // Skip items with no valid price
    if (priceCzk <= 0 && maxCzk <= 0) continue

    entries.push({
      kod: f[COL.KOD],
      name: f[COL.NAZ],
      description: f[COL.DOP],
      typ,
      unit: f[COL.MJD] || 'ks',
      manufacturer: f[COL.VYR],
      country: f[COL.ZEM],
      price_czk: priceCzk,
      max_reimbursement_czk: maxCzk,
      date: f[COL.DAT],
    })
  }

  return entries
}

// ─── EMDN Mapping ────────────────────────────────────────────────────

type TypToEMDNMap = Record<string, { emdn_id: string; emdn_code: string; emdn_name: string }>

async function mapTypToEMDN(typCodes: string[]): Promise<TypToEMDNMap> {
  // Check cache first
  if (existsSync(MAPPING_CACHE_FILE)) {
    console.log('  Loading cached TYP→EMDN mappings...')
    const cached = JSON.parse(readFileSync(MAPPING_CACHE_FILE, 'utf8'))
    const missing = typCodes.filter(c => !(c in cached))
    if (missing.length === 0) {
      console.log(`  All ${typCodes.length} codes cached`)
      return cached
    }
    console.log(`  ${typCodes.length - missing.length} cached, ${missing.length} need mapping`)
  }

  if (!GEMINI_API_KEY) {
    console.log('  No GEMINI_API_KEY — skipping AI EMDN mapping')
    return {}
  }

  const { data: emdnCats, error } = await supabase
    .from('emdn_categories')
    .select('id, code, name')
    .like('code', 'P%')
    .order('code')

  if (error || !emdnCats?.length) {
    console.log('  No EMDN categories found in DB')
    return {}
  }

  const categoryList = emdnCats.map(c => `${c.code}: ${c.name}`).join('\n')
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })
  const mapping: TypToEMDNMap = {}

  // Load existing cache to extend
  if (existsSync(MAPPING_CACHE_FILE)) {
    Object.assign(mapping, JSON.parse(readFileSync(MAPPING_CACHE_FILE, 'utf8')))
  }

  const unmapped = typCodes.filter(c => !(c in mapping))
  if (unmapped.length === 0) return mapping

  try {
    const typDescriptions = unmapped.map(t => `TYP ${t}: ${TYP_LABELS[t] || 'unknown'}`).join('\n')

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Map these Czech medical device TYP group codes to EMDN (European Medical Device Nomenclature) categories.

Czech TYP codes for orthopedic devices:
${typDescriptions}

Context:
- TYP 84: Osteosynthesis material (plates, screws, nails, wires for fracture fixation)
- TYP 86: Knee joint replacement components (tibial, femoral, inserts, patella)
- TYP 87: Hip joint replacement components (acetabular cups, femoral stems, heads)
- TYP 88: Other joint replacement components (shoulder, elbow, ankle prostheses)
- TYP 89: Bone cements (PMMA cements for cemented prostheses)
- TYP 91: External fixation components (external fixators, pins, clamps)

Available EMDN codes:
${categoryList}

For each TYP code, return the best matching EMDN code for the prostheses/device category.
Return ONLY a JSON array: [{"typ":"86","emdn":"P0909"},{"typ":"87","emdn":"P0908"},...]
If no good match, use "NONE".`,
    })

    const text = response.text || ''
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const results: Array<{ typ: string; emdn: string }> = JSON.parse(jsonMatch[0])
      for (const r of results) {
        if (r.emdn === 'NONE') continue
        const matched = emdnCats.find(c => c.code === r.emdn)
        if (matched) {
          mapping[r.typ] = { emdn_id: matched.id, emdn_code: matched.code, emdn_name: matched.name }
          console.log(`  TYP ${r.typ} (${TYP_LABELS[r.typ]}) → ${matched.code} (${matched.name})`)
        }
      }
    }
  } catch (err) {
    console.error('  AI mapping error:', (err as Error).message)
  }

  // Save cache
  writeFileSync(MAPPING_CACHE_FILE, JSON.stringify(mapping, null, 2))
  console.log(`  Saved mapping cache to ${MAPPING_CACHE_FILE}`)

  return mapping
}

// ─── DB Insert ───────────────────────────────────────────────────────

async function insertPrices(entries: DeviceEntry[], typMapping: TypToEMDNMap) {
  const rows: any[] = []

  for (const entry of entries) {
    const emdn = typMapping[entry.typ]
    if (!emdn) continue // Skip unmapped TYP groups

    // Use MAX reimbursement as the reference price (= what insurance pays)
    // Fall back to AKC (active price) if MAX is 0
    const priceCzk = entry.max_reimbursement_czk > 0 ? entry.max_reimbursement_czk : entry.price_czk
    const priceEur = Math.round(priceCzk * CZK_TO_EUR * 100) / 100

    // Parse date from DDMMYYYY format
    let validFrom: string | null = null
    if (entry.date && entry.date.length === 8) {
      const dd = entry.date.substring(0, 2)
      const mm = entry.date.substring(2, 4)
      const yyyy = entry.date.substring(4, 8)
      validFrom = `${yyyy}-${mm}-${dd}`
    }

    rows.push({
      product_id: null,
      emdn_category_id: emdn.emdn_id,
      price_original: priceCzk,
      currency_original: 'CZK',
      price_eur: priceEur,
      price_type: 'reimbursement_ceiling',
      price_scope: 'component',
      source_country: 'CZ',
      source_name: 'SZP CR',
      source_url: SOURCE_URL,
      source_code: entry.kod,
      manufacturer_name: entry.manufacturer || null,
      product_family: TYP_LABELS[entry.typ] || null,
      component_description: entry.description
        ? `${entry.name} — ${entry.description}`
        : entry.name,
      valid_from: validFrom || '2026-02-01',
      valid_until: null,
      extraction_method: 'csv_import',
      notes: `TYP ${entry.typ}, ${entry.unit}, ${entry.country}, CZK ${priceCzk} × ${CZK_TO_EUR.toFixed(5)} = EUR ${priceEur}`,
    })
  }

  console.log(`\nPrepared ${rows.length} rows for insert`)
  for (const typ of Object.keys(TYP_LABELS)) {
    const count = rows.filter(r => r.notes?.includes(`TYP ${typ}`)).length
    if (count > 0) console.log(`  TYP ${typ} (${TYP_LABELS[typ]}): ${count} rows`)
  }

  if (isDryRun) {
    console.log('\nDRY RUN — sample rows:')
    // Show 3 samples per group
    const shown = new Map<string, number>()
    for (const r of rows) {
      const typ = r.notes?.match(/TYP (\d+)/)?.[1] || ''
      const count = shown.get(typ) || 0
      if (count < 3) {
        console.log(`  ${r.source_code} | CZK ${r.price_original} → EUR ${r.price_eur} | ${r.component_description?.substring(0, 70)}`)
        shown.set(typ, count + 1)
      }
    }
    if (rows.length > 18) console.log(`  ... and ${rows.length - Math.min(18, rows.length)} more`)
    return
  }

  // Delete existing CZ/SZP CR prices (idempotent re-import)
  console.log('\nRemoving existing CZ/SZP CR prices...')
  const { error: delError } = await supabase
    .from('reference_prices')
    .delete()
    .eq('source_country', 'CZ')
    .eq('source_name', 'SZP CR')
    .eq('extraction_method', 'csv_import')

  if (delError) {
    console.error('Delete error:', delError.message)
  }

  // Insert in batches of 100
  let inserted = 0
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100)
    const { data, error } = await supabase.from('reference_prices').insert(batch).select('id')

    if (error) {
      console.error(`Batch ${Math.floor(i / 100) + 1} insert error:`, error.message)
      // Retry one-by-one
      console.log('  Retrying one-by-one...')
      for (const row of batch) {
        const { error: singleErr } = await supabase.from('reference_prices').insert(row)
        if (singleErr) {
          console.error(`  Failed: ${row.source_code} — ${singleErr.message}`)
        } else {
          inserted++
        }
      }
    } else {
      inserted += data?.length || 0
    }

    process.stdout.write(`\r  Inserted ${inserted}/${rows.length}`)
  }

  console.log(`\n\nInserted ${inserted} reference prices`)

  // Verify
  const { count } = await supabase
    .from('reference_prices')
    .select('*', { count: 'exact', head: true })
    .eq('source_country', 'CZ')
    .eq('source_name', 'SZP CR')

  console.log(`Verification: ${count} CZ/SZP CR prices in database`)
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log(`CZ SZP CR Import${isDryRun ? ' (DRY RUN)' : ''}${jointsOnly ? ' (joints only)' : ''}\n`)

  // Step 1: Parse CSV
  console.log('Step 1: Parsing data file...')
  const entries = parseFile()
  console.log(`  Found ${entries.length} orthopedic device entries`)

  // Show breakdown
  const byTyp = new Map<string, number>()
  for (const e of entries) {
    byTyp.set(e.typ, (byTyp.get(e.typ) || 0) + 1)
  }
  console.log('\n  Category breakdown:')
  for (const [typ, count] of [...byTyp.entries()].sort()) {
    console.log(`    TYP ${typ} (${TYP_LABELS[typ] || '?'}): ${count} devices`)
  }

  // Show manufacturer breakdown (top 10)
  const byMfr = new Map<string, number>()
  for (const e of entries) {
    const mfr = e.manufacturer || 'Unknown'
    byMfr.set(mfr, (byMfr.get(mfr) || 0) + 1)
  }
  console.log('\n  Top manufacturers:')
  for (const [mfr, count] of [...byMfr.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`    ${mfr}: ${count}`)
  }

  // Price range per group
  console.log('\n  Price ranges (CZK):')
  for (const [typ, label] of Object.entries(TYP_LABELS)) {
    const prices = entries.filter(e => e.typ === typ).map(e => e.max_reimbursement_czk || e.price_czk)
    if (prices.length === 0) continue
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
    console.log(`    TYP ${typ} (${label}): ${min.toLocaleString()} — ${max.toLocaleString()} CZK (avg ${avg.toLocaleString()})`)
  }

  // Step 2: Map TYP codes to EMDN
  console.log('\nStep 2: Mapping TYP codes to EMDN categories...')
  const allTypCodes = [...new Set(entries.map(e => e.typ))]
  const typMapping = await mapTypToEMDN(allTypCodes)
  const mappedCount = allTypCodes.filter(c => c in typMapping).length
  console.log(`  Mapped ${mappedCount} of ${allTypCodes.length} TYP codes to EMDN`)

  const unmapped = allTypCodes.filter(c => !(c in typMapping))
  if (unmapped.length > 0) {
    console.log(`  Unmapped codes: ${unmapped.map(c => `${c} (${TYP_LABELS[c]})`).join(', ')}`)
  }

  // Step 3: Insert
  console.log('\nStep 3: Inserting reference prices...')
  await insertPrices(entries, typMapping)

  console.log('\nDone!')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
