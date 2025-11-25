"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
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

export function TransferForm({
  tabId,
  form,
  hotelId,
  onChange,
  onPaymentChange,
}: TransferFormProps) {
  const locationsData = useQuery(
    api.locations.index.listHotelLocations,
    hotelId ? { hotelId, limit: 100 } : "skip"
  );
  const locations = locationsData ?? [];
  const isLoadingLocations = hotelId ? locationsData === undefined : false;

  const fullName = `${form.firstName} ${form.lastName}`.trim();
  const fieldId = (field: string) => `${tabId}-${field}`;

  const airportLocations = locations.filter((loc) => loc.isAirportLocation);
  const nonAirportLocations = locations.filter((loc) => !loc.isAirportLocation);

  const pickupOptions = [
    ...nonAirportLocations.map((loc) => ({
      value: loc.id,
      label: loc.name,
    })),
  ];

  const destinationOptions = [
    ...airportLocations.map((loc) => ({
      value: loc.id,
      label: loc.name,
    })),
    ...nonAirportLocations.map((loc) => ({
      value: loc.id,
      label: loc.name,
    })),
  ];

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
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Pickup location</Label>
          <Select
            value={form.pickupLocation || undefined}
            onValueChange={(value) => onChange("pickupLocation", value)}
            disabled={isLoadingLocations}
          >
            <SelectTrigger className="h-11">
              <SelectValue
                placeholder={
                  isLoadingLocations ? "Loading..." : "Select pickup"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {pickupOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Destination</Label>
          <Select
            value={form.destination || undefined}
            onValueChange={(value) => onChange("destination", value)}
            disabled={isLoadingLocations}
          >
            <SelectTrigger className="h-11">
              <SelectValue
                placeholder={
                  isLoadingLocations ? "Loading..." : "Select destination"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {destinationOptions.map((option) => (
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
