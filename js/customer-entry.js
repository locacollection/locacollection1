import { supabase } from './supabaseClient.js';

const { data: { session } = {}, error: sessionError } = await supabase.auth.getSession();

if (!sessionError && session?.user) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .maybeSingle();

  if (profile?.role === 'admin') {
    window.location.replace('admin-store.html');
  }
}
