-- Add missing IBPT fields to match API response (ProdutoDTO)
-- Fields: importado, uf, ex, tipo, vigencia_inicio, vigencia_fim, chave, fonte

ALTER TABLE public.ibpt_dados
  ADD COLUMN IF NOT EXISTS importado numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS uf text DEFAULT '',
  ADD COLUMN IF NOT EXISTS ex text DEFAULT '',
  ADD COLUMN IF NOT EXISTS tipo text DEFAULT '',
  ADD COLUMN IF NOT EXISTS vigencia_inicio text DEFAULT '',
  ADD COLUMN IF NOT EXISTS vigencia_fim text DEFAULT '',
  ADD COLUMN IF NOT EXISTS chave text DEFAULT '',
  ADD COLUMN IF NOT EXISTS fonte text DEFAULT '';

-- Add index for UF filtering
CREATE INDEX IF NOT EXISTS idx_ibpt_dados_uf ON public.ibpt_dados(uf);
