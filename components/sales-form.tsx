"use client"

import type React from "react"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Trash2 } from "lucide-react"
import { generateId, getAvailableStock } from "@/lib/storage"
import type { AppData, Sale, SaleItem } from "@/lib/types"

interface SalesFormProps {
  data: AppData
  updateData: (data: AppData) => void
  onSuccess?: () => void
  existingSale?: Sale // Added prop for editing existing sales
}

interface SaleItemForm {
  productId: string
  quantity: string
  unitPrice: string
}

export function SalesForm({ data, updateData, onSuccess, existingSale }: SalesFormProps) {
  const [saleDate, setSaleDate] = useState(existingSale?.date || new Date().toISOString().split("T")[0])
  const [paymentMethod, setPaymentMethod] = useState(existingSale?.paymentMethod || "efectivo")
  const [items, setItems] = useState<SaleItemForm[]>([{ productId: "", quantity: "", unitPrice: "" }])
  const [productSearches, setProductSearches] = useState<Record<number, string>>({})
  const [manualTotal, setManualTotal] = useState<string>("")
  const [isManualTotalEdited, setIsManualTotalEdited] = useState(false)

  useEffect(() => {
    if (existingSale) {
      setSaleDate(existingSale.date)
      setPaymentMethod(existingSale.paymentMethod)
      setItems(
        existingSale.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity.toString(),
          unitPrice: item.unitPrice.toString(),
        })),
      )
      setManualTotal(existingSale.totalAmount.toString())
      setIsManualTotalEdited(false)
    }
  }, [existingSale])

  const addItem = () => {
    setItems([...items, { productId: "", quantity: "", unitPrice: "" }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const updateItem = (index: number, field: keyof SaleItemForm, value: string) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }

    if (field === "productId" && value) {
      const product = data.products.find((p) => p.id === value)
      if (product) {
        newItems[index].unitPrice = product.defaultUnitPrice.toString()
      }
    }

    setItems(newItems)
  }

  const updateProductSearch = (index: number, search: string) => {
    setProductSearches((prev) => ({ ...prev, [index]: search }))
  }

  const getFilteredProductsForItem = (index: number) => {
    const search = productSearches[index] || ""
    if (!search.trim()) return data.products

    const searchLower = search.toLowerCase()
    return data.products.filter(
      (product) =>
        product.name.toLowerCase().includes(searchLower) ||
        product.color?.toLowerCase().includes(searchLower) ||
        product.model?.toLowerCase().includes(searchLower) ||
        product.sku?.toLowerCase().includes(searchLower),
    )
  }

  const calculateLineTotal = (item: SaleItemForm): number => {
    const quantity = Number.parseFloat(item.quantity) || 0
    const price = Number.parseFloat(item.unitPrice) || 0
    return quantity * price
  }

  const calculateTotal = (): number => {
    return items.reduce((sum, item) => sum + calculateLineTotal(item), 0)
  }

  const getFinalTotal = (): number => {
    if (isManualTotalEdited && manualTotal) {
      return Number.parseFloat(manualTotal) || 0
    }
    return calculateTotal()
  }

  useEffect(() => {
    if (!isManualTotalEdited) {
      setManualTotal(calculateTotal().toFixed(2))
    }
  }, [items, isManualTotalEdited])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const validItems = items.filter(
      (item) =>
        item.productId &&
        item.quantity &&
        Number.parseFloat(item.quantity) > 0 &&
        item.unitPrice &&
        Number.parseFloat(item.unitPrice) >= 0,
    )

    if (validItems.length === 0) {
      alert("Por favor agregue al menos un producto válido a la venta")
      return
    }

    for (const item of validItems) {
      const available = getAvailableStock(item.productId, data)
      const requested = Number.parseInt(item.quantity)

      let adjustedAvailable = available
      if (existingSale) {
        const originalItem = existingSale.items.find((i) => i.productId === item.productId)
        if (originalItem) {
          adjustedAvailable += originalItem.quantity
        }
      }

      if (requested > adjustedAvailable) {
        const product = data.products.find((p) => p.id === item.productId)
        alert(`Stock insuficiente para ${product?.name}. Disponible: ${adjustedAvailable}, Solicitado: ${requested}`)
        return
      }
    }

    const saleItems: SaleItem[] = validItems.map((item) => {
      const product = data.products.find((p) => p.id === item.productId)
      const quantity = Number.parseInt(item.quantity)
      const unitPrice = Number.parseFloat(item.unitPrice)

      return {
        productId: item.productId,
        productName: product?.name || "",
        quantity,
        unitPrice,
        lineTotal: quantity * unitPrice,
      }
    })

    if (existingSale) {
      console.log("[v0] Updating sale:", existingSale.id)
      const updatedSale: Sale = {
        ...existingSale,
        date: saleDate,
        paymentMethod,
        totalAmount: getFinalTotal(),
        items: saleItems,
      }

      const updatedSales = data.sales.map((s) => (s.id === existingSale.id ? updatedSale : s))

      updateData({
        ...data,
        sales: updatedSales,
      })

      console.log("[v0] Sale updated successfully")
      alert("Venta actualizada con éxito")
    } else {
      const newSale: Sale = {
        id: generateId(),
        date: saleDate,
        paymentMethod,
        totalAmount: getFinalTotal(),
        items: saleItems,
      }

      console.log("[v0] Creating new sale")
      updateData({
        ...data,
        sales: [...data.sales, newSale],
      })

      console.log("[v0] Sale created successfully")
      alert("Venta registrada con éxito")
    }

    setItems([{ productId: "", quantity: "", unitPrice: "" }])
    setSaleDate(new Date().toISOString().split("T")[0])
    setPaymentMethod("efectivo")
    setManualTotal("")
    setIsManualTotalEdited(false)

    if (onSuccess) {
      onSuccess()
    }
  }

  const uniqueModels = useMemo(() => {
    const models = new Set<string>()
    data.products.forEach((p) => {
      if (p.model) models.add(p.model)
    })
    return Array.from(models).sort()
  }, [data.products])

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="sale-date">Fecha</Label>
          <Input id="sale-date" type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="payment-method">Método de Pago</Label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger id="payment-method">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="efectivo">Efectivo</SelectItem>
              <SelectItem value="tarjeta">Tarjeta</SelectItem>
              <SelectItem value="transferencia">Transferencia</SelectItem>
              <SelectItem value="qr">QR</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Label>Productos</Label>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Agregar Producto</span>
            <span className="sm:hidden">Agregar</span>
          </Button>
        </div>

        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
          {items.map((item, index) => {
            const availableStock = item.productId ? getAvailableStock(item.productId, data) : 0
            const selectedProduct = item.productId ? data.products.find((p) => p.id === item.productId) : null

            const filteredProducts = getFilteredProductsForItem(index)

            return (
              <Card key={index} className="relative">
                <CardContent className="p-3 space-y-3 sm:p-4">
                  <div className="absolute top-2 right-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                      disabled={items.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2 pr-8">
                    <Label className="text-sm">Producto</Label>
                    <div className="space-y-2">
                      <Input
                        placeholder="Buscar por nombre, color, modelo o SKU..."
                        value={productSearches[index] || ""}
                        onChange={(e) => updateProductSearch(index, e.target.value)}
                        className="text-sm"
                      />
                      <Select
                        value={item.productId}
                        onValueChange={(value) => {
                          updateItem(index, "productId", value)
                          updateProductSearch(index, "")
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un producto..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {filteredProducts.length > 0 ? (
                            filteredProducts.map((product) => {
                              const stock = getAvailableStock(product.id, data)
                              return (
                                <SelectItem key={product.id} value={product.id}>
                                  <div className="flex flex-col">
                                    <div className="font-medium">{product.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {product.color && `${product.color}`}
                                      {product.model && ` • ${product.model}`}
                                      {` • Stock: ${stock}`}
                                    </div>
                                  </div>
                                </SelectItem>
                              )
                            })
                          ) : (
                            <div className="p-3 text-sm text-muted-foreground text-center">
                              {productSearches[index]
                                ? "No se encontraron productos con ese criterio"
                                : "No hay productos disponibles"}
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {selectedProduct && (
                    <div className="text-sm text-muted-foreground space-y-1">
                      {selectedProduct.color && <div>Color: {selectedProduct.color}</div>}
                      {selectedProduct.model && <div>Modelo: {selectedProduct.model}</div>}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm">Cantidad</Label>
                      <Input
                        type="number"
                        min="1"
                        max={availableStock}
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", e.target.value)}
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Precio Unit.</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, "unitPrice", e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-xs font-medium text-muted-foreground sm:text-sm">Subtotal</span>
                    <span className="text-base font-bold sm:text-lg">${calculateLineTotal(item).toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3 sm:p-4">
          <div className="space-y-1">
            <span className="text-base font-semibold sm:text-lg">Total</span>
            <div className="text-xs text-muted-foreground">
              {isManualTotalEdited ? "Total editado manualmente" : "Total calculado"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold">$</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={manualTotal}
              onChange={(e) => {
                setManualTotal(e.target.value)
                setIsManualTotalEdited(true)
              }}
              className="w-32 text-right text-xl font-bold sm:w-40"
              placeholder="0.00"
            />
          </div>
        </div>
        {isManualTotalEdited && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setManualTotal(calculateTotal().toFixed(2))
              setIsManualTotalEdited(false)
            }}
            className="w-full"
          >
            Restaurar total calculado (${calculateTotal().toFixed(2)})
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setItems([{ productId: "", quantity: "", unitPrice: "" }])
            setSaleDate(new Date().toISOString().split("T")[0])
            setPaymentMethod("efectivo")
            setManualTotal("")
            setIsManualTotalEdited(false)
          }}
        >
          Limpiar
        </Button>
        <Button type="submit">{existingSale ? "Actualizar Venta" : "Registrar Venta"}</Button>
      </div>
    </form>
  )
}
