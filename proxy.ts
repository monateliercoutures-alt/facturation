import { NextResponse, type NextRequest } from "next/server";

/**
 * Vérification optimiste : présence du cookie de session seulement (pas d'accès base ici).
 * L'autorisation réelle est refaite dans chaque page et chaque Server Action (lib/session.ts).
 */
const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));
  if (!hasSession && (pathname === "/app" || pathname.startsWith("/app/") || pathname === "/admin" || pathname.startsWith("/admin/"))) {
    const url = new URL("/connexion", request.url);
    url.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/app/:path*", "/admin/:path*"] };
