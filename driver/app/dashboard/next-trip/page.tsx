"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Users, CreditCard, Navigation } from "lucide-react";
import { toast } from "sonner";

const nextTripData = {
  time: "2:30 PM",
  route: "Downtown Hotels → Terminal B",
  totalPassengers: 8,
  estimatedDuration: "45 minutes",
};

const nextTripPassengers = [
  {
    id: 1,
    name: "David Thompson",
    persons: 1,
    bags: 2,
    pickup: "Sheraton Downtown",
    dropoff: "Terminal B - Gate 3",
    paymentMethod: "Credit Card",
  },
  {
    id: 2,
    name: "Lisa Rodriguez",
    persons: 2,
    bags: 3,
    pickup: "Hyatt Regency",
    dropoff: "Terminal B - Gate 7",
    paymentMethod: "Mobile Pay",
  },
  {
    id: 3,
    name: "James Park",
    persons: 1,
    bags: 1,
    pickup: "Four Seasons Hotel",
    dropoff: "Terminal B - Gate 12",
    paymentMethod: "Cash",
  },
  {
    id: 4,
    name: "Maria Santos",
    persons: 3,
    bags: 4,
    pickup: "Renaissance Hotel",
    dropoff: "Terminal B - Gate 15",
    paymentMethod: "Credit Card",
  },
  {
    id: 5,
    name: "Kevin Liu",
    persons: 1,
    bags: 1,
    pickup: "Westin Downtown",
    dropoff: "Terminal B - Gate 9",
    paymentMethod: "Mobile Pay",
  },
];

export default function NextTripPage() {
  const handleCardClick = (passengerName: string) => {
    toast.error("Failed to fetch next trip");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-3xl font-bold text-foreground">Next Trip</h1>

      {/* Trip Details */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            Trip Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">
                Departure Time
              </p>
              <p className="text-3xl font-bold text-foreground">{nextTripData.time}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Duration
              </p>
              <p className="text-xl font-semibold text-foreground">
                {nextTripData.estimatedDuration}
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground">Route</p>
            <p className="font-bold text-lg text-foreground">{nextTripData.route}</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-foreground">
                {nextTripData.totalPassengers} passengers
              </span>
            </div>
            <Badge className="bg-blue-600 dark:bg-blue-500 text-white">Scheduled</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Route Map Preview */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Navigation className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Route Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="aspect-video bg-blue-50 dark:bg-blue-950 rounded-xl flex items-center justify-center">
            <div className="text-center">
              <MapPin className="h-16 w-16 mx-auto mb-4 text-blue-600 dark:text-blue-400" />
              <p className="text-lg font-medium text-foreground">Route Map Preview</p>
              <p className="text-sm text-foreground">
                Downtown Hotels to Terminal B
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Passenger List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">
          Passengers ({nextTripPassengers.length})
        </h2>
        <div className="grid gap-3">
          {nextTripPassengers.map((passenger) => (
            <Card
              key={passenger.id}
              className="hover:shadow-lg transition-all cursor-pointer border-border hover:border-blue-300 dark:hover:border-blue-700"
              onClick={() => handleCardClick(passenger.name)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="font-bold text-lg text-foreground">{passenger.name}</h3>
                      <Badge variant="outline" className="border-blue-200 dark:border-blue-800 text-foreground">Scheduled</Badge>
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
                    </div>
                  </div>

                  <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>

                <div className="mt-4 pt-3 border-t border-border">
                  <p className="text-sm font-medium text-foreground">
                    Drop-off:
                  </p>
                  <p className="text-sm text-foreground">{passenger.dropoff}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
