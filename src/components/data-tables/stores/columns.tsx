import { ArrowUpDown, MoreHorizontal } from "lucide-react";
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
import { Link } from "@tanstack/react-router";

type TStoreColumn = {
    store_id: string;
    store_name: string;
    store_type: "plumbing" | "construction" | "electric" | "chemical";
    warehouse_id: string;
    warehouse_name: string;
    item_count: number;
    created_at: number;
};

const storeTypeColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    plumbing: "default",
    construction: "secondary",
    electric: "outline",
    chemical: "destructive",
};

export const getStoreColumns = (): ColumnDef<TStoreColumn>[] => {
    return [
        {
            accessorKey: "store_name",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Store Name
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                return <div className="ml-3 font-medium">{row.getValue("store_name")}</div>;
            },
        },
        {
            accessorKey: "store_type",
            header: "Store Type",
            cell: ({ row }) => {
                const type = row.getValue("store_type") as string;
                return (
                    <Badge variant={storeTypeColors[type] || "default"} className="capitalize">
                        {type}
                    </Badge>
                );
            },
        },
        {
            accessorKey: "warehouse_name",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Warehouse
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                return <div className="ml-3">{row.getValue("warehouse_name")}</div>;
            },
        },
        {
            accessorKey: "item_count",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Item Count
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                return <div className="ml-3">{row.getValue("item_count")}</div>;
            },
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const store = row.original;
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
                                onClick={() => navigator.clipboard.writeText(store.store_id)}
                            >
                                Copy store ID
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link 
                                    to="/admin/inventory" 
                                    search={{ storeId: store.store_id }}
                                >
                                    View inventory
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ];
};
