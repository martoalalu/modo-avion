import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { webAppUrl } = await request.json()

    if (!webAppUrl) {
      return NextResponse.json({ error: "webAppUrl is required" }, { status: 400 })
    }

    console.log("[v0] Server: Reading from Google Sheets...")
    console.log("[v0] Server: WebApp URL:", webAppUrl)

    const [productsRes, stockRes, salesRes] = await Promise.all([
      fetch(webAppUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read", sheet: "products" }),
        redirect: "follow",
      }),
      fetch(webAppUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read", sheet: "stockMovements" }),
        redirect: "follow",
      }),
      fetch(webAppUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read", sheet: "sales" }),
        redirect: "follow",
      }),
    ])

    console.log("[v0] Server: Products response:", {
      ok: productsRes.ok,
      status: productsRes.status,
      statusText: productsRes.statusText,
    })
    console.log("[v0] Server: Stock response:", {
      ok: stockRes.ok,
      status: stockRes.status,
      statusText: stockRes.statusText,
    })
    console.log("[v0] Server: Sales response:", {
      ok: salesRes.ok,
      status: salesRes.status,
      statusText: salesRes.statusText,
    })

    if (!productsRes.ok) {
      const errorText = await productsRes.text()
      console.error("[v0] Server: Products sheet failed:", errorText)
      throw new Error(`Failed to read products sheet: ${productsRes.status} ${productsRes.statusText}`)
    }

    if (!stockRes.ok) {
      const errorText = await stockRes.text()
      console.error("[v0] Server: Stock sheet failed:", errorText)
      throw new Error(`Failed to read stockMovements sheet: ${stockRes.status} ${stockRes.statusText}`)
    }

    if (!salesRes.ok) {
      const errorText = await salesRes.text()
      console.error("[v0] Server: Sales sheet failed:", errorText)
      throw new Error(`Failed to read sales sheet: ${salesRes.status} ${salesRes.statusText}`)
    }

    const [productsData, stockData, salesData] = await Promise.all([
      productsRes.json(),
      stockRes.json(),
      salesRes.json(),
    ])

    console.log("[v0] Server: Products data rows:", productsData.values?.length || 0)
    console.log("[v0] Server: Stock data rows:", stockData.values?.length || 0)
    console.log("[v0] Server: Sales data rows:", salesData.values?.length || 0)

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

    console.log("[v0] Server: Successfully read all sheets:", {
      products: products.length,
      stockMovements: stockMovements.length,
      sales: sales.length,
    })

    return NextResponse.json({ products, stockMovements, sales })
  } catch (error) {
    console.error("[v0] Server: Error reading from Google Sheets:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
