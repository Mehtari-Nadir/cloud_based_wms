import { columns } from '@/components/data-tables/warehouses/columns';
import { WarehouseDataTable } from '@/components/data-tables/warehouses/data-table';
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from "convex/react";
import { api } from 'convex/_generated/api';

export const Route = createFileRoute('/admin/warehouses/')({
  component: RouteComponent,
})

function RouteComponent() {
  const warehouses = useQuery(api.warehouses.getWarehouses);

  // loading ui
  if (warehouses === undefined) {
    return <div className="p-4">Loading warehouses...</div>;
  }

  const data = warehouses.map((w) => ({
    warehouse_id: w._id,
    warehouse_name: w.name,
    total_stores: w.total_stores,
    total_items: w.total_items,
    created_at: w._creationTime,
  }));

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <WarehouseDataTable data={data} columns={columns} />
      </div>
    </div>
  );
}
