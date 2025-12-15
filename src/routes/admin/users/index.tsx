import { getColumns } from '@/components/data-tables/users/columns';
import { UsersDataTable } from '@/components/data-tables/users/data-table';
import { createFileRoute } from '@tanstack/react-router'
import { api } from 'convex/_generated/api';
import { useQuery } from 'convex/react';

export const Route = createFileRoute('/admin/users/')({
  component: RouteComponent,
})

function RouteComponent() {
  const user = useQuery(api.users.getUserDataTable);
  const columns = getColumns();

  // loading ui
  if (user === undefined) {
    return <div className="p-4">Loading users...</div>;
  }

  const data = user ? [user] : [];

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      {/* <div className="flex items-center justify-end px-4 lg:px-6">
        <CreateWarehouseDialog />
      </div> */}
      <div className="px-4 lg:px-6">
        {/* <WarehouseDataTable data={data} columns={columns} /> */}
        <UsersDataTable data={data} columns={columns} />
      </div>
    </div>
  );
}
