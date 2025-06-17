"use client";

import type React from "react";

import { useEffect, useState } from "react";
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
import { Eye, User } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";
import { withAuth } from "@/components/withAuth";
import { TableLoader } from "@/components/ui/table-loader";
import { EmptyState } from "@/components/ui/empty-state";

interface Driver {
  id: string;
  name: string;
  phoneNumber: string;
  email: string;
  createdAt: string;
  schedules?: Schedule[];
}

interface Schedule {
  id: string;
  startTime: string;
  endTime: string;
  shuttle: {
    id: string;
    vehicleNumber: string;
  };
}

function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>();
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Drivers Management
          </h1>
          <p className="text-slate-600">
            View shuttle drivers and their information
          </p>
        </div>
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="w-5 h-5 text-blue-600" />
              <span>Drivers List</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Assigned Schedules</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableLoader columns={6} />
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Drivers Management
        </h1>
        <p className="text-slate-600">
          View shuttle drivers and their information
        </p>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="w-5 h-5 text-blue-600" />
            <span>Drivers List</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!drivers || drivers.length === 0 ? (
            <EmptyState
              icon={User}
              title="No drivers available"
              description="No drivers have been assigned to this hotel yet."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Assigned Schedules</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drivers?.map((driver) => (
                  <TableRow key={driver.id}>
                    <TableCell className="font-medium">{driver.name}</TableCell>
                    <TableCell>{driver.email}</TableCell>
                    <TableCell>{driver.phoneNumber}</TableCell>
                    <TableCell>
                      {driver.schedules && driver.schedules.length > 0 ? (
                        <div className="space-y-1">
                          {driver.schedules.map((schedule) => (
                            <Badge
                              key={schedule.id}
                              variant="secondary"
                              className="mr-1"
                            >
                              {schedule.shuttle.vehicleNumber}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400">No schedules</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(driver.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedDriver(driver)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
                    Email
                  </label>
                  <p className="font-semibold">{selectedDriver.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Phone
                  </label>
                  <p className="font-semibold">{selectedDriver.phoneNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Created At
                  </label>
                  <p className="font-semibold">
                    {new Date(selectedDriver.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Assigned Schedules
                </label>
                {selectedDriver.schedules &&
                selectedDriver.schedules.length > 0 ? (
                  <div className="space-y-2 mt-2">
                    {selectedDriver.schedules.map((schedule) => (
                      <div key={schedule.id} className="border rounded-lg p-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-medium text-gray-500">
                              Shuttle
                            </label>
                            <p className="font-medium">
                              {schedule.shuttle.vehicleNumber}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-2">
                          <div>
                            <label className="text-xs font-medium text-gray-500">
                              Start Time
                            </label>
                            <p className="font-medium">
                              {new Date(schedule.startTime).toLocaleTimeString(
                                "en-US",
                                {
                                  hour: "numeric",
                                  minute: "2-digit",
                                  hour12: true,
                                }
                              )}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-500">
                              End Time
                            </label>
                            <p className="font-medium">
                              {new Date(schedule.endTime).toLocaleTimeString(
                                "en-US",
                                {
                                  hour: "numeric",
                                  minute: "2-digit",
                                  hour12: true,
                                }
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 mt-2">No schedules assigned</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default withAuth(DriversPage);
