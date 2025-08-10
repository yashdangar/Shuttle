"use client";

import type React from "react";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Eye, Truck, Search, RefreshCw, Users, Gauge, Clock, Phone, User } from "lucide-react";
import { api } from "@/lib/api";
import { withAuth } from "@/components/withAuth";
import { TableLoader } from "@/components/ui/table-loader";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

interface Shuttle {
  id: string;
  vehicleNumber: string;
  hotelId: number;
  seats: number;
  createdAt?: string;
  schedules?: Schedule[];
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
  const [searchQuery, setSearchQuery] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("vehicle");

  // Display timezone
  const DISPLAY_TZ = "Asia/Kolkata";

  // Helper: format time in hotel timezone (IST)
  const formatTimeForDisplay = (isoString: string | null | undefined) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: DISPLAY_TZ,
    });
  };

  // Helper: compare dates by day in a specific timezone
  const isSameDateInTimeZone = (d1: Date, d2: Date, tz: string) => {
    const fmt: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: tz,
    };
    const a = d1.toLocaleDateString("en-CA", fmt); // YYYY-MM-DD
    const b = d2.toLocaleDateString("en-CA", fmt);
    return a === b;
  };

  const getTodaysSchedules = (schedules?: Schedule[]) => {
    if (!schedules || schedules.length === 0) return [] as Schedule[];
    const today = new Date();
    return schedules.filter((s) =>
      isSameDateInTimeZone(new Date(s.startTime), today, DISPLAY_TZ)
    );
  };

  useEffect(() => {
    const fetchShuttles = async () => {
      try {
        setLoading(true);
        const response = await api.get("/admin/get/shuttle");
        setShuttles(response.shuttles);
        // Admin API does not expose capacity status; leave as null to show "No capacity data"
        setCapacityStatus(null);
      } catch (error) {
        console.error("Error fetching shuttles:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchShuttles();
  }, []);

  const handleRefresh = async () => {
    try {
      setLoading(true);
      const response = await api.get("/admin/get/shuttle");
      setShuttles(response.shuttles);
      setCapacityStatus(null);
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCapacityForShuttle = (shuttleId: string) => {
    return capacityStatus?.shuttles?.find((cs: any) => cs.shuttleId === shuttleId);
  };

  const filteredAndSortedShuttles = useMemo(() => {
    let result = [...(shuttles || [])];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s) => s.vehicleNumber.toLowerCase().includes(q));
    }

    // Availability filter
    if (availabilityFilter !== "all") {
      result = result.filter((s) => {
        const cs = getCapacityForShuttle(s.id);
        if (!cs) return availabilityFilter === "all"; // keep when no data only if 'all'
        return availabilityFilter === "available" ? !!cs.isAvailable : !cs.isAvailable;
      });
    }

    // Sort
    if (sortBy === "utilization_desc" || sortBy === "utilization_asc") {
      result.sort((a, b) => {
        const ca = getCapacityForShuttle(a.id);
        const cb = getCapacityForShuttle(b.id);
        const ua = ca?.utilization ?? -1; // items without data go last
        const ub = cb?.utilization ?? -1;
        return sortBy === "utilization_desc" ? ub - ua : ua - ub;
      });
    } else if (sortBy === "vehicle") {
      result.sort((a, b) => a.vehicleNumber.localeCompare(b.vehicleNumber));
    }

    return result;
  }, [shuttles, capacityStatus, searchQuery, availabilityFilter, sortBy]);

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
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Truck className="w-5 h-5 text-orange-600" />
              <span>Shuttles Fleet</span>
            </CardTitle>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <Skeleton className="h-9 w-full sm:w-64" />
              <Skeleton className="h-9 sm:w-[160px]" />
              <Skeleton className="h-9 sm:w-[170px]" />
              <Skeleton className="h-9 sm:w-[110px]" />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle Number</TableHead>
                  <TableHead>Seats</TableHead>
                  <TableHead>Capacity Status</TableHead>
                  <TableHead>Assigned Schedules</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableLoader columns={5} />
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
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Truck className="w-5 h-5 text-orange-600" />
            <span>Shuttles Fleet</span>
          </CardTitle>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search vehicle..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
              <SelectTrigger className="sm:w-[160px]">
                <SelectValue placeholder="Availability" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="full">Full/Unavailable</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="sm:w-[170px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vehicle">Vehicle (A–Z)</SelectItem>
                <SelectItem value="utilization_desc">Utilization (High→Low)</SelectItem>
                <SelectItem value="utilization_asc">Utilization (Low→High)</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleRefresh} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!filteredAndSortedShuttles || filteredAndSortedShuttles.length === 0 ? (
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
                  {/* <TableHead>Created At</TableHead> */}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedShuttles &&
                  filteredAndSortedShuttles.map((shuttle) => {
                    const cs = getCapacityForShuttle(shuttle.id);
                    const utilization = Math.max(0, Math.min(100, cs?.utilization ?? 0));
                    return (
                    <TableRow key={shuttle.id}>
                      <TableCell className="font-medium">
                        {shuttle.vehicleNumber}
                      </TableCell>
                      <TableCell>{shuttle.seats} seats</TableCell>
                      <TableCell>
                        {cs ? (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={`h-2 w-2 rounded-full ${cs.isAvailable ? "bg-green-500" : "bg-red-500"}`} />
                                <span className="text-sm font-medium">
                                  {cs.currentPassengers}/{cs.totalSeats} passengers
                                </span>
                              </div>
                              <span className="text-xs text-gray-500">{utilization}%</span>
                            </div>
                            <Progress value={utilization} />
                            <div className="text-xs text-gray-500">
                              {cs.availableSeats} seats available
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">No capacity data</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const todays = getTodaysSchedules(shuttle.schedules);
                          return todays.length > 0 ? (
                            <div className="space-y-1">
                              {todays.map((schedule) => (
                                <div key={schedule.id} className="flex items-center gap-2 text-sm">
                                  <Badge variant="secondary">{schedule.driver.name}</Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {formatTimeForDisplay(schedule.startTime)} – {formatTimeForDisplay(schedule.endTime)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400">No schedules today</span>
                          );
                        })()}
                      </TableCell>
                      {/* <TableCell>
                        {new Date(shuttle.createdAt).toLocaleDateString()}
                      </TableCell> */}
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
                    );
                  })}
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
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-orange-600" />
                Shuttle Details
              </span>
              {selectedShuttle && (() => {
                const cs = getCapacityForShuttle(selectedShuttle.id);
                return cs ? (
                  <Badge variant="outline" className={`ml-2 ${cs.isAvailable ? 'text-green-700 border-green-300 bg-green-50' : 'text-red-700 border-red-300 bg-red-50'}`}>
                    {cs.isAvailable ? 'Available' : 'Full/Unavailable'}
                  </Badge>
                ) : null;
              })()}
            </DialogTitle>
          </DialogHeader>
          {selectedShuttle && (() => {
            const cs = getCapacityForShuttle(selectedShuttle.id);
            const utilization = Math.max(0, Math.min(100, cs?.utilization ?? 0));
            return (
              <div className="space-y-6">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-semibold tracking-tight">{selectedShuttle.vehicleNumber}</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                        <Users className="h-3.5 w-3.5" /> {selectedShuttle.seats} seats
                      </span>
                    </div>
                  </div>
                  {cs && (
                    <div className="rounded-lg border p-4">
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Gauge className="h-4 w-4" /> Utilization
                        </span>
                        <span className="font-medium">{utilization}%</span>
                      </div>
                      <Progress value={utilization} />
                      <div className="mt-2 grid grid-cols-3 gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1"><Users className="h-4 w-4" /> {cs.currentPassengers}/{cs.totalSeats} passengers</div>
                        <div className="flex items-center gap-1"><User className="h-4 w-4" /> {cs.availableSeats} available</div>
                        <div className="flex items-center gap-1"><Clock className="h-4 w-4" /> {cs.hasActiveSchedule ? 'Active schedule' : 'No active schedule'}</div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Today's Assigned Schedules</label>
                    <span className="text-xs text-muted-foreground">{getTodaysSchedules(selectedShuttle.schedules).length} total</span>
                  </div>
                  {getTodaysSchedules(selectedShuttle.schedules).length > 0 ? (
                    <div className="space-y-2">
                      {getTodaysSchedules(selectedShuttle.schedules).map((schedule) => (
                        <div key={schedule.id} className="flex items-center justify-between rounded-lg border p-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback>{schedule.driver.name?.slice(0,2)?.toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{schedule.driver.name}</span>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {formatTimeForDisplay(schedule.startTime)} – {formatTimeForDisplay(schedule.endTime)}</span>
                              </div>
                              {schedule.driver.phoneNumber && (
                                <a href={`tel:${schedule.driver.phoneNumber}`} className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                                  <Phone className="h-3.5 w-3.5" /> {schedule.driver.phoneNumber}
                                </a>
                              )}
                            </div>
                          </div>
                          <Badge variant="secondary">Driver</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    
                    <p className="text-slate-400">No schedules assigned today</p>
                  )}
                </div>

                <Separator />

                <div>
                  <label className="text-sm font-medium text-gray-700">Created At</label>
                  <p className="font-medium">
                    {selectedShuttle.createdAt
                      ? new Date(selectedShuttle.createdAt).toLocaleDateString()
                      : "Not available"}
                  </p>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default withAuth(ShuttlesPage);
