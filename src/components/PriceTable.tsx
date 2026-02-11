import { useState, useMemo } from 'react'

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

type SortColumn = 'retailer' | 'product' | 'brand' | 'type' | 'quantity' | 'per-unit' | 'total' | 'status'
type SortDirection = 'asc' | 'desc'

const columns: { key: SortColumn; label: string }[] = [
  { key: 'retailer', label: 'Retailer' },
  { key: 'product', label: 'Product' },
  { key: 'brand', label: 'Brand' },
  { key: 'type', label: 'Type' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'per-unit', label: '€/Round' },
  { key: 'total', label: 'Total' },
  { key: 'status', label: 'Status' },
]

function parsePrice(s: string): number {
  return parseFloat(s.replace('€', '').replace(/\s/g, '')) || 0
}

function parseQuantity(s: string): number {
  return parseInt(s.replace(/[^\d]/g, '')) || 0
}

function getSortValue(product: Product, column: SortColumn): number | string {
  switch (column) {
    case 'per-unit': return parsePrice(product.pricePerRound)
    case 'total': return parsePrice(product.total)
    case 'quantity': return parseQuantity(product.quantity)
    case 'status': return product.status === 'Available' ? 0 : 1
    case 'retailer': return product.retailer.toLowerCase()
    case 'product': return product.productName.toLowerCase()
    case 'type': return product.nonToxic === true ? 0 : 1
    case 'brand': return product.brand.toLowerCase()
  }
}

interface PriceTableProps {
  products: Product[]
  showOnlyNonToxic: boolean
}

export function PriceTable({ products, showOnlyNonToxic }: PriceTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('per-unit')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const filtered = useMemo(() =>
    showOnlyNonToxic ? products.filter(p => p.nonToxic === true) : products
  , [products, showOnlyNonToxic])

  const sorted = useMemo(() => {
    const copy = [...filtered]
    copy.sort((a, b) => {
      const aVal = getSortValue(a, sortColumn)
      const bVal = getSortValue(b, sortColumn)
      let result = 0
      if (aVal < bVal) result = -1
      else if (aVal > bVal) result = 1
      return sortDirection === 'desc' ? -result : result
    })
    return copy
  }, [filtered, sortColumn, sortDirection])

  const bestPrice = useMemo(() => {
    let best = Infinity
    for (const p of filtered) {
      const price = parsePrice(p.pricePerRound)
      if (price > 0 && price < best) best = price
    }
    return best
  }, [filtered])

  const handleRowClick = (url: string) => {
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
  }

  if (showOnlyNonToxic && filtered.length === 0) {
    return (
      <div className="table-container">
        <p className="empty-state">No non-toxic ammunition found for this caliber.</p>
      </div>
    )
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
            const price = parsePrice(product.pricePerRound)
            const isBest = Math.abs(price - bestPrice) < 0.001
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
                <td className="quantity">{product.quantity}</td>
                <td className={`per-unit price${isBest ? ' best-price' : ''}`}>
                  {product.pricePerRound}
                </td>
                <td className="total">{product.total}</td>
                <td className="status">
                  <span className={`status-indicator ${product.status === 'Available' ? 'available' : 'unavailable'}`}>
                    {product.status}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
