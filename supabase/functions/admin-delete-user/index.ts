import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authorization = req.headers.get("Authorization");

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: "Server configuration is incomplete." }, 500);
    }
    if (!authorization?.startsWith("Bearer ")) {
      return json({ error: "Authentication is required." }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const token = authorization.slice(7);
    const { data: authData, error: authError } = await adminClient.auth.getUser(token);
    const actor = authData.user;

    if (authError || !actor) return json({ error: "Your admin session has expired." }, 401);

    const { data: adminRecord, error: adminCheckError } = await adminClient
      .from("admin_users")
      .select("user_id")
      .eq("user_id", actor.id)
      .maybeSingle();

    if (adminCheckError) throw adminCheckError;
    if (!adminRecord) return json({ error: "Admin access is required." }, 403);

    const payload = await req.json().catch(() => ({}));
    const userId = typeof payload?.user_id === "string" ? payload.user_id.trim() : "";

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
      return json({ error: "A valid registered user is required." }, 400);
    }
    if (userId === actor.id) {
      return json({ error: "You cannot delete the account currently running the studio." }, 400);
    }

    const { data: targetAdmin, error: targetAdminError } = await adminClient
      .from("admin_users")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (targetAdminError) throw targetAdminError;
    if (targetAdmin) return json({ error: "Admin accounts cannot be deleted from this screen." }, 403);

    const { data: target, error: targetError } = await adminClient.auth.admin.getUserById(userId);
    if (targetError || !target.user) return json({ error: "This registered user no longer exists." }, 404);

    const email = target.user.email || "Registered user";
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    return json({ success: true, email });
  } catch (error) {
    console.error("admin-delete-user", error);
    return json({ error: error instanceof Error ? error.message : "User could not be deleted." }, 500);
  }
});