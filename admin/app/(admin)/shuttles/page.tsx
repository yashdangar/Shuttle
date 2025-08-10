"use client";

import type React from "react";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Eye, Truck, Search, RefreshCw, Users, Gauge, Clock, Phone, User, Pencil, Trash2, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { withAuth } from "@/components/withAuth";
import { TableLoader } from "@/components/ui/table-loader";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

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
  const [adminHotelId, setAdminHotelId] = useState<number | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formVehicle, setFormVehicle] = useState("");
  const [formSeats, setFormSeats] = useState<string>("");

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
        // Get admin to know hotelId
        const adminRes = await api.get("/admin");
        setAdminHotelId(adminRes?.admin?.hotelId ?? null);

        const shuttleRes = await api.get("/admin/get/shuttle");
        const fetchedShuttles: Shuttle[] = shuttleRes.shuttles;
        setShuttles(fetchedShuttles);

        // Fetch bookings and compute capacity per shuttle
        const bookingsRes = await api.get("/admin/bookings");
        const bookings = bookingsRes.bookings || [];
        const capacityArray = computeCapacityFromBookings(fetchedShuttles, bookings);
        setCapacityStatus({ shuttles: capacityArray });
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
      const shuttleRes = await api.get("/admin/get/shuttle");
      const fetchedShuttles: Shuttle[] = shuttleRes.shuttles;
      setShuttles(fetchedShuttles);

      const bookingsRes = await api.get("/admin/bookings");
      const bookings = bookingsRes.bookings || [];
      const capacityArray = computeCapacityFromBookings(fetchedShuttles, bookings);
      setCapacityStatus({ shuttles: capacityArray });
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Compute capacity using admin bookings API
  const computeCapacityFromBookings = (shuttleList: Shuttle[], bookings: any[]) => {
    const now = new Date();
    return shuttleList.map((shuttle) => {
      const relevantBookings = bookings.filter(
        (b: any) => b.shuttle && b.shuttle.id === shuttle.id && !b.isCompleted && !b.isCancelled
      );
      const currentPassengers = relevantBookings.reduce(
        (sum: number, b: any) => sum + (b.numberOfPersons || 0),
        0
      );
      // Determine active schedule
      let hasActiveSchedule = false;
      if (shuttle.schedules && shuttle.schedules.length > 0) {
        for (const s of shuttle.schedules) {
          const start = new Date(s.startTime);
          const end = new Date(s.endTime);
          if (now >= start && now <= end) {
            hasActiveSchedule = true;
            break;
          }
        }
      }
      const totalSeats = shuttle.seats;
      const availableSeats = Math.max(0, totalSeats - currentPassengers);
      const utilization = totalSeats > 0 ? Math.round((currentPassengers / totalSeats) * 100) : 0;
      return {
        shuttleId: shuttle.id,
        vehicleNumber: shuttle.vehicleNumber,
        totalSeats,
        currentPassengers,
        availableSeats,
        utilization,
        isAvailable: hasActiveSchedule && availableSeats > 0,
        hasActiveSchedule,
      };
    });
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormVehicle("");
    setFormSeats("");
    setManageOpen(true);
  };

  const openEditModal = (shuttle: Shuttle) => {
    setEditingId(Number(shuttle.id));
    setFormVehicle(shuttle.vehicleNumber || "");
    setFormSeats(String(shuttle.seats || ""));
    setManageOpen(true);
  };

  const submitManage = async () => {
    try {
      if (!formVehicle.trim() || !formSeats.trim()) return;
      const payload: any = {
        vehicleNumber: formVehicle.trim(),
        seats: parseInt(formSeats, 10),
        hotelId: adminHotelId,
      };
      if (editingId) {
        await api.put(`/admin/edit/shuttle/${editingId}`, payload);
      } else {
        await api.post("/admin/add/shuttle", payload);
      }
      setManageOpen(false);
      await handleRefresh();
    } catch (error) {
      console.error("Error saving shuttle:", error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const ok = window.confirm("Delete this shuttle? This cannot be undone.");
      if (!ok) return;
      await api.delete(`/admin/delete/shuttle/${id}`);
      await handleRefresh();
    } catch (error) {
      console.error("Error deleting shuttle:", error);
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
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
      >
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
      </motion.div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Shuttles Management
        </h1>
        <p className="text-slate-600">View shuttle fleet information</p>
      </div>

      <Card className="border-slate-200">
        <CardHeader className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center space-x-2">
              <Truck className="w-5 h-5 text-orange-600" />
              <span>Shuttles Fleet</span>
            </CardTitle>
            <Button onClick={openAddModal} className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Shuttle</span>
            </Button>
          </div>
          <motion.div
            className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.06, delayChildren: 0.05 },
              },
            }}
          >
            <motion.div
              className="relative w-full sm:w-64"
              variants={{ hidden: { y: 6, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search vehicle..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </motion.div>
            <motion.div
              variants={{ hidden: { y: 6, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
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
            </motion.div>
            <motion.div
              variants={{ hidden: { y: 6, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
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
            </motion.div>
            <motion.div
              variants={{ hidden: { y: 6, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <Button variant="outline" onClick={handleRefresh} className="gap-2">
                <RefreshCw className="h-4 w-4" /> Refresh
              </Button>
            </motion.div>
          </motion.div>
        </CardHeader>
        <CardContent>
          {!filteredAndSortedShuttles || filteredAndSortedShuttles.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <EmptyState
                icon={Truck}
                title="No shuttles available"
                description="No shuttles have been assigned to this hotel yet."
              />
            </motion.div>
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
                  filteredAndSortedShuttles.map((shuttle, index) => {
                    const cs = getCapacityForShuttle(shuttle.id);
                    const utilization = Math.max(0, Math.min(100, cs?.utilization ?? 0));
                    return (
                    <motion.tr
                      key={shuttle.id}
                      className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, ease: "easeOut", delay: index * 0.03 }}
                    >
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
                                <motion.div
                                  key={schedule.id}
                                  className="flex items-center gap-2 text-sm"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <Badge variant="secondary">{schedule.driver.name}</Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {formatTimeForDisplay(schedule.startTime)} – {formatTimeForDisplay(schedule.endTime)}
                                  </span>
                                </motion.div>
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
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedShuttle(shuttle)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label="Edit shuttle"
                            title="Edit shuttle"
                            onClick={() => openEditModal(shuttle)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            aria-label="Delete shuttle"
                            title="Delete shuttle"
                            onClick={() => handleDelete(Number(shuttle.id))}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
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
              <motion.div
                className="space-y-6"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
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
                    <motion.div
                      className="rounded-lg border p-4"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                    >
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
                    </motion.div>
                  )}
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Today's Assigned Schedules</label>
                    <span className="text-xs text-muted-foreground">{getTodaysSchedules(selectedShuttle.schedules).length} total</span>
                  </div>
                  {getTodaysSchedules(selectedShuttle.schedules).length > 0 ? (
                    <div className="space-y-2">
                      {getTodaysSchedules(selectedShuttle.schedules).map((schedule, i) => (
                        <motion.div
                          key={schedule.id}
                          className="flex items-center justify-between rounded-lg border p-3"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: i * 0.04 }}
                        >
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
                        </motion.div>
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
              </motion.div>
            );
          })()}
        </DialogContent>
      </Dialog>
      {/* Add/Edit Shuttle Modal */}
      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Shuttle" : "Add Shuttle"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vehicle">Vehicle Number</Label>
              <Input
                id="vehicle"
                placeholder="e.g., MH12 AB 1234"
                value={formVehicle}
                onChange={(e) => setFormVehicle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seats">Seats</Label>
              <Input
                id="seats"
                type="number"
                min={1}
                value={formSeats}
                onChange={(e) => setFormSeats(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setManageOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitManage} disabled={!formVehicle || !formSeats}>
                {editingId ? "Save" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

export default withAuth(ShuttlesPage);
