"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Mail, Phone, MapPin, Users, Car } from "lucide-react";

interface Hotel {
  id: number;
  name: string;
  address: string | null;
  phoneNumber: string | null;
  email: string | null;
  status: string;
  createdAt: string;
  admins: Array<{
    id: number;
    name: string;
    email: string;
    createdAt: string;
  }>;
  frontDesks: Array<{
    id: number;
    name: string;
    email: string;
    phoneNumber: string;
    createdAt: string;
  }>;
  drivers: Array<{
    id: number;
    name: string;
    email: string;
    phoneNumber: string;
    createdAt: string;
  }>;
  shuttles: Array<{
    id: number;
    vehicleNumber: string;
    seats: number;
    createdAt: string;
  }>;
  _count: {
    admins: number;
    frontDesks: number;
    drivers: number;
    guests: number;
    shuttles: number;
  };
}

interface HotelDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hotel: Hotel | null;
}

export function HotelDetailsModal({
  open,
  onOpenChange,
  hotel,
}: HotelDetailsModalProps) {
  if (!hotel) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{hotel.name}</DialogTitle>
          <DialogDescription>
            Detailed information about hotel staff and resources
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="font-medium">Address</p>
                  <p className="text-sm text-gray-600">
                    {hotel.address || "No address provided"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="font-medium">Phone</p>
                  <p className="text-sm text-gray-600">
                    {hotel.phoneNumber || "No phone provided"}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-sm text-gray-600">
                    {hotel.email || "No email provided"}
                  </p>
                </div>
              </div>

              <div>
                <p className="font-medium">Status</p>
                <Badge
                  variant={hotel.status === "Active" ? "default" : "secondary"}
                >
                  {hotel.status}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Staff Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Administrators */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Users className="h-5 w-5" />
                Administrators ({hotel.admins.length})
              </h3>
              <div className="space-y-3">
                {hotel.admins.length === 0 ? (
                  <p className="text-sm text-gray-500">No administrators</p>
                ) : (
                  hotel.admins.map((admin) => (
                    <div
                      key={admin.id}
                      className="border rounded-lg p-3 bg-gray-50"
                    >
                      <p className="font-medium">{admin.name}</p>
                      <p className="text-sm text-gray-600">{admin.email}</p>
                      <p className="text-xs text-gray-500">
                        Added: {new Date(admin.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Front Desk Staff */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Users className="h-5 w-5" />
                Front Desk Staff ({hotel.frontDesks.length})
              </h3>
              <div className="space-y-3">
                {hotel.frontDesks.length === 0 ? (
                  <p className="text-sm text-gray-500">No front desk staff</p>
                ) : (
                  hotel.frontDesks.map((staff) => (
                    <div
                      key={staff.id}
                      className="border rounded-lg p-3 bg-gray-50"
                    >
                      <p className="font-medium">{staff.name}</p>
                      <p className="text-sm text-gray-600">{staff.email}</p>
                      <p className="text-sm text-gray-600">
                        {staff.phoneNumber}
                      </p>
                      <p className="text-xs text-gray-500">
                        Added: {new Date(staff.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Drivers */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Users className="h-5 w-5" />
                Drivers ({hotel.drivers.length})
              </h3>
              <div className="space-y-3">
                {hotel.drivers.length === 0 ? (
                  <p className="text-sm text-gray-500">No drivers</p>
                ) : (
                  hotel.drivers.map((driver) => (
                    <div
                      key={driver.id}
                      className="border rounded-lg p-3 bg-gray-50"
                    >
                      <p className="font-medium">{driver.name}</p>
                      <p className="text-sm text-gray-600">{driver.email}</p>
                      <p className="text-sm text-gray-600">
                        {driver.phoneNumber}
                      </p>
                      <p className="text-xs text-gray-500">
                        Added: {new Date(driver.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Shuttles */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Car className="h-5 w-5" />
                Shuttles ({hotel.shuttles.length})
              </h3>
              <div className="space-y-3">
                {hotel.shuttles.length === 0 ? (
                  <p className="text-sm text-gray-500">No shuttles</p>
                ) : (
                  hotel.shuttles.map((shuttle) => (
                    <div
                      key={shuttle.id}
                      className="border rounded-lg p-3 bg-gray-50"
                    >
                      <p className="font-medium">{shuttle.vehicleNumber}</p>
                      <p className="text-sm text-gray-600">
                        Seats: {shuttle.seats}
                      </p>
                      <p className="text-xs text-gray-500">
                        Added:{" "}
                        {new Date(shuttle.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Additional Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">
                {hotel._count.guests}
              </p>
              <p className="text-sm text-gray-600">Total Guests</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {hotel.admins.length +
                  hotel.frontDesks.length +
                  hotel.drivers.length}
              </p>
              <p className="text-sm text-gray-600">Total Staff</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">
                {hotel.shuttles.length}
              </p>
              <p className="text-sm text-gray-600">Active Shuttles</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
