export function parseQuantity(s: string): number {
  const match = s.match(/(\d+)/);
  return match ? parseInt(match[1]) : 0;
}

export function parsePriceField(s: string): number {
  return parseFloat(s.replace('€', '').replace(/\s/g, '')) || 0;
}

export function formatPrice(price: number): string {
  if (price >= 1000) {
    const formatted = price.toFixed(2);
    const [whole, decimals] = formatted.split('.');
    const withSpaces = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${withSpaces}.${decimals}€`;
  }
  return `${price.toFixed(2)}€`;
}

export function formatPricePerRound(price: number): string {
  return `${price.toFixed(3)}€`;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysBetween(isoA: string, isoB: string): number {
  const a = new Date(isoA).getTime();
  const b = new Date(isoB).getTime();
  return Math.abs((a - b) / (1000 * 60 * 60 * 24));
}
