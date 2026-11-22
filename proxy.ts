import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { ROLE_HOME } from "@/lib/constants";
import type { UserRole } from "@/types/domain";

/**
 * Next.js 16 proxy (formerly middleware).
 *
 * Responsibilities:
 *  1. Refresh the Supabase session cookie.
 *  2. Redirect anonymous visitors away from protected areas.
 *  3. Keep each role inside its own area (/admin, /owner, /portal).
 *
 * This is an optimistic check. Every page additionally calls requireRole()
 * and the database enforces RLS, so a stale token can never leak data.
 */

const PUBLIC_PATHS = ["/login", "/auth"];

const AREA_RULES: Array<{ prefix: string; roles: UserRole[] }> = [
  { prefix: "/admin", roles: ["owner", "reception"] },
  { prefix: "/owner", roles: ["owner"] },
  { prefix: "/portal", roles: ["student"] },
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function areaFor(pathname: string) {
  return AREA_RULES.find(
    (rule) => pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`),
  );
}

function redirectWithCookies(
  request: NextRequest,
  path: string,
  source?: NextResponse,
) {
  const response = NextResponse.redirect(new URL(path, request.url));
  source?.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie.name, cookie.value);
  });
  return response;
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Not configured yet (fresh clone). Only the login screen is reachable.
  if (!url || !anonKey) {
    return isPublicPath(pathname)
      ? response
      : redirectWithCookies(request, "/login");
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Refresh the session (also validates the JWT with Supabase Auth).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublic = isPublicPath(pathname);
  const area = areaFor(pathname);

  if (!user) {
    if (isPublic) return response;
    return redirectWithCookies(
      request,
      pathname === "/" ? "/login" : `/login?next=${encodeURIComponent(pathname)}`,
      response,
    );
  }

  // app_metadata is set by the service role when accounts are provisioned.
  let role = user.app_metadata?.role as UserRole | undefined;

  if (!role || !["owner", "reception", "student"].includes(role)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role) {
      role = profile.role as UserRole;
    }
  }

  if (!role) {
    return isPublic ? response : redirectWithCookies(request, "/login", response);
  }

  // Signed-in users never need the login page.
  if (pathname === "/login") {
    return redirectWithCookies(request, ROLE_HOME[role], response);
  }

  if (pathname === "/") {
    return redirectWithCookies(request, ROLE_HOME[role], response);
  }

  // Wrong area for this role — bounce to their own home.
  if (area && !area.roles.includes(role)) {
    return redirectWithCookies(request, ROLE_HOME[role], response);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on every request except static assets and image optimisation.
     * API routes stay inside the session refresh so future route handlers
     * receive fresh cookies too.
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
