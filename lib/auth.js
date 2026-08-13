import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAdminDb } from './supabase';

function publicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  return { url, key };
}

export async function getServerAuthClient() {
  const cookieStore = await cookies();
  const { url, key } = publicConfig();
  return createServerClient(url, key, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(items) {
        try { items.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
        catch { /* Server Components cannot always write cookies. Proxy refresh handles it. */ }
      },
    },
  });
}

export async function getStaffContext() {
  const auth = await getServerAuthClient();
  const { data: { user }, error } = await auth.auth.getUser();
  if (error || !user) return null;
  const { data: profile } = await getAdminDb()
    .from('staff_profiles')
    .select('*')
    .eq('user_id', user.id)
    .eq('active', true)
    .maybeSingle();
  if (!profile) return null;
  return { user, profile };
}

export async function requireStaff() {
  const ctx = await getStaffContext();
  if (!ctx) redirect('/admin/login');
  return ctx;
}

export async function requireOwner() {
  const ctx = await requireStaff();
  if (ctx.profile.role !== 'owner') redirect('/admin/engineer');
  return ctx;
}
