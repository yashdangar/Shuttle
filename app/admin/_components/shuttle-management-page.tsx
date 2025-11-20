"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2, Edit3 } from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

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

export function ShuttleManagementPage() {
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
    resolver: zodResolver(shuttleFormSchema),
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
          <div className="w-full max-w-sm">
            <Input
              placeholder="Search shuttles"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAddClick} disabled={!isAdmin}>
                <Plus className="size-4" />
                Add Shuttle
              </Button>
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
          {queryError ? (
            <div className="text-destructive rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
              {queryError}
            </div>
          ) : null}
          {deleteError && !isDeleteDialogOpen ? (
            <div className="text-destructive rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
              {deleteError}
            </div>
          ) : null}
          <div className="rounded-lg border">
            {shuttlesData === undefined ? (
              <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading shuttles...
              </div>
            ) : filteredShuttles.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                No shuttles match your search.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle Number</TableHead>
                    <TableHead>Total Seats</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredShuttles.map((shuttle) => (
                    <TableRow key={shuttle.id}>
                      <TableCell className="font-medium">
                        {shuttle.vehicleNumber}
                      </TableCell>
                      <TableCell>{shuttle.totalSeats}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={`Edit shuttle ${shuttle.vehicleNumber}`}
                            onClick={() => handleEditClick(shuttle)}
                            disabled={!isAdmin}
                          >
                            <Edit3 className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={`Delete shuttle ${shuttle.vehicleNumber}`}
                            onClick={() => handleDeleteRequest(shuttle)}
                            disabled={!isAdmin}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <Pagination className="border-t pt-4">
            <PaginationContent className="flex w-full items-center justify-between">
              <PaginationItem className="text-muted-foreground text-sm">
                Page {pageIndex + 1}
              </PaginationItem>
              <div className="flex items-center gap-2">
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      if (pageIndex > 0 && shuttlesData !== undefined) {
                        handlePrevPage();
                      }
                    }}
                    className={
                      pageIndex === 0 || shuttlesData === undefined
                        ? "pointer-events-none opacity-50"
                        : undefined
                    }
                  />
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      if (shuttlesData?.nextCursor) {
                        handleNextPage();
                      }
                    }}
                    className={
                      !shuttlesData?.nextCursor
                        ? "pointer-events-none opacity-50"
                        : undefined
                    }
                  />
                </PaginationItem>
              </div>
            </PaginationContent>
          </Pagination>
        </CardContent>
      </Card>
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {shuttleToDelete?.vehicleNumber}</DialogTitle>
            <DialogDescription>
              This action permanently removes the shuttle. This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          {deleteError ? (
            <div className="text-destructive rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">
              {deleteError}
            </div>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={pendingDeleteId !== null}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={pendingDeleteId !== null}
            >
              {pendingDeleteId !== null ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

