"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { FAKE_HOTELS, type Hotel } from "@/lib/hotels";

function NewBookingContent() {
  const params = useParams<{ slug?: string | string[] }>();
  const slugParam = params?.slug;
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const tabs = [
    { id: "hotelToAirport", label: "Hotel → Airport", type: "transfer" },
    { id: "airportToHotel", label: "Airport → Hotel", type: "transfer" },
    { id: "parkSleepFly", label: "Park, Sleep & Fly", type: "park" },
  ] as const;
  const pickupOptions = [
    { value: "hotelLobby", label: "Hotel Lobby" },
    { value: "terminalA", label: "Terminal A" },
    { value: "terminalB", label: "Terminal B" },
    { value: "parkingGarage", label: "Parking Garage" },
  ];
  const destinationOptions = [
    { value: "airport", label: "Airport" },
    { value: "hotel", label: "Hotel" },
    { value: "parking", label: "Long-term Parking" },
  ];
  const directionOptions = [
    { value: "hotelToAirport", label: "Hotel → Airport" },
    { value: "airportToHotel", label: "Airport → Hotel" },
  ] as const;
  const paymentOptions = [{ value: "frontDesk", label: "Front Desk" }] as const;
  const createTransferForm = () => ({
    firstName: "",
    lastName: "",
    confirmationNumber: "",
    pickupLocation: "",
    destination: "",
    date: "",
    time: "",
    notes: "",
    paymentMethods: {
      frontDesk: false,
    },
  });
  const [transferForms, setTransferForms] = useState({
    hotelToAirport: createTransferForm(),
    airportToHotel: createTransferForm(),
  });
  const [parkForm, setParkForm] = useState({
    ...createTransferForm(),
    direction: "hotelToAirport" as (typeof directionOptions)[number]["value"],
  });

  useEffect(() => {
    const normalizedSlug =
      typeof slugParam === "string"
        ? slugParam
        : Array.isArray(slugParam)
        ? slugParam[0]
        : null;

    if (!normalizedSlug) {
      setHotel(null);
      return;
    }

    const foundHotel = FAKE_HOTELS.find((h) => h.slug === normalizedSlug) || null;
    setHotel(foundHotel);
  }, [slugParam]);

  if (!hotel) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            No Hotel Selected
          </h1>
          <p className="text-muted-foreground">
            Please select a hotel to continue with your booking.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <header className="flex flex-col gap-1 border-b border-border pb-4">
          <p className="text-[11px] uppercase tracking-[0.4em] text-muted-foreground">
            Create booking
          </p>
          <h1 className="text-3xl font-semibold text-foreground">
            New booking
          </h1>
          <p className="text-sm text-muted-foreground">
            You’re booking for{" "}
            <span className="font-medium text-foreground">{hotel.name}</span>
          </p>
        </header>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-6">
            <div className="space-y-1">
              <CardDescription className="text-[11px] uppercase tracking-[0.3em]">
                Selected hotel
              </CardDescription>
              <CardTitle className="text-2xl">{hotel.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{hotel.address}</p>
            </div>
            <Link
              href="/select-hotels"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Change
            </Link>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Booking form</CardTitle>
            <CardDescription>
              Choose the service type, enter the passenger or confirmation info,
              then add shuttle logistics.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="hotelToAirport" className="space-y-6">
              <div className="-mx-4 flex overflow-x-auto px-4 pb-1">
                <TabsList className="flex w-full min-w-full flex-col gap-2 rounded-2xl bg-muted/60 p-1 sm:grid sm:grid-cols-3">
                  {tabs.map((tab) => (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="rounded-full text-[11px] font-semibold uppercase tracking-[0.2em] data-[state=active]:bg-background"
                    >
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              {tabs.map((tab) => (
                <TabsContent key={tab.id} value={tab.id} className="mt-0">
                  <div className="space-y-8">
                    {tab.type === "transfer"
                      ? renderTransferForm(
                          tab.id as "hotelToAirport" | "airportToHotel",
                        )
                      : renderParkForm()}
                    {renderSubmitBar(tab)}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  function renderSubmitBar(tab: (typeof tabs)[number]) {
    return (
      <div className="flex justify-center">
        <Button
          type="button"
          size="lg"
          className="rounded-full px-12 text-base font-semibold tracking-wide shadow-lg shadow-primary/20"
        >
          Submit
        </Button>
      </div>
    );
  }

  function renderTransferForm(tabId: "hotelToAirport" | "airportToHotel") {
    const form = transferForms[tabId];
    const fullName = `${form.firstName} ${form.lastName}`.trim();

    const handleChange = (field: keyof typeof form, value: string) => {
      setTransferForms((prev) => ({
        ...prev,
        [tabId]: {
          ...prev[tabId],
          [field]: value,
        },
      }));
    };

    const setPayment = (method: keyof typeof form.paymentMethods, value: boolean | "indeterminate") => {
      setTransferForms((prev) => ({
        ...prev,
        [tabId]: {
          ...prev[tabId],
          paymentMethods: {
            ...prev[tabId].paymentMethods,
            [method]: value === true,
          },
        },
      }));
    };

    const fieldId = (field: string) => `${tabId}-${field}`;

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
                onChange={(event) =>
                  handleChange("firstName", event.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={fieldId("lastName")}>Last name</Label>
              <Input
                id={fieldId("lastName")}
                value={form.lastName}
                placeholder="Doe"
                onChange={(event) => handleChange("lastName", event.target.value)}
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
                handleChange("confirmationNumber", event.target.value)
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
              onValueChange={(value) => handleChange("pickupLocation", value)}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select pickup" />
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
              onValueChange={(value) => handleChange("destination", value)}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select destination" />
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
              onChange={(event) => handleChange("date", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId("time")}>Pickup time</Label>
            <Input
              id={fieldId("time")}
              type="time"
              value={form.time}
              onChange={(event) => handleChange("time", event.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor={fieldId("notes")}>Notes (optional)</Label>
          <Textarea
            id={fieldId("notes")}
            placeholder="Add luggage info, mobility needs, or other context..."
            value={form.notes}
            onChange={(event) => handleChange("notes", event.target.value)}
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
                  onCheckedChange={(checked) => setPayment(option.value, checked)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderParkForm() {
    const directionLabel =
      directionOptions.find((option) => option.value === parkForm.direction)
        ?.label ?? "";
    const parkFullName = `${parkForm.firstName} ${parkForm.lastName}`.trim();
    const parkFieldId = (field: string) => `park-${field}`;

    return (
      <div className="space-y-8">
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4">
          <div className="space-y-2">
            <Label>Direction</Label>
            <Select
              value={parkForm.direction}
              onValueChange={(value) =>
                setParkForm((prev) => ({
                  ...prev,
                  direction: value as (typeof directionOptions)[number]["value"],
                }))
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
                value={parkForm.firstName}
                placeholder="John"
                onChange={(event) =>
                  setParkForm((prev) => ({
                    ...prev,
                    firstName: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={parkFieldId("lastName")}>Last name</Label>
              <Input
                id={parkFieldId("lastName")}
                value={parkForm.lastName}
                placeholder="Doe"
                onChange={(event) =>
                  setParkForm((prev) => ({
                    ...prev,
                    lastName: event.target.value,
                  }))
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
              value={parkForm.confirmationNumber}
              placeholder="ABC12345"
              onChange={(event) =>
                setParkForm((prev) => ({
                  ...prev,
                  confirmationNumber: event.target.value,
                }))
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
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Pickup location</Label>
            <Select
              value={parkForm.pickupLocation || undefined}
              onValueChange={(value) =>
                setParkForm((prev) => ({
                  ...prev,
                  pickupLocation: value,
                }))
              }
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select pickup" />
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
              value={parkForm.destination || undefined}
              onValueChange={(value) =>
                setParkForm((prev) => ({
                  ...prev,
                  destination: value,
                }))
              }
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select destination" />
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
            <Label htmlFor="park-date">Date</Label>
            <Input
              id="park-date"
              type="date"
              value={parkForm.date}
              onChange={(event) =>
                setParkForm((prev) => ({
                  ...prev,
                  date: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="park-time">Time</Label>
            <Input
              id="park-time"
              type="time"
              value={parkForm.time}
              onChange={(event) =>
                setParkForm((prev) => ({
                  ...prev,
                  time: event.target.value,
                }))
              }
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="park-notes">Notes (optional)</Label>
          <Textarea
            id="park-notes"
            placeholder="Add valet instructions, ticket info, etc."
            value={parkForm.notes}
            onChange={(event) =>
              setParkForm((prev) => ({
                ...prev,
                notes: event.target.value,
              }))
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
                  checked={parkForm.paymentMethods[option.value]}
                  onCheckedChange={(checked) =>
                    setParkForm((prev) => ({
                      ...prev,
                      paymentMethods: {
                        ...prev.paymentMethods,
                        [option.value]: checked === true,
                      },
                    }))
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
}

export default function NewBookingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background p-6 flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <NewBookingContent />
    </Suspense>
  );
}

