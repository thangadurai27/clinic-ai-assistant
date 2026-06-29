import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Public routes — accessible without authentication
const PUBLIC_ROUTES = ["/", "/login", "/register", "/forgot-password", "/reset-password", "/terms", "/privacy"];

// Legacy redirects
const LEGACY_REDIRECTS: Record<string, string> = {
    "/dashboard/admin": "/dashboard",
    "/dashboard/doctor": "/dashboard",
    "/dashboard/doctors": "/dashboard",
    "/dashboard/patient": "/patient/dashboard",
};

function getUserFromCookie(request: NextRequest): { role: string; id: string } | null {
    const userCookie = request.cookies.get("clinic_user");
    if (!userCookie?.value) return null;
    try {
        return JSON.parse(decodeURIComponent(userCookie.value));
    } catch {
        return null;
    }
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Static assets and API routes — pass through
    if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/api") ||
        pathname.includes(".")
    ) {
        return NextResponse.next();
    }

    // Legacy redirect
    const legacyTarget = LEGACY_REDIRECTS[pathname];
    if (legacyTarget) {
        return NextResponse.redirect(new URL(legacyTarget, request.url));
    }

    // Public routes — always accessible
    if (PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"))) {
        return NextResponse.next();
    }

    // Protected routes — require authentication
    const isProtected =
        pathname.startsWith("/dashboard") || pathname.startsWith("/patient");

    if (isProtected) {
        const user = getUserFromCookie(request);
        if (!user) {
            const url = new URL("/login", request.url);
            url.searchParams.set("redirect", pathname);
            return NextResponse.redirect(url);
        }

        // Role-based guard: patients can't access /dashboard (except shared pages)
        if (
            user.role === "patient" &&
            pathname.startsWith("/dashboard") &&
            !pathname.startsWith("/dashboard/appointments") &&
            !pathname.startsWith("/dashboard/notifications") &&
            !pathname.startsWith("/dashboard/profile")
        ) {
            return NextResponse.redirect(new URL("/patient/dashboard", request.url));
        }

        // Receptionists can't access patient portal
        if (user.role === "receptionist" && pathname.startsWith("/patient")) {
            return NextResponse.redirect(new URL("/dashboard", request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
