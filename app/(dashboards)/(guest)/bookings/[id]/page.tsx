"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { FAKE_BOOKINGS } from "@/lib/bookings";
import {
  BookingDetail,
  BookingNotFound,
} from "@/components/interfaces/guest/bookings/booking-detail";

export default function BookingDetailPage() {
  const params = useParams<{ id?: string }>();
  const booking = useMemo(
    () => FAKE_BOOKINGS.find((item) => item.id === params?.id),
    [params?.id],
  );

  if (!booking) {
    return <BookingNotFound />;
  }

  return <BookingDetail booking={booking} />;
}

