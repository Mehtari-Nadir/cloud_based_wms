import { createFileRoute } from '@tanstack/react-router'
import { api } from 'convex/_generated/api';
import { useQuery } from 'convex/react';

export const Route = createFileRoute('/admin/warehouses/$warehouse')({
	component: RouteComponent,
})

function RouteComponent() {

	const { warehouse: warehouseName } = Route.useParams();
	const warehouse = useQuery(
		api.warehouses.getWarehouseByName,
		{
			warehouseName: warehouseName
		}
	);

	// loading ui
	if (warehouse === undefined) {
		return <div className="p-4">Loading warehouse...</div>;
	}

	return (
		<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div className="px-4 lg:px-6">
				Hello from {warehouse?.name}
			</div>
		</div>
	)
}
