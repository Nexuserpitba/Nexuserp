export interface LinhaDRE {
  codigo: string;
  descricao: string;
  valor: number;
  nivel: number;
  tipo: "receita" | "deducao" | "custo" | "despesa" | "resultado" | "imposto" | "participacao";
  isTotal?: boolean;
  isSubtotal?: boolean;
}

export const meses = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export const anosDisponiveis = ["2024", "2025", "2026"];

export function gerarDadosDRE(mes: number, ano: number): LinhaDRE[] {
  const seed = mes + ano * 12;
  const r = (base: number, variance: number) => {
    const factor = 1 + (Math.sin(seed * 0.7 + base) * variance);
    return Math.round(base * factor * 100) / 100;
  };

  const receitaBruta = r(850000, 0.15);
  const vendaMerc = r(620000, 0.12);
  const prestServicos = r(180000, 0.18);
  const outrasReceitas = receitaBruta - vendaMerc - prestServicos;

  const devVendas = r(12000, 0.2);
  const abatimentos = r(3500, 0.25);
  const impostosVenda = r(145000, 0.1);
  const icms = r(85000, 0.1);
  const pis = r(14000, 0.08);
  const cofins = r(38000, 0.08);
  const iss = r(8000, 0.15);
  const totalDeducoes = devVendas + abatimentos + impostosVenda;
  const receitaLiquida = receitaBruta - totalDeducoes;

  const cmv = r(380000, 0.1);
  const custoMaterial = r(220000, 0.12);
  const custoMOD = r(95000, 0.08);
  const custoIndireto = cmv - custoMaterial - custoMOD;
  const lucroBruto = receitaLiquida - cmv;

  const salarios = r(120000, 0.05);
  const encargos = r(48000, 0.05);
  const aluguel = r(18000, 0.02);
  const energia = r(8500, 0.1);
  const telecom = r(4200, 0.08);
  const materialEscr = r(2800, 0.15);
  const deprecAmort = r(15000, 0.05);
  const seguros = r(6500, 0.03);
  const honorarios = r(12000, 0.1);
  const totalDespAdm = salarios + encargos + aluguel + energia + telecom + materialEscr + deprecAmort + seguros + honorarios;

  const comissoes = r(35000, 0.15);
  const propaganda = r(18000, 0.2);
  const frete = r(12000, 0.1);
  const totalDespCom = comissoes + propaganda + frete;

  const jurosPagos = r(15000, 0.18);
  const descontosConc = r(5000, 0.12);
  const tarifasBanc = r(2000, 0.1);
  const totalDespFin = jurosPagos + descontosConc + tarifasBanc;

  const jurosRecebidos = r(5000, 0.22);
  const descontosObt = r(3000, 0.15);
  const totalRecFin = jurosRecebidos + descontosObt;

  const outrasRecOp = r(5000, 0.25);
  const outrasDespOp = r(3000, 0.2);

  const resultadoOp = lucroBruto - totalDespAdm - totalDespCom - totalDespFin + totalRecFin + outrasRecOp - outrasDespOp;

  const recNaoOp = r(2000, 0.5);
  const despNaoOp = r(1500, 0.4);
  const resultadoAntesIR = resultadoOp + recNaoOp - despNaoOp;

  const irpj = r(resultadoAntesIR * 0.15, 0.05);
  const csll = r(resultadoAntesIR * 0.09, 0.05);
  const adicionalIR = resultadoAntesIR > 20000 ? r((resultadoAntesIR - 20000) * 0.1, 0.05) : 0;
  const totalImpostos = irpj + csll + adicionalIR;

  const resultadoAposIR = resultadoAntesIR - totalImpostos;
  const participacoes = r(resultadoAposIR * 0.05, 0.1);
  const lucroLiquido = resultadoAposIR - participacoes;

  return [
    { codigo: "1", descricao: "RECEITA OPERACIONAL BRUTA", valor: receitaBruta, nivel: 0, tipo: "receita", isTotal: true },
    { codigo: "1.1", descricao: "Venda de Mercadorias", valor: vendaMerc, nivel: 1, tipo: "receita" },
    { codigo: "1.2", descricao: "Prestação de Serviços", valor: prestServicos, nivel: 1, tipo: "receita" },
    { codigo: "1.3", descricao: "Outras Receitas Operacionais", valor: outrasReceitas, nivel: 1, tipo: "receita" },
    { codigo: "2", descricao: "(-) DEDUÇÕES DA RECEITA BRUTA", valor: -totalDeducoes, nivel: 0, tipo: "deducao", isTotal: true },
    { codigo: "2.1", descricao: "(-) Devoluções de Vendas", valor: -devVendas, nivel: 1, tipo: "deducao" },
    { codigo: "2.2", descricao: "(-) Abatimentos", valor: -abatimentos, nivel: 1, tipo: "deducao" },
    { codigo: "2.3", descricao: "(-) Impostos sobre Vendas", valor: -impostosVenda, nivel: 1, tipo: "deducao" },
    { codigo: "2.3.1", descricao: "ICMS sobre Vendas", valor: -icms, nivel: 2, tipo: "deducao" },
    { codigo: "2.3.2", descricao: "PIS sobre Faturamento", valor: -pis, nivel: 2, tipo: "deducao" },
    { codigo: "2.3.3", descricao: "COFINS sobre Faturamento", valor: -cofins, nivel: 2, tipo: "deducao" },
    { codigo: "2.3.4", descricao: "ISS sobre Serviços", valor: -iss, nivel: 2, tipo: "deducao" },
    { codigo: "3", descricao: "RECEITA OPERACIONAL LÍQUIDA", valor: receitaLiquida, nivel: 0, tipo: "resultado", isTotal: true },
    { codigo: "4", descricao: "(-) CUSTO DAS MERCADORIAS/SERVIÇOS VENDIDOS", valor: -cmv, nivel: 0, tipo: "custo", isTotal: true },
    { codigo: "4.1", descricao: "(-) Custo de Materiais / CMV", valor: -custoMaterial, nivel: 1, tipo: "custo" },
    { codigo: "4.2", descricao: "(-) Mão de Obra Direta", valor: -custoMOD, nivel: 1, tipo: "custo" },
    { codigo: "4.3", descricao: "(-) Custos Indiretos de Fabricação", valor: -custoIndireto, nivel: 1, tipo: "custo" },
    { codigo: "5", descricao: "LUCRO BRUTO", valor: lucroBruto, nivel: 0, tipo: "resultado", isTotal: true },
    { codigo: "6", descricao: "(-) DESPESAS OPERACIONAIS", valor: -(totalDespAdm + totalDespCom + totalDespFin - totalRecFin + outrasDespOp - outrasRecOp), nivel: 0, tipo: "despesa", isTotal: true },
    { codigo: "6.1", descricao: "(-) Despesas Administrativas", valor: -totalDespAdm, nivel: 1, tipo: "despesa", isSubtotal: true },
    { codigo: "6.1.1", descricao: "Salários e Ordenados", valor: -salarios, nivel: 2, tipo: "despesa" },
    { codigo: "6.1.2", descricao: "Encargos Sociais (INSS, FGTS)", valor: -encargos, nivel: 2, tipo: "despesa" },
    { codigo: "6.1.3", descricao: "Aluguel e Condomínio", valor: -aluguel, nivel: 2, tipo: "despesa" },
    { codigo: "6.1.4", descricao: "Energia Elétrica e Água", valor: -energia, nivel: 2, tipo: "despesa" },
    { codigo: "6.1.5", descricao: "Telecomunicações", valor: -telecom, nivel: 2, tipo: "despesa" },
    { codigo: "6.1.6", descricao: "Material de Escritório", valor: -materialEscr, nivel: 2, tipo: "despesa" },
    { codigo: "6.1.7", descricao: "Depreciação e Amortização", valor: -deprecAmort, nivel: 2, tipo: "despesa" },
    { codigo: "6.1.8", descricao: "Seguros", valor: -seguros, nivel: 2, tipo: "despesa" },
    { codigo: "6.1.9", descricao: "Honorários Contábeis e Jurídicos", valor: -honorarios, nivel: 2, tipo: "despesa" },
    { codigo: "6.2", descricao: "(-) Despesas Comerciais / Vendas", valor: -totalDespCom, nivel: 1, tipo: "despesa", isSubtotal: true },
    { codigo: "6.2.1", descricao: "Comissões sobre Vendas", valor: -comissoes, nivel: 2, tipo: "despesa" },
    { codigo: "6.2.2", descricao: "Propaganda e Publicidade", valor: -propaganda, nivel: 2, tipo: "despesa" },
    { codigo: "6.2.3", descricao: "Fretes sobre Vendas", valor: -frete, nivel: 2, tipo: "despesa" },
    { codigo: "6.3", descricao: "(-) Despesas Financeiras", valor: -totalDespFin, nivel: 1, tipo: "despesa", isSubtotal: true },
    { codigo: "6.3.1", descricao: "Juros Pagos", valor: -jurosPagos, nivel: 2, tipo: "despesa" },
    { codigo: "6.3.2", descricao: "Descontos Concedidos", valor: -descontosConc, nivel: 2, tipo: "despesa" },
    { codigo: "6.3.3", descricao: "Tarifas Bancárias", valor: -tarifasBanc, nivel: 2, tipo: "despesa" },
    { codigo: "6.4", descricao: "(+) Receitas Financeiras", valor: totalRecFin, nivel: 1, tipo: "receita", isSubtotal: true },
    { codigo: "6.4.1", descricao: "Juros Recebidos / Aplicações", valor: jurosRecebidos, nivel: 2, tipo: "receita" },
    { codigo: "6.4.2", descricao: "Descontos Obtidos", valor: descontosObt, nivel: 2, tipo: "receita" },
    { codigo: "6.5", descricao: "(+) Outras Receitas Operacionais", valor: outrasRecOp, nivel: 1, tipo: "receita" },
    { codigo: "6.6", descricao: "(-) Outras Despesas Operacionais", valor: -outrasDespOp, nivel: 1, tipo: "despesa" },
    { codigo: "7", descricao: "RESULTADO OPERACIONAL (EBIT)", valor: resultadoOp, nivel: 0, tipo: "resultado", isTotal: true },
    { codigo: "8", descricao: "RESULTADO NÃO OPERACIONAL", valor: recNaoOp - despNaoOp, nivel: 0, tipo: "resultado", isTotal: true },
    { codigo: "8.1", descricao: "(+) Receitas Não Operacionais", valor: recNaoOp, nivel: 1, tipo: "receita" },
    { codigo: "8.2", descricao: "(-) Despesas Não Operacionais", valor: -despNaoOp, nivel: 1, tipo: "despesa" },
    { codigo: "9", descricao: "RESULTADO ANTES DO IR/CSLL (LAIR)", valor: resultadoAntesIR, nivel: 0, tipo: "resultado", isTotal: true },
    { codigo: "10", descricao: "(-) PROVISÃO PARA IR E CSLL", valor: -totalImpostos, nivel: 0, tipo: "imposto", isTotal: true },
    { codigo: "10.1", descricao: "(-) IRPJ (15%)", valor: -irpj, nivel: 1, tipo: "imposto" },
    { codigo: "10.2", descricao: "(-) CSLL (9%)", valor: -csll, nivel: 1, tipo: "imposto" },
    { codigo: "10.3", descricao: "(-) Adicional IR (10%)", valor: -adicionalIR, nivel: 1, tipo: "imposto" },
    { codigo: "11", descricao: "RESULTADO APÓS IR/CSLL", valor: resultadoAposIR, nivel: 0, tipo: "resultado", isTotal: true },
    { codigo: "12", descricao: "(-) PARTICIPAÇÕES E CONTRIBUIÇÕES", valor: -participacoes, nivel: 0, tipo: "participacao", isTotal: true },
    { codigo: "12.1", descricao: "(-) Participações de Empregados", valor: -participacoes, nivel: 1, tipo: "participacao" },
    { codigo: "13", descricao: "LUCRO/PREJUÍZO LÍQUIDO DO EXERCÍCIO", valor: lucroLiquido, nivel: 0, tipo: "resultado", isTotal: true },
  ];
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "percent", minimumFractionDigits: 2 }).format(value);
}
