import {useCallback, useState} from 'react';
import {CaliberTabs} from './components/CaliberTabs';
import type {Filters} from './components/FilterBar';
import {defaultFilters, FilterBar} from './components/FilterBar';
import {Header} from './components/Header';
import {PriceTable} from './components/PriceTable';
import data from './data/products.json';
import './App.css';

function getInitialCaliber(): string {
  const params = new URLSearchParams(window.location.search);
  const caliber = params.get('caliber');
  if (caliber && data.calibers.includes(caliber)) return caliber;
  return '9mm';
}

function App() {
  const [activeCaliber, setActiveCaliber] = useState(getInitialCaliber);
  const [filters, setFilters] = useState<Filters>(defaultFilters);

  const handleCaliberChange = useCallback((caliber: string) => {
    setActiveCaliber(caliber);
    const url = new URL(window.location.href);
    url.searchParams.set('caliber', caliber);
    window.history.pushState({}, '', url.toString());
  }, []);

  const products = data.products[activeCaliber as keyof typeof data.products] ?? [];

  return (
    <div className="container">
      <Header />
      <CaliberTabs
        calibers={data.calibers}
        active={activeCaliber}
        onChange={handleCaliberChange}
      />
      <FilterBar products={products} filters={filters} onChange={setFilters} />
      <PriceTable products={products} filters={filters} />
    </div>
  );
}

export default App;
