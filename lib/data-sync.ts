import type { AppData, Product, StockMovement, Sale } from './types';

export async function fetchCSVData(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch CSV: ${response.statusText}`);
  }
  return response.text();
}

export function parseProductsCSV(csv: string): Product[] {
  const lines = csv.trim().split('\n');
  const headers = lines[0].split(',');
  
  return lines.slice(1).map(line => {
    const values = line.split(',');
    return {
      id: values[0],
      name: values[1],
      sku: values[2] || undefined,
      category: values[3] as 'Funda' | 'Accesorio' | '',
      model: values[4] || '',
      color: values[5] || '',
      defaultUnitPrice: parseFloat(values[6]) || 0,
      createdAt: values[7] || new Date().toISOString(),
    };
  });
}

export function parseStockMovementsCSV(csv: string): StockMovement[] {
  const lines = csv.trim().split('\n');
  
  return lines.slice(1).map(line => {
    const values = line.split(',');
    return {
      id: values[0],
      productId: values[1],
      quantity: parseInt(values[2]) || 0,
      type: 'in' as const,
      date: values[3],
      createdAt: values[4] || new Date().toISOString(),
    };
  });
}

export function parseSalesCSV(csv: string): Sale[] {
  const lines = csv.trim().split('\n');
  
  return lines.slice(1).map(line => {
    const values = line.split(',');
    return {
      id: values[0],
      date: values[1],
      paymentMethod: values[2],
      totalAmount: parseFloat(values[3]) || 0,
      items: JSON.parse(values[4] || '[]'),
    };
  });
}

export async function syncFromGoogleSheets(
  productsUrl: string,
  stockMovementsUrl: string,
  salesUrl: string
): Promise<AppData> {
  try {
    const [productsCSV, stockCSV, salesCSV] = await Promise.all([
      fetchCSVData(productsUrl),
      fetchCSVData(stockMovementsUrl),
      fetchCSVData(salesUrl),
    ]);

    return {
      products: parseProductsCSV(productsCSV),
      stockMovements: parseStockMovementsCSV(stockCSV),
      sales: parseSalesCSV(salesCSV),
    };
  } catch (error) {
    console.error('Error syncing from Google Sheets:', error);
    throw error;
  }
}
