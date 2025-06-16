"use client";

import { useState } from "react";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/hooks/use-toast";
import { Calendar, X, CreditCard } from "lucide-react";

const bookings = [
  {
    id: 1,
    guestName: "John Smith",
    shuttleNumber: "SH-001",
    numberOfPersons: 2,
    numberOfBags: 3,
    pickupLocation: "Hotel Lobby",
    dropoffLocation: "Airport Terminal 1",
    preferredTime: "2024-01-15 14:30",
    paymentStatus: "Paid",
    paymentMethod: "APP",
    status: "Confirmed",
  },
  {
    id: 2,
    guestName: "Sarah Johnson",
    shuttleNumber: "SH-003",
    numberOfPersons: 1,
    numberOfBags: 2,
    pickupLocation: "Airport Terminal 2",
    dropoffLocation: "Hotel Lobby",
    preferredTime: "2024-01-15 15:15",
    paymentStatus: "Pending",
    paymentMethod: "FRONTDESK",
    status: "Confirmed",
  },
  {
    id: 3,
    guestName: "Mike Davis",
    shuttleNumber: "SH-002",
    numberOfPersons: 4,
    numberOfBags: 6,
    pickupLocation: "Hotel Lobby",
    dropoffLocation: "Airport Terminal 3",
    preferredTime: "2024-01-15 16:00",
    paymentStatus: "Paid",
    paymentMethod: "DEPOSIT",
    status: "In Progress",
  },
];

export default function BookingsPage() {
  const [selectedBooking, setSelectedBooking] = useState<
    (typeof bookings)[0] | null
  >(null);
  const [actionType, setActionType] = useState<
    "cancel" | "reschedule" | "payment" | null
  >(null);
  const [rescheduleTime, setRescheduleTime] = useState("");
  const { toast } = useToast();

  const handleAction = (
    booking: (typeof bookings)[0],
    action: "cancel" | "reschedule" | "payment"
  ) => {
    setSelectedBooking(booking);
    setActionType(action);
    if (action === "reschedule") {
      setRescheduleTime(booking.preferredTime);
    }
  };

  const confirmAction = () => {
    if (!selectedBooking || !actionType) return;

    switch (actionType) {
      case "cancel":
        toast({
          title: "Booking Cancelled",
          description: `Booking for ${selectedBooking.guestName} has been cancelled.`,
        });
        break;
      case "reschedule":
        toast({
          title: "Booking Rescheduled",
          description: `Booking for ${selectedBooking.guestName} has been rescheduled.`,
        });
        break;
      case "payment":
        toast({
          title: "Payment Confirmed",
          description: `Payment for ${selectedBooking.guestName} has been confirmed.`,
        });
        break;
    }

    setSelectedBooking(null);
    setActionType(null);
    setRescheduleTime("");
  };

  const closeDialog = () => {
    setSelectedBooking(null);
    setActionType(null);
    setRescheduleTime("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
        <p className="text-gray-600">
          Manage shuttle bookings and reservations
        </p>
      </div>

      {/* Desktop Table */}
      <Card className="hidden lg:block">
        <CardHeader>
          <CardTitle>All Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest Name</TableHead>
                <TableHead>Shuttle</TableHead>
                <TableHead>Persons</TableHead>
                <TableHead>Bags</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-medium">
                    {booking.guestName}
                  </TableCell>
                  <TableCell>{booking.shuttleNumber}</TableCell>
                  <TableCell>{booking.numberOfPersons}</TableCell>
                  <TableCell>{booking.numberOfBags}</TableCell>
                  <TableCell className="max-w-[200px]">
                    <div className="text-sm">
                      {booking.pickupLocation} → {booking.dropoffLocation}
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(booking.preferredTime).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        booking.paymentStatus === "Paid"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {booking.paymentStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleAction(booking, "reschedule")}
                        title="Reschedule"
                      >
                        <Calendar className="h-4 w-4" />
                      </Button>
                      {booking.paymentMethod === "FRONTDESK" &&
                        booking.paymentStatus === "Pending" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleAction(booking, "payment")}
                            title="Confirm Payment"
                          >
                            <CreditCard className="h-4 w-4" />
                          </Button>
                        )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleAction(booking, "cancel")}
                        title="Cancel Booking"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Mobile Cards */}
      <div className="grid gap-4 lg:hidden">
        {bookings.map((booking) => (
          <Card key={booking.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{booking.guestName}</h3>
                <Badge
                  variant={
                    booking.paymentStatus === "Paid" ? "default" : "secondary"
                  }
                >
                  {booking.paymentStatus}
                </Badge>
              </div>
              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <p>
                  <span className="font-medium">Shuttle:</span>{" "}
                  {booking.shuttleNumber}
                </p>
                <p>
                  <span className="font-medium">Persons:</span>{" "}
                  {booking.numberOfPersons} |{" "}
                  <span className="font-medium">Bags:</span>{" "}
                  {booking.numberOfBags}
                </p>
                <p>
                  <span className="font-medium">Route:</span>{" "}
                  {booking.pickupLocation} → {booking.dropoffLocation}
                </p>
                <p>
                  <span className="font-medium">Time:</span>{" "}
                  {new Date(booking.preferredTime).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction(booking, "reschedule")}
                >
                  <Calendar className="h-4 w-4 mr-1" />
                  Reschedule
                </Button>
                {booking.paymentMethod === "FRONTDESK" &&
                  booking.paymentStatus === "Pending" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAction(booking, "payment")}
                    >
                      <CreditCard className="h-4 w-4 mr-1" />
                      Payment
                    </Button>
                  )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction(booking, "cancel")}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action Modals */}
      <Dialog open={!!actionType} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "cancel" && "Cancel Booking"}
              {actionType === "reschedule" && "Reschedule Booking"}
              {actionType === "payment" && "Confirm Payment"}
            </DialogTitle>
          </DialogHeader>

          {actionType === "cancel" && (
            <div className="py-4">
              <p>
                Are you sure you want to cancel the booking for{" "}
                <strong>{selectedBooking?.guestName}</strong>?
              </p>
              <p className="text-sm text-gray-600 mt-2">
                This action cannot be undone.
              </p>
            </div>
          )}

          {actionType === "reschedule" && (
            <div className="py-4 space-y-4">
              <p>
                Reschedule booking for{" "}
                <strong>{selectedBooking?.guestName}</strong>
              </p>
              <div className="space-y-2">
                <Label htmlFor="reschedule-time">New Preferred Time</Label>
                <Input
                  id="reschedule-time"
                  type="datetime-local"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                />
              </div>
            </div>
          )}

          {actionType === "payment" && (
            <div className="py-4">
              <p>
                Confirm payment received for{" "}
                <strong>{selectedBooking?.guestName}</strong>?
              </p>
              <p className="text-sm text-gray-600 mt-2">
                This will mark the booking as paid.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={confirmAction}>
              {actionType === "cancel" && "Cancel Booking"}
              {actionType === "reschedule" && "Reschedule"}
              {actionType === "payment" && "Confirm Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
