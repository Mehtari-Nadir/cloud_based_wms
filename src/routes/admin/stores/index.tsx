import { getStoreColumns } from '@/components/data-tables/stores/columns';
import { StoresDataTable } from '@/components/data-tables/stores/data-table';
import { CreateStoreDialog } from '@/components/dialogs/create-store-dialog';
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from "convex/react";
import { api } from 'convex/_generated/api';
import { useAuth } from '@clerk/clerk-react';

export const Route = createFileRoute('/admin/stores/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { userId } = useAuth();
  const stores = useQuery(
    api.stores.getMyStores,
    userId ? { clerkId: userId } : "skip"
  );
  const columns = getStoreColumns();

  // loading ui
  if (stores === undefined) {
    return <div className="p-4">Loading stores...</div>;
  }

  const data = stores.map((s) => ({
    store_id: s._id,
    store_name: s.name,
    store_type: s.storeType,
    warehouse_id: s.warehouseId,
    warehouse_name: s.warehouseName,
    item_count: s.productCount,
    created_at: s._creationTime,
  }));

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex items-center justify-end px-4 lg:px-6">
        <CreateStoreDialog />
      </div>
      <div className="px-4 lg:px-6">
        <StoresDataTable data={data} columns={columns} />
      </div>
    </div>
  );
}
