import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { mapCustomDomainPath, normalizeHost } from "@/lib/site/domain";

const PLATFORM_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

function isPlatformHost(host: string) {
  if (PLATFORM_HOSTS.has(host)) return true;
  if (host.endsWith(".trycloudflare.com")) return true;
  if (host.endsWith(".localhost")) return true;
  const platform = process.env.PLATFORM_HOST?.toLowerCase();
  if (platform && host === normalizeHost(platform)) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const responseHeaders = new Headers();
  responseHeaders.set("X-Frame-Options", "DENY");
  responseHeaders.set("X-Content-Type-Options", "nosniff");
  responseHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");
  responseHeaders.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  responseHeaders.set("Content-Security-Policy", "frame-ancestors 'none'");

  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/admin")) {
    const hasSession =
      request.cookies.has("authjs.session-token") ||
      request.cookies.has("__Secure-authjs.session-token") ||
      request.cookies.has("next-auth.session-token");
    if (!hasSession) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("callbackUrl", pathname);
      const redirect = NextResponse.redirect(url);
      responseHeaders.forEach((v, k) => redirect.headers.set(k, v));
      return redirect;
    }
  }

  const host = normalizeHost(request.headers.get("host") ?? "");
  if (host && !isPlatformHost(host) && !pathname.startsWith("/api/site/by-domain")) {
    try {
      const lookup = new URL("/api/site/by-domain", request.nextUrl.origin);
      lookup.searchParams.set("host", host);
      const res = await fetch(lookup.toString(), {
        headers: { "x-middleware-domain-lookup": "1" },
      });
      if (res.ok) {
        const json = (await res.json()) as { data?: { slug?: string } };
        const slug = json.data?.slug;
        if (slug) {
          const targetPath = mapCustomDomainPath(pathname, slug);
          if (targetPath !== pathname) {
            const rewriteUrl = request.nextUrl.clone();
            rewriteUrl.pathname = targetPath;
            const rewrite = NextResponse.rewrite(rewriteUrl);
            responseHeaders.forEach((v, k) => rewrite.headers.set(k, v));
            rewrite.headers.set("x-tenant-slug", slug);
            rewrite.headers.set("x-tenant-custom-domain", "1");
            rewrite.headers.set("x-tenant-domain", host);
            return rewrite;
          }
          const next = NextResponse.next();
          responseHeaders.forEach((v, k) => next.headers.set(k, v));
          next.headers.set("x-tenant-slug", slug);
          next.headers.set("x-tenant-custom-domain", "1");
          return next;
        }
      }
    } catch {
      // ignore lookup errors
    }
  }

  const next = NextResponse.next();
  responseHeaders.forEach((v, k) => next.headers.set(k, v));
  return next;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
