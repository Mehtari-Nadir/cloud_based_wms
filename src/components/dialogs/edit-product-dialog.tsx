import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { useAuth } from "@clerk/clerk-react";
import { useState, useEffect, useRef } from "react";
import { Spinner } from "../ui/spinner";
import { toast } from "sonner";
import { Id } from "convex/_generated/dataModel";
import { X } from "lucide-react";

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
});

interface EditProductDialogProps {
    isOpen: boolean;
    onClose: () => void;
    product: {
        product_id: string;
        product_name: string;
        sku: string;
        quantity: number;
        unit: string;
        image_url: string | null;
    } | null;
}

export const EditProductDialog = ({ isOpen, onClose, product }: EditProductDialogProps) => {
    const { userId } = useAuth();
    const updateProduct = useMutation(api.products.updateProduct);
    const generateUploadUrl = useMutation(api.products.generateUploadUrl);
    const deleteImage = useMutation(api.products.deleteImage);
    const [isLoading, setLoading] = useState<boolean>(false);
    
    // Image state
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [newImageId, setNewImageId] = useState<Id<"_storage"> | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [removeCurrentImage, setRemoveCurrentImage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema as any),
        defaultValues: {
            name: "",
            sku: "",
            quantity: 0,
            unit: "pcs",
        },
    });

    // Reset form and image state when product changes
    useEffect(() => {
        if (product) {
            form.reset({
                name: product.product_name,
                sku: product.sku,
                quantity: product.quantity,
                unit: product.unit,
            });
            setImagePreview(product.image_url);
            setNewImageId(null);
            setRemoveCurrentImage(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    }, [product, form]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
            toast.error("Please select a PNG or JPEG image");
            return;
        }

        setIsUploading(true);
        try {
            const reader = new FileReader();
            reader.onload = (e) => setImagePreview(e.target?.result as string);
            reader.readAsDataURL(file);

            const uploadUrl = await generateUploadUrl();
            const response = await fetch(uploadUrl, {
                method: "POST",
                headers: { "Content-Type": file.type },
                body: file,
            });
            const { storageId } = await response.json();
            setNewImageId(storageId);
            setRemoveCurrentImage(false);
        } catch (error) {
            toast.error("Failed to upload image");
            setImagePreview(product?.image_url ?? null);
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemoveImage = async () => {
        // If we uploaded a new image that wasn't saved yet, delete it
        if (newImageId) {
            try {
                await deleteImage({ imageId: newImageId });
            } catch (error) {
                // Ignore
            }
            setNewImageId(null);
        }
        setImagePreview(null);
        setRemoveCurrentImage(true);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleDialogClose = async () => {
        // Cleanup new image if dialog is closed without saving
        if (newImageId) {
            try {
                await deleteImage({ imageId: newImageId });
            } catch (error) {
                // Ignore
            }
        }
        setNewImageId(null);
        setRemoveCurrentImage(false);
        onClose();
    };

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!userId || !product) return;
        setLoading(true);
        try {
            await updateProduct({
                productId: product.product_id as Id<"products">,
                name: values.name,
                sku: values.sku,
                quantity: values.quantity,
                unit: values.unit,
                // Only include imageId if we're changing the image
                ...(newImageId ? { imageId: newImageId } : removeCurrentImage ? { imageId: null } : {}),
                clerkId: userId,
            });
            onClose();
            toast.success("Item has been updated.");
        } catch (error) {
            toast.error("Failed to update item. Make sure you have permission.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleDialogClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit inventory item</DialogTitle>
                    <DialogDescription>
                        Update the details of this inventory item.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {/* Image Upload */}
                        <div className="space-y-2">
                            <FormLabel>Product Image</FormLabel>
                            {imagePreview ? (
                                <div className="relative w-24 h-24">
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        className="w-full h-full object-cover rounded-md border"
                                    />
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        className="absolute -top-2 -right-2 h-6 w-6"
                                        onClick={handleRemoveImage}
                                        disabled={isUploading}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/png,image/jpeg,image/jpg"
                                        onChange={handleImageUpload}
                                        disabled={isUploading}
                                        className="cursor-pointer"
                                    />
                                    {isUploading && <Spinner />}
                                </div>
                            )}
                        </div>
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
                                        <Select onValueChange={field.onChange} value={field.value}>
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
                        <DialogFooter>
                            {isLoading ? (
                                <Button size="sm" variant="outline" disabled>
                                    <Spinner />
                                    Saving
                                </Button>
                            ) : (
                                <Button type="submit">
                                    Save changes
                                </Button>
                            )}
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};
