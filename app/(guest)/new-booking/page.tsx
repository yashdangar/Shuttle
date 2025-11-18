"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FAKE_HOTELS, type Hotel } from "../../../lib/hotels";

function NewBookingContent() {
  const searchParams = useSearchParams();
  const hotelId = searchParams.get("hotelId");
  const [hotel, setHotel] = useState<Hotel | null>(null);

  useEffect(() => {
    if (hotelId) {
      const foundHotel = FAKE_HOTELS.find((h) => h.id === hotelId);
      if (foundHotel) {
        setHotel(foundHotel);
      }
    } else {
      const storedHotelId = localStorage.getItem("selectedHotelId");
      if (storedHotelId) {
        const foundHotel = FAKE_HOTELS.find((h) => h.id === storedHotelId);
        if (foundHotel) {
          setHotel(foundHotel);
        }
      }
    }
  }, [hotelId]);

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

        <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Selected hotel
              </p>
              <h2 className="text-xl font-semibold text-foreground">
                {hotel.name}
              </h2>
              <p className="text-sm text-muted-foreground">{hotel.address}</p>
            </div>
            <button className="text-sm font-medium text-primary hover:underline">
              Change
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              Booking form will go here
            </p>
            <p className="text-sm text-muted-foreground">
              Add passenger details, trip direction, seat count, and payment
              info.
            </p>
          </div>
        </section>
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
