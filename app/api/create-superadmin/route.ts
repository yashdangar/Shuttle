// curl -X POST http://localhost:3000/api/create-superadmin \
//   -H "Content-Type: application/json" \
//   -d '{
//     "name": "Superadmin",
//     "email": "superadmin@example.com",
//     "password": "sasasasa",
//     "phoneNumber": "+1234567890",
//     "token": "admin"
//   }'


import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { NextRequest, NextResponse } from "next/server";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, phoneNumber, token } = body;

    if (!name || !email || !password || !phoneNumber) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: name, email, password, and phoneNumber are required",
        },
        { status: 400 }
      );
    }

    const superAdminToken = process.env.SUPER_ADMIN_TOKEN;

    if (!superAdminToken) {
      return NextResponse.json(
        { error: "Server configuration error: SUPER_ADMIN_TOKEN not set" },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get("authorization");
    const providedToken = authHeader?.replace("Bearer ", "") || token;

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

    const userId = await convex.action(api.auth.createUser, {
      email,
      name,
      phoneNumber,
      password,
      role: "superadmin",
    });

    return NextResponse.json(
      {
        success: true,
        message: "Superadmin created successfully",
        userId,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.message === "User with this email already exists") {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
