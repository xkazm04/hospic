import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { writeFileSync } from 'fs'

config()

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  // 1. Get full EMDN tree
  const { data: cats, error: e1 } = await sb
    .from('emdn_categories')
    .select('id, code, name, parent_id')
    .order('code')

  if (e1 || !cats) {
    console.error('Failed to fetch categories:', e1)
    return
  }

  console.log(`=== EMDN CATEGORIES (${cats.length}) ===`)
  const catLines: string[] = []
  for (const c of cats) {
    const depth = c.code.length <= 3 ? 0 : Math.ceil((c.code.length - 3) / 2)
    const indent = '  '.repeat(depth)
    const line = `${indent}${c.code} | ${c.name} | ${c.id}`
    catLines.push(line)
  }
  console.log(catLines.join('\n'))

  // Save categories to file for analysis
  writeFileSync('emdn-categories-dump.txt', catLines.join('\n'), 'utf-8')
  console.log('\nSaved to emdn-categories-dump.txt')

  // 2. Get product count
  const { count } = await sb
    .from('products')
    .select('id', { count: 'exact', head: true })
  console.log(`\n=== PRODUCTS: ${count} total ===`)

  // 3. Get all products with current EMDN
  let allProducts: any[] = []
  let from = 0
  const PAGE = 1000
  while (true) {
    const { data, error } = await sb
      .from('products')
      .select('id, name, manufacturer_name, sku, description, emdn_category_id, emdn_categories!products_emdn_category_id_fkey ( code, name )')
      .order('name')
      .range(from, from + PAGE - 1)
    if (error) { console.error('products error:', error); return }
    if (!data || data.length === 0) break
    allProducts = allProducts.concat(data)
    from += PAGE
    if (data.length < PAGE) break
  }

  console.log(`Fetched ${allProducts.length} products`)

  // 4. Group by current EMDN code
  const byCode: Record<string, number> = {}
  let uncategorized = 0
  for (const p of allProducts) {
    const code = (p.emdn_categories as any)?.code || 'NONE'
    byCode[code] = (byCode[code] || 0) + 1
    if (code === 'NONE') uncategorized++
  }
  console.log(`\n=== CURRENT DISTRIBUTION ===`)
  console.log(`Uncategorized: ${uncategorized}`)
  const sorted = Object.entries(byCode).sort((a, b) => b[1] - a[1])
  for (const [code, count] of sorted) {
    const catName = cats.find(c => c.code === code)?.name || ''
    console.log(`  ${code}: ${count} products — ${catName}`)
  }

  // 5. Save full product list as JSON for analysis
  const productList = allProducts.map(p => ({
    id: p.id,
    name: p.name,
    manufacturer: p.manufacturer_name,
    sku: p.sku,
    description: p.description?.substring(0, 200) || null,
    current_emdn_code: (p.emdn_categories as any)?.code || null,
    current_emdn_name: (p.emdn_categories as any)?.name || null,
  }))
  writeFileSync('products-for-recategorization.json', JSON.stringify(productList, null, 2), 'utf-8')
  console.log(`\nSaved ${productList.length} products to products-for-recategorization.json`)
}

main().catch(err => { console.error(err); process.exit(1) })
