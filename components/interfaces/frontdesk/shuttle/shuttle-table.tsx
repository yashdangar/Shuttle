"use client";

import { useEffect, useMemo, useState } from "react";
import { BusFront, Loader2 } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuthSession } from "@/hooks/use-auth-session";
import { CardContent } from "@/components/ui/card";
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
import { EmptyMuted } from "../../common/EmptyState";

export type ShuttleEntry = {
  id: Id<"shuttles">;
  vehicleNumber: string;
  totalSeats: number;
};

const entityLabel = "Shuttle";
const entityCollectionLabel = "shuttles";

export function ShuttleTable() {
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
  let shuttlesData:
    | {
        shuttles: ShuttleEntry[];
        nextCursor: string | null;
      }
    | undefined;

  try {
    shuttlesData = useQuery(
      api.shuttles.listShuttles,
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
    <CardContent className="space-y-4">
      {queryError ? <ErrorAlert message={queryError} /> : null}
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredShuttles.map((shuttle) => (
                <TableRow key={shuttle.id}>
                  <TableCell className="font-medium">
                    {shuttle.vehicleNumber}
                  </TableCell>
                  <TableCell>{shuttle.totalSeats}</TableCell>
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
  );
}
