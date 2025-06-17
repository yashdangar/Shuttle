"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, TableIcon, BarChart3 } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";
import { TableLoader } from "@/components/ui/table-loader";
import { EmptyState } from "@/components/ui/empty-state";
import { withAuth } from "@/components/withAuth";

interface Schedule {
  id: string;
  startTime: string;
  endTime: string;
  driver: {
    id: string;
    name: string;
    email: string;
  };
  shuttle: {
    id: string;
    vehicleNumber: string;
    seats: number;
  };
}

interface Driver {
  id: string;
  name: string;
  email: string;
}

interface Shuttle {
  id: string;
  vehicleNumber: string;
  seats: number;
}

interface TimelineSchedule extends Schedule {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  duration: number;
  color: string;
}

function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [shuttles, setShuttles] = useState<Shuttle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(
    null
  );

  const formatTimeForDisplay = (isoString: string | null | undefined) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateForDisplay = (isoString: string | null | undefined) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleDateString();
  };

  // Generate colors for different shuttles
  const getShuttleColor = (shuttleId: string | number) => {
    const colors = [
      "bg-blue-100 border-blue-300 text-blue-800",
      "bg-green-100 border-green-300 text-green-800",
      "bg-purple-100 border-purple-300 text-purple-800",
      "bg-orange-100 border-orange-300 text-orange-800",
      "bg-pink-100 border-pink-300 text-pink-800",
      "bg-indigo-100 border-indigo-300 text-indigo-800",
      "bg-red-100 border-red-300 text-red-800",
      "bg-yellow-100 border-yellow-300 text-yellow-800",
    ];
    const hash = String(shuttleId)
      .split("")
      .reduce((a, b) => {
        a = (a << 5) - a + b.charCodeAt(0);
        return a & a;
      }, 0);
    return colors[Math.abs(hash) % colors.length];
  };

  // Convert schedules to timeline format
  const getTimelineSchedules = (): TimelineSchedule[] => {
    if (!schedules) return [];

    return schedules.map((schedule) => {
      const startDate = new Date(schedule.startTime);
      const endDate = new Date(schedule.endTime);

      return {
        ...schedule,
        startHour: startDate.getHours(),
        startMinute: startDate.getMinutes(),
        endHour: endDate.getHours(),
        endMinute: endDate.getMinutes(),
        duration: (endDate.getTime() - startDate.getTime()) / (1000 * 60), // duration in minutes
        color: getShuttleColor(schedule.shuttle.id),
      };
    });
  };

  // Generate hour markers for timeline
  const generateHourMarkers = () => {
    const hours = [];
    for (let i = 0; i < 24; i++) {
      hours.push({
        hour: i,
        label: i.toString().padStart(2, "0") + ":00",
        position: (i / 24) * 100, // percentage position
      });
    }
    return hours;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [schedulesRes, driversRes, shuttlesRes] = await Promise.all([
          fetchWithAuth("/frontdesk/schedule"),
          fetchWithAuth("/frontdesk/driver"),
          fetchWithAuth("/frontdesk/shuttle"),
        ]);

        const schedulesData = await schedulesRes.json();
        const driversData = await driversRes.json();
        const shuttlesData = await shuttlesRes.json();

        setSchedules(schedulesData.schedules);
        setDrivers(driversData.drivers);
        setShuttles(shuttlesData.shuttles);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Schedules Management
            </h1>
            <p className="text-slate-600">View driver and shuttle schedules</p>
          </div>
        </div>
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              <span>Schedules Overview</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full">
              {/* Loading Tabs Skeleton */}
              <div className="grid w-full grid-cols-2 h-auto mb-6 bg-slate-100 rounded-lg p-1">
                <div className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm py-2 lg:py-3 px-3 bg-white rounded-md shadow-sm">
                  <div className="w-3 h-3 lg:w-4 lg:h-4 bg-slate-300 rounded animate-pulse"></div>
                  <div className="hidden sm:block w-20 h-4 bg-slate-300 rounded animate-pulse"></div>
                  <div className="sm:hidden w-16 h-4 bg-slate-300 rounded animate-pulse"></div>
                </div>
                <div className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm py-2 lg:py-3 px-3">
                  <div className="w-3 h-3 lg:w-4 lg:h-4 bg-slate-300 rounded animate-pulse"></div>
                  <div className="hidden sm:block w-16 h-4 bg-slate-300 rounded animate-pulse"></div>
                  <div className="sm:hidden w-12 h-4 bg-slate-300 rounded animate-pulse"></div>
                </div>
              </div>

              {/* Loading Timeline Content */}
              <div className="space-y-4 lg:space-y-6">
                {/* Legend Skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-2 lg:gap-4 p-3 lg:p-4 bg-slate-50 rounded-lg">
                  <div className="w-32 h-4 bg-slate-300 rounded animate-pulse col-span-full lg:w-full mb-1 lg:mb-2"></div>
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 min-w-0"
                    >
                      <div className="w-3 h-3 lg:w-4 lg:h-4 rounded border-2 bg-slate-300 animate-pulse flex-shrink-0"></div>
                      <div className="w-16 h-3 bg-slate-300 rounded animate-pulse"></div>
                      <div className="w-12 h-3 bg-slate-300 rounded animate-pulse flex-shrink-0"></div>
                    </div>
                  ))}
                </div>

                {/* Mobile scroll hint skeleton */}
                <div className="block xl:hidden text-xs text-slate-500 text-center py-2 bg-blue-50 rounded border border-blue-200">
                  <div className="w-48 h-3 bg-slate-300 rounded animate-pulse mx-auto"></div>
                </div>

                {/* Timeline Container Skeleton */}
                <div className="relative bg-white border border-slate-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <div className="min-w-[1200px] p-3 lg:p-6">
                      {/* Hour markers skeleton */}
                      <div className="relative h-6 lg:h-8 border-b border-slate-200 mb-3 lg:mb-4">
                        {Array.from({ length: 24 }).map((_, i) => (
                          <div
                            key={i}
                            className="absolute text-[10px] lg:text-xs -translate-x-1/2"
                            style={{ left: `${(i / 24) * 100}%` }}
                          >
                            <div className="w-8 h-3 bg-slate-300 rounded animate-pulse"></div>
                          </div>
                        ))}
                      </div>

                      {/* Timeline tracks skeleton */}
                      <div className="space-y-3 lg:space-y-4">
                        {Array.from({ length: 3 }).map((_, index) => (
                          <div key={index} className="relative">
                            {/* Shuttle header skeleton */}
                            <div className="flex items-center mb-2">
                              <div className="w-2 h-2 lg:w-3 lg:h-3 rounded border-2 mr-2 flex-shrink-0 bg-slate-300 animate-pulse"></div>
                              <div className="w-20 h-4 bg-slate-300 rounded animate-pulse"></div>
                              <div className="w-16 h-3 bg-slate-300 rounded animate-pulse ml-2"></div>
                            </div>
                            {/* Timeline track skeleton */}
                            <div className="relative h-12 lg:h-16 bg-slate-50 border border-slate-200 rounded-lg mb-2">
                              <div className="absolute top-2 left-4 right-4 bottom-2 bg-slate-300 rounded animate-pulse"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const timelineSchedules = getTimelineSchedules();
  const hourMarkers = generateHourMarkers();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Schedules Management
          </h1>
          <p className="text-slate-600">View driver and shuttle schedules</p>
        </div>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            <span>Schedules Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="timeline" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-auto">
              <TabsTrigger
                value="timeline"
                className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm py-2 lg:py-3"
              >
                <BarChart3 className="w-3 h-3 lg:w-4 lg:h-4" />
                <span className="hidden sm:inline">Timeline View</span>
                <span className="sm:hidden">Timeline</span>
              </TabsTrigger>
              <TabsTrigger
                value="table"
                className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm py-2 lg:py-3"
              >
                <TableIcon className="w-3 h-3 lg:w-4 lg:h-4" />
                <span className="hidden sm:inline">Table View</span>
                <span className="sm:hidden">Table</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="mt-6">
              {!schedules || schedules.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  title="No schedules available"
                  description="No schedules have been created for this hotel yet."
                />
              ) : (
                <div className="space-y-4 lg:space-y-6">
                  {/* Legend */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-2 lg:gap-4 p-3 lg:p-4 bg-slate-50 rounded-lg">
                    <h3 className="font-semibold text-slate-900 col-span-full lg:w-full mb-1 lg:mb-2 text-sm lg:text-base">
                      Shuttles Legend:
                    </h3>
                    {shuttles.map((shuttle) => (
                      <div
                        key={shuttle.id}
                        className="flex items-center gap-2 min-w-0"
                      >
                        <div
                          className={`w-3 h-3 lg:w-4 lg:h-4 rounded border-2 flex-shrink-0 ${getShuttleColor(
                            shuttle.id
                          )}`}
                        ></div>
                        <span className="text-xs lg:text-sm font-medium truncate">
                          {shuttle.vehicleNumber}
                        </span>
                        <span className="text-xs text-slate-500 flex-shrink-0">
                          ({shuttle.seats} seats)
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Mobile/Tablet scroll hint */}
                  <div className="block xl:hidden text-xs text-slate-500 text-center py-2 bg-blue-50 rounded border border-blue-200">
                    👈 Scroll horizontally to view the full timeline
                  </div>

                  {/* Timeline Container */}
                  <div className="relative bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <div className="relative min-w-[1200px] p-3 lg:p-6">
                        {/* Hour markers */}
                        <div className="relative h-6 lg:h-8 border-b border-slate-200 mb-3 lg:mb-4">
                          {hourMarkers.map((marker) => (
                            <div
                              key={marker.hour}
                              className="absolute text-[10px] lg:text-xs text-slate-500 -translate-x-1/2"
                              style={{ left: `${marker.position}%` }}
                            >
                              {marker.label}
                            </div>
                          ))}
                        </div>

                        {/* Timeline grid lines - positioned within scrollable content */}
                        {hourMarkers
                          .filter((m) => m.hour % 6 === 0)
                          .map((marker) => (
                            <div
                              key={marker.hour}
                              className="absolute top-0 bottom-0 w-px bg-slate-200 opacity-50 lg:opacity-100 pointer-events-none"
                              style={{ left: `${marker.position}%` }}
                            />
                          ))}

                        {/* Timeline tracks for each shuttle */}
                        <div className="space-y-3 lg:space-y-4 relative">
                          {shuttles.map((shuttle) => {
                            const shuttleSchedules = timelineSchedules.filter(
                              (schedule) => schedule.shuttle.id === shuttle.id
                            );

                            return (
                              <div key={shuttle.id} className="relative">
                                {/* Shuttle header */}
                                <div className="flex items-center mb-2">
                                  <div
                                    className={`w-2 h-2 lg:w-3 lg:h-3 rounded border-2 mr-2 flex-shrink-0 ${getShuttleColor(
                                      shuttle.id
                                    )}`}
                                  ></div>
                                  <span className="font-semibold text-slate-900 text-sm lg:text-base truncate">
                                    {shuttle.vehicleNumber}
                                  </span>
                                  <span className="text-xs lg:text-sm text-slate-500 ml-2 flex-shrink-0">
                                    ({shuttle.seats} seats)
                                  </span>
                                </div>

                                {/* Timeline track */}
                                <div className="relative h-12 lg:h-16 bg-slate-50 border border-slate-200 rounded-lg mb-2">
                                  {/* Schedule blocks */}
                                  {shuttleSchedules.map((schedule) => {
                                    const startPercent =
                                      ((schedule.startHour * 60 +
                                        schedule.startMinute) /
                                        (24 * 60)) *
                                      100;
                                    const durationPercent =
                                      (schedule.duration / (24 * 60)) * 100;

                                    return (
                                      <div
                                        key={schedule.id}
                                        className={`absolute top-0.5 bottom-0.5 lg:top-1 lg:bottom-1 rounded border-2 cursor-pointer hover:opacity-80 transition-opacity ${schedule.color}`}
                                        style={{
                                          left: `${startPercent}%`,
                                          width: `${Math.max(
                                            durationPercent,
                                            8
                                          )}%`, // Minimum width for visibility
                                        }}
                                        onClick={() =>
                                          setSelectedSchedule(schedule)
                                        }
                                        title={`${
                                          schedule.driver.name
                                        } - ${formatTimeForDisplay(
                                          schedule.startTime
                                        )} to ${formatTimeForDisplay(
                                          schedule.endTime
                                        )} (Click for details)`}
                                      >
                                        <div className="p-0.5 lg:p-1 text-[10px] lg:text-xs font-medium h-full overflow-hidden">
                                          <div className="truncate leading-tight">
                                            {schedule.driver.name}
                                          </div>
                                          <div className="text-[9px] lg:text-xs opacity-75 leading-tight hidden sm:block">
                                            {formatTimeForDisplay(
                                              schedule.startTime
                                            )}{" "}
                                            -{" "}
                                            {formatTimeForDisplay(
                                              schedule.endTime
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}

                                  {/* Empty state for shuttle with no schedules */}
                                  {shuttleSchedules.length === 0 && (
                                    <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs lg:text-sm">
                                      No schedules assigned
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="table" className="mt-6">
              {!schedules || schedules.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  title="No schedules available"
                  description="No schedules have been created for this hotel yet."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Driver</TableHead>
                      <TableHead>Shuttle</TableHead>
                      <TableHead>Start Time</TableHead>
                      <TableHead>End Time</TableHead>
                      <TableHead>Duration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedules.map((schedule) => {
                      const startTime = new Date(schedule.startTime);
                      const endTime = new Date(schedule.endTime);
                      const duration =
                        Math.round(
                          ((endTime.getTime() - startTime.getTime()) /
                            (1000 * 60 * 60)) *
                            10
                        ) / 10;

                      return (
                        <TableRow key={schedule.id}>
                          <TableCell className="font-medium">
                            <div>
                              <div className="font-semibold">
                                {schedule.driver.name}
                              </div>
                              <div className="text-sm text-slate-500">
                                {schedule.driver.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-3 h-3 rounded border-2 ${getShuttleColor(
                                  schedule.shuttle.id
                                )}`}
                              ></div>
                              <div>
                                <div className="font-semibold">
                                  {schedule.shuttle.vehicleNumber}
                                </div>
                                <div className="text-sm text-slate-500">
                                  {schedule.shuttle.seats} seats
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Clock className="w-4 h-4 text-green-600" />
                              <span>
                                {formatTimeForDisplay(schedule.startTime)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Clock className="w-4 h-4 text-red-600" />
                              <span>
                                {formatTimeForDisplay(schedule.endTime)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{duration}h</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Schedule Details Modal */}
      <Dialog
        open={!!selectedSchedule}
        onOpenChange={() => setSelectedSchedule(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Details</DialogTitle>
          </DialogHeader>
          {selectedSchedule && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Driver Name
                  </label>
                  <p className="font-semibold">
                    {selectedSchedule.driver.name}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Driver Email
                  </label>
                  <p className="font-semibold">
                    {selectedSchedule.driver.email}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Shuttle Vehicle
                  </label>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded border-2 ${getShuttleColor(
                        selectedSchedule.shuttle.id
                      )}`}
                    ></div>
                    <p className="font-semibold">
                      {selectedSchedule.shuttle.vehicleNumber}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Shuttle Capacity
                  </label>
                  <p className="font-semibold">
                    {selectedSchedule.shuttle.seats} seats
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Start Time
                  </label>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-green-600" />
                    <p className="font-semibold">
                      {formatTimeForDisplay(selectedSchedule.startTime)}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    End Time
                  </label>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-red-600" />
                    <p className="font-semibold">
                      {formatTimeForDisplay(selectedSchedule.endTime)}
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Duration
                </label>
                <div className="mt-1">
                  {(() => {
                    const startTime = new Date(selectedSchedule.startTime);
                    const endTime = new Date(selectedSchedule.endTime);
                    const duration =
                      Math.round(
                        ((endTime.getTime() - startTime.getTime()) /
                          (1000 * 60 * 60)) *
                          10
                      ) / 10;
                    return <Badge variant="outline">{duration}h</Badge>;
                  })()}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Schedule Date
                </label>
                <p className="font-semibold">
                  {formatDateForDisplay(selectedSchedule.startTime)}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default withAuth(SchedulesPage);
