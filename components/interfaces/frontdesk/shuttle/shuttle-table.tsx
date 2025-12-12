"use client";

import { useEffect, useMemo, useState } from "react";
import { BusFront, Trash2 } from "lucide-react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuthSession } from "@/hooks/use-auth-session";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ErrorAlert } from "@/components/ui/error-alert";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableLoader } from "../../common/TableLoader";
import { EmptyMuted } from "../../common/EmptyState";
import { EditShuttleDialog } from "@/components/interfaces/admin/shuttle/edit-shuttle-dialog";

export type ShuttleEntry = {
  id: Id<"shuttles">;
  vehicleNumber: string;
  totalSeats: number;
  isActive: boolean;
};

const entityLabel = "Shuttle";
const entityCollectionLabel = "shuttles";

export function ShuttleTable() {
  const { user: sessionUser } = useAuthSession();
  const canManage =
    sessionUser?.role === "frontdesk" ||
    sessionUser?.role === "admin" ||
    sessionUser?.role === "superadmin";

  const [searchQuery, setSearchQuery] = useState("");
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
  const pageSize = 10;

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
    shuttlesData = useQuery(
      api.shuttles.index.listShuttles,
      sessionUser?.id
        ? {
            userId: sessionUser.id as Id<"users">,
            limit: pageSize,
            cursor: currentCursor ?? undefined,
          }
        : "skip"
    );
  } catch (error: any) {
    shuttlesData = { shuttles: [], nextCursor: null };
    queryError = error.message ?? "Failed to load shuttles";
  }

  const deleteShuttle = useAction(api.shuttles.index.deleteShuttle);
  const isLoading = shuttlesData === undefined;

  const filteredShuttles = useMemo(() => {
    const list = shuttlesData?.shuttles ?? [];
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return list;
    }
    return list.filter(
      (shuttle) =>
        shuttle.vehicleNumber.toLowerCase().includes(query) ||
        shuttle.totalSeats.toString().includes(query)
    );
  }, [searchQuery, shuttlesData]);

  const handleDeleteRequest = (shuttle: ShuttleEntry) => {
    setShuttleToDelete(shuttle);
    setIsDeleteDialogOpen(true);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!shuttleToDelete || !sessionUser?.id) return;
    setDeleteError(null);
    setPendingDeleteId(shuttleToDelete.id);
    try {
      await deleteShuttle({
        currentUserId: sessionUser.id as Id<"users">,
        shuttleId: shuttleToDelete.id,
      });
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

  if (isLoading) {
    return <TableLoader label="Loading Shuttles" />;
  }

  return (
    <>
      <CardContent className="space-y-4">
        {queryError ? <ErrorAlert message={queryError} /> : null}
        {deleteError && !isDeleteDialogOpen ? (
          <ErrorAlert message={deleteError} />
        ) : null}
        <div className="rounded-lg border">
          {filteredShuttles.length === 0 ? (
            <div className="flex min-h-[320px] items-center justify-center p-6">
              <EmptyMuted
                title="No shuttles added"
                description="No shuttles available for this hotel."
                icon={<BusFront className="h-10 w-10" />}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-medium">Vehicle Number</TableHead>
                  <TableHead>Total Seats</TableHead>
                  <TableHead>Status</TableHead>
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
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          shuttle.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {shuttle.isActive ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <EditShuttleDialog
                          shuttle={shuttle}
                          disabled={!canManage}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={`Delete shuttle ${shuttle.vehicleNumber}`}
                          onClick={() => handleDeleteRequest(shuttle)}
                          disabled={!canManage}
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
        <PaginationControls
          currentPage={pageIndex}
          hasNextPage={!!shuttlesData?.nextCursor}
          onNextPage={handleNextPage}
          onPrevPage={handlePrevPage}
          isLoading={shuttlesData === undefined}
        />
      </CardContent>

      <DeleteConfirmDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title={`Delete ${shuttleToDelete?.vehicleNumber ?? entityLabel}`}
        description="This action permanently removes the shuttle. This cannot be undone."
        onConfirm={handleConfirmDelete}
        isDeleting={pendingDeleteId !== null}
        error={deleteError}
      />
    </>
  );
}
