import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Get token from cookies
  const token = request.cookies.get("adminToken")?.value;
  
  const isLoginPage = request.nextUrl.pathname === "/login";

  // If no token and not on login page, redirect to login
  if (!token && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // If has token and on login page, redirect to dashboard
  if (token && isLoginPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // For protected routes, just pass through
  if (token && !isLoginPage) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/dashboard", "/hotels", "/frontdesks", "/drivers", "/shuttles"],
};
