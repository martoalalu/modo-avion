'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { generateId } from '@/lib/storage';
import type { AppData, Product } from '@/lib/types';

interface ProductsSectionProps {
  data: AppData;
  updateData: (data: AppData) => void;
}

export function ProductsSection({ data, updateData }: ProductsSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    model: '',
    defaultUnitPrice: '',
  });

  const filteredProducts = data.products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const openCreateDialog = () => {
    setEditingProduct(null);
    setFormData({ name: '', sku: '', category: '', model: '', defaultUnitPrice: '' });
    setIsDialogOpen(true);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku || '',
      category: product.category || '',
      model: product.model || '',
      defaultUnitPrice: product.defaultUnitPrice.toString(),
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.defaultUnitPrice) {
      alert('Por favor complete los campos obligatorios');
      return;
    }

    if (editingProduct) {
      // Editar producto existente
      const updatedProducts = data.products.map(p =>
        p.id === editingProduct.id
          ? {
              ...p,
              name: formData.name,
              sku: formData.sku,
              category: formData.category,
              model: formData.model,
              defaultUnitPrice: parseFloat(formData.defaultUnitPrice),
            }
          : p
      );
      updateData({ ...data, products: updatedProducts });
    } else {
      // Crear nuevo producto
      const newProduct: Product = {
        id: generateId(),
        name: formData.name,
        sku: formData.sku,
        category: formData.category,
        model: formData.model,
        defaultUnitPrice: parseFloat(formData.defaultUnitPrice),
        createdAt: new Date().toISOString(),
      };
      updateData({ ...data, products: [...data.products, newProduct] });
    }

    setIsDialogOpen(false);
    setFormData({ name: '', sku: '', category: '', model: '', defaultUnitPrice: '' });
  };

  const handleDelete = (productId: string) => {
    if (confirm('¿Está seguro que desea eliminar este producto?')) {
      const updatedProducts = data.products.filter(p => p.id !== productId);
      updateData({ ...data, products: updatedProducts });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Productos</CardTitle>
              <CardDescription>Gestione su catálogo de productos</CardDescription>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Producto
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Buscar por nombre o SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead className="text-right">Precio Unitario</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No se encontraron productos
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.sku || '—'}</TableCell>
                      <TableCell>{product.category || '—'}</TableCell>
                      <TableCell>{product.model || '—'}</TableCell>
                      <TableCell className="text-right">
                        ${product.defaultUnitPrice.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(product)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(product.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
            </DialogTitle>
            <DialogDescription>
              {editingProduct
                ? 'Modifique los datos del producto'
                : 'Complete los datos del nuevo producto'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nombre del producto"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">SKU / Código</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="Código del producto"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoría</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Categoría del producto"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Modelo de Celular</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="Ej: 16 PRO MAX, 15 PRO, etc."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Precio Unitario *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.defaultUnitPrice}
                  onChange={(e) => setFormData({ ...formData, defaultUnitPrice: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
