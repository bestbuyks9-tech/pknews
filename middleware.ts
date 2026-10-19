import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/site";

/** Refreshes the Studio session cookie before /admin pages and /api/admin routes check it. */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const db = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await db.auth.getUser();
  return response;
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
