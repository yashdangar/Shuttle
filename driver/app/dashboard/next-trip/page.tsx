"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Users, CreditCard, Navigation } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  const handleCardClick = (passengerName: string) => {
    toast({
      title: passengerName,
      description: "Viewing passenger details...",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-3xl font-bold">Next Trip</h1>

      {/* Trip Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 bg-muted rounded-lg">
              <Clock className="h-5 w-5" />
            </div>
            Trip Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Departure Time
              </p>
              <p className="text-3xl font-bold">{nextTripData.time}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Duration
              </p>
              <p className="text-xl font-semibold">
                {nextTripData.estimatedDuration}
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">Route</p>
            <p className="font-bold text-lg">{nextTripData.route}</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {nextTripData.totalPassengers} passengers
              </span>
            </div>
            <Badge>Scheduled</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Route Map Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            Route Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="aspect-video bg-muted rounded-xl flex items-center justify-center">
            <div className="text-center">
              <MapPin className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium">Route Map Preview</p>
              <p className="text-sm text-muted-foreground">
                Downtown Hotels to Terminal B
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Passenger List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">
          Passengers ({nextTripPassengers.length})
        </h2>
        <div className="grid gap-3">
          {nextTripPassengers.map((passenger) => (
            <Card
              key={passenger.id}
              className="hover:shadow-md transition-all cursor-pointer"
              onClick={() => handleCardClick(passenger.name)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="font-bold text-lg">{passenger.name}</h3>
                      <Badge variant="outline">Scheduled</Badge>
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span className="font-medium">{passenger.pickup}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>
                          {passenger.persons} passengers • {passenger.bags} bags
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CreditCard className="h-4 w-4" />
                        <span>{passenger.paymentMethod}</span>
                      </div>
                    </div>
                  </div>

                  <Clock className="h-6 w-6" />
                </div>

                <div className="mt-4 pt-3 border-t">
                  <p className="text-sm font-medium text-muted-foreground">
                    Drop-off:
                  </p>
                  <p className="text-sm">{passenger.dropoff}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
