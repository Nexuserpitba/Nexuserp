
-- ============================================
-- 1. ENUM para roles do sistema
-- ============================================
CREATE TYPE public.app_role AS ENUM (
  'administrador', 'gerente', 'operador', 'vendedor', 
  'supervisor', 'financeiro', 'estoquista', 'tecnico'
);

-- ============================================
-- 2. PROFILES (linked to auth.users)
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  login TEXT NOT NULL DEFAULT '',
  departamento TEXT DEFAULT '',
  limite_desconto NUMERIC(5,2) DEFAULT 5,
  comissao NUMERIC(5,2) DEFAULT 0,
  escala TEXT DEFAULT '',
  observacoes TEXT DEFAULT '',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- ============================================
-- 3. USER_ROLES (separate table per security best practices)
-- ============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles without recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can manage all roles
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'));

-- ============================================
-- 4. TRIGGER: auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, login)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'login', NEW.email)
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'operador')
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 5. EMPRESAS
-- ============================================
CREATE TABLE public.empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT DEFAULT '',
  cnpj TEXT DEFAULT '',
  inscricao_estadual TEXT DEFAULT '',
  inscricao_municipal TEXT DEFAULT '',
  regime TEXT DEFAULT 'Simples Nacional',
  uf TEXT DEFAULT '',
  cidade TEXT DEFAULT '',
  codigo_pais TEXT DEFAULT '1058',
  codigo_cidade TEXT DEFAULT '',
  endereco TEXT DEFAULT '',
  bairro TEXT DEFAULT '',
  cep TEXT DEFAULT '',
  telefone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Ativa',
  observacao TEXT DEFAULT '',
  selecionada BOOLEAN DEFAULT false,
  certificado JSONB,
  pix_psp JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read empresas"
  ON public.empresas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage empresas"
  ON public.empresas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'));

-- ============================================
-- 6. CATEGORIAS
-- ============================================
CREATE TABLE public.categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL DEFAULT '',
  nome TEXT NOT NULL,
  tipo TEXT DEFAULT 'Produto',
  categoria_pai TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Ativo',
  descricao TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read categorias"
  ON public.categorias FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage categorias"
  ON public.categorias FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'));

-- ============================================
-- 7. PESSOAS
-- ============================================
CREATE TABLE public.pessoas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cpf_cnpj TEXT DEFAULT '',
  tipo TEXT DEFAULT 'Cliente',
  status TEXT NOT NULL DEFAULT 'Ativo',
  rg TEXT DEFAULT '',
  data_nascimento TEXT DEFAULT '',
  email TEXT DEFAULT '',
  sexo TEXT DEFAULT '',
  estado_civil TEXT DEFAULT '',
  profissao TEXT DEFAULT '',
  cep TEXT DEFAULT '',
  logradouro TEXT DEFAULT '',
  numero TEXT DEFAULT '',
  complemento TEXT DEFAULT '',
  bairro TEXT DEFAULT '',
  cidade TEXT DEFAULT '',
  uf TEXT DEFAULT '',
  telefone TEXT DEFAULT '',
  celular TEXT DEFAULT '',
  limite_credito NUMERIC(12,2) DEFAULT 0,
  limite_cheque NUMERIC(12,2) DEFAULT 0,
  limite_convenio NUMERIC(12,2) DEFAULT 0,
  limite_prazo NUMERIC(12,2) DEFAULT 0,
  debitos NUMERIC(12,2) DEFAULT 0,
  grupo_desconto TEXT DEFAULT '',
  precos_especiais TEXT DEFAULT '',
  referencias JSONB DEFAULT '[]',
  dados_bancarios JSONB DEFAULT '{}',
  razao_social TEXT DEFAULT '',
  nome_fantasia TEXT DEFAULT '',
  inscricao_estadual TEXT DEFAULT '',
  observacao TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pessoas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read pessoas"
  ON public.pessoas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage pessoas"
  ON public.pessoas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'));

-- ============================================
-- 8. PRODUTOS
-- ============================================
CREATE TABLE public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL DEFAULT '',
  codigo_auxiliar TEXT DEFAULT '',
  codigo_referencia TEXT DEFAULT '',
  barras TEXT DEFAULT '',
  barras_multiplos JSONB DEFAULT '[]',
  descricao TEXT NOT NULL,
  -- Classificação
  ncm TEXT DEFAULT '',
  cest TEXT DEFAULT '',
  grupo TEXT DEFAULT '',
  subgrupo TEXT DEFAULT '',
  departamento TEXT DEFAULT '',
  familia TEXT DEFAULT '',
  subfamilia TEXT DEFAULT '',
  categoria TEXT DEFAULT '',
  -- Tributação
  origem_mercadoria TEXT DEFAULT '0',
  uf_tributacao TEXT DEFAULT '',
  cst_icms TEXT DEFAULT '',
  cst_pis TEXT DEFAULT '',
  cst_cofins TEXT DEFAULT '',
  aliq_icms NUMERIC(5,2) DEFAULT 0,
  aliq_pis NUMERIC(5,2) DEFAULT 0,
  aliq_cofins NUMERIC(5,2) DEFAULT 0,
  aliq_ipi NUMERIC(5,2) DEFAULT 0,
  cfop_interno TEXT DEFAULT '',
  cfop_externo TEXT DEFAULT '',
  -- Custos e preços
  custo_aquisicao NUMERIC(12,2) DEFAULT 0,
  custo_reposicao NUMERIC(12,2) DEFAULT 0,
  mva NUMERIC(5,2) DEFAULT 0,
  venda NUMERIC(12,2) DEFAULT 0,
  margem_bruta NUMERIC(5,2) DEFAULT 0,
  margem_liquida NUMERIC(5,2) DEFAULT 0,
  sugestao_venda NUMERIC(12,2) DEFAULT 0,
  estoque NUMERIC(12,3) DEFAULT 0,
  unidade TEXT DEFAULT 'UN',
  -- Extra
  desdobramentos JSONB DEFAULT '[]',
  grupo_precos JSONB DEFAULT '[]',
  etiqueta_descricao TEXT DEFAULT '',
  rateio NUMERIC(5,2) DEFAULT 0,
  norma_procom TEXT DEFAULT '',
  auditoria_corrigida BOOLEAN DEFAULT false,
  auditoria_data TIMESTAMPTZ,
  produto_balanca BOOLEAN DEFAULT false,
  unidade_balanca TEXT DEFAULT '',
  composicao JSONB DEFAULT '[]',
  fornecedor TEXT DEFAULT '',
  observacao TEXT DEFAULT '',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read produtos"
  ON public.produtos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage produtos"
  ON public.produtos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'));

-- ============================================
-- 9. CONTAS BANCÁRIAS
-- ============================================
CREATE TABLE public.contas_bancarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  banco_codigo TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'corrente',
  agencia TEXT DEFAULT '',
  digito_agencia TEXT DEFAULT '',
  conta TEXT DEFAULT '',
  digito_conta TEXT DEFAULT '',
  titular TEXT DEFAULT '',
  cpf_cnpj_titular TEXT DEFAULT '',
  convenio TEXT DEFAULT '',
  carteira TEXT DEFAULT '17',
  apelido TEXT DEFAULT '',
  chave_pix TEXT DEFAULT '',
  tipo_chave_pix TEXT DEFAULT '',
  ativa BOOLEAN NOT NULL DEFAULT true,
  padrao BOOLEAN DEFAULT false,
  observacoes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contas_bancarias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read contas_bancarias"
  ON public.contas_bancarias FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage contas_bancarias"
  ON public.contas_bancarias FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'));

-- ============================================
-- 10. TRANSPORTADORAS
-- ============================================
CREATE TABLE public.transportadoras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_pessoa TEXT DEFAULT 'PJ',
  cpf_cnpj TEXT DEFAULT '',
  insc_estadual TEXT DEFAULT '',
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT DEFAULT '',
  rntrc TEXT DEFAULT '',
  tipo_transportador TEXT DEFAULT '',
  situacao TEXT NOT NULL DEFAULT 'Ativa',
  cep TEXT DEFAULT '',
  logradouro TEXT DEFAULT '',
  numero TEXT DEFAULT '',
  complemento TEXT DEFAULT '',
  bairro TEXT DEFAULT '',
  codigo_municipio TEXT DEFAULT '',
  municipio TEXT DEFAULT '',
  uf TEXT DEFAULT '',
  pais TEXT DEFAULT 'Brasil',
  codigo_pais TEXT DEFAULT '1058',
  telefone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  responsavel TEXT DEFAULT '',
  modal_frete TEXT DEFAULT '',
  taf TEXT DEFAULT '',
  reg_trib TEXT DEFAULT '',
  veiculos JSONB DEFAULT '[]',
  observacoes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transportadoras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read transportadoras"
  ON public.transportadoras FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage transportadoras"
  ON public.transportadoras FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'));

-- ============================================
-- 11. CIDADES
-- ============================================
CREATE TABLE public.cidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  uf TEXT NOT NULL DEFAULT '',
  codigo_ibge TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read cidades"
  ON public.cidades FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage cidades"
  ON public.cidades FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'));
