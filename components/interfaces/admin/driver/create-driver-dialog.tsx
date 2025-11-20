"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuthSession } from "@/hooks/use-auth-session";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  email: z.string().email("Enter a valid email"),
  phoneNumber: z
    .string()
    .min(5, "Phone number is required")
    .max(25, "Phone number is too long"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateDriverDialog() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const createStaffAccount = useAction(api.users.createStaffAccount);
  const { user } = useAuthSession();
  const adminId = user?.role === "admin" ? (user.id as Id<"users">) : null;
  const isAdmin = !!adminId;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phoneNumber: "",
      password: "",
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    form.reset();
    setRequestError(null);
  };

  const handleSubmit = async (values: FormValues) => {
    if (!adminId) {
      setRequestError("Only administrators can create drivers");
      return;
    }

    const trimmed = {
      name: values.name.trim(),
      email: values.email.trim().toLowerCase(),
      phoneNumber: values.phoneNumber.trim(),
      password: values.password.trim(),
    };

    try {
      setRequestError(null);
      await createStaffAccount({
        adminId,
        ...trimmed,
        role: "driver",
      });
      handleCloseDialog();
    } catch (error: any) {
      setRequestError(error.message ?? "Failed to create driver");
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button disabled={!isAdmin}>
          <Plus className="h-4 w-4" />
          Add Driver
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Driver</DialogTitle>
          <DialogDescription>
            Create a new driver. This will allow them to access the portal.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Alex Smith"
                      autoComplete="name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="alex@example.com"
                      autoComplete="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="+1 555 000 0000"
                      autoComplete="tel"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Temporary Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {requestError ? (
              <p className="text-destructive text-sm">{requestError}</p>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Driver"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
