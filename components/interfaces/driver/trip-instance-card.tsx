"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  MapPin,
  Clock,
  Users,
  Ticket,
  ChevronRight,
  Calendar,
  Play,
} from "lucide-react";
import { useHotelTime } from "@/hooks/use-hotel-time";

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
  const { formatScheduledDateTime, getOffset } = useHotelTime();

  // Format the scheduled date and time using hotel timezone
  const schedule = formatScheduledDateTime(
    trip.scheduledDate,
    trip.scheduledStartTime
  );
  const scheduleEnd = formatScheduledDateTime(
    trip.scheduledDate,
    trip.scheduledEndTime
  );

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return {
          dotColor: "bg-emerald-500",
          badgeClass: "bg-emerald-500/10 text-emerald-700 border-0",
          label: "Completed",
        };
      case "IN_PROGRESS":
        return {
          dotColor: "bg-amber-500 animate-pulse",
          badgeClass: "bg-amber-500/10 text-amber-700 border-0",
          label: "In Progress",
        };
      case "CANCELLED":
        return {
          dotColor: "bg-rose-500",
          badgeClass: "bg-rose-500/10 text-rose-700 border-0",
          label: "Cancelled",
        };
      default:
        return {
          dotColor: "bg-primary",
          badgeClass: "bg-primary/10 text-primary border-0",
          label: "Scheduled",
        };
    }
  };

  const statusStyles = getStatusStyles(trip.status);

  return (
    <Link href={`/driver/trips/${trip._id}`} className="block">
      <Card className="border shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.99] overflow-hidden group">
        <CardContent className="p-4">
          {/* Top Row: Trip Name & Status */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base group-hover:text-primary transition-colors truncate">
                {trip.tripName}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {trip.sourceLocation} → {trip.destinationLocation}
                </span>
              </div>
            </div>
            <Badge
              className={`text-[10px] shrink-0 font-medium ${statusStyles.badgeClass}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full mr-1.5 ${statusStyles.dotColor}`}
              />
              {statusStyles.label}
            </Badge>
          </div>

          {/* In Progress Banner */}
          {trip.status === "IN_PROGRESS" && (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-amber-500/10 rounded-lg">
              <Play className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-xs font-medium text-amber-700">
                Trip in progress
              </span>
            </div>
          )}

          {/* Stats Row */}
          <div className="flex items-center justify-between gap-4 pt-3 border-t border-dashed">
            <div className="flex items-center gap-3 flex-wrap">
              {showDate && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs">{schedule.date}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-sm">
                <Clock className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium">{schedule.time}</span>
                <span className="text-muted-foreground">-</span>
                <span className="text-muted-foreground">
                  {scheduleEnd.time}
                </span>
                <span className="text-xs text-muted-foreground/70">
                  ({getOffset()})
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                <span className="font-medium text-foreground">
                  {trip.seatsOccupied}
                </span>
                <span>/{trip.totalSeats}</span>
              </div>
              <div className="flex items-center gap-1">
                <Ticket className="h-3.5 w-3.5" />
                <span>{trip.bookingCount}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
