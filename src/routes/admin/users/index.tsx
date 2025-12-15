import { getUserColumns } from '@/components/data-tables/users/columns';
import { UsersDataTable } from '@/components/data-tables/users/data-table';
import { createFileRoute } from '@tanstack/react-router'
import { api } from 'convex/_generated/api';
import { useQuery } from 'convex/react';
import { useAuth } from '@clerk/clerk-react';
import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InviteUserDialog } from '@/components/dialogs/invite-user-dialog';
import { Id } from 'convex/_generated/dataModel';

export const Route = createFileRoute('/admin/users/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { userId } = useAuth();
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");
  
  const warehouses = useQuery(
    api.warehouses.getMyWarehouses,
    userId ? { clerkId: userId } : "skip"
  );

  // Only show warehouses where user is owner or manager
  const accessibleWarehouses = warehouses?.filter(
    (w) => w.role === "owner" || w.role === "manager"
  ) ?? [];

  const members = useQuery(
    api.warehouses.getWarehouseMembers,
    userId && selectedWarehouseId 
      ? { warehouseId: selectedWarehouseId as Id<"warehouses">, clerkId: userId } 
      : "skip"
  );

  const columns = getUserColumns();

  // loading ui
  if (warehouses === undefined) {
    return <div className="p-4">Loading...</div>;
  }

  // No access to any warehouse users
  if (accessibleWarehouses.length === 0) {
    return (
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <h1 className="text-2xl font-semibold mb-4">Team Members</h1>
          <p className="text-muted-foreground">
            You need to be an Owner or Manager of a warehouse to view team members.
          </p>
        </div>
      </div>
    );
  }

  const data = members?.map((m) => ({
    member_id: m._id,
    user_id: m.userId,
    name: m.name,
    email: m.email,
    role: m.role,
    joined_at: m.joinedAt,
  })) ?? [];

  const selectedWarehouse = accessibleWarehouses.find(w => w._id === selectedWarehouseId);
  const isOwner = selectedWarehouse?.role === "owner";

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold">Team Members</h1>
          <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select warehouse" />
            </SelectTrigger>
            <SelectContent>
              {accessibleWarehouses.map((warehouse) => (
                <SelectItem key={warehouse._id} value={warehouse._id}>
                  {warehouse.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedWarehouseId && isOwner && (
          <InviteUserDialog warehouseId={selectedWarehouseId as Id<"warehouses">} />
        )}
      </div>
      <div className="px-4 lg:px-6">
        {!selectedWarehouseId ? (
          <p className="text-muted-foreground">Select a warehouse to view team members.</p>
        ) : members === undefined ? (
          <p>Loading members...</p>
        ) : (
          <UsersDataTable data={data} columns={columns} />
        )}
      </div>
    </div>
  );
}
