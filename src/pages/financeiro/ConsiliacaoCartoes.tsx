import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Search, CreditCard, CheckCircle2, AlertTriangle, XCircle, 
  RefreshCw, Upload, FileSpreadsheet, ArrowRight, ArrowLeftRight
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

interface TransacaoVenda {
  id: string;
  data: string;
  valor: number;
  cliente: string;
  formaPagamento: string;
  nsu: string;
  statusVenda: "concluida" | "cancelada";
}

interface TransacaoAdquirente {
  id: string;
  data: string;
  valor: number;
  estabelecimento: string;
  nsu: string;
  status: "aprovado" | "estornado" | "cancelado";
  taxa: number;
}

interface Diferenca {
  id: string;
  tipo: "faltante" | "sobrante" | "divergente";
  descricao: string;
  valor: number;
  venda?: TransacaoVenda;
  adquirente?: TransacaoAdquirente;
}

function getVendas(): TransacaoVenda[] {
  try {
    const stored = localStorage.getItem("vendas_conciliacao");
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return [
    { id: "v1", data: "2026-03-25", valor: 150.00, cliente: "João Silva", formaPagamento: "Cartão Crédito", nsu: "NSU001", statusVenda: "concluida" },
    { id: "v2", data: "2026-03-25", valor: 89.90, cliente: "Maria Souza", formaPagamento: "Cartão Débito", nsu: "NSU002", statusVenda: "concluida" },
    { id: "v3", data: "2026-03-25", valor: 500.00, cliente: "Pedro Santos", formaPagamento: "Cartão Crédito", nsu: "NSU003", statusVenda: "concluida" },
    { id: "v4", data: "2026-03-25", valor: 45.50, cliente: "Ana Costa", formaPagamento: "Cartão Crédito", nsu: "NSU004", statusVenda: "cancelada" },
    { id: "v5", data: "2026-03-25", valor: 320.00, cliente: "Carlos Lima", formaPagamento: "Cartão Débito", nsu: "NSU005", statusVenda: "concluida" },
  ];
}

function getAdquirente(): TransacaoAdquirente[] {
  try {
    const stored = localStorage.getItem("adquirente_conciliacao");
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return [
    { id: "a1", data: "2026-03-25", valor: 150.00, estabelecimento: "Minha Empresa", nsu: "NSU001", status: "aprovado", taxa: 2.5 },
    { id: "a2", data: "2026-03-25", valor: 89.90, estabelecimento: "Minha Empresa", nsu: "NSU002", status: "aprovado", taxa: 1.5 },
    { id: "a3", data: "2026-03-25", valor: 500.00, estabelecimento: "Minha Empresa", nsu: "NSU003", status: "aprovado", taxa: 2.5 },
    { id: "a4", data: "2026-03-25", valor: 45.50, estabelecimento: "Minha Empresa", nsu: "NSU004", status: "estornado", taxa: 2.5 },
    { id: "a5", data: "2026-03-25", valor: 320.00, estabelecimento: "Minha Empresa", nsu: "NSU005", status: "aprovado", taxa: 1.5 },
    { id: "a6", data: "2026-03-25", valor: 210.00, estabelecimento: "Minha Empresa", nsu: "NSU999", status: "aprovado", taxa: 2.5 },
  ];
}

export default function ConsiliacaoCartoes() {
  const [vendas, setVendas] = useState<TransacaoVenda[]>(getVendas);
  const [adquirente, setAdquirente] = useState<TransacaoAdquirente[]>(getAdquirente);
  const [busca, setBusca] = useState("");
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [processando, setProcessando] = useState(false);

  const conciliadas = useMemo(() => {
    const conciliadasMap = new Map<string, { venda: TransacaoVenda; adquirente: TransacaoAdquirente }>();
    
    vendas.forEach(v => {
      const a = adquirente.find(a => a.nsu === v.nsu && a.valor === v.valor);
      if (a) {
        conciliadasMap.set(v.id, { venda: v, adquirente: a });
      }
    });
    
    return Array.from(conciliadasMap.values());
  }, [vendas, adquirente]);

  const diferencas = useMemo(() => {
    const diffs: Diferenca[] = [];
    
    vendas.forEach(v => {
      const a = adquirente.find(a => a.nsu === v.nsu);
      if (!a) {
        diffs.push({
          id: `diff-${v.id}`,
          tipo: "faltante",
          descricao: `Venda sem registro na adquirente`,
          valor: v.valor,
          venda: v
        });
      } else if (a.valor !== v.valor) {
        diffs.push({
          id: `diff-${v.id}-div`,
          tipo: "divergente",
          descricao: `Valor divergente: Venda R$ ${v.valor} x Adquirente R$ ${a.valor}`,
          valor: Math.abs(v.valor - a.valor),
          venda: v,
          adquirente: a
        });
      }
    });

    adquirente.forEach(a => {
      const v = vendas.find(v => v.nsu === a.nsu);
      if (!v) {
        diffs.push({
          id: `diff-a-${a.id}`,
          tipo: "sobrante",
          descricao: `Registro na adquirente sem venda`,
          valor: a.valor,
          adquirente: a
        });
      }
    });

    return diffs;
  }, [vendas, adquirente]);

  const totalVendas = vendas.filter(v => v.statusVenda === "concluida").reduce((acc, v) => acc + v.valor, 0);
  const totalAdquirente = adquirente.filter(a => a.status === "aprovado").reduce((acc, a) => acc + a.valor, 0);
  const totalConciliado = conciliadas.reduce((acc, c) => acc + c.venda.valor, 0);
  const totalDiferenca = diferencas.reduce((acc, d) => acc + d.valor, 0);

  const importarExtrato = () => {
    toast.info("Importando extrato da adquirente...");
  };

  const reconciliar = () => {
    if (selecionadas.length === 0) {
      toast.warning("Selecione pelo menos uma transação para conciliar");
      return;
    }
    setProcessando(true);
    setTimeout(() => {
      toast.success(`${selecionadas.length} transação(ões) conciliada(s) com sucesso!`);
      setProcessando(false);
      setSelecionadas([]);
    }, 1500);
  };

  const toggleSelecao = (id: string) => {
    setSelecionadas(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  function getStatusBadge(tipo: Diferenca["tipo"]) {
    switch (tipo) {
      case "faltante":
        return <Badge className="bg-red-500"><AlertTriangle className="w-3 h-3 mr-1" /> Faltante</Badge>;
      case "sobrante":
        return <Badge className="bg-yellow-500"><AlertTriangle className="w-3 h-3 mr-1" /> Sobrante</Badge>;
      case "divergente":
        return <Badge className="bg-orange-500"><XCircle className="w-3 h-3 mr-1" /> Divergente</Badge>;
    }
  }

  return (
    <div className="container mx-auto p-6">
      <PageHeader 
        title="Consiliação de Cartões" 
        description="Concilie vendas com registros da adquirente"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={importarExtrato}>
              <Upload className="w-4 h-4 mr-2" />
              Importar Extrato
            </Button>
            <Button variant="outline" onClick={reconciliar} disabled={processando || selecionadas.length === 0}>
              <RefreshCw className={`w-4 h-4 mr-2 ${processando ? "animate-spin" : ""}`} />
              Reconciliar ({selecionadas.length})
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Vendas</p>
                <p className="text-2xl font-bold">R$ {totalVendas.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-full">
                <FileSpreadsheet className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Adquirente</p>
                <p className="text-2xl font-bold">R$ {totalAdquirente.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Conciliado</p>
                <p className="text-2xl font-bold">R$ {totalConciliado.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Diferenças</p>
                <p className="text-2xl font-bold">R$ {totalDiferenca.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="conciliar" className="mb-6">
        <TabsList>
          <TabsTrigger value="conciliar">Conciliar</TabsTrigger>
          <TabsTrigger value="diferencas">Diferenças ({diferencas.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="conciliar">
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar por NSU, cliente..." 
                    className="pl-10"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                  />
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>NSU</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Valor Venda</TableHead>
                    <TableHead>Valor Adquirente</TableHead>
                    <TableHead>Taxa</TableHead>
                    <TableHead>Líquido</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conciliadas.filter(c => 
                    !busca || 
                    c.venda.cliente.toLowerCase().includes(busca.toLowerCase()) ||
                    c.venda.nsu.includes(busca)
                  ).map((c, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Checkbox 
                          checked={selecionadas.includes(c.venda.id)}
                          onCheckedChange={() => toggleSelecao(c.venda.id)}
                        />
                      </TableCell>
                      <TableCell>{format(new Date(c.venda.data), "dd/MM/yyyy")}</TableCell>
                      <TableCell className="font-mono text-xs">{c.venda.nsu}</TableCell>
                      <TableCell>{c.venda.cliente}</TableCell>
                      <TableCell className="font-medium">R$ {c.venda.valor.toFixed(2)}</TableCell>
                      <TableCell>R$ {c.adquirente.valor.toFixed(2)}</TableCell>
                      <TableCell>{c.adquirente.taxa}%</TableCell>
                      <TableCell className="text-green-600">R$ {(c.adquirente.valor * (1 - c.adquirente.taxa/100)).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" /> OK</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {conciliadas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        Nenhuma transação conciliada encontrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diferencas">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>NSU</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {diferencas.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>{getStatusBadge(d.tipo)}</TableCell>
                      <TableCell>{d.descricao}</TableCell>
                      <TableCell className="font-mono text-xs">{d.venda?.nsu || d.adquirente?.nsu || "-"}</TableCell>
                      <TableCell className="font-medium">R$ {d.valor.toFixed(2)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <ArrowRight className="w-4 h-4 mr-1" />
                          Ajustar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {diferencas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhuma diferença encontrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
