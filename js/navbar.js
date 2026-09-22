import { supabase } from "./supabaseClient.js";

export async function updateNavbar() {
  const topAdminLink = document.querySelector('#mainNav a[href*="admin.html"]');
  topAdminLink?.remove();
  const adminLinks = document.querySelectorAll('.admin-only-link, a[href*="admin.html"]');
  if (!adminLinks.length) return;

  const { data: { session } = {}, error: sessionError } = await supabase.auth.getSession();
  let isAdmin = false;
  let adminIdentifier = "ADMIN_LOCA1";

  if (!sessionError && session?.user) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, admin_identifier")
      .eq("id", session.user.id)
      .maybeSingle();

    isAdmin = !profileError && profile?.role === "admin";
    adminIdentifier = profile?.admin_identifier || adminIdentifier;
  }

  adminLinks.forEach(link => {
    link.classList.add('admin-only-link');
    link.style.setProperty('display', isAdmin ? 'inline-block' : 'none', 'important');
  });

  const accountButton = document.querySelector('.account-button');
  if (accountButton && isAdmin) {
    document.getElementById('accountModal')?.setAttribute('hidden', '');
    accountButton.classList.add('admin-identity-badge');
    accountButton.removeAttribute('onclick');
    accountButton.setAttribute('aria-label', `Admin identity ${adminIdentifier}`);
    accountButton.innerHTML = `<span>${adminIdentifier}</span>`;
  }

  if (isAdmin && !document.getElementById('adminBridge')) {
    const bridge = document.createElement('a');
    bridge.id = 'adminBridge';
    bridge.href = 'admin.html';
    bridge.className = 'store-link admin-bridge';
    bridge.textContent = 'Admin Studio ↗';
    bridge.style.cssText = 'display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:0 15px;border:1px solid var(--line);border-radius:999px;font:600 12px/1 DM Sans,sans-serif;color:inherit;text-decoration:none;';
    document.querySelector('.nav-actions')?.prepend(bridge);
  } else {
    document.getElementById('accountModal')?.removeAttribute('hidden');
  }
}

updateNavbar();
