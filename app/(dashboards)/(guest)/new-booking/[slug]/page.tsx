"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Plane, Car } from "lucide-react";
import { HotelCard } from "@/components/interfaces/guest/booking/hotel-card";
import { TransferForm } from "@/components/interfaces/guest/booking/transfer-form";
import { ParkForm } from "@/components/interfaces/guest/booking/park-form";
import { SubmitBar } from "@/components/interfaces/guest/booking/submit-bar";
import { useAuthSession } from "@/hooks/use-auth-session";
import { toast } from "sonner";
import type { HotelRecord } from "@/convex/hotels";

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

type ParkFormData = TransferFormData & {
  direction: "hotelToAirport" | "airportToHotel";
};

function NewBookingContent() {
  const params = useParams<{ slug?: string | string[] }>();
  const router = useRouter();
  const { user } = useAuthSession();
  const slugParam = params?.slug;

  const [activeTab, setActiveTab] = useState<string>("hotelToAirport");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizedSlug = useMemo(() => {
    if (typeof slugParam === "string") return slugParam;
    if (Array.isArray(slugParam)) return slugParam[0];
    return null;
  }, [slugParam]);

  const hotelData = useQuery(
    api.hotels.index.getHotelBySlug,
    normalizedSlug ? { slug: normalizedSlug } : "skip"
  );

  const hotel: HotelRecord | null = hotelData || null;
  const isLoading = hotelData === undefined;

  const tabs = [
    {
      id: "hotelToAirport",
      label: "Hotel → Airport",
      shortLabel: "To Airport",
      type: "transfer",
      icon: Plane,
    },
    {
      id: "airportToHotel",
      label: "Airport → Hotel",
      shortLabel: "To Hotel",
      type: "transfer",
      icon: Building2,
    },
    {
      id: "parkSleepFly",
      label: "Park, Sleep & Fly",
      shortLabel: "Park & Fly",
      type: "park",
      icon: Car,
    },
  ] as const;

  const createTransferForm = (): TransferFormData => {
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0];
    const hours = String(today.getHours()).padStart(2, "0");
    const minutes = String(today.getMinutes()).padStart(2, "0");
    const timeStr = `${hours}:${minutes}`;

    return {
      firstName: "",
      lastName: "",
      confirmationNumber: "",
      pickupLocation: "",
      destination: "",
      date: dateStr,
      time: timeStr,
      seats: "1",
      bags: "0",
      tripId: "" as Id<"trips"> | "",
      notes: "",
      paymentMethods: {
        frontDesk: true,
      },
    };
  };

  const [transferForms, setTransferForms] = useState({
    hotelToAirport: createTransferForm(),
    airportToHotel: createTransferForm(),
  });

  const [parkForm, setParkForm] = useState<ParkFormData>({
    ...createTransferForm(),
    direction: "hotelToAirport" as "hotelToAirport" | "airportToHotel",
  });

  useEffect(() => {
    if (user?.name) {
      const nameParts = user.name.trim().split(/\s+/);
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      setTransferForms((prev) => ({
        hotelToAirport: {
          ...prev.hotelToAirport,
          firstName: prev.hotelToAirport.firstName || firstName,
          lastName: prev.hotelToAirport.lastName || lastName,
        },
        airportToHotel: {
          ...prev.airportToHotel,
          firstName: prev.airportToHotel.firstName || firstName,
          lastName: prev.airportToHotel.lastName || lastName,
        },
      }));

      setParkForm((prev) => ({
        ...prev,
        firstName: prev.firstName || firstName,
        lastName: prev.lastName || lastName,
      }));
    }
  }, [user?.name]);

  const tripsData = useQuery(
    api.trips.index.listHotelTrips,
    hotel?.id ? { hotelId: hotel.id } : "skip"
  );
  const trips = tripsData ?? [];

  const getFormData = (): TransferFormData | ParkFormData => {
    if (activeTab === "parkSleepFly") {
      return parkForm;
    }
    return transferForms[activeTab as "hotelToAirport" | "airportToHotel"];
  };

  const validateForm = (
    form: TransferFormData | ParkFormData
  ): string | null => {
    if (!form.tripId) return "Please select a trip";
    if (!form.pickupLocation) return "Please select a pickup location";
    if (!form.destination) return "Please select a destination";
    if (!form.date) return "Please select a date";
    if (!form.time) return "Please select a time";
    if (!form.seats || parseInt(form.seats, 10) <= 0)
      return "Please enter valid number of seats";
    if (!form.firstName && !form.lastName && !form.confirmationNumber)
      return "Please enter guest name or confirmation number";

    if (form.time && !form.time.includes("-")) {
      return "Please select a valid time slot";
    }

    return null;
  };

  const handleSubmit = async () => {
    if (!user?.id || !hotel?.id) {
      toast.error("Please sign in to make a booking");
      return;
    }

    const formData = getFormData();
    const validationError = validateForm(formData);

    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const guestName =
        `${formData.firstName} ${formData.lastName}`.trim() || undefined;
      const isParkSleepFly = activeTab === "parkSleepFly";

      // Extract start time from slot format (e.g., "05:00-06:00" -> "05:00")
      const desiredTime = formData.time.includes("-")
        ? formData.time.split("-")[0].trim()
        : formData.time;

      const response = await fetch("/api/bookings/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          guestId: user.id,
          tripId: formData.tripId,
          fromLocationId: formData.pickupLocation,
          toLocationId: formData.destination,
          scheduledDate: formData.date,
          desiredTime,
          seats: parseInt(formData.seats, 10),
          bags: parseInt(formData.bags || "0", 10),
          hotelId: hotel.id,
          name: guestName,
          confirmationNum: formData.confirmationNumber || undefined,
          notes: formData.notes || "",
          isParkSleepFly,
          paymentMethod: formData.paymentMethods.frontDesk
            ? "FRONTDESK"
            : "APP",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || result.message || "Failed to create booking"
        );
      }

      if (result.success) {
        // Show assigned slot if available
        if (result.assignedSlot) {
          toast.success(
            `Booking created! Assigned to slot: ${result.assignedSlot.startTime} - ${result.assignedSlot.endTime}`
          );
        } else {
          toast.success(result.message || "Booking created successfully!");
        }

        if (activeTab === "parkSleepFly") {
          setParkForm({
            ...createTransferForm(),
            direction: "hotelToAirport",
          });
        } else {
          setTransferForms((prev) => ({
            ...prev,
            [activeTab]: createTransferForm(),
          }));
        }

        router.push("/bookings");
      } else {
        toast.error(result.message || "Booking failed");
      }
    } catch (error: any) {
      console.error("Booking error:", error);
      toast.error(
        error.message || "Failed to create booking. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = (): boolean => {
    const form = getFormData();
    return Boolean(
      form.tripId &&
        form.pickupLocation &&
        form.destination &&
        form.date &&
        form.time &&
        form.seats &&
        parseInt(form.seats, 10) > 0 &&
        (form.firstName || form.lastName || form.confirmationNumber)
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading hotel...</p>
        </div>
      </div>
    );
  }

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
            You're booking for{" "}
            <span className="font-medium text-foreground">{hotel.name}</span>
          </p>
        </header>

        <HotelCard hotel={hotel} />

        <Card>
          <CardHeader>
            <CardTitle>Booking form</CardTitle>
            <CardDescription>
              Choose the service type, enter the passenger or confirmation info,
              then add shuttle logistics.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              defaultValue="hotelToAirport"
              value={activeTab}
              onValueChange={setActiveTab}
              className="space-y-6"
            >
              {/* Mobile Tabs */}
              <TabsList className="grid h-auto w-full grid-cols-3 gap-2 rounded-xl bg-transparent p-0 sm:hidden">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="flex h-auto flex-col items-center gap-1.5 rounded-xl border border-border bg-card px-2 py-3 text-muted-foreground shadow-sm transition-all hover:bg-accent data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-md"
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-[10px] font-medium leading-tight text-center">
                        {tab.shortLabel}
                      </span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {/* Desktop Tabs */}
              <TabsList className="hidden h-12 w-full rounded-full bg-muted/60 p-1 sm:grid sm:grid-cols-3">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="flex items-center justify-center gap-2 rounded-full text-[11px] font-semibold uppercase tracking-widest transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm"
                    >
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              {tabs.map((tab) => (
                <TabsContent key={tab.id} value={tab.id} className="mt-0">
                  <div className="space-y-8">
                    {tab.type === "transfer" ? (
                      <TransferForm
                        tabId={tab.id as "hotelToAirport" | "airportToHotel"}
                        form={
                          transferForms[
                            tab.id as "hotelToAirport" | "airportToHotel"
                          ]
                        }
                        hotelId={hotel?.id ?? null}
                        onChange={(field, value) => {
                          setTransferForms((prev) => ({
                            ...prev,
                            [tab.id]: {
                              ...prev[
                                tab.id as "hotelToAirport" | "airportToHotel"
                              ],
                              [field]: value,
                            },
                          }));
                        }}
                        onPaymentChange={(method, value) => {
                          setTransferForms((prev) => ({
                            ...prev,
                            [tab.id]: {
                              ...prev[
                                tab.id as "hotelToAirport" | "airportToHotel"
                              ],
                              paymentMethods: {
                                ...prev[
                                  tab.id as "hotelToAirport" | "airportToHotel"
                                ].paymentMethods,
                                [method]: value === true,
                              },
                            },
                          }));
                        }}
                      />
                    ) : (
                      <ParkForm
                        form={parkForm}
                        hotelId={hotel?.id ?? null}
                        onChange={(updates) => {
                          setParkForm((prev) => ({ ...prev, ...updates }));
                        }}
                        onPaymentChange={(method, value) => {
                          setParkForm((prev) => ({
                            ...prev,
                            paymentMethods: {
                              ...prev.paymentMethods,
                              [method]: value === true,
                            },
                          }));
                        }}
                      />
                    )}
                    <SubmitBar
                      onSubmit={handleSubmit}
                      isLoading={isSubmitting}
                      disabled={!isFormValid()}
                    />
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
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
