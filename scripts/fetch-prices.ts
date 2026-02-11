import { chromium, type Page } from 'playwright'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PRODUCTS_PATH = resolve(__dirname, '../src/data/products.json')
const TIMEOUT = 15_000
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

interface PriceResult {
  price: number | null
  available: boolean | null
  nonToxic: boolean | null
  strategy: string
}

// --- Price extraction strategies ---

async function tryJsonLd(page: Page): Promise<PriceResult> {
  const result = await page.evaluate(() => {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]')
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent || '')
        const items = Array.isArray(data) ? data : [data]
        for (const item of items) {
          if (item['@type'] === 'Product' || item['@type'] === 'IndividualProduct') {
            const offers = item.offers
            if (!offers) continue
            const offer = Array.isArray(offers) ? offers[0] : offers
            const price = offer.lowPrice ?? offer.price
            const avail = offer.availability
            if (price != null) {
              return {
                price: typeof price === 'string' ? parseFloat(price.replace(',', '.')) : price,
                available: avail ? avail.includes('InStock') : null,
              }
            }
          }
        }
      } catch { /* skip malformed JSON-LD */ }
    }
    return null
  })
  if (result?.price) return { ...result, nonToxic: null, strategy: 'json-ld' }
  return { price: null, available: null, nonToxic: null, strategy: 'json-ld' }
}

async function tryMetaTags(page: Page): Promise<PriceResult> {
  const result = await page.evaluate(() => {
    const priceMeta =
      document.querySelector<HTMLMetaElement>('meta[itemprop="price"]') ??
      document.querySelector<HTMLMetaElement>('meta[property="product:price:amount"]')
    if (priceMeta?.content) {
      const price = parseFloat(priceMeta.content.replace(',', '.'))
      const availMeta = document.querySelector<HTMLMetaElement>('meta[itemprop="availability"]')
      const available = availMeta ? availMeta.content.includes('InStock') : null
      return { price: isNaN(price) ? null : price, available }
    }
    return null
  })
  if (result?.price) return { ...result, nonToxic: null, strategy: 'meta-tags' }
  return { price: null, available: null, nonToxic: null, strategy: 'meta-tags' }
}

async function tryDomSelectors(page: Page): Promise<PriceResult> {
  const result = await page.evaluate(() => {
    const selectors = [
      // WooCommerce
      '.woocommerce-Price-amount bdi',
      '.woocommerce-Price-amount',
      'p.price ins .woocommerce-Price-amount bdi',
      'p.price .woocommerce-Price-amount bdi',
      // Ahtihuvila
      '.tuotekortti_tuotehinta_tarjous',
      // Generic
      '.product-price .current-price',
      '.product-price',
      '[data-price]',
      '.price-value',
      '.current-price',
    ]

    for (const sel of selectors) {
      const el = document.querySelector(sel)
      if (el) {
        const text = el.textContent?.trim() || ''
        const match = text.match(/([\d\s]+[.,]\d{2})/)
        if (match) {
          const price = parseFloat(match[1].replace(/\s/g, '').replace(',', '.'))
          if (!isNaN(price) && price > 0) return { price }
        }
        // data-price attribute
        if (el instanceof HTMLElement && el.dataset.price) {
          const price = parseFloat(el.dataset.price.replace(',', '.'))
          if (!isNaN(price) && price > 0) return { price }
        }
      }
    }
    return null
  })
  if (result?.price) return { price: result.price, available: null, nonToxic: null, strategy: 'dom-selectors' }
  return { price: null, available: null, nonToxic: null, strategy: 'dom-selectors' }
}

async function tryJsVariables(page: Page): Promise<PriceResult> {
  const result = await page.evaluate(() => {
    // Ahtihuvila uses `valittuhinta`, asejaosa uses `productPrice`
    const w = window as Record<string, unknown>
    for (const key of ['valittuhinta', 'productPrice']) {
      const val = w[key]
      if (typeof val === 'number' && val > 0) return { price: val }
      if (typeof val === 'string') {
        const price = parseFloat(val.replace(',', '.'))
        if (!isNaN(price) && price > 0) return { price }
      }
    }
    return null
  })
  if (result?.price) return { price: result.price, available: null, nonToxic: null, strategy: 'js-variables' }
  return { price: null, available: null, nonToxic: null, strategy: 'js-variables' }
}

async function tryTextRegex(page: Page): Promise<PriceResult> {
  const result = await page.evaluate(() => {
    // Get visible text and find price patterns
    const body = document.body?.innerText || ''
    // Match prices like "16,90 €", "299.00€", "1 719,00 €"
    const matches = [...body.matchAll(/([\d\s]+[.,]\d{2})\s*€/g)]
    if (matches.length === 0) return null

    // Return the first reasonable price (usually the main product price)
    // Filter out very small numbers that might be unit prices
    const prices = matches
      .map(m => parseFloat(m[1].replace(/\s/g, '').replace(',', '.')))
      .filter(p => !isNaN(p) && p > 0)

    if (prices.length === 0) return null
    return { price: prices[0] }
  })
  if (result?.price) return { price: result.price, available: null, nonToxic: null, strategy: 'text-regex' }
  return { price: null, available: null, nonToxic: null, strategy: 'text-regex' }
}

async function extractAvailability(page: Page): Promise<boolean | null> {
  return page.evaluate(() => {
    // JSON-LD
    const scripts = document.querySelectorAll('script[type="application/ld+json"]')
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent || '')
        const items = Array.isArray(data) ? data : [data]
        for (const item of items) {
          const offers = item.offers
          if (!offers) continue
          const offer = Array.isArray(offers) ? offers[0] : offers
          if (offer.availability) return offer.availability.includes('InStock')
        }
      } catch { /* skip */ }
    }

    // Meta tags
    const availMeta = document.querySelector('meta[itemprop="availability"]') as HTMLMetaElement
    if (availMeta?.content) return availMeta.content.includes('InStock')

    // Common availability indicators in page text
    const text = document.body?.innerText?.toLowerCase() || ''
    if (text.includes('varastossa') || text.includes('saatavilla')) return true
    if (text.includes('ei varastossa') || text.includes('loppunut') || text.includes('ilmoita, kun saatavilla')) return false

    // CSS classes
    const inStock = document.querySelector('.in-stock, .instock, .available')
    const outOfStock = document.querySelector('.out-of-stock, .outofstock, .unavailable, .sold-out')
    if (inStock) return true
    if (outOfStock) return false

    // Add to cart button presence
    const cartBtn = document.querySelector('[name="add-to-cart"], .add-to-cart, #add-to-cart, .ostoskorinappi, #ostoskorinappi')
    if (cartBtn) {
      const disabled = (cartBtn as HTMLButtonElement).disabled
      return !disabled
    }

    return null
  })
}

async function extractNonToxic(page: Page): Promise<boolean | null> {
  return page.evaluate(() => {
    const keywords = [
      'lyijyton', 'lyijytön',
      'lead-free', 'lead free',
      'non-toxic', 'non toxic', 'nontoxic',
      'sintox', 'tfmj',
      'monolithic', 'solid copper', 'kupariluoti',
    ]
    const pattern = new RegExp(keywords.join('|'), 'i')

    // JSON-LD product name + description
    const scripts = document.querySelectorAll('script[type="application/ld+json"]')
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent || '')
        const items = Array.isArray(data) ? data : [data]
        for (const item of items) {
          if (item['@type'] === 'Product' || item['@type'] === 'IndividualProduct') {
            const haystack = `${item.name || ''} ${item.description || ''}`
            if (pattern.test(haystack)) return true
          }
        }
      } catch { /* skip */ }
    }

    // Meta description
    const metaDesc = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (metaDesc?.content && pattern.test(metaDesc.content)) return true

    // Visible page text within product area
    const container = document.querySelector('.product, main, article') || document.body
    const text = container?.textContent || ''
    if (pattern.test(text)) return true

    return null
  })
}

async function extractPrice(page: Page): Promise<PriceResult> {
  // Try server-rendered strategies first (no SPA wait needed)
  const fastStrategies = [tryJsonLd, tryMetaTags, tryDomSelectors, tryJsVariables]
  for (const strategy of fastStrategies) {
    const result = await strategy(page)
    if (result.price !== null) {
      if (result.available === null) result.available = await extractAvailability(page)
      result.nonToxic = await extractNonToxic(page)
      return result
    }
  }

  // If nothing found, this is likely a SPA — wait for rendering and retry
  await page.waitForTimeout(3000)
  for (const strategy of fastStrategies) {
    const result = await strategy(page)
    if (result.price !== null) {
      if (result.available === null) result.available = await extractAvailability(page)
      result.nonToxic = await extractNonToxic(page)
      return result
    }
  }

  // Last resort: text regex
  const textResult = await tryTextRegex(page)
  if (textResult.price !== null) {
    textResult.available = await extractAvailability(page)
    textResult.nonToxic = await extractNonToxic(page)
    return textResult
  }

  const available = await extractAvailability(page)
  const nonToxic = await extractNonToxic(page)
  return { price: null, available, nonToxic, strategy: 'none' }
}

// --- Formatting helpers ---

function parseQuantity(s: string): number {
  const match = s.match(/(\d+)/)
  return match ? parseInt(match[1]) : 0
}

function formatPrice(price: number): string {
  if (price >= 1000) {
    const formatted = price.toFixed(2)
    const [whole, decimals] = formatted.split('.')
    // Add space as thousands separator
    const withSpaces = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    return `${withSpaces}.${decimals}€`
  }
  return `${price.toFixed(2)}€`
}

function formatPricePerRound(price: number): string {
  return `${price.toFixed(3)}€`
}

// --- Main ---

async function main() {
  const data: ProductsData = JSON.parse(readFileSync(PRODUCTS_PATH, 'utf-8'))

  // Collect all unique URLs
  const urlSet = new Set<string>()
  for (const caliber of data.calibers) {
    for (const product of data.products[caliber]) {
      if (product.url) urlSet.add(product.url)
    }
  }
  const urls = [...urlSet]
  console.log(`Found ${urls.length} unique URLs across ${data.calibers.length} calibers`)
  if (dryRun) console.log('(DRY RUN — no files will be written)\n')

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  })

  const results = new Map<string, PriceResult>()
  let succeeded = 0
  let failed = 0
  let completed = 0

  async function fetchUrl(url: string) {
    const domain = new URL(url).hostname.replace('www.', '')
    const page = await context.newPage()
    try {
      await page.goto(url, { timeout: TIMEOUT, waitUntil: 'domcontentloaded' })
      const result = await extractPrice(page)
      results.set(url, result)

      completed++
      if (result.price !== null) {
        const availStr = result.available === true ? 'In Stock' : result.available === false ? 'Out of Stock' : '?'
        const ntStr = result.nonToxic === true ? ' [NT]' : ''
        console.log(`[${completed}/${urls.length}] ${domain} → ${result.price.toFixed(2)}€ [${availStr}]${ntStr} (${result.strategy})`)
        succeeded++
      } else {
        console.log(`[${completed}/${urls.length}] ${domain} → FAILED`)
        failed++
      }
    } catch (err) {
      completed++
      const msg = err instanceof Error ? err.message.slice(0, 60) : String(err)
      console.log(`[${completed}/${urls.length}] ${domain} → ERROR: ${msg}`)
      results.set(url, { price: null, available: null, nonToxic: null, strategy: 'error' })
      failed++
    } finally {
      await page.close()
    }
  }

  // Process URLs in parallel batches
  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    const batch = urls.slice(i, i + CONCURRENCY)
    await Promise.all(batch.map(fetchUrl))
  }

  await browser.close()

  console.log(`\n--- Results: ${succeeded} succeeded, ${failed} failed ---\n`)

  // Build a flat list of all products with their caliber reference
  const allProducts: { product: Product; caliber: string }[] = []
  for (const caliber of data.calibers) {
    for (const product of data.products[caliber]) {
      allProducts.push({ product, caliber })
    }
  }

  // Group products by URL
  const byUrl = new Map<string, { product: Product; caliber: string }[]>()
  for (const entry of allProducts) {
    const list = byUrl.get(entry.product.url) ?? []
    list.push(entry)
    byUrl.set(entry.product.url, list)
  }

  // Apply corrections to ALL entries per URL.
  //
  // Key insight: the quantity field from patruunat.fi sometimes shows box counts
  // (e.g., "1+" = 1 box, "20+" = 20 boxes) instead of round counts. But the
  // pricePerRound was always calculated using actual rounds. So for any entry:
  //   actual_rounds = total / pricePerRound
  // gives the real round count regardless of what "quantity" says.
  //
  // Strategy:
  // 1. Find the entry whose total is closest to the scraped price (= base unit)
  // 2. Determine rounds_per_box = base_entry.total / base_entry.pricePerRound
  // 3. Calculate new_ppr = scraped_price / rounds_per_box
  // 4. For ALL entries: derive their actual_rounds, then recalculate total + ppr
  let corrections = 0
  for (const [url, entries] of byUrl) {
    const result = results.get(url)
    if (!result) continue

    // Update availability for all entries sharing this URL
    if (result.available !== null) {
      for (const { product } of entries) {
        const newStatus = result.available ? 'Available' : 'Out of Stock'
        if (product.status !== newStatus) {
          console.log(`  ${product.retailer} | ${product.productName} — status: ${product.status} → ${newStatus}`)
          product.status = newStatus
          corrections++
        }
      }
    }

    // Update non-toxic status for all entries sharing this URL
    if (result.nonToxic === true) {
      for (const { product } of entries) {
        if (product.nonToxic !== true) {
          console.log(`  ${product.retailer} | ${product.productName} — non-toxic: detected`)
          product.nonToxic = true
          corrections++
        }
      }
    }

    if (result.price === null) continue
    const scrapedPrice = result.price

    // Find the entry whose total is closest to the scraped price
    let closest: { product: Product; caliber: string } | null = null
    let closestDiff = Infinity
    for (const entry of entries) {
      const total = parseFloat(entry.product.total.replace('€', '').replace(/\s/g, ''))
      const diff = Math.abs(total - scrapedPrice)
      if (diff < closestDiff) {
        closestDiff = diff
        closest = entry
      }
    }
    if (!closest) continue

    // Determine rounds per box from the closest entry
    const basePPR = parseFloat(closest.product.pricePerRound.replace('€', ''))
    const baseTotal = parseFloat(closest.product.total.replace('€', '').replace(/\s/g, ''))
    if (basePPR <= 0 || baseTotal <= 0) continue
    const roundsPerBox = Math.round(baseTotal / basePPR)
    if (roundsPerBox < 10) {
      // No ammo comes in boxes of less than 10 — likely bad data (e.g. PPR = box price)
      const domain = new URL(url).hostname.replace('www.', '')
      console.log(`  SKIP ${domain} — roundsPerBox=${roundsPerBox} (bad base data)`)
      continue
    }

    // New price per round from scraped data
    const newPPR = scrapedPrice / roundsPerBox

    // Update all entries for this URL
    for (const { product } of entries) {
      const oldPPR = parseFloat(product.pricePerRound.replace('€', ''))
      const oldTotal = parseFloat(product.total.replace('€', '').replace(/\s/g, ''))
      if (oldPPR <= 0 || oldTotal <= 0) continue

      // Sanity check: reject corrections where PPR changes by more than 3x
      const pprRatio = newPPR / oldPPR
      if (pprRatio > 3 || pprRatio < 1 / 3) {
        console.log(`  SKIP ${product.retailer} | ${product.productName} — PPR change too large (${oldPPR.toFixed(3)} → ${newPPR.toFixed(3)}, ${pprRatio.toFixed(1)}x)`)
        continue
      }

      // Actual rounds this entry covers (derived from its own total/ppr ratio)
      const actualRounds = Math.round(oldTotal / oldPPR)
      if (actualRounds <= 0) continue

      const newTotal = newPPR * actualRounds
      const totalChanged = Math.abs(oldTotal - newTotal) > 0.01
      const pprChanged = Math.abs(oldPPR - newPPR) > 0.0005

      if (totalChanged || pprChanged) {
        console.log(`  ${product.retailer} | ${product.productName} (${product.quantity})`)
        if (totalChanged) console.log(`    total: ${product.total} → ${formatPrice(newTotal)}`)
        if (pprChanged) console.log(`    €/round: ${product.pricePerRound} → ${formatPricePerRound(newPPR)}`)

        product.total = formatPrice(newTotal)
        product.pricePerRound = formatPricePerRound(newPPR)
        corrections++
      }
    }
  }

  console.log(`\n${corrections} products updated.`)

  if (!dryRun && corrections > 0) {
    writeFileSync(PRODUCTS_PATH, JSON.stringify(data, null, 2) + '\n')
    console.log(`Written to ${PRODUCTS_PATH}`)
  } else if (dryRun) {
    console.log('(DRY RUN — no changes written)')
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
