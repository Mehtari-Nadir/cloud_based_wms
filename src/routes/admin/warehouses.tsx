import { createFileRoute } from '@tanstack/react-router';
import { WarehouseDataTable } from '@/components/data-tables/warehouses/data-table';
import { columns } from '@/components/data-tables/warehouses/columns';


export const Route = createFileRoute('/admin/warehouses')({
	component: RouteComponent,
})

const data = [
	{
		warehouse_name: "Central Distribution Hub",
		total_stores: 12,
		total_items: 185000,
		created_at: "2025-11-01T09:15:00.000Z",
	},
	{
		warehouse_name: "West Coast Fulfillment",
		total_stores: 8,
		total_items: 94000,
		created_at: "2025-11-02T10:22:00.000Z",
	},
	{
		warehouse_name: "Cold Storage North",
		total_stores: 5,
		total_items: 52000,
		created_at: "2025-11-03T07:48:00.000Z",
	},
	{
		warehouse_name: "Returns Processing Center",
		total_stores: 3,
		total_items: 26000,
		created_at: "2025-11-04T12:05:00.000Z",
	},
	{
		warehouse_name: "Bulk Import Terminal",
		total_stores: 4,
		total_items: 73000,
		created_at: "2025-11-05T08:40:00.000Z",
	},
];


function RouteComponent() {
	return (
		<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div className="px-4 lg:px-6">
				<WarehouseDataTable data={data} columns={columns} />
			</div>
		</div>
	);
}
