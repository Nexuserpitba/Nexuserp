import { Separator } from "@/components/ui/separator";
import { getActiveLogo, getSelectedEmpresaId } from "@/lib/logoUtils";
import { calcularTributosItem } from "@/data/ibptData";
import { useMemo } from "react";

interface DanfeItem {
  id: number;
  codigo: string;
  descricao: string;
  quantidade: number;
  preco: number;
  emPromocao?: boolean;
  precoOriginal?: number;
  produtoBalanca?: boolean;
  unidadeBalanca?: string;
  ncm?: string;
}

interface DanfePagamento {
  forma: string;
  valor: number;
}

interface Props {
  numero: string;
  chave: string;
  items: DanfeItem[];
  subtotal: number;
  pagamentos: DanfePagamento[];
  troco: number;
  cpf: string;
  dataEmissao: Date;
  clienteNome?: string;
  clienteTelefone?: string;
  clienteEndereco?: string;
  clienteNumero?: string;
  clienteBairro?: string;
  clienteCidade?: string;
  clienteUf?: string;
  descontoGeral?: { tipo: "percent" | "value"; valor: number; calculado: number };
}

function loadEmpresaInfo() {
  try {
    const s = localStorage.getItem("empresas");
    if (!s) return null;
    const empresas = JSON.parse(s);
    return empresas.find((e: any) => e.selecionada) || empresas[0] || null;
  } catch { return null; }
}

export function DanfeNFCe({ numero, chave, items, subtotal, pagamentos, troco, cpf, dataEmissao, clienteNome, clienteTelefone, clienteEndereco, clienteNumero, clienteBairro, clienteCidade, clienteUf, descontoGeral }: Props) {
  const enderecoCompleto = [clienteEndereco, clienteNumero ? `nº ${clienteNumero}` : "", clienteBairro].filter(Boolean).join(", ");
  const cidadeUf = [clienteCidade, clienteUf].filter(Boolean).join("/");
  const formatDate = (d: Date) =>
    `${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR")}`;

  const formatChave = (c: string) =>
    c.replace(/(.{4})/g, "$1 ").trim();

  const empresa = useMemo(() => loadEmpresaInfo(), []);
  const empresaId = getSelectedEmpresaId() ?? undefined;
  const logoSrc = getActiveLogo(empresaId);

  const empresaNome = empresa?.razaoSocial || empresa?.nomeFantasia || "EMPRESA DEMONSTRAÇÃO LTDA";
  const empresaCnpj = empresa?.cnpj || "00.000.000/0001-00";
  const empresaEndereco = [empresa?.logradouro, empresa?.numero, empresa?.bairro].filter(Boolean).join(", ") || "Rua Exemplo, 123 - Centro";
  const empresaCidadeUf = [empresa?.cidade, empresa?.uf].filter(Boolean).join(" - ") || "Cidade - UF";

  return (
    <div className="bg-white text-black font-mono text-[11px] leading-tight w-[300px] p-4 border border-border rounded shadow-sm">
      {/* Cabeçalho com logo */}
      <div className="text-center space-y-1">
        {logoSrc && (
          <div className="flex justify-center mb-1">
            <img src={logoSrc} alt="Logo" className="h-10 w-auto max-w-[180px] object-contain" />
          </div>
        )}
        <p className="font-bold text-xs">{empresaNome}</p>
        <p>CNPJ: {empresaCnpj}</p>
        <p>{empresaEndereco}</p>
        <p>{empresaCidadeUf}</p>
      </div>

      <Separator className="my-2 bg-black/30" />

      <p className="text-center font-bold text-xs">
        DANFE NFC-e - Documento Auxiliar
      </p>
      <p className="text-center text-[10px]">
        da Nota Fiscal Eletrônica para Consumidor Final
      </p>

      <Separator className="my-2 bg-black/30" />

      {/* Itens header */}
      <div className="flex justify-between font-bold text-[10px]">
        <span>CÓDIGO - DESCRIÇÃO</span>
        <span>TOTAL</span>
      </div>
      <Separator className="bg-black/20" />

      {/* Itens */}
      {items.map((item) => (
        <div key={item.id}>
          <div className="flex justify-between">
            <span className="truncate max-w-[200px]">{item.codigo} - {item.descricao}</span>
            <span className="whitespace-nowrap">{(item.quantidade * item.preco).toFixed(2)}</span>
          </div>
          <div className="text-[10px] text-gray-600 pl-2">
            {item.produtoBalanca
              ? `${item.quantidade} ${item.unidadeBalanca || "kg"} x ${item.preco.toFixed(2)}`
              : `${item.quantidade.toFixed(3)} x ${item.preco.toFixed(2)}`
            }
          </div>
          {item.emPromocao && item.precoOriginal && (
            <div className="text-[9px] pl-2 flex items-center gap-1">
              <span className="line-through text-gray-400">
                De {item.precoOriginal.toFixed(2)}
              </span>
              <span className="font-bold">
                Por {item.preco.toFixed(2)}
              </span>
              <span className="text-[8px]">★ PROMOÇÃO</span>
            </div>
          )}
        </div>
      ))}

      <Separator className="my-2 bg-black/30" />

      {/* Totais */}
      {descontoGeral && descontoGeral.calculado > 0 ? (
        <>
          <div className="flex justify-between">
            <span>Subtotal Itens</span>
            <span>{(subtotal + descontoGeral.calculado).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Desconto {descontoGeral.tipo === "percent" ? `(${descontoGeral.valor}%)` : "Geral"}</span>
            <span>- {descontoGeral.calculado.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>TOTAL R$</span>
            <span>{subtotal.toFixed(2)}</span>
          </div>
        </>
      ) : (
        <div className="flex justify-between font-bold">
          <span>TOTAL R$</span>
          <span>{subtotal.toFixed(2)}</span>
        </div>
      )}

      {/* Economia */}
      {(() => {
        const totalEconomia = items.reduce((acc, item) => {
          if (item.emPromocao && item.precoOriginal && item.precoOriginal > item.preco) {
            return acc + (item.precoOriginal - item.preco) * item.quantidade;
          }
          return acc;
        }, 0);
        const totalSemDesconto = items.reduce((acc, item) => {
          const preco = (item.emPromocao && item.precoOriginal) ? item.precoOriginal : item.preco;
          return acc + preco * item.quantidade;
        }, 0);
        const pctEconomia = totalSemDesconto > 0 ? (totalEconomia / totalSemDesconto) * 100 : 0;
        if (totalEconomia <= 0) return null;
        return (
          <div className="border border-dashed border-black/40 rounded px-2 py-1.5 text-center my-1">
            <p className="font-bold text-[11px]">★ VOCÊ ECONOMIZOU ★</p>
            <p className="font-bold text-[13px]">R$ {totalEconomia.toFixed(2)} ({pctEconomia.toFixed(1)}%)</p>
          </div>
        );
      })()}

      {/* Tributos aproximados - Lei 12.741/2012 (De Olho no Imposto) */}
      {(() => {
        const tributosAgregados = items.reduce(
          (acc, item) => {
            const trib = calcularTributosItem(item.ncm || "", item.quantidade * item.preco);
            return {
              federal: acc.federal + trib.federal,
              estadual: acc.estadual + trib.estadual,
              municipal: acc.municipal + trib.municipal,
              total: acc.total + trib.total,
            };
          },
          { federal: 0, estadual: 0, municipal: 0, total: 0 }
        );
        const pctMedio = subtotal > 0 ? (tributosAgregados.total / subtotal) * 100 : 0;
        return (
          <div className="border border-black/30 rounded px-2 py-1.5 my-1 text-[9px]">
            <p className="font-bold text-[10px] text-center mb-0.5">
              INFORMAÇÃO DOS TRIBUTOS TOTAIS INCIDENTES
            </p>
            <p className="text-center text-[10px]">
              (Lei Federal nº 12.741/2012)
            </p>
            <div className="flex justify-between mt-1">
              <span>Tributos Fed. Aprox.</span>
              <span className="font-bold">{tributosAgregados.federal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tributos Est. Aprox.</span>
              <span className="font-bold">{tributosAgregados.estadual.toFixed(2)}</span>
            </div>
            {tributosAgregados.municipal > 0.01 && (
              <div className="flex justify-between">
                <span>Tributos Mun. Aprox.</span>
                <span className="font-bold">{tributosAgregados.municipal.toFixed(2)}</span>
              </div>
            )}
            <Separator className="my-1 bg-black/20" />
            <div className="flex justify-between font-bold text-[10px]">
              <span>Total de Tributos Aprox.</span>
              <span>R$ {tributosAgregados.total.toFixed(2)} ({pctMedio.toFixed(1)}%)</span>
            </div>
            <p className="text-center text-[8px] mt-0.5 opacity-70">
              Fonte: IBPT/IBPTax — Inst. Bras. de Planejamento e Tributação
            </p>
          </div>
        );
      })()}

      <Separator className="my-2 bg-black/30" />

      {/* Pagamentos */}
      <div className="space-y-0.5">
        <p className="font-bold text-[10px]">FORMA DE PAGAMENTO</p>
        {pagamentos.map((p, i) => (
          <div key={i} className="flex justify-between">
            <span>{p.forma}</span>
            <span>{p.valor.toFixed(2)}</span>
          </div>
        ))}
        {troco > 0.01 && (
          <div className="flex justify-between">
            <span>Troco</span>
            <span>{troco.toFixed(2)}</span>
          </div>
        )}
      </div>

      <Separator className="my-2 bg-black/30" />

      {/* Informações fiscais */}
      <div className="text-center space-y-1 text-[10px]">
        <p>NFC-e nº {numero} Série 1</p>
        <p>Emissão: {formatDate(dataEmissao)}</p>
        {cpf && <p>CPF/CNPJ do Consumidor: {cpf}</p>}
        {clienteNome && <p>Cliente: {clienteNome}</p>}
        {clienteTelefone && <p>Tel: {clienteTelefone}</p>}
        {enderecoCompleto && <p>{enderecoCompleto}</p>}
        {cidadeUf && <p>{cidadeUf}</p>}
        {!cpf && !clienteNome && <p>CONSUMIDOR NÃO IDENTIFICADO</p>}
      </div>

      <Separator className="my-2 bg-black/30" />

      {/* QR Code */}
      <div className="flex justify-center my-2">
        <div className="w-24 h-24 border-2 border-dashed border-gray-400 flex items-center justify-center text-[9px] text-gray-500">
          QR CODE
        </div>
      </div>

      {/* Chave de acesso */}
      <div className="text-center text-[9px] space-y-1">
        <p className="font-bold">Chave de Acesso</p>
        <p className="break-all">{formatChave(chave)}</p>
      </div>

      <Separator className="my-2 bg-black/30" />

      <p className="text-center text-[9px] text-gray-600">
        Consulte pela Chave de Acesso em<br />
        www.nfce.fazenda.gov.br
      </p>
    </div>
  );
}
