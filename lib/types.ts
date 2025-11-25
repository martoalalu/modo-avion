export interface Product {
  id: string;
  name: string;
  baseName?: string;
  color?: string; // Made color optional
  model?: string;
  sku?: string;
  category: 'Funda' | 'Accesorio' | ''; // Changed to dropdown values
  defaultUnitPrice: number;
  createdAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  quantity: number;
  date: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Sale {
  id: string;
  date: string;
  paymentMethod: string;
  totalAmount: number;
  items: SaleItem[];
}

export interface AppData {
  products: Product[];
  stockMovements: StockMovement[];
  sales: Sale[];
}
