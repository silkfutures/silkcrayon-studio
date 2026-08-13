import { NextResponse } from "next/server";

export function proxy(request) {
  if (!(request.nextUrl.pathname.startsWith("/admin") || request.nextUrl.pathname.startsWith("/api/admin"))) return NextResponse.next();
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) return new NextResponse("Admin credentials are not configured.", { status: 503 });
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    try {
      const decoded = atob(auth.slice(6));
      const idx = decoded.indexOf(":");
      const u = decoded.slice(0, idx);
      const p = decoded.slice(idx + 1);
      if (u === username && p === password) return NextResponse.next();
    } catch {}
  }
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Silkcrayon Admin"' },
  });
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
