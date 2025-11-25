"use client"

import { useEffect, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { InventarioSection } from "@/components/inventario-section"
import { ReportsSection } from "@/components/reports-section"
import type { AppData } from "@/lib/types"

const GOOGLE_SHEETS_WEB_APP_URL = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_WEB_APP_URL || ""

export default function InventoryApp() {
  const [data, setData] = useState<AppData>({ products: [], stockMovements: [], sales: [] })
  const [isLoaded, setIsLoaded] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    const initializeData = async () => {
      if (!GOOGLE_SHEETS_WEB_APP_URL) {
        console.error("[v0] NEXT_PUBLIC_GOOGLE_SHEETS_WEB_APP_URL not configured")
        setData({ products: [], stockMovements: [], sales: [] })
        setIsLoaded(true)
        return
      }

      console.log("[v0] Loading data from Google Sheets...")
      setIsSyncing(true)

      try {
        await syncFromGoogleSheets()
      } catch (error) {
        console.error("[v0] Failed to load from Google Sheets:", error)
        setData({ products: [], stockMovements: [], sales: [] })
      }

      setIsSyncing(false)
      setIsLoaded(true)
    }

    initializeData()
  }, [])

  const syncFromGoogleSheets = async () => {
    console.log("[v0] Reading from Google Sheets...")

    try {
      const [productsRes, stockRes, salesRes] = await Promise.all([
        fetch(`${GOOGLE_SHEETS_WEB_APP_URL}?action=read&sheet=products`, {
          method: "GET",
          redirect: "follow",
        }),
        fetch(`${GOOGLE_SHEETS_WEB_APP_URL}?action=read&sheet=stockMovements`, {
          method: "GET",
          redirect: "follow",
        }),
        fetch(`${GOOGLE_SHEETS_WEB_APP_URL}?action=read&sheet=sales`, {
          method: "GET",
          redirect: "follow",
        }),
      ])

      if (!productsRes.ok || !stockRes.ok || !salesRes.ok) {
        throw new Error("Failed to read from one or more Google Sheets")
      }

      const [productsData, stockData, salesData] = await Promise.all([
        productsRes.json(),
        stockRes.json(),
        salesRes.json(),
      ])

      // Parse the data from sheets format to app format
      const products = (productsData.values || []).slice(1).map((row: any[]) => ({
        id: row[0],
        name: row[1],
        sku: row[2] || undefined,
        category: row[3],
        model: row[4] || "",
        color: row[5] || "",
        defaultUnitPrice: Number.parseFloat(row[6]) || 0,
        createdAt: row[7],
      }))

      const stockMovements = (stockData.values || []).slice(1).map((row: any[]) => ({
        id: row[0],
        productId: row[1],
        quantity: Number.parseInt(row[2]) || 0,
        type: "in" as const,
        date: row[3],
        createdAt: row[4],
      }))

      const sales = (salesData.values || []).slice(1).map((row: any[]) => ({
        id: row[0],
        date: row[1],
        paymentMethod: row[2],
        totalAmount: Number.parseFloat(row[3]) || 0,
        items: JSON.parse(row[4] || "[]"),
      }))

      console.log("[v0] ✓ Synced from Google Sheets:", {
        products: products.length,
        sales: sales.length,
        stockMovements: stockMovements.length,
      })

      setData({ products, stockMovements, sales })
    } catch (error) {
      console.error("[v0] ✗ Sync error:", error)
      throw error
    }
  }

  const updateData = async (newData: AppData) => {
    setData(newData)

    if (!GOOGLE_SHEETS_WEB_APP_URL) {
      console.warn("[v0] Cannot sync to Google Sheets - URL not configured")
      return
    }

    // Sync to Google Sheets in background
    syncToGoogleSheets(newData).catch((error) => {
      console.error("[v0] Failed to sync to Google Sheets:", error)
    })
  }

  const syncToGoogleSheets = async (appData: AppData) => {
    console.log("[v0] Syncing to Google Sheets...")

    try {
      // Transform data to sheets format
      const productsData = [
        ["id", "name", "sku", "category", "model", "color", "defaultUnitPrice", "createdAt"],
        ...appData.products.map((p) => [
          p.id,
          p.name,
          p.sku || "",
          p.category,
          p.model || "",
          p.color || "",
          p.defaultUnitPrice,
          p.createdAt,
        ]),
      ]

      const stockData = [
        ["id", "productId", "quantity", "date", "createdAt"],
        ...appData.stockMovements.map((s) => [s.id, s.productId, s.quantity, s.date, s.createdAt]),
      ]

      const salesData = [
        ["id", "date", "paymentMethod", "totalAmount", "items"],
        ...appData.sales.map((s) => [s.id, s.date, s.paymentMethod, s.totalAmount, JSON.stringify(s.items)]),
      ]

      await Promise.all([
        fetch(GOOGLE_SHEETS_WEB_APP_URL, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "write", sheet: "products", values: productsData }),
        }),
        fetch(GOOGLE_SHEETS_WEB_APP_URL, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "write", sheet: "stockMovements", values: stockData }),
        }),
        fetch(GOOGLE_SHEETS_WEB_APP_URL, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "write", sheet: "sales", values: salesData }),
        }),
      ])

      console.log("[v0] ✓ Data synced to Google Sheets successfully")
    } catch (error) {
      console.error("[v0] ✗ Failed to sync:", error)
      throw error
    }
  }

  const handleManualSync = async () => {
    setIsSyncing(true)
    try {
      await syncFromGoogleSheets()
    } catch (error) {
      console.error("[v0] Manual sync failed:", error)
    }
    setIsSyncing(false)
  }

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">{isSyncing ? "Sincronizando datos..." : "Cargando..."}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <img
                src="https://d1a9qnv764bsoo.cloudfront.net/stores/679/830/themes/common/logo-737450806-1746453947-56db25598c299fcf4928c6a991134bb31746453947-1024-1024.webp?w=1920"
                alt="Logo"
                className="h-10 w-auto object-contain sm:h-12"
              />
              <div>
                <h1 className="text-xl font-bold text-foreground sm:text-3xl">Sistema de Gestión</h1>
                <p className="text-sm text-muted-foreground sm:mt-1">Ventas e Inventario</p>
              </div>
            </div>

            {GOOGLE_SHEETS_WEB_APP_URL && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="gap-2 bg-transparent"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Sincronizar</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 sm:py-8">
        <Tabs defaultValue="reportes" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid">
            <TabsTrigger value="reportes">Ventas</TabsTrigger>
            <TabsTrigger value="inventario">Inventario</TabsTrigger>
          </TabsList>

          <TabsContent value="reportes" className="space-y-4">
            <ReportsSection data={data} updateData={updateData} />
          </TabsContent>

          <TabsContent value="inventario" className="space-y-4">
            <InventarioSection data={data} updateData={updateData} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
