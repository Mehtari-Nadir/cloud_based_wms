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
import { UserPlus } from "lucide-react";
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
import { useState } from "react";
import { Spinner } from "../ui/spinner";
import { toast } from "sonner";
import { Id } from "convex/_generated/dataModel";

const roleOptions = ["manager", "staff"] as const;

const formSchema = z.object({
    email: z.string().email({
        message: "Please enter a valid email address.",
    }),
    role: z.enum(roleOptions),
});

interface InviteUserDialogProps {
    warehouseId: Id<"warehouses">;
}

export const InviteUserDialog = ({ warehouseId }: InviteUserDialogProps) => {
    const { userId } = useAuth();
    const inviteUser = useMutation(api.invitations.inviteUser);
    const [isLoading, setLoading] = useState<boolean>(false);
    const [isOpen, setOpen] = useState<boolean>(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema as any),
        defaultValues: {
            email: "",
            role: undefined,
        },
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!userId) return;
        setLoading(true);
        try {
            await inviteUser({
                warehouseId,
                email: values.email,
                role: values.role,
                clerkId: userId,
            });
            setOpen(false);
            form.reset();
            toast.success("Invitation sent successfully.");
        } catch (error: any) {
            toast.error(error.message || "Failed to send invitation.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="cursor-pointer">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Invite User
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Invite a team member</DialogTitle>
                    <DialogDescription>
                        Send an invitation to join this warehouse.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input 
                                            type="email" 
                                            placeholder="teammate@example.com" 
                                            {...field} 
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="role"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Role</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a role" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="manager">
                                                Manager - Can create/edit stores and inventory
                                            </SelectItem>
                                            <SelectItem value="staff">
                                                Staff - Can view and update inventory
                                            </SelectItem>
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
                                    Sending
                                </Button>
                            ) : (
                                <Button type="submit">
                                    Send Invitation
                                </Button>
                            )}
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};
