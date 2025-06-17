"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Eye } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";
import { withAuth } from "@/components/withAuth";
import { Loader } from "@/components/ui/loader";
import { TableLoader } from "@/components/ui/table-loader";
import { EmptyState } from "@/components/ui/empty-state";
import { Truck } from "lucide-react";

interface Driver {
  id: number;
  name: string;
  phoneNumber: string;
}

interface Shuttle {
  id: number;
  vehicleNumber: string;
  driver: Driver[];
  startTime: string;
  endTime: string;
  seats: number;
  createdAt: string;
}

function ShuttlesPage() {
  const [shuttles, setShuttles] = useState<Shuttle[]>([]);
  const [selectedShuttle, setSelectedShuttle] = useState<Shuttle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShuttles = async () => {
      try {
        const response = await fetchWithAuth("/frontdesk/shuttle");
        const data = await response.json();
        setShuttles(data.shuttles);
      } catch (error) {
        console.error("Error fetching shuttles:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchShuttles();
  }, []);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shuttles</h1>
          <p className="text-gray-600">Manage your shuttle fleet</p>
        </div>

        {/* Desktop Table */}
        <Card className="hidden md:block">
          <CardHeader>
            <CardTitle>Shuttle Fleet</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle Number</TableHead>
                  <TableHead>Driver Name</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>End Time</TableHead>
                  <TableHead>Total Seats</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableLoader columns={6} />
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Mobile Cards */}
        <div className="grid gap-4 md:hidden">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Shuttles</h1>
        <p className="text-gray-600">Manage your shuttle fleet</p>
      </div>

      {shuttles.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Truck}
              title="No shuttles available"
              description="Add your first shuttle to start managing your fleet."
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop Table */}
          <Card className="hidden md:block">
            <CardHeader>
              <CardTitle>Shuttle Fleet</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle Number</TableHead>
                    <TableHead>Driver Name</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>End Time</TableHead>
                    <TableHead>Total Seats</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shuttles.map((shuttle) => (
                    <TableRow key={shuttle.id}>
                      <TableCell className="font-medium">
                        {shuttle.vehicleNumber}
                      </TableCell>
                      <TableCell>
                        {shuttle.driver[0]?.name || "No Driver Assigned"}
                      </TableCell>
                      <TableCell>{formatTime(shuttle.startTime)}</TableCell>
                      <TableCell>{formatTime(shuttle.endTime)}</TableCell>
                      <TableCell>{shuttle.seats}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedShuttle(shuttle)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Mobile Cards */}
          <div className="grid gap-4 md:hidden">
            {shuttles.map((shuttle) => (
              <Card key={shuttle.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">{shuttle.vehicleNumber}</h3>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>
                      <span className="font-medium">Driver:</span>{" "}
                      {shuttle.driver[0]?.name || "No Driver Assigned"}
                    </p>
                    <p>
                      <span className="font-medium">Schedule:</span>{" "}
                      {formatTime(shuttle.startTime)} -{" "}
                      {formatTime(shuttle.endTime)}
                    </p>
                    <p>
                      <span className="font-medium">Seats:</span>{" "}
                      {shuttle.seats}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => setSelectedShuttle(shuttle)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Shuttle Details Modal */}
      <Dialog
        open={!!selectedShuttle}
        onOpenChange={() => setSelectedShuttle(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Shuttle Details</DialogTitle>
          </DialogHeader>
          {selectedShuttle && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Vehicle Number
                  </label>
                  <p className="font-semibold">
                    {selectedShuttle.vehicleNumber}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Driver Name
                  </label>
                  <p className="font-semibold">
                    {selectedShuttle.driver[0]?.name || "No Driver Assigned"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Phone
                  </label>
                  <p className="font-semibold">
                    {selectedShuttle.driver[0]?.phoneNumber || "N/A"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Start Time
                  </label>
                  <p className="font-semibold">
                    {formatTime(selectedShuttle.startTime)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    End Time
                  </label>
                  <p className="font-semibold">
                    {formatTime(selectedShuttle.endTime)}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Total Seats
                  </label>
                  <p className="font-semibold">{selectedShuttle.seats}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default withAuth(ShuttlesPage);
