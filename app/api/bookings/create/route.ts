import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import type { Id } from "@/convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

function generateQRCodePath(): string {
  return `/qr/${crypto.randomUUID()}`;
}

function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      guestId,
      tripId,
      scheduledDate,
      desiredTime, // e.g., "07:45" - the time user wants to travel
      seats,
      bags,
      hotelId,
      name,
      confirmationNum,
      notes,
      isParkSleepFly,
      paymentMethod,
    } = body;

    if (!guestId || !tripId || !scheduledDate || !desiredTime || !hotelId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (typeof seats !== "number" || seats <= 0) {
      return NextResponse.json(
        { error: "Seats must be a positive number" },
        { status: 400 }
      );
    }

    if (typeof bags !== "number" || bags < 0) {
      return NextResponse.json(
        { error: "Bags must be a non-negative number" },
        { status: 400 }
      );
    }

    if (!["APP", "FRONTDESK", "DEPOSIT"].includes(paymentMethod)) {
      return NextResponse.json(
        { error: "Invalid payment method" },
        { status: 400 }
      );
    }

    const result = await convex.mutation(api.bookings.index.createBooking, {
      guestId: guestId as Id<"users">,
      tripId: tripId as Id<"trips">,
      scheduledDate,
      desiredTime,
      seats,
      bags,
      hotelId: hotelId as Id<"hotels">,
      name,
      confirmationNum,
      notes: notes || "",
      isParkSleepFly: isParkSleepFly ?? false,
      paymentMethod,
      qrCodePath: generateQRCodePath(),
      encryptionKey: generateEncryptionKey(),
    });

    return NextResponse.json(result, { status: result.success ? 201 : 200 });
  } catch (error: any) {
    console.error("Create booking error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
