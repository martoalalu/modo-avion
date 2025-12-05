"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, ChevronLeft, ChevronRight } from "lucide-react"
import type { AppData } from "@/lib/types"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { SalesForm } from "./sales-form"

interface ReportsSectionProps {
  data: AppData
  onSaleComplete: () => void
}

type SortField = "date" | "product" | "quantity" | "amount"
type SortDirection = "asc" | "desc"

export function ReportsSection({ data, onSaleComplete }: ReportsSectionProps) {
  const [isSalesModalOpen, setIsSalesModalOpen] = useState(false)
  const [transactionsPage, setTransactionsPage] = useState(1)
  const TRANSACTIONS_PER_PAGE = 10

  const [dateFrom, setDateFrom] = useState(() => {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    return sevenDaysAgo.toISOString().split("T")[0]
  })
  const [dateTo, setDateTo] = useState(() => {
    return new Date().toISOString().split("T")[0]
  })
  const [searchTerm, setSearchTerm] = useState("")

  const [sortField, setSortField] = useState<SortField>("date")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

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

      return saleDateOnly >= dateFrom && saleDateOnly <= dateTo
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
  }, [data.sales, dateFrom, dateTo])

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

      return saleDateOnly >= dateFrom && saleDateOnly <= dateTo
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

    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date))
  }, [data.sales, dateFrom, dateTo])

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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-4">
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
                        formatter={(value: number) => `$${value.toLocaleString("es-AR")}`}
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

        {/* Resumen de Ventas por Día table - removed its own date filter */}
        <Card>
          <CardHeader>
            <CardTitle>Resumen de Ventas por Día</CardTitle>
            <CardDescription>Cantidad y monto total de ventas agrupadas por fecha</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
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
                        No hay ventas en el período seleccionado
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {filteredSalesByDay.map((day) => (
                        <TableRow key={day.date}>
                          <TableCell>{formatTableDate(day.date)}</TableCell>
                          <TableCell className="text-right">{day.count}</TableCell>
                          <TableCell className="text-right">${day.total.toLocaleString("es-AR")}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-medium">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-right">{summaryTotals.count}</TableCell>
                        <TableCell className="text-right">${summaryTotals.total.toLocaleString("es-AR")}</TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Transacciones section - removed its own date filter */}
        <Card>
          <CardHeader>
            <CardTitle>Transacciones</CardTitle>
            <CardDescription>Historial de ventas realizadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Input
                placeholder="Buscar por producto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
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
                <TableBody>{/* Placeholder for sales table rows */}</TableBody>
              </Table>
            </div>

            {data.sales.length > TRANSACTIONS_PER_PAGE && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Mostrando {(transactionsPage - 1) * TRANSACTIONS_PER_PAGE + 1} -{" "}
                  {Math.min(transactionsPage * TRANSACTIONS_PER_PAGE, data.sales.length)} de {data.sales.length}{" "}
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
                    Página {transactionsPage} de {Math.ceil(data.sales.length / TRANSACTIONS_PER_PAGE)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setTransactionsPage((prev) =>
                        Math.min(prev + 1, Math.ceil(data.sales.length / TRANSACTIONS_PER_PAGE)),
                      )
                    }
                    disabled={transactionsPage === Math.ceil(data.sales.length / TRANSACTIONS_PER_PAGE)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* SalesForm dialog */}
      <Dialog open={isSalesModalOpen} onOpenChange={setIsSalesModalOpen}>
        <DialogContent className="max-w-full sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Venta</DialogTitle>
            <DialogDescription>Complete los datos de la venta</DialogDescription>
          </DialogHeader>
          <SalesForm data={data} onSaleComplete={onSaleComplete} />
        </DialogContent>
      </Dialog>
    </>
  )
}
