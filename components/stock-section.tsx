'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus } from 'lucide-react';
import { generateId } from '@/lib/storage';
import type { AppData, StockMovement } from '@/lib/types';

interface StockSectionProps {
  data: AppData;
  updateData: (data: AppData) => void;
}

export function StockSection({ data, updateData }: StockSectionProps) {
  const [formData, setFormData] = useState({
    productId: '',
    quantity: '',
    date: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.productId || !formData.quantity || parseFloat(formData.quantity) <= 0) {
      alert('Por favor complete todos los campos correctamente');
      return;
    }

    const newStockMovement: StockMovement = {
      id: generateId(),
      productId: formData.productId,
      quantity: parseInt(formData.quantity),
      date: formData.date,
    };

    updateData({
      ...data,
      stockMovements: [...data.stockMovements, newStockMovement],
    });

    setFormData({
      productId: '',
      quantity: '',
      date: new Date().toISOString().split('T')[0],
    });
  };

  const recentMovements = [...data.stockMovements]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 20);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Agregar Stock</CardTitle>
          <CardDescription>Registre el ingreso de mercadería</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="product">Producto *</Label>
                <Select
                  value={formData.productId}
                  onValueChange={(value) => setFormData({ ...formData, productId: value })}
                >
                  <SelectTrigger id="product">
                    <SelectValue placeholder="Seleccione un producto" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Cantidad *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="0"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Fecha</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div className="flex items-end">
                <Button type="submit" className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Stock
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Movimientos Recientes</CardTitle>
          <CardDescription>Últimos 20 ingresos de stock</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentMovements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No hay movimientos registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  recentMovements.map((movement) => {
                    const product = data.products.find((p) => p.id === movement.productId);
                    return (
                      <TableRow key={movement.id}>
                        <TableCell>
                          {new Date(movement.date).toLocaleDateString('es-AR')}
                        </TableCell>
                        <TableCell>{product?.name || 'Producto eliminado'}</TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          +{movement.quantity}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
