import { chromium, type Page } from 'playwright'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PRODUCTS_PATH = resolve(__dirname, '../src/data/products.json')
const CONCURRENCY = 5
const dryRun = process.argv.includes('--dry-run')

interface Product {
  url: string
  retailer: string
  productName: string
  productDetails: string
  brand: string
  quantity: string
  pricePerRound: string
  total: string
  status: string
  nonToxic?: boolean | null
}

interface ProductsData {
  calibers: string[]
  products: Record<string, Product[]>
}

interface Variant {
  qty: number
  price: number
  ppr: number
  available: boolean
}

async function extractAllVariants(page: Page): Promise<Variant[]> {
  return page.evaluate(() => {
    const text = document.body?.innerText || ''
    const lines = text.split('\n').map(l => l.trim())
    const variants: { qty: number; price: number; ppr: number; available: boolean }[] = []

    for (let i = 0; i < lines.length; i++) {
      // Match "Valitse NNN kpl" (Aawee, Ruoto, others)
      // Also match "NNN kpl" preceded by a select/option context
      const m = lines[i].match(/^Valitse\s+(\d+)\s*kpl$/i)
      if (!m) continue
      const qty = parseInt(m[1])
      const priceLine = lines[i + 1] || ''
      const pm = priceLine.match(/([\d\s]+[.,]\d{2})\s*€/)
      if (!pm) continue
      const price = parseFloat(pm[1].replace(/\s/g, '').replace(',', '.'))
      if (isNaN(price) || price <= 0) continue

      let available = true
      for (let j = i + 2; j < Math.min(i + 5, lines.length); j++) {
        if (/tilapäisesti loppu|loppunut/i.test(lines[j])) { available = false; break }
        if (/^heti|saatavilla/i.test(lines[j])) { break }
      }
      variants.push({ qty, price, ppr: Math.round((price / qty) * 1000) / 1000, available })
    }
    return variants
  })
}

function parseQuantity(s: string): number {
  const m = s.match(/(\d+)/)
  return m ? parseInt(m[1]) : 0
}

async function main() {
  const data: ProductsData = JSON.parse(readFileSync(PRODUCTS_PATH, 'utf-8'))

  // Group products by URL, track which caliber each URL belongs to
  const byUrl = new Map<string, { caliber: string; products: Product[] }>()
  for (const caliber of data.calibers) {
    for (const product of data.products[caliber]) {
      const existing = byUrl.get(product.url)
      if (existing) {
        existing.products.push(product)
      } else {
        byUrl.set(product.url, { caliber, products: [product] })
      }
    }
  }

  // Only process URLs that have entries (to discover missing variants)
  const urls = [...byUrl.keys()]
  console.log(`Checking ${urls.length} unique URLs for variant quantities...\n`)

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  })

  let added = 0
  let updated = 0
  let completed = 0

  async function processUrl(url: string) {
    const entry = byUrl.get(url)!
    const { caliber, products } = entry
    const domain = new URL(url).hostname.replace('www.', '')
    const page = await context.newPage()

    try {
      await page.goto(url, { timeout: 15000, waitUntil: 'domcontentloaded' })
      // Wait for SPA content
      try { await page.waitForSelector('h1', { timeout: 8000 }) } catch {}

      const variants = await extractAllVariants(page)
      completed++

      if (variants.length < 2) {
        // Single-variant or no variants detected — skip
        console.log(`[${completed}/${urls.length}] ${domain} | ${products[0].productName} — ${variants.length === 1 ? '1 variant (single)' : 'no variants'}`)
        return
      }

      // Find which variant quantities we already have
      const existingQtys = new Set(products.map(p => parseQuantity(p.quantity)))
      const missingVariants = variants.filter(v => !existingQtys.has(v.qty))
      const existingVariants = variants.filter(v => existingQtys.has(v.qty))

      // Template from the first product (for shared fields)
      const template = products[0]

      // Update existing variants with correct prices/availability
      for (const variant of existingVariants) {
        const product = products.find(p => parseQuantity(p.quantity) === variant.qty)
        if (!product) continue

        const newPpr = `${variant.ppr.toFixed(3)}€`
        const newTotal = `${variant.price.toFixed(2)}€`
        const newStatus = variant.available ? 'Available' : 'Out of Stock'
        const changes: string[] = []

        if (product.pricePerRound !== newPpr) changes.push(`ppr ${product.pricePerRound}→${newPpr}`)
        if (product.total !== newTotal) changes.push(`total ${product.total}→${newTotal}`)
        if (product.status !== newStatus) changes.push(`status ${product.status}→${newStatus}`)

        if (changes.length > 0) {
          product.pricePerRound = newPpr
          product.total = newTotal
          product.status = newStatus
          updated++
          console.log(`[${completed}/${urls.length}] ${domain} | ${product.productName} qty ${variant.qty}: ${changes.join(', ')}`)
        }
      }

      // Add missing variants
      if (missingVariants.length > 0) {
        console.log(`[${completed}/${urls.length}] ${domain} | ${template.productName} — adding ${missingVariants.length} missing variants: ${missingVariants.map(v => v.qty + 'kpl').join(', ')}`)
        for (const variant of missingVariants) {
          const newProduct: Product = {
            url: template.url,
            retailer: template.retailer,
            productName: template.productName,
            productDetails: template.productDetails,
            brand: template.brand,
            quantity: String(variant.qty),
            pricePerRound: `${variant.ppr.toFixed(3)}€`,
            total: `${variant.price.toFixed(2)}€`,
            status: variant.available ? 'Available' : 'Out of Stock',
          }
          if (template.nonToxic === true) newProduct.nonToxic = true
          data.products[caliber].push(newProduct)
          added++
        }
      }
    } catch (err) {
      completed++
      const msg = err instanceof Error ? err.message.slice(0, 60) : String(err)
      console.log(`[${completed}/${urls.length}] ${domain} — ERROR: ${msg}`)
    } finally {
      await page.close()
    }
  }

  // Process in parallel batches
  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    const batch = urls.slice(i, i + CONCURRENCY)
    await Promise.all(batch.map(processUrl))
  }

  await browser.close()

  console.log(`\n--- Summary ---`)
  console.log(`${added} new variant entries added`)
  console.log(`${updated} existing entries updated`)

  if (dryRun) {
    console.log('(DRY RUN — no changes written)')
  } else if (added > 0 || updated > 0) {
    writeFileSync(PRODUCTS_PATH, JSON.stringify(data, null, 2) + '\n')
    console.log(`Written to ${PRODUCTS_PATH}`)
  } else {
    console.log('No changes needed')
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
