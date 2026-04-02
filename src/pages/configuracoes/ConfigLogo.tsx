import { useState, useRef, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Upload, Trash2, Image, Building2, Eye, ArrowLeft } from "lucide-react";
import {
  getGeneralLogo, setGeneralLogo, removeGeneralLogo,
  getEmpresaLogo, setEmpresaLogo, removeEmpresaLogo,
  readFileAsBase64,
} from "@/lib/logoUtils";

interface Empresa {
  id: string;
  nomeFantasia: string;
  razaoSocial: string;
  cnpj: string;
  selecionada?: boolean;
}

function getEmpresas(): Empresa[] {
  try {
    const stored = localStorage.getItem("empresas");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export default function ConfigLogo() {
  const navigate = useNavigate();
  const [generalLogo, setGeneralLogoState] = useState<string | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaLogos, setEmpresaLogos] = useState<Record<string, string | null>>({});
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);
  const generalInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setGeneralLogoState(getGeneralLogo());
    const emps = getEmpresas();
    setEmpresas(emps);
    const logos: Record<string, string | null> = {};
    emps.forEach(e => { logos[e.id] = getEmpresaLogo(e.id); });
    setEmpresaLogos(logos);
  }, []);

  const handleUploadGeneral = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await readFileAsBase64(file);
      setGeneralLogo(base64);
      setGeneralLogoState(base64);
      toast.success("Logo geral atualizado com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao carregar logo");
    }
    e.target.value = "";
  };

  const handleRemoveGeneral = () => {
    removeGeneralLogo();
    setGeneralLogoState(null);
    toast.success("Logo geral removido");
  };

  const handleUploadEmpresa = async (empresaId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await readFileAsBase64(file);
      setEmpresaLogo(empresaId, base64);
      setEmpresaLogos(prev => ({ ...prev, [empresaId]: base64 }));
      toast.success("Logo da empresa atualizado!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao carregar logo");
    }
    e.target.value = "";
  };

  const handleRemoveEmpresa = (empresaId: string) => {
    removeEmpresaLogo(empresaId);
    setEmpresaLogos(prev => ({ ...prev, [empresaId]: null }));
    toast.success("Logo da empresa removido");
  };

  return (
    <div className="page-container">
      <PageHeader title="Configuração de Logo" description="Configure o logotipo utilizado nos relatórios PDF, compartilhamento WhatsApp e no sistema." />

      <Tabs defaultValue="geral">
        <TabsList>
          <TabsTrigger value="geral" className="gap-2">
            <Image className="h-4 w-4" /> Logo Geral
          </TabsTrigger>
          <TabsTrigger value="empresas" className="gap-2">
            <Building2 className="h-4 w-4" /> Logo por Empresa
          </TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Logo Geral do Sistema</CardTitle>
              <CardDescription>
                Este logo será usado como padrão em todos os relatórios e documentos gerados pelo sistema.
                Formatos aceitos: PNG, JPG, SVG. Tamanho máximo: 2MB.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-6">
                <div className="w-48 h-48 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center bg-muted/30 overflow-hidden">
                  {generalLogo ? (
                    <img src={generalLogo} alt="Logo geral" className="max-w-full max-h-full object-contain p-2" />
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <Image className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      <p className="text-xs">Nenhum logo configurado</p>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <input
                    ref={generalInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml"
                    className="hidden"
                    onChange={handleUploadGeneral}
                  />
                  <Button onClick={() => generalInputRef.current?.click()} className="gap-2">
                    <Upload className="h-4 w-4" />
                    {generalLogo ? "Trocar Logo" : "Enviar Logo"}
                  </Button>
                  {generalLogo && (
                    <>
                      <Button variant="outline" onClick={() => setPreviewLogo(generalLogo)} className="gap-2 ml-2">
                        <Eye className="h-4 w-4" /> Visualizar
                      </Button>
                      <Button variant="destructive" onClick={handleRemoveGeneral} className="gap-2 ml-2">
                        <Trash2 className="h-4 w-4" /> Remover
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="empresas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Logo por Empresa</CardTitle>
              <CardDescription>
                Configure um logo específico para cada empresa cadastrada. O logo da empresa tem prioridade sobre o logo geral nos relatórios.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {empresas.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Nenhuma empresa cadastrada. Cadastre empresas em Cadastros → Empresas.
                </p>
              ) : (
                <div className="space-y-4">
                  {empresas.map(empresa => {
                    const logo = empresaLogos[empresa.id];
                    return (
                      <div key={empresa.id} className="flex items-center gap-4 p-4 border rounded-lg">
                        <div className="w-20 h-20 border border-dashed border-muted-foreground/30 rounded flex items-center justify-center bg-muted/20 overflow-hidden shrink-0">
                          {logo ? (
                            <img src={logo} alt={`Logo ${empresa.nomeFantasia}`} className="max-w-full max-h-full object-contain p-1" />
                          ) : (
                            <Image className="h-8 w-8 text-muted-foreground/30" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{empresa.nomeFantasia}</p>
                            {empresa.selecionada && <Badge variant="secondary" className="text-xs">Ativa</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">{empresa.cnpj}</p>
                          <p className="text-xs text-muted-foreground truncate">{empresa.razaoSocial}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <div>
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/svg+xml"
                              className="hidden"
                              id={`logo-emp-${empresa.id}`}
                              onChange={(e) => handleUploadEmpresa(empresa.id, e)}
                            />
                            <Button size="sm" variant="outline" onClick={() => document.getElementById(`logo-emp-${empresa.id}`)?.click()} className="gap-1">
                              <Upload className="h-3 w-3" />
                              {logo ? "Trocar" : "Enviar"}
                            </Button>
                          </div>
                          {logo && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => setPreviewLogo(logo)}>
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleRemoveEmpresa(empresa.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Modal */}
      {previewLogo && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center" onClick={() => setPreviewLogo(null)}>
          <div className="bg-background rounded-lg p-6 max-w-lg w-full mx-4 shadow-lg" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Pré-visualização do Logo</h3>
              <Button variant="ghost" size="sm" onClick={() => setPreviewLogo(null)}>✕</Button>
            </div>
            <div className="bg-muted/30 rounded-lg p-8 flex items-center justify-center">
              <img src={previewLogo} alt="Preview" className="max-w-full max-h-64 object-contain" />
            </div>
          </div>
        </div>
      )}
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate("/pdv")} className="gap-2"><ArrowLeft size={16} />Voltar</Button>
      </div>
    </div>
  );
}
