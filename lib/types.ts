export interface Product {
  id: string
  name: string
  baseName?: string
  color?: string // Made color optional
  model?: string
  sku?: string
  category: "Funda" | "Accesorio" | "" // Changed to dropdown values
  defaultUnitPrice: number
  createdAt: string
  variants?: ProductVariant[] // Added optional variants field
}

export interface ProductVariant {
  color: string
  model: string
  price?: string
  stock?: string
}

export interface StockMovement {
  id: string
  productId: string
  quantity: number
  date: string
}

export interface SaleItem {
  productId: string
  productName: string
  unitPrice: number
  quantity: number
  lineTotal: number
}

export interface Sale {
  id: string
  date: string
  paymentMethod: string
  totalAmount: number
  items: SaleItem[]
}

export interface AppData {
  products: Product[]
  stockMovements: StockMovement[]
  sales: Sale[]
}

export interface InventarioSectionProps {
  data: AppData
  updateData: (data: AppData) => void
}

export type SortField = "name" | "stock" | "model" | "unitPrice" | "color" | "totalSold"
export type SortDirection = "asc" | "desc"
