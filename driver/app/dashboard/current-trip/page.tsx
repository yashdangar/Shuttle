"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  MapPin,
  Users,
  CreditCard,
  QrCode,
  ExternalLink,
  CheckCircle,
  Clock,
  Navigation,
} from "lucide-react";
import { QRScannerModal } from "@/components/qr-scanner-modal";
import { toast } from "sonner";

const passengers = [
  {
    id: 1,
    name: "Sarah Johnson",
    persons: 2,
    bags: 3,
    pickup: "Hilton Downtown Hotel",
    dropoff: "Terminal A - Gate 12",
    paymentMethod: "Credit Card",
    status: "next",
    seatNumber: null,
  },
  {
    id: 2,
    name: "Mike Chen",
    persons: 1,
    bags: 1,
    pickup: "Marriott City Center",
    dropoff: "Terminal B - Gate 8",
    paymentMethod: "Cash",
    status: "checked-in",
    seatNumber: "A1",
  },
  {
    id: 3,
    name: "Emily Davis",
    persons: 3,
    bags: 4,
    pickup: "Grand Hotel",
    dropoff: "Terminal A - Gate 15",
    paymentMethod: "Credit Card",
    status: "checked-in",
    seatNumber: "B1-B3",
  },
  {
    id: 4,
    name: "Robert Wilson",
    persons: 1,
    bags: 2,
    pickup: "Holiday Inn Express",
    dropoff: "Terminal C - Gate 5",
    paymentMethod: "Mobile Pay",
    status: "pending",
    seatNumber: null,
  },
];

export default function CurrentTripPage() {
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [passengerList, setPassengerList] = useState(passengers);

  const checkedInCount = passengerList.filter(
    (p) => p.status === "checked-in"
  ).length;
  const totalPassengers = passengerList.reduce((sum, p) => sum + p.persons, 0);
  const occupancyPercentage = (checkedInCount / passengerList.length) * 100;

  const nextPassenger = passengerList.find((p) => p.status === "next");

  const handleQRScanSuccess = (passengerData: any) => {
    setPassengerList((prev) =>
      prev.map((p) =>
        p.id === passengerData.id
          ? { ...p, status: "checked-in", seatNumber: passengerData.seatNumber }
          : p
      )
    );
    toast.success("Check-in successful!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Current Trip</h1>
        <Button
          onClick={() => {
            setShowQRScanner(true);
            toast.error("Failed to fetch trip details");
          }}
          className="h-11 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
        >
          <QrCode className="h-5 w-5 mr-2" />
          Scan QR
        </Button>
      </div>

      {/* Trip Overview */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            Trip Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-foreground">
              Shuttle Occupancy
            </span>
            <span className="font-bold text-lg text-foreground">
              {checkedInCount} / {passengerList.length} passengers
            </span>
          </div>
          <Progress value={occupancyPercentage} className="h-3 bg-blue-100 dark:bg-blue-900" />
          <div className="text-sm text-foreground">
            Total persons: {totalPassengers} | Checked in: {checkedInCount}
          </div>
        </CardContent>
      </Card>

      {/* Next Passenger Highlight */}
      {nextPassenger && (
        <Card className="border-2 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <div className="p-2 bg-blue-600 dark:bg-blue-500 rounded-lg">
                <Navigation className="h-5 w-5 text-white" />
              </div>
              Next Pickup - Priority
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-bold text-xl text-foreground">{nextPassenger.name}</p>
              <p className="text-foreground font-medium">
                {nextPassenger.pickup}
              </p>
              <p className="text-sm text-foreground">
                {nextPassenger.persons} passengers • {nextPassenger.bags} bags
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
                onClick={() =>
                  toast.error("Failed to fetch trip details")
                }
              >
                <MapPin className="h-4 w-4 mr-2" />
                View Map
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-950"
                onClick={() =>
                  toast.error("Failed to update trip status")
                }
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Navigate
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Google Maps Embed */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Route Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="aspect-video bg-blue-50 dark:bg-blue-950 rounded-xl flex items-center justify-center">
            <div className="text-center">
              <MapPin className="h-16 w-16 mx-auto mb-4 text-blue-600 dark:text-blue-400" />
              <p className="text-lg font-medium text-foreground">Google Maps Integration</p>
              <p className="text-sm text-foreground">
                Showing pickup locations and route
              </p>
            </div>
          </div>
          <Button
            className="w-full mt-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
            onClick={() =>
              toast.error("Failed to start trip")
            }
          >
            <MapPin className="h-4 w-4 mr-2" />
            Open Full Map
          </Button>
        </CardContent>
      </Card>

      {/* Passenger List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">
          Passengers ({passengerList.length})
        </h2>
        <div className="grid gap-3">
          {passengerList.map((passenger) => (
            <Card
              key={passenger.id}
              className="hover:shadow-lg transition-all cursor-pointer border-border hover:border-blue-300 dark:hover:border-blue-700"
              onClick={() =>
                toast.error("Failed to fetch trip details")
              }
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="font-bold text-lg text-foreground">{passenger.name}</h3>
                      <Badge
                        variant={
                          passenger.status === "checked-in"
                            ? "default"
                            : passenger.status === "next"
                            ? "secondary"
                            : "outline"
                        }
                        className={
                          passenger.status === "checked-in"
                            ? "bg-blue-600 dark:bg-blue-500 text-white"
                            : passenger.status === "next"
                            ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                            : "border-blue-200 dark:border-blue-800 text-foreground"
                        }
                      >
                        {passenger.status === "checked-in"
                          ? "Checked In"
                          : passenger.status === "next"
                          ? "Next"
                          : "Pending"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <div className="flex items-center gap-2 text-foreground">
                        <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="font-medium">{passenger.pickup}</span>
                      </div>
                      <div className="flex items-center gap-2 text-foreground">
                        <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span>
                          {passenger.persons} passengers • {passenger.bags} bags
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-foreground">
                        <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span>{passenger.paymentMethod}</span>
                      </div>
                      {passenger.seatNumber && (
                        <div className="flex items-center gap-2 text-foreground">
                          <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <span>Seat: {passenger.seatNumber}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    {passenger.status === "checked-in" && (
                      <CheckCircle className="h-6 w-6" />
                    )}
                    {passenger.status === "next" && (
                      <Clock className="h-6 w-6" />
                    )}
                    {passenger.status === "pending" && (
                      <Clock className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border">
                  <p className="text-sm font-medium text-foreground">
                    Drop-off:
                  </p>
                  <p className="text-sm">{passenger.dropoff}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {showQRScanner && (
        <QRScannerModal
          onClose={() => setShowQRScanner(false)}
          onSuccess={handleQRScanSuccess}
          passengerList={passengerList}
        />
      )}
    </div>
  );
}
