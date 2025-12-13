import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { NextRequest, NextResponse } from "next/server";
import type { Id } from "@/convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const frontdeskUserId = searchParams.get("frontdeskUserId");

    if (!frontdeskUserId) {
      return NextResponse.json(
        { error: "frontdeskUserId query parameter is required" },
        { status: 400 }
      );
    }

    const bookings = await convex.query(
      api.bookings.index.getPendingBookingsForHotel,
      {
        frontdeskUserId: frontdeskUserId as Id<"users">,
      }
    );

    return NextResponse.json(bookings);
  } catch (error: any) {
    console.error("Get pending bookings error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
