import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Get token from Authorization header
  const authHeader = request.headers.get("Authorization");
  console.log(authHeader);
  const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
  const isLoginPage = request.nextUrl.pathname === "/login";

  // If no token and not on login page, redirect to login
  if (!token && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // If has token and on login page, redirect to dashboard
  if (token && isLoginPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // For protected routes, verify the token
  if (token && !isLoginPage) {
    try {
      // Create a new response with the token in Authorization header
      const response = NextResponse.next();
      response.headers.set("Authorization", `Bearer ${token}`);
      return response;
    } catch (error) {
      // If token is invalid, redirect to login
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
  ],
};
