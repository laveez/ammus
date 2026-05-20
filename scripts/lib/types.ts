export interface Product {
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
  lastSeen?: string
}

export interface ProductsData {
  calibers: string[]
  products: Record<string, Product[]>
}

export interface DeliveryRule {
  method: string
  cheapestPrice: number
  freeOverThreshold?: number
  lastChecked: string
  notes?: string
}

export interface Retailer {
  baseUrl: string
  shippingPageUrl?: string
  delivery?: DeliveryRule | null
}

export type RetailersData = Record<string, Retailer>

export interface VariantInfo {
  qty: number
  price: number
  available: boolean
}

export interface ExtractResult {
  price: number | null
  available: boolean | null
  nonToxic: boolean | null
  strategy: string
  variants?: VariantInfo[]
}

export interface DiscoveredProduct {
  url: string
  caliber: string
  productName?: string
  hint?: { brand?: string; price?: number }
}
