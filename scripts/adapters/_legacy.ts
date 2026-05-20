import type {Adapter} from '../lib/adapter.js';

/**
 * Build a "legacy" adapter for a retailer that doesn't yet have its own
 * discovery or delivery scraping. Returns `null` from both, which tells the
 * orchestrator to retain existing URLs unconditionally (no auto-prune) and
 * fall back to whatever's in retailers.json for delivery.
 *
 * As we implement per-retailer adapters, replace these with full adapters in
 * their own files.
 */
export function legacyAdapter(name: string, baseUrl: string): Adapter {
  return {
    name,
    baseUrl,
    discover: async () => null,
    delivery: async () => null,
  };
}
