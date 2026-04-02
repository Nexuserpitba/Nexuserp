import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonRes(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json();
    const { action } = body;

    // ---------- verify-credentials: no auth needed (PDV / liberação) ----------
    if (action === "verify-credentials") {
      return await handleVerifyCredentials(adminClient, body);
    }

    // ---------- Authenticate caller ----------
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonRes({ error: "Unauthorized" }, 401);
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await callerClient.auth.getUser();
    if (claimsError || !claimsData.user) {
      return jsonRes({ error: "Unauthorized" }, 401);
    }

    const callerId = claimsData.user.id;
    const { data: callerRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .limit(1)
      .single();

    const role = callerRole?.role as string | undefined;
    const isAdmin = role === "administrador";
    const isGerente = role === "gerente";

    if (!isAdmin && !isGerente) {
      return jsonRes({ error: "Apenas administradores e gerentes" }, 403);
    }

    // ---------- list-users: admin + gerente ----------
    if (action === "list-users") {
      return await handleListUsers(adminClient);
    }

    // ---------- create-user: admin + gerente (gerente não pode criar admin) ----------
    if (action === "create-user") {
      if (isGerente && body.role === "administrador") {
        return jsonRes({ error: "Gerentes não podem criar usuários administradores" }, 403);
      }
      return await handleCreateUser(adminClient, body);
    }

    // ---------- update-user: admin + gerente (gerente não pode promover a admin nem editar admins) ----------
    if (action === "update-user") {
      const { userId } = body;

      // Gerente cannot edit an admin user
      if (isGerente) {
        const { data: targetRole } = await adminClient
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .limit(1)
          .single();

        if (targetRole?.role === "administrador") {
          return jsonRes({ error: "Gerentes não podem editar usuários administradores" }, 403);
        }
        if (body.role === "administrador") {
          return jsonRes({ error: "Gerentes não podem promover usuários a administrador" }, 403);
        }
      }

      // Prevent self-role escalation
      if (callerId === userId && body.role && body.role !== role) {
        return jsonRes({ error: "Não é possível alterar o próprio perfil de acesso" }, 403);
      }

      return await handleUpdateUser(adminClient, body);
    }

    // ---------- delete-user: somente admin ----------
    if (action === "delete-user") {
      if (!isAdmin) {
        return jsonRes({ error: "Apenas administradores podem excluir usuários" }, 403);
      }
      if (body.userId === callerId) {
        return jsonRes({ error: "Não é possível excluir a própria conta" }, 403);
      }
      return await handleDeleteUser(adminClient, body);
    }

    return jsonRes({ error: "Ação inválida" }, 400);
  } catch (err: any) {
    return jsonRes({ error: err.message }, 500);
  }
});

// ===== Action handlers =====

async function handleVerifyCredentials(adminClient: any, body: any) {
  const { email, password } = body;
  const { data: signInData, error: signInError } = await adminClient.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError || !signInData.user) {
    return jsonRes({ valid: false, error: "Credenciais inválidas" });
  }

  const { data: profile } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", signInData.user.id)
    .single();

  const { data: roleData } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", signInData.user.id)
    .limit(1)
    .single();

  return jsonRes({
    valid: true,
    user: {
      id: signInData.user.id,
      nome: profile?.nome || signInData.user.email,
      login: profile?.login || signInData.user.email,
      role: roleData?.role || "operador",
      ativo: profile?.ativo ?? true,
      limiteDesconto: profile?.limite_desconto ?? 5,
    },
  });
}

async function handleListUsers(adminClient: any) {
  const { data: authUsers } = await adminClient.auth.admin.listUsers();
  const { data: profiles } = await adminClient.from("profiles").select("*");
  const { data: roles } = await adminClient.from("user_roles").select("*");

  const users = (authUsers?.users || []).map((u: any) => {
    const profile = profiles?.find((p: any) => p.id === u.id);
    const role = roles?.find((r: any) => r.user_id === u.id);
    return {
      id: u.id,
      email: u.email,
      nome: profile?.nome || u.email,
      login: profile?.login || u.email,
      role: role?.role || "operador",
      ativo: profile?.ativo ?? true,
      criadoEm: u.created_at,
      limiteDesconto: profile?.limite_desconto ?? 5,
      comissao: profile?.comissao ?? 0,
      departamento: profile?.departamento || "",
      escala: profile?.escala || "",
      observacoes: profile?.observacoes || "",
    };
  });

  return jsonRes({ users });
}

async function handleCreateUser(adminClient: any, body: any) {
  const { email, password, nome, role, ativo, limiteDesconto, comissao, departamento, escala, observacoes } = body;

  if (!email || !password || !nome) {
    return jsonRes({ error: "Nome, e-mail e senha são obrigatórios" }, 400);
  }

  const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nome, login: email, role: role || "operador" },
  });

  if (createError) {
    const msg = createError.message?.includes("already been registered")
      ? "Já existe um usuário cadastrado com este e-mail"
      : createError.message;
    return jsonRes({ error: msg }, 422);
  }

  if (newUser?.user) {
    await new Promise((r) => setTimeout(r, 500));
    await adminClient.from("profiles").upsert({
      id: newUser.user.id,
      nome,
      login: email,
      ativo: ativo ?? true,
      limite_desconto: limiteDesconto ?? 5,
      comissao: comissao ?? 0,
      departamento: departamento || "",
      escala: escala || "",
      observacoes: observacoes || "",
    });
  }

  return jsonRes({ success: true, userId: newUser.user.id });
}

async function handleUpdateUser(adminClient: any, body: any) {
  const { userId, email, password, nome, role, ativo, limiteDesconto, comissao, departamento, escala, observacoes } = body;

  const updatePayload: any = {};
  if (email) updatePayload.email = email;
  if (password) updatePayload.password = password;
  if (Object.keys(updatePayload).length > 0) {
    const { error } = await adminClient.auth.admin.updateUserById(userId, updatePayload);
    if (error) throw error;
  }

  await adminClient.from("profiles").update({
    nome,
    login: email,
    ativo: ativo ?? true,
    limite_desconto: limiteDesconto ?? 5,
    comissao: comissao ?? 0,
    departamento: departamento || "",
    escala: escala || "",
    observacoes: observacoes || "",
  }).eq("id", userId);

  if (role) {
    await adminClient.from("user_roles").update({ role }).eq("user_id", userId);
  }

  return jsonRes({ success: true });
}

async function handleDeleteUser(adminClient: any, body: any) {
  const { userId } = body;
  const { error } = await adminClient.auth.admin.deleteUser(userId);
  if (error) throw error;
  return jsonRes({ success: true });
}
