"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  MapPin,
  Clock,
  Users,
  Ticket,
  ChevronRight,
  Bus,
  Calendar,
  Play,
} from "lucide-react";

// Parse ISO time string like "1970-01-01T09:00:00.000Z" to display time
function formatISOTime(isoTimeStr: string): string {
  try {
    if (isoTimeStr.includes("T")) {
      const date = new Date(isoTimeStr);
      const hours = date.getUTCHours();
      const minutes = date.getUTCMinutes();
      const ampm = hours >= 12 ? "PM" : "AM";
      const hour12 = hours % 12 || 12;
      return `${hour12}:${minutes.toString().padStart(2, "0")} ${ampm}`;
    } else {
      const [hours, minutes] = isoTimeStr.split(":");
      const h = parseInt(hours, 10);
      const ampm = h >= 12 ? "PM" : "AM";
      const hour12 = h % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    }
  } catch {
    return isoTimeStr;
  }
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

interface TripInstanceCardProps {
  trip: {
    _id: string;
    tripName: string;
    sourceLocation: string;
    destinationLocation: string;
    scheduledDate: string;
    scheduledStartTime: string;
    scheduledEndTime: string;
    seatsOccupied: number;
    seatsHeld?: number;
    totalSeats: number;
    status: string;
    vehicleNumber?: string;
    bookingCount: number;
  };
  showDate?: boolean;
}

export function TripInstanceCard({
  trip,
  showDate = false,
}: TripInstanceCardProps) {
  const getStatusStyles = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return {
          borderColor: "#10b981",
          bgColor: "bg-emerald-50/50",
          badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
          label: "✓ Completed",
        };
      case "IN_PROGRESS":
        return {
          borderColor: "#f59e0b",
          bgColor: "bg-amber-50/50",
          badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
          label: "🚗 In Progress",
        };
      case "CANCELLED":
        return {
          borderColor: "#ef4444",
          bgColor: "bg-rose-50/50",
          badgeClass: "bg-rose-100 text-rose-800 border-rose-200",
          label: "✕ Cancelled",
        };
      default:
        return {
          borderColor: "#3b82f6",
          bgColor: "bg-white",
          badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
          label: "Scheduled",
        };
    }
  };

  const statusStyles = getStatusStyles(trip.status);

  return (
    <Card
      className={`relative overflow-hidden border-l-4 transition-all active:scale-[0.99] hover:shadow-md ${statusStyles.bgColor}`}
      style={{ borderLeftColor: statusStyles.borderColor }}
    >
      <CardContent className="p-4">
        {/* Top Row: Trip Name & Status */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate">
              {trip.tripName}
            </h3>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {trip.sourceLocation} → {trip.destinationLocation}
              </span>
            </div>
          </div>
          <Badge
            className={`text-xs shrink-0 border ${statusStyles.badgeClass}`}
          >
            {statusStyles.label}
          </Badge>
        </div>

        {/* In Progress Indicator */}
        {trip.status === "IN_PROGRESS" && (
          <div className="flex items-center gap-2 mb-3 p-2 bg-amber-100 rounded-lg">
            <Play className="h-4 w-4 text-amber-700 animate-pulse" />
            <span className="text-sm font-medium text-amber-800">
              Trip is currently in progress
            </span>
          </div>
        )}

        {/* Middle Row: Date, Time & Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-y border-dashed">
          <div className="flex items-center gap-3 flex-wrap">
            {showDate && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-violet-500" />
                <span className="text-sm font-medium">
                  {formatDate(trip.scheduledDate)}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="font-medium text-sm">
                {formatISOTime(trip.scheduledStartTime)} -{" "}
                {formatISOTime(trip.scheduledEndTime)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {trip.seatsOccupied}/{trip.totalSeats}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Ticket className="h-4 w-4 text-muted-foreground" />
              <span>{trip.bookingCount}</span>
            </div>
            {trip.vehicleNumber && (
              <div className="flex items-center gap-1">
                <Bus className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs">{trip.vehicleNumber}</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Row: View Details */}
        <div className="mt-3 flex justify-end">
          <Link href={`/driver/trips/${trip._id}`}>
            <Button
              variant={trip.status === "IN_PROGRESS" ? "default" : "outline"}
              size="sm"
              className={`h-8 text-xs ${
                trip.status === "IN_PROGRESS"
                  ? "bg-amber-600 hover:bg-amber-700"
                  : ""
              }`}
            >
              {trip.status === "IN_PROGRESS" ? "Manage Trip" : "View Details"}
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
