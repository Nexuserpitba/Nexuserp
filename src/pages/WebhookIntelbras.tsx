import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, Trash2, Webhook } from "lucide-react";
import { toast } from "sonner";

interface WebhookEvent {
  id: number;
  timestamp: string;
  sourceIp: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

export default function WebhookIntelbras() {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:3001/api/webhook/intelbras/eventos");
      const data = await res.json();
      setEvents(data.eventos || []);
    } catch {
      toast.error("Erro ao buscar eventos. Verifique se o backend está rodando.");
    } finally {
      setLoading(false);
    }
  };

  const clearEvents = async () => {
    try {
      await fetch("http://localhost:3001/api/webhook/intelbras/eventos", { method: "DELETE" });
      setEvents([]);
      toast.success("Eventos limpos com sucesso");
    } catch {
      toast.error("Erro ao limpar eventos");
    }
  };

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Webhook className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Webhook Intelbras</h1>
            <p className="text-muted-foreground">Monitoramento de eventos do Defense IA Lite</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchEvents} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Button variant="destructive" onClick={clearEvents}>
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Endpoint
            <Badge variant="secondary">POST /api/webhook/intelbras</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <code className="bg-muted p-2 rounded text-sm block">
            http://localhost:3001/api/webhook/intelbras
          </code>
          <p className="text-sm text-muted-foreground mt-2">
            Configure este endereço no Defense IA Lite em Eventos → Ação → Comando URL HTTP → POST
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Eventos Recebidos ({events.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {events.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum evento recebido ainda
              </p>
            ) : (
              <div className="space-y-4">
                {events.map((event) => (
                  <Card key={event.id} className="bg-muted/50">
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start mb-2">
                        <Badge>{event.body?.event_type || "unknown"}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(event.timestamp).toLocaleString("pt-BR")}
                        </span>
                      </div>
                      <pre className="text-xs bg-background p-2 rounded overflow-auto max-h-40">
                        {JSON.stringify(event.body, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
