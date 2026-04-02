interface ContaBancaria {
  id: string;
  banco: string;
  codigoBanco: string;
  agencia: string;
  digitoAgencia: string;
  conta: string;
  digitoConta: string;
  convenio: string;
  carteira: string;
  cedente: string;
  cnpjCedente: string;
  enderecoCedente: string;
  cidadeCedente: string;
  ufCedente: string;
  ativa: boolean;
}

interface ModeloBoleto {
  instrucao1: string;
  instrucao2: string;
  instrucao3: string;
  instrucao4: string;
  instrucao5: string;
  demonstrativo1: string;
  demonstrativo2: string;
  demonstrativo3: string;
  localPagamento: string;
  especieDocumento: string;
  aceite: string;
  jurosMora: number;
  multa: number;
  diasProtesto: number;
}

interface BoletoGerado {
  nossoNumero: string;
  clienteNome: string;
  clienteDoc: string;
  valor: number;
  vencimento: string;
  emissao: string;
  referencia: string;
  modeloId: string;
  contaBancariaId: string;
}

// Map bank codes to logo URLs (official colors as SVG-like rendered divs)
const bancoLogos: Record<string, { cor: string; corTexto: string; sigla: string }> = {
  "001": { cor: "#FFCB05", corTexto: "#003882", sigla: "BB" },
  "033": { cor: "#EC0000", corTexto: "#FFFFFF", sigla: "S" },
  "104": { cor: "#005CA9", corTexto: "#FFFFFF", sigla: "CEF" },
  "237": { cor: "#CC092F", corTexto: "#FFFFFF", sigla: "B" },
  "341": { cor: "#EC7000", corTexto: "#003A70", sigla: "Itaú" },
  "356": { cor: "#006B3F", corTexto: "#FFFFFF", sigla: "Real" },
  "389": { cor: "#00457C", corTexto: "#FFFFFF", sigla: "MB" },
  "399": { cor: "#DB0011", corTexto: "#FFFFFF", sigla: "HSBC" },
  "422": { cor: "#00205B", corTexto: "#FFFFFF", sigla: "Safra" },
  "745": { cor: "#003DA5", corTexto: "#FFFFFF", sigla: "Citi" },
  "748": { cor: "#00703C", corTexto: "#FFFFFF", sigla: "Sicredi" },
  "756": { cor: "#003641", corTexto: "#FFFFFF", sigla: "Sicoob" },
};

function BancoLogo({ codigoBanco, nomeBanco }: { codigoBanco: string; nomeBanco: string }) {
  const logo = bancoLogos[codigoBanco];
  if (!logo) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">{codigoBanco}</div>
        <span className="font-bold text-sm">{nomeBanco}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-12 h-12 rounded-md flex items-center justify-center font-black text-sm shadow-sm"
        style={{ backgroundColor: logo.cor, color: logo.corTexto }}
      >
        {logo.sigla}
      </div>
      <div>
        <p className="font-bold text-sm leading-tight">{nomeBanco}</p>
        <p className="text-xs text-muted-foreground">{codigoBanco}</p>
      </div>
    </div>
  );
}

function formatarValor(valor: number): string {
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatarData(data: string): string {
  return data.split("-").reverse().join("/");
}

interface BoletoVisualizacaoProps {
  boleto: BoletoGerado;
  conta?: ContaBancaria;
  modelo?: ModeloBoleto;
}

export function BoletoVisualizacao({ boleto, conta, modelo }: BoletoVisualizacaoProps) {
  return (
    <div className="boleto-print bg-white text-black" id="boleto-impressao">
      {/* ===== RECIBO DO PAGADOR (topo - ficha de compensação recortável) ===== */}
      <div className="border-2 border-black p-0 text-xs" style={{ fontFamily: "monospace" }}>
        {/* Cabeçalho com Logo do Banco */}
        <div className="flex items-stretch border-b-2 border-black">
          <div className="flex items-center px-3 py-2 border-r-2 border-black" style={{ minWidth: 200 }}>
            <BancoLogo codigoBanco={conta?.codigoBanco || "000"} nomeBanco={conta?.banco || "Banco"} />
          </div>
          <div className="flex items-center justify-center px-4 py-2 border-r-2 border-black font-black text-2xl" style={{ minWidth: 80 }}>
            {conta?.codigoBanco || "000"}-{(parseInt(conta?.codigoBanco || "0") % 10)}
          </div>
          <div className="flex-1 flex items-center justify-end px-3 py-2">
            <span className="font-bold text-sm tracking-wider">{boleto.nossoNumero}</span>
          </div>
        </div>

        {/* Linha 1: Local pagamento | Vencimento */}
        <div className="flex border-b border-black">
          <div className="flex-1 border-r border-black p-1.5">
            <p className="text-[9px] text-gray-500">Local de Pagamento</p>
            <p className="font-medium text-[11px]">{modelo?.localPagamento || "Pagável em qualquer banco até o vencimento"}</p>
          </div>
          <div className="p-1.5" style={{ minWidth: 150 }}>
            <p className="text-[9px] text-gray-500">Vencimento</p>
            <p className="font-bold text-sm">{formatarData(boleto.vencimento)}</p>
          </div>
        </div>

        {/* Linha 2: Beneficiário | Ag/Cod Cedente */}
        <div className="flex border-b border-black">
          <div className="flex-1 border-r border-black p-1.5">
            <p className="text-[9px] text-gray-500">Beneficiário</p>
            <p className="font-medium text-[11px]">{conta?.cedente} — CNPJ: {conta?.cnpjCedente}</p>
            {conta?.enderecoCedente && <p className="text-[10px]">{conta.enderecoCedente} - {conta.cidadeCedente}/{conta.ufCedente}</p>}
          </div>
          <div className="p-1.5" style={{ minWidth: 150 }}>
            <p className="text-[9px] text-gray-500">Agência / Código Cedente</p>
            <p className="font-bold">{conta?.agencia}-{conta?.digitoAgencia} / {conta?.convenio}</p>
          </div>
        </div>

        {/* Linha 3: Data doc | Nº doc | Espécie Doc | Aceite | Data Processamento | Nosso Número */}
        <div className="flex border-b border-black text-[10px]">
          <div className="border-r border-black p-1.5 flex-1">
            <p className="text-[9px] text-gray-500">Data do Documento</p>
            <p>{formatarData(boleto.emissao)}</p>
          </div>
          <div className="border-r border-black p-1.5 flex-1">
            <p className="text-[9px] text-gray-500">Nº do Documento</p>
            <p>{boleto.nossoNumero.slice(-8)}</p>
          </div>
          <div className="border-r border-black p-1.5" style={{ minWidth: 60 }}>
            <p className="text-[9px] text-gray-500">Espécie Doc.</p>
            <p>{modelo?.especieDocumento || "DM"}</p>
          </div>
          <div className="border-r border-black p-1.5" style={{ minWidth: 50 }}>
            <p className="text-[9px] text-gray-500">Aceite</p>
            <p>{modelo?.aceite || "N"}</p>
          </div>
          <div className="border-r border-black p-1.5 flex-1">
            <p className="text-[9px] text-gray-500">Data Processamento</p>
            <p>{formatarData(boleto.emissao)}</p>
          </div>
          <div className="p-1.5" style={{ minWidth: 150 }}>
            <p className="text-[9px] text-gray-500">Nosso Número</p>
            <p className="font-bold">{boleto.nossoNumero}</p>
          </div>
        </div>

        {/* Linha 4: Uso Banco | Carteira | Espécie | Quantidade | Valor | (=) Valor Documento */}
        <div className="flex border-b border-black text-[10px]">
          <div className="border-r border-black p-1.5" style={{ minWidth: 60 }}>
            <p className="text-[9px] text-gray-500">Uso do Banco</p>
            <p>&nbsp;</p>
          </div>
          <div className="border-r border-black p-1.5" style={{ minWidth: 60 }}>
            <p className="text-[9px] text-gray-500">Carteira</p>
            <p>{conta?.carteira}</p>
          </div>
          <div className="border-r border-black p-1.5" style={{ minWidth: 60 }}>
            <p className="text-[9px] text-gray-500">Espécie</p>
            <p>R$</p>
          </div>
          <div className="border-r border-black p-1.5 flex-1">
            <p className="text-[9px] text-gray-500">Quantidade</p>
            <p>&nbsp;</p>
          </div>
          <div className="border-r border-black p-1.5 flex-1">
            <p className="text-[9px] text-gray-500">Valor</p>
            <p>&nbsp;</p>
          </div>
          <div className="p-1.5" style={{ minWidth: 150 }}>
            <p className="text-[9px] text-gray-500">(=) Valor do Documento</p>
            <p className="font-bold text-sm">R$ {formatarValor(boleto.valor)}</p>
          </div>
        </div>

        {/* Instruções + campos laterais */}
        <div className="flex border-b border-black">
          <div className="flex-1 border-r border-black p-1.5" style={{ minHeight: 80 }}>
            <p className="text-[9px] text-gray-500 mb-1">Instruções (Texto de responsabilidade do beneficiário)</p>
            {modelo && [modelo.instrucao1, modelo.instrucao2, modelo.instrucao3, modelo.instrucao4, modelo.instrucao5]
              .filter(Boolean)
              .map((inst, i) => (
                <p key={i} className="text-[10px] leading-tight">
                  {inst.replace("{juros}", String(modelo.jurosMora)).replace("{multa}", String(modelo.multa))}
                </p>
              ))}
            {modelo && modelo.diasProtesto > 0 && (
              <p className="text-[10px] leading-tight font-medium mt-1">Protestar após {modelo.diasProtesto} dias do vencimento</p>
            )}
          </div>
          <div className="flex flex-col" style={{ minWidth: 150 }}>
            <div className="border-b border-black p-1.5">
              <p className="text-[9px] text-gray-500">(-) Desconto / Abatimento</p>
              <p>&nbsp;</p>
            </div>
            <div className="border-b border-black p-1.5">
              <p className="text-[9px] text-gray-500">(+) Mora / Multa</p>
              <p>&nbsp;</p>
            </div>
            <div className="border-b border-black p-1.5">
              <p className="text-[9px] text-gray-500">(+) Outros Acréscimos</p>
              <p>&nbsp;</p>
            </div>
            <div className="p-1.5">
              <p className="text-[9px] text-gray-500">(=) Valor Cobrado</p>
              <p>&nbsp;</p>
            </div>
          </div>
        </div>

        {/* Pagador */}
        <div className="p-2 border-b border-black">
          <p className="text-[9px] text-gray-500">Pagador</p>
          <p className="font-medium text-[11px]">{boleto.clienteNome}</p>
          <p className="text-[10px]">{boleto.clienteDoc && `CPF/CNPJ: ${boleto.clienteDoc}`}</p>
        </div>

        {/* Demonstrativo */}
        {modelo && (modelo.demonstrativo1 || modelo.demonstrativo2 || modelo.demonstrativo3) && (
          <div className="p-2 border-b border-black">
            <p className="text-[9px] text-gray-500">Demonstrativo</p>
            {[modelo.demonstrativo1, modelo.demonstrativo2, modelo.demonstrativo3].filter(Boolean).map((d, i) => (
              <p key={i} className="text-[10px]">{d}</p>
            ))}
          </div>
        )}

        {/* Referência */}
        {boleto.referencia && (
          <div className="p-2 border-b border-black">
            <p className="text-[9px] text-gray-500">Referência</p>
            <p className="text-[10px]">{boleto.referencia}</p>
          </div>
        )}

        {/* Autenticação Mecânica */}
        <div className="p-2 flex justify-between items-center">
          <p className="text-[9px] text-gray-500">Autenticação Mecânica — Ficha de Compensação</p>
          <div className="text-right">
            <p className="text-[8px] text-gray-400">Código de Barras (representação)</p>
            <div className="flex gap-px mt-1">
              {Array.from({ length: 44 }, (_, i) => (
                <div
                  key={i}
                  className="bg-black"
                  style={{ width: i % 3 === 0 ? 2 : 1, height: 28 }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BoletoVisualizacao;
