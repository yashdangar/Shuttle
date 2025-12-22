"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { IconRoute } from "@tabler/icons-react";
import Link from "next/link";
import type { Id } from "@/convex/_generated/dataModel";
import type { TripRecord } from "@/convex/trips";

import { api } from "@/convex/_generated/api";
import { useAuthSession } from "@/hooks/use-auth-session";
import { EmptyMuted } from "@/components/interfaces/common/EmptyState";
import { TableLoader } from "@/components/interfaces/common/TableLoader";
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
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

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

export function FrontdeskTripTable() {
  const { user } = useAuthSession();
  const [pageStack, setPageStack] = useState<Array<string | null>>([null]);
  const [pageIndex, setPageIndex] = useState(0);

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

  return (
    <>
      <div className="rounded-md border">
        {trips.length === 0 ? (
          <div className="flex min-h-[320px] items-center justify-center p-6">
            <EmptyMuted
              title="No trips created"
              description="No trips available for this hotel."
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
                    <TableCell className="font-medium">
                      <Link
                        href={`/frontdesk/trips/${trip.id}`}
                        className="hover:underline"
                      >
                        {trip.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                      {source} → {destination}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {trip.routes?.length ? trip.routes.length + 1 : 0}
                    </TableCell>
                    <TableCell>${trip.totalCharges?.toFixed(2) ?? "0.00"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatTimestamp(trip.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/frontdesk/trips/${trip.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
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
