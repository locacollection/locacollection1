import { supabase } from "./supabaseClient.js";

export async function updateNavbar() {
  const adminLink = document.getElementById("admin-link") || document.querySelector(".admin-link");
  if (!adminLink) return;
  adminLink.id = "admin-link";

  adminLink.style.display = "none";

  const { data: { session } = {}, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session?.user) return;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .maybeSingle();

  if (!profileError && profile?.role === "admin") {
    adminLink.style.display = "inline-block";
  }
}

updateNavbar();
