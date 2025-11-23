import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

type Role = "guest" | "admin" | "driver" | "frontdesk" | "superadmin";

const LOGIN_ROUTE = "/sign-in";
const publicRoutes = new Set(["/", "/sign-in", "/sign-up"]);
const authRoutes = new Set(["/sign-in", "/sign-up"]);
const roleHomes: Record<Role, string> = {
  guest: "/dashboard", 
  admin: "/admin",
  driver: "/driver",
  frontdesk: "/frontdesk",
  superadmin: "/super-admin",
};
const roleScopes: Record<Role, string[]> = {
  guest: ["/dashboard", "/select-hotels", "/new-booking", "/bookings","/profile","/notifications","/chat"],
  admin: ["/admin", "/admin/drivers", "/admin/frontdesks","/admin/shuttles","/profile","/notifications","/admin/locations","/chat","/admin/trips"],
  driver: ["/driver","/profile","/notifications","/chat"],
  frontdesk: ["/frontdesk","/frontdesk/drivers","/frontdesk/frontdesks","/frontdesk/shuttles","/profile","/notifications","/chat"  ],
  superadmin: ["/super-admin","/profile","/notifications","/chat"],
};

export default auth((req) => {
  const { nextUrl } = req;
  const pathname = normalizePath(nextUrl.pathname);
  const session = req.auth;

  if (!session) {
    if (!isPublicRoute(pathname)) {
      return NextResponse.redirect(new URL(LOGIN_ROUTE, nextUrl));
    }
    return NextResponse.next();
  }

  if (pathname === "/") {
    return NextResponse.next();
  }

  const role = toRole(session.user.role);
  const roleHome = roleHomes[role];

  if (isAuthRoute(pathname)) {
    return NextResponse.redirect(new URL(roleHome, nextUrl));
  }

  const allowedScopes = roleScopes[role];
  const authorized = allowedScopes.some((scope) =>
    matchesScope(scope, pathname)
  );

  if (!authorized) {
    return NextResponse.redirect(new URL(roleHome, nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|_next/data|favicon.ico|robots.txt|sitemap.xml|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

function normalizePath(pathname: string) {
  if (pathname === "/") {
    return pathname;
  }
  return pathname.replace(/\/+$/, "") || "/";
}

function isPublicRoute(pathname: string) {
  return publicRoutes.has(pathname);
}

function isAuthRoute(pathname: string) {
  return authRoutes.has(pathname);
}

function matchesScope(scope: string, pathname: string) {
  if (scope === "/") {
    return pathname === "/";
  }
  return pathname === scope || pathname.startsWith(`${scope}/`);
}

function toRole(role?: string): Role {
  const normalized = (role || "guest").toLowerCase() as Role;
  if (normalized in roleHomes) {
    return normalized;
  }
  return "guest";
}
