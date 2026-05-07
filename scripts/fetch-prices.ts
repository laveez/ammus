import {type BrowserContext, chromium} from 'playwright';
import {adapters, findAdapter} from './adapters/index.js';
import {type Adapter, callExtract} from './lib/adapter.js';
import {daysBetween, formatPrice, formatPricePerRound, parsePriceField, parseQuantity, todayIso} from './lib/format.js';
import {isNonToxicByName} from './lib/nontox.js';
import {readProducts, readRetailers, writeProducts, writeRetailers} from './lib/products-store.js';
import type {DiscoveredProduct, ExtractResult, Product, ProductsData, RetailersData} from './lib/types.js';

const TIMEOUT = 15_000;
const CONCURRENCY = 5;
const PRUNE_DAYS = 14;

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const onlyRetailerArg = args.find(a => a.startsWith('--retailer='));
const onlyCaliberArg = args.find(a => a.startsWith('--caliber='));
const skipDiscovery = args.includes('--skip-discovery');
const skipDelivery = args.includes('--skip-delivery');
const onlyRetailer = onlyRetailerArg?.split('=')[1];
const onlyCaliber = onlyCaliberArg?.split('=')[1];

interface DiscoveryResult {
  adapter: Adapter
  caliber: string
  /** null = discovery not implemented; existing URLs retained unconditionally */
  discovered: DiscoveredProduct[] | null
}

async function runDiscovery(
  context: BrowserContext,
  data: ProductsData,
): Promise<DiscoveryResult[]> {
  if (skipDiscovery) {
    console.log('Skipping discovery (--skip-discovery).');
    return [];
  }

  const tasks: { adapter: Adapter; caliber: string }[] = [];
  for (const adapter of adapters) {
    if (onlyRetailer && adapter.name !== onlyRetailer) continue;
    for (const caliber of data.calibers) {
      if (onlyCaliber && caliber !== onlyCaliber) continue;
      tasks.push({adapter, caliber});
    }
  }

  console.log(`\n=== Phase 1: Discovery (${tasks.length} retailer/caliber combos) ===`);
  const results: DiscoveryResult[] = [];

  for (let i = 0; i < tasks.length; i += CONCURRENCY) {
    const batch = tasks.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async ({adapter, caliber}) => {
      const page = await context.newPage();
      try {
        const discovered = await adapter.discover(page, caliber);
        results.push({adapter, caliber, discovered});
        if (discovered === null) {
          console.log(`  ${adapter.name} | ${caliber} — discovery not implemented`);
        } else {
          console.log(`  ${adapter.name} | ${caliber} — ${discovered.length} URLs`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message.slice(0, 60) : String(err);
        console.log(`  ${adapter.name} | ${caliber} — ERROR: ${msg}`);
        results.push({adapter, caliber, discovered: null});
      } finally {
        await page.close();
      }
    }));
  }

  return results;
}

function applyDiscovery(data: ProductsData, results: DiscoveryResult[]): { added: number; pruned: number } {
  const today = todayIso();
  let added = 0;
  let pruned = 0;

  // Map: retailer name → set of URLs we saw this run (only for adapters with implemented discover)
  const seenByRetailer = new Map<string, Set<string>>();
  for (const r of results) {
    if (r.discovered === null) continue;
    const set = seenByRetailer.get(r.adapter.name) ?? new Set<string>();
    for (const d of r.discovered) set.add(d.url);
    seenByRetailer.set(r.adapter.name, set);
  }

  // Update lastSeen + add brand-new products as bare entries
  for (const r of results) {
    if (r.discovered === null) continue;
    const calBucket = data.products[r.caliber] ?? [];
    for (const d of r.discovered) {
      const existing = calBucket.filter(p => p.url === d.url);
      if (existing.length > 0) {
        for (const p of existing) p.lastSeen = today;
        continue;
      }
      // Brand-new URL — seed minimal entry; price phase fills in
      calBucket.push({
        url: d.url,
        retailer: r.adapter.name,
        productName: d.productName ?? '',
        productDetails: '',
        brand: d.hint?.brand ?? '',
        quantity: '0',
        pricePerRound: '0.000€',
        total: '0.00€',
        status: 'Available',
        lastSeen: today,
      });
      added++;
    }
    data.products[r.caliber] = calBucket;
  }

  // Auto-prune: only for retailers whose adapter implemented discovery this run
  for (const caliber of data.calibers) {
    const before = data.products[caliber] ?? [];
    const after: Product[] = [];
    for (const p of before) {
      const seen = seenByRetailer.get(p.retailer);
      if (!seen) {
        after.push(p);
        continue;
      }
      if (seen.has(p.url)) {
        after.push(p);
        continue;
      }
      const last = p.lastSeen;
      if (!last) {
        p.lastSeen = today;
        after.push(p);
        continue;
      }
      if (daysBetween(last, today) <= PRUNE_DAYS) {
        after.push(p);
        continue;
      }
      pruned++;
      console.log(`  PRUNE ${p.retailer} | ${p.productName} (${caliber}) — last seen ${last}`);
    }
    data.products[caliber] = after;
  }

  return {added, pruned};
}

async function runPriceExtraction(
  context: BrowserContext,
  data: ProductsData,
): Promise<{ corrections: number }> {
  console.log('\n=== Phase 2/3: Price + variants ===');

  const urlSet = new Set<string>();
  for (const caliber of data.calibers) {
    if (onlyCaliber && caliber !== onlyCaliber) continue;
    for (const product of data.products[caliber] ?? []) {
      if (onlyRetailer && product.retailer !== onlyRetailer) continue;
      if (product.url) urlSet.add(product.url);
    }
  }
  const urls = [...urlSet];
  console.log(`Visiting ${urls.length} unique URLs...`);

  const results = new Map<string, ExtractResult>();
  let succeeded = 0;
  let failed = 0;
  let completed = 0;

  async function fetchUrl(url: string) {
    const domain = new URL(url).hostname.replace('www.', '');
    const retailer = data.calibers
      .flatMap(c => data.products[c] ?? [])
      .find(p => p.url === url)?.retailer;
    const adapter = retailer ? findAdapter(retailer) : undefined;
    const page = await context.newPage();
    try {
      await page.goto(url, {timeout: TIMEOUT, waitUntil: 'domcontentloaded'});
      const result = adapter ? await callExtract(adapter, page) : {
        price: null, available: null, nonToxic: null, strategy: 'no-adapter',
      } as ExtractResult;
      results.set(url, result);
      completed++;
      if (result.price !== null) {
        const availStr = result.available === true ? 'In Stock' : result.available === false ? 'Out of Stock' : '?';
        const ntStr = result.nonToxic === true ? ' [NT]' : '';
        const varStr = result.variants ? ` (${result.variants.length} variants)` : '';
        console.log(`[${completed}/${urls.length}] ${domain} → ${result.price.toFixed(2)}€ [${availStr}]${ntStr} (${result.strategy})${varStr}`);
        succeeded++;
      } else {
        console.log(`[${completed}/${urls.length}] ${domain} → FAILED`);
        failed++;
      }
    } catch (err) {
      completed++;
      const msg = err instanceof Error ? err.message.slice(0, 60) : String(err);
      console.log(`[${completed}/${urls.length}] ${domain} → ERROR: ${msg}`);
      results.set(url, {price: null, available: null, nonToxic: null, strategy: 'error'});
      failed++;
    } finally {
      await page.close();
    }
  }

  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    const batch = urls.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(fetchUrl));
  }

  console.log(`\n${succeeded} succeeded, ${failed} failed.`);

  return {corrections: applyResults(data, results)};
}

function applyResults(data: ProductsData, results: Map<string, ExtractResult>): number {
  const allEntries: { product: Product; caliber: string }[] = [];
  for (const caliber of data.calibers) {
    for (const product of data.products[caliber] ?? []) {
      allEntries.push({product, caliber});
    }
  }

  const byUrl = new Map<string, { product: Product; caliber: string }[]>();
  for (const entry of allEntries) {
    const list = byUrl.get(entry.product.url) ?? [];
    list.push(entry);
    byUrl.set(entry.product.url, list);
  }

  let corrections = 0;
  for (const [url, entries] of byUrl) {
    const result = results.get(url);
    if (!result) continue;

    for (const {product} of entries) {
      const isNT = result.nonToxic === true || isNonToxicByName(product);
      if (isNT && product.nonToxic !== true) {
        console.log(`  ${product.retailer} | ${product.productName} — non-toxic: detected`);
        product.nonToxic = true;
        corrections++;
      }
    }

    if (result.variants && result.variants.length > 0) {
      for (const {product} of entries) {
        const qtyNum = parseQuantity(product.quantity);
        const variant = result.variants.find(v => v.qty === qtyNum);
        if (!variant) continue;

        const newStatus = variant.available ? 'Available' : 'Out of Stock';
        if (product.status !== newStatus) {
          console.log(`  ${product.retailer} | ${product.productName} (${product.quantity}) — status: ${product.status} → ${newStatus}`);
          product.status = newStatus;
          corrections++;
        }

        const newPPR = variant.price / variant.qty;
        const oldPPR = parsePriceField(product.pricePerRound);
        const oldTotal = parsePriceField(product.total);
        const pprChanged = Math.abs(oldPPR - newPPR) > 0.0005;
        const totalChanged = Math.abs(oldTotal - variant.price) > 0.01;

        if (pprChanged || totalChanged) {
          console.log(`  ${product.retailer} | ${product.productName} (${product.quantity})`);
          if (totalChanged) console.log(`    total: ${product.total} → ${formatPrice(variant.price)}`);
          if (pprChanged) console.log(`    €/round: ${product.pricePerRound} → ${formatPricePerRound(newPPR)}`);
          product.total = formatPrice(variant.price);
          product.pricePerRound = formatPricePerRound(newPPR);
          corrections++;
        }
      }
      continue;
    }

    if (result.available !== null) {
      for (const {product} of entries) {
        const newStatus = result.available ? 'Available' : 'Out of Stock';
        if (product.status !== newStatus) {
          console.log(`  ${product.retailer} | ${product.productName} — status: ${product.status} → ${newStatus}`);
          product.status = newStatus;
          corrections++;
        }
      }
    }

    if (result.price === null) continue;
    const scrapedPrice = result.price;

    let closest: { product: Product; caliber: string } | null = null;
    let closestDiff = Infinity;
    for (const entry of entries) {
      const total = parsePriceField(entry.product.total);
      const diff = Math.abs(total - scrapedPrice);
      if (diff < closestDiff) {
        closestDiff = diff;
        closest = entry;
      }
    }
    if (!closest) continue;

    const basePPR = parsePriceField(closest.product.pricePerRound);
    const baseTotal = parsePriceField(closest.product.total);
    if (basePPR <= 0 || baseTotal <= 0) continue;
    const roundsPerBox = Math.round(baseTotal / basePPR);
    if (roundsPerBox < 10) {
      const domain = new URL(url).hostname.replace('www.', '');
      console.log(`  SKIP ${domain} — roundsPerBox=${roundsPerBox} (bad base data)`);
      continue;
    }

    const newPPR = scrapedPrice / roundsPerBox;

    for (const {product} of entries) {
      const oldPPR = parsePriceField(product.pricePerRound);
      const oldTotal = parsePriceField(product.total);
      if (oldPPR <= 0 || oldTotal <= 0) continue;

      const pprRatio = newPPR / oldPPR;
      if (pprRatio > 3 || pprRatio < 1 / 3) {
        console.log(`  SKIP ${product.retailer} | ${product.productName} — PPR change too large (${oldPPR.toFixed(3)} → ${newPPR.toFixed(3)}, ${pprRatio.toFixed(1)}x)`);
        continue;
      }

      const actualRounds = Math.round(oldTotal / oldPPR);
      if (actualRounds <= 0) continue;

      const newTotal = newPPR * actualRounds;
      const totalChanged = Math.abs(oldTotal - newTotal) > 0.01;
      const pprChanged = Math.abs(oldPPR - newPPR) > 0.0005;

      if (totalChanged || pprChanged) {
        console.log(`  ${product.retailer} | ${product.productName} (${product.quantity})`);
        if (totalChanged) console.log(`    total: ${product.total} → ${formatPrice(newTotal)}`);
        if (pprChanged) console.log(`    €/round: ${product.pricePerRound} → ${formatPricePerRound(newPPR)}`);
        product.total = formatPrice(newTotal);
        product.pricePerRound = formatPricePerRound(newPPR);
        corrections++;
      }
    }
  }
  return corrections;
}

async function runDelivery(
  context: BrowserContext,
  retailers: RetailersData,
): Promise<RetailersData> {
  if (skipDelivery) {
    console.log('Skipping delivery (--skip-delivery).');
    return retailers;
  }

  console.log('\n=== Phase 4: Delivery rules ===');

  const tasks = adapters.filter(a => !onlyRetailer || a.name === onlyRetailer);

  for (let i = 0; i < tasks.length; i += CONCURRENCY) {
    const batch = tasks.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async adapter => {
      const page = await context.newPage();
      try {
        const rule = await adapter.delivery(page);
        if (rule) {
          retailers[adapter.name] = {
            ...retailers[adapter.name],
            baseUrl: adapter.baseUrl,
            delivery: rule,
          };
          const free = rule.freeOverThreshold ? `, free > ${rule.freeOverThreshold}€` : '';
          console.log(`  ${adapter.name} → ${rule.cheapestPrice.toFixed(2)}€${free} (${rule.method})`);
        } else {
          retailers[adapter.name] = {
            ...retailers[adapter.name],
            baseUrl: adapter.baseUrl,
          };
          console.log(`  ${adapter.name} → no rule scraped (using static if any)`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message.slice(0, 60) : String(err);
        console.log(`  ${adapter.name} → ERROR: ${msg}`);
        retailers[adapter.name] = {
          ...retailers[adapter.name],
          baseUrl: adapter.baseUrl,
        };
      } finally {
        await page.close();
      }
    }));
  }

  return retailers;
}

async function main() {
  const data = readProducts();
  const retailers = readRetailers();

  if (dryRun) console.log('(DRY RUN — no files will be written)\n');
  if (onlyRetailer) console.log(`Filtering to retailer: ${onlyRetailer}`);
  if (onlyCaliber) console.log(`Filtering to caliber: ${onlyCaliber}`);

  const browser = await chromium.launch({headless: true});
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    locale: 'fi-FI',
  });

  const discovery = await runDiscovery(context, data);
  const {added, pruned} = applyDiscovery(data, discovery);
  console.log(`\nDiscovery: +${added} new, -${pruned} pruned.`);

  const {corrections} = await runPriceExtraction(context, data);
  console.log(`\n${corrections} products updated.`);

  const updatedRetailers = await runDelivery(context, retailers);

  await browser.close();

  if (!dryRun) {
    writeProducts(data);
    writeRetailers(updatedRetailers);
    console.log('\nWritten to disk.');
  } else {
    console.log('\n(DRY RUN — no changes written)');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
