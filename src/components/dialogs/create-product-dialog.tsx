import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { useAuth } from "@clerk/clerk-react";
import { useState } from "react";
import { Spinner } from "../ui/spinner";
import { toast } from "sonner";
import { Id } from "convex/_generated/dataModel";

const formSchema = z.object({
    name: z.string().min(2, {
        message: "Item name must be at least 2 characters.",
    }),
    sku: z.string().min(1, {
        message: "SKU is required.",
    }),
    quantity: z.coerce.number().min(0, {
        message: "Quantity must be 0 or greater.",
    }),
    unit: z.string().min(1, {
        message: "Unit is required.",
    }),
    store_id: z.string().min(1, {
        message: "Please select a store.",
    }),
});

export const CreateProductDialog = () => {
    const { userId } = useAuth();
    const createProduct = useMutation(api.products.createProduct);
    const stores = useQuery(
        api.stores.getMyStores,
        userId ? { clerkId: userId } : "skip"
    );
    const [isLoading, setLoading] = useState<boolean>(false);
    const [isOpen, setOpen] = useState<boolean>(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema as any),
        defaultValues: {
            name: "",
            sku: "",
            quantity: 0,
            unit: "pcs",
            store_id: "",
        },
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!userId) return;
        setLoading(true);
        try {
            await createProduct({
                storeId: values.store_id as Id<"stores">,
                name: values.name,
                sku: values.sku,
                description: "", // MVP: empty description
                quantity: values.quantity,
                unit: values.unit,
                price: "0", // MVP: default price
                alertThresholds: {
                    lowStock: 10,
                    outOfStock: 0,
                    reorderPoint: 20,
                    criticalLow: 5,
                    overstock: 1000,
                },
                clerkId: userId,
            });
            setOpen(false);
            form.reset();
            toast.success("Item has been added.");
        } catch (error) {
            toast.error("Failed to add item. Make sure you have permission.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="cursor-pointer">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add inventory item</DialogTitle>
                    <DialogDescription>
                        Add a new item to your inventory.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Item Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Copper Pipe 1/2 inch" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="sku"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>SKU</FormLabel>
                                    <FormControl>
                                        <Input placeholder="CP-001" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="quantity"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Quantity</FormLabel>
                                        <FormControl>
                                            <Input type="number" min={0} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="unit"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Unit</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Unit" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="pcs">pcs</SelectItem>
                                                <SelectItem value="kg">kg</SelectItem>
                                                <SelectItem value="m">m</SelectItem>
                                                <SelectItem value="L">L</SelectItem>
                                                <SelectItem value="box">box</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="store_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Store</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a store" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {stores?.map((store) => (
                                                <SelectItem key={store._id} value={store._id}>
                                                    {store.name} ({store.warehouseName})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            {isLoading ? (
                                <Button size="sm" variant="outline" disabled>
                                    <Spinner />
                                    Adding
                                </Button>
                            ) : (
                                <Button type="submit" disabled={!stores?.length}>
                                    Add Item
                                </Button>
                            )}
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};
