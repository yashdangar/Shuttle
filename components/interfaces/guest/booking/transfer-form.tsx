"use client";

import { useMemo, useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { TripRecord, RouteRecord } from "@/convex/trips";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TransferFormData = {
  firstName: string;
  lastName: string;
  confirmationNumber: string;
  pickupLocation: string;
  destination: string;
  date: string;
  time: string;
  seats: string;
  bags: string;
  tripId: Id<"trips"> | "";
  notes: string;
  paymentMethods: {
    frontDesk: boolean;
  };
};

type TransferFormProps = {
  tabId: "hotelToAirport" | "airportToHotel";
  form: TransferFormData;
  hotelId: Id<"hotels"> | null;
  onChange: (field: keyof TransferFormData, value: string) => void;
  onPaymentChange: (
    method: keyof TransferFormData["paymentMethods"],
    value: boolean | "indeterminate"
  ) => void;
};

const paymentOptions = [{ value: "frontDesk", label: "Front Desk" }] as const;
const CLEAR_TRIP_VALUE = "__clear_trip__";
const CLEAR_LOCATION_VALUE = "__clear_location__";

const formatTripSlots = (trip: TripRecord): string => {
  if (trip.tripSlots.length === 0) {
    return "No time slots";
  }
  return trip.tripSlots
    .map(
      (slot) => `${slot.startTimeDisplay ?? "--"}-${slot.endTimeDisplay ?? "--"}`
    )
    .join(", ");
};

const formatTripRoute = (trip: TripRecord): string => {
  if (!trip.routes || trip.routes.length === 0) {
    return "";
  }
  const stops = [trip.routes[0].startLocationName];
  for (const route of trip.routes) {
    stops.push(route.endLocationName);
  }
  return stops.join(" → ");
};

export function TransferForm({
  tabId,
  form,
  hotelId,
  onChange,
  onPaymentChange,
}: TransferFormProps) {
  const [routeIndices, setRouteIndices] = useState<{
    fromIndex: number;
    toIndex: number;
  } | null>(null);

  const locationsData = useQuery(
    api.locations.index.listHotelLocations,
    hotelId ? { hotelId, limit: 100 } : "skip"
  );
  const locations = locationsData ?? [];
  const isLoadingLocations = hotelId ? locationsData === undefined : false;

  const tripsData = useQuery(
    api.trips.index.listHotelTrips,
    hotelId ? { hotelId } : "skip"
  );
  const trips = tripsData ?? [];
  const isLoadingTrips = hotelId ? tripsData === undefined : false;

  const seatsNumber = useMemo(
    () => (form.seats ? parseInt(form.seats, 10) : 0),
    [form.seats]
  );

  const maxCapacityData = useQuery(
    api.trips.index.getMaxShuttleCapacity,
    hotelId ? { hotelId } : "skip"
  );
  const maxShuttleCapacity = maxCapacityData?.maxCapacity ?? 0;

  const selectedTrip = useMemo(() => {
    if (!form.tripId) return null;
    return trips.find((trip) => trip.id === form.tripId) ?? null;
  }, [form.tripId, trips]);

  const tripStops = useMemo(() => {
    if (!selectedTrip || !selectedTrip.routes || selectedTrip.routes.length === 0) {
      return [];
    }

    const stops: Array<{
      locationId: Id<"locations">;
      locationName: string;
      routeIndex: number;
      isStart: boolean;
    }> = [];

    stops.push({
      locationId: selectedTrip.routes[0].startLocationId,
      locationName: selectedTrip.routes[0].startLocationName,
      routeIndex: 0,
      isStart: true,
    });

    for (let i = 0; i < selectedTrip.routes.length; i++) {
      const route = selectedTrip.routes[i];
      stops.push({
        locationId: route.endLocationId,
        locationName: route.endLocationName,
        routeIndex: i,
        isStart: false,
      });
    }

    return stops;
  }, [selectedTrip]);

  useEffect(() => {
    if (!selectedTrip || !form.pickupLocation || !form.destination) {
      setRouteIndices(null);
      return;
    }

    const fromStop = tripStops.find(
      (s) => s.locationId === form.pickupLocation
    );
    const toStop = tripStops.find((s) => s.locationId === form.destination);

    if (!fromStop || !toStop) {
      setRouteIndices(null);
      return;
    }

    const fromStopIndex = tripStops.indexOf(fromStop);
    const toStopIndex = tripStops.indexOf(toStop);

    if (fromStopIndex >= toStopIndex) {
      setRouteIndices(null);
      return;
    }

    const fromRouteIndex = fromStop.isStart ? 0 : fromStop.routeIndex + 1;
    const toRouteIndex = toStop.routeIndex;

    setRouteIndices({ fromIndex: fromRouteIndex, toIndex: toRouteIndex });
  }, [selectedTrip, form.pickupLocation, form.destination, tripStops]);

  const calculatedPrice = useMemo(() => {
    if (!selectedTrip || routeIndices === null) return 0;

    let total = 0;
    for (let i = routeIndices.fromIndex; i <= routeIndices.toIndex; i++) {
      if (selectedTrip.routes[i]) {
        total += selectedTrip.routes[i].charges;
      }
    }
    return total * seatsNumber;
  }, [selectedTrip, routeIndices, seatsNumber]);

  const availableSlots = useQuery(
    api.trips.index.getAvailableSlotsForTrip,
    form.tripId &&
      hotelId &&
      form.date &&
      seatsNumber > 0 &&
      routeIndices !== null
      ? {
          tripId: form.tripId,
          hotelId,
          scheduledDate: form.date,
          requiredSeats: seatsNumber,
          fromRouteIndex: routeIndices.fromIndex,
          toRouteIndex: routeIndices.toIndex,
        }
      : "skip"
  );
  const slots = availableSlots ?? [];
  const isLoadingSlots =
    form.tripId &&
    hotelId &&
    form.date &&
    seatsNumber > 0 &&
    routeIndices !== null
      ? availableSlots === undefined
      : false;

  const seatsExceedMaxCapacity = useMemo(() => {
    return maxShuttleCapacity > 0 && seatsNumber > maxShuttleCapacity;
  }, [maxShuttleCapacity, seatsNumber]);

  const selectedSlotTimes = useMemo(() => {
    if (!form.time || !form.time.includes("-")) return null;
    const [startTimeDisplay, endTimeDisplay] = form.time
      .split("-")
      .map((t) => t.trim());
    const slot = availableSlots?.find(
      (s) =>
        s.startTimeDisplay === startTimeDisplay &&
        s.endTimeDisplay === endTimeDisplay
    );
    return slot
      ? {
          startTime: slot.startTime,
          endTime: slot.endTime,
          startTimeDisplay,
          endTimeDisplay,
        }
      : null;
  }, [form.time, availableSlots]);

  const slotCapacity = useQuery(
    api.trips.index.getSlotCapacity,
    selectedSlotTimes && form.tripId && hotelId && form.date && routeIndices
      ? {
          tripId: form.tripId,
          hotelId,
          scheduledDate: form.date,
          slotStartTime: selectedSlotTimes.startTime,
          slotEndTime: selectedSlotTimes.endTime,
          fromRouteIndex: routeIndices.fromIndex,
          toRouteIndex: routeIndices.toIndex,
        }
      : "skip"
  );

  const seatsExceedCapacity = useMemo(() => {
    if (!selectedSlotTimes || !slotCapacity || seatsNumber <= 0) return false;
    return seatsNumber > slotCapacity.availableCapacity;
  }, [selectedSlotTimes, slotCapacity, seatsNumber]);

  useEffect(() => {
    if (seatsExceedCapacity && form.time) {
      onChange("time", "");
    }
  }, [seatsExceedCapacity, form.time, onChange]);

  const fullName = `${form.firstName} ${form.lastName}`.trim();
  const fieldId = (field: string) => `${tabId}-${field}`;

  const locationMap = useMemo(() => {
    const map = new Map<Id<"locations">, (typeof locations)[number]>();
    locations.forEach((loc) => {
      map.set(loc.id, loc);
    });
    return map;
  }, [locations]);

  const filteredTrips = useMemo(() => {
    if (!hotelId) {
      return [];
    }
    return trips.filter((trip) => {
      if (!trip.routes || trip.routes.length === 0) {
        return false;
      }

      const firstRoute = trip.routes[0];
      const lastRoute = trip.routes[trip.routes.length - 1];

      const source = locationMap.get(firstRoute.startLocationId);
      const destination = locationMap.get(lastRoute.endLocationId);

      if (!source || !destination) {
        return false;
      }

      const isHotelToAirport =
        source.locationType === "hotel" &&
        (destination.locationType === "airport" ||
          destination.locationType === "other");
      const isAirportToHotel =
        destination.locationType === "hotel" &&
        (source.locationType === "airport" ||
          source.locationType === "other");

      if (
        (tabId === "hotelToAirport" && !isHotelToAirport) ||
        (tabId === "airportToHotel" && !isAirportToHotel)
      ) {
        return false;
      }
      return true;
    });
  }, [hotelId, tabId, trips, locationMap]);

  const handleTripChange = (tripId: Id<"trips"> | "") => {
    onChange("tripId", tripId);
    onChange("pickupLocation", "");
    onChange("destination", "");
    onChange("time", "");
    setRouteIndices(null);
  };

  const handlePickupChange = (locationId: string) => {
    onChange("pickupLocation", locationId === CLEAR_LOCATION_VALUE ? "" : locationId);
    onChange("time", "");
  };

  const handleDestinationChange = (locationId: string) => {
    onChange("destination", locationId === CLEAR_LOCATION_VALUE ? "" : locationId);
    onChange("time", "");
  };

  const destinationOptions = useMemo(() => {
    if (!form.pickupLocation || tripStops.length === 0) {
      return [];
    }

    const fromStopIndex = tripStops.findIndex(
      (s) => s.locationId === form.pickupLocation
    );
    if (fromStopIndex === -1) return [];

    return tripStops.slice(fromStopIndex + 1).map((stop) => ({
      value: stop.locationId,
      label: stop.locationName,
    }));
  }, [form.pickupLocation, tripStops]);

  const isRouteValid = routeIndices !== null;
  const tripSelectDisabled = isLoadingTrips || !hotelId;

  return (
    <div className="space-y-6">
      {/* Guest Identity Section */}
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={fieldId("firstName")}>First name</Label>
            <Input
              id={fieldId("firstName")}
              value={form.firstName}
              placeholder="John"
              onChange={(event) => onChange("firstName", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId("lastName")}>Last name</Label>
            <Input
              id={fieldId("lastName")}
              value={form.lastName}
              placeholder="Doe"
              onChange={(event) => onChange("lastName", event.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground font-medium">OR</span>
          <Separator className="flex-1" />
        </div>

        <div className="space-y-2">
          <Label htmlFor={fieldId("confirmationNumber")} className="text-muted-foreground">
            Confirmation number
          </Label>
          <Input
            id={fieldId("confirmationNumber")}
            value={form.confirmationNumber}
            placeholder="ABC123"
            className="max-w-xs"
            onChange={(event) =>
              onChange("confirmationNumber", event.target.value)
            }
          />
        </div>
      </div>


      {/* Trip Selection Section */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Trip</Label>
          <Select
            value={form.tripId ?? undefined}
            onValueChange={(value) =>
              handleTripChange(
                value === CLEAR_TRIP_VALUE ? "" : (value as Id<"trips">)
              )
            }
            disabled={tripSelectDisabled}
          >
            <SelectTrigger className="h-11">
              <SelectValue
                placeholder={
                  isLoadingTrips
                    ? "Loading trips..."
                    : filteredTrips.length === 0
                      ? "No trips available"
                      : "Select trip"
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={CLEAR_TRIP_VALUE}>Clear selection</SelectItem>
              {filteredTrips.map((trip) => (
                <SelectItem key={trip.id} value={trip.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{trip.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatTripRoute(trip)} • {formatTripSlots(trip)}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedTrip && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Pickup location</Label>
              <Select
                value={form.pickupLocation || undefined}
                onValueChange={handlePickupChange}
                disabled={!selectedTrip}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select pickup" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CLEAR_LOCATION_VALUE}>
                    Clear selection
                  </SelectItem>
                  {tripStops.slice(0, -1).map((stop, index) => (
                    <SelectItem key={`pickup-${stop.locationId}-${index}`} value={stop.locationId}>
                      {stop.locationName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Destination</Label>
              <Select
                value={form.destination || undefined}
                onValueChange={handleDestinationChange}
                disabled={!form.pickupLocation}
              >
                <SelectTrigger className="h-11">
                  <SelectValue
                    placeholder={
                      !form.pickupLocation
                        ? "Select pickup first"
                        : "Select destination"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CLEAR_LOCATION_VALUE}>
                    Clear selection
                  </SelectItem>
                  {destinationOptions.map((option, index) => (
                    <SelectItem key={`dest-${option.value}-${index}`} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {isRouteValid && calculatedPrice > 0 && (
          <p className="text-sm text-muted-foreground">
            Estimated price:{" "}
            <span className="font-semibold text-foreground">${calculatedPrice.toFixed(2)}</span>
            <span className="ml-1">
              for {seatsNumber} seat{seatsNumber !== 1 ? "s" : ""}
            </span>
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor={fieldId("seats")}>Seats</Label>
          <Input
            id={fieldId("seats")}
            type="number"
            min={1}
            value={form.seats}
            onChange={(event) => {
              onChange("seats", event.target.value);
              if (form.time) {
                onChange("time", "");
              }
            }}
            disabled={!isRouteValid || !form.date}
          />
          {isRouteValid && form.date && seatsExceedMaxCapacity && (
            <p className="text-xs text-destructive">
              Max {maxShuttleCapacity} seats
            </p>
          )}
          {isRouteValid &&
            form.date &&
            !seatsExceedMaxCapacity &&
            seatsExceedCapacity &&
            slotCapacity && (
              <p className="text-xs text-destructive">
                Only {slotCapacity.availableCapacity} available
              </p>
            )}
          {isRouteValid &&
            form.date &&
            !seatsExceedMaxCapacity &&
            !seatsExceedCapacity &&
            seatsNumber > 0 &&
            slots.length === 0 &&
            !isLoadingSlots && (
              <p className="text-xs text-destructive">
                No slots available
              </p>
            )}
        </div>
        <div className="space-y-2">
          <Label htmlFor={fieldId("bags")}>Bags</Label>
          <Input
            id={fieldId("bags")}
            type="number"
            min={0}
            value={form.bags}
            onChange={(event) => onChange("bags", event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={fieldId("date")}>Date</Label>
          <Input
            id={fieldId("date")}
            type="date"
            value={form.date}
            disabled={!isRouteValid}
            onChange={(event) => {
              onChange("date", event.target.value);
              onChange("time", "");
            }}
          />
        </div>
      </div>

      {isRouteValid &&
        form.date &&
        seatsNumber > 0 &&
        !seatsExceedMaxCapacity && (
          <div className="space-y-2">
            <Label htmlFor={fieldId("time")}>Pickup time slot</Label>
            <Select
              value={form.time || undefined}
              onValueChange={(value) => {
                const [startTimeDisplay, endTimeDisplay] = value
                  .split("-")
                  .map((t) => t.trim());
                const slotInList = slots.find(
                  (s) =>
                    s.startTimeDisplay === startTimeDisplay &&
                    s.endTimeDisplay === endTimeDisplay
                );
                if (!slotInList) {
                  return;
                }
                onChange("time", value);
              }}
              disabled={isLoadingSlots}
            >
              <SelectTrigger className="h-11">
                <SelectValue
                  placeholder={
                    isLoadingSlots
                      ? "Loading available slots..."
                      : slots.length === 0
                        ? "No slots available"
                        : "Select time slot"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {slots.map((slot) => (
                  <SelectItem
                    key={`${slot.startTime}-${slot.endTime}`}
                    value={`${slot.startTimeDisplay}-${slot.endTimeDisplay}`}
                  >
                    {slot.startTimeDisplay} - {slot.endTimeDisplay}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

      <div className="space-y-2">
        <Label htmlFor={fieldId("notes")}>Notes (optional)</Label>
        <Textarea
          id={fieldId("notes")}
          placeholder="Add luggage info, mobility needs, or other context..."
          value={form.notes}
          onChange={(event) => onChange("notes", event.target.value)}
        />
      </div>

      {/* Payment Section */}
      <div className="space-y-2">
        {paymentOptions.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-center gap-2"
          >
            <Checkbox
              checked={form.paymentMethods[option.value]}
              onCheckedChange={(checked) =>
                onPaymentChange(option.value, checked)
              }
            />
            <span className="text-sm">Pay at {option.label.toLowerCase()}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
