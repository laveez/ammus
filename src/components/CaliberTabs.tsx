interface CaliberTabsProps {
  calibers: string[]
  active: string
  onChange: (caliber: string) => void
}

export function CaliberTabs({ calibers, active, onChange }: CaliberTabsProps) {
  return (
    <nav className="tabs">
      {calibers.map((caliber) => (
        <button
          key={caliber}
          className={`tab-button${caliber === active ? ' active' : ''}`}
          onClick={() => onChange(caliber)}
        >
          {caliber}
        </button>
      ))}
    </nav>
  )
}
