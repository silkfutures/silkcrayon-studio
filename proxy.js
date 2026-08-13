import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function proxy(request) {
  const path = request.nextUrl.pathname;
  const isAdmin = path.startsWith('/admin');
  const isAdminApi = path.startsWith('/api/admin');
  const publicAuth = path === '/admin/login' || path === '/admin/setup' || path.startsWith('/api/auth/');
  if ((!isAdmin && !isAdminApi) || publicAuth) return NextResponse.next();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) return new NextResponse('Supabase Auth is not configured.', { status: 503 });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(items) {
        items.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    if (isAdminApi) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const login = request.nextUrl.clone();
    login.pathname = '/admin/login';
    login.searchParams.set('next', path);
    return NextResponse.redirect(login);
  }
  return response;
}

export const config = { matcher: ['/admin/:path*', '/api/admin/:path*'] };
