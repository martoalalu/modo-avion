import { type NextRequest, NextResponse } from "next/server"
import { productToSheetRow, stockMovementToSheetRow, saleToSheetRow } from "@/lib/google-sheets"
import type { AppData } from "@/lib/types"

export async function POST(request: NextRequest) {
  try {
    const { webAppUrl, data } = (await request.json()) as { webAppUrl: string; data: AppData }

    if (!webAppUrl) {
      return NextResponse.json({ error: "Web App URL is required" }, { status: 400 })
    }

    if (!webAppUrl.includes("script.google.com")) {
      return NextResponse.json(
        {
          error: "Invalid Apps Script URL. Should be like: https://script.google.com/macros/s/.../exec",
        },
        { status: 400 },
      )
    }

    console.log("[v0] Server: Syncing to Google Sheets...")

    const productsData = [
      ["id", "name", "sku", "category", "model", "color", "defaultUnitPrice", "createdAt"],
      ...data.products.map(productToSheetRow),
    ]

    const stockData = [
      ["id", "productId", "quantity", "date", "createdAt"],
      ...data.stockMovements.map(stockMovementToSheetRow),
    ]

    const salesData = [["id", "date", "paymentMethod", "totalAmount", "items"], ...data.sales.map(saleToSheetRow)]

    const results = await Promise.allSettled([
      fetch(webAppUrl, {
        method: "POST",
        redirect: "follow",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheet: "products", values: productsData }),
      }),
      fetch(webAppUrl, {
        method: "POST",
        redirect: "follow",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheet: "stockMovements", values: stockData }),
      }),
      fetch(webAppUrl, {
        method: "POST",
        redirect: "follow",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheet: "sales", values: salesData }),
      }),
    ])

    const failures = results.filter((r) => r.status === "rejected")
    if (failures.length > 0) {
      console.error("[v0] Server: Some syncs failed:", failures)
      return NextResponse.json(
        {
          error: "Some sheets failed to sync",
          details: failures,
        },
        { status: 500 },
      )
    }

    console.log("[v0] Server: ✓ All sheets synced successfully")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Server: Sync error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
