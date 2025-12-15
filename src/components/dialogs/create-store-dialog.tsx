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

const storeTypes = ["plumbing", "construction", "electric", "chemical"] as const;

const formSchema = z.object({
    store_name: z.string().min(2, {
        message: "Store name must be at least 2 characters.",
    }),
    store_type: z.enum(storeTypes),
    warehouse_id: z.string().min(1, {
        message: "Please select a warehouse.",
    }),
});

export const CreateStoreDialog = () => {
    const { userId } = useAuth();
    const createStore = useMutation(api.stores.createStore);
    const warehouses = useQuery(
        api.warehouses.getMyWarehouses,
        userId ? { clerkId: userId } : "skip"
    );
    const [isLoading, setLoading] = useState<boolean>(false);
    const [isOpen, setOpen] = useState<boolean>(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema as any),
        defaultValues: {
            store_name: "",
            store_type: undefined,
            warehouse_id: "",
        },
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!userId) return;
        setLoading(true);
        try {
            await createStore({
                name: values.store_name,
                storeType: values.store_type,
                warehouseId: values.warehouse_id as Id<"warehouses">,
                clerkId: userId,
            });
            setOpen(false);
            form.reset();
            toast.success("Store has been created.");
        } catch (error) {
            toast.error("Failed to create store. Make sure you have permission.");
        } finally {
            setLoading(false);
        }
    };

    // Filter warehouses where user is owner or manager
    const availableWarehouses = warehouses?.filter(
        (w) => w.role === "owner" || w.role === "manager"
    ) ?? [];

    return (
        <Dialog open={isOpen} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="cursor-pointer">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Store
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create a new store</DialogTitle>
                    <DialogDescription>
                        Add a new store to one of your warehouses.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="store_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Store Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Main Storage" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="store_type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Store Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a store type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {storeTypes.map((type) => (
                                                <SelectItem key={type} value={type} className="capitalize">
                                                    {type}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="warehouse_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Warehouse</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a warehouse" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {availableWarehouses.map((warehouse) => (
                                                <SelectItem key={warehouse._id} value={warehouse._id}>
                                                    {warehouse.name}
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
                                    Creating
                                </Button>
                            ) : (
                                <Button type="submit" disabled={availableWarehouses.length === 0}>
                                    Create
                                </Button>
                            )}
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};
