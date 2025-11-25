"use client";

import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { IconMapPin } from "@tabler/icons-react";
import { Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Id } from "@/convex/_generated/dataModel";

import { api } from "@/convex/_generated/api";
import { useAuthSession } from "@/hooks/use-auth-session";
import { EmptyMuted } from "@/components/interfaces/common/EmptyState";
import { TableLoader } from "@/components/interfaces/common/TableLoader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 25;

export function ImportLocationList() {
  const router = useRouter();
  const { user } = useAuthSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [importingId, setImportingId] = useState<Id<"locations"> | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [pageStack, setPageStack] = useState<Array<string | null>>([null]);
  const [pageIndex, setPageIndex] = useState(0);

  const currentCursor = pageStack[pageIndex] ?? null;

  const data = useQuery(
    api.locations.index.listPublicLocations,
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

  const importLocation = useAction(api.locations.index.importLocation);

  const filteredLocations = locations.filter((location) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      location.name.toLowerCase().includes(query) ||
      location.address.toLowerCase().includes(query)
    );
  });

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

  const handleImport = async (locationId: Id<"locations">) => {
    if (!user?.id) {
      setRequestError("You must be signed in to import a location.");
      return;
    }

    try {
      setRequestError(null);
      setImportingId(locationId);
      await importLocation({
        currentUserId: user.id as any,
        publicLocationId: locationId,
      });
      router.push("/admin/locations");
    } catch (error: any) {
      setRequestError(error.message || "Failed to import location.");
    } finally {
      setImportingId(null);
    }
  };

  if (isLoading) {
    return <TableLoader label="Loading Public Locations" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {requestError && (
        <p className="text-sm text-destructive">{requestError}</p>
      )}

      <div className="rounded-md border">
        {filteredLocations.length === 0 ? (
          <div className="flex min-h-[320px] items-center justify-center p-6">
            <EmptyMuted
              title="No public locations available"
              description={
                searchQuery
                  ? "No locations match your search."
                  : "There are no public locations available to import."
              }
              icon={<IconMapPin className="h-10 w-10" />}
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Airport</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLocations.map((location) => {
                const isImported = location.isImported;
                return (
                  <TableRow key={location.id}>
                    <TableCell className="font-medium">
                      {location.name}
                    </TableCell>
                    <TableCell className="max-w-[320px] truncate text-muted-foreground">
                      {location.address}
                    </TableCell>
                    <TableCell>
                      {location.isAirportLocation ? (
                        <Badge variant="outline">Yes</Badge>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isImported ? (
                        <Badge variant="secondary">Imported</Badge>
                      ) : (
                        <Badge variant="outline">Available</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant={isImported ? "ghost" : "default"}
                        size="sm"
                        disabled={isImported || importingId === location.id}
                        onClick={() => handleImport(location.id)}
                      >
                        {importingId === location.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Importing...
                          </>
                        ) : isImported ? (
                          "Imported"
                        ) : (
                          "Import"
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {locations.length > 0 && (
        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-sm text-muted-foreground">
            Showing {filteredLocations.length} of {locations.length} locations
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePreviousPage}
              disabled={pageIndex === 0}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={!data?.nextCursor}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
