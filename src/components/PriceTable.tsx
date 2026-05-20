import {useMemo, useState} from 'react';
import retailersData from '../data/retailers.json';
import type {Filters} from './FilterBar';

interface Product {
  url: string
  retailer: string
  productName: string
  productDetails?: string
  brand: string
  quantity: string
  pricePerRound: string
  total: string
  status: string
  nonToxic?: boolean | null
}

interface DeliveryRule {
  method: string
  cheapestPrice: number
  freeOverThreshold?: number
  lastChecked?: string
  notes?: string
}

interface RetailerInfo {
  baseUrl?: string
  delivery?: DeliveryRule | null
}

const retailers = retailersData as Record<string, RetailerInfo>;

function deliveryFor(retailer: string, total: number): { cost: number | null; rule: DeliveryRule | null } {
  const rule = retailers[retailer]?.delivery ?? null;
  if (!rule) return {cost: null, rule: null};
  if (rule.freeOverThreshold != null && total >= rule.freeOverThreshold) return {cost: 0, rule};
  return {cost: rule.cheapestPrice, rule};
}

type SortColumn =
  | 'retailer' | 'product' | 'brand' | 'type' | 'quantity'
  | 'per-unit' | 'total' | 'delivery' | 'total-with-delivery' | 'status'
type SortDirection = 'asc' | 'desc'

const columns: { key: SortColumn; label: string }[] = [
  {key: 'retailer', label: 'Retailer'},
  {key: 'product', label: 'Product'},
  {key: 'brand', label: 'Brand'},
  {key: 'type', label: 'Type'},
  {key: 'quantity', label: 'Quantity'},
  {key: 'per-unit', label: '€/Round'},
  {key: 'total', label: 'Total'},
  {key: 'delivery', label: 'Delivery'},
  {key: 'total-with-delivery', label: 'Total + Delivery'},
  {key: 'status', label: 'Status'},
];

function parsePrice(s: string): number {
  return parseFloat(s.replace('€', '').replace(/\s/g, '')) || 0;
}

function parseQuantity(s: string): number {
  return parseInt(s.replace(/[^\d]/g, '')) || 0;
}

function formatEur(n: number): string {
  return `${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}€`;
}

function getSortValue(product: Product, column: SortColumn): number | string {
  switch (column) {
  case 'per-unit': return parsePrice(product.pricePerRound);
  case 'total': return parsePrice(product.total);
  case 'quantity': return parseQuantity(product.quantity);
  case 'status': return product.status === 'Available' ? 0 : 1;
  case 'retailer': return product.retailer.toLowerCase();
  case 'product': return product.productName.toLowerCase();
  case 'type': return product.nonToxic === true ? 0 : 1;
  case 'brand': return product.brand.toLowerCase();
  case 'delivery': {
    const {cost} = deliveryFor(product.retailer, parsePrice(product.total));
    return cost ?? Number.POSITIVE_INFINITY;
  }
  case 'total-with-delivery': {
    const total = parsePrice(product.total);
    const {cost} = deliveryFor(product.retailer, total);
    return cost == null ? Number.POSITIVE_INFINITY : total + cost;
  }
  }
}

interface PriceTableProps {
  products: Product[]
  filters: Filters
}

export function PriceTable({products, filters}: PriceTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('per-unit');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const filtered = useMemo(() =>
    products.filter(p => {
      if (filters.nonToxicOnly && p.nonToxic !== true) return false;
      if (filters.inStockOnly && p.status !== 'Available') return false;
      if (filters.retailers.length > 0 && !filters.retailers.includes(p.retailer)) return false;
      if (filters.brands.length > 0 && !filters.brands.includes(p.brand)) return false;
      if (filters.maxPricePerRound != null && parsePrice(p.pricePerRound) > filters.maxPricePerRound) return false;
      if (filters.maxQuantity != null && parseQuantity(p.quantity) > filters.maxQuantity) return false;
      if (filters.maxTotalWithDelivery != null) {
        const total = parsePrice(p.total);
        const {cost} = deliveryFor(p.retailer, total);
        if (cost == null) return false;
        if (total + cost > filters.maxTotalWithDelivery) return false;
      }
      return true;
    })
  , [products, filters]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const aVal = getSortValue(a, sortColumn);
      const bVal = getSortValue(b, sortColumn);
      let result = 0;
      if (aVal < bVal) result = -1;
      else if (aVal > bVal) result = 1;
      return sortDirection === 'desc' ? -result : result;
    });
    return copy;
  }, [filtered, sortColumn, sortDirection]);

  const bestPrice = useMemo(() => {
    let best = Infinity;
    for (const p of filtered) {
      const price = parsePrice(p.pricePerRound);
      if (price > 0 && price < best) best = price;
    }
    return best;
  }, [filtered]);

  const handleRowClick = (url: string) => {
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (filtered.length === 0) {
    return (
      <div className="table-container">
        <p className="empty-state">No products match the current filters.</p>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="price-table">
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                className={`sortable${sortColumn === col.key ? ' active' : ''}`}
                onClick={() => handleSort(col.key)}
                data-sort={col.key}
              >
                {col.label}
                {sortColumn === col.key && (
                  <span className="sort-arrow">{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((product, i) => {
            const price = parsePrice(product.pricePerRound);
            const isBest = Math.abs(price - bestPrice) < 0.001;
            const total = parsePrice(product.total);
            const {cost: delivery, rule} = deliveryFor(product.retailer, total);
            const totalWithDelivery = delivery == null ? null : total + delivery;
            const deliveryTooltip = rule ?
              `${rule.method}${rule.freeOverThreshold ? ` — free over ${rule.freeOverThreshold}€` : ''}` :
              'Delivery rule unknown';
            return (
              <tr
                key={i}
                className="clickable-row"
                onClick={() => handleRowClick(product.url)}
              >
                <td className="retailer">{product.retailer}</td>
                <td className="product">
                  <div className="product-name">{product.productName}</div>
                  {product.productDetails && (
                    <div className="product-details">{product.productDetails}</div>
                  )}
                </td>
                <td className="brand">{product.brand}</td>
                <td className="type">
                  {product.nonToxic === true && <span className="non-toxic-badge">NT</span>}
                </td>
                <td className="quantity">{parseQuantity(product.quantity)} kpl</td>
                <td className={`per-unit price${isBest ? ' best-price' : ''}`}>
                  {product.pricePerRound}
                </td>
                <td className="total">{product.total}</td>
                <td className="delivery" title={deliveryTooltip}>
                  {delivery == null ?
                    <span className="delivery-unknown">?</span> :
                    delivery === 0 ?
                      <span className="delivery-free">Free</span> :
                      formatEur(delivery)}
                </td>
                <td className="total-with-delivery price">
                  {totalWithDelivery == null ? '?' : formatEur(totalWithDelivery)}
                </td>
                <td className="status">
                  <span className={`status-indicator ${product.status === 'Available' ? 'available' : 'unavailable'}`}>
                    {product.status}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
