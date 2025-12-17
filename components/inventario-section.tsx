"use client"

import type React from "react"

import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Pencil, Trash2, ArrowUpDown, X, ChevronLeft, ChevronRight, Check, ChevronsUpDown } from "lucide-react"
import { generateId, getAvailableStock, getLastSaleDate, generateSKU, getTotalUnitsSold } from "@/lib/storage"
import type {
  Product,
  StockMovement,
  InventarioSectionProps,
  SortField,
  SortDirection,
  ProductVariant,
} from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

const PRELOADE_IPHONE_MODELS = [
  "16 PRO MAX",
  "16 PRO",
  "16",
  "15 PRO MAX",
  "15 PRO",
  "14 PRO MAX",
  "14 PRO",
  "14",
  "13/14",
  "13",
  "13 PRO MAX",
  "13 PRO",
  "11",
]

const ITEMS_PER_PAGE = 20 // Show 20 items per page for better performance
const PAGE_SIZE_OPTIONS = [20, 50, 100, 200]

function StockProductSearchDropdown({
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 150)
    return () => clearTimeout(timer)
  }, [search])

  const filteredProducts = useMemo(() => {
    if (!products || !Array.isArray(products) || products.length === 0) {
      return []
    }

    const searchLower = (debouncedSearch || "").toLowerCase().trim()

    if (!searchLower) {
      return products.slice(0, 5)
    }

    // Split search into words for multi-word matching
    const searchWords = searchLower.split(/\s+/).filter((word) => word.length > 0)

    const results: Product[] = []
    for (let i = 0; i < products.length && results.length < 5; i++) {
      const product = products[i]
      if (!product || typeof product !== "object") continue

      try {
        const name = String(product.name || "").toLowerCase()
        const color = String(product.color || "").toLowerCase()
        const model = String(product.model || "").toLowerCase()
        const combinedText = `${name} ${color} ${model}`

        // Check if ALL search words are present in the combined text
        const allWordsMatch = searchWords.every((word) => combinedText.includes(word))

        if (allWordsMatch) {
          results.push(product)
        }
      } catch {
        continue
      }
    }

    return results
  }, [products, debouncedSearch])

  const selectedProduct = useMemo(() => {
    if (!products || !Array.isArray(products) || !value) return null
    return products.find((p) => String(p?.id) === String(value)) || null
  }, [products, value])

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

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background cursor-pointer",
          open && "ring-2 ring-ring ring-offset-2",
        )}
        onClick={() => setOpen((prev) => !prev)}
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
              placeholder="Buscar por nombre, color, modelo..."
              value={search}
              onChange={handleSearchChange}
              className="h-9"
              autoFocus
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
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

export function InventarioSection({ data, updateData }: InventarioSectionProps) {
  const { toast } = useToast()
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false)
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterModel, setFilterModel] = useState<string[]>([])
  const [filterStock, setFilterStock] = useState<string[]>([])
  const [filterCategory, setFilterCategory] = useState("all")
  const [filterColor, setFilterColor] = useState<string[]>([])
  const [filterTotalSold, setFilterTotalSold] = useState<string[]>([])
  const [sortField, setSortField] = useState<SortField>("stock")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE)

  const [productFormData, setProductFormData] = useState({
    name: "",
    sku: "",
    category: "",
    model: "",
    color: "",
    defaultUnitPrice: "",
    currentStock: "",
  })

  const [stockFormData, setStockFormData] = useState({
    productId: "",
    quantity: "",
    date: new Date().toISOString().split("T")[0],
  })

  const [isCustomModel, setIsCustomModel] = useState(false)
  const [customModel, setCustomModel] = useState("")

  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [currentVariant, setCurrentVariant] = useState<ProductVariant>({ color: "", model: "" })

  const [showVariantForm, setShowVariantForm] = useState(false)

  const [variantPrice, setVariantPrice] = useState("")
  const [variantStock, setVariantStock] = useState("0")

  const [isCustomColor, setIsCustomColor] = useState(false)
  const [customColor, setCustomColor] = useState("")

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [availableColors, setAvailableColors] = useState<string[]>([])

  const [initialStock, setInitialStock] = useState("0")
  const [stockProductSearch, setStockProductSearch] = useState("")

  useEffect(() => {
    const models = new Set<string>(PRELOADE_IPHONE_MODELS) // Start with preloaded models
    const colors = new Set<string>()

    data.products.forEach((product) => {
      if (product.model) models.add(product.model)
      if (product.color) colors.add(product.color)
    })

    setAvailableModels(Array.from(models).sort())
    setAvailableColors(Array.from(colors).sort())
  }, [data.products])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterModel, filterCategory, filterColor, filterStock, filterTotalSold])

  const filteredProducts = useMemo(() => {
    const result = data.products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesModel = filterModel.length === 0 || filterModel.includes(product.model || "")

      const matchesCategory = filterCategory === "all" || product.category === filterCategory

      const matchesColor = filterColor.length === 0 || filterColor.includes(product.color || "")

      const matchesStockFilter = (() => {
        if (filterStock.length === 0) return true

        const stock = getAvailableStock(product.id, data)
        return filterStock.some((level) => {
          switch (level) {
            case "no-stock":
              return stock === 0
            case "critical":
              return stock >= 1 && stock <= 5
            case "low":
              return stock >= 6 && stock <= 10
            case "normal":
              return stock > 10
            default:
              return false
          }
        })
      })()

      const matchesTotalSoldFilter = (() => {
        if (filterTotalSold.length === 0) return true

        const totalSold = getTotalUnitsSold(product.id, data)
        return filterTotalSold.some((level) => {
          switch (level) {
            case "zero":
              return totalSold === 0
            case "low":
              return totalSold >= 1 && totalSold <= 10
            case "high":
              return totalSold > 10
            default:
              return false
          }
        })
      })()

      if (product.name.includes("FIBRA DE CARBONO") || product.name.includes("CARBONO")) {
        const stock = getAvailableStock(product.id, data)
        console.log("[v0] CARBONO product filter check:", {
          name: product.name,
          id: product.id,
          stock,
          filterStock,
          matchesStockFilter,
          matchesSearch,
          matchesModel,
          matchesCategory,
          matchesColor,
          matchesTotalSoldFilter,
          allMatch:
            matchesSearch &&
            matchesModel &&
            matchesCategory &&
            matchesColor &&
            matchesStockFilter &&
            matchesTotalSoldFilter,
        })
      }

      return (
        matchesSearch && matchesModel && matchesCategory && matchesColor && matchesStockFilter && matchesTotalSoldFilter
      )
    })

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0

      if (sortField === "name") {
        comparison = a.name.localeCompare(b.name)
      } else if (sortField === "stock") {
        comparison = getAvailableStock(a.id, data) - getAvailableStock(b.id, data)
      } else if (sortField === "model") {
        const modelA = a.model || ""
        const modelB = b.model || ""
        comparison = String(modelA).localeCompare(String(modelB))
      } else if (sortField === "unitPrice") {
        comparison = a.defaultUnitPrice - b.defaultUnitPrice
      } else if (sortField === "color") {
        comparison = (a.color || "").localeCompare(b.color || "")
      } else if (sortField === "totalSold") {
        comparison = getTotalUnitsSold(a.id, data) - getTotalUnitsSold(b.id, data)
      }

      return sortDirection === "asc" ? comparison : -comparison
    })

    return result
  }, [
    data,
    searchTerm,
    filterModel,
    filterCategory,
    filterColor,
    filterStock,
    filterTotalSold,
    sortField,
    sortDirection,
  ])

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredProducts.slice(startIndex, endIndex)
  }, [filteredProducts, currentPage, itemsPerPage])

  const filteredStockProducts = useMemo(() => {
    if (!stockProductSearch.trim()) return data.products

    const search = stockProductSearch.toLowerCase()
    return data.products.filter(
      (product) =>
        product.name.toLowerCase().includes(search) ||
        String(product.color || "")
          .toLowerCase()
          .includes(search) ||
        String(product.model || "")
          .toLowerCase()
          .includes(search) ||
        String(product.sku || "")
          .toLowerCase()
          .includes(search),
    )
  }, [data.products, stockProductSearch])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const getStockColor = (stock: number) => {
    if (stock === 0) return "text-red-700 bg-red-100"
    if (stock >= 1 && stock <= 5) return "text-orange-700 bg-orange-100"
    if (stock >= 6 && stock <= 10) return "text-yellow-700 bg-yellow-100"
    return "text-green-700 bg-green-100"
  }

  const openCreateProductDialog = () => {
    setEditingProduct(null)
    setProductFormData({
      name: "",
      sku: "",
      category: "",
      model: "",
      color: "",
      defaultUnitPrice: "",
      currentStock: "",
    })
    setIsCustomModel(false)
    setCustomModel("")
    setVariants([])
    setCurrentVariant({ color: "", model: "" })
    setIsCustomColor(false)
    setCustomColor("")
    setVariantPrice("")
    setVariantStock("0")
    setShowVariantForm(false)
    setIsProductDialogOpen(true)
    setInitialStock("0")
  }

  const openEditProductDialog = (product: Product) => {
    setEditingProduct(product)
    const currentStock = getAvailableStock(product.id, data) // Get current stock for editing
    setProductFormData({
      name: product.name,
      sku: product.sku || "",
      category: product.category || "",
      model: product.model || "",
      color: product.color || "",
      defaultUnitPrice: product.defaultUnitPrice.toString(),
      currentStock: currentStock.toString(),
    })
    setIsCustomModel(false)
    setCustomModel("")
    setVariants([])
    setCurrentVariant({ color: "", model: "" })
    setIsCustomColor(false)
    setCustomColor("")
    setVariantPrice("")
    setVariantStock("0")
    setShowVariantForm(false)
    setIsProductDialogOpen(true)
    // If editing, we might want to pre-fill color, model, price based on the product, but the form logic handles this now
    if (product.color) {
      setProductFormData((prev) => ({ ...prev, color: product.color! }))
    }
    if (product.model) {
      setProductFormData((prev) => ({ ...prev, model: product.model! }))
    }
    if (product.defaultUnitPrice) {
      setProductFormData((prev) => ({ ...prev, defaultUnitPrice: product.defaultUnitPrice.toString() }))
    }
  }

  const handleAddVariant = () => {
    if (!currentVariant.model) {
      alert("El modelo es requerido para crear una variante")
      return
    }

    if (!variantPrice) {
      alert("El precio unitario es requerido para crear una variante")
      return
    }

    const exists = variants.some((v) => v.color === currentVariant.color && v.model === currentVariant.model)
    if (exists) {
      alert("Esta combinación de color y modelo ya existe")
      return
    }

    setVariants([
      ...variants,
      {
        ...currentVariant,
        price: variantPrice,
        stock: variantStock,
      },
    ])
    setCurrentVariant({ color: "", model: "" })
    setVariantPrice("")
    setVariantStock("0")
    setIsCustomColor(false)
    setCustomColor("")
    setShowVariantForm(false)
  }

  const handleRemoveVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index))
  }

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (editingProduct) {
      const updatedProducts = data.products.map((p) =>
        p.id === editingProduct.id
          ? {
              ...p,
              name: productFormData.name,
              category: productFormData.category as "Funda" | "Accesorio" | "",
              model: productFormData.model || undefined, // Ensure model can be undefined
              color: productFormData.color || undefined, // Ensure color can be undefined
              defaultUnitPrice: Number.parseFloat(productFormData.defaultUnitPrice),
            }
          : p,
      )

      const currentStock = getAvailableStock(editingProduct.id, data)
      const newStock = Number.parseInt(productFormData.currentStock) || 0
      const stockDifference = newStock - currentStock

      const updatedStockMovements = [...(data.stockMovements || [])]

      if (stockDifference !== 0) {
        // Create an adjustment stock movement
        const adjustmentEntry: StockMovement = {
          id: `stock-adj-${Date.now()}-${Math.random()}`,
          productId: editingProduct.id,
          quantity: stockDifference,
          date: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        }
        updatedStockMovements.push(adjustmentEntry)
      }

      updateData({ ...data, products: updatedProducts, stockMovements: updatedStockMovements })

      alert("Cambios guardados exitosamente")
    } else {
      if (variants.length > 0) {
        const newProducts: Product[] = []
        const newStockMovements: StockMovement[] = []

        for (const variant of variants) {
          const newProduct: Product = {
            id: `product-${Date.now()}-${Math.random()}`,
            name: productFormData.name,
            sku: generateSKU({ ...data, products: [...data.products, ...newProducts] }),
            category: productFormData.category as "Funda" | "Accesorio" | "",
            model: variant.model,
            color: variant.color || undefined,
            defaultUnitPrice: variant.price
              ? Number.parseFloat(variant.price)
              : Number.parseFloat(productFormData.defaultUnitPrice),
            createdAt: new Date().toISOString(),
          }

          newProducts.push(newProduct)

          const variantStockAmount = variant.stock ? Number.parseInt(variant.stock) : 0
          if (variantStockAmount > 0) {
            const stockEntry: StockMovement = {
              id: `stock-${Date.now()}-${Math.random()}`,
              productId: newProduct.id,
              quantity: variantStockAmount,
              date: new Date().toISOString(),
              createdAt: new Date().toISOString(),
            }
            newStockMovements.push(stockEntry)
          }
        }

        updateData({
          ...data,
          products: [...data.products, ...newProducts],
          stockMovements: [...data.stockMovements, ...newStockMovements],
        })

        alert(`${newProducts.length} producto(s) creado(s) exitosamente`)
      } else {
        if (productFormData.category === "Funda" && !productFormData.model) {
          alert("El modelo es obligatorio para las fundas")
          return
        }

        const sku = generateSKU(data)
        const newProduct: Product = {
          id: generateId(),
          name: productFormData.name,
          sku,
          category: productFormData.category as "Funda" | "Accesorio" | "",
          model: productFormData.model || undefined,
          color: productFormData.color || undefined,
          defaultUnitPrice: Number.parseFloat(productFormData.defaultUnitPrice),
          createdAt: new Date().toISOString(),
        }

        const stockAmount = Number.parseInt(initialStock) || 0
        const newMovements: StockMovement[] = []

        if (stockAmount > 0) {
          const newMovement: StockMovement = {
            id: generateId(),
            productId: newProduct.id,
            quantity: stockAmount,
            date: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          }
          newMovements.push(newMovement)
        }

        updateData({
          ...data,
          products: [...data.products, newProduct],
          stockMovements: [...data.stockMovements, ...newMovements],
        })

        alert("Producto creado exitosamente")
      }
    }

    setInitialStock("0")
    setIsProductDialogOpen(false)
    setProductFormData({
      name: "",
      sku: "",
      category: "",
      model: "",
      color: "",
      defaultUnitPrice: "",
      currentStock: "",
    })
    setIsCustomModel(false)
    setCustomModel("")
    setVariants([])
    setCurrentVariant({ color: "", model: "" })
    setIsCustomColor(false)
    setCustomColor("")
    setVariantPrice("")
    setVariantStock("0")
    setShowVariantForm(false)
    setEditingProduct(null) // Reset editing state
  }

  const handleDeleteProduct = (productId: string) => {
    if (confirm("¿Está seguro que desea eliminar este producto?")) {
      console.log("[v0] Deleting product:", productId)
      const updatedProducts = data.products.filter((p) => p.id !== productId)
      console.log("[v0] Updated products count:", updatedProducts.length)
      const newData = { ...data, products: updatedProducts }
      updateData(newData)
      console.log("[v0] Product deleted successfully")
    }
  }

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return

    if (confirm(`¿Está seguro que desea eliminar ${selectedIds.size} producto(s)?`)) {
      console.log("[v0] Deleting products:", Array.from(selectedIds))
      const updatedProducts = data.products.filter((p) => !selectedIds.has(p.id))
      console.log("[v0] Updated products count:", updatedProducts.length)
      const newData = { ...data, products: updatedProducts }
      updateData(newData)
      setSelectedIds(new Set())
      console.log("[v0] Products deleted successfully")
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedProducts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(paginatedProducts.map((item) => item.id)))
    }
  }

  const toggleSelectRow = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const openStockDialog = () => {
    setStockFormData({
      productId: "",
      quantity: "",
      date: new Date().toISOString().split("T")[0],
    })
    setIsCustomModel(false) // Resetting these state values
    setCustomModel("")
    setIsCustomColor(false)
    setCustomColor("")
    setStockProductSearch("") // Clear search term for stock dialog
    setIsStockDialogOpen(true)
  }

  const handleStockSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!stockFormData.productId || !stockFormData.quantity) {
      alert("Por favor complete todos los campos")
      return
    }

    const newMovement: StockMovement = {
      id: generateId(),
      productId: stockFormData.productId,
      quantity: Number.parseInt(stockFormData.quantity),
      type: "in",
      date: stockFormData.date,
      createdAt: new Date().toISOString(),
    }

    updateData({
      ...data,
      stockMovements: [...data.stockMovements, newMovement],
    })

    setIsStockDialogOpen(false)
    setStockFormData({
      productId: "",
      quantity: "",
      date: new Date().toISOString().split("T")[0],
    })

    alert("Stock agregado exitosamente")
  }

  const toggleFilter = (currentFilters: string[], value: string) => {
    if (currentFilters.includes(value)) {
      return currentFilters.filter((v) => v !== value)
    } else {
      return [...currentFilters, value]
    }
  }

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number.parseInt(value))
    setCurrentPage(1) // Reset to first page
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h2 className="text-2xl font-semibold">Inventario</h2>
        <div className="flex flex-wrap gap-2">
          <Button onClick={openCreateProductDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nuevo Producto</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
          <Button onClick={openStockDialog} variant="outline" className="gap-2 bg-transparent">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Agregar Stock</span>
            <span className="sm:hidden">+ Stock</span>
          </Button>
          {selectedIds.size > 0 && (
            <Button onClick={handleDeleteSelected} variant="destructive" className="gap-2">
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Eliminar Seleccionados ({selectedIds.size})</span>
              <span className="sm:hidden">Eliminar ({selectedIds.size})</span>
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="w-full">
          <Label htmlFor="search">Buscar producto</Label>
          <Input
            id="search"
            placeholder="Buscar por nombre o SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-2">
            <Label htmlFor="filter-category" className="text-sm">
              Filtrar por Categoría
            </Label>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger id="filter-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                <SelectItem value="Funda">Funda</SelectItem>
                <SelectItem value="Accesorio">Accesorio</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-color" className="text-sm">
              Filtrar por Color
            </Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between bg-transparent">
                  {filterColor.length === 0
                    ? "Todos los colores"
                    : `${filterColor.length} seleccionado${filterColor.length > 1 ? "s" : ""}`}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                {filterColor.length > 0 && (
                  <>
                    <DropdownMenuItem onClick={() => setFilterColor([])}>Limpiar filtro</DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {availableColors.map((color) => (
                  <DropdownMenuItem
                    key={color}
                    onClick={(e) => {
                      e.preventDefault()
                      setFilterColor(toggleFilter(filterColor, color))
                    }}
                  >
                    <Checkbox checked={filterColor.includes(color)} className="mr-2" />
                    {color}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-model" className="text-sm">
              Filtrar por Modelo
            </Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between bg-transparent">
                  {filterModel.length === 0
                    ? "Todos los modelos"
                    : `${filterModel.length} seleccionado${filterModel.length > 1 ? "s" : ""}`}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                {filterModel.length > 0 && (
                  <>
                    <DropdownMenuItem onClick={() => setFilterModel([])}>Limpiar filtro</DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {availableModels.map((model) => (
                  <DropdownMenuItem
                    key={model}
                    onClick={(e) => {
                      e.preventDefault()
                      setFilterModel(toggleFilter(filterModel, model))
                    }}
                  >
                    <Checkbox checked={filterModel.includes(model)} className="mr-2" />
                    {model}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-stock" className="text-sm">
              Filtrar por Stock
            </Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between bg-transparent">
                  {filterStock.length === 0
                    ? "Todos los niveles"
                    : `${filterStock.length} seleccionado${filterStock.length > 1 ? "s" : ""}`}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                {filterStock.length > 0 && (
                  <>
                    <DropdownMenuItem onClick={() => setFilterStock([])}>Limpiar filtro</DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault()
                    setFilterStock(toggleFilter(filterStock, "no-stock"))
                  }}
                >
                  <Checkbox checked={filterStock.includes("no-stock")} className="mr-2" />
                  Sin stock (0)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault()
                    setFilterStock(toggleFilter(filterStock, "critical"))
                  }}
                >
                  <Checkbox checked={filterStock.includes("critical")} className="mr-2" />
                  Crítico (1-5)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault()
                    setFilterStock(toggleFilter(filterStock, "low"))
                  }}
                >
                  <Checkbox checked={filterStock.includes("low")} className="mr-2" />
                  Bajo (6-10)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault()
                    setFilterStock(toggleFilter(filterStock, "normal"))
                  }}
                >
                  <Checkbox checked={filterStock.includes("normal")} className="mr-2" />
                  Normal (10+)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Add Total Sold Filter Here */}
          <div className="space-y-2">
            <Label htmlFor="filter-total-sold" className="text-sm">
              Filtrar por Total Vendido
            </Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between bg-transparent">
                  {filterTotalSold.length === 0
                    ? "Todos los totales"
                    : `${filterTotalSold.length} seleccionado${filterTotalSold.length > 1 ? "s" : ""}`}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                {filterTotalSold.length > 0 && (
                  <>
                    <DropdownMenuItem onClick={() => setFilterTotalSold([])}>Limpiar filtro</DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault()
                    setFilterTotalSold(toggleFilter(filterTotalSold, "zero"))
                  }}
                >
                  <Checkbox checked={filterTotalSold.includes("zero")} className="mr-2" />
                  Cero ventas (0)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault()
                    setFilterTotalSold(toggleFilter(filterTotalSold, "low"))
                  }}
                >
                  <Checkbox checked={filterTotalSold.includes("low")} className="mr-2" />
                  Bajo (1-10)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault()
                    setFilterTotalSold(toggleFilter(filterTotalSold, "high"))
                  }}
                >
                  <Checkbox checked={filterTotalSold.includes("high")} className="mr-2" />
                  Alto (10+)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-2">
            <Label htmlFor="items-per-page" className="text-sm">
              Productos por página
            </Label>
            <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
              <SelectTrigger id="items-per-page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size} productos
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>
            Mostrando {paginatedProducts.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} a{" "}
            {Math.min(currentPage * itemsPerPage, filteredProducts.length)} de {filteredProducts.length} productos
            {filteredProducts.length !== data.products.length && ` (filtrados de ${data.products.length} totales)`}
          </p>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.size === paginatedProducts.length && paginatedProducts.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="min-w-[200px]">
                <Button variant="ghost" size="sm" onClick={() => handleSort("name")} className="gap-1 px-0">
                  Nombre
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" onClick={() => handleSort("color")} className="gap-1 px-0">
                  Color
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" onClick={() => handleSort("model")} className="gap-1 px-0">
                  Modelo
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" onClick={() => handleSort("stock")} className="gap-1 px-0">
                  Stock
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button variant="ghost" size="sm" onClick={() => handleSort("unitPrice")} className="gap-1 px-0">
                  Precio Unitario
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Última Venta</TableHead>
              <TableHead className="text-right">
                <Button variant="ghost" size="sm" onClick={() => handleSort("totalSold")} className="gap-1 px-0">
                  Total Vendido
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  No se encontraron productos
                </TableCell>
              </TableRow>
            ) : (
              paginatedProducts.map((product) => {
                const stock = getAvailableStock(product.id, data)
                const lastSaleDate = getLastSaleDate(product.id, data.sales)
                const totalSold = getTotalUnitsSold(product.id, data)
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(product.id)}
                        onCheckedChange={() => toggleSelectRow(product.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.color}</TableCell>
                    <TableCell>{product.model}</TableCell>
                    <TableCell>
                      <Badge className={getStockColor(stock)}>{stock}</Badge>
                    </TableCell>
                    <TableCell className="text-right">${product.defaultUnitPrice.toFixed(2)}</TableCell>
                    <TableCell>{lastSaleDate ? new Date(lastSaleDate).toLocaleDateString("es-AR") : "-"}</TableCell>
                    <TableCell className="text-right">
                      {totalSold === 0 ? (
                        <span className="inline-flex items-center justify-center px-2 py-1 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-medium">
                          {totalSold}
                        </span>
                      ) : (
                        totalSold
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEditProductDialog(product)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteProduct(product.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
              className="bg-transparent"
            >
              Primera
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="gap-1 bg-transparent"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => goToPage(pageNum)}
                    className={currentPage !== pageNum ? "bg-transparent" : ""}
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="gap-1 bg-transparent"
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
              className="bg-transparent"
            >
              Última
            </Button>
          </div>
        </div>
      )}

      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
            <DialogDescription>
              {editingProduct ? "Modifique los datos del producto" : "Complete los datos del nuevo producto"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleProductSubmit}>
            <div className="space-y-4">
              {/* Always visible: Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Producto *</Label>
                <Input
                  id="name"
                  value={productFormData.name}
                  onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })}
                  placeholder="Ej: Funda iPhone 15 Pro"
                  required
                />
              </div>

              {/* Always visible: Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Categoría *</Label>
                <Select
                  value={productFormData.category}
                  onValueChange={(value) => {
                    setProductFormData({ ...productFormData, category: value })
                    if (value !== "Funda") {
                      setVariants([])
                      setCurrentVariant({ color: "", model: "" })
                      setShowVariantForm(false)
                    }
                  }}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Seleccione una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Funda">Funda</SelectItem>
                    <SelectItem value="Accesorio">Accesorio</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editingProduct && (
                <>
                  {/* Removed duplicate currentStock field */}
                  <div className="space-y-2">
                    <Label htmlFor="edit-color">Color (Opcional)</Label>
                    <Select
                      value={isCustomColor ? "custom" : productFormData.color || "none"}
                      onValueChange={(value) => {
                        if (value === "custom") {
                          setIsCustomColor(true)
                          setProductFormData({ ...productFormData, color: customColor })
                        } else if (value === "none") {
                          setIsCustomColor(false)
                          setCustomColor("")
                          setProductFormData({ ...productFormData, color: "" })
                        } else {
                          setIsCustomColor(false)
                          setCustomColor("")
                          setProductFormData({ ...productFormData, color: value })
                        }
                      }}
                    >
                      <SelectTrigger id="edit-color">
                        <SelectValue placeholder="Seleccione un color" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin color</SelectItem>
                        {availableColors.map((color) => (
                          <SelectItem key={color} value={color}>
                            {color}
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">+ Agregar otro color</SelectItem>
                      </SelectContent>
                    </Select>
                    {isCustomColor && (
                      <Input
                        placeholder="Ingrese el nuevo color"
                        value={customColor}
                        onChange={(e) => {
                          setCustomColor(e.target.value)
                          setProductFormData({ ...productFormData, color: e.target.value })
                        }}
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-model">Modelo de Celular (Opcional)</Label>
                    <Select
                      value={isCustomModel ? "custom" : productFormData.model || "none"}
                      onValueChange={(value) => {
                        if (value === "custom") {
                          setIsCustomModel(true)
                          setProductFormData({ ...productFormData, model: customModel })
                        } else if (value === "none") {
                          setIsCustomModel(false)
                          setCustomModel("")
                          setProductFormData({ ...productFormData, model: "" })
                        } else {
                          setIsCustomModel(false)
                          setCustomModel("")
                          setProductFormData({ ...productFormData, model: value })
                        }
                      }}
                    >
                      <SelectTrigger id="edit-model">
                        <SelectValue placeholder="Seleccione un modelo" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        <SelectItem value="none">Sin modelo</SelectItem>
                        {availableModels.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">+ Agregar otro modelo</SelectItem>
                      </SelectContent>
                    </Select>
                    {isCustomModel && (
                      <Input
                        placeholder="Ingrese el nuevo modelo"
                        value={customModel}
                        onChange={(e) => {
                          setCustomModel(e.target.value)
                          setProductFormData({ ...productFormData, model: e.target.value })
                        }}
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-price">Precio Unitario *</Label>
                    <Input
                      id="edit-price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={productFormData.defaultUnitPrice}
                      onChange={(e) => setProductFormData({ ...productFormData, defaultUnitPrice: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-stock">Stock Actual</Label>
                    <Input
                      id="edit-stock"
                      type="number"
                      min="0"
                      value={productFormData.currentStock}
                      onChange={(e) => setProductFormData({ ...productFormData, currentStock: e.target.value })}
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground">
                      Modifique el stock si hubo un error. Se creará un ajuste automático.
                    </p>
                  </div>
                </>
              )}

              {/* FUNDA FLOW - Show variant creation */}
              {!editingProduct && productFormData.category === "Funda" && (
                <>
                  {variants.length === 0 && !showVariantForm && (
                    <div className="rounded-lg border p-4 bg-muted/30 space-y-3">
                      <p className="text-sm text-muted-foreground">
                        ¿Desea crear este producto en múltiples variantes?
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Agregue combinaciones de color y modelo. Cada variante se creará como un producto separado.
                      </p>
                    </div>
                  )}

                  {/* Variant List */}
                  {variants.length > 0 && (
                    <div className="space-y-2">
                      <Label>Variantes a Crear ({variants.length})</Label>
                      <div className="rounded-lg border divide-y max-h-40 overflow-y-auto">
                        {variants.map((variant, index) => (
                          <div key={index} className="flex items-center justify-between p-3 hover:bg-muted/50">
                            <div className="text-sm">
                              <span className="font-medium">{variant.model}</span>
                              <span className="text-muted-foreground"> - {variant.color || "Sin color"}</span>
                              {variant.price && (
                                <span className="text-muted-foreground ml-2">
                                  - $
                                  {Number.parseFloat(variant.price).toLocaleString("es-AR", {
                                    maximumFractionDigits: 0,
                                  })}
                                </span>
                              )}
                              {variant.stock && (
                                <span className="text-muted-foreground ml-1">({variant.stock} unidades)</span>
                              )}
                            </div>
                            <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveVariant(index)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!showVariantForm && (
                    <Button type="button" variant="outline" onClick={() => setShowVariantForm(true)} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      {variants.length === 0 ? "Crear variantes" : "Agregar otra variante"}
                    </Button>
                  )}

                  {/* Add Variant Form */}
                  {showVariantForm && (
                    <div className="rounded-lg border p-4 space-y-4 bg-background">
                      <div className="flex items-center justify-between">
                        <Label className="text-base">
                          {variants.length === 0 ? "Color y Modelo" : "Agregar Variante"}
                        </Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowVariantForm(false)
                            setCurrentVariant({ color: "", model: "" })
                            setVariantPrice("")
                            setVariantStock("0")
                            setIsCustomColor(false)
                            setCustomColor("")
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="variant-color" className="text-sm">
                            Color (opcional)
                          </Label>
                          <Select
                            value={isCustomColor ? "custom" : currentVariant.color || "none"}
                            onValueChange={(value) => {
                              if (value === "custom") {
                                setIsCustomColor(true)
                                setCurrentVariant({ ...currentVariant, color: customColor })
                              } else if (value === "none") {
                                setIsCustomColor(false)
                                setCustomColor("")
                                setCurrentVariant({ ...currentVariant, color: "" })
                              } else {
                                setIsCustomColor(false)
                                setCustomColor("")
                                setCurrentVariant({ ...currentVariant, color: value })
                              }
                            }}
                          >
                            <SelectTrigger id="variant-color">
                              <SelectValue placeholder="Seleccione un color" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sin color</SelectItem>
                              {availableColors.map((color) => (
                                <SelectItem key={color} value={color}>
                                  {color}
                                </SelectItem>
                              ))}
                              <SelectItem value="custom">+ Agregar otro color</SelectItem>
                            </SelectContent>
                          </Select>
                          {isCustomColor && (
                            <Input
                              placeholder="Ingrese el nuevo color"
                              value={customColor}
                              onChange={(e) => {
                                setCustomColor(e.target.value)
                                setCurrentVariant({ ...currentVariant, color: e.target.value })
                              }}
                            />
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="variant-model" className="text-sm">
                            Modelo *
                          </Label>
                          <Select
                            value={isCustomModel ? "custom" : currentVariant.model || "none"}
                            onValueChange={(value) => {
                              if (value === "custom") {
                                setIsCustomModel(true)
                                setCurrentVariant({ ...currentVariant, model: customModel })
                              } else if (value === "none") {
                                setIsCustomModel(false)
                                setCustomModel("")
                                setCurrentVariant({ ...currentVariant, model: "" })
                              } else {
                                setIsCustomModel(false)
                                setCustomModel("")
                                setCurrentVariant({ ...currentVariant, model: value })
                              }
                            }}
                          >
                            <SelectTrigger id="variant-model">
                              <SelectValue placeholder="Seleccione un modelo" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              <SelectItem value="none">Sin modelo</SelectItem>
                              {availableModels.map((model) => (
                                <SelectItem key={model} value={model}>
                                  {model}
                                </SelectItem>
                              ))}
                              <SelectItem value="custom">+ Agregar otro modelo</SelectItem>
                            </SelectContent>
                          </Select>
                          {isCustomModel && (
                            <Input
                              placeholder="Ingrese el nuevo modelo"
                              value={customModel}
                              onChange={(e) => {
                                setCustomModel(e.target.value)
                                setCurrentVariant({ ...currentVariant, model: e.target.value })
                              }}
                            />
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="variant-price" className="text-sm">
                            Precio Unitario *
                          </Label>
                          <Input
                            id="variant-price"
                            type="number"
                            step="0.01"
                            min="0"
                            value={variantPrice}
                            onChange={(e) => setVariantPrice(e.target.value)}
                            placeholder="0.00"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="variant-stock" className="text-sm">
                            Stock Inicial
                          </Label>
                          <Input
                            id="variant-stock"
                            type="number"
                            min="0"
                            value={variantStock}
                            onChange={(e) => setVariantStock(e.target.value)}
                            placeholder="0"
                          />
                        </div>

                        <Button
                          type="button"
                          onClick={handleAddVariant}
                          className="w-full"
                          disabled={!currentVariant.model || !variantPrice}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Agregar a la Lista
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ACCESORIO FLOW - Show individual product fields */}
              {productFormData.category === "Accesorio" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="color">Color (Opcional)</Label>
                    <Select
                      value={isCustomColor ? "custom" : productFormData.color || "none"}
                      onValueChange={(value) => {
                        if (value === "custom") {
                          setIsCustomColor(true)
                          setProductFormData({ ...productFormData, color: customColor })
                        } else if (value === "none") {
                          setIsCustomColor(false)
                          setCustomColor("")
                          setProductFormData({ ...productFormData, color: "" })
                        } else {
                          setIsCustomColor(false)
                          setCustomColor("")
                          setProductFormData({ ...productFormData, color: value })
                        }
                      }}
                    >
                      <SelectTrigger id="color">
                        <SelectValue placeholder="Seleccione un color" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin color</SelectItem>
                        {availableColors.map((color) => (
                          <SelectItem key={color} value={color}>
                            {color}
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">+ Agregar otro color</SelectItem>
                      </SelectContent>
                    </Select>
                    {isCustomColor && (
                      <Input
                        placeholder="Ingrese el nuevo color"
                        value={customColor}
                        onChange={(e) => {
                          setCustomColor(e.target.value)
                          setProductFormData({ ...productFormData, color: e.target.value })
                        }}
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="model">Modelo de Celular (Opcional)</Label>
                    <Select
                      value={isCustomModel ? "custom" : productFormData.model || "none"}
                      onValueChange={(value) => {
                        if (value === "custom") {
                          setIsCustomModel(true)
                          setProductFormData({ ...productFormData, model: customModel })
                        } else if (value === "none") {
                          setIsCustomModel(false)
                          setCustomModel("")
                          setProductFormData({ ...productFormData, model: "" })
                        } else {
                          setIsCustomModel(false)
                          setCustomModel("")
                          setProductFormData({ ...productFormData, model: value })
                        }
                      }}
                    >
                      <SelectTrigger id="model">
                        <SelectValue placeholder="Seleccione un modelo" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        <SelectItem value="none">Sin modelo</SelectItem>
                        {availableModels.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">+ Agregar otro modelo</SelectItem>
                      </SelectContent>
                    </Select>
                    {isCustomModel && (
                      <Input
                        placeholder="Ingrese el nuevo modelo"
                        value={customModel}
                        onChange={(e) => {
                          setCustomModel(e.target.value)
                          setProductFormData({ ...productFormData, model: e.target.value })
                        }}
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price">Precio Unitario *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={productFormData.defaultUnitPrice}
                      onChange={(e) => setProductFormData({ ...productFormData, defaultUnitPrice: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="initial-stock">Stock Inicial</Label>
                    <Input
                      id="initial-stock"
                      type="number"
                      min="0"
                      value={initialStock}
                      onChange={(e) => setInitialStock(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsProductDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingProduct
                  ? "Guardar Cambios"
                  : variants.length > 0
                    ? `Crear ${variants.length} Producto(s)`
                    : "Crear Producto"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Stock</DialogTitle>
            <DialogDescription>Registre el ingreso de mercadería</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleStockSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="stock-product">Producto *</Label>
                <StockProductSearchDropdown
                  products={data?.products || []}
                  value={stockFormData.productId}
                  onChange={(value) => setStockFormData({ ...stockFormData, productId: value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock-quantity">Cantidad *</Label>
                <Input
                  id="stock-quantity"
                  type="number"
                  min="1"
                  value={stockFormData.quantity}
                  onChange={(e) => setStockFormData({ ...stockFormData, quantity: e.target.value })}
                  placeholder="0"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock-date">Fecha</Label>
                <Input
                  id="stock-date"
                  type="date"
                  value={stockFormData.date}
                  onChange={(e) => setStockFormData({ ...stockFormData, date: e.target.value })}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsStockDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                <Plus className="mr-2 h-4 w-4" />
                Agregar Stock
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
