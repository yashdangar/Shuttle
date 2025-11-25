"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Trash2, Users, UsersRound } from "lucide-react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuthSession } from "@/hooks/use-auth-session";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchBar } from "@/components/ui/search-bar";
import { ErrorAlert } from "@/components/ui/error-alert";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { EditDriverDialog } from "./edit-driver-dialog";
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

export type DriverAccount = {
  id: Id<"users">;
  name: string;
  email: string;
  phoneNumber: string;
  role: "driver" | "frontdesk";
  hasPassword: boolean;
};

const entityType = "driver" as const;
const entityLabel = "Driver";
const entityCollectionLabel = "drivers";

export function DriverTable() {
  const { user: sessionUser } = useAuthSession();
  const isAdmin =
    sessionUser?.role === "admin" || sessionUser?.role === "superadmin";

  const [searchQuery, setSearchQuery] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<DriverAccount | null>(null);
  const [pageStack, setPageStack] = useState<Array<string | null>>([null]);
  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    setPageStack([null]);
    setPageIndex(0);
  }, []);

  const currentCursor = pageStack[pageIndex] ?? null;

  let queryError: string | null = null;
  let usersData:
    | {
        staff: DriverAccount[];
        nextCursor: string | null;
      }
    | undefined;

  try {
    usersData = useQuery(
      api.users.index.listStaffByRole,
      sessionUser?.id
        ? {
            role: entityType,
            userId: sessionUser.id as Id<"users">,
            limit: pageSize,
            cursor: currentCursor ?? undefined,
          }
        : "skip"
    );
  } catch (error: any) {
    usersData = { staff: [], nextCursor: null };
    queryError = error.message ?? "Failed to load drivers";
  }

  const deleteStaffAccount = useAction(api.users.index.deleteStaffAccount);
  const isLoading = usersData === undefined;

  const filteredUsers = useMemo(() => {
    const list = usersData?.staff ?? [];
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return list;
    }

    return list.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.phoneNumber.toLowerCase().includes(query)
    );
  }, [searchQuery, usersData]);

  const handleDeleteRequest = (user: DriverAccount) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete || !sessionUser?.id) return;
    setDeleteError(null);
    setPendingDeleteId(userToDelete.id);
    try {
      await deleteStaffAccount({
        currentUserId: sessionUser.id as Id<"users">,
        userId: userToDelete.id,
      });
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (error: any) {
      setDeleteError(error.message ?? "Failed to delete driver");
    } finally {
      setPendingDeleteId(null);
    }
  };

  const handleNextPage = () => {
    if (!usersData?.nextCursor) return;
    setPageStack((stack) => {
      const nextStack = stack.slice(0, pageIndex + 1);
      nextStack.push(usersData.nextCursor);
      return nextStack;
    });
    setPageIndex((index) => index + 1);
  };

  const handlePrevPage = () => {
    if (pageIndex === 0) return;
    setPageIndex((index) => Math.max(0, index - 1));
  };

  if (isLoading) {
    return <TableLoader label="Loading Drivers" />;
  }

  return (
    <>
      <CardContent className="space-y-4">
        {/* <SearchBar
            placeholder={`Search ${entityCollectionLabel}`}
            value={searchQuery}
            onChange={setSearchQuery}
            showIcon
          /> */}
        {queryError ? <ErrorAlert message={queryError} /> : null}
        {deleteError && !isDeleteDialogOpen ? (
          <ErrorAlert message={deleteError} />
        ) : null}
        <div className="rounded-lg border">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading {entityCollectionLabel}...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              {`No ${entityCollectionLabel} match your search.`}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-medium">Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div className="font-medium">{user.name}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{user.email}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{user.phoneNumber}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="secondary">Active</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <EditDriverDialog driver={user} disabled={!isAdmin} />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={`Delete ${user.name}`}
                          onClick={() => handleDeleteRequest(user)}
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
        <PaginationControls
          currentPage={pageIndex}
          hasNextPage={!!usersData?.nextCursor}
          onNextPage={handleNextPage}
          onPrevPage={handlePrevPage}
          isLoading={usersData === undefined}
        />
      </CardContent>

      <DeleteConfirmDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title={`Delete ${userToDelete?.name ?? entityLabel}`}
        description="This action permanently removes the account. This cannot be undone."
        onConfirm={handleConfirmDelete}
        isDeleting={pendingDeleteId !== null}
        error={deleteError}
      />
    </>
  );
}
