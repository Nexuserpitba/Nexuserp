export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          detail: string | null
          id: string
          user_id: string
          user_name: string
          user_role: string
          terminal_id: string | null
          ip_address: string | null
          user_agent: string | null
          detalhes: Json | null
          autorizado_por: string | null
          metodo_autenticacao: string | null
        }
        Insert: {
          action: string
          created_at?: string
          detail?: string | null
          id?: string
          user_id?: string
          user_name?: string
          user_role?: string
          terminal_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          detalhes?: Json | null
          autorizado_por?: string | null
          metodo_autenticacao?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          detail?: string | null
          id?: string
          user_id?: string
          user_name?: string
          user_role?: string
          terminal_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          detalhes?: Json | null
          autorizado_por?: string | null
          metodo_autenticacao?: string | null
        }
        Relationships: []
      }
      permissoes: {
        Row: {
          id: string
          codigo: string
          nome: string
          descricao: string | null
          tipo: string
          step_up_obrigatorio: boolean
          requer_gerente: boolean
          created_at: string
        }
        Insert: {
          id?: string
          codigo: string
          nome: string
          descricao?: string | null
          tipo?: string
          step_up_obrigatorio?: boolean
          requer_gerente?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          codigo?: string
          nome?: string
          descricao?: string | null
          tipo?: string
          step_up_obrigatorio?: boolean
          requer_gerente?: boolean
          created_at?: string
        }
        Relationships: []
      }
      perfil_permissoes: {
        Row: {
          id: string
          perfil: string
          permissao_id: string
          created_at: string
        }
        Insert: {
          id?: string
          perfil: string
          permissao_id: string
          created_at?: string
        }
        Update: {
          id?: string
          perfil?: string
          permissao_id?: string
          created_at?: string
        }
        Relationships: []
      }
      sessoes_terminal: {
        Row: {
          id: string
          usuario_id: string
          terminal_id: string
          terminal_nome: string | null
          ip_address: string | null
          user_agent: string | null
          ativa: boolean
          jwt_token_hash: string | null
          last_activity: string
          expira_em: string
          created_at: string
        }
        Insert: {
          id?: string
          usuario_id: string
          terminal_id: string
          terminal_nome?: string | null
          ip_address?: string | null
          user_agent?: string | null
          ativa?: boolean
          jwt_token_hash?: string | null
          last_activity?: string
          expira_em: string
          created_at?: string
        }
        Update: {
          id?: string
          usuario_id?: string
          terminal_id?: string
          terminal_nome?: string | null
          ip_address?: string | null
          user_agent?: string | null
          ativa?: boolean
          jwt_token_hash?: string | null
          last_activity?: string
          expira_em?: string
          created_at?: string
        }
        Relationships: []
      }
      autorizacoes: {
        Row: {
          id: string
          acao: string
          operador_id: string
          gerente_id: string | null
          status: string
          metodo: string | null
          motivo: string | null
          detalhes: Json | null
          expira_em: string
          usado: boolean
          ip_address: string | null
          terminal_id: string | null
          created_at: string
          resolvido_em: string | null
        }
        Insert: {
          id?: string
          acao: string
          operador_id: string
          gerente_id?: string | null
          status?: string
          metodo?: string | null
          motivo?: string | null
          detalhes?: Json | null
          expira_em: string
          usado?: boolean
          ip_address?: string | null
          terminal_id?: string | null
          created_at?: string
          resolvido_em?: string | null
        }
        Update: {
          id?: string
          acao?: string
          operador_id?: string
          gerente_id?: string | null
          status?: string
          metodo?: string | null
          motivo?: string | null
          detalhes?: Json | null
          expira_em?: string
          usado?: boolean
          ip_address?: string | null
          terminal_id?: string | null
          resolvido_em?: string | null
        }
        Relationships: []
      }
      step_up_eventos: {
        Row: {
          id: string
          usuario_id: string
          acao_requerida: string
          metodo: string
          status: string
          token: string | null
          expira_em: string
          ip_address: string | null
          terminal_id: string | null
          created_at: string
          resolvido_em: string | null
        }
        Insert: {
          id?: string
          usuario_id: string
          acao_requerida: string
          metodo: string
          status?: string
          token?: string | null
          expira_em: string
          ip_address?: string | null
          terminal_id?: string | null
          created_at?: string
          resolvido_em?: string | null
        }
        Update: {
          id?: string
          usuario_id?: string
          acao_requerida?: string
          metodo?: string
          status?: string
          token?: string | null
          expira_em?: string
          ip_address?: string | null
          terminal_id?: string | null
          resolvido_em?: string | null
        }
        Relationships: []
      }
      categorias: {
        Row: {
          categoria_pai: string | null
          codigo: string
          created_at: string
          descricao: string | null
          id: string
          nome: string
          status: string
          tipo: string | null
        }
        Insert: {
          categoria_pai?: string | null
          codigo?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          status?: string
          tipo?: string | null
        }
        Update: {
          categoria_pai?: string | null
          codigo?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          status?: string
          tipo?: string | null
        }
        Relationships: []
      }
      cidades: {
        Row: {
          codigo_ibge: string | null
          created_at: string
          id: string
          nome: string
          uf: string
        }
        Insert: {
          codigo_ibge?: string | null
          created_at?: string
          id?: string
          nome: string
          uf?: string
        }
        Update: {
          codigo_ibge?: string | null
          created_at?: string
          id?: string
          nome?: string
          uf?: string
        }
        Relationships: []
      }
      contas_bancarias: {
        Row: {
          agencia: string | null
          apelido: string | null
          ativa: boolean
          banco_codigo: string
          carteira: string | null
          chave_pix: string | null
          conta: string | null
          convenio: string | null
          cpf_cnpj_titular: string | null
          created_at: string
          digito_agencia: string | null
          digito_conta: string | null
          id: string
          observacoes: string | null
          padrao: boolean | null
          tipo: string
          tipo_chave_pix: string | null
          titular: string | null
          updated_at: string
        }
        Insert: {
          agencia?: string | null
          apelido?: string | null
          ativa?: boolean
          banco_codigo?: string
          carteira?: string | null
          chave_pix?: string | null
          conta?: string | null
          convenio?: string | null
          cpf_cnpj_titular?: string | null
          created_at?: string
          digito_agencia?: string | null
          digito_conta?: string | null
          id?: string
          observacoes?: string | null
          padrao?: boolean | null
          tipo?: string
          tipo_chave_pix?: string | null
          titular?: string | null
          updated_at?: string
        }
        Update: {
          agencia?: string | null
          apelido?: string | null
          ativa?: boolean
          banco_codigo?: string
          carteira?: string | null
          chave_pix?: string | null
          conta?: string | null
          convenio?: string | null
          cpf_cnpj_titular?: string | null
          created_at?: string
          digito_agencia?: string | null
          digito_conta?: string | null
          id?: string
          observacoes?: string | null
          padrao?: boolean | null
          tipo?: string
          tipo_chave_pix?: string | null
          titular?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_send_history: {
        Row: {
          assunto: string
          created_at: string
          destinatario: string
          erro: string | null
          id: string
          status: string
          tipo: string
        }
        Insert: {
          assunto?: string
          created_at?: string
          destinatario: string
          erro?: string | null
          id?: string
          status?: string
          tipo?: string
        }
        Update: {
          assunto?: string
          created_at?: string
          destinatario?: string
          erro?: string | null
          id?: string
          status?: string
          tipo?: string
        }
        Relationships: []
      }
      empresas: {
        Row: {
          bairro: string | null
          cep: string | null
          certificado: Json | null
          cidade: string | null
          cnpj: string | null
          codigo_cidade: string | null
          codigo_pais: string | null
          created_at: string
          email: string | null
          endereco: string | null
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          nome_fantasia: string | null
          observacao: string | null
          pix_psp: Json | null
          razao_social: string
          regime: string | null
          selecionada: boolean | null
          smtp_config: Json | null
          status: string
          telefone: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          certificado?: Json | null
          cidade?: string | null
          cnpj?: string | null
          codigo_cidade?: string | null
          codigo_pais?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          nome_fantasia?: string | null
          observacao?: string | null
          pix_psp?: Json | null
          razao_social: string
          regime?: string | null
          selecionada?: boolean | null
          smtp_config?: Json | null
          status?: string
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          certificado?: Json | null
          cidade?: string | null
          cnpj?: string | null
          codigo_cidade?: string | null
          codigo_pais?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          nome_fantasia?: string | null
          observacao?: string | null
          pix_psp?: Json | null
          razao_social?: string
          regime?: string | null
          selecionada?: boolean | null
          smtp_config?: Json | null
          status?: string
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ibpt_dados: {
        Row: {
          created_at: string
          descricao: string
          estadual: number
          federal: number
          importado: number
          id: string
          municipal: number
          ncm: string
          uf: string
          ex: string
          tipo: string
          vigencia_inicio: string
          vigencia_fim: string
          chave: string
          versao: string
          fonte: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string
          estadual?: number
          federal?: number
          importado?: number
          id?: string
          municipal?: number
          ncm: string
          uf?: string
          ex?: string
          tipo?: string
          vigencia_inicio?: string
          vigencia_fim?: string
          chave?: string
          versao?: string
          fonte?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string
          estadual?: number
          federal?: number
          importado?: number
          id?: string
          municipal?: number
          ncm?: string
          uf?: string
          ex?: string
          tipo?: string
          vigencia_inicio?: string
          vigencia_fim?: string
          chave?: string
          versao?: string
          fonte?: string
          updated_at?: string
        }
        Relationships: []
      }
      liberacoes_gerenciais: {
        Row: {
          cliente: string
          cliente_doc: string | null
          created_at: string
          excedente: number | null
          id: string
          limite_disponivel: number | null
          motivo: string | null
          operador: string
          valor_autorizado: number | null
        }
        Insert: {
          cliente?: string
          cliente_doc?: string | null
          created_at?: string
          excedente?: number | null
          id?: string
          limite_disponivel?: number | null
          motivo?: string | null
          operador?: string
          valor_autorizado?: number | null
        }
        Update: {
          cliente?: string
          cliente_doc?: string | null
          created_at?: string
          excedente?: number | null
          id?: string
          limite_disponivel?: number | null
          motivo?: string | null
          operador?: string
          valor_autorizado?: number | null
        }
        Relationships: []
      }
      ncm_web: {
        Row: {
          ano_ato: string | null
          codigo: string
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          descricao: string
          id: string
          numero_ato: string | null
          tipo_ato: string | null
          updated_at: string
        }
        Insert: {
          ano_ato?: string | null
          codigo: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string
          id?: string
          numero_ato?: string | null
          tipo_ato?: string | null
          updated_at?: string
        }
        Update: {
          ano_ato?: string | null
          codigo?: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string
          id?: string
          numero_ato?: string | null
          tipo_ato?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pessoas: {
        Row: {
          bairro: string | null
          celular: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          cpf_cnpj: string | null
          created_at: string
          dados_bancarios: Json | null
          data_nascimento: string | null
          debitos: number | null
          email: string | null
          estado_civil: string | null
          grupo_desconto: string | null
          id: string
          inscricao_estadual: string | null
          limite_cheque: number | null
          limite_convenio: number | null
          limite_credito: number | null
          limite_prazo: number | null
          logradouro: string | null
          nome: string
          nome_fantasia: string | null
          numero: string | null
          observacao: string | null
          precos_especiais: string | null
          profissao: string | null
          razao_social: string | null
          referencias: Json | null
          rg: string | null
          sexo: string | null
          status: string
          telefone: string | null
          tipo: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          bairro?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          dados_bancarios?: Json | null
          data_nascimento?: string | null
          debitos?: number | null
          email?: string | null
          estado_civil?: string | null
          grupo_desconto?: string | null
          id?: string
          inscricao_estadual?: string | null
          limite_cheque?: number | null
          limite_convenio?: number | null
          limite_credito?: number | null
          limite_prazo?: number | null
          logradouro?: string | null
          nome: string
          nome_fantasia?: string | null
          numero?: string | null
          observacao?: string | null
          precos_especiais?: string | null
          profissao?: string | null
          razao_social?: string | null
          referencias?: Json | null
          rg?: string | null
          sexo?: string | null
          status?: string
          telefone?: string | null
          tipo?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          bairro?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          dados_bancarios?: Json | null
          data_nascimento?: string | null
          debitos?: number | null
          email?: string | null
          estado_civil?: string | null
          grupo_desconto?: string | null
          id?: string
          inscricao_estadual?: string | null
          limite_cheque?: number | null
          limite_convenio?: number | null
          limite_credito?: number | null
          limite_prazo?: number | null
          logradouro?: string | null
          nome?: string
          nome_fantasia?: string | null
          numero?: string | null
          observacao?: string | null
          precos_especiais?: string | null
          profissao?: string | null
          razao_social?: string | null
          referencias?: Json | null
          rg?: string | null
          sexo?: string | null
          status?: string
          telefone?: string | null
          tipo?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      produtos: {
        Row: {
          aliq_cofins: number | null
          aliq_icms: number | null
          aliq_ipi: number | null
          aliq_pis: number | null
          ativo: boolean
          auditoria_corrigida: boolean | null
          auditoria_data: string | null
          barras: string | null
          barras_multiplos: Json | null
          categoria: string | null
          cest: string | null
          cfop_externo: string | null
          cfop_interno: string | null
          codigo: string
          codigo_auxiliar: string | null
          codigo_referencia: string | null
          composicao: Json | null
          created_at: string
          cst_cofins: string | null
          cst_icms: string | null
          cst_pis: string | null
          custo_aquisicao: number | null
          custo_reposicao: number | null
          departamento: string | null
          descricao: string
          desdobramentos: Json | null
          estoque: number | null
          estoque_maximo: number | null
          estoque_minimo: number | null
          etiqueta_descricao: string | null
          familia: string | null
          fornecedor: string | null
          grupo: string | null
          grupo_precos: Json | null
          id: string
          margem_bruta: number | null
          margem_liquida: number | null
          mva: number | null
          ncm: string | null
          norma_procom: string | null
          observacao: string | null
          origem_mercadoria: string | null
          produto_balanca: boolean | null
          rateio: number | null
          subfamilia: string | null
          subgrupo: string | null
          sugestao_venda: number | null
          uf_tributacao: string | null
          unidade: string | null
          unidade_balanca: string | null
          updated_at: string
          venda: number | null
        }
        Insert: {
          aliq_cofins?: number | null
          aliq_icms?: number | null
          aliq_ipi?: number | null
          aliq_pis?: number | null
          ativo?: boolean
          auditoria_corrigida?: boolean | null
          auditoria_data?: string | null
          barras?: string | null
          barras_multiplos?: Json | null
          categoria?: string | null
          cest?: string | null
          cfop_externo?: string | null
          cfop_interno?: string | null
          codigo?: string
          codigo_auxiliar?: string | null
          codigo_referencia?: string | null
          composicao?: Json | null
          created_at?: string
          cst_cofins?: string | null
          cst_icms?: string | null
          cst_pis?: string | null
          custo_aquisicao?: number | null
          custo_reposicao?: number | null
          departamento?: string | null
          descricao: string
          desdobramentos?: Json | null
          estoque?: number | null
          estoque_maximo?: number | null
          estoque_minimo?: number | null
          etiqueta_descricao?: string | null
          familia?: string | null
          fornecedor?: string | null
          grupo?: string | null
          grupo_precos?: Json | null
          id?: string
          margem_bruta?: number | null
          margem_liquida?: number | null
          mva?: number | null
          ncm?: string | null
          norma_procom?: string | null
          observacao?: string | null
          origem_mercadoria?: string | null
          produto_balanca?: boolean | null
          rateio?: number | null
          subfamilia?: string | null
          subgrupo?: string | null
          sugestao_venda?: number | null
          uf_tributacao?: string | null
          unidade?: string | null
          unidade_balanca?: string | null
          updated_at?: string
          venda?: number | null
        }
        Update: {
          aliq_cofins?: number | null
          aliq_icms?: number | null
          aliq_ipi?: number | null
          aliq_pis?: number | null
          ativo?: boolean
          auditoria_corrigida?: boolean | null
          auditoria_data?: string | null
          barras?: string | null
          barras_multiplos?: Json | null
          categoria?: string | null
          cest?: string | null
          cfop_externo?: string | null
          cfop_interno?: string | null
          codigo?: string
          codigo_auxiliar?: string | null
          codigo_referencia?: string | null
          composicao?: Json | null
          created_at?: string
          cst_cofins?: string | null
          cst_icms?: string | null
          cst_pis?: string | null
          custo_aquisicao?: number | null
          custo_reposicao?: number | null
          departamento?: string | null
          descricao?: string
          desdobramentos?: Json | null
          estoque?: number | null
          estoque_maximo?: number | null
          estoque_minimo?: number | null
          etiqueta_descricao?: string | null
          familia?: string | null
          fornecedor?: string | null
          grupo?: string | null
          grupo_precos?: Json | null
          id?: string
          margem_bruta?: number | null
          margem_liquida?: number | null
          mva?: number | null
          ncm?: string | null
          norma_procom?: string | null
          observacao?: string | null
          origem_mercadoria?: string | null
          produto_balanca?: boolean | null
          rateio?: number | null
          subfamilia?: string | null
          subgrupo?: string | null
          sugestao_venda?: number | null
          uf_tributacao?: string | null
          unidade?: string | null
          unidade_balanca?: string | null
          updated_at?: string
          venda?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ativo: boolean
          comissao: number | null
          created_at: string
          departamento: string | null
          escala: string | null
          id: string
          limite_desconto: number | null
          login: string
          nome: string
          observacoes: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          comissao?: number | null
          created_at?: string
          departamento?: string | null
          escala?: string | null
          id: string
          limite_desconto?: number | null
          login?: string
          nome?: string
          observacoes?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          comissao?: number | null
          created_at?: string
          departamento?: string | null
          escala?: string | null
          id?: string
          limite_desconto?: number | null
          login?: string
          nome?: string
          observacoes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      transportadoras: {
        Row: {
          bairro: string | null
          cep: string | null
          codigo_municipio: string | null
          codigo_pais: string | null
          complemento: string | null
          cpf_cnpj: string | null
          created_at: string
          email: string | null
          id: string
          insc_estadual: string | null
          logradouro: string | null
          modal_frete: string | null
          municipio: string | null
          nome_fantasia: string | null
          numero: string | null
          observacoes: string | null
          pais: string | null
          razao_social: string
          reg_trib: string | null
          responsavel: string | null
          rntrc: string | null
          situacao: string
          taf: string | null
          telefone: string | null
          tipo_pessoa: string | null
          tipo_transportador: string | null
          uf: string | null
          updated_at: string
          veiculos: Json | null
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          codigo_municipio?: string | null
          codigo_pais?: string | null
          complemento?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          insc_estadual?: string | null
          logradouro?: string | null
          modal_frete?: string | null
          municipio?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          observacoes?: string | null
          pais?: string | null
          razao_social: string
          reg_trib?: string | null
          responsavel?: string | null
          rntrc?: string | null
          situacao?: string
          taf?: string | null
          telefone?: string | null
          tipo_pessoa?: string | null
          tipo_transportador?: string | null
          uf?: string | null
          updated_at?: string
          veiculos?: Json | null
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          codigo_municipio?: string | null
          codigo_pais?: string | null
          complemento?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          insc_estadual?: string | null
          logradouro?: string | null
          modal_frete?: string | null
          municipio?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          observacoes?: string | null
          pais?: string | null
          razao_social?: string
          reg_trib?: string | null
          responsavel?: string | null
          rntrc?: string | null
          situacao?: string
          taf?: string | null
          telefone?: string | null
          tipo_pessoa?: string | null
          tipo_transportador?: string | null
          uf?: string | null
          updated_at?: string
          veiculos?: Json | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_column_preferences: {
        Row: {
          id: string
          user_id: string
          page_key: string
          columns: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          page_key: string
          columns?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          page_key?: string
          columns?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_column_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_report_config: {
        Row: {
          ativo: boolean
          created_at: string
          destinatarios: string[]
          id: string
          relatorios_ativos: string[]
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          destinatarios?: string[]
          id?: string
          relatorios_ativos?: string[]
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          destinatarios?: string[]
          id?: string
          relatorios_ativos?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      xml_fiscais: {
        Row: {
          chave_acesso: string
          created_at: string
          dados_processados: Json | null
          data_emissao: string | null
          data_importacao: string | null
          destinatario_cnpj: string | null
          destinatario_razao: string | null
          emitente_cnpj: string | null
          emitente_fantasia: string | null
          emitente_razao: string | null
          emitente_uf: string | null
          empresa_id: string | null
          erro_detalhe: string | null
          id: string
          manifestacao: string | null
          numero: string
          observacoes: string | null
          serie: string
          status_processamento: string
          status_sefaz: string
          tentativas_importacao: number | null
          tipo_documento: string
          updated_at: string
          valor_cofins: number | null
          valor_desconto: number | null
          valor_frete: number | null
          valor_icms: number | null
          valor_ipi: number | null
          valor_pis: number | null
          valor_produtos: number | null
          valor_total: number | null
          xml_bruto: string | null
        }
        Insert: {
          chave_acesso: string
          created_at?: string
          dados_processados?: Json | null
          data_emissao?: string | null
          data_importacao?: string | null
          destinatario_cnpj?: string | null
          destinatario_razao?: string | null
          emitente_cnpj?: string | null
          emitente_fantasia?: string | null
          emitente_razao?: string | null
          emitente_uf?: string | null
          empresa_id?: string | null
          erro_detalhe?: string | null
          id?: string
          manifestacao?: string | null
          numero?: string
          observacoes?: string | null
          serie?: string
          status_processamento?: string
          status_sefaz?: string
          tentativas_importacao?: number | null
          tipo_documento?: string
          updated_at?: string
          valor_cofins?: number | null
          valor_desconto?: number | null
          valor_frete?: number | null
          valor_icms?: number | null
          valor_ipi?: number | null
          valor_pis?: number | null
          valor_produtos?: number | null
          valor_total?: number | null
          xml_bruto?: string | null
        }
        Update: {
          chave_acesso?: string
          created_at?: string
          dados_processados?: Json | null
          data_emissao?: string | null
          data_importacao?: string | null
          destinatario_cnpj?: string | null
          destinatario_razao?: string | null
          emitente_cnpj?: string | null
          emitente_fantasia?: string | null
          emitente_razao?: string | null
          emitente_uf?: string | null
          empresa_id?: string | null
          erro_detalhe?: string | null
          id?: string
          manifestacao?: string | null
          numero?: string
          observacoes?: string | null
          serie?: string
          status_processamento?: string
          status_sefaz?: string
          tentativas_importacao?: number | null
          tipo_documento?: string
          updated_at?: string
          valor_cofins?: number | null
          valor_desconto?: number | null
          valor_frete?: number | null
          valor_icms?: number | null
          valor_ipi?: number | null
          valor_pis?: number | null
          valor_produtos?: number | null
          valor_total?: number | null
          xml_bruto?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "xml_fiscais_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      xml_fiscal_itens: {
        Row: {
          aliq_cofins: number | null
          aliq_icms: number | null
          aliq_ipi: number | null
          aliq_pis: number | null
          cest: string | null
          cfop: string | null
          codigo_produto: string | null
          created_at: string
          cst_cofins: string | null
          cst_icms: string | null
          cst_ipi: string | null
          cst_pis: string | null
          descricao: string
          divergencias: Json | null
          id: string
          ncm: string | null
          numero_item: number | null
          produto_erp_id: string | null
          quantidade: number | null
          status_mapeamento: string | null
          unidade: string | null
          valor_cofins: number | null
          valor_desconto: number | null
          valor_icms: number | null
          valor_ipi: number | null
          valor_pis: number | null
          valor_total: number | null
          valor_unitario: number | null
          xml_fiscal_id: string
        }
        Insert: {
          aliq_cofins?: number | null
          aliq_icms?: number | null
          aliq_ipi?: number | null
          aliq_pis?: number | null
          cest?: string | null
          cfop?: string | null
          codigo_produto?: string | null
          created_at?: string
          cst_cofins?: string | null
          cst_icms?: string | null
          cst_ipi?: string | null
          cst_pis?: string | null
          descricao?: string
          divergencias?: Json | null
          id?: string
          ncm?: string | null
          numero_item?: number | null
          produto_erp_id?: string | null
          quantidade?: number | null
          status_mapeamento?: string | null
          unidade?: string | null
          valor_cofins?: number | null
          valor_desconto?: number | null
          valor_icms?: number | null
          valor_ipi?: number | null
          valor_pis?: number | null
          valor_total?: number | null
          valor_unitario?: number | null
          xml_fiscal_id: string
        }
        Update: {
          aliq_cofins?: number | null
          aliq_icms?: number | null
          aliq_ipi?: number | null
          aliq_pis?: number | null
          cest?: string | null
          cfop?: string | null
          codigo_produto?: string | null
          created_at?: string
          cst_cofins?: string | null
          cst_icms?: string | null
          cst_ipi?: string | null
          cst_pis?: string | null
          descricao?: string
          divergencias?: Json | null
          id?: string
          ncm?: string | null
          numero_item?: number | null
          produto_erp_id?: string | null
          quantidade?: number | null
          status_mapeamento?: string | null
          unidade?: string | null
          valor_cofins?: number | null
          valor_desconto?: number | null
          valor_icms?: number | null
          valor_ipi?: number | null
          valor_pis?: number | null
          valor_total?: number | null
          valor_unitario?: number | null
          xml_fiscal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "xml_fiscal_itens_produto_erp_id_fkey"
            columns: ["produto_erp_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "xml_fiscal_itens_xml_fiscal_id_fkey"
            columns: ["xml_fiscal_id"]
            isOneToOne: false
            referencedRelation: "xml_fiscais"
            referencedColumns: ["id"]
          },
        ]
      }
      xml_fiscal_logs: {
        Row: {
          acao: string
          created_at: string
          detalhe: string | null
          id: string
          tipo: string
          usuario_id: string | null
          usuario_nome: string | null
          xml_fiscal_id: string | null
        }
        Insert: {
          acao?: string
          created_at?: string
          detalhe?: string | null
          id?: string
          tipo?: string
          usuario_id?: string | null
          usuario_nome?: string | null
          xml_fiscal_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          detalhe?: string | null
          id?: string
          tipo?: string
          usuario_id?: string | null
          usuario_nome?: string | null
          xml_fiscal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "xml_fiscal_logs_xml_fiscal_id_fkey"
            columns: ["xml_fiscal_id"]
            isOneToOne: false
            referencedRelation: "xml_fiscais"
            referencedColumns: ["id"]
          },
        ]
      }
      xml_fiscal_regras: {
        Row: {
          ativo: boolean | null
          auto_importar: boolean | null
          centro_custo: string | null
          cfop_padrao: string | null
          created_at: string
          criar_produto_auto: boolean | null
          fornecedor_cnpj: string
          fornecedor_nome: string | null
          id: string
          observacoes: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          auto_importar?: boolean | null
          centro_custo?: string | null
          cfop_padrao?: string | null
          created_at?: string
          criar_produto_auto?: boolean | null
          fornecedor_cnpj?: string
          fornecedor_nome?: string | null
          id?: string
          observacoes?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          auto_importar?: boolean | null
          centro_custo?: string | null
          cfop_padrao?: string | null
          created_at?: string
          criar_produto_auto?: boolean | null
          fornecedor_cnpj?: string
          fornecedor_nome?: string | null
          id?: string
          observacoes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      biometria_config: {
        Row: {
          id: string
          empresa_id: string | null
          dispositivo_nome: string
          dispositivo_ip: string | null
          dispositivo_porta: number
          software_integracao: string
          webhook_url: string | null
          webhook_secret: string | null
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          empresa_id?: string | null
          dispositivo_nome?: string
          dispositivo_ip?: string | null
          dispositivo_porta?: number
          software_integracao?: string
          webhook_url?: string | null
          webhook_secret?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string | null
          dispositivo_nome?: string
          dispositivo_ip?: string | null
          dispositivo_porta?: number
          software_integracao?: string
          webhook_url?: string | null
          webhook_secret?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      biometria_usuarios: {
        Row: {
          id: string
          user_id: string
          biometria_id: string
          dispositivo_id: string | null
          nome_dispositivo: string | null
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          biometria_id: string
          dispositivo_id?: string | null
          nome_dispositivo?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          biometria_id?: string
          dispositivo_id?: string | null
          nome_dispositivo?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      biometria_eventos: {
        Row: {
          id: string
          biometria_id: string
          user_id: string | null
          evento_tipo: string
          dispositivo_id: string | null
          status: string
          token_gerado: string | null
          token_expira_em: string | null
          ip_origem: string | null
          dados_brutos: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          biometria_id: string
          user_id?: string | null
          evento_tipo?: string
          dispositivo_id?: string | null
          status?: string
          token_gerado?: string | null
          token_expira_em?: string | null
          ip_origem?: string | null
          dados_brutos?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          biometria_id?: string
          user_id?: string | null
          evento_tipo?: string
          dispositivo_id?: string | null
          status?: string
          token_gerado?: string | null
          token_expira_em?: string | null
          ip_origem?: string | null
          dados_brutos?: Json | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_permission: {
        Args: {
          _user_id: string
          _permissao_codigo: string
        }
        Returns: boolean
      }
      get_user_permissions: {
        Args: {
          _user_id: string
        }
        Returns: {
          codigo: string
          nome: string
          tipo: string
          step_up_obrigatorio: boolean
          requer_gerente: boolean
        }[]
      }
      limpar_sessoes_expiradas: {
        Args: {}
        Returns: number
      }
      limpar_autorizacoes_expiradas: {
        Args: {}
        Returns: number
      }
      limpar_stepups_expirados: {
        Args: {}
        Returns: number
      }
    }
    Enums: {
      app_role:
        | "administrador"
        | "gerente"
        | "operador"
        | "vendedor"
        | "supervisor"
        | "financeiro"
        | "estoquista"
        | "tecnico"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "administrador",
        "gerente",
        "operador",
        "vendedor",
        "supervisor",
        "financeiro",
        "estoquista",
        "tecnico",
      ],
    },
  },
} as const
