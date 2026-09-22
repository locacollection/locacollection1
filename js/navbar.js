import { supabase } from "./supabaseClient.js";

export async function updateNavbar() {
  const adminLinks = document.querySelectorAll(".admin-only-link");
  if (!adminLinks.length) return;

  adminLinks.forEach(link => {
    link.style.display = "none";
  });

  const { data: { session } = {}, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session?.user) return;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .maybeSingle();

  if (!profileError && profile?.role === "admin") {
    adminLinks.forEach(link => {
      link.style.display = "inline-block";
    });
  }
}

updateNavbar();
