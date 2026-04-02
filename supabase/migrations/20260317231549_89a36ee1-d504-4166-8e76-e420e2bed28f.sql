
ALTER TABLE public.produtos 
  ADD COLUMN IF NOT EXISTS estoque_minimo numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estoque_maximo numeric DEFAULT 0;
