"use client"

import type React from "react"

import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Trash2, Check, ChevronsUpDown } from "lucide-react"
import { generateId, getAvailableStock } from "@/lib/storage"
import type { AppData, Sale, SaleItem, Product } from "@/lib/types"
import { cn } from "@/lib/utils"

interface SalesFormProps {
  data: AppData
  updateData: (data: AppData) => void
  onSuccess?: () => void
  existingSale?: Sale
}

interface SaleItemForm {
  productId: string
  quantity: string
  unitPrice: string
}

function filterProducts(products: Product[] | undefined | null, searchTerm: string): Product[] {
  if (!products || !Array.isArray(products) || products.length === 0) {
    return []
  }

  const searchLower = (searchTerm || "").toLowerCase().trim()

  if (!searchLower) {
    // Return first 5 products when no search term
    return products.slice(0, 5)
  }

  const results: Product[] = []
  for (let i = 0; i < products.length && results.length < 5; i++) {
    const product = products[i]
    if (!product || typeof product !== "object") continue

    try {
      const name = String(product.name || "").toLowerCase()
      const color = String(product.color || "").toLowerCase()
      const model = String(product.model || "").toLowerCase()
      const sku = String(product.sku || "").toLowerCase()

      if (
        name.includes(searchLower) ||
        color.includes(searchLower) ||
        model.includes(searchLower) ||
        sku.includes(searchLower)
      ) {
        results.push(product)
      }
    } catch {
      // Skip this product if any error occurs
      continue
    }
  }

  return results
}

function ProductSearchDropdown({
  products,
  value,
  onChange,
  data,
}: {
  products: Product[]
  value: string
  onChange: (productId: string) => void
  data: AppData
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 150)
    return () => clearTimeout(timer)
  }, [search])

  const filteredProducts = useMemo(() => {
    return filterProducts(products, debouncedSearch)
  }, [products, debouncedSearch])

  const selectedProduct = useMemo(() => {
    if (!products || !Array.isArray(products) || !value) return null
    return products.find((p) => p?.id === value) || null
  }, [products, value])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    e.preventDefault()
    setSearch(e.target.value)
  }, [])

  const handleProductSelect = useCallback(
    (productId: string) => {
      onChange(productId)
      setSearch("")
      setDebouncedSearch("")
      setOpen(false)
    },
    [onChange],
  )

  const handleToggleOpen = useCallback(() => {
    setOpen((prev) => !prev)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background cursor-pointer",
          open && "ring-2 ring-ring ring-offset-2",
        )}
        onClick={handleToggleOpen}
      >
        <span className={cn(!selectedProduct && "text-muted-foreground")}>
          {selectedProduct ? selectedProduct.name : "Seleccione un producto..."}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          <div className="p-2">
            <Input
              ref={inputRef}
              placeholder="Buscar por nombre, color, modelo o SKU..."
              value={search}
              onChange={handleSearchChange}
              className="h-9"
              autoFocus
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              onFocus={(e) => e.stopPropagation()}
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => {
                if (!product) return null
                const stock = getAvailableStock(product.id, data)
                const isSelected = product.id === value
                return (
                  <div
                    key={product.id}
                    className={cn(
                      "flex cursor-pointer items-center rounded-sm px-2 py-2 text-sm hover:bg-accent",
                      isSelected && "bg-accent",
                    )}
                    onClick={() => handleProductSelect(product.id)}
                  >
                    <Check className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
                    <div className="flex flex-col">
                      <div className="font-medium">{product.name || "Sin nombre"}</div>
                      <div className="text-xs text-muted-foreground">
                        {product.color && `${product.color}`}
                        {product.model && ` • ${product.model}`}
                        {` • Stock: ${stock}`}
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="p-3 text-sm text-muted-foreground text-center">
                {debouncedSearch ? "No se encontraron productos" : "No hay productos disponibles"}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function SalesForm({ data, updateData, onSuccess, existingSale }: SalesFormProps) {
  const [saleDate, setSaleDate] = useState(existingSale?.date || new Date().toISOString().split("T")[0])
  const [paymentMethod, setPaymentMethod] = useState(existingSale?.paymentMethod || "efectivo")
  const [items, setItems] = useState<SaleItemForm[]>([{ productId: "", quantity: "", unitPrice: "" }])
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
      const product = (data?.products || []).find((p) => p.id === value)
      if (product) {
        newItems[index].unitPrice = product.defaultUnitPrice.toString()
      }
    }

    setItems(newItems)
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

    const products = data?.products || []
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
        const product = products.find((p) => p.id === item.productId)
        alert(`Stock insuficiente para ${product?.name}. Disponible: ${adjustedAvailable}, Solicitado: ${requested}`)
        return
      }
    }

    const saleItems: SaleItem[] = validItems.map((item) => {
      const product = products.find((p) => p.id === item.productId)
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
      const updatedSale: Sale = {
        ...existingSale,
        date: saleDate,
        paymentMethod,
        totalAmount: getFinalTotal(),
        items: saleItems,
      }

      const updatedSales = (data?.sales || []).map((s) => (s.id === existingSale.id ? updatedSale : s))

      updateData({
        ...data,
        sales: updatedSales,
      })

      alert("Venta actualizada con éxito")
    } else {
      const newSale: Sale = {
        id: generateId(),
        date: saleDate,
        paymentMethod,
        totalAmount: getFinalTotal(),
        items: saleItems,
      }

      updateData({
        ...data,
        sales: [...(data?.sales || []), newSale],
      })

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
            const selectedProduct = item.productId ? (data?.products || []).find((p) => p.id === item.productId) : null

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
                    <ProductSearchDropdown
                      products={data?.products || []}
                      value={item.productId}
                      onChange={(productId) => updateItem(index, "productId", productId)}
                      data={data}
                    />
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
