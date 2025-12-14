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
      (slot) => `${slot.startTimeDisplay ?? "--"}-${slot.endTimeDisplay ?? "--"}`
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
  const isLoadingSlots = form.tripId && hotelId && form.date && seatsNumber > 0
    ? availableSlots === undefined
    : false;

  // Check if seats exceed max shuttle capacity
  const seatsExceedMaxCapacity = useMemo(() => {
    return maxShuttleCapacity > 0 && seatsNumber > maxShuttleCapacity;
  }, [maxShuttleCapacity, seatsNumber]);

  // Extract slot times from selected time slot (format: "HH:MM-HH:MM")
  const selectedSlotTimes = useMemo(() => {
    if (!form.time || !form.time.includes("-")) return null;
    const [startTimeDisplay, endTimeDisplay] = form.time.split("-").map((t) => t.trim());
    // Find the slot in availableSlots to get ISO times
    const slot = availableSlots?.find(
      (s) => s.startTimeDisplay === startTimeDisplay && s.endTimeDisplay === endTimeDisplay
    );
    return slot
      ? { startTime: slot.startTime, endTime: slot.endTime, startTimeDisplay, endTimeDisplay }
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
      const source = locationMap.get(trip.sourceLocationId);
      const destination = locationMap.get(trip.destinationLocationId);
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
    if (!selectedTrip) {
      onChange({
        pickupLocation: "",
        destination: "",
      });
      return;
    }
    onChange({
      pickupLocation: selectedTrip.sourceLocationId,
      destination: selectedTrip.destinationLocationId,
    });
  };

  const tripSelectDisabled = isLoadingTrips || !hotelId;

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4">
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
          <p className="text-xs text-muted-foreground">
            {directionLabel
              ? `Coordinate shuttles for ${directionLabel.toLowerCase()}.`
              : "Choose the direction for the Park, Sleep & Fly shuttle."}
          </p>
        </div>
      </div>
      <div className="space-y-4 rounded-2xl border border-border/80 bg-background/40 p-4">
        <div className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>Guest identity</span>
          <span className="text-[10px] font-normal tracking-[0.4em] text-muted-foreground/70">
            Choose one option below
          </span>
        </div>
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
        <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.4em] text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>
        <div className="space-y-2">
          <Label htmlFor={parkFieldId("confirmationNumber")}>
            Confirmation number
          </Label>
          <Input
            id={parkFieldId("confirmationNumber")}
            value={form.confirmationNumber}
            placeholder="ABC12345"
            onChange={(event) =>
              onChange({
                confirmationNumber: event.target.value,
              })
            }
          />
        </div>
      </div>
      {parkFullName && (
        <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm text-foreground">
          Passenger name preview:{" "}
          <span className="font-semibold">{parkFullName}</span>
        </div>
      )}
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
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="park-seats">
            Number of seats <span className="text-muted-foreground text-xs">(required to show available time slots)</span>
          </Label>
          <Input
            id="park-seats"
            type="number"
            min={1}
            value={form.seats}
            onChange={(event) => {
              onChange({
                seats: event.target.value,
              });
              // Clear time slot when seats change to allow re-validation
              if (form.time) {
                onChange({ time: "" });
              }
            }}
            disabled={!form.tripId || !form.date}
          />
          {!form.tripId && (
            <p className="text-sm text-muted-foreground">
              Please select a trip first
            </p>
          )}
          {form.tripId && !form.date && (
            <p className="text-sm text-muted-foreground">
              Please select a date first
            </p>
          )}
          {form.tripId && form.date && seatsExceedMaxCapacity && (
            <p className="text-sm text-destructive">
              Cannot book {seatsNumber} seats. Maximum shuttle capacity is {maxShuttleCapacity} seat{maxShuttleCapacity !== 1 ? "s" : ""}. Please reduce the number of seats.
            </p>
          )}
          {form.tripId && form.date && !seatsExceedMaxCapacity && seatsExceedCapacity && selectedSlotTimes && slotCapacity && (
            <p className="text-sm text-destructive">
              Maximum {slotCapacity.availableCapacity} seat{slotCapacity.availableCapacity !== 1 ? "s" : ""} available for this slot. Please select fewer seats or choose a different time slot.
            </p>
          )}
          {form.tripId && form.date && !seatsExceedMaxCapacity && !seatsExceedCapacity && seatsNumber > 0 && slots.length === 0 && !isLoadingSlots && (
            <p className="text-sm text-destructive">
              No time slots available for {seatsNumber} seat{seatsNumber !== 1 ? "s" : ""}. All slots are fully booked. Please try a different date or reduce the number of seats.
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
      </div>
      {form.tripId && form.date && seatsNumber > 0 && !seatsExceedMaxCapacity && (
        <div className="space-y-2">
          <Label htmlFor="park-time">Time slot</Label>
          <Select
            value={form.time || undefined}
            onValueChange={(value) => {
              // Validate that selected seats don't exceed capacity for this slot
              const [startTimeDisplay, endTimeDisplay] = value.split("-").map((t) => t.trim());
              const slotInList = slots.find(
                (s) => s.startTimeDisplay === startTimeDisplay && s.endTimeDisplay === endTimeDisplay
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
          {slots.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Showing {slots.length} available slot{slots.length !== 1 ? "s" : ""} for {seatsNumber} seat{seatsNumber !== 1 ? "s" : ""}
            </p>
          )}
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
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          Payment methods
        </p>
        <div className="space-y-3">
          {paymentOptions.map((option) => (
            <div
              key={option.value}
              className="flex items-center justify-between rounded-2xl border border-dashed border-border px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {option.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  Collect payment when the guest arrives
                </p>
              </div>
              <Checkbox
                checked={form.paymentMethods[option.value]}
                onCheckedChange={(checked) =>
                  onPaymentChange(option.value, checked)
                }
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
