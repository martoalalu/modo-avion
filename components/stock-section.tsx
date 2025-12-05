"use client"

import type React from "react"

import { useState, useMemo, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Check, ChevronsUpDown } from "lucide-react"
import { generateId } from "@/lib/storage"
import type { AppData, StockMovement, Product } from "@/lib/types"
import { cn } from "@/lib/utils"

interface StockSectionProps {
  data: AppData
  updateData: (data: AppData) => void
}

function filterProducts(products: Product[] | undefined | null, searchTerm: string): Product[] {
  if (!products || !Array.isArray(products) || products.length === 0) {
    return []
  }

  const searchLower = (searchTerm || "").toLowerCase().trim()

  if (!searchLower) {
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
      continue
    }
  }

  return results
}

function ProductSearchDropdown({
  products,
  value,
  onChange,
}: {
  products: Product[]
  value: string
  onChange: (productId: string) => void
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
    return products.find((p) => String(p?.id) === String(value)) || null
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
    (productId: string | number) => {
      onChange(String(productId))
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
        <span className={cn("truncate", !selectedProduct && "text-muted-foreground")}>
          {selectedProduct
            ? `${selectedProduct.name}${selectedProduct.color ? ` - ${selectedProduct.color}` : ""}${selectedProduct.model ? ` (${selectedProduct.model})` : ""}`
            : "Seleccione un producto..."}
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
                const isSelected = String(product.id) === String(value)
                return (
                  <div
                    key={product.id}
                    className={cn(
                      "flex cursor-pointer items-center rounded-sm px-2 py-2 text-sm hover:bg-accent",
                      isSelected && "bg-accent",
                    )}
                    onClick={() => handleProductSelect(product.id)}
                  >
                    <Check className={cn("mr-2 h-4 w-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
                    <div className="flex flex-col min-w-0">
                      <div className="font-medium truncate">{product.name || "Sin nombre"}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {product.color && `${product.color}`}
                        {product.model && ` • ${product.model}`}
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

export function StockSection({ data, updateData }: StockSectionProps) {
  const [formData, setFormData] = useState({
    productId: "",
    quantity: "",
    date: new Date().toISOString().split("T")[0],
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.productId || !formData.quantity || Number.parseFloat(formData.quantity) <= 0) {
      alert("Por favor complete todos los campos correctamente")
      return
    }

    const newStockMovement: StockMovement = {
      id: generateId(),
      productId: formData.productId,
      quantity: Number.parseInt(formData.quantity),
      date: formData.date,
    }

    updateData({
      ...data,
      stockMovements: [...(data?.stockMovements || []), newStockMovement],
    })

    setFormData({
      productId: "",
      quantity: "",
      date: new Date().toISOString().split("T")[0],
    })
  }

  const recentMovements = [...(data?.stockMovements || [])]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 20)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Agregar Stock</CardTitle>
          <CardDescription>Registre el ingreso de mercadería</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="product">Producto *</Label>
                <ProductSearchDropdown
                  products={data?.products || []}
                  value={formData.productId}
                  onChange={(value) => setFormData({ ...formData, productId: value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Cantidad *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="0"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Fecha</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div className="flex items-end">
                <Button type="submit" className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Stock
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Movimientos Recientes</CardTitle>
          <CardDescription>Últimos 20 ingresos de stock</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentMovements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No hay movimientos registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  recentMovements.map((movement) => {
                    const product = (data?.products || []).find((p) => p.id === movement.productId)
                    return (
                      <TableRow key={movement.id}>
                        <TableCell>{new Date(movement.date).toLocaleDateString("es-AR")}</TableCell>
                        <TableCell>{product?.name || "Producto eliminado"}</TableCell>
                        <TableCell className="text-right font-medium text-green-600">+{movement.quantity}</TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
