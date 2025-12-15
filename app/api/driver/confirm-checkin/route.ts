import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { auth } from "@/lib/auth";
import type { Id } from "@/convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "driver") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const result = await convex.mutation(api.bookings.index.confirmCheckIn, {
      driverId: (session.user as any).id as Id<"users">,
      token,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Driver confirm-checkin error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Check-in failed" },
      { status: 400 }
    );
  }
}

