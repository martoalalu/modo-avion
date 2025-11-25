'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { generateId, getAvailableStock } from '@/lib/storage';
import type { AppData, Sale, SaleItem } from '@/lib/types';

interface SalesSectionProps {
  data: AppData;
  updateData: (data: AppData) => void;
}

interface SaleItemForm {
  productId: string;
  quantity: string;
  unitPrice: string;
}

export function SalesSection({ data, updateData }: SalesSectionProps) {
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [items, setItems] = useState<SaleItemForm[]>([
    { productId: '', quantity: '', unitPrice: '' },
  ]);

  const addItem = () => {
    setItems([...items, { productId: '', quantity: '', unitPrice: '' }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof SaleItemForm, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Autocompletar precio si se selecciona un producto
    if (field === 'productId' && value) {
      const product = data.products.find(p => p.id === value);
      if (product) {
        newItems[index].unitPrice = product.defaultUnitPrice.toString();
      }
    }
    
    setItems(newItems);
  };

  const calculateLineTotal = (item: SaleItemForm): number => {
    const quantity = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    return quantity * price;
  };

  const calculateTotal = (): number => {
    return items.reduce((sum, item) => sum + calculateLineTotal(item), 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    const validItems = items.filter(item => 
      item.productId && 
      item.quantity && 
      parseFloat(item.quantity) > 0 &&
      item.unitPrice &&
      parseFloat(item.unitPrice) >= 0
    );

    if (validItems.length === 0) {
      alert('Por favor agregue al menos un producto válido a la venta');
      return;
    }

    // Verificar stock disponible
    for (const item of validItems) {
      const available = getAvailableStock(item.productId, data);
      const requested = parseInt(item.quantity);
      
      if (requested > available) {
        const product = data.products.find(p => p.id === item.productId);
        alert(`Stock insuficiente para ${product?.name}. Disponible: ${available}, Solicitado: ${requested}`);
        return;
      }
    }

    const saleItems: SaleItem[] = validItems.map(item => {
      const product = data.products.find(p => p.id === item.productId);
      const quantity = parseInt(item.quantity);
      const unitPrice = parseFloat(item.unitPrice);
      
      return {
        productId: item.productId,
        productName: product?.name || '',
        quantity,
        unitPrice,
        lineTotal: quantity * unitPrice,
      };
    });

    const newSale: Sale = {
      id: generateId(),
      date: saleDate,
      paymentMethod,
      totalAmount: calculateTotal(),
      items: saleItems,
    };

    updateData({
      ...data,
      sales: [...data.sales, newSale],
    });

    // Reset form
    setItems([{ productId: '', quantity: '', unitPrice: '' }]);
    setSaleDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('efectivo');
    
    alert('Venta registrada con éxito');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar Venta</CardTitle>
        <CardDescription>Complete los datos de la venta</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sale-date">Fecha</Label>
              <Input
                id="sale-date"
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-method">Método de Pago</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger id="payment-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="qr">QR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Productos</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar Producto
              </Button>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead className="w-[120px]">Cantidad</TableHead>
                    <TableHead className="w-[140px]">Precio Unit.</TableHead>
                    <TableHead className="w-[120px] text-right">Subtotal</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => {
                    const availableStock = item.productId 
                      ? getAvailableStock(item.productId, data)
                      : 0;
                    const selectedProduct = item.productId 
                      ? data.products.find(p => p.id === item.productId)
                      : null;
                    
                    return (
                      <TableRow key={index}>
                        <TableCell>
                          <Select
                            value={item.productId}
                            onValueChange={(value) => updateItem(index, 'productId', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {data.products.map((product) => {
                                const stock = getAvailableStock(product.id, data);
                                return (
                                  <SelectItem key={product.id} value={product.id}>
                                    {product.name} (Stock: {stock})
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {selectedProduct?.model || '—'}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            max={availableStock}
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                            placeholder="0.00"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${calculateLineTotal(item).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(index)}
                            disabled={items.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-4">
            <span className="text-lg font-semibold">Total</span>
            <span className="text-2xl font-bold">${calculateTotal().toFixed(2)}</span>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setItems([{ productId: '', quantity: '', unitPrice: '' }]);
                setSaleDate(new Date().toISOString().split('T')[0]);
                setPaymentMethod('efectivo');
              }}
            >
              Limpiar
            </Button>
            <Button type="submit">Registrar Venta</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
