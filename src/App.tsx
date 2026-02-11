import { useState, useCallback } from 'react'
import './App.css'
import data from './data/products.json'
import { Header } from './components/Header'
import { CaliberTabs } from './components/CaliberTabs'
import { PriceTable } from './components/PriceTable'

function getInitialCaliber(): string {
  const params = new URLSearchParams(window.location.search)
  const caliber = params.get('caliber')
  if (caliber && data.calibers.includes(caliber)) return caliber
  return '9mm'
}

function App() {
  const [activeCaliber, setActiveCaliber] = useState(getInitialCaliber)
  const [showOnlyNonToxic, setShowOnlyNonToxic] = useState(false)

  const handleCaliberChange = useCallback((caliber: string) => {
    setActiveCaliber(caliber)
    const url = new URL(window.location.href)
    url.searchParams.set('caliber', caliber)
    window.history.pushState({}, '', url.toString())
  }, [])

  const products = data.products[activeCaliber as keyof typeof data.products] ?? []

  return (
    <div className="container">
      <Header />
      <CaliberTabs
        calibers={data.calibers}
        active={activeCaliber}
        onChange={handleCaliberChange}
      />
      <label className="filter-toggle">
        <input
          type="checkbox"
          checked={showOnlyNonToxic}
          onChange={e => setShowOnlyNonToxic(e.target.checked)}
        />
        Non-toxic only
      </label>
      <PriceTable products={products} showOnlyNonToxic={showOnlyNonToxic} />
    </div>
  )
}

export default App
