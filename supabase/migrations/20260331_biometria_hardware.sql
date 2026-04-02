-- Tabela de configuração do dispositivo biométrico
CREATE TABLE IF NOT EXISTS biometria_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id),
  dispositivo_nome TEXT NOT NULL DEFAULT 'CM 351',
  dispositivo_ip TEXT,
  dispositivo_porta INTEGER DEFAULT 9000,
  software_integracao TEXT DEFAULT 'InControl Web',
  webhook_url TEXT,
  webhook_secret TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de credenciais biométricas dos usuários
CREATE TABLE IF NOT EXISTS biometria_usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  biometria_id TEXT NOT NULL,
  dispositivo_id UUID REFERENCES biometria_config(id),
  nome_dispositivo TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, biometria_id)
);

-- Tabela de eventos biométricos (logs)
CREATE TABLE IF NOT EXISTS biometria_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  biometria_id TEXT NOT NULL,
  user_id UUID,
  evento_tipo TEXT NOT NULL DEFAULT 'identificacao',
  dispositivo_id UUID REFERENCES biometria_config(id),
  status TEXT NOT NULL DEFAULT 'pendente',
  token_gerado TEXT,
  token_expira_em TIMESTAMPTZ,
  ip_origem TEXT,
  dados_brutos JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_biometria_usuarios_user_id ON biometria_usuarios(user_id);
CREATE INDEX IF NOT EXISTS idx_biometria_usuarios_biometria_id ON biometria_usuarios(biometria_id);
CREATE INDEX IF NOT EXISTS idx_biometria_eventos_biometria_id ON biometria_eventos(biometria_id);
CREATE INDEX IF NOT EXISTS idx_biometria_eventos_status ON biometria_eventos(status);
CREATE INDEX IF NOT EXISTS idx_biometria_eventos_created_at ON biometria_eventos(created_at);

-- RLS (Row Level Security)
ALTER TABLE biometria_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometria_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometria_eventos ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'biometria_config' AND policyname = 'Permitir leitura biometria_config') THEN
    CREATE POLICY "Permitir leitura biometria_config" ON biometria_config FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'biometria_usuarios' AND policyname = 'Permitir leitura biometria_usuarios') THEN
    CREATE POLICY "Permitir leitura biometria_usuarios" ON biometria_usuarios FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'biometria_eventos' AND policyname = 'Permitir leitura biometria_eventos') THEN
    CREATE POLICY "Permitir leitura biometria_eventos" ON biometria_eventos FOR SELECT USING (true);
  END IF;
END $$;

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_biometria_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_biometria_config_updated_at') THEN
    CREATE TRIGGER trigger_biometria_config_updated_at
      BEFORE UPDATE ON biometria_config
      FOR EACH ROW EXECUTE FUNCTION update_biometria_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_biometria_usuarios_updated_at') THEN
    CREATE TRIGGER trigger_biometria_usuarios_updated_at
      BEFORE UPDATE ON biometria_usuarios
      FOR EACH ROW EXECUTE FUNCTION update_biometria_updated_at();
  END IF;
END $$;
