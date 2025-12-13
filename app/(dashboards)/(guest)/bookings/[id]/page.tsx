"use client";

import { useParams } from "next/navigation";
import {
  GuestBookingDetail,
  BookingNotFound,
} from "@/components/interfaces/guest/bookings/guest-booking-detail";

export default function BookingDetailPage() {
  const params = useParams<{ id?: string }>();

  if (!params?.id) {
    return <BookingNotFound />;
  }

  return <GuestBookingDetail bookingId={params.id} />;
}
