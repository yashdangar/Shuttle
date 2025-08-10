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
import { useWebSocket } from "@/context/WebSocketContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, getUserTimeZone, getTimeZoneAbbr, formatTimeForDisplay } from "@/lib/utils";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";

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

interface WeeklySchedule {
  shuttleId: string;
  driverId: string;
  startDate: string;
  sunday: { startTime: string; endTime: string; enabled: boolean };
  monday: { startTime: string; endTime: string; enabled: boolean };
  tuesday: { startTime: string; endTime: string; enabled: boolean };
  wednesday: { startTime: string; endTime: string; enabled: boolean };
  thursday: { startTime: string; endTime: string; enabled: boolean };
  friday: { startTime: string; endTime: string; enabled: boolean };
  saturday: { startTime: string; endTime: string; enabled: boolean };
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
    startTime: "",
    endTime: "",
  });
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  ); // For shadcn calendar
  // Additional state to mirror admin modal behavior
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>({
    shuttleId: "",
    driverId: "",
    startDate: "",
    sunday: { startTime: "10:00", endTime: "16:00", enabled: false },
    monday: { startTime: "09:00", endTime: "17:00", enabled: true },
    tuesday: { startTime: "09:00", endTime: "17:00", enabled: true },
    wednesday: { startTime: "09:00", endTime: "17:00", enabled: true },
    thursday: { startTime: "09:00", endTime: "17:00", enabled: true },
    friday: { startTime: "09:00", endTime: "17:00", enabled: true },
    saturday: { startTime: "10:00", endTime: "16:00", enabled: true },
  });

  // --- Add state for 21-day window ---
  const [scheduleWindow, setScheduleWindow] = useState<Schedule[]>([]);
  const [windowCenterDate, setWindowCenterDate] = useState<Date>(new Date());
  const { onScheduleEvent } = useWebSocket();

  const daysOfWeek = [
    { key: "sunday", label: "Sunday", short: "Sun" },
    { key: "monday", label: "Monday", short: "Mon" },
    { key: "tuesday", label: "Tuesday", short: "Tue" },
    { key: "wednesday", label: "Wednesday", short: "Wed" },
    { key: "thursday", label: "Thursday", short: "Thu" },
    { key: "friday", label: "Friday", short: "Fri" },
    { key: "saturday", label: "Saturday", short: "Sat" },
  ];

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.06, when: "beforeChildren" },
    },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
  };
  const fadeIn = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.25 } },
  };
  const scaleIn = {
    hidden: { opacity: 0, scale: 0.96 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: "easeOut" } },
  };

  // --- Helper: Convert UTC ISO string to local datetime-local input value ---
  function utcToLocalInput(utcIsoString: string) {
    if (!utcIsoString) return "";
    const date = new Date(utcIsoString);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  // --- Helper: Convert local datetime-local input value to UTC ISO string ---
  function localInputToUtcIso(localDateTimeStr: string) {
    if (!localDateTimeStr) return "";
    const localDate = new Date(localDateTimeStr);
    return localDate.toISOString();
  }

  // --- Helper: check if date is in the past ---
  const isDateInPast = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  // --- Helper: combine date and time into datetime-local format ---
  const combineDateTime = (date: Date | null, timeStr: string) => {
    if (!date || !timeStr) return "";
    const [hours, minutes] = timeStr.split(":").map(Number);
    const combined = new Date(date);
    combined.setHours(hours, minutes, 0, 0);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${combined.getFullYear()}-${pad(combined.getMonth() + 1)}-${pad(
      combined.getDate()
    )}T${pad(combined.getHours())}:${pad(combined.getMinutes())}`;
  };

  // --- Helper: split datetime-local into date and time ---
  const splitDateTime = (dateTimeStr: string) => {
    if (!dateTimeStr) return { date: null as Date | null, time: "" };
    const date = new Date(dateTimeStr);
    const time = `${date.getHours().toString().padStart(2, "0")}:${date
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
    return { date, time };
  };

  // --- Helper: validate if end datetime is after start datetime ---
  const isFormValid = () => {
    if (!formData.driverId || !formData.shuttleId || !startDate || !endDate || !startTime || !endTime) {
      return false;
    }
    if (isDateInPast(startDate) || isDateInPast(endDate)) {
      return false;
    }
    const startDateTime = new Date(startDate);
    const [startHour, startMinute] = startTime.split(":").map(Number);
    startDateTime.setHours(startHour, startMinute, 0, 0);

    const endDateTime = new Date(endDate);
    const [endHour, endMinute] = endTime.split(":").map(Number);
    endDateTime.setHours(endHour, endMinute, 0, 0);
    return endDateTime > startDateTime;
  };

  // Converts local date+time to UTC ISO string
  const toUtcIso = (dateStr: string, timeStr: string) => {
    if (!dateStr || !timeStr) return null;
    const [year, month, day] = dateStr.split("-").map(Number);
    const [hour, minute] = timeStr.split(":").map(Number);
    const localDate = new Date(year, month - 1, day, hour, minute, 0, 0);
    return localDate.toISOString();
  };

  // Handles overnight shifts (end time < start time)
  const getStartEndUtc = (
    dateStr: string,
    startTime: string,
    endTime: string
  ) => {
    const startUtc = toUtcIso(dateStr, startTime);
    let endDate = dateStr;
    if (endTime < startTime) {
      // Crosses midnight, increment date
      const d = new Date(dateStr);
      d.setDate(d.getDate() + 1);
      endDate = d.toISOString().split("T")[0];
    }
    const endUtc = toUtcIso(endDate, endTime);
    return { startUtc, endUtc };
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

  // Get Sunday of a specific week with offset using UTC to match schedule logic
  const getWeekSundayWithOffset = (offset: number) => {
    const today = new Date();
    const currentWeekStart = new Date(today);
    // Sunday = 0
    const day = currentWeekStart.getUTCDay();
    const diff = currentWeekStart.getUTCDate() - day;
    currentWeekStart.setUTCDate(diff);
    currentWeekStart.setUTCHours(0, 0, 0, 0);
    // Apply offset
    const targetWeek = new Date(currentWeekStart);
    targetWeek.setUTCDate(targetWeek.getUTCDate() + offset * 7);
    return targetWeek;
  };

  // Generate week days for timeline based on current week offset
  const generateWeekDays = () => {
    const sunday = getWeekSundayWithOffset(currentWeekOffset);
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(sunday);
      day.setUTCDate(sunday.getUTCDate() + i);
      const year = day.getUTCFullYear();
      const month = day.getUTCMonth();
      const date = day.getUTCDate();
      const displayDay = new Date(Date.UTC(year, month, date));
      weekDays.push({
        date: day,
        dayName: displayDay.toLocaleDateString("en-US", { weekday: "short" }),
        dayNumber: displayDay.getUTCDate(),
        month: displayDay.toLocaleDateString("en-US", { month: "short" }),
        isToday:
          day.toISOString().split("T")[0] ===
          new Date().toISOString().split("T")[0],
        position: (i / 7) * 100,
      });
    }
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
      // Parse the date from startTime to avoid timezone issues
      const scheduleDate = new Date(schedule.startTime);

      // Use UTC to avoid timezone issues - stay in UTC throughout
      const year = scheduleDate.getUTCFullYear();
      const month = scheduleDate.getUTCMonth();
      const day = scheduleDate.getUTCDate();

      // Get day of week directly from the original UTC date
      const dayOfWeekUTC = scheduleDate.getUTCDay(); // 0=Sunday, 1=Monday, etc.
      const dayIndex = (dayOfWeekUTC + 6) % 7; // Convert Sunday=0 to Monday=0

      console.log("📅 Timeline mapping:", {
        originalDate: schedule.startTime,
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

  // --- Helper: get 21-day window start/end for a given center date ---
  const get21DayWindow = (center: Date) => {
    const start = new Date(center);
    start.setDate(center.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    const end = new Date(center);
    end.setDate(center.getDate() + 13);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  };

  // --- Fetch 21-day window of schedules ---
  const fetchSchedulesWindow = async (center: Date) => {
    try {
      setLoading(true);
      const { start, end } = get21DayWindow(center);
      const schedulesRes = await api.get(
        `/frontdesk/schedule?start=${start.toISOString()}&end=${end.toISOString()}`
      );
      setScheduleWindow(schedulesRes.schedules);
      setWindowCenterDate(center);
    } catch (error) {
      console.error("❌ Error fetching 21-day window:", error);
      toast.error("Failed to fetch schedules data");
    } finally {
      setLoading(false);
    }
  };

  // Live WS updates: update scheduleWindow in place without reload
  useEffect(() => {
    if (!onScheduleEvent) return;
    const off = onScheduleEvent(({ type, schedule }) => {
      setScheduleWindow((prev) => {
        if (!schedule || !schedule.id) return prev;
        if (type === "new") {
          const exists = prev.some((s) => s.id === String(schedule.id) || s.id === schedule.id);
          return exists ? prev : [...prev, schedule];
        }
        if (type === "updated") {
          return prev.map((s) => (s.id === String(schedule.id) || s.id === schedule.id ? { ...s, ...schedule } : s));
        }
        if (type === "deleted") {
          return prev.filter((s) => s.id !== String(schedule.id) && s.id !== schedule.id);
        }
        return prev;
      });
    });
    return off;
  }, [onScheduleEvent]);

  // --- Filter schedules for the current week view ---
  const getSchedulesForCurrentWeek = (weekStart: Date, weekEnd: Date) => {
    return scheduleWindow.filter((sch) => {
      const schDate = new Date(sch.startTime);
      return schDate >= weekStart && schDate <= weekEnd;
    });
  };

  // --- Replace fetchSchedulesForWeek with 21-day window logic ---
  const fetchSchedulesForWeek = async (weekOffset: number) => {
    // Calculate the new center date (middle of the week)
    const weekStart = getWeekSundayWithOffset(weekOffset);
    const center = new Date(weekStart);
    center.setDate(weekStart.getDate() + 3); // Center is Thursday for visual balance
    await fetchSchedulesWindow(center);
    setCurrentWeekOffset(weekOffset);
  };

  // Fetch static data only once (drivers and shuttles don't change often)
  const fetchStaticData = async () => {
    try {
      console.log("🔄 Fetching static data (drivers & shuttles)...");

      const [driversRes, shuttlesRes] = await Promise.all([
        api.get("/frontdesk/get/driver"),
        api.get("/frontdesk/get/shuttle"),
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
    const weekStart = getWeekSundayWithOffset(currentWeekOffset);
    setWeeklySchedule({
      shuttleId: "",
      driverId: "",
      startDate: weekStart.toISOString().split("T")[0],
      sunday: { startTime: "10:00", endTime: "16:00", enabled: false },
      monday: { startTime: "09:00", endTime: "17:00", enabled: true },
      tuesday: { startTime: "09:00", endTime: "17:00", enabled: true },
      wednesday: { startTime: "09:00", endTime: "17:00", enabled: true },
      thursday: { startTime: "09:00", endTime: "17:00", enabled: true },
      friday: { startTime: "09:00", endTime: "17:00", enabled: true },
      saturday: { startTime: "10:00", endTime: "16:00", enabled: true },
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
      // Build per-day UTC ISO times expected by backend
      const dayOffsets: Record<string, number> = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
      };

      const buildDateStrForOffset = (startDateStr: string, offset: number) => {
        const base = new Date(startDateStr);
        base.setDate(base.getDate() + offset);
        return base.toISOString().split("T")[0];
      };

      const payloadWeekSchedule: any = {};
      Object.entries(dayOffsets).forEach(([dayKey, offset]) => {
        const dayData: any = (weeklySchedule as any)[dayKey];
        if (!dayData) return;
        if (dayData.enabled && weeklySchedule.startDate) {
          const dateStr = buildDateStrForOffset(
            weeklySchedule.startDate,
            offset
          );
          const { startUtc, endUtc } = getStartEndUtc(
            dateStr,
            dayData.startTime,
            dayData.endTime
          );
          payloadWeekSchedule[dayKey] = {
            ...dayData,
            startUtc,
            endUtc,
          };
        } else {
          payloadWeekSchedule[dayKey] = { ...dayData };
        }
      });

      const response = await api.post("/frontdesk/add/weekly-schedule", {
        driverId: weeklySchedule.driverId,
        shuttleId: weeklySchedule.shuttleId,
        startDate: weeklySchedule.startDate,
        weekSchedule: payloadWeekSchedule,
      });

      toast.success(response.message || "Weekly schedule created successfully");
      setIsWeeklyDialogOpen(false);
      resetWeeklyForm();

      // Refresh current week data since we added new schedules
      fetchSchedulesForWeek(currentWeekOffset);
    } catch (error: any) {
      console.error("Error creating weekly schedule:", error);

      // Show specific error message from backend if available
      const errorMessage =
        error.response?.data?.message || "Failed to create weekly schedule";
      toast.error(errorMessage);

      // If there are existing schedules, show them in the form
      if (error.response?.data?.existingSchedules) {
        const existingSchedules = error.response.data.existingSchedules;
        console.log("Existing schedules found:", existingSchedules);

        // You could potentially show these in a modal or update the form
        // For now, just log them and let the user handle it manually
      }
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
      if (!isFormValid()) {
        toast.error("End date/time must be after start date/time");
        setSubmitting(false);
        return;
      }
      // Combine date and time into datetime-local format, then convert to UTC ISO
      const startDateTimeStr = combineDateTime(startDate, startTime);
      const endDateTimeStr = combineDateTime(endDate, endTime);
      const startUtc = localInputToUtcIso(startDateTimeStr);
      const endUtc = localInputToUtcIso(endDateTimeStr);

      if (editingSchedule) {
        const response = await api.put(
          `/frontdesk/edit/schedule/${editingSchedule.id}`,
          {
            driverId: parseInt(formData.driverId),
            shuttleId: parseInt(formData.shuttleId),
            startTime: startUtc,
            endTime: endUtc,
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
        const response = await api.post("/frontdesk/add/schedule", {
          driverId: parseInt(formData.driverId),
          shuttleId: parseInt(formData.shuttleId),
          startTime: startUtc,
          endTime: endUtc,
        });

        setSchedules([...(schedules || []), response.schedule]);
        toast.success("Schedule added successfully");
      }
      resetForm();
      setIsAddDialogOpen(false);

      // Refresh current week data since we added/updated a schedule
      fetchSchedulesForWeek(currentWeekOffset);
    } catch (error: any) {
      console.error("Error submitting schedule:", error);

      // Show specific error message from backend if available
      const errorMessage =
        error.response?.data?.message || "Failed to save schedule";
      toast.error(errorMessage);

      // If there's an existing schedule, show it in the form
      if (error.response?.data?.existingSchedule) {
        const existingSchedule = error.response.data.existingSchedule;
        setEditingSchedule(existingSchedule);

        const startSplit = splitDateTime(utcToLocalInput(existingSchedule.startTime));
        const endSplit = splitDateTime(utcToLocalInput(existingSchedule.endTime));
        setStartDate(startSplit.date);
        setEndDate(endSplit.date);
        setStartTime(startSplit.time);
        setEndTime(endSplit.time);

        setFormData({
          driverId: String(existingSchedule.driver.id),
          shuttleId: String(existingSchedule.shuttle.id),
          startTime: utcToLocalInput(existingSchedule.startTime),
          endTime: utcToLocalInput(existingSchedule.endTime),
        });

        setSelectedDate(new Date(existingSchedule.startTime));
        setIsAddDialogOpen(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule);

    const startSplit = splitDateTime(utcToLocalInput(schedule.startTime));
    const endSplit = splitDateTime(utcToLocalInput(schedule.endTime));
    setStartDate(startSplit.date);
    setEndDate(endSplit.date);
    setStartTime(startSplit.time);
    setEndTime(endSplit.time);

    setFormData({
      driverId: String(schedule.driver.id),
      shuttleId: String(schedule.shuttle.id),
      startTime: utcToLocalInput(schedule.startTime),
      endTime: utcToLocalInput(schedule.endTime),
    });

    setSelectedDate(new Date(schedule.startTime));
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await api.delete(`/frontdesk/delete/schedule/${id}`);
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
    setFormData({
      driverId: "",
      shuttleId: "",
      startTime: "",
      endTime: "",
    });
    setStartDate(null);
    setEndDate(null);
    setStartTime("");
    setEndTime("");
    setSelectedDate(new Date()); // Reset calendar to today
    setEditingSchedule(null);
  };

  // Add back formatDateForDisplay for date columns
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

  if (loading) {
    return (
      <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">
        <motion.div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-blue-900 text-sm" variants={itemVariants}>
          All times shown in your local timezone: <b>{getUserTimeZone()}</b>
        </motion.div>
        <div className="flex items-center justify-between">
          <motion.div className="space-y-1" variants={itemVariants}>
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-80" />
          </motion.div>
          <motion.div className="flex gap-3" variants={itemVariants}>
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-9 w-40" />
          </motion.div>
        </div>
        <motion.div variants={scaleIn}>
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
              <div className="space-y-4">
                <div className="grid w-full grid-cols-2 gap-2">
                  <Skeleton className="h-9" />
                  <Skeleton className="h-9" />
                </div>
                <div className="grid gap-2 p-3 bg-slate-50 rounded-lg">
                  <Skeleton className="h-4 w-40" />
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4 rounded" />
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex">
                  <div className="w-12 flex-shrink-0">
                    <div className="h-12 border-b border-slate-200"></div>
                    <div className="bg-slate-50 border border-slate-200 rounded-l-lg">
                      {[...Array(24)].map((_, hour) => (
                        <div
                          key={hour}
                          className="h-12 flex items-center justify-end pr-2 text-xs text-slate-400 border-b border-slate-100 last:border-b-0"
                        >
                          <Skeleton className="h-3 w-10" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 bg-white border border-slate-200 rounded-r-lg overflow-hidden">
                    <div className="min-w-[1050px]">
                      <div className="grid grid-cols-7 border-b border-slate-200 h-12">
                        {[...Array(7)].map((_, idx) => (
                          <div
                            key={idx}
                            className="flex flex-col items-center justify-center border-r border-slate-200 last:border-r-0 px-2"
                          >
                            <Skeleton className="h-4 w-16 mb-1" />
                            <Skeleton className="h-3 w-12" />
                          </div>
                        ))}
                      </div>
                      <div className="relative">
                        <Skeleton className="w-full" style={{ height: 24 * 48 + 1 }} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                  <Skeleton className="h-4 w-64" />
                  <div className="flex gap-2">
                    <Skeleton className="h-9 w-36" />
                    <Skeleton className="h-9 w-28" />
                    <Skeleton className="h-9 w-36" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    );
  }

  const weeklyScheduleData = getWeeklyTimelineSchedules();
  const weekDays = generateWeekDays();

  // --- For rendering, use only the current week from the 21-day window ---
  const weekStartDate = new Date(weekDays[0].date);
  weekStartDate.setHours(0, 0, 0, 0);
  const weekEndDate = new Date(weekDays[6].date);
  weekEndDate.setHours(23, 59, 59, 999);
  const currentWeekSchedules = getSchedulesForCurrentWeek(
    weekStartDate,
    weekEndDate
  );

  // --- Helper: get all schedules that overlap the current week, and slice their visible part to the current week ---
  const getSchedulesForDay = (colIdx: number) => {
    const dayDate = new Date(weekDays[colIdx].date);
    dayDate.setHours(0, 0, 0, 0);
    const dayStart = new Date(dayDate);
    const dayEnd = new Date(dayDate);
    dayEnd.setDate(dayEnd.getDate() + 1);
    dayEnd.setHours(0, 0, 0, 0);
    const blocks: any[] = [];
    (currentWeekSchedules || []).forEach((sch: Schedule) => {
      const scheduleStart = new Date(sch.startTime);
      const scheduleEnd = new Date(sch.endTime);
      // Only consider schedules that overlap this day
      const blockStart = scheduleStart > dayStart ? scheduleStart : dayStart;
      const blockEnd = scheduleEnd < dayEnd ? scheduleEnd : dayEnd;
      if (blockStart < blockEnd) {
        blocks.push({
          ...sch,
          _visibleStart: blockStart,
          _visibleEnd: blockEnd,
        });
      }
    });
    // Overlap detection and stacking (side-by-side)
    blocks.sort((a, b) => a._visibleStart - b._visibleStart);
    let overlapIdx = 0;
    let lastEnd = null;
    for (let i = 0; i < blocks.length; i++) {
      if (lastEnd && blocks[i]._visibleStart < lastEnd) {
        overlapIdx++;
      } else {
        overlapIdx = 0;
      }
      blocks[i]._overlapIdx = overlapIdx;
      blocks[i]._overlapTotal = Math.max(
        1,
        blocks.filter(
          (b) =>
            b._visibleStart < blocks[i]._visibleEnd &&
            b._visibleEnd > blocks[i]._visibleStart
        ).length
      );
      lastEnd = blocks[i]._visibleEnd;
    }
    return blocks;
  };

  return (
    <>
      <motion.div
        className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-blue-900 text-sm"
        variants={fadeIn}
        initial="hidden"
        animate="visible"
      >
        All times shown in your local timezone: <b>{getUserTimeZone()}</b>
      </motion.div>
      <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">
        <motion.div className="flex items-center justify-between" variants={itemVariants}>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Schedules Management</h1>
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
                <motion.form onSubmit={handleSubmit} className="space-y-4" variants={containerVariants} initial="hidden" animate="visible">
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startDate">Start Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !startDate && "text-muted-foreground"
                            )}
                            disabled={submitting}
                          >
                            {startDate ? format(startDate, "PPP") : "Pick start date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={startDate || undefined}
                            onSelect={(date) => setStartDate(date || null)}
                            disabled={(date) => isDateInPast(date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <Label htmlFor="startTime">Start Time</Label>
                      <Input
                        id="startTime"
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        required
                        className="w-full"
                        disabled={submitting}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="endDate">End Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !endDate && "text-muted-foreground"
                            )}
                            disabled={submitting}
                          >
                            {endDate ? format(endDate, "PPP") : "Pick end date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={endDate || undefined}
                            onSelect={(date) => setEndDate(date || null)}
                            disabled={(date) => isDateInPast(date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <Label htmlFor="endTime">End Time</Label>
                      <Input
                        id="endTime"
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        required
                        className="w-full"
                        disabled={submitting}
                      />
                    </div>
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
                      disabled={submitting || !isFormValid()}
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
                </motion.form>
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
                    enable/disable specific days and set different times for
                    each day.
                  </div>
                </DialogHeader>

                <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">
                  {/* Shuttle and Driver Selection */}
                  <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-4" variants={itemVariants}>
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
                            <SelectItem
                              key={driver.id}
                              value={String(driver.id)}
                            >
                              {driver.name} ({driver.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </motion.div>

                  {/* Week start date */}
                  <motion.div variants={itemVariants}>
                    <Label htmlFor="startDate">Week Start Date (Sunday)</Label>
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
                  </motion.div>

                  {/* Weekly Schedule Grid */}
                  <motion.div className="space-y-4" variants={itemVariants}>
                    <h3 className="text-lg font-semibold text-slate-900">
                      Weekly Schedule
                    </h3>
                    <div className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded p-2 mb-2">
                      All times below are in your local timezone:{" "}
                      <b>{getUserTimeZone()}</b>
                    </div>
                    <div className="grid gap-4">
                      {daysOfWeek.map((day) => {
                        const dayData =
                          weeklySchedule[
                            day.key as keyof typeof weeklySchedule
                          ];
                        if (
                          typeof dayData === "object" &&
                          dayData !== null &&
                          "enabled" in dayData
                        ) {
                          return (
                            <motion.div
                              key={day.key}
                              className={`p-4 border rounded-lg transition-all ${
                                dayData.enabled
                                  ? "border-blue-200 bg-blue-50/50"
                                  : "border-slate-200 bg-slate-50/50"
                              }`}
                              variants={itemVariants}
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
                            </motion.div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </motion.div>

                  {/* Action Buttons */}
                  <motion.div className="flex justify-end space-x-3 pt-4 border-t" variants={itemVariants}>
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
                  </motion.div>
                </motion.div>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        <motion.div variants={scaleIn}>
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
                <motion.div className="space-y-4 lg:space-y-6" variants={containerVariants} initial="hidden" animate="visible">
                  {/* Legend */}
                  <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-2 lg:gap-4 p-3 lg:p-4 bg-slate-50 rounded-lg" variants={itemVariants}>
                    <h3 className="font-semibold text-slate-900 col-span-full lg:w-full mb-1 lg:mb-2 text-sm lg:text-base">
                      Shuttles Legend:
                    </h3>
                    {shuttles.map((shuttle) => (
                      <motion.div
                        key={shuttle.id}
                        className="flex items-center gap-2 min-w-0"
                        variants={itemVariants}
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
                      </motion.div>
                    ))}
                  </motion.div>
                  <div className="block xl:hidden text-xs text-slate-500 text-center py-2 bg-blue-50 rounded border border-blue-200">
                    👈 Scroll horizontally to view the full weekly calendar
                  </div>
                  <motion.div className="flex" variants={itemVariants}>
                    {/* Hour labels column */}
                    <div className="w-12 flex-shrink-0">
                      {/* Empty header to align with day headers */}
                      <div className="h-12 border-b border-slate-200"></div>
                      {/* Hour labels */}
                      <div className="bg-slate-50 border border-slate-200 rounded-l-lg">
                        {[...Array(24)].map((_, hour) => (
                          <div
                            key={hour}
                            className="h-12 flex items-start justify-end pr-2 text-xs text-slate-500 select-none border-b border-slate-100 last:border-b-0"
                          >
                            {hour === 0
                              ? "12 AM"
                              : hour < 12
                              ? `${hour} AM`
                              : hour === 12
                              ? "12 PM"
                              : `${hour - 12} PM`}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Main timeline grid */}
                    <div className="flex-1 bg-white border border-slate-200 rounded-r-lg overflow-x-auto">
                      <div className="min-w-[1050px]">
                        {/* Header: Days of week, perfectly aligned with columns */}
                        <motion.div className="grid grid-cols-7 border-b border-slate-200 h-12" variants={containerVariants}>
                          {weekDays.map((day, idx) => (
                            <motion.div
                              key={idx}
                              className="flex flex-col items-center justify-center border-r border-slate-200 last:border-r-0 text-slate-600"
                              variants={itemVariants}
                            >
                              <div className="text-xs lg:text-sm font-semibold w-full text-center">
                                {day.dayName}
                              </div>
                              <div className="text-xs lg:text-sm w-full text-center">
                                {day.month} {day.dayNumber}
                              </div>
                              {day.isToday && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-1 mx-auto"></div>
                              )}
                            </motion.div>
                          ))}
                        </motion.div>
                        {/* Body: 24-hour grid, columns perfectly aligned */}
                        <div
                          className="relative grid grid-cols-7"
                          style={{ height: 24 * 48 + 1 }}
                        >
                          {weekDays.map((day, colIdx) => {
                            const daySchedules = getSchedulesForDay(
                              colIdx
                            ).filter((sch) => sch !== null) as Array<any>;
                            return (
                              <motion.div
                                key={colIdx}
                                className="relative border-r border-slate-100 last:border-r-0 h-full"
                                style={{ overflow: "visible" }}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.25, delay: colIdx * 0.04 }}
                              >
                                {[...Array(24)].map((_, hour) => (
                                  <div
                                    key={hour}
                                    className="border-b border-slate-100 h-12"
                                  ></div>
                                ))}
                                {daySchedules.map((sch, i) => {
                                  const start = sch._visibleStart;
                                  const end = sch._visibleEnd;
                                  const dayStart = new Date(day.date);
                                  dayStart.setHours(0, 0, 0, 0);
                                  const blockStartOffset =
                                    (start.getTime() - dayStart.getTime()) /
                                    (1000 * 60 * 60);
                                  const blockEndOffset =
                                    (end.getTime() - dayStart.getTime()) /
                                    (1000 * 60 * 60);
                                  const top = blockStartOffset * 48;
                                  const height = Math.max(
                                    (blockEndOffset - blockStartOffset) * 48,
                                    24
                                  );
                                  // Overlap stacking
                                  const overlapIdx = sch._overlapIdx || 0;
                                  const overlapTotal = sch._overlapTotal || 1;
                                  const leftPercent =
                                    (overlapIdx / overlapTotal) * 100;
                                  const widthPercent = 100 / overlapTotal;
                                  return (
                                    <motion.div
                                      key={sch.id + "-" + i}
                                      className={`absolute rounded-md shadow-md cursor-pointer ${getShuttleColor(
                                        sch.shuttle.id
                                      )} flex flex-col justify-center items-center p-1.5 transition-all`}
                                      style={{
                                        top,
                                        height,
                                        left: `${leftPercent}%`,
                                        width: `${widthPercent}%`,
                                        minWidth: 60,
                                        zIndex: 20 + i,
                                      }}
                                      initial={{ opacity: 0, scale: 0.96 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      transition={{ duration: 0.2, ease: "easeOut", delay: i * 0.02 }}
                                      onClick={() => handleEdit(sch)}
                                      title={`${sch.driver.name} - ${sch.shuttle.vehicleNumber}`}
                                    >
                                      <div className="font-semibold text-xs truncate w-full text-center">
                                        {sch.driver.name}
                                      </div>
                                      <div className="text-xs text-slate-700 truncate w-full text-center">
                                        {sch.shuttle.vehicleNumber}
                                      </div>
                                      <div className="text-[10px] text-slate-500">
                                        {formatTimeForDisplay(sch.startTime)} -{" "}
                                        {formatTimeForDisplay(sch.endTime)}
                                      </div>
                                    </motion.div>
                                  );
                                })}
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
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
              </TabsContent>

              <TabsContent value="table" className="mt-6">
                <motion.div className="space-y-4" variants={containerVariants} initial="hidden" animate="visible">
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
                      {currentWeekSchedules &&
                      currentWeekSchedules.length > 0 ? (
                        currentWeekSchedules
                          .sort(
                            (a, b) =>
                              new Date(a.startTime).getTime() -
                              new Date(b.startTime).getTime()
                          )
                          .map((schedule) => {
                            // Use UTC times for duration calculation to avoid timezone issues
                            const startTime = new Date(schedule.startTime);
                            const endTime = new Date(schedule.endTime);

                            // Calculate duration using UTC times
                            const startUTC = Date.UTC(
                              startTime.getUTCFullYear(),
                              startTime.getUTCMonth(),
                              startTime.getUTCDate(),
                              startTime.getUTCHours(),
                              startTime.getUTCMinutes()
                            );
                            const endUTC = Date.UTC(
                              endTime.getUTCFullYear(),
                              endTime.getUTCMonth(),
                              endTime.getUTCDate(),
                              endTime.getUTCHours(),
                              endTime.getUTCMinutes()
                            );

                            const duration =
                              Math.round(
                                ((endUTC - startUTC) / (1000 * 60 * 60)) * 10
                              ) / 10;

                            const displayDuration =
                              duration < 0 ? duration + 24 : duration;

                            return (
                              <motion.tr key={schedule.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                                <TableCell className="font-medium">
                                  <div className="font-semibold">
                                    {formatDateForDisplay(
                                      schedule.startTime
                                    )}
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
                                  <Badge variant="outline">
                                    {displayDuration}h
                                  </Badge>
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
                              </motion.tr>
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
                                This week doesn't have any schedules assigned
                                yet.
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
                </motion.div>
              </TabsContent>
            </Tabs>
          </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </>
  );
}

export default withAuth(SchedulesPage);
