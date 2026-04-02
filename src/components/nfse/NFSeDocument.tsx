import { forwardRef } from "react";

export interface NFSeData {
  numero?: string;
  chaveAcesso?: string;
  protocolo?: string;
  dataEmissao?: string;
  competencia?: string;
  numeroDps?: string;
  serieDps?: string;
  dataEmissaoDps?: string;
  // Prestador
  prestadorCnpj: string;
  prestadorRazaoSocial: string;
  prestadorInscMunicipal: string;
  prestadorTelefone?: string;
  prestadorEmail?: string;
  prestadorEndereco?: string;
  prestadorMunicipio?: string;
  prestadorCep?: string;
  simplesNacional?: string;
  // Tomador
  tomadorCpfCnpj: string;
  tomadorNome: string;
  tomadorEmail: string;
  tomadorTelefone: string;
  tomadorLogradouro: string;
  tomadorNumero: string;
  tomadorBairro: string;
  tomadorCidade: string;
  tomadorUf: string;
  tomadorCep: string;
  // Serviço
  codigoServico: string;
  codigoTributacaoMunicipal?: string;
  localPrestacao?: string;
  discriminacao: string;
  valorServico: string;
  aliquotaIss: string;
  valorDeducoes: string;
  descontoIncondicionado?: string;
  descontoCondicionado?: string;
  // Tributação
  naturezaOperacao: string;
  regimeEspecial?: string;
  issRetido: string;
  municipioIncidencia?: string;
  // Tributação Federal
  irrf?: string;
  pis?: string;
  cofins?: string;
  csll?: string;
  inss?: string;
  // Informações complementares
  informacoesComplementares?: string;
}

interface NFSeDocumentProps {
  dados: NFSeData;
}

const naturezaMap: Record<string, string> = {
  "1": "Operação Tributável",
  "2": "Tributação fora do município",
  "3": "Isenção",
  "4": "Imune",
  "5": "Exigibilidade suspensa (judicial)",
  "6": "Exigibilidade suspensa (administrativo)",
};

const simplesMap: Record<string, string> = {
  "1": "Optante - Simples Nacional",
  "2": "Não Optante",
  "3": "Optante - MEI",
};

const regimeMap: Record<string, string> = {
  "0": "Nenhum",
  "1": "Microempresa Municipal",
  "2": "Estimativa",
  "3": "Sociedade de Profissionais",
  "4": "Cooperativa",
  "5": "MEI",
  "6": "ME/EPP Simples Nacional",
};

const formatCurrency = (v: string | number) => {
  const n = typeof v === "string" ? parseFloat(v || "0") : v;
  return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const Cell = ({ label, value, className = "" }: { label: string; value: string; className?: string }) => (
  <div className={`border-r border-b border-gray-400 p-1.5 ${className}`}>
    <div className="text-[8px] text-gray-500 uppercase leading-tight">{label}</div>
    <div className="text-[10px] font-medium leading-tight mt-0.5">{value || "—"}</div>
  </div>
);

const SectionHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-blue-900 text-white px-3 py-1 text-[9px] font-bold uppercase tracking-wider border-b border-gray-400">
    {children}
  </div>
);

const NFSeDocument = forwardRef<HTMLDivElement, NFSeDocumentProps>(({ dados }, ref) => {
  const valorServico = parseFloat(dados.valorServico || "0");
  const valorDeducoes = parseFloat(dados.valorDeducoes || "0");
  const descontoInc = parseFloat(dados.descontoIncondicionado || "0");
  const descontoCond = parseFloat(dados.descontoCondicionado || "0");
  const aliquota = parseFloat(dados.aliquotaIss || "0");
  const baseCalculo = valorServico - valorDeducoes - descontoInc;
  const valorIss = baseCalculo * (aliquota / 100);
  const retencoesFederais = [dados.irrf, dados.pis, dados.cofins, dados.csll, dados.inss]
    .reduce((s, v) => s + parseFloat(v || "0"), 0);
  const valorLiquido = valorServico - descontoInc - (dados.issRetido === "1" ? valorIss : 0) - retencoesFederais;

  const chaveAcesso = dados.chaveAcesso || generateChaveAcesso();

  return (
    <div ref={ref} className="bg-white text-black max-w-[210mm] mx-auto" style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: "10px" }}>
      <div className="border border-gray-400">
        {/* ===== HEADER ===== */}
        <div className="grid grid-cols-[200px_1fr_200px] border-b border-gray-400">
          <div className="p-3 border-r border-gray-400 flex flex-col items-center justify-center">
            <div className="text-lg font-black text-blue-900">NFSe</div>
            <div className="text-[8px] text-gray-500 text-center leading-tight">Nota Fiscal de<br/>Serviço Eletrônica</div>
          </div>
          <div className="p-3 flex flex-col items-center justify-center border-r border-gray-400">
            <div className="text-sm font-bold text-blue-900">DANFSe v1.0</div>
            <div className="text-[9px] text-gray-500">Documento Auxiliar da NFS-e</div>
          </div>
          <div className="p-3 flex flex-col items-center justify-center text-center">
            <div className="text-[10px] font-bold text-blue-900">PREFEITURA MUNICIPAL</div>
            <div className="text-[9px] text-gray-600">{dados.prestadorMunicipio || dados.tomadorCidade || "—"}</div>
            <div className="text-[8px] text-gray-400">Secretaria Municipal de Finanças</div>
          </div>
        </div>

        {/* Chave de Acesso */}
        <div className="border-b border-gray-400 p-2 text-center">
          <div className="text-[8px] text-gray-500 uppercase">Chave de Acesso da NFS-e</div>
          <div className="font-mono text-[11px] font-bold tracking-wider text-blue-900 mt-0.5">{chaveAcesso}</div>
        </div>

        {/* Dados da Nota */}
        <div className="grid grid-cols-6 border-b border-gray-400">
          <Cell label="Número da NFS-e" value={dados.numero || "—"} />
          <Cell label="Competência" value={dados.competencia || new Date().toLocaleDateString("pt-BR")} />
          <Cell label="Data/Hora Emissão" value={dados.dataEmissao || new Date().toLocaleString("pt-BR")} />
          <Cell label="Número da DPS" value={dados.numeroDps || "1"} />
          <Cell label="Série da DPS" value={dados.serieDps || "70000"} />
          <Cell label="Data Emissão DPS" value={dados.dataEmissaoDps || new Date().toLocaleString("pt-BR")} className="!border-r-0" />
        </div>

        {/* Verificação */}
        <div className="border-b border-gray-400 p-1.5 text-center bg-gray-50">
          <div className="text-[8px] text-gray-500 italic">
            A autenticidade desta NFS-e pode ser verificada pela consulta da chave de acesso no portal nacional da NFS-e
          </div>
        </div>

        {/* ===== EMITENTE ===== */}
        <SectionHeader>EMITENTE DA NFS-e</SectionHeader>
        <div className="grid grid-cols-4">
          <Cell label="Prestador do Serviço" value={dados.prestadorRazaoSocial} className="col-span-2" />
          <Cell label="CNPJ / CPF" value={dados.prestadorCnpj} />
          <Cell label="Inscrição Municipal" value={dados.prestadorInscMunicipal || "—"} className="!border-r-0" />
        </div>
        <div className="grid grid-cols-4">
          <Cell label="Telefone" value={dados.prestadorTelefone || "—"} />
          <Cell label="E-mail" value={dados.prestadorEmail || "—"} className="col-span-3 !border-r-0" />
        </div>
        <div className="grid grid-cols-3 border-b border-gray-400">
          <Cell label="Endereço" value={dados.prestadorEndereco || "—"} />
          <Cell label="Município" value={dados.prestadorMunicipio || "—"} />
          <Cell label="CEP" value={dados.prestadorCep || "—"} className="!border-r-0" />
        </div>
        <div className="grid grid-cols-1 border-b border-gray-400">
          <Cell label="Simples Nacional na Data de Competência" value={simplesMap[dados.simplesNacional || "2"] || "Não Optante"} className="!border-r-0" />
        </div>

        {/* ===== TOMADOR ===== */}
        <SectionHeader>TOMADOR DO SERVIÇO</SectionHeader>
        {dados.tomadorCpfCnpj ? (
          <>
            <div className="grid grid-cols-4">
              <Cell label="Tomador do Serviço" value={dados.tomadorNome} className="col-span-2" />
              <Cell label="CPF / CNPJ" value={dados.tomadorCpfCnpj} />
              <Cell label="Telefone" value={dados.tomadorTelefone || "—"} className="!border-r-0" />
            </div>
            <div className="grid grid-cols-1">
              <Cell label="E-mail" value={dados.tomadorEmail || "—"} className="!border-r-0" />
            </div>
            <div className="grid grid-cols-3 border-b border-gray-400">
              <Cell label="Endereço" value={[dados.tomadorLogradouro, dados.tomadorNumero, dados.tomadorBairro].filter(Boolean).join(", ") || "—"} />
              <Cell label="Município" value={`${dados.tomadorCidade || "—"}${dados.tomadorUf ? ` - ${dados.tomadorUf}` : ""}`} />
              <Cell label="CEP" value={dados.tomadorCep || "—"} className="!border-r-0" />
            </div>
          </>
        ) : (
          <div className="border-b border-gray-400 p-2 text-center text-[10px] text-gray-500 italic">
            TOMADOR DO SERVIÇO NÃO IDENTIFICADO NA NFS-e
          </div>
        )}

        {/* ===== SERVIÇO PRESTADO ===== */}
        <SectionHeader>SERVIÇO PRESTADO</SectionHeader>
        <div className="grid grid-cols-4">
          <Cell label="Código de Tributação Nacional" value={dados.codigoServico || "—"} className="col-span-2" />
          <Cell label="Local da Prestação" value={dados.localPrestacao || dados.tomadorCidade || "—"} />
          <Cell label="País da Prestação" value="Brasil" className="!border-r-0" />
        </div>
        <div className="border-b border-gray-400 p-2">
          <div className="text-[8px] text-gray-500 uppercase">Descrição do Serviço</div>
          <div className="text-[10px] mt-1 min-h-[40px] whitespace-pre-wrap">{dados.discriminacao || "—"}</div>
        </div>

        {/* ===== TRIBUTAÇÃO MUNICIPAL ===== */}
        <SectionHeader>TRIBUTAÇÃO MUNICIPAL</SectionHeader>
        <div className="grid grid-cols-4">
          <Cell label="Tributação do ISSQN" value={naturezaMap[dados.naturezaOperacao] || "—"} />
          <Cell label="Município de Incidência do ISSQN" value={dados.municipioIncidencia || dados.tomadorCidade || "—"} />
          <Cell label="Regime Especial" value={regimeMap[dados.regimeEspecial || "0"] || "Nenhum"} />
          <Cell label="Retenção do ISSQN" value={dados.issRetido === "1" ? "Retido" : "Não Retido"} className="!border-r-0" />
        </div>

        {/* Valores do Serviço */}
        <div className="grid grid-cols-6 border-b border-gray-400">
          <Cell label="Valor do Serviço" value={formatCurrency(valorServico)} />
          <Cell label="Desc. Incondicionado" value={formatCurrency(descontoInc)} />
          <Cell label="Total Deduções" value={formatCurrency(valorDeducoes)} />
          <Cell label="BC ISSQN" value={formatCurrency(baseCalculo)} />
          <Cell label="Alíquota Aplicada" value={aliquota > 0 ? `${aliquota.toFixed(2)}%` : "—"} />
          <Cell label="ISSQN Apurado" value={valorIss > 0 ? formatCurrency(valorIss) : "—"} className="!border-r-0" />
        </div>

        {/* ===== TRIBUTAÇÃO FEDERAL ===== */}
        <SectionHeader>TRIBUTAÇÃO FEDERAL</SectionHeader>
        <div className="grid grid-cols-5 border-b border-gray-400">
          <Cell label="IRRF" value={dados.irrf ? formatCurrency(dados.irrf) : "—"} />
          <Cell label="PIS" value={dados.pis ? formatCurrency(dados.pis) : "—"} />
          <Cell label="COFINS" value={dados.cofins ? formatCurrency(dados.cofins) : "—"} />
          <Cell label="CSLL" value={dados.csll ? formatCurrency(dados.csll) : "—"} />
          <Cell label="INSS" value={dados.inss ? formatCurrency(dados.inss) : "—"} className="!border-r-0" />
        </div>

        {/* ===== VALOR TOTAL ===== */}
        <div className="bg-blue-900 text-white px-3 py-1 text-[9px] font-bold uppercase tracking-wider border-b border-gray-400">
          VALOR TOTAL DA NFS-E
        </div>
        <div className="grid grid-cols-5 border-b border-gray-400">
          <Cell label="Valor do Serviço" value={formatCurrency(valorServico)} />
          <Cell label="Desc. Condicionado" value={formatCurrency(descontoCond)} />
          <Cell label="Desc. Incondicionado" value={formatCurrency(descontoInc)} />
          <Cell label="ISSQN Retido" value={dados.issRetido === "1" ? formatCurrency(valorIss) : "—"} />
          <Cell label="Total Retenções Federais" value={retencoesFederais > 0 ? formatCurrency(retencoesFederais) : "—"} className="!border-r-0" />
        </div>
        <div className="grid grid-cols-2 border-b border-gray-400">
          <Cell label="PIS/COFINS - Débito Apur. Própria" value="—" />
          <div className="p-1.5 bg-green-50">
            <div className="text-[8px] text-gray-500 uppercase leading-tight">Valor Líquido da NFS-e</div>
            <div className="text-sm font-black text-green-800 mt-0.5">{formatCurrency(valorLiquido)}</div>
          </div>
        </div>

        {/* ===== TOTAIS APROXIMADOS ===== */}
        <SectionHeader>TOTAIS APROXIMADOS DOS TRIBUTOS</SectionHeader>
        <div className="grid grid-cols-3 border-b border-gray-400">
          <Cell label="Federais" value={retencoesFederais > 0 ? formatCurrency(retencoesFederais) : "—"} />
          <Cell label="Estaduais" value="—" />
          <Cell label="Municipais" value={valorIss > 0 ? formatCurrency(valorIss) : "—"} className="!border-r-0" />
        </div>

        {/* ===== INFORMAÇÕES COMPLEMENTARES ===== */}
        {dados.informacoesComplementares && (
          <>
            <SectionHeader>INFORMAÇÕES COMPLEMENTARES</SectionHeader>
            <div className="p-2 text-[10px] whitespace-pre-wrap border-b border-gray-400">
              {dados.informacoesComplementares}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 text-center text-[8px] text-gray-400 space-y-0.5">
        <p>Documento Auxiliar da Nota Fiscal de Serviço Eletrônica — DANFSe v1.0 — Padrão Nacional NFS-e</p>
        <p>Valide este documento em: <span className="text-blue-600">https://www.nfse.gov.br/ConsultaPublica</span></p>
      </div>
    </div>
  );
});

function generateChaveAcesso(): string {
  const digits = Array.from({ length: 44 }, () => Math.floor(Math.random() * 10)).join("");
  return digits;
}

NFSeDocument.displayName = "NFSeDocument";
export default NFSeDocument;
