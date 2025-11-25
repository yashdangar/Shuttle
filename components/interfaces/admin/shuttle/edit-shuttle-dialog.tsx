"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Edit3, Loader2 } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import type { ShuttleEntry } from "./shuttle-table";

const formSchema = z.object({
  vehicleNumber: z.string().min(1, "Vehicle number is required").max(120),
  totalSeats: z
    .number()
    .int("Seats must be an integer")
    .positive("Seats must be positive"),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

type EditShuttleDialogProps = {
  shuttle: ShuttleEntry;
  disabled?: boolean;
};

export function EditShuttleDialog({
  shuttle,
  disabled,
}: EditShuttleDialogProps) {
  const { user: sessionUser } = useAuthSession();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const updateShuttle = useAction(api.shuttles.updateShuttle);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vehicleNumber: shuttle.vehicleNumber,
      totalSeats: shuttle.totalSeats,
      isActive: shuttle.isActive,
    },
  });

  useEffect(() => {
    if (isDialogOpen) {
      form.reset({
        vehicleNumber: shuttle.vehicleNumber,
        totalSeats: shuttle.totalSeats,
        isActive: shuttle.isActive,
      });
      setRequestError(null);
    }
  }, [form, isDialogOpen, shuttle.vehicleNumber, shuttle.totalSeats, shuttle.isActive]);

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    form.reset({
      vehicleNumber: shuttle.vehicleNumber,
      totalSeats: shuttle.totalSeats,
      isActive: shuttle.isActive,
    });
    setRequestError(null);
  };

  const handleSubmit = async (values: FormValues) => {
    if (!sessionUser?.id) {
      setRequestError("You must be logged in to update shuttles");
      return;
    }
    try {
      setRequestError(null);
      await updateShuttle({
        currentUserId: sessionUser.id as Id<"users">,
        shuttleId: shuttle.id,
        vehicleNumber: values.vehicleNumber.trim(),
        totalSeats: values.totalSeats,
        isActive: values.isActive,
      });
      handleCloseDialog();
    } catch (error: any) {
      setRequestError(error.message ?? "Failed to update shuttle");
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Edit shuttle ${shuttle.vehicleNumber}`}
          disabled={disabled}
        >
          <Edit3 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Shuttle</DialogTitle>
          <DialogDescription>Update shuttle details below.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="vehicleNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle Number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="AB-1234"
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="totalSeats"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Seats</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      value={Number.isNaN(field.value) ? "" : field.value}
                      onChange={(event) =>
                        field.onChange(event.target.valueAsNumber || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active Status</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Enable or disable this shuttle for use.
                    </p>
                  </div>
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
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
                  "Update Shuttle"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
