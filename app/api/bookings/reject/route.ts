import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { NextRequest, NextResponse } from "next/server";
import type { Id } from "@/convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { frontdeskUserId, bookingId, reason } = body;

    if (!frontdeskUserId || !bookingId || !reason) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: frontdeskUserId, bookingId, and reason are required",
        },
        { status: 400 }
      );
    }

    const result = await convex.mutation(api.bookings.index.rejectBooking, {
      frontdeskUserId: frontdeskUserId as Id<"users">,
      bookingId: bookingId as Id<"bookings">,
      reason,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Reject booking error:", error);

    if (error.message?.includes("Only frontdesk")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error.message?.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error.message?.includes("Only pending")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
