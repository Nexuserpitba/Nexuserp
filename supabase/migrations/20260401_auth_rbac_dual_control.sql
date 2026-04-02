-- ============================================================
-- NEXUS ERP - RBAC + ABAC, Step-Up Auth, Dual Control
-- Migration: 2026-04-01
-- ============================================================

-- ========== 1. PERMISSOES (granular RBAC) ==========
CREATE TABLE IF NOT EXISTS permissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,           -- ex: VENDAS, CANCELAR_VENDA, ESTORNO
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT NOT NULL DEFAULT 'OPERACIONAL', -- OPERACIONAL, FINANCEIRA, ADMIN
  step_up_obrigatorio BOOLEAN DEFAULT false, -- exige reautenticacao
  requer_gerente BOOLEAN DEFAULT false,      -- exige dupla autorizacao
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ========== 2. PERFIL x PERMISSAO (many-to-many) ==========
CREATE TABLE IF NOT EXISTS perfil_permissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil TEXT NOT NULL,                   -- app_role enum value
  permissao_id UUID NOT NULL REFERENCES permissoes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(perfil, permissao_id)
);

-- ========== 3. SESSAO POR TERMINAL ==========
CREATE TABLE IF NOT EXISTS sessoes_terminal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL,
  terminal_id TEXT NOT NULL,              -- identificador do caixa fisico
  terminal_nome TEXT,
  ip_address TEXT,
  user_agent TEXT,
  ativa BOOLEAN DEFAULT true,
  jwt_token_hash TEXT,                    -- hash do JWT para invalidacao
  last_activity TIMESTAMPTZ DEFAULT now(),
  expira_em TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ========== 4. AUTORIZACAO DUAL CONTROL ==========
CREATE TABLE IF NOT EXISTS autorizacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  acao TEXT NOT NULL,                     -- CANCELAR_VENDA, ESTORNO, SANGRIA, DESCONTO_ALTO
  operador_id UUID NOT NULL,              -- quem solicitou
  gerente_id UUID,                        -- quem autorizou (null = pendente)
  status TEXT NOT NULL DEFAULT 'PENDENTE', -- PENDENTE, APROVADO, NEGADO, EXPIRADO
  metodo TEXT,                            -- BIOMETRIA, SENHA
  motivo TEXT,                            -- motivo da acao critica
  detalhes JSONB,                         -- dados contextuais (valor, venda_id, etc)
  expira_em TIMESTAMPTZ NOT NULL,
  usado BOOLEAN DEFAULT false,            -- single-use
  ip_address TEXT,
  terminal_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolvido_em TIMESTAMPTZ
);

-- ========== 5. EVENTOS DE STEP-UP AUTH ==========
CREATE TABLE IF NOT EXISTS step_up_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL,
  acao_requerida TEXT NOT NULL,           -- acao que exigiu step-up
  metodo TEXT NOT NULL,                   -- BIOMETRIA, SENHA
  status TEXT NOT NULL DEFAULT 'PENDENTE', -- PENDENTE, VALIDADO, EXPIRADO, FALHOU
  token TEXT UNIQUE,                      -- token temporario de validacao
  expira_em TIMESTAMPTZ NOT NULL,
  ip_address TEXT,
  terminal_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolvido_em TIMESTAMPTZ
);

-- ========== 6. AUDITORIA EXPANDIDA ==========
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS terminal_id TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS detalhes JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS autorizado_por UUID;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS metodo_autenticacao TEXT;

-- ========== 7. SEED PERMISSOES ==========
INSERT INTO permissoes (codigo, nome, descricao, tipo, step_up_obrigatorio, requer_gerente) VALUES
  ('VENDAS', 'Realizar Vendas', 'Efetuar vendas no PDV', 'OPERACIONAL', false, false),
  ('CONSULTAR_PRODUTOS', 'Consultar Produtos', 'Visualizar catalogo de produtos', 'OPERACIONAL', false, false),
  ('CANCELAR_VENDA', 'Cancelar Venda', 'Cancelar uma venda ja realizada', 'OPERACIONAL', true, true),
  ('ESTORNO', 'Estorno Financeiro', 'Estornar movimentacao financeira', 'FINANCEIRA', true, true),
  ('SANGRIA', 'Sangria de Caixa', 'Realizar sangria de caixa', 'FINANCEIRA', true, true),
  ('DESCONTO_ALTO', 'Desconto Elevado', 'Aplicar desconto acima do limite', 'OPERACIONAL', true, true),
  ('ABERTURA_CAIXA', 'Abertura de Caixa', 'Abrir caixa no PDV', 'OPERACIONAL', false, false),
  ('FECHAMENTO_CAIXA', 'Fechamento de Caixa', 'Fechar caixa no PDV', 'FINANCEIRA', false, false),
  ('SUPRIMENTO', 'Suprimento de Caixa', 'Entrada de dinheiro no caixa', 'FINANCEIRA', false, false),
  ('GERENCIAR_USUARIOS', 'Gerenciar Usuarios', 'CRUD de usuarios do sistema', 'ADMIN', true, false),
  ('GERENCIAR_PERMISSOES', 'Gerenciar Permissoes', 'Alterar permissoes de perfil', 'ADMIN', true, false),
  ('EMITIR_NFE', 'Emitir NF-e', 'Emitir nota fiscal eletronica', 'OPERACIONAL', false, false),
  ('CANCELAR_NFE', 'Cancelar NF-e', 'Cancelar nota fiscal emitida', 'OPERACIONAL', true, true),
  ('GERAR_RELATORIO', 'Gerar Relatorios', 'Gerar relatorios do sistema', 'OPERACIONAL', false, false),
  ('ALTERAR_PRECO', 'Alterar Preco', 'Alterar preco de produtos', 'OPERACIONAL', true, false),
  ('GERENCIAR_ESTOQUE', 'Gerenciar Estoque', 'Movimentar estoque manualmente', 'OPERACIONAL', false, false),
  ('CONFIGURAR_SISTEMA', 'Configurar Sistema', 'Acessar configuracoes gerais', 'ADMIN', false, false),
  ('VISUALIZAR_AUDITORIA', 'Visualizar Auditoria', 'Consultar logs de auditoria', 'ADMIN', false, false),
  ('TROCAR_OPERADOR', 'Trocar Operador', 'Trocar operador no PDV via biometria', 'OPERACIONAL', false, false)
ON CONFLICT (codigo) DO NOTHING;

-- ========== 8. SEED PERFIL x PERMISSAO ==========
DO $$
DECLARE
  v_id UUID;
BEGIN
  -- ADMIN: todas as permissoes
  FOR v_id IN SELECT id FROM permissoes LOOP
    INSERT INTO perfil_permissoes (perfil, permissao_id)
    VALUES ('administrador', v_id)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- GERENTE: maioria
  FOR v_id IN SELECT id FROM permissoes WHERE codigo NOT IN ('GERENCIAR_PERMISSOES', 'CONFIGURAR_SISTEMA') LOOP
    INSERT INTO perfil_permissoes (perfil, permissao_id)
    VALUES ('gerente', v_id)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- SUPERVISOR
  FOR v_id IN SELECT id FROM permissoes WHERE codigo IN (
    'VENDAS', 'CONSULTAR_PRODUTOS', 'CANCELAR_VENDA', 'DESCONTO_ALTO',
    'ABERTURA_CAIXA', 'FECHAMENTO_CAIXA', 'GERAR_RELATORIO',
    'GERENCIAR_ESTOQUE', 'TROCAR_OPERADOR'
  ) LOOP
    INSERT INTO perfil_permissoes (perfil, permissao_id)
    VALUES ('supervisor', v_id)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- VENDEDOR
  FOR v_id IN SELECT id FROM permissoes WHERE codigo IN (
    'VENDAS', 'CONSULTAR_PRODUTOS', 'ABERTURA_CAIXA', 'FECHAMENTO_CAIXA', 'TROCAR_OPERADOR'
  ) LOOP
    INSERT INTO perfil_permissoes (perfil, permissao_id)
    VALUES ('vendedor', v_id)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- OPERADOR
  FOR v_id IN SELECT id FROM permissoes WHERE codigo IN (
    'VENDAS', 'CONSULTAR_PRODUTOS', 'ABERTURA_CAIXA', 'FECHAMENTO_CAIXA', 'TROCAR_OPERADOR'
  ) LOOP
    INSERT INTO perfil_permissoes (perfil, permissao_id)
    VALUES ('operador', v_id)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- FINANCEIRO
  FOR v_id IN SELECT id FROM permissoes WHERE codigo IN (
    'CONSULTAR_PRODUTOS', 'ESTORNO', 'SANGRIA', 'SUPRIMENTO',
    'FECHAMENTO_CAIXA', 'GERAR_RELATORIO', 'EMITIR_NFE', 'CANCELAR_NFE'
  ) LOOP
    INSERT INTO perfil_permissoes (perfil, permissao_id)
    VALUES ('financeiro', v_id)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- ESTOQUISTA
  FOR v_id IN SELECT id FROM permissoes WHERE codigo IN (
    'CONSULTAR_PRODUTOS', 'GERENCIAR_ESTOQUE'
  ) LOOP
    INSERT INTO perfil_permissoes (perfil, permissao_id)
    VALUES ('estoquista', v_id)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- TECNICO
  FOR v_id IN SELECT id FROM permissoes WHERE codigo IN (
    'CONSULTAR_PRODUTOS'
  ) LOOP
    INSERT INTO perfil_permissoes (perfil, permissao_id)
    VALUES ('tecnico', v_id)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ========== 9. INDICES PARA PERFORMANCE ==========
CREATE INDEX IF NOT EXISTS idx_permissoes_codigo ON permissoes(codigo);
CREATE INDEX IF NOT EXISTS idx_perfil_permissoes_perfil ON perfil_permissoes(perfil);
CREATE INDEX IF NOT EXISTS idx_perfil_permissoes_permissao ON perfil_permissoes(permissao_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_terminal_usuario ON sessoes_terminal(usuario_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_terminal_terminal ON sessoes_terminal(terminal_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_terminal_ativa ON sessoes_terminal(ativa);
CREATE INDEX IF NOT EXISTS idx_autorizacoes_operador ON autorizacoes(operador_id);
CREATE INDEX IF NOT EXISTS idx_autorizacoes_gerente ON autorizacoes(gerente_id);
CREATE INDEX IF NOT EXISTS idx_autorizacoes_status ON autorizacoes(status);
CREATE INDEX IF NOT EXISTS idx_autorizacoes_expira ON autorizacoes(expira_em);
CREATE INDEX IF NOT EXISTS idx_step_up_usuario ON step_up_eventos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_step_up_token ON step_up_eventos(token);
CREATE INDEX IF NOT EXISTS idx_step_up_status ON step_up_eventos(status);
CREATE INDEX IF NOT EXISTS idx_audit_terminal ON audit_logs(terminal_id);

-- ========== 10. RLS ==========
ALTER TABLE permissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfil_permissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessoes_terminal ENABLE ROW LEVEL SECURITY;
ALTER TABLE autorizacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE step_up_eventos ENABLE ROW LEVEL SECURITY;

-- Leitura publica para permissoes (necessario para checagem no frontend)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'permissoes' AND policyname = 'Permitir leitura permissoes') THEN
    CREATE POLICY "Permitir leitura permissoes" ON permissoes FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'perfil_permissoes' AND policyname = 'Permitir leitura perfil_permissoes') THEN
    CREATE POLICY "Permitir leitura perfil_permissoes" ON perfil_permissoes FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sessoes_terminal' AND policyname = 'Permitir leitura sessoes_terminal') THEN
    CREATE POLICY "Permitir leitura sessoes_terminal" ON sessoes_terminal FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'autorizacoes' AND policyname = 'Permitir leitura autorizacoes') THEN
    CREATE POLICY "Permitir leitura autorizacoes" ON autorizacoes FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'step_up_eventos' AND policyname = 'Permitir leitura step_up_eventos') THEN
    CREATE POLICY "Permitir leitura step_up_eventos" ON step_up_eventos FOR SELECT USING (true);
  END IF;
END $$;

-- ========== 11. FUNCOES RPC ==========

-- Verificar se usuario tem permissao especifica
CREATE OR REPLACE FUNCTION has_permission(_user_id UUID, _permissao_codigo TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN perfil_permissoes pp ON pp.perfil = ur.role::text
    JOIN permissoes p ON p.id = pp.permissao_id
    WHERE ur.user_id = _user_id
      AND p.codigo = _permissao_codigo
  );
$$;

-- Listar permissoes de um usuario
CREATE OR REPLACE FUNCTION get_user_permissions(_user_id UUID)
RETURNS TABLE(codigo TEXT, nome TEXT, tipo TEXT, step_up_obrigatorio BOOLEAN, requer_gerente BOOLEAN)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT DISTINCT p.codigo, p.nome, p.tipo, p.step_up_obrigatorio, p.requer_gerente
  FROM user_roles ur
  JOIN perfil_permissoes pp ON pp.perfil = ur.role::text
  JOIN permissoes p ON p.id = pp.permissao_id
  WHERE ur.user_id = _user_id;
$$;

-- Limpar sessoes expiradas
CREATE OR REPLACE FUNCTION limpar_sessoes_expiradas()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  count INTEGER;
BEGIN
  UPDATE sessoes_terminal
  SET ativa = false
  WHERE ativa = true AND expira_em < now();
  GET DIAGNOSTICS count = ROW_COUNT;
  RETURN count;
END;
$$;

-- Limpar autorizacoes expiradas
CREATE OR REPLACE FUNCTION limpar_autorizacoes_expiradas()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  count INTEGER;
BEGIN
  UPDATE autorizacoes
  SET status = 'EXPIRADO'
  WHERE status = 'PENDENTE' AND expira_em < now();
  GET DIAGNOSTICS count = ROW_COUNT;
  RETURN count;
END;
$$;

-- Limpar step-ups expirados
CREATE OR REPLACE FUNCTION limpar_stepups_expirados()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  count INTEGER;
BEGIN
  UPDATE step_up_eventos
  SET status = 'EXPIRADO'
  WHERE status = 'PENDENTE' AND expira_em < now();
  GET DIAGNOSTICS count = ROW_COUNT;
  RETURN count;
END;
$$;

-- ========== 12. TRIGGER updated_at ==========
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_sessoes_terminal_updated') THEN
    -- sessoes_terminal doesn't have updated_at, skip
    NULL;
  END IF;
END $$;
