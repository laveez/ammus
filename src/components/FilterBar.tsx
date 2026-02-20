import {useEffect, useMemo, useRef, useState} from 'react';

export interface Filters {
  nonToxicOnly: boolean
  inStockOnly: boolean
  retailers: string[]
  brands: string[]
  maxPricePerRound: number | null
  maxQuantity: number | null
}

// eslint-disable-next-line react-refresh/only-export-components
export const defaultFilters: Filters = {
  nonToxicOnly: false,
  inStockOnly: false,
  retailers: [],
  brands: [],
  maxPricePerRound: null,
  maxQuantity: null,
};

interface Product {
  retailer: string
  brand: string
  pricePerRound: string
  quantity: string
  status: string
  nonToxic?: boolean | null
}

interface FilterBarProps {
  products: Product[]
  filters: Filters
  onChange: (filters: Filters) => void
}

function MultiSelect({label, options, selected, onChange}: {
  label: string
  options: string[]
  selected: string[]
  onChange: (selected: string[]) => void
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggle = (value: string) => {
    onChange(selected.includes(value) ?
      selected.filter(v => v !== value) :
      [...selected, value]);
  };

  const buttonLabel = selected.length > 0 ? `${label} (${selected.length})` : label;

  return (
    <div className="multi-select" ref={ref}>
      <button
        type="button"
        className={`multi-select-button${selected.length > 0 ? ' has-selection' : ''}`}
        onClick={() => setOpen(!open)}
      >
        {buttonLabel}
        <span className="multi-select-arrow">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="multi-select-dropdown">
          {options.map(opt => (
            <label key={opt} className="multi-select-option">
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
              />
              {opt}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export function FilterBar({products, filters, onChange}: FilterBarProps) {
  const retailers = useMemo(() =>
    [...new Set(products.map(p => p.retailer))].sort()
  , [products]);

  const brands = useMemo(() =>
    [...new Set(products.map(p => p.brand))].sort()
  , [products]);

  const update = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    onChange({...filters, [key]: value});
  };

  return (
    <div className="filter-bar">
      <label className="filter-toggle">
        <input
          type="checkbox"
          checked={filters.inStockOnly}
          onChange={e => update('inStockOnly', e.target.checked)}
        />
        In stock only
      </label>
      <label className="filter-toggle">
        <input
          type="checkbox"
          checked={filters.nonToxicOnly}
          onChange={e => update('nonToxicOnly', e.target.checked)}
        />
        Non-toxic only
      </label>
      <MultiSelect
        label="Retailer"
        options={retailers}
        selected={filters.retailers}
        onChange={v => update('retailers', v)}
      />
      <MultiSelect
        label="Brand"
        options={brands}
        selected={filters.brands}
        onChange={v => update('brands', v)}
      />
      <input
        type="number"
        className="filter-input"
        placeholder="Max €/round"
        step="0.01"
        min="0"
        value={filters.maxPricePerRound ?? ''}
        onChange={e => update('maxPricePerRound', e.target.value ? parseFloat(e.target.value) : null)}
      />
      <input
        type="number"
        className="filter-input"
        placeholder="Max qty"
        min="1"
        value={filters.maxQuantity ?? ''}
        onChange={e => update('maxQuantity', e.target.value ? parseInt(e.target.value) : null)}
      />
    </div>
  );
}
