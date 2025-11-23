"use client";

import { Suspense, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
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
import { HotelCard } from "@/components/interfaces/guest/booking/hotel-card";
import { TransferForm } from "@/components/interfaces/guest/booking/transfer-form";
import { ParkForm } from "@/components/interfaces/guest/booking/park-form";
import { SubmitBar } from "@/components/interfaces/guest/booking/submit-bar";
import type { HotelRecord } from "@/convex/hotels";

function NewBookingContent() {
  const params = useParams<{ slug?: string | string[] }>();
  const slugParam = params?.slug;
  
  const normalizedSlug = useMemo(() => {
    if (typeof slugParam === "string") return slugParam;
    if (Array.isArray(slugParam)) return slugParam[0];
    return null;
  }, [slugParam]);

  const hotelData = useQuery(
    api.hotels.getHotelBySlug,
    normalizedSlug ? { slug: normalizedSlug } : "skip"
  );

  const hotel: HotelRecord | null = hotelData || null;
  const isLoading = hotelData === undefined;

  const tabs = [
    { id: "hotelToAirport", label: "Hotel → Airport", type: "transfer" },
    { id: "airportToHotel", label: "Airport → Hotel", type: "transfer" },
    { id: "parkSleepFly", label: "Park, Sleep & Fly", type: "park" },
  ] as const;

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
    direction: "hotelToAirport" as "hotelToAirport" | "airportToHotel",
  });

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
            You’re booking for{" "}
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
                    {tab.type === "transfer" ? (
                      <TransferForm
                        tabId={tab.id as "hotelToAirport" | "airportToHotel"}
                        form={transferForms[tab.id as "hotelToAirport" | "airportToHotel"]}
                        hotelId={hotel?.id ?? null}
                        onChange={(field, value) => {
                          setTransferForms((prev) => ({
                            ...prev,
                            [tab.id]: {
                              ...prev[tab.id as "hotelToAirport" | "airportToHotel"],
                              [field]: value,
                            },
                          }));
                        }}
                        onPaymentChange={(method, value) => {
                          setTransferForms((prev) => ({
                            ...prev,
                            [tab.id]: {
                              ...prev[tab.id as "hotelToAirport" | "airportToHotel"],
                              paymentMethods: {
                                ...prev[tab.id as "hotelToAirport" | "airportToHotel"].paymentMethods,
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
                    <SubmitBar />
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

