import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { NextRequest, NextResponse } from "next/server";
import type { Id } from "@/convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const status = searchParams.get("status") as
      | "PENDING"
      | "CONFIRMED"
      | "REJECTED"
      | null;
    const limitParam = searchParams.get("limit");
    const cursor = searchParams.get("cursor");
    const limit = limitParam ? parseInt(limitParam, 10) : 20;

    if (!userId) {
      return NextResponse.json(
        { error: "userId query parameter is required" },
        { status: 400 }
      );
    }

    if (status && !["PENDING", "CONFIRMED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be PENDING, CONFIRMED, or REJECTED" },
        { status: 400 }
      );
    }

    if (limitParam && (isNaN(limit!) || limit! <= 0)) {
      return NextResponse.json(
        { error: "Invalid limit. Must be a positive number" },
        { status: 400 }
      );
    }

    const bookings = await convex.query(api.bookings.index.getHotelBookings, {
      userId: userId as Id<"users">,
      status: status || undefined,
      limit,
      cursor: cursor || undefined,
    });

    return NextResponse.json(bookings);
  } catch (error: any) {
    console.error("Get hotel bookings error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
