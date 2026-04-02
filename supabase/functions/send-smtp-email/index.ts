import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface IncomingAttachment {
  filename?: unknown;
  contentType?: unknown;
  encoding?: unknown;
  content?: unknown;
}

function normalizeSmtpHost(rawHost: unknown): string {
  if (typeof rawHost !== "string") return "";

  let host = rawHost.trim();
  if (!host) return "";

  host = host
    .replace(/^smtps?:\/\//i, "")
    .replace(/^https?:\/\//i, "")
    .split("/")[0]
    .trim();

  if (host.includes("@")) {
    host = host.split("@").pop()?.trim() ?? "";
  }

  const hostParts = host.split(":");
  if (hostParts.length > 1) {
    const maybePort = hostParts[hostParts.length - 1];
    if (/^\d+$/.test(maybePort)) {
      host = hostParts.slice(0, -1).join(":").trim();
    }
  }

  return host;
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function toBase64Utf8(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
}

function normalizeAttachments(attachments: unknown): {
  filename: string;
  contentType: string;
  encoding: "base64" | "text";
  content: string;
}[] {
  if (!Array.isArray(attachments)) return [];

  return attachments
    .filter((attachment): attachment is IncomingAttachment => !!attachment && typeof attachment === "object")
    .map((attachment) => {
      const encoding = attachment.encoding === "text" ? "text" : "base64";

      return {
        filename: typeof attachment.filename === "string" && attachment.filename.trim()
          ? attachment.filename.trim()
          : "anexo.bin",
        contentType: typeof attachment.contentType === "string" && attachment.contentType.trim()
          ? attachment.contentType.trim()
          : "application/octet-stream",
        encoding,
        content: typeof attachment.content === "string" ? attachment.content : "",
      };
    })
    .filter((attachment) => attachment.content.length > 0);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // --- Auth: require authenticated user with admin/gerente role ---
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Não autorizado" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const token = authHeader.replace("Bearer ", "");

  // Allow service_role key for server-to-server calls
  if (token !== serviceRoleKey) {
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .limit(1)
      .single();

    if (!roleData || !["administrador", "gerente"].includes(roleData.role)) {
      return new Response(JSON.stringify({ error: "Permissão insuficiente" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }
  // --- End auth ---

  let smtpHost = "";
  let client: SMTPClient | null = null;

  try {
    const { smtp, to, subject, body, html, isTest, attachments } = await req.json();
    smtpHost = normalizeSmtpHost(smtp?.servidor);

    if (!smtpHost || !smtp?.porta || !to) {
      return new Response(
        JSON.stringify({ error: "Dados SMTP ou destinatário incompletos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const porta = parseInt(String(smtp.porta), 10);
    if (!Number.isInteger(porta) || porta <= 0 || porta > 65535) {
      return new Response(
        JSON.stringify({ error: "Porta SMTP inválida. Informe um número entre 1 e 65535." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const criptografia = smtp.criptografia || (porta === 465 ? 'SSL' : 'TLS');
    const useTls = criptografia === 'SSL';

    const clientConfig: any = {
      connection: {
        hostname: smtpHost,
        port: porta,
        tls: useTls,
        auth: smtp.exigeSenha ? {
          username: smtp.usuario,
          password: smtp.senha,
        } : undefined,
      },
      debug: {
        encodeLB: true,
      },
    };

    if (criptografia === 'Nenhuma') {
      clientConfig.connection.tls = false;
      clientConfig.debug = { ...clientConfig.debug, allowUnsecure: true };
    }

    client = new SMTPClient(clientConfig);

    const fromEmail = smtp.usuario || smtp.emailResposta || "noreply@empresa.com";
    const replyTo = smtp.emailResposta || fromEmail;

    const emailSubject = isTest
      ? "🔧 Teste de Conexão SMTP - NexusERP"
      : (subject || "E-mail do Sistema NexusERP");

    const emailBody = isTest
      ? `Este é um e-mail de teste enviado pelo NexusERP.\n\nServidor: ${smtpHost}\nPorta: ${smtp.porta}\nCriptografia: ${criptografia}\nUsuário: ${smtp.usuario}\n\nSe você recebeu este e-mail, a configuração SMTP está funcionando corretamente! ✅`
      : (body || "");

    const emailHtml = isTest
      ? `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#2563eb;">🔧 Teste de Conexão SMTP</h2>
          <p>Este é um e-mail de teste enviado pelo <strong>NexusERP</strong>.</p>
          <table style="border-collapse:collapse;margin:16px 0;">
            <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Servidor:</td><td>${smtpHost}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Porta:</td><td>${smtp.porta}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Criptografia:</td><td>${criptografia}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Usuário:</td><td>${smtp.usuario}</td></tr>
          </table>
          <p style="color:#16a34a;font-weight:bold;">✅ Configuração SMTP funcionando corretamente!</p>
         </div>`
      : (html || body || "");

    const plainText = emailBody || stripHtml(emailHtml) || "Mensagem sem conteúdo";
    const normalizedAttachments = normalizeAttachments(attachments);

    await client.send({
      from: fromEmail,
      to: to,
      subject: emailSubject,
      mimeContent: [
        {
          mimeType: 'text/plain; charset="utf-8"',
          transferEncoding: "base64",
          content: toBase64Utf8(plainText),
        },
        {
          mimeType: 'text/html; charset="utf-8"',
          transferEncoding: "base64",
          content: toBase64Utf8(emailHtml || `<p>${plainText}</p>`),
        },
      ],
      replyTo: replyTo,
      attachments: normalizedAttachments.length ? normalizedAttachments : undefined,
    });

    return new Response(
      JSON.stringify({ success: true, message: "E-mail enviado com sucesso!" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Erro ao enviar e-mail SMTP:", error);

    const rawErrorMessage = error instanceof Error ? error.message : "Erro desconhecido ao enviar e-mail";
    const isLookupError = /lookup address information|name or service not known|getaddrinfo|enotfound/i.test(rawErrorMessage);
    const errorMessage = isLookupError
      ? `Não foi possível localizar o servidor SMTP "${smtpHost || "informado"}". Verifique o campo Servidor (ex.: smtp.seudominio.com, sem http:// e sem :porta).`
      : rawErrorMessage;

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } finally {
    if (client) {
      try {
        await client.close();
      } catch {
        // noop
      }
    }
  }
});
