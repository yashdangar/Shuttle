"use client";

import { useMemo } from "react";
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

export function TransferForm({
  tabId,
  form,
  hotelId,
  onChange,
  onPaymentChange,
}: TransferFormProps) {
  const timeFilterMinutes = useMemo(
    () => timeStringToMinutes(form.time),
    [form.time]
  );

  const locationsData = useQuery(
    api.locations.index.listHotelLocations,
    hotelId ? { hotelId, limit: 100 } : "skip"
  );
  const locations = locationsData ?? [];
  const isLoadingLocations = hotelId ? locationsData === undefined : false;
  const tripsData = useQuery(
    api.trips.index.listHotelTrips,
    hotelId
      ? {
          hotelId,
          filterMinutes: timeFilterMinutes ?? undefined,
        }
      : "skip"
  );
  const trips = tripsData ?? [];
  const isLoadingTrips = hotelId ? tripsData === undefined : false;

  const fullName = `${form.firstName} ${form.lastName}`.trim();
  const fieldId = (field: string) => `${tabId}-${field}`;

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
      const isHotelToAirport =
        source.locationType === "hotel" &&
        (destination.locationType === "airport" ||
          destination.locationType === "other");
      const isAirportToHotel =
        destination.locationType === "hotel" &&
        (source.locationType === "airport" || source.locationType === "other");
      if (
        (tabId === "hotelToAirport" && !isHotelToAirport) ||
        (tabId === "airportToHotel" && !isAirportToHotel)
      ) {
        return false;
      }
      return true;
    });
  }, [
    hotelId,
    tabId,
    trips,
    locationMap,
  ]);

  const handleTripChange = (tripId: Id<"trips"> | "") => {
    onChange("tripId", tripId);
    if (!tripId) {
      onChange("pickupLocation", "");
      onChange("destination", "");
      return;
    }
    const selectedTrip = trips.find((trip) => trip.id === tripId);
    if (!selectedTrip) {
      onChange("pickupLocation", "");
      onChange("destination", "");
      return;
    }
    onChange("pickupLocation", selectedTrip.sourceLocationId);
    onChange("destination", selectedTrip.destinationLocationId);
  };

  const tripSelectDisabled = isLoadingTrips || !hotelId;

  return (
    <div className="space-y-8">
      <div className="space-y-4 rounded-2xl border border-border/80 bg-background/40 p-4">
        <div className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>Guest identity</span>
          <span className="text-[10px] font-normal tracking-[0.4em] text-muted-foreground/70">
            Choose one option below
          </span>
        </div>
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
        <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.4em] text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>
        <div className="space-y-2">
          <Label htmlFor={fieldId("confirmationNumber")}>
            Confirmation number
          </Label>
          <Input
            id={fieldId("confirmationNumber")}
            value={form.confirmationNumber}
            placeholder="ABC12345"
            onChange={(event) =>
              onChange("confirmationNumber", event.target.value)
            }
          />
        </div>
      </div>
      {fullName && (
        <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm text-foreground">
          Passenger name preview:{" "}
          <span className="font-semibold">{fullName}</span>
        </div>
      )}
      <div className="flex flex-row flex-wrap gap-6">
        <div className="space-y-2 flex-1 min-w-[220px]">
          <Label>Trip</Label>
          <Select
            value={form.tripId ?? undefined}
            onValueChange={(value) =>
              handleTripChange(value === CLEAR_TRIP_VALUE ? "" : (value as Id<"trips">))
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
            onValueChange={(value) => onChange("pickupLocation", value)}
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
            onValueChange={(value) => onChange("destination", value)}
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
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={fieldId("date")}>Pickup date</Label>
          <Input
            id={fieldId("date")}
            type="date"
            value={form.date}
            onChange={(event) => onChange("date", event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={fieldId("time")}>Pickup time</Label>
          <Input
            id={fieldId("time")}
            type="time"
            value={form.time}
            onChange={(event) => onChange("time", event.target.value)}
          />
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={fieldId("seats")}>Seats</Label>
          <Input
            id={fieldId("seats")}
            type="number"
            min={0}
            value={form.seats}
            onChange={(event) => onChange("seats", event.target.value)}
          />
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
      </div>
      <div className="space-y-2">
        <Label htmlFor={fieldId("notes")}>Notes (optional)</Label>
        <Textarea
          id={fieldId("notes")}
          placeholder="Add luggage info, mobility needs, or other context..."
          value={form.notes}
          onChange={(event) => onChange("notes", event.target.value)}
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
                  Collect payment at the front desk
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
