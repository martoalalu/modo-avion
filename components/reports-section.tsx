"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChevronDown, ChevronUp, Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react"
import type { AppData, Sale } from "@/lib/types"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { SalesForm } from "@/components/sales-form"
import { getAvailableStock, getLastSaleDate } from "@/lib/storage"

interface ReportsSectionProps {
  data: AppData
  updateData: (data: AppData) => void
}

type SortField = "name" | "stock" | "model"

export function ReportsSection({ data, updateData }: ReportsSectionProps) {
  const [expandedSale, setExpandedSale] = useState<string | null>(null)
  const [isSalesModalOpen, setIsSalesModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingSale, setEditingSale] = useState<Sale | null>(null)
  const [dateFrom, setDateFrom] = useState(() => {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    return sevenDaysAgo.toISOString().split("T")[0]
  })
  const [dateTo, setDateTo] = useState(() => {
    return new Date().toISOString().split("T")[0]
  })
  const [summaryDateFrom, setSummaryDateFrom] = useState(() => {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    return sevenDaysAgo.toISOString().split("T")[0]
  })
  const [summaryDateTo, setSummaryDateTo] = useState(() => {
    return new Date().toISOString().split("T")[0]
  })
  const [searchTerm, setSearchTerm] = useState("")
  const [showLowStockOnly, setShowLowStockOnly] = useState(false)
  const [sortField, setSortField] = useState<SortField>("stock")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [transactionsPage, setTransactionsPage] = useState(1)
  const TRANSACTIONS_PER_PAGE = 10

  const filteredSalesByDay = useMemo(() => {
    const filteredSales = data.sales.filter((sale) => {
      const saleDateOnly = new Date(sale.date)
        .toLocaleDateString("es-AR", {
          timeZone: "America/Argentina/Buenos_Aires",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
        .split("/")
        .reverse()
        .join("-")

      return saleDateOnly >= summaryDateFrom && saleDateOnly <= summaryDateTo
    })

    const grouped = filteredSales.reduce(
      (acc, sale) => {
        const dateOnly = new Date(sale.date)
          .toLocaleDateString("es-AR", {
            timeZone: "America/Argentina/Buenos_Aires",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          })
          .split("/")
          .reverse()
          .join("-")

        if (!acc[dateOnly]) {
          acc[dateOnly] = { date: dateOnly, count: 0, total: 0 }
        }
        acc[dateOnly].count += 1
        acc[dateOnly].total += sale.totalAmount
        return acc
      },
      {} as Record<string, { date: string; count: number; total: number }>,
    )

    return Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date))
  }, [data.sales, summaryDateFrom, summaryDateTo])

  const summaryTotals = useMemo(() => {
    return filteredSalesByDay.reduce(
      (acc, day) => {
        acc.count += day.count
        acc.total += day.total
        return acc
      },
      { count: 0, total: 0 },
    )
  }, [filteredSalesByDay])

  const salesByDay = useMemo(() => {
    const grouped = data.sales.reduce(
      (acc, sale) => {
        const dateOnly = new Date(sale.date)
          .toLocaleDateString("es-AR", {
            timeZone: "America/Argentina/Buenos_Aires",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          })
          .split("/")
          .reverse()
          .join("-")

        if (!acc[dateOnly]) {
          acc[dateOnly] = { date: dateOnly, count: 0, total: 0 }
        }
        acc[dateOnly].count += 1
        acc[dateOnly].total += sale.totalAmount
        return acc
      },
      {} as Record<string, { date: string; count: number; total: number }>,
    )

    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date))
  }, [data.sales])

  const inventory = useMemo(() => {
    return data.products.map((product) => {
      const stock = getAvailableStock(product.id, data)
      const lastSale = getLastSaleDate(product.id, data)

      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        model: product.model,
        stock,
        lastSale,
      }
    })
  }, [data])

  const filteredInventory = useMemo(() => {
    const result = inventory.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesFilter = !showLowStockOnly || item.stock < 10

      return matchesSearch && matchesFilter
    })

    result.sort((a, b) => {
      let comparison = 0

      if (sortField === "name") {
        comparison = a.name.localeCompare(b.name)
      } else if (sortField === "stock") {
        comparison = a.stock - b.stock
      } else if (sortField === "model") {
        const modelA = a.model || ""
        const modelB = b.model || ""
        comparison = modelA.localeCompare(modelB)
      }

      return sortDirection === "asc" ? comparison : -comparison
    })

    return result
  }, [inventory, searchTerm, showLowStockOnly, sortField, sortDirection])

  const filteredSales = useMemo(() => {
    return data.sales.filter((sale) => {
      const saleDateOnly = new Date(sale.date)
        .toLocaleDateString("es-AR", {
          timeZone: "America/Argentina/Buenos_Aires",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
        .split("/")
        .reverse()
        .join("-")

      return saleDateOnly >= dateFrom && saleDateOnly <= dateTo
    })
  }, [data.sales, dateFrom, dateTo])

  const recentSales = useMemo(() => {
    return [...filteredSales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [filteredSales])

  const totalTransactionPages = Math.ceil(recentSales.length / TRANSACTIONS_PER_PAGE)
  const paginatedSales = useMemo(() => {
    const startIndex = (transactionsPage - 1) * TRANSACTIONS_PER_PAGE
    return recentSales.slice(startIndex, startIndex + TRANSACTIONS_PER_PAGE)
  }, [recentSales, transactionsPage])

  useMemo(() => {
    setTransactionsPage(1)
  }, [dateFrom, dateTo])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const getStockColor = (stock: number) => {
    if (stock < 10) return "text-red-600 bg-red-50"
    if (stock <= 20) return "text-orange-600 bg-orange-50"
    return "text-green-600 bg-green-50"
  }

  const handleEditSale = (sale: Sale) => {
    setEditingSale(sale)
    setIsEditModalOpen(true)
  }

  const handleDeleteSale = (saleId: string) => {
    if (confirm("¿Está seguro que desea eliminar esta transacción?")) {
      const updatedSales = data.sales.filter((s) => s.id !== saleId)
      const newData = { ...data, sales: updatedSales }
      updateData(newData)
    }
  }

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case "efectivo":
        return "bg-green-50 text-green-700 border-green-200"
      case "tarjeta":
        return "bg-blue-50 text-blue-700 border-blue-200"
      case "transferencia":
        return "bg-purple-50 text-purple-700 border-purple-200"
      case "qr":
        return "bg-orange-50 text-orange-700 border-orange-200"
      default:
        return "bg-gray-50 text-gray-700 border-gray-200"
    }
  }

  const formatChartDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-")
    return `${day}/${month}`
  }

  const formatChartDateFull = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-")
    return `${day}/${month}/${year}`
  }

  const formatTableDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-")
    return `${day}/${month}/${year}`
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button onClick={() => setIsSalesModalOpen(true)} size="lg">
            <Plus className="mr-2 h-4 w-4" />
            Registrar Venta
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Cantidad de Ventas por Día</CardTitle>
              <CardDescription>Número de transacciones diarias</CardDescription>
            </CardHeader>
            <CardContent>
              {salesByDay.length === 0 ? (
                <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                  No hay datos de ventas para mostrar
                </div>
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={salesByDay}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickFormatter={formatChartDate} />
                      <YAxis />
                      <Tooltip labelFormatter={formatChartDateFull} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        name="Cantidad de Ventas"
                        dot={{ fill: "#3b82f6" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Monto Total por Día</CardTitle>
              <CardDescription>Ingresos diarios totales</CardDescription>
            </CardHeader>
            <CardContent>
              {salesByDay.length === 0 ? (
                <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                  No hay datos de ventas para mostrar
                </div>
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={salesByDay}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickFormatter={formatChartDate} />
                      <YAxis />
                      <Tooltip
                        labelFormatter={formatChartDateFull}
                        formatter={(value: number) => `$${value.toFixed(2)}`}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="total"
                        stroke="#10b981"
                        strokeWidth={2}
                        name="Monto Total"
                        dot={{ fill: "#10b981" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Resumen de Ventas por Día</CardTitle>
                <CardDescription>Cantidad de ventas y monto total por día</CardDescription>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="summary-date-from" className="whitespace-nowrap text-sm">
                    Desde:
                  </Label>
                  <Input
                    id="summary-date-from"
                    type="date"
                    value={summaryDateFrom}
                    onChange={(e) => setSummaryDateFrom(e.target.value)}
                    className="w-full sm:w-auto"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="summary-date-to" className="whitespace-nowrap text-sm">
                    Hasta:
                  </Label>
                  <Input
                    id="summary-date-to"
                    type="date"
                    value={summaryDateTo}
                    onChange={(e) => setSummaryDateTo(e.target.value)}
                    className="w-full sm:w-auto"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Cantidad de Ventas</TableHead>
                    <TableHead className="text-right">Monto Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSalesByDay.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No hay ventas registradas en el período seleccionado
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {filteredSalesByDay.map((day) => (
                        <TableRow key={day.date}>
                          <TableCell className="font-medium">{formatTableDate(day.date)}</TableCell>
                          <TableCell className="text-right">{day.count}</TableCell>
                          <TableCell className="text-right">${day.total.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-right">{summaryTotals.count}</TableCell>
                        <TableCell className="text-right">${summaryTotals.total.toFixed(2)}</TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Transacciones</CardTitle>
                <CardDescription>Ventas registradas filtradas por fecha</CardDescription>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="date-from" className="whitespace-nowrap text-sm">
                    Desde:
                  </Label>
                  <Input
                    id="date-from"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full sm:w-auto"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="date-to" className="whitespace-nowrap text-sm">
                    Hasta:
                  </Label>
                  <Input
                    id="date-to"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full sm:w-auto"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Método de Pago</TableHead>
                    <TableHead className="text-right">Productos</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No hay ventas registradas en el período seleccionado
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedSales.map((sale) => (
                      <>
                        <TableRow key={sale.id}>
                          <TableCell
                            className="cursor-pointer"
                            onClick={() => setExpandedSale(expandedSale === sale.id ? null : sale.id)}
                          >
                            {expandedSale === sale.id ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </TableCell>
                          <TableCell>
                            {new Date(sale.date).toLocaleDateString("es-AR", {
                              timeZone: "America/Argentina/Buenos_Aires",
                            })}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`capitalize ${getPaymentMethodColor(sale.paymentMethod)}`}
                            >
                              {sale.paymentMethod}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{sale.items.length}</TableCell>
                          <TableCell className="text-right font-medium">${sale.totalAmount.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditSale(sale)
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteSale(sale.id)
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {expandedSale === sale.id && (
                          <TableRow>
                            <TableCell colSpan={6} className="bg-muted/20 p-4">
                              <div className="space-y-2">
                                <p className="text-sm font-semibold">Detalle de productos:</p>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Producto</TableHead>
                                      <TableHead className="text-right">Cantidad</TableHead>
                                      <TableHead className="text-right">Precio Unit.</TableHead>
                                      <TableHead className="text-right">Subtotal</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {sale.items.map((item, idx) => (
                                      <TableRow key={idx}>
                                        <TableCell>{item.productName}</TableCell>
                                        <TableCell className="text-right">{item.quantity}</TableCell>
                                        <TableCell className="text-right">${item.unitPrice.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">${item.lineTotal.toFixed(2)}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {totalTransactionPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Mostrando {(transactionsPage - 1) * TRANSACTIONS_PER_PAGE + 1} -{" "}
                  {Math.min(transactionsPage * TRANSACTIONS_PER_PAGE, recentSales.length)} de {recentSales.length}{" "}
                  transacciones
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTransactionsPage((prev) => Math.max(prev - 1, 1))}
                    disabled={transactionsPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    Página {transactionsPage} de {totalTransactionPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTransactionsPage((prev) => Math.min(prev + 1, totalTransactionPages))}
                    disabled={transactionsPage === totalTransactionPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isSalesModalOpen} onOpenChange={setIsSalesModalOpen}>
        <DialogContent className="max-w-full sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Venta</DialogTitle>
            <DialogDescription>Complete los datos de la venta</DialogDescription>
          </DialogHeader>
          <SalesForm data={data} updateData={updateData} onSuccess={() => setIsSalesModalOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-full sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          {editingSale && (
            <SalesForm
              data={data}
              updateData={updateData}
              onSuccess={() => {
                setIsEditModalOpen(false)
                setEditingSale(null)
              }}
              existingSale={editingSale}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
