import { supabase } from "./supabaseClient.js";

export async function updateNavbar() {
  const topAdminLink = document.querySelector('#mainNav a[href*="admin.html"]');
  topAdminLink?.remove();
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
    link.classList.add('admin-only-link');
    link.style.setProperty('display', isAdmin ? 'inline-block' : 'none', 'important');
    if (isAdmin && link.closest('footer')) {
      link.addEventListener('click', event => {
        event.preventDefault();
        localStorage.setItem('loca_test_mode', 'false');
        window.location.assign('admin.html');
      }, { once: true });
    }
  });
  document.body?.setAttribute('data-admin-test-mode', isAdmin && localStorage.getItem('loca_test_mode') === 'true' ? 'true' : 'false');
}

updateNavbar();
