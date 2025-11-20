"use client";

import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { IconUsersGroup } from "@tabler/icons-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuthSession } from "@/hooks/use-auth-session";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
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
import { EmptyMuted } from "@/components/interfaces/common/EmptyState";
import { TableLoader } from "@/components/interfaces/common/TableLoader";
import { EditAdminDialog } from "./edit-admin-dialog";
import type { AdminAccount } from "@/convex/admins";

export function AdminTable() {
  const [pageStack, setPageStack] = useState<Array<string | null>>([null]);
  const [pageIndex, setPageIndex] = useState(0);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<AdminAccount | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<Id<"users"> | null>(
    null
  );
  const pageSize = 10;
  const { user } = useAuthSession();

  const currentCursor = pageStack[pageIndex] ?? null;

  const adminsData = useQuery(api.admins.listAdmins, {
    limit: pageSize,
    cursor: currentCursor ?? undefined,
  });

  const deleteAdmin = useAction(api.admins.deleteAdmin);

  const handleNextPage = () => {
    if (adminsData?.nextCursor) {
      setPageStack((prev) => {
        const newStack = prev.slice(0, pageIndex + 1);
        newStack.push(adminsData.nextCursor);
        return newStack;
      });
      setPageIndex((prev) => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (pageIndex > 0) {
      setPageIndex((prev) => prev - 1);
    }
  };

  const handleDeleteRequest = (admin: AdminAccount) => {
    setAdminToDelete(admin);
    setIsDeleteDialogOpen(true);
    setDeleteError(null);
  };

  const handleDeleteConfirm = async () => {
    if (!adminToDelete || !user?.id) {
      return;
    }

    try {
      setPendingDeleteId(adminToDelete.id);
      setDeleteError(null);
      await deleteAdmin({
        currentUserId: user.id as any,
        userId: adminToDelete.id,
      });
      setIsDeleteDialogOpen(false);
      setAdminToDelete(null);
      setPendingDeleteId(null);
    } catch (error: any) {
      setDeleteError(error.message || "Failed to delete admin");
      setPendingDeleteId(null);
    }
  };

  const admins = adminsData?.admins ?? [];
  const isLoading = adminsData === undefined;

  if (isLoading) {
    return <TableLoader label="Loading Admins" />;
  }

  return (
    <>
      <div className="rounded-md border">
        {admins.length === 0 ? (
          <div className="flex min-h-[320px] items-center justify-center p-6">
            <EmptyMuted
              title="No admin accounts"
              description="Create admin users to manage organizations, locations, and permissions."
              icon={<IconUsersGroup className="h-10 w-10" />}
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell className="font-medium">{admin.name}</TableCell>
                  <TableCell>{admin.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{admin.role}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <EditAdminDialog admin={admin} />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Delete ${admin.name}`}
                        onClick={() => handleDeleteRequest(admin)}
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
      {admins.length > 0 && (
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
                      handlePrevPage();
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
                    if (adminsData?.nextCursor) {
                      handleNextPage();
                    }
                  }}
                  className={
                    !adminsData?.nextCursor
                      ? "pointer-events-none opacity-50"
                      : undefined
                  }
                />
              </PaginationItem>
            </div>
          </PaginationContent>
        </Pagination>
      )}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Admin</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {adminToDelete?.name}? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <div className="text-destructive text-sm">{deleteError}</div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setAdminToDelete(null);
                setDeleteError(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={pendingDeleteId === adminToDelete?.id}
            >
              {pendingDeleteId === adminToDelete?.id ? (
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
