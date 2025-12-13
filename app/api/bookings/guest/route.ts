import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { NextRequest, NextResponse } from "next/server";
import type { Id } from "@/convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const guestId = searchParams.get("guestId");
    const status = searchParams.get("status") as
      | "PENDING"
      | "CONFIRMED"
      | "REJECTED"
      | null;

    if (!guestId) {
      return NextResponse.json(
        { error: "guestId query parameter is required" },
        { status: 400 }
      );
    }

    if (status && !["PENDING", "CONFIRMED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be PENDING, CONFIRMED, or REJECTED" },
        { status: 400 }
      );
    }

    const bookings = await convex.query(api.bookings.index.getGuestBookings, {
      guestId: guestId as Id<"users">,
      status: status || undefined,
    });

    return NextResponse.json(bookings);
  } catch (error: any) {
    console.error("Get guest bookings error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
