import { ArrowUpDown, MoreHorizontal, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";

export type TInventoryColumn = {
    product_id: string;
    product_name: string;
    sku: string;
    store_id: string;
    store_name: string;
    warehouse_id: string;
    warehouse_name: string;
    quantity: number;
    unit: string;
    price: string;
};

interface GetInventoryColumnsOptions {
    onEdit?: (product: TInventoryColumn) => void;
}

export const getInventoryColumns = (options?: GetInventoryColumnsOptions): ColumnDef<TInventoryColumn>[] => {
    return [
        {
            accessorKey: "product_name",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Item Name
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                return <div className="ml-3 font-medium">{row.getValue("product_name")}</div>;
            },
        },
        {
            accessorKey: "sku",
            header: "SKU",
            cell: ({ row }) => {
                return <code className="text-sm bg-muted px-2 py-1 rounded">{row.getValue("sku")}</code>;
            },
        },
        {
            accessorKey: "warehouse_name",
            header: "Warehouse",
            cell: ({ row }) => {
                return <div>{row.getValue("warehouse_name")}</div>;
            },
        },
        {
            accessorKey: "store_name",
            header: "Store",
            cell: ({ row }) => {
                return <div>{row.getValue("store_name")}</div>;
            },
        },
        {
            accessorKey: "quantity",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Quantity
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                const quantity = row.getValue("quantity") as number;
                const unit = row.original.unit;
                const variant = quantity <= 10 ? "destructive" : quantity <= 50 ? "secondary" : "default";
                return (
                    <Badge variant={variant} className="ml-3">
                        {quantity} {unit}
                    </Badge>
                );
            },
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const product = row.original;
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                                onClick={() => navigator.clipboard.writeText(product.sku)}
                            >
                                Copy SKU
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => options?.onEdit?.(product)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit item
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ];
};
