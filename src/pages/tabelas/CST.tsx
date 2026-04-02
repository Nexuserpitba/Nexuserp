import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, FileText, Globe, Info } from "lucide-react";
import { cstData, origemMercadoriaData } from "@/data/cstData";

const impostoColors: Record<string, string> = {
  ICMS: "bg-primary/10 text-primary",
  IPI: "bg-accent text-accent-foreground",
  PIS: "bg-secondary text-secondary-foreground",
  COFINS: "bg-muted text-muted-foreground",
  ORIGEM: "bg-primary/20 text-primary",
};

export default function CST() {
  const [busca, setBusca] = useState("");
  const [abaAtiva, setAbaAtiva] = useState("ORIGEM");

  const filtrados = useMemo(() => {
    if (abaAtiva === "ORIGEM") return [];
    return cstData.filter((item) => {
      const matchImposto = item.imposto === abaAtiva;
      const matchBusca =
        !busca ||
        item.codigo.includes(busca) ||
        item.descricao.toLowerCase().includes(busca.toLowerCase());
      return matchImposto && matchBusca;
    });
  }, [busca, abaAtiva]);

  const origensFiltradas = useMemo(() => {
    if (abaAtiva !== "ORIGEM") return [];
    if (!busca) return origemMercadoriaData;
    const q = busca.toLowerCase();
    return origemMercadoriaData.filter(
      (item) => item.codigo.includes(q) || item.descricao.toLowerCase().includes(q)
    );
  }, [busca, abaAtiva]);

  const stats = useMemo(() => ({
    ORIGEM: origemMercadoriaData.length,
    ICMS: cstData.filter((c) => c.imposto === "ICMS").length,
    IPI: cstData.filter((c) => c.imposto === "IPI").length,
    PIS: cstData.filter((c) => c.imposto === "PIS").length,
    COFINS: cstData.filter((c) => c.imposto === "COFINS").length,
  }), []);

  const tabItems = ["ORIGEM", "ICMS", "IPI", "PIS", "COFINS"] as const;

  return (
    <div className="page-container">
      <PageHeader
        title="Tabela CST"
        description="Código de Situação Tributária — Origem, ICMS, IPI, PIS e COFINS (Ajuste SINIEF 20/2012)"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {tabItems.map((imp) => (
          <div
            key={imp}
            className={`bg-card border rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-colors ${
              abaAtiva === imp ? "border-primary shadow-sm" : "border-border hover:border-primary/50"
            }`}
            onClick={() => setAbaAtiva(imp)}
          >
            <div className={`p-2.5 rounded-lg ${impostoColors[imp]}`}>
              {imp === "ORIGEM" ? <Globe className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats[imp]}</p>
              <p className="text-xs text-muted-foreground">{imp === "ORIGEM" ? "Origem" : `CST ${imp}`}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Aviso SINIEF */}
      {abaAtiva === "ORIGEM" && (
        <div className="flex items-start gap-3 bg-primary/5 border border-primary/20 rounded-xl p-4">
          <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="text-sm text-foreground">
            <p className="font-semibold mb-1">Ajuste SINIEF 20/2012 — Tabela A (Origem da Mercadoria)</p>
            <p className="text-muted-foreground">
              O código de origem compõe o <strong>primeiro dígito</strong> do CST na NF-e (campo <code className="bg-muted px-1 rounded text-xs">orig</code>).
              Exemplo: CST <code className="bg-muted px-1 rounded text-xs">060</code> = Origem <strong>0</strong> (Nacional) + Tributação <strong>60</strong> (ICMS cobrado anteriormente por ST).
              Em vigor desde 01/01/2013.
            </p>
          </div>
        </div>
      )}

      {/* Tabs + Busca */}
      <Tabs value={abaAtiva} onValueChange={setAbaAtiva}>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <TabsList>
            <TabsTrigger value="ORIGEM">Origem</TabsTrigger>
            <TabsTrigger value="ICMS">ICMS / CSOSN</TabsTrigger>
            <TabsTrigger value="IPI">IPI</TabsTrigger>
            <TabsTrigger value="PIS">PIS</TabsTrigger>
            <TabsTrigger value="COFINS">COFINS</TabsTrigger>
          </TabsList>
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código ou descrição..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Aba Origem */}
        <TabsContent value="ORIGEM">
          <div className="text-sm text-muted-foreground mb-3">
            {origensFiltradas.length} código(s) de origem
          </div>
          <div className="border border-border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-24">Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-32">Tipo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {origensFiltradas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                      Nenhum código de origem encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  origensFiltradas.map((item) => (
                    <TableRow key={item.codigo}>
                      <TableCell className="font-mono font-semibold text-foreground text-lg">{item.codigo}</TableCell>
                      <TableCell className="text-foreground">{item.descricao}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            item.codigo === "0" || parseInt(item.codigo) >= 3
                              ? parseInt(item.codigo) === 1 || parseInt(item.codigo) === 2 || parseInt(item.codigo) === 6 || parseInt(item.codigo) === 7
                                ? "border-destructive/50 text-destructive"
                                : "border-primary/50 text-primary"
                              : "border-destructive/50 text-destructive"
                          }`}
                        >
                          {["1", "2", "6", "7"].includes(item.codigo) ? "Estrangeira" : "Nacional"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Abas CST */}
        {(["ICMS", "IPI", "PIS", "COFINS"] as const).map((imp) => (
          <TabsContent key={imp} value={imp}>
            <div className="text-sm text-muted-foreground mb-3">
              {filtrados.length} código(s) encontrado(s)
            </div>
            <div className="border border-border rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-24">Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-28">Imposto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                        Nenhum CST encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtrados.map((item, idx) => (
                      <TableRow key={`${item.imposto}-${item.codigo}-${idx}`}>
                        <TableCell className="font-mono font-semibold text-foreground">{item.codigo}</TableCell>
                        <TableCell className="text-foreground">{item.descricao}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{item.imposto}</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}