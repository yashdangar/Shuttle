"use client";

import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { IconRoute } from "@tabler/icons-react";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Id } from "@/convex/_generated/dataModel";
import type { TripRecord } from "@/convex/trips";

import { api } from "@/convex/_generated/api";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useHotelTime } from "@/hooks/use-hotel-time";
import { EmptyMuted } from "@/components/interfaces/common/EmptyState";
import { TableLoader } from "@/components/interfaces/common/TableLoader";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 10;

function formatTripRoute(trip: TripRecord): string {
  if (!trip.routes || trip.routes.length === 0) {
    return "No route defined";
  }
  const stops = [trip.routes[0].startLocationName];
  for (const route of trip.routes) {
    stops.push(route.endLocationName);
  }
  return stops.join(" → ");
}

function getSourceAndDestination(trip: TripRecord): {
  source: string;
  destination: string;
} {
  if (!trip.routes || trip.routes.length === 0) {
    return { source: "N/A", destination: "N/A" };
  }
  return {
    source: trip.routes[0].startLocationName,
    destination: trip.routes[trip.routes.length - 1].endLocationName,
  };
}

export function AdminTripTable() {
  const router = useRouter();
  const { user } = useAuthSession();
  const { formatDateTime, getOffset } = useHotelTime();
  const [pageStack, setPageStack] = useState<Array<string | null>>([null]);
  const [pageIndex, setPageIndex] = useState(0);
  const [deletingId, setDeletingId] = useState<Id<"trips"> | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [tripToDelete, setTripToDelete] = useState<{
    id: Id<"trips">;
    name: string;
  } | null>(null);

  const currentCursor = pageStack[pageIndex] ?? null;

  const data = useQuery(
    api.trips.index.listAdminTrips,
    user?.id
      ? {
          adminId: user.id as Id<"users">,
          limit: PAGE_SIZE,
          cursor: currentCursor ?? undefined,
        }
      : "skip"
  );
  const trips = data?.trips ?? [];
  const isLoading = data === undefined;

  const deleteTrip = useAction(api.trips.index.deleteTrip);

  if (isLoading) {
    return <TableLoader label="Loading Trips" />;
  }

  const handleNextPage = () => {
    if (!data?.nextCursor) {
      return;
    }
    setPageStack((prev) => {
      const newStack = prev.slice(0, pageIndex + 1);
      newStack.push(data.nextCursor);
      return newStack;
    });
    setPageIndex((prev) => prev + 1);
  };

  const handlePreviousPage = () => {
    if (pageIndex === 0) {
      return;
    }
    setPageIndex((prev) => prev - 1);
  };

  const handleEdit = (tripId: Id<"trips">) => {
    router.push(`/admin/trips/${tripId}/edit`);
  };

  const handleDeleteRequest = (trip: { id: Id<"trips">; name: string }) => {
    setTripToDelete(trip);
    setIsDeleteDialogOpen(true);
    setRequestError(null);
  };

  const handleDeleteConfirm = async () => {
    if (!tripToDelete) {
      return;
    }

    if (!user?.id) {
      setRequestError("You must be signed in to delete a trip.");
      return;
    }

    try {
      setRequestError(null);
      setDeletingId(tripToDelete.id);
      await deleteTrip({
        currentUserId: user.id as any,
        tripId: tripToDelete.id,
      });
      setIsDeleteDialogOpen(false);
      setTripToDelete(null);
    } catch (error: any) {
      setRequestError(error.message || "Failed to delete trip.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="rounded-md border">
        {trips.length === 0 ? (
          <div className="flex min-h-[320px] items-center justify-center p-6">
            <EmptyMuted
              title="No trips created"
              description="Create your first trip to get started."
              icon={<IconRoute className="h-10 w-10" />}
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Stops</TableHead>
                <TableHead>Total Charges</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trips.map((trip) => {
                const { source, destination } = getSourceAndDestination(trip);
                return (
                  <TableRow key={trip.id}>
                    <TableCell className="font-medium">{trip.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                      {source} → {destination}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {trip.routes?.length ? trip.routes.length + 1 : 0}
                    </TableCell>
                    <TableCell>${trip.totalCharges?.toFixed(2) ?? "0.00"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(new Date(trip.createdAt))} ({getOffset()})
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={`Edit ${trip.name}`}
                          onClick={() => handleEdit(trip.id)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={`Delete ${trip.name}`}
                          className="text-destructive hover:text-destructive"
                          onClick={() =>
                            handleDeleteRequest({
                              id: trip.id,
                              name: trip.name,
                            })
                          }
                          disabled={deletingId === trip.id}
                        >
                          {deletingId === trip.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
      {trips.length > 0 && (
        <Pagination className="border-t pt-4 mt-4">
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
                    if (pageIndex > 0) {
                      handlePreviousPage();
                    }
                  }}
                  className={
                    pageIndex === 0
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
                    if (data?.nextCursor) {
                      handleNextPage();
                    }
                  }}
                  className={
                    !data?.nextCursor
                      ? "pointer-events-none opacity-50"
                      : undefined
                  }
                />
              </PaginationItem>
            </div>
          </PaginationContent>
        </Pagination>
      )}
      {requestError && (
        <p className="mt-4 text-sm text-destructive">{requestError}</p>
      )}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Trip</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {tripToDelete?.name}? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {requestError && (
            <div className="text-destructive text-sm">{requestError}</div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setTripToDelete(null);
                setRequestError(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deletingId === tripToDelete?.id}
            >
              {deletingId === tripToDelete?.id ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
