import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Download, Smartphone, Monitor, CheckCircle2, Share } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Instalar = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua));

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setIsInstalled(true));

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
           <img src="/logo-nexuserp.svg" alt="NexusERP" className="w-24 h-24 mx-auto mb-4" />
           <CardTitle className="text-2xl">Instalar NexusERP</CardTitle>
           <CardDescription>
             A tecnologia em suas mãos - acesso rápido direto da tela inicial.
           </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isInstalled ? (
            <div className="text-center space-y-3">
              <CheckCircle2 className="mx-auto text-green-500" size={48} />
              <p className="text-sm text-muted-foreground">O app já está instalado!</p>
              <Button onClick={() => navigate("/")} className="w-full">Abrir o sistema</Button>
            </div>
          ) : isIOS ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">No iPhone/iPad:</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Share size={20} className="text-primary shrink-0" />
                  <span>Toque no botão <strong>Compartilhar</strong> do Safari</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Download size={20} className="text-primary shrink-0" />
                  <span>Selecione <strong>"Adicionar à Tela de Início"</strong></span>
                </div>
              </div>
            </div>
          ) : deferredPrompt ? (
            <Button onClick={handleInstall} className="w-full gap-2" size="lg">
              <Download size={18} /> Instalar agora
            </Button>
          ) : (
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Abra no navegador do celular e toque em <strong>"Instalar"</strong> ou <strong>"Adicionar à tela inicial"</strong> no menu.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Smartphone size={14} /> Funciona offline
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Monitor size={14} /> Tela cheia
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Instalar;
