import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { NextRequest, NextResponse } from "next/server";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    console.log("NODE_ENV:", process.env.NODE_ENV);

    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json(
        { error: "This endpoint is only available in development mode" },
        { status: 403 }
      );
    }

    const superAdminToken = process.env.SUPER_ADMIN_TOKEN;
    console.log("SUPER_ADMIN_TOKEN env value:", superAdminToken);

    if (!superAdminToken) {
      return NextResponse.json(
        { error: "Server configuration error: SUPER_ADMIN_TOKEN not set" },
        { status: 500 }
      );
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch (error) {}

    const authHeader = request.headers.get("authorization");
    const providedToken =
      authHeader?.replace("Bearer ", "") || body?.token || null;

    if (!providedToken) {
      return NextResponse.json(
        {
          error:
            "Missing token: Provide token in Authorization header (Bearer token) or in request body",
        },
        { status: 401 }
      );
    }

    if (providedToken !== superAdminToken) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid token" },
        { status: 401 }
      );
    }

    const result = await convex.mutation(api.admins.index.wipeNonUserData, {});

    return NextResponse.json(
      {
        success: true,
        message: "All non-user collections were cleared",
        ...result,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
