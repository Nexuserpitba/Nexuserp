
-- Tabela para salvar preferências de colunas do usuário
CREATE TABLE IF NOT EXISTS public.user_column_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page_key TEXT NOT NULL,
  columns JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, page_key)
);

ALTER TABLE public.user_column_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: usuários só podem ver/atualizar suas próprias preferências
CREATE POLICY "Users can view own column preferences"
  ON public.user_column_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own column preferences"
  ON public.user_column_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own column preferences"
  ON public.user_column_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);
