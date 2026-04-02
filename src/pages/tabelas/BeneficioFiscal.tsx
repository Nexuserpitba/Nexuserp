import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, FileText, Gift, MapPin, ShieldCheck } from "lucide-react";
import { beneficioFiscalData } from "@/data/beneficioFiscalData";

const tipos = ["Isenção", "Redução de Base", "Crédito Presumido", "Diferimento", "Suspensão", "Alíquota Zero", "Incentivo Regional"] as const;

const ufs = [...new Set(beneficioFiscalData.map((b) => b.uf))].sort();

export default function BeneficioFiscal() {
  const [busca, setBusca] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("todos");
  const [ufFiltro, setUfFiltro] = useState("todos");

  const filtrados = useMemo(() => {
    return beneficioFiscalData.filter((item) => {
      const matchTipo = tipoFiltro === "todos" || item.tipo === tipoFiltro;
      const matchUf = ufFiltro === "todos" || item.uf === ufFiltro;
      const matchBusca =
        !busca ||
        item.codigo.toLowerCase().includes(busca.toLowerCase()) ||
        item.descricao.toLowerCase().includes(busca.toLowerCase());
      return matchTipo && matchUf && matchBusca;
    });
  }, [busca, tipoFiltro, ufFiltro]);

  const stats = useMemo(() => ({
    total: beneficioFiscalData.length,
    isencoes: beneficioFiscalData.filter((c) => c.tipo === "Isenção").length,
    creditoPresumido: beneficioFiscalData.filter((c) => c.tipo === "Crédito Presumido").length,
    incentivos: beneficioFiscalData.filter((c) => c.tipo === "Incentivo Regional").length,
  }), []);

  const getBadgeVariant = (tipo: string) => {
    switch (tipo) {
      case "Isenção": return "default";
      case "Redução de Base": return "secondary";
      case "Crédito Presumido": return "default";
      case "Diferimento": return "outline";
      case "Suspensão": return "secondary";
      case "Alíquota Zero": return "outline";
      case "Incentivo Regional": return "default";
      default: return "outline";
    }
  };

  const getTributoBadgeVariant = (tributo: string) => {
    switch (tributo) {
      case "ICMS": return "default";
      case "IPI": return "secondary";
      case "PIS/COFINS": return "outline";
      case "ISS": return "secondary";
      case "Múltiplos": return "default";
      default: return "outline";
    }
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Benefício Fiscal"
        description="Benefícios fiscais, isenções, reduções e incentivos regionais por UF e tributo"
      />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total de benefícios</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-accent">
            <ShieldCheck className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.isencoes}</p>
            <p className="text-xs text-muted-foreground">Isenções</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10">
            <Gift className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.creditoPresumido}</p>
            <p className="text-xs text-muted-foreground">Crédito Presumido</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-accent">
            <MapPin className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.incentivos}</p>
            <p className="text-xs text-muted-foreground">Incentivos Regionais</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código ou descrição..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {tipos.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={ufFiltro} onValueChange={setUfFiltro}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="UF" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as UFs</SelectItem>
            {ufs.map((u) => (
              <SelectItem key={u} value={u}>{u}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="text-sm text-muted-foreground">
        {filtrados.length} benefício(s) encontrado(s)
      </div>

      <div className="border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-28">Código</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="w-16">UF</TableHead>
              <TableHead className="w-28">Tributo</TableHead>
              <TableHead className="w-40">Tipo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  Nenhum benefício encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filtrados.map((item, idx) => (
                <TableRow key={`${item.codigo}-${idx}`}>
                  <TableCell className="font-mono font-semibold text-foreground text-xs">{item.codigo}</TableCell>
                  <TableCell className="text-foreground text-sm">{item.descricao}</TableCell>
                  <TableCell className="font-semibold text-foreground">{item.uf}</TableCell>
                  <TableCell>
                    <Badge variant={getTributoBadgeVariant(item.tributo)} className="text-xs">
                      {item.tributo}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getBadgeVariant(item.tipo)} className="text-xs">
                      {item.tipo}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
