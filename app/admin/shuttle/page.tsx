"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuthSession } from "@/hooks/use-auth-session";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { SearchBar } from "@/components/admin/search-bar";
import { AddButton } from "@/components/admin/add-button";
import { ActionButtons } from "@/components/admin/action-buttons";
import { ErrorAlert } from "@/components/admin/error-alert";
import { PaginationControls } from "@/components/admin/pagination-controls";
import { DeleteConfirmDialog } from "@/components/admin/delete-confirm-dialog";
import { DataTable } from "@/components/admin/data-table";

const shuttleFormSchema = z.object({
  vehicleNumber: z.string().min(1, "Vehicle number is required").max(120),
  totalSeats: z.coerce
    .number()
    .int("Seats must be an integer")
    .positive("Seats must be positive"),
});

type ShuttleFormValues = z.infer<typeof shuttleFormSchema>;

type ShuttleEntry = {
  id: Id<"shuttles">;
  vehicleNumber: string;
  totalSeats: number;
};

const pageSize = 10;

export default function AdminShuttlePage() {
  const { user: sessionUser, status: sessionStatus } = useAuthSession();
  const isAdmin =
    sessionUser?.role === "admin" || sessionUser?.role === "superadmin";
  const isAuthLoading = sessionStatus === "loading";

  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [activeShuttle, setActiveShuttle] = useState<ShuttleEntry | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<Id<"shuttles"> | null>(
    null
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [shuttleToDelete, setShuttleToDelete] = useState<ShuttleEntry | null>(
    null
  );
  const [pageStack, setPageStack] = useState<Array<string | null>>([null]);
  const [pageIndex, setPageIndex] = useState(0);

  const form = useForm<ShuttleFormValues>({
    resolver: zodResolver(shuttleFormSchema) as any,
    defaultValues: {
      vehicleNumber: "",
      totalSeats: 10,
    },
  });

  useEffect(() => {
    setPageStack([null]);
    setPageIndex(0);
  }, []);

  const currentCursor = pageStack[pageIndex] ?? null;

  let queryError: string | null = null;
  let shuttlesData:
    | {
        shuttles: ShuttleEntry[];
        nextCursor: string | null;
      }
    | undefined;

  try {
    shuttlesData = useQuery(api.shuttles.listShuttles, {
      limit: pageSize,
      cursor: currentCursor ?? undefined,
    });
  } catch (error: any) {
    shuttlesData = { shuttles: [], nextCursor: null };
    queryError = error.message ?? "Failed to load shuttles";
  }

  const createShuttle = useAction(api.shuttles.createShuttle);
  const updateShuttle = useAction(api.shuttles.updateShuttle);
  const deleteShuttle = useAction(api.shuttles.deleteShuttle);

  const filteredShuttles = useMemo(() => {
    const list = shuttlesData?.shuttles ?? [];
    const query = searchQuery.trim().toLowerCase();
    if (!query) return list;
    return list.filter(
      (shuttle) =>
        shuttle.vehicleNumber.toLowerCase().includes(query) ||
        shuttle.totalSeats.toString().includes(query)
    );
  }, [searchQuery, shuttlesData]);

  const handleSubmit = form.handleSubmit(async (values) => {
    setRequestError(null);
    try {
      if (dialogMode === "create") {
        await createShuttle({
          vehicleNumber: values.vehicleNumber.trim(),
          totalSeats: values.totalSeats,
        });
      } else if (activeShuttle) {
        await updateShuttle({
          shuttleId: activeShuttle.id,
          vehicleNumber: values.vehicleNumber.trim(),
          totalSeats: values.totalSeats,
        });
      }
      form.reset({
        vehicleNumber: "",
        totalSeats: 10,
      });
      setActiveShuttle(null);
      setIsDialogOpen(false);
    } catch (error: any) {
      setRequestError(error.message ?? "Failed to save shuttle");
    }
  });

  const handleAddClick = () => {
    setDialogMode("create");
    setActiveShuttle(null);
    form.reset({
      vehicleNumber: "",
      totalSeats: 10,
    });
    setIsDialogOpen(true);
  };

  const handleEditClick = (shuttle: ShuttleEntry) => {
    setDialogMode("edit");
    setActiveShuttle(shuttle);
    form.reset({
      vehicleNumber: shuttle.vehicleNumber,
      totalSeats: shuttle.totalSeats,
    });
    setIsDialogOpen(true);
  };

  const handleDeleteRequest = (shuttle: ShuttleEntry) => {
    setShuttleToDelete(shuttle);
    setIsDeleteDialogOpen(true);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!shuttleToDelete) return;
    setDeleteError(null);
    setPendingDeleteId(shuttleToDelete.id);
    try {
      await deleteShuttle({ shuttleId: shuttleToDelete.id });
      setIsDeleteDialogOpen(false);
      setShuttleToDelete(null);
    } catch (error: any) {
      setDeleteError(error.message ?? "Failed to delete shuttle");
    } finally {
      setPendingDeleteId(null);
    }
  };

  const handleNextPage = () => {
    if (!shuttlesData?.nextCursor) return;
    setPageStack((stack) => {
      const nextStack = stack.slice(0, pageIndex + 1);
      nextStack.push(shuttlesData.nextCursor);
      return nextStack;
    });
    setPageIndex((index) => index + 1);
  };

  const handlePrevPage = () => {
    if (pageIndex === 0) return;
    setPageIndex((index) => Math.max(0, index - 1));
  };

  if (!isAuthLoading && !isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unauthorized</CardTitle>
          <CardDescription>
            Only administrators can manage shuttles.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-3xl font-semibold tracking-tight">
          Shuttle Management
        </h1>
        <p className="text-muted-foreground">
          Maintain vehicle details and total seat capacity.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <SearchBar
            placeholder="Search shuttles"
            value={searchQuery}
            onChange={setSearchQuery}
          />
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <AddButton
                label="Add Shuttle"
                onClick={handleAddClick}
                disabled={!isAdmin}
              />
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {dialogMode === "create" ? "Add Shuttle" : "Edit Shuttle"}
                </DialogTitle>
                <DialogDescription>
                  {dialogMode === "create"
                    ? "Provide vehicle details to add a new shuttle."
                    : "Update the shuttle information below."}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={handleSubmit} className="space-y-4">
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
                            {...field}
                            onChange={(event) =>
                              field.onChange(event.target.value)
                            }
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
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          {dialogMode === "create" ? "Saving..." : "Updating..."}
                        </>
                      ) : dialogMode === "create" ? (
                        "Create Shuttle"
                      ) : (
                        "Update Shuttle"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-4">
          {queryError ? <ErrorAlert message={queryError} /> : null}
          {deleteError && !isDeleteDialogOpen ? (
            <ErrorAlert message={deleteError} />
          ) : null}
          <div className="rounded-lg border">
            <DataTable
              data={filteredShuttles}
              columns={[
                {
                  header: "Vehicle Number",
                  render: (shuttle) => shuttle.vehicleNumber,
                  className: "font-medium",
                },
                {
                  header: "Total Seats",
                  render: (shuttle) => shuttle.totalSeats,
                },
                {
                  header: "Actions",
                  render: (shuttle) => (
                    <ActionButtons
                      onEdit={() => handleEditClick(shuttle)}
                      onDelete={() => handleDeleteRequest(shuttle)}
                      editLabel={`Edit shuttle ${shuttle.vehicleNumber}`}
                      deleteLabel={`Delete shuttle ${shuttle.vehicleNumber}`}
                      disabled={!isAdmin}
                    />
                  ),
                  className: "text-right",
                },
              ]}
              isLoading={shuttlesData === undefined}
              emptyMessage="No shuttles match your search."
              getRowKey={(shuttle) => shuttle.id}
            />
          </div>
          <PaginationControls
            currentPage={pageIndex}
            hasNextPage={!!shuttlesData?.nextCursor}
            onNextPage={handleNextPage}
            onPrevPage={handlePrevPage}
            isLoading={shuttlesData === undefined}
          />
        </CardContent>
      </Card>
      <DeleteConfirmDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title={`Delete ${shuttleToDelete?.vehicleNumber}`}
        description="This action permanently removes the shuttle. This cannot be undone."
        onConfirm={handleConfirmDelete}
        isDeleting={pendingDeleteId !== null}
        error={deleteError}
      />
    </div>
  );
}
