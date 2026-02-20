import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium, type Page} from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRODUCTS_PATH = resolve(__dirname, '../src/data/products.json');

// Curated list of genuine non-toxic product URLs from crawl results
// Excluded: category pages, guns, magazines, reloading tools, non-NT Hornady/Federal products
const NT_PRODUCTS: { caliber: string; url: string; retailer: string }[] = [
  // 22 LR
  {caliber: '22 LR', url: 'https://www.aawee.fi/fi/patruunat-ja-jalleenlataus/22lr-norma-eco-speed-22-50-ptr-lyijyton-pienoiskivaarinpatruuna/p/2414038/', retailer: 'Aawee'},

  // 223 Remington
  {caliber: '223 Remington', url: 'https://www.aawee.fi/fi/patruunat-ja-jalleenlataus/223-rem-lapua-naturalis-50gr-20kpl-n566-kivaarinpatruuna-20kpl/p/N315026/', retailer: 'Aawee'},
  {caliber: '223 Remington', url: 'https://www.aawee.fi/fi/patruunat-ja-jalleenlataus/223-rem-barnes-55gr-tsx-fb-20-kpl-barnes-223-tsx-fb-patruuna/p/124010/', retailer: 'Aawee'},
  {caliber: '223 Remington', url: 'https://www.motonet.fi/tuote/sako-powerhead-blade-223-rem-35655-tec-648g-20-kpl?product=55-24503', retailer: 'Motonet'},
  {caliber: '223 Remington', url: 'https://www.sissos.fi/metsastys/swiss-p-ds-1-223-rem-fmj-3-56-g-1000-ptr/p/27640231350135/', retailer: 'Sissos'},
  {caliber: '223 Remington', url: 'https://viranomainen.fi/p140848/swiss-p-223-rem-ds-1-3-6-55gr-fmj-50kpl', retailer: 'Viranomainen'},
  {caliber: '223 Remington', url: 'https://www.asepajamvuorela.fi/kauppa/patruunat/kivaarin-patruunat/223rem/lapua-3-2g-naturalis-227-rem/', retailer: 'Asepaja Vuorela'},
  {caliber: '223 Remington', url: 'https://www.oulunase.fi/product/638/stv-scorpio-223-rem-fmj--356-g--1000-ptr', retailer: 'Oulun Ase'},

  // 308 Winchester
  {caliber: '308 Winchester', url: 'https://www.aawee.fi/fi/patruunat-ja-jalleenlataus/308-win-lapua-naturalis-11-0g-20kpl-lapua-patruuna-n558-20kpl/p/N317105/', retailer: 'Aawee'},
  {caliber: '308 Winchester', url: 'https://www.aawee.fi/fi/patruunat-ja-jalleenlataus/308-win-norma-odin-10-5g-20kpl-norma-308-win-162gr-odin-20kpl/p/P8NP20178212/', retailer: 'Aawee'},
  {caliber: '308 Winchester', url: 'https://www.aawee.fi/fi/patruunat-ja-jalleenlataus/308-win-sako-powerhead-blade-10-5g-20kpl-patruuna-656a-powerhead-308win/p/C629656ASA10/', retailer: 'Aawee'},
  {caliber: '308 Winchester', url: 'https://www.aawee.fi/fi/patruunat-ja-jalleenlataus/308-win-sako-powerhead-blade-pro-10-5g-20kpl-patruuna-644a-powerhead-308-win/p/C629644ASA10/', retailer: 'Aawee'},
  {caliber: '308 Winchester', url: 'https://www.aawee.fi/fi/patruunat-ja-jalleenlataus/308-win-sako-powerhead-blade-pro-8-4g-20kpl-patruuna-636a-powerhead-308-win/p/C629636ASA10/', retailer: 'Aawee'},
  {caliber: '308 Winchester', url: 'https://www.aawee.fi/fi/patruunat-ja-jalleenlataus/308-win-norma-ecostrike-v2-9-7g-20kpl-norma-kiv-ptr-20kpl/p/20177562/', retailer: 'Aawee'},
  {caliber: '308 Winchester', url: 'https://www.aawee.fi/fi/patruunat-ja-jalleenlataus/308-win-barnes-9-7g-ttsx-20kpl-patruuna/p/124120/', retailer: 'Aawee'},
  {caliber: '308 Winchester', url: 'https://www.aawee.fi/fi/patruunat-ja-jalleenlataus/308-win-barnes-vor-tx-euro-10-9g-ttsx-20kpl-20kpl-patruuna/p/124130/', retailer: 'Aawee'},
  {caliber: '308 Winchester', url: 'https://www.aawee.fi/fi/patruunat-ja-jalleenlataus/308-win-barnes-vor-tx-euro-8-4g-ttsx-20-kpl-patruuna-vor-tx-euro130gr-ttsx-bt/p/124110/', retailer: 'Aawee'},
  {caliber: '308 Winchester', url: 'https://www.motonet.fi/tuote/sako-308-win-powerhead-blade-105-g-20-kpl?product=55-15645', retailer: 'Motonet'},
  {caliber: '308 Winchester', url: 'https://www.motonet.fi/tuote/sako-powerhead-blade-pro-308-w-105162-tec-644a-20-kpl?product=55-24513', retailer: 'Motonet'},
  {caliber: '308 Winchester', url: 'https://www.motonet.fi/tuote/sako-powerhead-blade-pro-308-w-78120-tec-634a-20-kpl?product=55-24511', retailer: 'Motonet'},
  {caliber: '308 Winchester', url: 'https://www.motonet.fi/tuote/sako-powerhead-blade-pro-308-w-84130-tec-636a-20-kpl?product=55-24512', retailer: 'Motonet'},
  {caliber: '308 Winchester', url: 'https://www.motonet.fi/tuote/norma-308-win-97-g150-gr-ecostrike-20-kpl?product=55-08473', retailer: 'Motonet'},
  {caliber: '308 Winchester', url: 'https://www.motonet.fi/tuote/norma-308-win-evostrike-90139-20-kpl?product=55-24492', retailer: 'Motonet'},
  {caliber: '308 Winchester', url: 'https://www.motonet.fi/tuote/lapua-naturalis-308-win-110-g-20-kpl?product=55-09102', retailer: 'Motonet'},
  {caliber: '308 Winchester', url: 'https://viranomainen.fi/p89335/norma-308-9-7g-150gr-ecostrike-20-kpl', retailer: 'Viranomainen'},
  {caliber: '308 Winchester', url: 'https://viranomainen.fi/p139398/sako-308-win-powerhead-blade-655a-10-5g-162grs-20-kpl', retailer: 'Viranomainen'},
  {caliber: '308 Winchester', url: 'https://viranomainen.fi/p31520/lapua-308-win-11-0-g-naturalis-lr-20-kpl', retailer: 'Viranomainen'},
  {caliber: '308 Winchester', url: 'https://www.asepajamvuorela.fi/kauppa/patruunat/kivaarin-patruunat/308win/norma-9-7g-eco-strike-308-win/', retailer: 'Asepaja Vuorela'},
  {caliber: '308 Winchester', url: 'https://www.asepajamvuorela.fi/kauppa/patruunat/kivaarin-patruunat/308win/sako-10-5g-blade-308-win/', retailer: 'Asepaja Vuorela'},
  {caliber: '308 Winchester', url: 'https://www.asepajamvuorela.fi/kauppa/patruunat/kivaarin-patruunat/308win/sako-powerhead-blade-308-win-97g-2/', retailer: 'Asepaja Vuorela'},
  {caliber: '308 Winchester', url: 'https://www.asepajamvuorela.fi/kauppa/patruunat/kivaarin-patruunat/308win/sako-powerhead-blade-pro-308-win-uutuus-2025/', retailer: 'Asepaja Vuorela'},
  {caliber: '308 Winchester', url: 'https://www.asepajamvuorela.fi/kauppa/patruunat/kivaarin-patruunat/308win/lapua-11g-nat-308-win/', retailer: 'Asepaja Vuorela'},
  {caliber: '308 Winchester', url: 'https://www.asepajamvuorela.fi/kauppa/patruunat/kivaarin-patruunat/308win/barnes-ttsx-168gr-308-win/', retailer: 'Asepaja Vuorela'},
  {caliber: '308 Winchester', url: 'https://www.metsoase.fi/kivaarit/sako-powerhead-blade-308-win-656a-10-5g-kivaarin-patruuna-20kpl/p/6438053141328/', retailer: 'Metso Ase'},
  {caliber: '308 Winchester', url: 'https://www.erakolmio.com/tuote/sako-powerhead-blade-pro-308-win-84g-lyijyton-metsastyspatruuna-pitkille-matkoille/', retailer: 'Erakolmio'},
  {caliber: '308 Winchester', url: 'https://www.erakolmio.com/tuote/sako-powerhead-blade-pro-308-win-105g-20ptr/', retailer: 'Erakolmio'},
  {caliber: '308 Winchester', url: 'https://www.erakolmio.com/tuote/lapua-308win-patruuna-solid-trx-n585-97-g/', retailer: 'Erakolmio'},
  {caliber: '308 Winchester', url: 'https://www.erakolmio.com/tuote/sako-powerhead-blade-308-win-105g-162gr-20kpl/', retailer: 'Erakolmio'},
  {caliber: '308 Winchester', url: 'https://www.seponurheilujapatruuna.fi/tuote/lapua-308-win-naturalis-11g/', retailer: 'Seponurheilujapatruuna'},

  // 9mm
  {caliber: '9mm', url: 'https://viranomainen.fi/p140970/sellier-bellot-9mm-luger-tfmj-8-0g-nontox-50kpl', retailer: 'Viranomainen'},
];

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

async function scrapeProductDetails(page: Page, url: string): Promise<Partial<Product> | null> {
  try {
    await page.goto(url, {timeout: 15000, waitUntil: 'domcontentloaded'});
    await page.waitForTimeout(2500);

    return page.evaluate(() => {
      // Try to get product name from h1 or JSON-LD
      let name = document.querySelector('h1')?.textContent?.trim() || '';

      // Try JSON-LD for structured data
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      let price: number | null = null;
      let available: boolean | null = null;
      for (const script of scripts) {
        try {
          const data = JSON.parse(script.textContent || '');
          const items = Array.isArray(data) ? data : [data];
          for (const item of items) {
            if (item['@type'] === 'Product' || item['@type'] === 'IndividualProduct') {
              if (!name && item.name) name = item.name;
              const offers = item.offers;
              if (offers) {
                const offer = Array.isArray(offers) ? offers[0] : offers;
                const p = offer.lowPrice ?? offer.price;
                if (p != null) price = typeof p === 'string' ? parseFloat(p.replace(',', '.')) : p;
                if (offer.availability) available = offer.availability.includes('InStock');
              }
            }
          }
        } catch {/* skip */}
      }

      // Fallback price from meta tags
      if (price === null) {
        const priceMeta = document.querySelector('meta[itemprop="price"]') as HTMLMetaElement ??
          document.querySelector('meta[property="product:price:amount"]') as HTMLMetaElement;
        if (priceMeta?.content) price = parseFloat(priceMeta.content.replace(',', '.'));
      }

      // Fallback price from DOM
      if (price === null) {
        const priceSelectors = ['.woocommerce-Price-amount bdi', '.woocommerce-Price-amount', '.product-price .current-price', '.product-price', '.price-value', '.current-price', '.tuotekortti_tuotehinta_tarjous'];
        for (const sel of priceSelectors) {
          const el = document.querySelector(sel);
          if (el) {
            const match = el.textContent?.match(/([\d\s]+[.,]\d{2})/);
            if (match) {
              price = parseFloat(match[1].replace(/\s/g, '').replace(',', '.'));
              if (!isNaN(price) && price > 0) break;
            }
          }
        }
      }

      // Availability fallback
      if (available === null) {
        const availMeta = document.querySelector('meta[itemprop="availability"]') as HTMLMetaElement;
        if (availMeta?.content) available = availMeta.content.includes('InStock');
        else {
          const text = document.body?.innerText?.toLowerCase() || '';
          if (text.includes('varastossa') || text.includes('saatavilla') || text.includes('available in stock')) available = true;
          else if (text.includes('loppunut') || text.includes('out of stock') || text.includes('tilapäisesti loppu')) available = false;
        }
      }

      if (!name || price === null || isNaN(price)) return null;
      return {name, price, available};
    });
  } catch {
    return null;
  }
}

function extractQuantity(name: string): number {
  // Look for quantity patterns: "20kpl", "50 ptr", "1000ptr", "500 ptr"
  const match = name.match(/(\d+)\s*(?:kpl|ptr|pcs|rounds)/i);
  if (match) return parseInt(match[1]);
  // "20 kpl" at end
  const match2 = name.match(/(\d+)\s*$/i);
  if (match2 && parseInt(match2[1]) >= 10) return parseInt(match2[1]);
  return 20; // default for hunting ammo boxes
}

function extractBrand(name: string): string {
  const brands = [
    'Sako', 'Lapua', 'Norma', 'Barnes', 'Hornady', 'Sellier & Bellot', 'S&B',
    'STV', 'Scorpio', 'Swiss P', 'Tarvas', 'Geco', 'Federal',
  ];
  for (const b of brands) {
    if (name.toLowerCase().includes(b.toLowerCase())) return b;
  }
  return '';
}

async function main() {
  const data: ProductsData = JSON.parse(readFileSync(PRODUCTS_PATH, 'utf-8'));

  // Check which URLs already exist
  const existingUrls = new Set<string>();
  for (const cal of data.calibers) {
    for (const p of data.products[cal]) existingUrls.add(p.url);
  }

  const toAdd = NT_PRODUCTS.filter(p => !existingUrls.has(p.url));
  console.log(`${toAdd.length} new NT products to add (${NT_PRODUCTS.length - toAdd.length} already exist)`);

  if (toAdd.length === 0) {
    console.log('Nothing to do.'); return;
  }

  const browser = await chromium.launch({headless: true});
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    locale: 'fi-FI',
  });

  // Dismiss cookies on first page per domain
  const cookiesDismissed = new Set<string>();

  let added = 0;
  for (const entry of toAdd) {
    const page = await context.newPage();
    const domain = new URL(entry.url).hostname;

    // Dismiss cookies if needed
    if (!cookiesDismissed.has(domain)) {
      cookiesDismissed.add(domain);
    }

    const result = await scrapeProductDetails(page, entry.url) as { name: string; price: number; available: boolean | null } | null;
    await page.close();

    if (!result) {
      console.log(`  SKIP ${entry.retailer} — failed to scrape: ${entry.url}`);
      continue;
    }

    const qty = extractQuantity(result.name);
    const ppr = result.price / qty;
    const brand = extractBrand(result.name);

    const product: Product = {
      url: entry.url,
      retailer: entry.retailer,
      productName: result.name.slice(0, 100),
      productDetails: '',
      brand,
      quantity: `${qty}`,
      pricePerRound: `${ppr.toFixed(3)}€`,
      total: `${result.price.toFixed(2)}€`,
      status: result.available === true ? 'Available' : result.available === false ? 'Out of Stock' : 'Available',
      nonToxic: true,
    };

    data.products[entry.caliber].push(product);
    added++;
    console.log(`  + [${entry.caliber}] ${product.productName} — ${product.total} (${product.pricePerRound}/rd) @ ${entry.retailer}`);
  }

  console.log(`\n${added} products added.`);

  if (added > 0) {
    writeFileSync(PRODUCTS_PATH, JSON.stringify(data, null, 2) + '\n');
    console.log(`Written to ${PRODUCTS_PATH}`);
  }

  await browser.close();
}

main().catch(err => {
  console.error('Fatal:', err); process.exit(1);
});
