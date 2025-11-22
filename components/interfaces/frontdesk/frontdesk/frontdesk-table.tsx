"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuthSession } from "@/hooks/use-auth-session";
import { CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ErrorAlert } from "@/components/ui/error-alert";
import { PaginationControls } from "@/components/ui/pagination-controls";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableLoader } from "../../common/TableLoader";

export type FrontdeskAccount = {
  id: Id<"users">;
  name: string;
  email: string;
  phoneNumber: string;
  role: "driver" | "frontdesk";
  hasPassword: boolean;
};

const entityType = "frontdesk" as const;
const entityLabel = "Frontdesk";
const entityCollectionLabel = "frontdesk staff";

export function FrontdeskTable() {
  const { user: sessionUser } = useAuthSession();

  const [searchQuery, setSearchQuery] = useState("");
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
        staff: FrontdeskAccount[];
        nextCursor: string | null;
      }
    | undefined;

  try {
    usersData = useQuery(
      api.users.listStaffByRole,
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
    queryError = error.message ?? "Failed to load frontdesk staff";
  }

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
    return <TableLoader label="Loading Frontdesk Staff" />;
  }

  return (
    <CardContent className="space-y-4">
      {queryError ? <ErrorAlert message={queryError} /> : null}
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
  );
}

