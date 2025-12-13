import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { NextRequest, NextResponse } from "next/server";
import type { Id } from "@/convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, bookingId, reason } = body;

    if (!userId || !bookingId || !reason) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: userId, bookingId, and reason are required",
        },
        { status: 400 }
      );
    }

    const result = await convex.mutation(api.bookings.index.cancelBooking, {
      userId: userId as Id<"users">,
      bookingId: bookingId as Id<"bookings">,
      reason,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Cancel booking error:", error);

    if (error.message?.includes("User not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error.message?.includes("Booking not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error.message?.includes("only cancel your own")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error.message?.includes("already cancelled")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
