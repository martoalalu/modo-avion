// Google Sheets integration via Apps Script Web App

export interface GoogleSheetsConfig {
  webAppUrl: string // Apps Script Web App deployment URL
}

// Helper to convert data to Google Sheets format
export function productToSheetRow(product: any): any[] {
  return [
    product.id,
    product.name,
    product.sku || "",
    product.category,
    product.model || "",
    product.color || "",
    product.defaultUnitPrice,
    product.createdAt,
  ]
}

export function stockMovementToSheetRow(movement: any): any[] {
  return [movement.id, movement.productId, movement.quantity, movement.date, movement.createdAt]
}

export function saleToSheetRow(sale: any): any[] {
  return [sale.id, sale.date, sale.paymentMethod, sale.totalAmount, JSON.stringify(sale.items)]
}

// Read data from Google Sheets via Apps Script
export async function readFromGoogleSheets(config: GoogleSheetsConfig, sheetName: string): Promise<any[][]> {
  try {
    const url = `${config.webAppUrl}?action=read&sheet=${sheetName}`
    console.log("[v0] Reading from Google Sheets:", url)

    const response = await fetch(url)
    const responseText = await response.text()

    console.log("[v0] Response status:", response.status)
    console.log("[v0] Response text:", responseText)

    if (!response.ok) {
      throw new Error(`Failed to read from Google Sheets (${response.status}): ${responseText}`)
    }

    // Try to parse as JSON
    let data
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      throw new Error(`Invalid JSON response from Apps Script: ${responseText}`)
    }

    // Check if data has the expected structure
    if (!data || typeof data !== "object") {
      throw new Error(`Unexpected response format: ${JSON.stringify(data)}`)
    }

    return data.values || []
  } catch (error: any) {
    console.error("[v0] Error reading from Google Sheets:", error)
    throw error
  }
}

// Write data to Google Sheets via Apps Script
export async function writeToGoogleSheets(
  config: GoogleSheetsConfig,
  sheetName: string,
  values: any[][],
): Promise<void> {
  try {
    const url = config.webAppUrl
    console.log("[v0] Writing to Google Sheets:", sheetName, "rows:", values.length)

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "write",
        sheet: sheetName,
        values,
      }),
    })

    const responseText = await response.text()
    console.log("[v0] Write response status:", response.status)
    console.log("[v0] Write response text:", responseText)

    if (!response.ok) {
      throw new Error(`Failed to write to Google Sheets (${response.status}): ${responseText}`)
    }

    // Try to parse response
    try {
      const data = JSON.parse(responseText)
      if (!data.success) {
        throw new Error(`Write operation failed: ${JSON.stringify(data)}`)
      }
    } catch (e) {
      // If not JSON, check if it's a success message
      if (!responseText.toLowerCase().includes("success")) {
        throw new Error(`Unexpected write response: ${responseText}`)
      }
    }
  } catch (error: any) {
    console.error("[v0] Error writing to Google Sheets:", error)
    throw error
  }
}
