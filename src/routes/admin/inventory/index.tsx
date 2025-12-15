import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from "convex/react";
import { api } from 'convex/_generated/api';
import { useAuth } from '@clerk/clerk-react';
import { InventoryDataTable } from '@/components/data-tables/inventory/data-table';
import { getInventoryColumns, TInventoryColumn } from '@/components/data-tables/inventory/columns';
import { CreateProductDialog } from '@/components/dialogs/create-product-dialog';
import { EditProductDialog } from '@/components/dialogs/edit-product-dialog';
import { useState } from 'react';

export const Route = createFileRoute('/admin/inventory/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { userId } = useAuth();
  const products = useQuery(
    api.products.getMyProducts,
    userId ? { clerkId: userId } : "skip"
  );
  
  const [editingProduct, setEditingProduct] = useState<TInventoryColumn | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const handleEdit = (product: TInventoryColumn) => {
    setEditingProduct(product);
    setIsEditDialogOpen(true);
  };

  const handleCloseEdit = () => {
    setIsEditDialogOpen(false);
    setEditingProduct(null);
  };

  const columns = getInventoryColumns({ onEdit: handleEdit });

  if (products === undefined) {
    return <div className="p-4">Loading inventory...</div>;
  }

  const data = products.map((p) => ({
    product_id: p._id,
    product_name: p.name,
    sku: p.sku,
    store_id: p.storeId,
    store_name: p.storeName,
    warehouse_id: p.warehouseId,
    warehouse_name: p.warehouseName,
    quantity: p.quantity,
    unit: p.unit,
    price: p.price,
  }));

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex items-center justify-between px-4 lg:px-6">
        <h1 className="text-2xl font-semibold">Inventory</h1>
        <CreateProductDialog />
      </div>
      <div className="px-4 lg:px-6">
        <InventoryDataTable data={data} columns={columns} />
      </div>
      <EditProductDialog
        isOpen={isEditDialogOpen}
        onClose={handleCloseEdit}
        product={editingProduct}
      />
    </div>
  );
}
