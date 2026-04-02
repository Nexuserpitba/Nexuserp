
-- Table for XML fiscal documents
CREATE TABLE public.xml_fiscais (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  chave_acesso text NOT NULL UNIQUE,
  numero text NOT NULL DEFAULT '',
  serie text NOT NULL DEFAULT '',
  tipo_documento text NOT NULL DEFAULT 'NF-e',
  status_sefaz text NOT NULL DEFAULT 'autorizado',
  status_processamento text NOT NULL DEFAULT 'pendente',
  data_emissao timestamp with time zone,
  data_importacao timestamp with time zone,
  
  -- Emitente
  emitente_cnpj text DEFAULT '',
  emitente_razao text DEFAULT '',
  emitente_fantasia text DEFAULT '',
  emitente_uf text DEFAULT '',
  
  -- Destinatário
  destinatario_cnpj text DEFAULT '',
  destinatario_razao text DEFAULT '',
  
  -- Totais
  valor_total numeric DEFAULT 0,
  valor_produtos numeric DEFAULT 0,
  valor_icms numeric DEFAULT 0,
  valor_ipi numeric DEFAULT 0,
  valor_pis numeric DEFAULT 0,
  valor_cofins numeric DEFAULT 0,
  valor_frete numeric DEFAULT 0,
  valor_desconto numeric DEFAULT 0,
  
  -- XML
  xml_bruto text,
  dados_processados jsonb DEFAULT '{}',
  
  -- Controle
  manifestacao text DEFAULT '',
  observacoes text DEFAULT '',
  erro_detalhe text DEFAULT '',
  tentativas_importacao integer DEFAULT 0,
  
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table for items of each XML
CREATE TABLE public.xml_fiscal_itens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  xml_fiscal_id uuid REFERENCES public.xml_fiscais(id) ON DELETE CASCADE NOT NULL,
  numero_item integer DEFAULT 0,
  codigo_produto text DEFAULT '',
  descricao text NOT NULL DEFAULT '',
  ncm text DEFAULT '',
  cest text DEFAULT '',
  cfop text DEFAULT '',
  unidade text DEFAULT 'UN',
  quantidade numeric DEFAULT 0,
  valor_unitario numeric DEFAULT 0,
  valor_total numeric DEFAULT 0,
  valor_desconto numeric DEFAULT 0,
  
  -- Impostos
  cst_icms text DEFAULT '',
  aliq_icms numeric DEFAULT 0,
  valor_icms numeric DEFAULT 0,
  cst_ipi text DEFAULT '',
  aliq_ipi numeric DEFAULT 0,
  valor_ipi numeric DEFAULT 0,
  cst_pis text DEFAULT '',
  aliq_pis numeric DEFAULT 0,
  valor_pis numeric DEFAULT 0,
  cst_cofins text DEFAULT '',
  aliq_cofins numeric DEFAULT 0,
  valor_cofins numeric DEFAULT 0,
  
  -- Mapeamento ERP
  produto_erp_id uuid REFERENCES public.produtos(id) ON DELETE SET NULL,
  status_mapeamento text DEFAULT 'pendente',
  divergencias jsonb DEFAULT '[]',
  
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table for XML processing logs
CREATE TABLE public.xml_fiscal_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  xml_fiscal_id uuid REFERENCES public.xml_fiscais(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'info',
  acao text NOT NULL DEFAULT '',
  detalhe text DEFAULT '',
  usuario_id text DEFAULT '',
  usuario_nome text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table for import rules per supplier
CREATE TABLE public.xml_fiscal_regras (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fornecedor_cnpj text NOT NULL DEFAULT '',
  fornecedor_nome text DEFAULT '',
  cfop_padrao text DEFAULT '',
  centro_custo text DEFAULT '',
  auto_importar boolean DEFAULT false,
  criar_produto_auto boolean DEFAULT false,
  ativo boolean DEFAULT true,
  observacoes text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS policies
ALTER TABLE public.xml_fiscais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xml_fiscal_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xml_fiscal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xml_fiscal_regras ENABLE ROW LEVEL SECURITY;

-- xml_fiscais policies
CREATE POLICY "Staff can read xml_fiscais" ON public.xml_fiscais FOR SELECT TO authenticated
USING (has_any_role(auth.uid(), ARRAY['administrador','gerente','supervisor','financeiro','estoquista']::app_role[]));

CREATE POLICY "Staff can manage xml_fiscais" ON public.xml_fiscais FOR ALL TO authenticated
USING (has_any_role(auth.uid(), ARRAY['administrador','gerente','supervisor','estoquista']::app_role[]));

-- xml_fiscal_itens policies
CREATE POLICY "Staff can read xml_fiscal_itens" ON public.xml_fiscal_itens FOR SELECT TO authenticated
USING (has_any_role(auth.uid(), ARRAY['administrador','gerente','supervisor','financeiro','estoquista']::app_role[]));

CREATE POLICY "Staff can manage xml_fiscal_itens" ON public.xml_fiscal_itens FOR ALL TO authenticated
USING (has_any_role(auth.uid(), ARRAY['administrador','gerente','supervisor','estoquista']::app_role[]));

-- xml_fiscal_logs policies
CREATE POLICY "Staff can read xml_fiscal_logs" ON public.xml_fiscal_logs FOR SELECT TO authenticated
USING (has_any_role(auth.uid(), ARRAY['administrador','gerente','supervisor','financeiro']::app_role[]));

CREATE POLICY "Authenticated can insert xml_fiscal_logs" ON public.xml_fiscal_logs FOR INSERT TO authenticated
WITH CHECK (true);

-- xml_fiscal_regras policies
CREATE POLICY "Admin can manage xml_fiscal_regras" ON public.xml_fiscal_regras FOR ALL TO authenticated
USING (has_any_role(auth.uid(), ARRAY['administrador','gerente']::app_role[]));

CREATE POLICY "Staff can read xml_fiscal_regras" ON public.xml_fiscal_regras FOR SELECT TO authenticated
USING (has_any_role(auth.uid(), ARRAY['administrador','gerente','supervisor','estoquista']::app_role[]));
