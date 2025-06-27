"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { Eye, Truck } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";
import { withAuth } from "@/components/withAuth";
import { TableLoader } from "@/components/ui/table-loader";
import { EmptyState } from "@/components/ui/empty-state";

interface Shuttle {
  id: string;
  vehicleNumber: string;
  hotelId: number;
  seats: number;
  createdAt: string;
  schedules?: Schedule[];
  currentPassengers?: number;
  availableSeats?: number;
  utilization?: number;
  isAvailable?: boolean;
}

interface Schedule {
  id: string;
  startTime: string;
  endTime: string;
  driver: {
    id: string;
    name: string;
    phoneNumber: string;
  };
}

function ShuttlesPage() {
  const [shuttles, setShuttles] = useState<Shuttle[]>([]);
  const [selectedShuttle, setSelectedShuttle] = useState<Shuttle | null>(null);
  const [loading, setLoading] = useState(true);
  const [capacityStatus, setCapacityStatus] = useState<any>(null);

  // Helper function to format time in UTC to avoid timezone issues
  const formatTimeForDisplay = (isoString: string | null | undefined) => {
    if (!isoString) return "";
    
    // Parse the ISO string and extract the time in UTC
    const date = new Date(isoString);
    
    // Get UTC hours and minutes to avoid timezone conversion
    const hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();
    
    // Convert to 12-hour format
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  useEffect(() => {
    const fetchShuttles = async () => {
      try {
        setLoading(true);
        const response = await fetchWithAuth("/frontdesk/get/shuttle");
        setShuttles(response.shuttles);
        
        // Also fetch capacity status
        const capacityResponse = await fetchWithAuth("/frontdesk/shuttle-capacity-status");
        setCapacityStatus(capacityResponse);
      } catch (error) {
        console.error("Error fetching shuttles:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchShuttles();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Shuttles Management
          </h1>
          <p className="text-slate-600">View shuttle fleet information</p>
        </div>
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Truck className="w-5 h-5 text-orange-600" />
              <span>Shuttles Fleet</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle Number</TableHead>
                  <TableHead>Seats</TableHead>
                  <TableHead>Capacity Status</TableHead>
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
          Shuttles Management
        </h1>
        <p className="text-slate-600">View shuttle fleet information</p>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Truck className="w-5 h-5 text-orange-600" />
            <span>Shuttles Fleet</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!shuttles || shuttles.length === 0 ? (
            <EmptyState
              icon={Truck}
              title="No shuttles available"
              description="No shuttles have been assigned to this hotel yet."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle Number</TableHead>
                  <TableHead>Seats</TableHead>
                  <TableHead>Capacity Status</TableHead>
                  <TableHead>Assigned Schedules</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shuttles &&
                  shuttles.map((shuttle) => (
                    <TableRow key={shuttle.id}>
                      <TableCell className="font-medium">
                        {shuttle.vehicleNumber}
                      </TableCell>
                      <TableCell>{shuttle.seats} seats</TableCell>
                      <TableCell>
                        {capacityStatus && capacityStatus.shuttles ? (
                          <div className="space-y-1">
                            {capacityStatus.shuttles
                              .filter((cs: any) => cs.shuttleId === shuttle.id)
                              .map((cs: any) => (
                                <div key={cs.shuttleId} className="text-sm">
                                  <div className="flex items-center space-x-2">
                                    <span className={`w-2 h-2 rounded-full ${cs.isAvailable ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                    <span>{cs.currentPassengers}/{cs.totalSeats} passengers</span>
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {cs.availableSeats} seats available ({cs.utilization}% full)
                                  </div>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <span className="text-slate-400">Loading capacity...</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {shuttle.schedules && shuttle.schedules.length > 0 ? (
                          <div className="space-y-1">
                            {shuttle.schedules.map((schedule) => (
                              <Badge
                                key={schedule.id}
                                variant="secondary"
                                className="mr-1"
                              >
                                {schedule.driver.name}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400">No schedules</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(shuttle.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedShuttle(shuttle)}
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
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Total Seats
                  </label>
                  <p className="font-semibold">{selectedShuttle.seats}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Assigned Schedules
                </label>
                {selectedShuttle.schedules &&
                selectedShuttle.schedules.length > 0 ? (
                  <div className="space-y-2 mt-2">
                    {selectedShuttle.schedules.map((schedule) => (
                      <div key={schedule.id} className="border rounded-lg p-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-medium text-gray-500">
                              Driver Name
                            </label>
                            <p className="font-medium">
                              {schedule.driver.name}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-500">
                              Phone
                            </label>
                            <p className="font-medium">
                              {schedule.driver.phoneNumber}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-2">
                          <div>
                            <label className="text-xs font-medium text-gray-500">
                              Start Time
                            </label>
                            <p className="font-medium">
                              {formatTimeForDisplay(schedule.startTime)}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-500">
                              End Time
                            </label>
                            <p className="font-medium">
                              {formatTimeForDisplay(schedule.endTime)}
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
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Created At
                </label>
                <p className="font-semibold">
                  {new Date(selectedShuttle.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default withAuth(ShuttlesPage);
