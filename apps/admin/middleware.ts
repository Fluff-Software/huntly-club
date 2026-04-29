import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string }[]) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value }) => {
            supabaseResponse.cookies.set(name, value);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  const isLoginRoute = pathname.startsWith("/login");
  const isMfaRoute = pathname === "/login/mfa";
  const isAccountRoute = pathname === "/account";
  const isProtectedRoute = !isLoginRoute;

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isProtectedRoute) {
    const { data: factorsData, error: factorsError } =
      await supabase.auth.mfa.listFactors();

    // If MFA state cannot be resolved, keep current behavior to avoid lockouts.
    if (!factorsError) {
      const allFactors = factorsData?.all ?? [];
      const hasVerifiedTotp = allFactors.some(
        (factor) => factor.factor_type === "totp" && factor.status === "verified",
      );

      if (!hasVerifiedTotp && !isAccountRoute) {
        const url = request.nextUrl.clone();
        url.pathname = "/account";
        url.searchParams.set("requireMfa", "1");
        return NextResponse.redirect(url);
      }

      if (hasVerifiedTotp && !isMfaRoute) {
        const { data: aalData, error: aalError } =
          await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

        const currentLevel = !aalError ? aalData?.currentLevel : null;
        if (currentLevel !== "aal2") {
          const url = request.nextUrl.clone();
          url.pathname = "/login/mfa";
          return NextResponse.redirect(url);
        }
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
