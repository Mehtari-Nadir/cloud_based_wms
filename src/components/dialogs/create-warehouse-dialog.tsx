import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogClose,
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
import { Textarea } from "../ui/textarea";
import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";

const formSchema = z.object({
    warehouse_name: z.string().min(2, {
        message: "warehouse name must be at least 2 characters.",
    }),
    warehouse_description: z.string().min(12, {
        message: "warehouse description must be at least 12 characters."
    })
});

export const CreateWarehouseDialog = () => {

    const createWarehouse = useMutation(api.warehouses.createWarehouse);

    // 1. Define your form.
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema as any),
        defaultValues: {
            warehouse_name: "",
            warehouse_description: ""
        },
    })

    // 2. Define a submit handler.
    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        // Do something with the form values.
        // ✅ This will be type-safe and validated.
        await createWarehouse({
            name: values.warehouse_name,
            description: values.warehouse_description
        });
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button className=" cursor-pointer">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Warehouse
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create a new warehouse</DialogTitle>
                    <DialogDescription>
                        create your warehouse and streamline operations.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <FormField
                            control={form.control}
                            name="warehouse_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Warehouse Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="shadcn" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="warehouse_description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Warehouse Description</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Type your message here." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button type="submit">Create</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
