import type { AppData } from "./types"

export function getAvailableStock(productId: string, data: AppData): number {
  const stockMovements = data?.stockMovements || []
  const sales = data?.sales || []

  const stockIn = stockMovements.filter((m) => m.productId === productId).reduce((sum, m) => sum + m.quantity, 0)

  const stockOut = sales
    .flatMap((s) => s.items || [])
    .filter((item) => item.productId === productId)
    .reduce((sum, item) => sum + item.quantity, 0)

  return stockIn - stockOut
}

export function getLastSaleDate(productId: string, data: AppData): string | null {
  const sales = data?.sales || []

  const salesWithProduct = sales
    .filter((s) => s.items?.some((item) => item.productId === productId))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return salesWithProduct.length > 0 ? salesWithProduct[0].date : null
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function generateSKU(data: AppData): string {
  const existingSkus = data.products
    .map((p) => p.sku)
    .filter((sku): sku is string => !!sku)
    .map((sku) => {
      const match = sku.match(/^SKU-(\d+)$/)
      return match ? Number.parseInt(match[1]) : 0
    })

  const maxNumber = existingSkus.length > 0 ? Math.max(...existingSkus) : 0
  return `SKU-${String(maxNumber + 1).padStart(4, "0")}`
}

export function getTotalUnitsSold(productId: string, data: AppData): number {
  const sales = data?.sales || []

  return sales
    .flatMap((s) => s.items || [])
    .filter((item) => item.productId === productId)
    .reduce((sum, item) => sum + item.quantity, 0)
}
