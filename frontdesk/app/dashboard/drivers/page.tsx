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
import { Eye, Users } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";
import { withAuth } from "@/components/withAuth";
import { Loader } from "@/components/ui/loader";
import { TableLoader } from "@/components/ui/table-loader";
import { EmptyState } from "@/components/ui/empty-state";

interface Shuttle {
  id: number;
  vehicleNumber: string;
}

interface Driver {
  id: number;
  name: string;
  phoneNumber: string;
  startTime: string;
  endTime: string;
  shuttle: Shuttle | null;
}

function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const response = await fetchWithAuth("/frontdesk/driver");
        const data = await response.json();
        setDrivers(data.drivers);
      } catch (error) {
        console.error("Error fetching drivers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDrivers();
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
          <h1 className="text-2xl font-bold text-gray-900">Drivers</h1>
          <p className="text-gray-600">Manage your driver team</p>
        </div>

        {/* Desktop Table */}
        <Card className="hidden md:block">
          <CardHeader>
            <CardTitle>Driver Team</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Driver Name</TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>End Time</TableHead>
                  <TableHead>Assigned Shuttle</TableHead>
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
        <h1 className="text-2xl font-bold text-gray-900">Drivers</h1>
        <p className="text-gray-600">Manage your driver team</p>
      </div>

      {drivers.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Users}
              title="No drivers available"
              description="Add your first driver to start managing your team."
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop Table */}
          <Card className="hidden md:block">
            <CardHeader>
              <CardTitle>Driver Team</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver Name</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>End Time</TableHead>
                    <TableHead>Assigned Shuttle</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers.map((driver) => (
                    <TableRow key={driver.id}>
                      <TableCell className="font-medium">
                        {driver.name}
                      </TableCell>
                      <TableCell>{driver.phoneNumber}</TableCell>
                      <TableCell>{formatTime(driver.startTime)}</TableCell>
                      <TableCell>{formatTime(driver.endTime)}</TableCell>
                      <TableCell>
                        {driver.shuttle?.vehicleNumber || "Not Assigned"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedDriver(driver)}
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
            {drivers.map((driver) => (
              <Card key={driver.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">{driver.name}</h3>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>
                      <span className="font-medium">Phone:</span>{" "}
                      {driver.phoneNumber}
                    </p>
                    <p>
                      <span className="font-medium">Schedule:</span>{" "}
                      {formatTime(driver.startTime)} -{" "}
                      {formatTime(driver.endTime)}
                    </p>
                    <p>
                      <span className="font-medium">Shuttle:</span>{" "}
                      {driver.shuttle?.vehicleNumber || "Not Assigned"}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => setSelectedDriver(driver)}
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

      {/* Driver Details Modal */}
      <Dialog
        open={!!selectedDriver}
        onOpenChange={() => setSelectedDriver(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Driver Details</DialogTitle>
          </DialogHeader>
          {selectedDriver && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Name
                  </label>
                  <p className="font-semibold">{selectedDriver.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Phone
                  </label>
                  <p className="font-semibold">{selectedDriver.phoneNumber}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Start Time
                  </label>
                  <p className="font-semibold">
                    {formatTime(selectedDriver.startTime)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    End Time
                  </label>
                  <p className="font-semibold">
                    {formatTime(selectedDriver.endTime)}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Assigned Shuttle
                </label>
                <p className="font-semibold">
                  {selectedDriver.shuttle?.vehicleNumber || "Not Assigned"}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default withAuth(DriversPage);
