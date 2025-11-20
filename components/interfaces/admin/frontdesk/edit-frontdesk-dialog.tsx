"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Edit3, Loader2 } from "lucide-react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
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
import type { FrontdeskAccount } from "./frontdesk-table";

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  email: z.string().email("Enter a valid email"),
  phoneNumber: z
    .string()
    .min(5, "Phone number is required")
    .max(25, "Phone number is too long"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

type EditFrontdeskDialogProps = {
  frontdesk: FrontdeskAccount;
  disabled?: boolean;
};

export function EditFrontdeskDialog({
  frontdesk,
  disabled,
}: EditFrontdeskDialogProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const updateStaffAccount = useAction(api.users.updateStaffAccount);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: frontdesk.name,
      email: frontdesk.email,
      phoneNumber: frontdesk.phoneNumber,
      password: "",
    },
  });

  useEffect(() => {
    if (isDialogOpen) {
      form.reset({
        name: frontdesk.name,
        email: frontdesk.email,
        phoneNumber: frontdesk.phoneNumber,
        password: "",
      });
      setRequestError(null);
    }
  }, [frontdesk, form, isDialogOpen]);

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    form.reset({
      name: frontdesk.name,
      email: frontdesk.email,
      phoneNumber: frontdesk.phoneNumber,
      password: "",
    });
    setRequestError(null);
  };

  const handleSubmit = async (values: FormValues) => {
    try {
      setRequestError(null);
      await updateStaffAccount({
        userId: frontdesk.id,
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        phoneNumber: values.phoneNumber.trim(),
        password: values.password.trim() || undefined,
      });
      handleCloseDialog();
    } catch (error: any) {
      setRequestError(error.message ?? "Failed to update frontdesk staff");
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Edit ${frontdesk.name}`}
          disabled={disabled}
        >
          <Edit3 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Frontdesk</DialogTitle>
          <DialogDescription>
            Update frontdesk details. Leave password blank to keep the current
            one.
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
                  <FormLabel>Reset Password (optional)</FormLabel>
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
                    Updating...
                  </>
                ) : (
                  "Update Frontdesk"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
