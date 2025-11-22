"use client";

import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { IconMapPin } from "@tabler/icons-react";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Id } from "@/convex/_generated/dataModel";

import { api } from "@/convex/_generated/api";
import { useAuthSession } from "@/hooks/use-auth-session";
import { EmptyMuted } from "@/components/interfaces/common/EmptyState";
import { TableLoader } from "@/components/interfaces/common/TableLoader";
import { Badge } from "@/components/ui/badge";
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

export function AdminLocationTable() {
  const router = useRouter();
  const { user } = useAuthSession();
  const [pageStack, setPageStack] = useState<Array<string | null>>([null]);
  const [pageIndex, setPageIndex] = useState(0);
  const [deletingId, setDeletingId] = useState<Id<"locations"> | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<{
    id: Id<"locations">;
    name: string;
  } | null>(null);

  const currentCursor = pageStack[pageIndex] ?? null;

  const data = useQuery(
    api.locations.listAdminLocations,
    user?.id
      ? {
          adminId: user.id as Id<"users">,
          limit: PAGE_SIZE,
          cursor: currentCursor ?? undefined,
        }
      : "skip"
  );
  const locations = data?.locations ?? [];
  const isLoading = data === undefined;

  const deleteLocation = useAction(api.locations.deleteAdminLocation);

  if (isLoading) {
    return <TableLoader label="Loading Locations" />;
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

  const handleEdit = (locationId: Id<"locations">) => {
    router.push(`/admin/locations/${locationId}/edit`);
  };

  const handleDeleteRequest = (location: {
    id: Id<"locations">;
    name: string;
  }) => {
    setLocationToDelete(location);
    setIsDeleteDialogOpen(true);
    setRequestError(null);
  };

  const handleDeleteConfirm = async () => {
    if (!locationToDelete) {
      return;
    }

    if (!user?.id) {
      setRequestError("You must be signed in to delete a location.");
      return;
    }

    try {
      setRequestError(null);
      setDeletingId(locationToDelete.id);
      await deleteLocation({
        currentUserId: user.id as any,
        locationId: locationToDelete.id,
      });
      setIsDeleteDialogOpen(false);
      setLocationToDelete(null);
    } catch (error: any) {
      setRequestError(error.message || "Failed to delete location.");
    } finally {
      setDeletingId(null);
    }
  };

  const getLocationType = (location: {
    clonedFromLocationId?: Id<"locations">;
    locationType: "public" | "private";
  }) => {
    if (location.clonedFromLocationId) {
      return "Imported";
    }
    return "Private";
  };

  return (
    <>
      <div className="rounded-md border">
        {locations.length === 0 ? (
          <div className="flex min-h-[320px] items-center justify-center p-6">
            <EmptyMuted
              title="No locations added"
              description="Create private locations or import public locations to get started."
              icon={<IconMapPin className="h-10 w-10" />}
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Airport</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((location) => (
                <TableRow key={location.id}>
                  <TableCell className="font-medium">{location.name}</TableCell>
                  <TableCell className="max-w-[320px] truncate text-muted-foreground">
                    {location.address}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        getLocationType(location) === "Imported"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {getLocationType(location)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {location.isAirportLocation ? (
                      <Badge variant="outline">Yes</Badge>
                    ) : (
                      <span className="text-muted-foreground">No</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatTimestamp(location.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Edit ${location.name}`}
                        onClick={() => handleEdit(location.id)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Delete ${location.name}`}
                        className="text-destructive hover:text-destructive"
                        onClick={() =>
                          handleDeleteRequest({
                            id: location.id,
                            name: location.name,
                          })
                        }
                        disabled={deletingId === location.id}
                      >
                        {deletingId === location.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      {locations.length > 0 && (
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
            <AlertDialogTitle>Delete Location</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {locationToDelete?.name}? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {requestError && (
            <div className="text-destructive text-sm">{requestError}</div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setLocationToDelete(null);
                setRequestError(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deletingId === locationToDelete?.id}
            >
              {deletingId === locationToDelete?.id ? (
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

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function formatTimestamp(timestamp: number) {
  return dateFormatter.format(new Date(timestamp));
}


