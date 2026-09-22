import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authorization = request.headers.get("Authorization");
    if (!url || !serviceRoleKey) return json({ error: "Server configuration is incomplete." }, 500);
    if (!authorization?.startsWith("Bearer ")) return json({ error: "Authentication is required." }, 401);

    const adminClient = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const token = authorization.slice(7);
    const { data: authData, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !authData.user) return json({ error: "Your admin session has expired." }, 401);

    const { data: actor, error: actorError } = await adminClient.from("profiles").select("role").eq("id", authData.user.id).maybeSingle();
    if (actorError) throw actorError;
    if (actor?.role !== "admin") return json({ error: "Admin access is required." }, 403);

    const payload = await request.json().catch(() => ({}));
    const email = typeof payload?.email === "string" ? payload.email.trim().toLowerCase() : "";
    const password = typeof payload?.password === "string" ? payload.password : "";
    const fullName = typeof payload?.full_name === "string" ? payload.full_name.trim() : "";
    if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: "Enter a valid email address." }, 400);
    if (password.length < 8) return json({ error: "Admin passwords must contain at least 8 characters." }, 400);
    if (!fullName) return json({ error: "Enter the administrator name." }, 400);

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName } });
    if (createError) return json({ error: createError.message }, 400);
    if (!created.user) return json({ error: "The administrator account was not created." }, 500);

    const { data: profile, error: profileError } = await adminClient.from("profiles").upsert({ id: created.user.id, email, contact_email: email, full_name: fullName, role: "admin" }, { onConflict: "id" }).select("id,email,full_name,role,admin_identifier,created_at").single();
    if (profileError) {
      await adminClient.auth.admin.deleteUser(created.user.id);
      throw profileError;
    }

    return json({ success: true, profile });
  } catch (error) {
    console.error("admin-create-user", error);
    return json({ error: error instanceof Error ? error.message : "Administrator could not be created." }, 500);
  }
});
