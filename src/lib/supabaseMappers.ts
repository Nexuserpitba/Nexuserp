// Field mappers for converting between camelCase (frontend) and snake_case (Supabase)

export const categoriasMapper = {
  toDb: (item: any) => {
    const row: Record<string, any> = {};
    if (item.codigo !== undefined) row.codigo = item.codigo;
    if (item.nome !== undefined) row.nome = item.nome;
    if (item.tipo !== undefined) row.tipo = item.tipo;
    if (item.categoriaPai !== undefined) row.categoria_pai = item.categoriaPai;
    if (item.status !== undefined) row.status = item.status;
    if (item.descricao !== undefined) row.descricao = item.descricao;
    return row;
  },
  fromDb: (row: any) => ({
    id: row.id,
    codigo: row.codigo || "",
    nome: row.nome || "",
    tipo: row.tipo || "Produto",
    categoriaPai: row.categoria_pai || "",
    status: row.status || "Ativo",
    descricao: row.descricao || "",
  }),
};

export const pessoasMapper = {
  toDb: (item: any) => {
    const row: Record<string, any> = {};
    if (item.nome !== undefined) row.nome = item.nome;
    if (item.cpfCnpj !== undefined) row.cpf_cnpj = item.cpfCnpj;
    if (item.tipo !== undefined) row.tipo = item.tipo;
    if (item.status !== undefined) row.status = item.status;
    if (item.rg !== undefined) row.rg = item.rg;
    if (item.dataNascimento !== undefined) row.data_nascimento = item.dataNascimento;
    if (item.email !== undefined) row.email = item.email;
    if (item.sexo !== undefined) row.sexo = item.sexo;
    if (item.estadoCivil !== undefined) row.estado_civil = item.estadoCivil;
    if (item.profissao !== undefined) row.profissao = item.profissao;
    if (item.cep !== undefined) row.cep = item.cep;
    if (item.logradouro !== undefined) row.endereco = item.logradouro;
    if (item.numero !== undefined) row.numero = item.numero;
    if (item.complemento !== undefined) row.complemento = item.complemento;
    if (item.bairro !== undefined) row.bairro = item.bairro;
    if (item.cidade !== undefined) row.cidade = item.cidade;
    if (item.uf !== undefined) row.uf = item.uf;
    if (item.telefone !== undefined) row.telefone = item.telefone;
    if (item.celular !== undefined) row.celular = item.celular;
    if (item.limiteCredito !== undefined) row.limite_credito = item.limiteCredito;
    if (item.limiteCheque !== undefined) row.limite_cheque = item.limiteCheque;
    if (item.limiteConvenio !== undefined) row.limite_convenio = item.limiteConvenio;
    if (item.limitePrazo !== undefined) row.limite_prazo = item.limitePrazo;
    if (item.debitos !== undefined) row.debitos = item.debitos;
    if (item.grupoDesconto !== undefined) row.grupo_desconto = item.grupoDesconto;
    if (item.precosEspeciais !== undefined) row.precos_especiais = item.precosEspeciais;
    if (item.referencias !== undefined) row.referencias = item.referencias;
    if (item.dadosBancarios !== undefined) row.dados_bancarios = item.dadosBancarios;
    if (item.razaoSocial !== undefined) row.razao_social = item.razaoSocial;
    if (item.nomeFantasia !== undefined) row.nome_fantasia = item.nomeFantasia;
    if (item.inscricaoEstadual !== undefined) row.inscricao_estadual = item.inscricaoEstadual;
    if (item.observacao !== undefined) row.observacao = item.observacao;
    return row;
  },
  fromDb: (row: any) => ({
    id: row.id,
    nome: row.nome || "",
    cpfCnpj: row.cpf_cnpj || "",
    tipo: row.tipo || "Cliente",
    status: row.status || "Ativo",
    rg: row.rg || "",
    dataNascimento: row.data_nascimento || "",
    email: row.email || "",
    sexo: row.sexo || "",
    estadoCivil: row.estado_civil || "",
    profissao: row.profissao || "",
    cep: row.cep || "",
    logradouro: row.endereco || "",
    numero: row.numero || "",
    complemento: row.complemento || "",
    bairro: row.bairro || "",
    cidade: row.cidade || "",
    uf: row.uf || "",
    telefone: row.telefone || "",
    celular: row.celular || "",
    limiteCredito: Number(row.limite_credito) || 0,
    limiteCheque: Number(row.limite_cheque) || 0,
    limiteConvenio: Number(row.limite_convenio) || 0,
    limitePrazo: Number(row.limite_prazo) || 0,
    debitos: Number(row.debitos) || 0,
    grupoDesconto: row.grupo_desconto || "",
    precosEspeciais: row.precos_especiais || "",
    referencias: row.referencias || [],
    dadosBancarios: row.dados_bancarios || { banco: "", agencia: "", conta: "", tipoConta: "Corrente", pix: "" },
    razaoSocial: row.razao_social || "",
    nomeFantasia: row.nome_fantasia || "",
    inscricaoEstadual: row.inscricao_estadual || "",
    observacao: row.observacao || "",
  }),
};

export const empresasMapper = {
  toDb: (item: any) => {
    const row: Record<string, any> = {};
    if (item.razaoSocial !== undefined) row.razao_social = item.razaoSocial;
    if (item.nomeFantasia !== undefined) row.nome_fantasia = item.nomeFantasia;
    if (item.cnpj !== undefined) row.cnpj = item.cnpj;
    if (item.inscricaoEstadual !== undefined) row.inscricao_estadual = item.inscricaoEstadual;
    if (item.inscricaoMunicipal !== undefined) row.inscricao_municipal = item.inscricaoMunicipal;
    if (item.regime !== undefined) row.regime = item.regime;
    if (item.uf !== undefined) row.uf = item.uf;
    if (item.cidade !== undefined) row.cidade = item.cidade;
    if (item.codigoPais !== undefined) row.codigo_pais = item.codigoPais;
    if (item.codigoCidade !== undefined) row.codigo_cidade = item.codigoCidade;
    if (item.endereco !== undefined) row.endereco = item.endereco;
    if (item.bairro !== undefined) row.bairro = item.bairro;
    if (item.cep !== undefined) row.cep = item.cep;
    if (item.telefone !== undefined) row.telefone = item.telefone;
    if (item.email !== undefined) row.email = item.email;
    if (item.status !== undefined) row.status = item.status;
    if (item.observacao !== undefined) row.observacao = item.observacao;
    if (item.certificado !== undefined) row.certificado = item.certificado;
    if (item.pixPsp !== undefined) row.pix_psp = item.pixPsp;
    if (item.smtpConfig !== undefined) row.smtp_config = item.smtpConfig;
    if (item.selecionada !== undefined) row.selecionada = item.selecionada;
    if (item.finalidadeNfe !== undefined) row.finalidade_nfe = item.finalidadeNfe;
    if (item.ambienteNfe !== undefined) row.ambiente_nfe = item.ambienteNfe;
    return row;
  },
  fromDb: (row: any) => ({
    id: row.id,
    razaoSocial: row.razao_social || "",
    nomeFantasia: row.nome_fantasia || "",
    cnpj: row.cnpj || "",
    inscricaoEstadual: row.inscricao_estadual || "",
    inscricaoMunicipal: row.inscricao_municipal || "",
    regime: row.regime || "Simples Nacional",
    uf: row.uf || "",
    cidade: row.cidade || "",
    codigoPais: row.codigo_pais || "1058",
    codigoCidade: row.codigo_cidade || "",
    endereco: row.endereco || "",
    bairro: row.bairro || "",
    cep: row.cep || "",
    telefone: row.telefone || "",
    email: row.email || "",
    status: row.status || "Ativa",
    observacao: row.observacao || "",
    certificado: row.certificado || undefined,
    pixPsp: row.pix_psp || undefined,
    smtpConfig: row.smtp_config || undefined,
    selecionada: row.selecionada || false,
    finalidadeNfe: row.finalidade_nfe || "1",
    ambienteNfe: row.ambiente_nfe || "2",
  }),
};

export const produtosMapper = {
  toDb: (item: any) => {
    const row: Record<string, any> = {};
    if (item.codigo !== undefined) row.codigo = item.codigo;
    if (item.codigoAuxiliar !== undefined) row.codigo_auxiliar = item.codigoAuxiliar;
    if (item.codigoReferencia !== undefined) row.codigo_referencia = item.codigoReferencia;
    if (item.barras !== undefined) row.barras = item.barras;
    if (item.barrasMultiplos !== undefined) row.barras_multiplos = item.barrasMultiplos;
    if (item.descricao !== undefined) row.descricao = item.descricao;
    if (item.ncm !== undefined) row.ncm = item.ncm;
    if (item.cest !== undefined) row.cest = item.cest;
    if (item.grupo !== undefined) row.grupo = item.grupo;
    if (item.subgrupo !== undefined) row.subgrupo = item.subgrupo;
    if (item.departamento !== undefined) row.departamento = item.departamento;
    if (item.familia !== undefined) row.familia = item.familia;
    if (item.subfamilia !== undefined) row.subfamilia = item.subfamilia;
    if (item.categoria !== undefined) row.categoria = item.categoria;
    if (item.origemMercadoria !== undefined) row.origem_mercadoria = item.origemMercadoria;
    if (item.ufTributacao !== undefined) row.uf_tributacao = item.ufTributacao;
    if (item.cstIcms !== undefined) row.cst_icms = item.cstIcms;
    if (item.cstPis !== undefined) row.cst_pis = item.cstPis;
    if (item.cstCofins !== undefined) row.cst_cofins = item.cstCofins;
    if (item.aliqIcms !== undefined) row.aliq_icms = item.aliqIcms;
    if (item.aliqPis !== undefined) row.aliq_pis = item.aliqPis;
    if (item.aliqCofins !== undefined) row.aliq_cofins = item.aliqCofins;
    if (item.aliqIpi !== undefined) row.aliq_ipi = item.aliqIpi;
    if (item.cfopInterno !== undefined) row.cfop_interno = item.cfopInterno;
    if (item.cfopExterno !== undefined) row.cfop_externo = item.cfopExterno;
    if (item.custoAquisicao !== undefined) row.custo_aquisicao = item.custoAquisicao;
    if (item.custoReposicao !== undefined) row.custo_reposicao = item.custoReposicao;
    if (item.mva !== undefined) row.mva = item.mva;
    if (item.venda !== undefined) row.venda = item.venda;
    if (item.margemBruta !== undefined) row.margem_bruta = item.margemBruta;
    if (item.margemLiquida !== undefined) row.margem_liquida = item.margemLiquida;
    if (item.sugestaoVenda !== undefined) row.sugestao_venda = item.sugestaoVenda;
    if (item.estoque !== undefined) row.estoque = item.estoque;
    if (item.unidade !== undefined) row.unidade = item.unidade;
    if (item.desdobramentos !== undefined) row.desdobramentos = item.desdobramentos;
    if (item.grupoPrecos !== undefined) row.grupo_precos = item.grupoPrecos;
    if (item.etiquetaDescricao !== undefined) row.etiqueta_descricao = item.etiquetaDescricao;
    if (item.rateio !== undefined) row.rateio = item.rateio;
    if (item.normaProcom !== undefined) row.norma_procom = item.normaProcom;
    if (item.auditoriaCorrigida !== undefined) row.auditoria_corrigida = item.auditoriaCorrigida;
    if (item.auditoriaData !== undefined) row.auditoria_data = item.auditoriaData;
    if (item.produtoBalanca !== undefined) row.produto_balanca = item.produtoBalanca;
    if (item.unidadeBalanca !== undefined) row.unidade_balanca = item.unidadeBalanca;
    if (item.composicao !== undefined) row.composicao = item.composicao;
    if (item.fornecedor !== undefined) row.fornecedor = item.fornecedor;
    if (item.observacao !== undefined) row.observacao = item.observacao;
    if (item.ativo !== undefined) row.ativo = item.ativo;
    return row;
  },
  fromDb: (row: any) => ({
    id: row.id,
    codigo: row.codigo || "",
    codigoAuxiliar: row.codigo_auxiliar || "",
    codigoReferencia: row.codigo_referencia || "",
    barras: row.barras || "",
    barrasMultiplos: row.barras_multiplos || [],
    descricao: row.descricao || "",
    ncm: row.ncm || "",
    cest: row.cest || "",
    grupo: row.grupo || "",
    subgrupo: row.subgrupo || "",
    departamento: row.departamento || "",
    familia: row.familia || "",
    subfamilia: row.subfamilia || "",
    categoria: row.categoria || "",
    origemMercadoria: row.origem_mercadoria || "0",
    ufTributacao: row.uf_tributacao || "",
    cstIcms: row.cst_icms || "",
    cstPis: row.cst_pis || "",
    cstCofins: row.cst_cofins || "",
    aliqIcms: Number(row.aliq_icms) || 0,
    aliqPis: Number(row.aliq_pis) || 0,
    aliqCofins: Number(row.aliq_cofins) || 0,
    aliqIpi: Number(row.aliq_ipi) || 0,
    cfopInterno: row.cfop_interno || "",
    cfopExterno: row.cfop_externo || "",
    custoAquisicao: Number(row.custo_aquisicao) || 0,
    custoReposicao: Number(row.custo_reposicao) || 0,
    mva: Number(row.mva) || 0,
    venda: Number(row.venda) || 0,
    margemBruta: Number(row.margem_bruta) || 0,
    margemLiquida: Number(row.margem_liquida) || 0,
    sugestaoVenda: Number(row.sugestao_venda) || 0,
    estoque: Number(row.estoque) || 0,
    unidade: row.unidade || "UN",
    desdobramentos: row.desdobramentos || [],
    grupoPrecos: row.grupo_precos || [],
    etiquetaDescricao: row.etiqueta_descricao || "",
    rateio: Number(row.rateio) || 0,
    normaProcom: row.norma_procom || "",
    auditoriaCorrigida: row.auditoria_corrigida || false,
    auditoriaData: row.auditoria_data || undefined,
    produtoBalanca: row.produto_balanca || false,
    unidadeBalanca: row.unidade_balanca || "kg",
    composicao: row.composicao || [],
    fornecedor: row.fornecedor || "",
    observacao: row.observacao || "",
    ativo: row.ativo ?? true,
  }),
};

export const cidadesMapper = {
  toDb: (item: any) => {
    const row: Record<string, any> = {};
    if (item.nome !== undefined) row.nome = item.nome;
    if (item.codigoIbge !== undefined) row.codigo_ibge = item.codigoIbge;
    if (item.uf !== undefined) row.uf = item.uf;
    return row;
  },
  fromDb: (row: any) => ({
    id: row.id,
    nome: row.nome || "",
    codigoIbge: row.codigo_ibge || "",
    uf: row.uf || "",
    status: "Ativa",
  }),
};

export const transportadorasMapper = {
  toDb: (item: any) => {
    const row: Record<string, any> = {};
    if (item.tipoPessoa !== undefined) row.tipo_pessoa = item.tipoPessoa;
    if (item.cpfCnpj !== undefined) row.cpf_cnpj = item.cpfCnpj;
    if (item.inscEstadual !== undefined) row.insc_estadual = item.inscEstadual;
    if (item.razaoSocial !== undefined) row.razao_social = item.razaoSocial;
    if (item.nomeFantasia !== undefined) row.nome_fantasia = item.nomeFantasia;
    if (item.rntrc !== undefined) row.rntrc = item.rntrc;
    if (item.tipoTransportador !== undefined) row.tipo_transportador = item.tipoTransportador;
    if (item.situacao !== undefined) row.situacao = item.situacao;
    if (item.cep !== undefined) row.cep = item.cep;
    if (item.logradouro !== undefined) row.logradouro = item.logradouro;
    if (item.numero !== undefined) row.numero = item.numero;
    if (item.complemento !== undefined) row.complemento = item.complemento;
    if (item.bairro !== undefined) row.bairro = item.bairro;
    if (item.codigoMunicipio !== undefined) row.codigo_municipio = item.codigoMunicipio;
    if (item.municipio !== undefined) row.municipio = item.municipio;
    if (item.uf !== undefined) row.uf = item.uf;
    if (item.pais !== undefined) row.pais = item.pais;
    if (item.codigoPais !== undefined) row.codigo_pais = item.codigoPais;
    if (item.telefone !== undefined) row.telefone = item.telefone;
    if (item.email !== undefined) row.email = item.email;
    if (item.responsavel !== undefined) row.responsavel = item.responsavel;
    if (item.modalFrete !== undefined) row.modal_frete = item.modalFrete;
    if (item.taf !== undefined) row.taf = item.taf;
    if (item.regTrib !== undefined) row.reg_trib = item.regTrib;
    if (item.observacoes !== undefined) row.observacoes = item.observacoes;
    if (item.veiculos !== undefined) row.veiculos = item.veiculos;
    return row;
  },
  fromDb: (row: any) => ({
    id: row.id,
    tipoPessoa: row.tipo_pessoa || "PJ",
    cpfCnpj: row.cpf_cnpj || "",
    inscEstadual: row.insc_estadual || "",
    razaoSocial: row.razao_social || "",
    nomeFantasia: row.nome_fantasia || "",
    rntrc: row.rntrc || "",
    tipoTransportador: row.tipo_transportador || "",
    situacao: row.situacao || "Ativa",
    cep: row.cep || "",
    logradouro: row.logradouro || "",
    numero: row.numero || "",
    complemento: row.complemento || "",
    bairro: row.bairro || "",
    codigoMunicipio: row.codigo_municipio || "",
    municipio: row.municipio || "",
    uf: row.uf || "",
    pais: row.pais || "Brasil",
    codigoPais: row.codigo_pais || "1058",
    telefone: row.telefone || "",
    email: row.email || "",
    responsavel: row.responsavel || "",
    modalFrete: row.modal_frete || "",
    taf: row.taf || "",
    regTrib: row.reg_trib || "",
    observacoes: row.observacoes || "",
    veiculos: row.veiculos || [],
  }),
};

export const contasBancariasMapper = {
  toDb: (item: any) => {
    const row: Record<string, any> = {};
    if (item.bancocodigo !== undefined) row.banco_codigo = item.bancocodigo;
    if (item.tipo !== undefined) row.tipo = item.tipo;
    if (item.agencia !== undefined) row.agencia = item.agencia;
    if (item.digitoAgencia !== undefined) row.digito_agencia = item.digitoAgencia;
    if (item.conta !== undefined) row.conta = item.conta;
    if (item.digitoConta !== undefined) row.digito_conta = item.digitoConta;
    if (item.titular !== undefined) row.titular = item.titular;
    if (item.cpfCnpjTitular !== undefined) row.cpf_cnpj_titular = item.cpfCnpjTitular;
    if (item.convenio !== undefined) row.convenio = item.convenio;
    if (item.carteira !== undefined) row.carteira = item.carteira;
    if (item.apelido !== undefined) row.apelido = item.apelido;
    if (item.chavePix !== undefined) row.chave_pix = item.chavePix;
    if (item.tipoChavePix !== undefined) row.tipo_chave_pix = item.tipoChavePix;
    if (item.ativa !== undefined) row.ativa = item.ativa;
    if (item.padrao !== undefined) row.padrao = item.padrao;
    if (item.observacoes !== undefined) row.observacoes = item.observacoes;
    return row;
  },
  fromDb: (row: any) => ({
    id: row.id,
    bancocodigo: row.banco_codigo || "",
    tipo: row.tipo || "corrente",
    agencia: row.agencia || "",
    digitoAgencia: row.digito_agencia || "",
    conta: row.conta || "",
    digitoConta: row.digito_conta || "",
    titular: row.titular || "",
    cpfCnpjTitular: row.cpf_cnpj_titular || "",
    convenio: row.convenio || "",
    carteira: row.carteira || "17",
    apelido: row.apelido || "",
    chavePix: row.chave_pix || "",
    tipoChavePix: row.tipo_chave_pix || "",
    ativa: row.ativa ?? true,
    padrao: row.padrao || false,
    observacoes: row.observacoes || "",
  }),
};
