import { supabase } from "./supabaseClient.js";

export async function updateNavbar() {
  const adminLinks = document.querySelectorAll('.admin-only-link, a[href*="admin.html"]');
  if (!adminLinks.length) return;

  const { data: { session } = {}, error: sessionError } = await supabase.auth.getSession();
  let isAdmin = false;

  if (!sessionError && session?.user) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .maybeSingle();

    isAdmin = !profileError && profile?.role === "admin";
  }

  adminLinks.forEach(link => {
    link.style.setProperty('display', isAdmin ? 'inline-block' : 'none', 'important');
  });
}

updateNavbar();
