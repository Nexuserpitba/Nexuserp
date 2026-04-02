import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json();
    const { email, password, nome, action } = body;

    if (!email || !password) {
      return new Response(
        JSON.stringify({ success: false, error: "Email e senha são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if any admin exists
    const { data: existingAdmins } = await adminClient
      .from("user_roles")
      .select("user_id")
      .eq("role", "administrador")
      .limit(1);

    const hasExistingAdmin = existingAdmins && existingAdmins.length > 0;

    const isResetAction = action === "reset-password";

    // Always require admin auth when admins already exist (including reset-password)
    if (hasExistingAdmin) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ success: false, error: "Não autorizado" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: userData, error: userError } = await callerClient.auth.getUser();
      if (userError || !userData.user) {
        return new Response(
          JSON.stringify({ success: false, error: "Token inválido" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: roleData } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .eq("role", "administrador")
        .maybeSingle();

      if (!roleData) {
        return new Response(
          JSON.stringify({ success: false, error: "Apenas administradores podem executar esta função" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // If reset-password action, just reset the password for the existing user
    if (isResetAction) {
      const { data: existingUsers } = await adminClient.auth.admin.listUsers();
      const existing = existingUsers?.users?.find(u => u.email === email);

      if (!existing) {
        return new Response(
          JSON.stringify({ success: false, error: "Usuário não encontrado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: updateError } = await adminClient.auth.admin.updateUserById(existing.id, {
        password,
        email_confirm: true,
      });
      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ success: true, message: "Senha redefinida com sucesso", email }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existing = existingUsers?.users?.find(u => u.email === email);

    if (existing) {
      const { error: updateError } = await adminClient.auth.admin.updateUserById(existing.id, {
        password,
        email_confirm: true,
      });
      if (updateError) throw updateError;

      const { data: existingRole } = await adminClient
        .from("user_roles")
        .select("id")
        .eq("user_id", existing.id)
        .maybeSingle();

      if (!existingRole) {
        await adminClient.from("user_roles").insert({ user_id: existing.id, role: "administrador" });
      }

      return new Response(
        JSON.stringify({ success: true, message: "Senha redefinida", email, userId: existing.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create new admin
    const { data: newUser, error: createError } =
      await adminClient.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { nome: nome || "Administrador", login: email, role: "administrador" },
      });

    if (createError) throw createError;

    return new Response(
      JSON.stringify({ success: true, message: "Admin criado", email, userId: newUser.user.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});