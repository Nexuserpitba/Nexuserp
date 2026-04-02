import { useState, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ClipboardList, DollarSign, ArrowDownCircle, ArrowUpCircle, ShoppingCart, Printer, CreditCard, Banknote, QrCode, AlertTriangle, CheckCircle2, Eye } from "lucide-react";
import { PDFPreviewModal } from "@/components/PDFPreviewModal";

interface PagamentoVenda {
  forma: string;
  valor: number;
}

interface MovimentoCaixa {
  id: string;
  tipo: "sangria" | "suprimento" | "venda";
  valor: number;
  motivo?: string;
  hora: string;
  pagamentos?: PagamentoVenda[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  movimentos: MovimentoCaixa[];
  turnoInicio: string;
  operador: string;
  onConfirmFechamento: (valorConferido: number) => void;
}

const iconeForma: Record<string, React.ReactNode> = {
  "Dinheiro": <Banknote size={14} className="text-green-600" />,
  "Crédito": <CreditCard size={14} className="text-primary" />,
  "Débito": <CreditCard size={14} className="text-orange-500" />,
  "PIX": <QrCode size={14} className="text-purple-500" />,
};

function fmt(v: number) {
  return v.toFixed(2).replace(".", ",");
}

export function FechamentoCaixaModal({ open, onClose, movimentos, turnoInicio, operador, onConfirmFechamento }: Props) {
  const [valorConferido, setValorConferido] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHTML, setPreviewHTML] = useState("");

  const imprimirUltimosMovimentos = useMemo(() => {
    try {
      const s = localStorage.getItem("nfce-config");
      if (s) { const c = JSON.parse(s); return c.imprimirUltimosMovimentos !== false; }
    } catch { /* erro ignorado */ }
    return true;
  }, [open]);

  const resumo = useMemo(() => {
    const vendaItems = movimentos.filter(m => m.tipo === "venda");
    const vendas = vendaItems.reduce((s, m) => s + m.valor, 0);
    const sangrias = movimentos.filter(m => m.tipo === "sangria").reduce((s, m) => s + m.valor, 0);
    const suprimentos = movimentos.filter(m => m.tipo === "suprimento").reduce((s, m) => s + m.valor, 0);
    const totalEsperado = suprimentos + vendas - sangrias;
    const qtdVendas = vendaItems.length;
    const primeiraVenda = vendaItems.length > 0 ? vendaItems[0].hora : null;
    const ultimaVenda = vendaItems.length > 0 ? vendaItems[vendaItems.length - 1].hora : null;

    const formasPagamento: Record<string, { total: number; qtd: number }> = {};
    movimentos
      .filter(m => m.tipo === "venda" && m.pagamentos)
      .forEach(m => {
        m.pagamentos!.forEach(p => {
          if (!formasPagamento[p.forma]) {
            formasPagamento[p.forma] = { total: 0, qtd: 0 };
          }
          formasPagamento[p.forma].total += p.valor;
          formasPagamento[p.forma].qtd += 1;
        });
      });

    return { vendas, sangrias, suprimentos, totalEsperado, qtdVendas, formasPagamento, primeiraVenda, ultimaVenda };
  }, [movimentos]);

  const conferido = parseFloat(valorConferido.replace(",", ".")) || 0;
  const diferenca = conferido - resumo.totalEsperado;
  const formasKeys = Object.keys(resumo.formasPagamento);

  const handleConfirm = () => {
    onConfirmFechamento(conferido);
    setValorConferido("");
    onClose();
  };

  const gerarHTMLFechamento = useCallback(() => {
    const agora = new Date().toLocaleString("pt-BR");
    const linha = "─".repeat(40);
    const linhaD = "═".repeat(40);

    const formasHtml = formasKeys.map(f => {
      const d = resumo.formasPagamento[f];
      return `<tr><td>${f} (${d.qtd}x)</td><td class="r">R$ ${fmt(d.total)}</td></tr>`;
    }).join("");

    const movimentosHtml = movimentos.slice(-20).reverse().map(m => {
      const sinal = m.tipo === "sangria" ? "-" : "";
      const label = m.tipo === "venda" ? "VENDA" : m.tipo === "sangria" ? "SANGRIA" : "SUPRIMENTO";
      return `<tr><td>${m.hora} ${label}${m.motivo ? " - " + m.motivo : ""}</td><td class="r">${sinal}R$ ${fmt(m.valor)}</td></tr>`;
    }).join("");

    const difLabel = diferenca === 0 ? "SEM DIFERENCA" : diferenca > 0 ? `SOBRA: R$ ${fmt(diferenca)}` : `QUEBRA: -R$ ${fmt(Math.abs(diferenca))}`;
    const difClass = diferenca === 0 ? "ok" : diferenca > 0 ? "sobra" : "quebra";

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Fechamento de Caixa</title>
<style>
  @page { size: 80mm auto; margin: 2mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Courier New', monospace; font-size: 11px; width: 76mm; padding: 2mm; color: #000; line-height: 1.4; }
  .center { text-align: center; }
  .title { font-size: 14px; font-weight: bold; margin: 4px 0; }
  .sub { font-size: 10px; color: #555; }
  .sep { border-top: 1px dashed #000; margin: 6px 0; }
  .sep2 { border-top: 2px solid #000; margin: 6px 0; }
  .section-title { font-weight: bold; font-size: 11px; margin: 6px 0 2px; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 1px 0; font-size: 11px; vertical-align: top; }
  .r { text-align: right; font-weight: bold; }
  .total-row td { font-size: 13px; font-weight: bold; padding: 4px 0; }
  .dif-box { text-align: center; padding: 6px; margin: 6px 0; font-weight: bold; font-size: 13px; border: 2px solid #000; }
  .dif-box.ok { background: #e8f5e9; }
  .dif-box.sobra { background: #e3f2fd; }
  .dif-box.quebra { background: #ffebee; }
  .footer { text-align: center; font-size: 9px; color: #777; margin-top: 8px; }
  @media print { body { width: 76mm; } }
</style></head><body>
  <div class="center">
    <div class="title">FECHAMENTO DE CAIXA</div>
    <div class="sub">${(() => { try { const emps = JSON.parse(localStorage.getItem("empresas") || "[]"); const emp = emps.find((e: any) => e.selecionada) || emps[0]; return emp?.nomeFantasia || emp?.nome_fantasia || emp?.razaoSocial || emp?.razao_social || ""; } catch { return ""; } })()}</div>
  </div>
  <div class="sep2"></div>
  <table>
    <tr><td>Operador:</td><td class="r">${operador}</td></tr>
    <tr><td>Abertura:</td><td class="r">${turnoInicio}</td></tr>
    <tr><td>Fechamento:</td><td class="r">${agora}</td></tr>
    ${resumo.primeiraVenda ? `<tr><td>1ª Venda:</td><td class="r">${resumo.primeiraVenda}</td></tr>` : ""}
    ${resumo.ultimaVenda ? `<tr><td>Última Venda:</td><td class="r">${resumo.ultimaVenda}</td></tr>` : ""}
  </table>
  <div class="sep"></div>

  <div class="section-title">RESUMO</div>
  <table>
    <tr><td>(+) Suprimentos</td><td class="r">R$ ${fmt(resumo.suprimentos)}</td></tr>
    <tr><td>(+) Vendas (${resumo.qtdVendas})</td><td class="r">R$ ${fmt(resumo.vendas)}</td></tr>
    <tr><td>(-) Sangrias</td><td class="r">R$ ${fmt(resumo.sangrias)}</td></tr>
  </table>
  <div class="sep2"></div>
  <table>
    <tr class="total-row"><td>TOTAL ESPERADO</td><td class="r">R$ ${fmt(resumo.totalEsperado)}</td></tr>
  </table>

  ${formasKeys.length > 0 ? `
  <div class="sep"></div>
  <div class="section-title">VENDAS POR PAGAMENTO</div>
  <table>${formasHtml}</table>
  <div class="sep"></div>
  <table><tr class="total-row"><td>TOTAL VENDAS</td><td class="r">R$ ${fmt(resumo.vendas)}</td></tr></table>
  ` : ""}

  ${valorConferido ? `
  <div class="sep2"></div>
  <table>
    <tr><td>Valor Conferido</td><td class="r">R$ ${fmt(conferido)}</td></tr>
    <tr><td>Total Esperado</td><td class="r">R$ ${fmt(resumo.totalEsperado)}</td></tr>
  </table>
  <div class="dif-box ${difClass}">${difLabel}</div>
  ` : ""}

  ${imprimirUltimosMovimentos && movimentos.length > 0 ? `
  <div class="sep"></div>
  <div class="section-title">MOVIMENTOS</div>
  <table>${movimentosHtml}</table>
  ` : ""}

  <div class="sep2"></div>
  <div class="footer">
    Emitido em ${agora}<br/>
    NexusERP — Sistema de Gestão
  </div>
</body></html>`;
  }, [resumo, formasKeys, movimentos, operador, turnoInicio, valorConferido, conferido, diferenca, imprimirUltimosMovimentos]);

  const imprimirFechamento = useCallback(() => {
    const html = gerarHTMLFechamento();
    const win = window.open("", "_blank", "width=350,height=700");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.print(); }, 400);
  }, [gerarHTMLFechamento]);

  const handlePreviewFechamento = useCallback(() => {
    const html = gerarHTMLFechamento();
    setPreviewHTML(html);
    setPreviewOpen(true);
  }, [gerarHTMLFechamento]);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList size={20} className="text-primary" />
            Fechamento de Caixa
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Turno iniciado em {turnoInicio} — Operador: {operador}
          </p>
          {(resumo.primeiraVenda || resumo.ultimaVenda) && (
            <p className="text-xs text-muted-foreground">
              {resumo.primeiraVenda && <>1ª Venda: {resumo.primeiraVenda}</>}
              {resumo.primeiraVenda && resumo.ultimaVenda && " — "}
              {resumo.ultimaVenda && <>Última Venda: {resumo.ultimaVenda}</>}
            </p>
          )}
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Resumo geral */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <ArrowUpCircle size={14} className="text-green-600" /> Suprimentos
              </span>
              <span className="font-mono font-bold text-green-600">R$ {resumo.suprimentos.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <ShoppingCart size={14} className="text-primary" /> Vendas ({resumo.qtdVendas})
              </span>
              <span className="font-mono font-bold text-primary">R$ {resumo.vendas.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <ArrowDownCircle size={14} className="text-destructive" /> Sangrias
              </span>
              <span className="font-mono font-bold text-destructive">- R$ {resumo.sangrias.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-semibold">
                <DollarSign size={14} /> Total Esperado
              </span>
              <span className="font-mono font-black text-lg">R$ {resumo.totalEsperado.toFixed(2)}</span>
            </div>
          </div>

          {/* Vendas por forma de pagamento */}
          {formasKeys.length > 0 && (
            <div className="bg-muted/30 rounded-lg p-4 space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vendas por Forma de Pagamento</Label>
              <Separator />
              {formasKeys.map(forma => (
                <div key={forma} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    {iconeForma[forma] || <DollarSign size={14} />}
                    <span>{forma}</span>
                    <span className="text-muted-foreground text-xs">({resumo.formasPagamento[forma].qtd}x)</span>
                  </span>
                  <span className="font-mono font-bold">R$ {resumo.formasPagamento[forma].total.toFixed(2)}</span>
                </div>
              ))}
              <Separator />
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>Total Vendas</span>
                <span className="font-mono font-bold text-primary">R$ {resumo.vendas.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Valor conferido */}
          <div className="space-y-2">
            <Label>Valor Conferido no Caixa (R$)</Label>
            <Input
              value={valorConferido}
              onChange={e => setValorConferido(e.target.value)}
              placeholder="0,00"
              className="text-xl font-mono font-bold text-right h-12"
              autoFocus
            />
          </div>

          {/* Quebra de caixa */}
          {valorConferido && (
            <div className={`rounded-lg p-4 space-y-2 ${
              diferenca === 0 ? "bg-green-50 border border-green-200 dark:bg-green-950/30 dark:border-green-800" :
              diferenca > 0 ? "bg-accent/10 border border-accent/30" :
              "bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-800"
            }`}>
              <div className="flex items-center justify-center gap-2">
                {diferenca === 0 ? (
                  <CheckCircle2 size={20} className="text-green-600" />
                ) : (
                  <AlertTriangle size={20} className={diferenca > 0 ? "text-accent" : "text-destructive"} />
                )}
                <span className="text-sm font-semibold">
                  {diferenca === 0 ? "Caixa conferido — sem diferença" :
                   diferenca > 0 ? "Sobra de caixa" : "Quebra de caixa"}
                </span>
              </div>
              {diferenca !== 0 && (
                <div className="text-center space-y-1">
                  <span className={`text-2xl font-mono font-black ${diferenca > 0 ? "text-accent" : "text-destructive"}`}>
                    {diferenca > 0 ? "+" : "-"} R$ {Math.abs(diferenca).toFixed(2)}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Esperado: R$ {resumo.totalEsperado.toFixed(2)} | Conferido: R$ {conferido.toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Movimentos recentes */}
          {movimentos.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs">Últimos movimentos</Label>
              <div className="max-h-32 overflow-auto space-y-1">
                {movimentos.slice(-10).reverse().map(m => (
                  <div key={m.id} className="flex items-center justify-between text-xs bg-muted/30 rounded px-2 py-1">
                    <span className="flex items-center gap-1.5">
                      {m.tipo === "venda" && <ShoppingCart size={10} className="text-primary" />}
                      {m.tipo === "sangria" && <ArrowDownCircle size={10} className="text-destructive" />}
                      {m.tipo === "suprimento" && <ArrowUpCircle size={10} className="text-green-600" />}
                      <span className="capitalize">{m.tipo}</span>
                      {m.motivo && <span className="text-muted-foreground">— {m.motivo}</span>}
                    </span>
                    <span className="font-mono font-bold">
                      {m.tipo === "sangria" ? "-" : ""}R$ {m.valor.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={handlePreviewFechamento}>
            <Eye size={14} className="mr-1" /> Visualizar
          </Button>
          <Button variant="outline" size="sm" onClick={() => { imprimirFechamento(); }}>
            <Printer size={14} className="mr-1" /> Imprimir 80mm
          </Button>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirm}>Confirmar Fechamento</Button>
        </DialogFooter>
        <PDFPreviewModal
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          htmlContent={previewHTML}
          title="Fechamento de Caixa"
        />
      </DialogContent>
    </Dialog>
  );
}
