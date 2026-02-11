# Patruuna

Ammunition price comparison tool for Finnish retailers. Scrapes prices from 24+ online stores and presents them in a sortable, filterable table.

## Features

- Price comparison across Finnish ammunition retailers
- Sortable columns: retailer, product, brand, type, quantity, price per round, total, availability
- Non-toxic ammunition detection and filtering
- Caliber tabs: 22 LR, .223 Remington, .308 Winchester, 7.62x39, 9mm
- Click any row to open the retailer's product page
- Responsive design

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite
- **Scraper:** Playwright (headless Chromium)
- **Data:** Static JSON (scraped prices committed to repo)

## Development

```bash
npm install
npm run dev          # Start dev server at localhost:5173
npm run build        # TypeScript check + production build
```

## Price Scraping

```bash
npm run fetch-prices              # Scrape all retailer pages, update products.json
npm run fetch-prices -- --dry-run # Preview without writing changes
```

The scraper visits each product URL, extracts current prices and availability using multiple strategies (JSON-LD, meta tags, DOM selectors, JS variables, text regex), and detects non-toxic ammunition by scanning for keywords like "lyijytön", "nontox", "TFMJ", "Powerhead Blade", etc.

## Project Structure

```
src/
  App.tsx              # Main app with caliber tabs and filter toggle
  App.css              # All styles
  components/
    Header.tsx         # Page header
    CaliberTabs.tsx    # Caliber selector
    PriceTable.tsx     # Sortable price comparison table
  data/
    products.json      # Product data (URLs, prices, metadata)
scripts/
  fetch-prices.ts      # Playwright scraper
```
