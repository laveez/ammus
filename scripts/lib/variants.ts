import type {Page} from 'playwright';
import type {VariantInfo} from './types.js';

export async function extractVariants(page: Page): Promise<VariantInfo[] | null> {
  const raw = await page.evaluate(() => {
    const variants: { qty: number; price: number; available: boolean }[] = [];

    // Pattern 1: "Valitse N kpl" text blocks (Aawee, Ruoto)
    const text = document.body?.innerText || '';
    const lines = text.split('\n').map(l => l.trim());
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^Valitse\s+(\d+)\s*kpl$/i);
      if (!m) continue;
      const qty = parseInt(m[1]);
      const priceLine = lines[i + 1] || '';
      const pm = priceLine.match(/([\d\s]+[.,]\d{2})\s*€/);
      if (!pm) continue;
      const price = parseFloat(pm[1].replace(/\s/g, '').replace(',', '.'));
      if (isNaN(price) || price <= 0) continue;

      let available = true;
      for (let j = i + 2; j < Math.min(i + 5, lines.length); j++) {
        if (/tilapäisesti loppu|loppunut/i.test(lines[j])) {
          available = false; break;
        }
        if (/^heti|saatavilla/i.test(lines[j])) break;
      }
      variants.push({qty, price, available});
    }

    if (variants.length > 0) return variants;

    // Pattern 2: <select> dropdown with quantity options
    const selects = document.querySelectorAll('select');
    for (const select of selects) {
      const opts: { qty: number; price: number; available: boolean }[] = [];
      for (const opt of Array.from(select.options)) {
        const optText = `${opt.textContent || ''} ${opt.value}`;
        const qm = optText.match(/(\d+)\s*(?:kpl|ptr|pcs|rounds?)/i);
        if (!qm) continue;
        const qty = parseInt(qm[1]);
        const pm = optText.match(/([\d\s]+[.,]\d{2})\s*€?/);
        if (!pm) continue;
        const price = parseFloat(pm[1].replace(/\s/g, '').replace(',', '.'));
        if (isNaN(price) || price <= 0 || price < qty * 0.05) continue;
        const available = !opt.disabled && !/loppu|out of stock/i.test(optText);
        opts.push({qty, price, available});
      }
      if (opts.length >= 2) {
        variants.push(...opts);
      }
    }

    return variants.length > 0 ? variants : null;
  });
  return raw;
}
