"use client";

import type React from "react";

import { useEffect, useState } from "react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Plus,
  Edit,
  Trash2,
  Calendar as CalendarIcon,
  Clock,
  TableIcon,
  BarChart3,
  CalendarDays,
  Download,
  Copy,
} from "lucide-react";
import { api } from "@/lib/api";
import { Loader } from "@/components/ui/loader";
import { TableLoader } from "../../../components/ui/table-loader";
import { EmptyState } from "../../../components/ui/empty-state";
import { toast } from "sonner";
import { withAuth } from "@/components/withAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Schedule {
  id: string;
  scheduleDate: string;
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

interface WeeklySchedule {
  shuttleId: string;
  driverId: string;
  startDate: string;
  monday: { startTime: string; endTime: string; enabled: boolean };
  tuesday: { startTime: string; endTime: string; enabled: boolean };
  wednesday: { startTime: string; endTime: string; enabled: boolean };
  thursday: { startTime: string; endTime: string; enabled: boolean };
  friday: { startTime: string; endTime: string; enabled: boolean };
  saturday: { startTime: string; endTime: string; enabled: boolean };
  sunday: { startTime: string; endTime: string; enabled: boolean };
}

function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [shuttles, setShuttles] = useState<Shuttle[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0); // 0 = current week, -1 = prev, 1 = next

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isWeeklyDialogOpen, setIsWeeklyDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [formData, setFormData] = useState({
    driverId: "",
    shuttleId: "",
    scheduleDate: new Date().toISOString().split("T")[0], // Default to today
    startTime: "",
    endTime: "",
  });
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  ); // For shadcn calendar

  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>({
    shuttleId: "",
    driverId: "",
    startDate: "",
    monday: { startTime: "09:00", endTime: "17:00", enabled: true },
    tuesday: { startTime: "09:00", endTime: "17:00", enabled: true },
    wednesday: { startTime: "09:00", endTime: "17:00", enabled: true },
    thursday: { startTime: "09:00", endTime: "17:00", enabled: true },
    friday: { startTime: "09:00", endTime: "17:00", enabled: true },
    saturday: { startTime: "10:00", endTime: "16:00", enabled: true },
    sunday: { startTime: "10:00", endTime: "16:00", enabled: false },
  });

  const daysOfWeek = [
    { key: "monday", label: "Monday", short: "Mon" },
    { key: "tuesday", label: "Tuesday", short: "Tue" },
    { key: "wednesday", label: "Wednesday", short: "Wed" },
    { key: "thursday", label: "Thursday", short: "Thu" },
    { key: "friday", label: "Friday", short: "Fri" },
    { key: "saturday", label: "Saturday", short: "Sat" },
    { key: "sunday", label: "Sunday", short: "Sun" },
  ];

  const formatTimeForDB = (date: string, time: string) => {
    if (!time) return null;

    // Parse date as UTC to avoid timezone shifts
    const [year, month, day] = date.split("-").map(Number);
    const [hours, minutes] = time.split(":").map(Number);

    // Create UTC date directly
    const scheduleDate = new Date(
      Date.UTC(year, month - 1, day, hours, minutes, 0, 0)
    );

    console.log("🔧 formatTimeForDB:", {
      inputDate: date,
      inputTime: time,
      parsedComponents: { year, month: month - 1, day, hours, minutes },
      resultUTC: scheduleDate.toISOString(),
      resultDate: scheduleDate.toISOString().split("T")[0],
    });

    return scheduleDate.toISOString();
  };

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
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
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

  // Get current week Monday
  const getCurrentWeekMonday = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(today.setDate(diff));
  };

  // Generate week days for timeline based on current week offset
  const generateWeekDays = () => {
    const monday = getWeekMondayWithOffset(currentWeekOffset);
    const weekDays = [];

    console.log("🗓️ Generating week days for offset:", currentWeekOffset);
    console.log("🗓️ Monday of this week:", monday.toISOString().split("T")[0]);

    for (let i = 0; i < 7; i++) {
      // Use UTC methods to match the schedule mapping logic
      const day = new Date(monday);
      day.setUTCDate(monday.getUTCDate() + i);

      // Create display date using UTC components to avoid timezone issues
      const year = day.getUTCFullYear();
      const month = day.getUTCMonth();
      const date = day.getUTCDate();
      const displayDay = new Date(Date.UTC(year, month, date)); // UTC date for display only

      console.log(
        `🗓️ Timeline position ${i} (${
          i === 0
            ? "Mon"
            : i === 1
            ? "Tue"
            : i === 2
            ? "Wed"
            : i === 3
            ? "Thu"
            : i === 4
            ? "Fri"
            : i === 5
            ? "Sat"
            : "Sun"
        }): ${
          day.toISOString().split("T")[0]
        } - UTC Day of week: ${day.getUTCDay()}`
      );

      weekDays.push({
        date: day,
        dayName: displayDay.toLocaleDateString("en-US", { weekday: "short" }),
        dayNumber: displayDay.getUTCDate(),
        month: displayDay.toLocaleDateString("en-US", { month: "short" }),
        isToday:
          day.toISOString().split("T")[0] ===
          new Date().toISOString().split("T")[0],
        position: (i / 7) * 100, // percentage position
      });
    }
    console.log("Generated week days:", weekDays);
    return weekDays;
  };

  // Convert schedules to weekly timeline format
  const getWeeklyTimelineSchedules = () => {
    if (!schedules) return {};

    // Since the API already filters by week, we don't need to filter again
    // Just group the schedules by shuttle and day
    const schedulesByShuttleAndDay: {
      [shuttleId: string]: { [dayIndex: number]: any[] };
    } = {};

    schedules.forEach((schedule) => {
      // Parse the date more carefully to avoid timezone issues
      const scheduleDate = new Date(schedule.scheduleDate);

      // Use UTC to avoid timezone issues - stay in UTC throughout
      const year = scheduleDate.getUTCFullYear();
      const month = scheduleDate.getUTCMonth();
      const day = scheduleDate.getUTCDate();

      // Get day of week directly from the original UTC date
      const dayOfWeekUTC = scheduleDate.getUTCDay(); // 0=Sunday, 1=Monday, etc.
      const dayIndex = (dayOfWeekUTC + 6) % 7; // Convert Sunday=0 to Monday=0

      console.log("📅 Timeline mapping:", {
        originalDate: schedule.scheduleDate,
        parsedDate: scheduleDate,
        utcDate: `${year}-${String(month + 1).padStart(2, "0")}-${String(
          day
        ).padStart(2, "0")}`,
        dayOfWeekUTC: dayOfWeekUTC, // 0=Sunday, 1=Monday, etc.
        calculatedDayIndex: dayIndex, // 0=Monday, 1=Tuesday, etc.
        expectedPosition:
          dayIndex === 0
            ? "Monday"
            : dayIndex === 1
            ? "Tuesday"
            : dayIndex === 2
            ? "Wednesday"
            : dayIndex === 3
            ? "Thursday"
            : dayIndex === 4
            ? "Friday"
            : dayIndex === 5
            ? "Saturday"
            : "Sunday",
      });

      if (!schedulesByShuttleAndDay[schedule.shuttle.id]) {
        schedulesByShuttleAndDay[schedule.shuttle.id] = {};
      }
      if (!schedulesByShuttleAndDay[schedule.shuttle.id][dayIndex]) {
        schedulesByShuttleAndDay[schedule.shuttle.id][dayIndex] = [];
      }

      schedulesByShuttleAndDay[schedule.shuttle.id][dayIndex].push({
        ...schedule,
        // Keep original ISO times for editing, but add display versions
        displayStartTime: formatTimeForDisplay(schedule.startTime),
        displayEndTime: formatTimeForDisplay(schedule.endTime),
        color: getShuttleColor(schedule.shuttle.id),
        // Add debug info
        debugDayIndex: dayIndex,
        debugUtcDate: `${year}-${String(month + 1).padStart(2, "0")}-${String(
          day
        ).padStart(2, "0")}`,
      });
    });

    return schedulesByShuttleAndDay;
  };

  // Get Monday of a specific week with offset using UTC to match schedule logic
  const getWeekMondayWithOffset = (offset: number) => {
    const today = new Date();
    const currentWeekStart = new Date(today);

    // Use UTC methods to be consistent with schedule mapping
    const day = currentWeekStart.getUTCDay();
    const diff = currentWeekStart.getUTCDate() - day + (day === 0 ? -6 : 1);
    currentWeekStart.setUTCDate(diff);
    currentWeekStart.setUTCHours(0, 0, 0, 0);

    // Apply offset
    const targetWeek = new Date(currentWeekStart);
    targetWeek.setUTCDate(targetWeek.getUTCDate() + offset * 7);

    console.log("🗓️ Week Monday calculation:", {
      offset,
      todayUTC: today.toISOString().split("T")[0],
      mondayUTC: targetWeek.toISOString().split("T")[0],
      weekDayUTC: day,
    });

    return targetWeek;
  };

  // Fetch schedules for a specific week
  const fetchSchedulesForWeek = async (weekOffset: number) => {
    try {
      setLoading(true);
      console.log(`🔄 Fetching schedules for week offset: ${weekOffset}`);

      // Only fetch schedules - drivers and shuttles are static data
      const schedulesRes = await api.get(
        `/admin/get/schedule/week?weekOffset=${weekOffset}`
      );

      console.log("📅 API Response - schedules:", schedulesRes.schedules);
      console.log("📊 Week offset being set:", weekOffset);

      setSchedules(schedulesRes.schedules);
      setCurrentWeekOffset(weekOffset);
    } catch (error) {
      console.error("❌ Error fetching week data:", error);
      toast.error("Failed to fetch schedules data");
    } finally {
      setLoading(false);
    }
  };

  // Fetch static data only once (drivers and shuttles don't change often)
  const fetchStaticData = async () => {
    try {
      console.log("🔄 Fetching static data (drivers & shuttles)...");

      const [driversRes, shuttlesRes] = await Promise.all([
        api.get("/admin/get/driver"),
        api.get("/admin/get/shuttle"),
      ]);

      setDrivers(driversRes.drivers);
      setShuttles(shuttlesRes.shuttles);

      console.log("✅ Static data loaded");
    } catch (error) {
      console.error("❌ Error fetching static data:", error);
      toast.error("Failed to fetch drivers and shuttles data");
    }
  };

  // Week navigation functions
  const navigateToWeek = (offset: number) => {
    fetchSchedulesForWeek(offset);
  };

  const goToPreviousWeek = () => {
    navigateToWeek(currentWeekOffset - 1);
  };

  const goToNextWeek = () => {
    navigateToWeek(currentWeekOffset + 1);
  };

  const goToCurrentWeek = () => {
    navigateToWeek(0);
  };

  // Weekly schedule form functions
  const resetWeeklyForm = () => {
    const weekStart = getWeekMondayWithOffset(currentWeekOffset);
    setWeeklySchedule({
      shuttleId: "",
      driverId: "",
      startDate: weekStart.toISOString().split("T")[0],
      monday: { startTime: "09:00", endTime: "17:00", enabled: true },
      tuesday: { startTime: "09:00", endTime: "17:00", enabled: true },
      wednesday: { startTime: "09:00", endTime: "17:00", enabled: true },
      thursday: { startTime: "09:00", endTime: "17:00", enabled: true },
      friday: { startTime: "09:00", endTime: "17:00", enabled: true },
      saturday: { startTime: "10:00", endTime: "16:00", enabled: true },
      sunday: { startTime: "10:00", endTime: "16:00", enabled: false },
    });
  };

  const updateScheduleDay = (
    dayKey: string,
    field: string,
    value: string | boolean
  ) => {
    setWeeklySchedule((prev) => ({
      ...prev,
      [dayKey]: {
        ...(prev[dayKey as keyof typeof prev] as Record<string, any>),
        [field]: value,
      },
    }));
  };

  const copyTimeToAll = (sourceDay: string) => {
    const source = weeklySchedule[sourceDay as keyof typeof weeklySchedule];
    if (
      typeof source === "object" &&
      source !== null &&
      "startTime" in source
    ) {
      const updatedSchedule = { ...weeklySchedule };

      daysOfWeek.forEach((day) => {
        if (day.key !== sourceDay) {
          const currentDay =
            updatedSchedule[day.key as keyof typeof updatedSchedule];
          if (typeof currentDay === "object" && currentDay !== null) {
            (updatedSchedule[day.key as keyof typeof updatedSchedule] as any) =
              {
                ...currentDay,
                startTime: source.startTime,
                endTime: source.endTime,
              };
          }
        }
      });

      setWeeklySchedule(updatedSchedule);
      toast.success(`Time copied to all days`);
    }
  };

  const handleWeeklySubmit = async () => {
    if (!weeklySchedule.driverId || !weeklySchedule.shuttleId) {
      toast.error("Please select both driver and shuttle");
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post("/admin/add/weekly-schedule", {
        driverId: weeklySchedule.driverId,
        shuttleId: weeklySchedule.shuttleId,
        startDate: weeklySchedule.startDate,
        weekSchedule: {
          monday: weeklySchedule.monday,
          tuesday: weeklySchedule.tuesday,
          wednesday: weeklySchedule.wednesday,
          thursday: weeklySchedule.thursday,
          friday: weeklySchedule.friday,
          saturday: weeklySchedule.saturday,
          sunday: weeklySchedule.sunday,
        },
      });

      toast.success(response.message || "Weekly schedule created successfully");
      setIsWeeklyDialogOpen(false);
      resetWeeklyForm();

      // Refresh current week data since we added new schedules
      fetchSchedulesForWeek(currentWeekOffset);
    } catch (error) {
      console.error("Error creating weekly schedule:", error);
      toast.error("Failed to create weekly schedule");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    // Initialize: fetch static data once and current week schedules
    const initializeData = async () => {
      console.log("🚀 Initializing schedules page...");

      // Fetch static data first (drivers & shuttles)
      await fetchStaticData();

      // Then fetch current week schedules
      await fetchSchedulesForWeek(0);

      console.log("✅ Initialization complete");
    };

    initializeData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingSchedule) {
        const response = await api.put(
          `/admin/edit/schedule/${editingSchedule.id}`,
          {
            driverId: parseInt(formData.driverId),
            shuttleId: parseInt(formData.shuttleId),
            scheduleDate: new Date(formData.scheduleDate).toISOString(),
            startTime: formatTimeForDB(
              formData.scheduleDate,
              formData.startTime
            ),
            endTime: formatTimeForDB(formData.scheduleDate, formData.endTime),
          }
        );

        setSchedules(
          schedules?.map((schedule) =>
            schedule.id === editingSchedule.id ? response.schedule : schedule
          )
        );
        setEditingSchedule(null);
        toast.success("Schedule updated successfully");
      } else {
        const response = await api.post("/admin/add/schedule", {
          driverId: parseInt(formData.driverId),
          shuttleId: parseInt(formData.shuttleId),
          scheduleDate: new Date(formData.scheduleDate).toISOString(),
          startTime: formatTimeForDB(formData.scheduleDate, formData.startTime),
          endTime: formatTimeForDB(formData.scheduleDate, formData.endTime),
        });

        setSchedules([...(schedules || []), response.schedule]);
        toast.success("Schedule added successfully");
      }
      resetForm();
      setIsAddDialogOpen(false);

      // Refresh current week data since we added/updated a schedule
      fetchSchedulesForWeek(currentWeekOffset);
    } catch (error) {
      console.error("Error submitting schedule:", error);
      toast.error("Failed to save schedule");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule);

    // Parse the schedule date properly - handle timezone consistently
    const scheduleDate = new Date(schedule.scheduleDate);
    // Use UTC to avoid timezone shifts
    const year = scheduleDate.getUTCFullYear();
    const month = String(scheduleDate.getUTCMonth() + 1).padStart(2, "0");
    const day = String(scheduleDate.getUTCDate()).padStart(2, "0");
    const scheduleDateOnly = `${year}-${month}-${day}`;

    console.log("🔧 Editing schedule:", {
      originalDate: schedule.scheduleDate,
      parsedDate: scheduleDate,
      finalDateString: scheduleDateOnly,
      originalStartTime: schedule.startTime,
      originalEndTime: schedule.endTime,
    });

    setFormData({
      driverId: String(schedule.driver.id),
      shuttleId: String(schedule.shuttle.id),
      scheduleDate: scheduleDateOnly,
      startTime: formatTimeForDisplay(schedule.startTime),
      endTime: formatTimeForDisplay(schedule.endTime),
    });

    // Set the selected date for the calendar component using the same logic
    setSelectedDate(
      new Date(
        Date.UTC(year, scheduleDate.getUTCMonth(), scheduleDate.getUTCDate())
      )
    );
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await api.delete(`/admin/delete/schedule/${id}`);
      setSchedules(schedules?.filter((schedule) => schedule.id !== id));
      toast.success("Schedule deleted successfully");
    } catch (error) {
      console.error("Error deleting schedule:", error);
      toast.error("Failed to delete schedule");
    } finally {
      setDeleting(null);
    }
  };

  const resetForm = () => {
    const today = new Date();
    setFormData({
      driverId: "",
      shuttleId: "",
      scheduleDate: today.toISOString().split("T")[0], // Default to today
      startTime: "",
      endTime: "",
    });
    setSelectedDate(today); // Reset calendar to today
    setEditingSchedule(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Schedules Management
            </h1>
            <p className="text-slate-600">
              Manage driver and shuttle schedules
            </p>
          </div>
        </div>
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <>
                <CalendarIcon className="w-5 h-5 text-purple-600" />
                <span>Schedules Overview</span>
              </>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Shuttle</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>End Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableLoader columns={7} />
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  const weeklyScheduleData = getWeeklyTimelineSchedules();
  const weekDays = generateWeekDays();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Schedules Management
          </h1>
          <p className="text-slate-600">Manage driver and shuttle schedules</p>
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={() => setIsWeeklyDialogOpen(true)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <CalendarDays className="w-4 h-4 mr-2" />
            Add Weekly Schedule
          </Button>
          <Dialog
            open={isAddDialogOpen}
            onOpenChange={(open) => {
              setIsAddDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Add New Schedule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingSchedule ? "Edit Schedule" : "Add New Schedule"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="driver">Driver</Label>
                  <Select
                    value={formData.driverId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, driverId: value })
                    }
                    required
                    disabled={submitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select driver" />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers.map((driver) => (
                        <SelectItem key={driver.id} value={String(driver.id)}>
                          {driver.name} ({driver.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="shuttle">Shuttle</Label>
                  <Select
                    value={formData.shuttleId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, shuttleId: value })
                    }
                    required
                    disabled={submitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select shuttle" />
                    </SelectTrigger>
                    <SelectContent>
                      {shuttles.map((shuttle) => (
                        <SelectItem key={shuttle.id} value={String(shuttle.id)}>
                          {shuttle.vehicleNumber} ({shuttle.seats} seats)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="scheduleDate">Schedule Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={`w-full justify-start text-left font-normal ${
                          !selectedDate ? "text-muted-foreground" : ""
                        }`}
                        disabled={submitting}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? (
                          selectedDate.toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          setSelectedDate(date);
                          if (date) {
                            // Use local date parts to prevent timezone shift from toISOString()
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(
                              2,
                              "0"
                            );
                            const day = String(date.getDate()).padStart(2, "0");
                            const dateString = `${year}-${month}-${day}`;
                            setFormData({
                              ...formData,
                              scheduleDate: dateString,
                            });
                          }
                        }}
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0))
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {selectedDate && (
                    <div className="text-sm text-slate-600 mt-2 p-2 bg-blue-50 rounded-md border border-blue-200">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-blue-600" />
                        <span className="font-medium">Selected:</span>
                        <span>
                          {selectedDate.toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) =>
                      setFormData({ ...formData, startTime: e.target.value })
                    }
                    required
                    className="w-full"
                    disabled={submitting}
                  />
                </div>
                <div>
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) =>
                      setFormData({ ...formData, endTime: e.target.value })
                    }
                    required
                    className="w-full"
                    disabled={submitting}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddDialogOpen(false);
                      resetForm();
                    }}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader className="w-4 h-4 mr-2" />
                        {editingSchedule ? "Updating..." : "Adding..."}
                      </>
                    ) : editingSchedule ? (
                      "Update Schedule"
                    ) : (
                      "Add Schedule"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Weekly Schedule Dialog */}
          <Dialog
            open={isWeeklyDialogOpen}
            onOpenChange={(open) => {
              setIsWeeklyDialogOpen(open);
              if (!open) resetWeeklyForm();
            }}
          >
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <CalendarDays className="w-5 h-5 text-purple-600" />
                  <span>Create Weekly Schedule</span>
                </DialogTitle>
                <div className="text-sm text-slate-600 mt-2">
                  Set up a complete weekly schedule for 7 days. You can
                  enable/disable specific days and set different times for each
                  day.
                </div>
              </DialogHeader>

              <div className="space-y-6">
                {/* Shuttle and Driver Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="shuttle">Select Shuttle</Label>
                    <Select
                      value={weeklySchedule.shuttleId}
                      onValueChange={(value) =>
                        setWeeklySchedule({
                          ...weeklySchedule,
                          shuttleId: value,
                        })
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select shuttle" />
                      </SelectTrigger>
                      <SelectContent>
                        {shuttles.map((shuttle) => (
                          <SelectItem
                            key={shuttle.id}
                            value={String(shuttle.id)}
                          >
                            {shuttle.vehicleNumber} ({shuttle.seats} seats)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="driver">Select Driver</Label>
                    <Select
                      value={weeklySchedule.driverId}
                      onValueChange={(value) =>
                        setWeeklySchedule({
                          ...weeklySchedule,
                          driverId: value,
                        })
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select driver" />
                      </SelectTrigger>
                      <SelectContent>
                        {drivers.map((driver) => (
                          <SelectItem key={driver.id} value={String(driver.id)}>
                            {driver.name} ({driver.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Week start date */}
                <div>
                  <Label htmlFor="startDate">Week Start Date (Monday)</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={weeklySchedule.startDate}
                    onChange={(e) =>
                      setWeeklySchedule({
                        ...weeklySchedule,
                        startDate: e.target.value,
                      })
                    }
                    required
                    className="w-full"
                  />
                  {weeklySchedule.startDate && (
                    <div className="text-sm text-slate-600 mt-1">
                      Week:{" "}
                      {new Date(weeklySchedule.startDate).toLocaleDateString(
                        "en-US",
                        {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )}{" "}
                      to{" "}
                      {new Date(
                        new Date(weeklySchedule.startDate).getTime() +
                          6 * 24 * 60 * 60 * 1000
                      ).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })}
                    </div>
                  )}
                </div>

                {/* Weekly Schedule Grid */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Weekly Schedule
                  </h3>
                  <div className="grid gap-4">
                    {daysOfWeek.map((day) => {
                      const dayData =
                        weeklySchedule[day.key as keyof typeof weeklySchedule];
                      if (
                        typeof dayData === "object" &&
                        dayData !== null &&
                        "enabled" in dayData
                      ) {
                        return (
                          <div
                            key={day.key}
                            className={`p-4 border rounded-lg transition-all ${
                              dayData.enabled
                                ? "border-blue-200 bg-blue-50/50"
                                : "border-slate-200 bg-slate-50/50"
                            }`}
                          >
                            <div className="flex items-center space-x-4">
                              <div className="w-20">
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    checked={dayData.enabled}
                                    onChange={(e) =>
                                      updateScheduleDay(
                                        day.key,
                                        "enabled",
                                        e.target.checked
                                      )
                                    }
                                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                  />
                                  <label className="font-medium text-slate-900">
                                    {day.label}
                                  </label>
                                </div>
                              </div>

                              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <Label
                                    htmlFor={`${day.key}-start`}
                                    className="text-sm"
                                  >
                                    Start Time
                                  </Label>
                                  <Input
                                    id={`${day.key}-start`}
                                    type="time"
                                    value={dayData.startTime}
                                    onChange={(e) =>
                                      updateScheduleDay(
                                        day.key,
                                        "startTime",
                                        e.target.value
                                      )
                                    }
                                    disabled={!dayData.enabled}
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label
                                    htmlFor={`${day.key}-end`}
                                    className="text-sm"
                                  >
                                    End Time
                                  </Label>
                                  <Input
                                    id={`${day.key}-end`}
                                    type="time"
                                    value={dayData.endTime}
                                    onChange={(e) =>
                                      updateScheduleDay(
                                        day.key,
                                        "endTime",
                                        e.target.value
                                      )
                                    }
                                    disabled={!dayData.enabled}
                                    className="mt-1"
                                  />
                                </div>
                                <div className="flex items-end">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyTimeToAll(day.key)}
                                    disabled={!dayData.enabled}
                                    className="w-full"
                                  >
                                    <Copy className="w-3 h-3 mr-1" />
                                    Copy to All
                                  </Button>
                                </div>
                              </div>
                            </div>

                            {dayData.enabled && (
                              <div className="mt-2 text-sm text-slate-600">
                                Duration:{" "}
                                {(() => {
                                  const start = new Date(
                                    `2000-01-01T${dayData.startTime}`
                                  );
                                  const end = new Date(
                                    `2000-01-01T${dayData.endTime}`
                                  );
                                  const diff =
                                    (end.getTime() - start.getTime()) /
                                    (1000 * 60 * 60);
                                  return `${diff} hours`;
                                })()}
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsWeeklyDialogOpen(false);
                      resetWeeklyForm();
                    }}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleWeeklySubmit}
                    className="bg-purple-600 hover:bg-purple-700"
                    disabled={
                      submitting ||
                      !weeklySchedule.driverId ||
                      !weeklySchedule.shuttleId
                    }
                  >
                    {submitting ? (
                      <>
                        <Loader className="w-4 h-4 mr-2" />
                        Creating Schedule...
                      </>
                    ) : (
                      <>
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        Create Weekly Schedule
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CalendarIcon className="w-5 h-5 text-purple-600" />
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
                  👈 Scroll horizontally to view the full weekly timeline
                </div>

                {/* Weekly Timeline Container */}
                <div className="relative bg-white border border-slate-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <div className="min-w-[1200px] p-3 lg:p-6">
                      {/* Week header with days */}
                      <div className="relative h-12 lg:h-16 border-b border-slate-200 mb-3 lg:mb-4">
                        <div className="grid grid-cols-7 h-full">
                          {weekDays.map((day, index) => (
                            <div
                              key={index}
                              className={`flex flex-col items-center justify-center border-r border-slate-200 last:border-r-0 ${
                                day.isToday
                                  ? "bg-blue-50 text-blue-700"
                                  : "text-slate-600"
                              }`}
                            >
                              <div className="text-xs lg:text-sm font-semibold">
                                {day.dayName}
                              </div>
                              <div className="text-xs lg:text-sm">
                                {day.month} {day.dayNumber}
                              </div>
                              {day.isToday && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-1"></div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Weekly Timeline tracks for each shuttle */}
                      <div className="space-y-4 lg:space-y-6">
                        {!schedules || schedules.length === 0 ? (
                          /* Empty week display - show empty calendar structure */
                          <div className="text-center py-12">
                            <div className="mb-6">
                              <CalendarIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                              <h3 className="text-lg font-semibold text-slate-700 mb-2">
                                No schedules for this week
                              </h3>
                              <p className="text-slate-500 mb-4">
                                This week doesn't have any schedules assigned
                                yet.
                              </p>
                              <p className="text-sm text-slate-400">
                                Use the navigation below to check other weeks or
                                create a new schedule.
                              </p>
                            </div>

                            {/* Show empty calendar grid for reference */}
                            <div className="max-w-4xl mx-auto">
                              <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-lg overflow-hidden">
                                {weekDays.map((day, dayIndex) => (
                                  <div
                                    key={dayIndex}
                                    className={`min-h-[80px] bg-white p-2 flex flex-col items-center justify-center ${
                                      day.isToday ? "bg-blue-50/50" : ""
                                    }`}
                                  >
                                    <div className="text-xs font-semibold text-slate-600">
                                      {day.dayName}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                      {day.month} {day.dayNumber}
                                    </div>
                                    <div className="mt-2 text-xs text-slate-400">
                                      No schedules
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Normal shuttle timeline display */
                          shuttles.map((shuttle) => {
                            const shuttleDaySchedules =
                              weeklyScheduleData[shuttle.id] || {};

                            return (
                              <div key={shuttle.id} className="relative">
                                {/* Shuttle header */}
                                <div className="flex items-center mb-3">
                                  <div
                                    className={`w-3 h-3 lg:w-4 lg:h-4 rounded border-2 mr-3 flex-shrink-0 ${getShuttleColor(
                                      shuttle.id
                                    )}`}
                                  ></div>
                                  <span className="font-semibold text-slate-900 text-sm lg:text-base">
                                    {shuttle.vehicleNumber}
                                  </span>
                                  <span className="text-xs lg:text-sm text-slate-500 ml-2">
                                    ({shuttle.seats} seats)
                                  </span>
                                </div>

                                {/* Weekly timeline grid */}
                                <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-lg overflow-hidden">
                                  {weekDays.map((day, dayIndex) => {
                                    const daySchedules =
                                      shuttleDaySchedules[dayIndex] || [];

                                    return (
                                      <div
                                        key={dayIndex}
                                        className={`min-h-[80px] lg:min-h-[100px] bg-white p-2 ${
                                          day.isToday ? "bg-blue-50/50" : ""
                                        }`}
                                      >
                                        {daySchedules.length > 0 ? (
                                          <div className="space-y-1">
                                            {daySchedules.map(
                                              (
                                                schedule: any,
                                                scheduleIndex: number
                                              ) => (
                                                <div
                                                  key={scheduleIndex}
                                                  className={`p-2 rounded text-xs cursor-pointer hover:opacity-80 transition-opacity ${schedule.color}`}
                                                  onClick={() =>
                                                    handleEdit(schedule)
                                                  }
                                                  title={`${schedule.driver.name} - ${schedule.displayStartTime} to ${schedule.displayEndTime}`}
                                                >
                                                  <div className="font-semibold truncate">
                                                    {schedule.driver.name}
                                                  </div>
                                                  <div className="text-[10px] opacity-75">
                                                    {schedule.displayStartTime}{" "}
                                                    - {schedule.displayEndTime}
                                                  </div>
                                                </div>
                                              )
                                            )}
                                          </div>
                                        ) : (
                                          <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                                            No schedule
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Week navigation */}
                      <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200">
                        <div className="text-sm text-slate-600">
                          Week of {weekDays[0]?.date.toLocaleDateString()} -{" "}
                          {weekDays[6]?.date.toLocaleDateString()}
                          {currentWeekOffset === 0 && " (Current Week)"}
                          {currentWeekOffset < 0 &&
                            ` (${Math.abs(currentWeekOffset)} week${
                              Math.abs(currentWeekOffset) > 1 ? "s" : ""
                            } ago)`}
                          {currentWeekOffset > 0 &&
                            ` (${currentWeekOffset} week${
                              currentWeekOffset > 1 ? "s" : ""
                            } from now)`}
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={goToPreviousWeek}
                            disabled={loading}
                          >
                            ← Previous Week
                          </Button>
                          {currentWeekOffset !== 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={goToCurrentWeek}
                              disabled={loading}
                            >
                              Current Week
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={goToNextWeek}
                            disabled={loading}
                          >
                            Next Week →
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="table" className="mt-6">
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Shuttle</TableHead>
                      <TableHead>Start Time</TableHead>
                      <TableHead>End Time</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedules && schedules.length > 0 ? (
                      schedules
                        .sort(
                          (a, b) =>
                            new Date(a.scheduleDate).getTime() -
                            new Date(b.scheduleDate).getTime()
                        )
                        .map((schedule) => {
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
                                <div className="font-semibold">
                                  {formatDateForDisplay(schedule.scheduleDate)}
                                </div>
                              </TableCell>
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
                              <TableCell className="text-right">
                                <div className="flex justify-end space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEdit(schedule)}
                                    disabled={deleting === schedule.id}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDelete(schedule.id)}
                                    className="text-red-600 hover:text-red-700"
                                    disabled={deleting === schedule.id}
                                  >
                                    {deleting === schedule.id ? (
                                      <Loader className="w-4 h-4" />
                                    ) : (
                                      <Trash2 className="w-4 h-4" />
                                    )}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12">
                          <div className="flex flex-col items-center">
                            <CalendarIcon className="w-12 h-12 text-slate-300 mb-4" />
                            <h3 className="text-lg font-semibold text-slate-700 mb-2">
                              No schedules for this week
                            </h3>
                            <p className="text-slate-500 mb-2">
                              This week doesn't have any schedules assigned yet.
                            </p>
                            <p className="text-sm text-slate-400">
                              Use the navigation above to check other weeks or
                              create a new schedule.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {/* Bottom navigation for table view */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 mt-4">
                  <div className="text-sm text-slate-600">
                    <div className="font-semibold">
                      Week of {weekDays[0]?.date.toLocaleDateString()} -{" "}
                      {weekDays[6]?.date.toLocaleDateString()}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {currentWeekOffset === 0 && "Current Week"}
                      {currentWeekOffset < 0 &&
                        `${Math.abs(currentWeekOffset)} week${
                          Math.abs(currentWeekOffset) > 1 ? "s" : ""
                        } ago`}
                      {currentWeekOffset > 0 &&
                        `${currentWeekOffset} week${
                          currentWeekOffset > 1 ? "s" : ""
                        } from now`}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToPreviousWeek}
                      disabled={loading}
                    >
                      ← Previous Week
                    </Button>
                    {currentWeekOffset !== 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToCurrentWeek}
                        disabled={loading}
                      >
                        Current Week
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToNextWeek}
                      disabled={loading}
                    >
                      Next Week →
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default withAuth(SchedulesPage);
