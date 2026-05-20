import type {DeliveryRule} from './types.js';

export function applyDelivery(total: number, rule: DeliveryRule | null | undefined): number | null {
  if (!rule) return null;
  if (rule.freeOverThreshold != null && total >= rule.freeOverThreshold) return 0;
  return rule.cheapestPrice;
}

const PRICE_RE = /([\d\s]+[.,]\d{2})\s*€/g;
const FREE_RE = /(?:ilmainen|free)[^\d]{0,40}?yli\s*([\d\s]+[.,]?\d*)\s*€|yli\s*([\d\s]+[.,]?\d*)\s*€[^\d]{0,40}?(?:ilmainen|free|maksuton)/i;

// Keywords indicating the price is for ammo-eligible door delivery — not pickup automaatti.
// In Finland, ammunition cannot be delivered to pickup parcel lockers (pakettiautomaatti);
// it must be handed over with ID check (Matkahuolto kotijakelu, Posti ID-paketti, etc.).
const DOOR_DELIVERY_HINTS = /matkahuolto.{0,30}(kotijakelu|kotitoimitus|lähellä[- ]?paketti|laajakaista)|kotijakelu|kotitoimitus|kotiinkuljetus|posti.{0,20}id[- ]?paketti|id[- ]?tarkistus|henkil[öo]llisyy|home[- ]?delivery/i;
const PICKUP_AUTOMAT_HINTS = /pakettiautomaat|matkahuolto.{0,15}lähetys|smartpost|paketti.{0,10}piste|parcel.{0,10}locker/i;

export interface ParsedDelivery {
  cheapest?: number
  freeOver?: number
  /** True when at least one matched price was near a door-delivery hint. */
  doorDelivery?: boolean
}

export function parseDeliveryFromText(text: string): ParsedDelivery {
  const out: ParsedDelivery = {};

  // Free-over threshold
  const freeMatch = text.match(FREE_RE);
  if (freeMatch) {
    const raw = freeMatch[1] ?? freeMatch[2] ?? '';
    const v = parseFloat(raw.replace(/\s/g, '').replace(',', '.'));
    if (!isNaN(v) && v > 0) out.freeOver = v;
  }

  // Skip prices in pickup-automaatti contexts — those are illegal for ammo in Finland.
  type Candidate = { price: number; nearDoorHint: boolean; nearPickupHint: boolean }
  const candidates: Candidate[] = [];
  for (const m of text.matchAll(PRICE_RE)) {
    const v = parseFloat(m[1].replace(/\s/g, '').replace(',', '.'));
    if (isNaN(v) || v <= 0 || v > 50) continue;
    const idx = m.index ?? 0;
    const window = text.slice(Math.max(0, idx - 120), idx + 120);
    candidates.push({
      price: v,
      nearDoorHint: DOOR_DELIVERY_HINTS.test(window),
      nearPickupHint: PICKUP_AUTOMAT_HINTS.test(window),
    });
  }

  const door = candidates.filter(c => c.nearDoorHint && !c.nearPickupHint);
  if (door.length > 0) {
    out.cheapest = Math.min(...door.map(c => c.price));
    out.doorDelivery = true;
    return out;
  }
  const ambiguous = candidates.filter(c => !c.nearPickupHint);
  if (ambiguous.length > 0) {
    out.cheapest = Math.min(...ambiguous.map(c => c.price));
    out.doorDelivery = false;
  }
  return out;
}
