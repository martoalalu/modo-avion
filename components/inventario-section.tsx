"use client"

import type React from "react"

import { useState, useMemo, useEffect } from "react"
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
import { Plus, Pencil, Trash2, ArrowUpDown, X } from "lucide-react"
import { generateId, getAvailableStock, getLastSaleDate, generateSKU } from "@/lib/storage"
import type {
  Product,
  StockMovement,
  InventarioSectionProps,
  SortField,
  SortDirection,
  ProductVariant,
} from "@/lib/types"
import { Badge } from "@/components/ui/badge" // Import Badge component
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const PRELOADE_IPHONE_MODELS = [
  "16 PRO MAX",
  "16 PRO",
  "16",
  "15 PRO MAX",
  "15 PRO",
  "15",
  "14 PRO MAX",
  "14 PRO",
  "14",
  "13",
  "13 PRO MAX",
  "13 PRO",
  "11",
  "12 PRO MAX",
  "XR",
  "7/8/SE"
]

export function InventarioSection({ data, updateData }: InventarioSectionProps) {
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false)
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterModel, setFilterModel] = useState<string[]>([])
  const [filterStock, setFilterStock] = useState<string[]>([])
  const [filterCategory, setFilterCategory] = useState("all")
  const [filterColor, setFilterColor] = useState<string[]>([])
  const [sortField, setSortField] = useState<SortField>("stock")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

  const [productFormData, setProductFormData] = useState({
    name: "",
    sku: "",
    category: "",
    model: "",
    color: "",
    defaultUnitPrice: "",
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

  // Removed unused states: selectedColors, selectedModels
  // const [selectedColors, setSelectedColors] = useState<string[]>([])
  // const [selectedModels, setSelectedModels] = useState<string[]>([])

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

      return matchesSearch && matchesModel && matchesCategory && matchesColor && matchesStockFilter
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
        comparison = modelA.localeCompare(modelB)
      } else if (sortField === "unitPrice") {
        comparison = a.defaultUnitPrice - b.defaultUnitPrice
      } else if (sortField === "color") {
        comparison = a.color.localeCompare(b.color)
      }

      return sortDirection === "asc" ? comparison : -comparison
    })

    return result
  }, [data, searchTerm, filterModel, filterCategory, filterColor, filterStock, sortField, sortDirection])

  const filteredStockProducts = useMemo(() => {
    if (!stockProductSearch.trim()) return data.products

    const search = stockProductSearch.toLowerCase()
    return data.products.filter(
      (product) =>
        product.name.toLowerCase().includes(search) ||
        product.color?.toLowerCase().includes(search) ||
        product.model?.toLowerCase().includes(search) ||
        product.sku?.toLowerCase().includes(search),
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
    setProductFormData({ name: "", sku: "", category: "", model: "", color: "", defaultUnitPrice: "" })
    setIsCustomModel(false)
    setCustomModel("")
    setVariants([])
    setCurrentVariant({ color: "", model: "" })
    setIsCustomColor(false)
    setCustomColor("")
    // Reset variant-specific price and stock when opening dialog
    setVariantPrice("")
    setVariantStock("0")
    // Reset variant form visibility and related states
    setShowVariantForm(false)
    setIsProductDialogOpen(true)
    setInitialStock("0")
  }

  const openEditProductDialog = (product: Product) => {
    setEditingProduct(product)
    setProductFormData({
      name: product.name,
      sku: product.sku || "",
      category: product.category || "",
      model: product.model || "",
      color: product.color || "",
      defaultUnitPrice: product.defaultUnitPrice.toString(),
    })
    setIsCustomModel(false)
    setCustomModel("")
    setVariants([])
    setCurrentVariant({ color: "", model: "" })
    setIsCustomColor(false)
    setCustomColor("")
    // Reset variant-specific price and stock when opening dialog
    setVariantPrice("")
    setVariantStock("0")
    // Reset variant form visibility and related states
    setShowVariantForm(false)
    setIsProductDialogOpen(true)
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

    // Check if variant already exists (consider empty color as valid)
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
              category: productFormData.category,
              model: productFormData.model,
              color: productFormData.color,
              defaultUnitPrice: Number.parseFloat(productFormData.defaultUnitPrice),
            }
          : p,
      )
      updateData({ ...data, products: updatedProducts })
    } else {
      // Creating new product(s)
      if (variants.length > 0) {
        const newProducts: Product[] = []
        const newStockMovements: StockMovement[] = []

        for (const variant of variants) {
          const newProduct: Product = {
            id: `product-${Date.now()}-${Math.random()}`,
            name: productFormData.name,
            sku: generateSKU({ ...data, products: [...data.products, ...newProducts] }),
            category: productFormData.category,
            model: variant.model,
            color: variant.color || "",
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
        // Creating single product without variants
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
          model: productFormData.model,
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
    setProductFormData({ name: "", sku: "", category: "", model: "", color: "", defaultUnitPrice: "" })
    setIsCustomModel(false)
    setCustomModel("")
    setVariants([])
    setCurrentVariant({ color: "", model: "" })
    setIsCustomColor(false)
    setCustomColor("")
    // Reset variant-specific price and stock after submit
    setVariantPrice("")
    setVariantStock("0")
    // Reset variant form visibility and related states
    setShowVariantForm(false)
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
    if (selectedIds.size === filteredProducts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredProducts.map((item) => item.id)))
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
    setIsCustomModel(false)
    setCustomModel("")
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
  }

  // Removed unused functions: toggleColor, toggleModel
  // const toggleColor = (color: string) => {
  //   setSelectedColors((prev) => (prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]))
  // }

  // const toggleModel = (model: string) => {
  //   setSelectedModels((prev) => (prev.includes(model) ? prev.filter((m) => m !== model) : [...prev, model]))
  // }

  const toggleFilter = (currentFilters: string[], value: string) => {
    if (currentFilters.includes(value)) {
      return currentFilters.filter((v) => v !== value)
    } else {
      return [...currentFilters, value]
    }
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
      {/* </CHANGE> */}

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
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-4 w-4 rounded border ${
                          filterColor.includes(color) ? "bg-primary border-primary" : "border-input"
                        }`}
                      >
                        {filterColor.includes(color) && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-4 w-4 text-primary-foreground"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                      <span>{color}</span>
                    </div>
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
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-4 w-4 rounded border ${
                          filterModel.includes(model) ? "bg-primary border-primary" : "border-input"
                        }`}
                      >
                        {filterModel.includes(model) && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-4 w-4 text-primary-foreground"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                      <span>{model}</span>
                    </div>
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
                    ? "Todo el stock"
                    : `${filterStock.length} nivel${filterStock.length > 1 ? "es" : ""}`}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                {filterStock.length > 0 && (
                  <>
                    <DropdownMenuItem onClick={() => setFilterStock([])}>Limpiar filtro</DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {[
                  { value: "no-stock", label: "Sin stock (0)" },
                  { value: "critical", label: "Stock crítico (1-5)" },
                  { value: "low", label: "Stock bajo (6-10)" },
                  { value: "normal", label: "Stock normal (> 10)" },
                ].map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={(e) => {
                      e.preventDefault()
                      setFilterStock(toggleFilter(filterStock, option.value))
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-4 w-4 rounded border ${
                          filterStock.includes(option.value) ? "bg-primary border-primary" : "border-input"
                        }`}
                      >
                        {filterStock.includes(option.value) && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-4 w-4 text-primary-foreground"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                      <span>{option.label}</span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={selectedIds.size === filteredProducts.length && filteredProducts.length > 0}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Seleccionar todos"
                  />
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort("name")}>
                    Producto
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Color</TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort("model")}>
                    Modelo
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" size="sm" className="-mr-3 h-8" onClick={() => handleSort("unitPrice")}>
                    Precio Unitario
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" size="sm" className="-mr-3 h-8" onClick={() => handleSort("stock")}>
                    Stock Disponible
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">Última Venta</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No se encontraron productos
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => {
                  const stock = getAvailableStock(product.id, data)
                  const lastSale = getLastSaleDate(product.id, data)

                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(product.id)}
                          onCheckedChange={() => toggleSelectRow(product.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {product.name}
                          <Badge
                            variant="outline"
                            className={
                              product.category === "Funda"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-violet-50 text-violet-700 border-violet-200"
                            }
                          >
                            {product.category}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{product.color || "—"}</TableCell>
                      <TableCell>{product.model || "—"}</TableCell>
                      <TableCell className="text-right font-medium">
                        ${product.defaultUnitPrice.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`inline-flex items-center rounded-md px-2.5 py-1 text-sm font-semibold ${getStockColor(stock)}`}
                        >
                          {stock}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {lastSale ? new Date(lastSale).toLocaleDateString("es-AR") : "Sin ventas"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEditProductDialog(product)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteProduct(product.id)}>
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

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-red-100 border border-red-200"></div>
            <span className="text-muted-foreground">Sin stock (0)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-orange-100 border border-orange-200"></div>
            <span className="text-muted-foreground">Stock crítico (1-5)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-yellow-100 border border-yellow-200"></div>
            <span className="text-muted-foreground">Stock bajo (6-10)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-green-100 border border-green-200"></div>
            <span className="text-muted-foreground">Stock normal (&gt; 10)</span>
          </div>
        </div>
      </div>

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
                  placeholder="Ej: Black Airplane"
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
                            value={isCustomColor ? "custom" : currentVariant.color}
                            onValueChange={(value) => {
                              if (value === "custom") {
                                setIsCustomColor(true)
                                setCurrentVariant({ ...currentVariant, color: customColor })
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
                            value={isCustomModel ? "custom" : currentVariant.model}
                            onValueChange={(value) => {
                              if (value === "custom") {
                                setIsCustomModel(true)
                                setCurrentVariant({ ...currentVariant, model: customModel })
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
                      value={isCustomColor ? "custom" : productFormData.color}
                      onValueChange={(value) => {
                        if (value === "custom") {
                          setIsCustomColor(true)
                          setProductFormData({ ...productFormData, color: customColor })
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
                      value={productFormData.model}
                      onValueChange={(value) => setProductFormData({ ...productFormData, model: value })}
                    >
                      <SelectTrigger id="model">
                        <SelectValue placeholder="Seleccione un modelo" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {availableModels.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                <Input
                  placeholder="Buscar producto por nombre, color, modelo..."
                  value={stockProductSearch}
                  onChange={(e) => setStockProductSearch(e.target.value)}
                  className="mb-2"
                />
                <Select
                  value={stockFormData.productId}
                  onValueChange={(value) => setStockFormData({ ...stockFormData, productId: value })}
                >
                  <SelectTrigger id="stock-product">
                    <SelectValue placeholder="Seleccione un producto" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {filteredStockProducts.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} {product.color ? `- ${product.color}` : ""}{" "}
                        {product.model ? `- ${product.model}` : ""}
                      </SelectItem>
                    ))}
                    {filteredStockProducts.length === 0 && (
                      <div className="p-2 text-sm text-muted-foreground text-center">No se encontraron productos</div>
                    )}
                  </SelectContent>
                </Select>
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
