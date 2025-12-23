"use client";

import { useMemo, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { TripRecord } from "@/convex/trips";
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

type ParkFormData = {
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
  direction: "hotelToAirport" | "airportToHotel";
  paymentMethods: {
    frontDesk: boolean;
  };
};

type ParkFormProps = {
  form: ParkFormData;
  hotelId: Id<"hotels"> | null;
  onChange: (updates: Partial<ParkFormData>) => void;
  onPaymentChange: (
    method: keyof ParkFormData["paymentMethods"],
    value: boolean | "indeterminate"
  ) => void;
};

const directionOptions = [
  { value: "hotelToAirport", label: "Hotel → Airport" },
  { value: "airportToHotel", label: "Airport → Hotel" },
] as const;

const paymentOptions = [{ value: "frontDesk", label: "Front Desk" }] as const;
const CLEAR_TRIP_VALUE = "__clear_trip__";

const timeStringToMinutes = (time?: string): number | null => {
  if (!time) {
    return null;
  }
  const [hoursRaw, minutesRaw] = time.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }
  return hours * 60 + minutes;
};

const formatTripSlots = (trip: TripRecord): string => {
  if (trip.tripSlots.length === 0) {
    return "No time slots";
  }
  return trip.tripSlots
    .map(
      (slot) =>
        `${slot.startTimeDisplay ?? "--"}-${slot.endTimeDisplay ?? "--"}`
    )
    .join(", ");
};

export function ParkForm({
  form,
  hotelId,
  onChange,
  onPaymentChange,
}: ParkFormProps) {
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

  // Get max shuttle capacity for validation
  const maxCapacityData = useQuery(
    api.trips.index.getMaxShuttleCapacity,
    hotelId ? { hotelId } : "skip"
  );
  const maxShuttleCapacity = maxCapacityData?.maxCapacity ?? 0;

  const availableSlots = useQuery(
    api.trips.index.getAvailableSlotsForTrip,
    form.tripId && hotelId && form.date && seatsNumber > 0
      ? {
          tripId: form.tripId,
          hotelId,
          scheduledDate: form.date,
          requiredSeats: seatsNumber,
        }
      : "skip"
  );
  const slots = availableSlots ?? [];
  const isLoadingSlots =
    form.tripId && hotelId && form.date && seatsNumber > 0
      ? availableSlots === undefined
      : false;

  // Check if seats exceed max shuttle capacity
  const seatsExceedMaxCapacity = useMemo(() => {
    return maxShuttleCapacity > 0 && seatsNumber > maxShuttleCapacity;
  }, [maxShuttleCapacity, seatsNumber]);

  // Extract slot times from selected time slot (format: "HH:MM-HH:MM")
  const selectedSlotTimes = useMemo(() => {
    if (!form.time || !form.time.includes("-")) return null;
    const [startTimeDisplay, endTimeDisplay] = form.time
      .split("-")
      .map((t) => t.trim());
    // Find the slot in availableSlots to get ISO times
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

  // Get capacity for selected slot
  const slotCapacity = useQuery(
    api.trips.index.getSlotCapacity,
    selectedSlotTimes && form.tripId && hotelId && form.date
      ? {
          tripId: form.tripId,
          hotelId,
          scheduledDate: form.date,
          slotStartTime: selectedSlotTimes.startTime,
          slotEndTime: selectedSlotTimes.endTime,
        }
      : "skip"
  );

  // Check if selected seats exceed capacity
  const seatsExceedCapacity = useMemo(() => {
    if (!selectedSlotTimes || !slotCapacity || seatsNumber <= 0) return false;
    return seatsNumber > slotCapacity.availableCapacity;
  }, [selectedSlotTimes, slotCapacity, seatsNumber]);

  // Clear time slot when seats exceed capacity
  useEffect(() => {
    if (seatsExceedCapacity && form.time) {
      onChange({ time: "" });
    }
  }, [seatsExceedCapacity, form.time, onChange]);

  const directionLabel =
    directionOptions.find((option) => option.value === form.direction)?.label ??
    "";
  const parkFullName = `${form.firstName} ${form.lastName}`.trim();
  const parkFieldId = (field: string) => `park-${field}`;

  const locationMap = useMemo(() => {
    const map = new Map<Id<"locations">, (typeof locations)[number]>();
    locations.forEach((loc) => {
      map.set(loc.id, loc);
    });
    return map;
  }, [locations]);

  const locationOptions = useMemo(
    () =>
      locations.map((loc) => ({
        value: loc.id,
        label: loc.name,
      })),
    [locations]
  );

  const filteredTrips = useMemo(() => {
    if (!hotelId) {
      return [];
    }
    return trips.filter((trip) => {
      if (trip.routes.length === 0) {
        return false;
      }
      const firstRoute = trip.routes[0];
      const lastRoute = trip.routes[trip.routes.length - 1];
      const source = locationMap.get(firstRoute.startLocationId);
      const destination = locationMap.get(lastRoute.endLocationId);
      if (!source || !destination) {
        return false;
      }
      const needsHotelToAirport = form.direction === "hotelToAirport";
      const matchesHotelToAirport =
        source.locationType === "hotel" &&
        (destination.locationType === "airport" ||
          destination.locationType === "other");
      const matchesAirportToHotel =
        destination.locationType === "hotel" &&
        (source.locationType === "airport" || source.locationType === "other");
      if (
        (needsHotelToAirport && !matchesHotelToAirport) ||
        (!needsHotelToAirport && !matchesAirportToHotel)
      ) {
        return false;
      }
      return true;
    });
  }, [hotelId, trips, locationMap, form.direction]);

  const handleTripChange = (tripId: Id<"trips"> | "") => {
    onChange({
      tripId,
    });
    if (!tripId) {
      onChange({
        pickupLocation: "",
        destination: "",
      });
      return;
    }
    const selectedTrip = trips.find((trip) => trip.id === tripId);
    if (!selectedTrip || selectedTrip.routes.length === 0) {
      onChange({
        pickupLocation: "",
        destination: "",
      });
      return;
    }
    const firstRoute = selectedTrip.routes[0];
    const lastRoute = selectedTrip.routes[selectedTrip.routes.length - 1];
    onChange({
      pickupLocation: firstRoute.startLocationId,
      destination: lastRoute.endLocationId,
    });
  };

  const tripSelectDisabled = isLoadingTrips || !hotelId;

  return (
    <div className="space-y-6">
      {/* Direction Section */}
      <div className="space-y-2">
        <Label>Direction</Label>
        <Select
          value={form.direction}
          onValueChange={(value) =>
            onChange({
              direction: value as (typeof directionOptions)[number]["value"],
              tripId: "",
              pickupLocation: "",
              destination: "",
            })
          }
        >
          <SelectTrigger className="h-11">
            <SelectValue placeholder="Select direction" />
          </SelectTrigger>
          <SelectContent>
            {directionOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Guest Identity Section */}
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={parkFieldId("firstName")}>First name</Label>
            <Input
              id={parkFieldId("firstName")}
              value={form.firstName}
              placeholder="John"
              onChange={(event) =>
                onChange({
                  firstName: event.target.value,
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={parkFieldId("lastName")}>Last name</Label>
            <Input
              id={parkFieldId("lastName")}
              value={form.lastName}
              placeholder="Doe"
              onChange={(event) =>
                onChange({
                  lastName: event.target.value,
                })
              }
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground font-medium">OR</span>
          <Separator className="flex-1" />
        </div>

        <div className="space-y-2">
          <Label htmlFor={parkFieldId("confirmationNumber")} className="text-muted-foreground">
            Or Confirmation number 
          </Label>
          <Input
            id={parkFieldId("confirmationNumber")}
            value={form.confirmationNumber}
            placeholder="ABC123"
            className="max-w-xs"
            onChange={(event) =>
              onChange({
                confirmationNumber: event.target.value,
              })
            }
          />
        </div>
      </div>


      {/* Trip Selection Section */}
      <div className="flex flex-row flex-wrap gap-6">
        <div className="space-y-2 flex-1 min-w-[220px]">
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
                  {trip.name} • {formatTripSlots(trip)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 flex-1 min-w-[220px]">
          <Label>Pickup location</Label>
          <Select
            value={form.pickupLocation || undefined}
            onValueChange={(value) =>
              onChange({
                pickupLocation: value,
              })
            }
            disabled
          >
            <SelectTrigger className="h-11">
              <SelectValue
                placeholder={
                  isLoadingLocations ? "Loading..." : "Trip required"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {locationOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 flex-1 min-w-[220px]">
          <Label>Destination</Label>
          <Select
            value={form.destination || undefined}
            onValueChange={(value) =>
              onChange({
                destination: value,
              })
            }
            disabled
          >
            <SelectTrigger className="h-11">
              <SelectValue
                placeholder={
                  isLoadingLocations ? "Loading..." : "Trip required"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {locationOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="park-seats">Seats</Label>
          <Input
            id="park-seats"
            type="number"
            min={1}
            value={form.seats}
            onChange={(event) => {
              onChange({
                seats: event.target.value,
              });
              if (form.time) {
                onChange({ time: "" });
              }
            }}
            disabled={!form.tripId || !form.date}
          />
          {form.tripId && form.date && seatsExceedMaxCapacity && (
            <p className="text-xs text-destructive">
              Max {maxShuttleCapacity} seats
            </p>
          )}
          {form.tripId &&
            form.date &&
            !seatsExceedMaxCapacity &&
            seatsExceedCapacity &&
            slotCapacity && (
              <p className="text-xs text-destructive">
                Only {slotCapacity.availableCapacity} available
              </p>
            )}
          {form.tripId &&
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
          <Label htmlFor="park-bags">Bags</Label>
          <Input
            id="park-bags"
            type="number"
            min={0}
            value={form.bags}
            onChange={(event) =>
              onChange({
                bags: event.target.value,
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="park-date">Date</Label>
          <Input
            id="park-date"
            type="date"
            value={form.date}
            onChange={(event) =>
              onChange({
                date: event.target.value,
                time: "",
              })
            }
          />
        </div>
      </div>
      {form.tripId &&
        form.date &&
        seatsNumber > 0 &&
        !seatsExceedMaxCapacity && (
          <div className="space-y-2">
            <Label htmlFor="park-time">Time slot</Label>
            <Select
              value={form.time || undefined}
              onValueChange={(value) => {
                // Validate that selected seats don't exceed capacity for this slot
                const [startTimeDisplay, endTimeDisplay] = value
                  .split("-")
                  .map((t) => t.trim());
                const slotInList = slots.find(
                  (s) =>
                    s.startTimeDisplay === startTimeDisplay &&
                    s.endTimeDisplay === endTimeDisplay
                );

                if (!slotInList) {
                  // Slot not in available list means it doesn't have enough capacity
                  return;
                }

                onChange({
                  time: value,
                });
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
        <Label htmlFor="park-notes">Notes (optional)</Label>
        <Textarea
          id="park-notes"
          placeholder="Add valet instructions, ticket info, etc."
          value={form.notes}
          onChange={(event) =>
            onChange({
              notes: event.target.value,
            })
          }
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
