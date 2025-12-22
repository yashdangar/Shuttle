"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import Link from "next/link";

interface RecentBookingsProps {
  bookings: Array<{
    _id: string;
    guestName: string;
    guestEmail: string;
    seats: number;
    totalPrice: number;
    bookingStatus: string;
    paymentStatus: string;
    paymentMethod: string;
    tripName: string;
    scheduledDate: string;
    scheduledTime: string;
    createdAt: string;
  }>;
}

export function RecentBookings({ bookings }: RecentBookingsProps) {
  const today = new Date().toISOString().split('T')[0];
  const todayBookings = bookings.filter(booking => {
    const bookingDate = new Date(booking.createdAt).toISOString().split('T')[0];
    return bookingDate === today;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return "bg-green-100 text-green-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "REJECTED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
        return "bg-green-100 text-green-800";
      case "UNPAID":
        return "bg-yellow-100 text-yellow-800";
      case "REFUNDED":
        return "bg-red-100 text-red-800";
      case "WAIVED":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "MMM dd, yyyy");
    } catch {
      return dateStr;
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Today's Bookings</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[30vw] overflow-y-auto">
          <div className="p-4 space-y-4">
            {todayBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No bookings found for today
              </p>
            ) : (
              todayBookings.map((booking) => (
                <Link
                  key={booking._id}
                  href={`/frontdesk/bookings/${booking._id}`}
                  className="block"
                >
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium truncate">{booking.guestName}</p>
                        <Badge variant="outline" className="text-xs">
                          {booking.seats} seat{booking.seats !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {booking.guestEmail}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {booking.tripName} • {formatDate(booking.scheduledDate)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {booking.scheduledTime}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 ml-4">
                      <p className="font-semibold">{formatCurrency(booking.totalPrice)}</p>
                      <div className="flex gap-1">
                        <Badge className={getStatusColor(booking.bookingStatus)}>
                          {booking.bookingStatus}
                        </Badge>
                        <Badge className={getPaymentStatusColor(booking.paymentStatus)}>
                          {booking.paymentStatus}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {booking.paymentMethod}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

