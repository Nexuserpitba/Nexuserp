-- IBPT Config table for storing API tokens
CREATE TABLE IF NOT EXISTS ibpt_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_ibpt TEXT,
  uf TEXT DEFAULT 'SP',
  cnpj TEXT,
  ultima_sinc TIMESTAMPTZ,
  total_registros INTEGER DEFAULT 0,
  status TEXT DEFAULT 'nao_configurado',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ibpt_config ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ibpt_config') THEN
    CREATE POLICY "Permitir leitura ibpt_config" ON ibpt_config FOR SELECT USING (true);
    CREATE POLICY "Permitir admin ibpt_config" ON ibpt_config FOR ALL USING (true);
  END IF;
END $$;

-- Seed a default row
INSERT INTO ibpt_config (id, status) VALUES ('00000000-0000-0000-0000-000000000001', 'nao_configurado')
ON CONFLICT (id) DO NOTHING;
