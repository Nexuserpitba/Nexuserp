import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Printer, FileSpreadsheet, MessageCircle, Eye, Receipt, Mail, Loader2 } from "lucide-react";
import { exportPDF, exportExcel, exportCSV, shareWhatsApp, type ExportOptions } from "@/lib/exportUtils";
import { generatePrintHTML, buildPrintTable } from "@/lib/printUtils";
import { PDFPreviewModal } from "@/components/PDFPreviewModal";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generateReportPdfAttachment } from "@/lib/reportPdf";

interface ExportButtonsProps {
  options: ExportOptions;
  inline?: boolean;
  hidePrint?: boolean;
  thermal?: boolean;
}

async function getInvokeErrorMessage(err: unknown): Promise<string> {
  if (err && typeof err === "object" && "context" in err) {
    const context = (err as { context?: { json?: () => Promise<any>; text?: () => Promise<string> } }).context;

    if (context?.json) {
      try {
        const payload = await context.json();
        if (typeof payload?.error === "string" && payload.error.trim()) {
          return payload.error;
        }
      } catch {
        // noop
      }
    }

    if (context?.text) {
      try {
        const text = await context.text();
        if (text?.trim()) {
          return text;
        }
      } catch {
        // noop
      }
    }
  }

  if (err instanceof Error && err.message) {
    return err.message;
  }

  return "Erro desconhecido ao enviar relatório por e-mail";
}

export function ExportButtons({ options, inline, hidePrint, thermal }: ExportButtonsProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHTML, setPreviewHTML] = useState("");
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  const handlePDF = () => {
    handlePreview();
  };

  const handleThermal = () => {
    exportPDF({ ...options, thermal: true });
    toast.success("Impressão térmica 80mm enviada!");
  };

  const handleExcel = async () => {
    await exportExcel(options);
    toast.success("Arquivo Excel exportado!");
  };

  const handleCSV = () => {
    exportCSV(options);
    toast.success("Arquivo CSV exportado!");
  };

  const handleWhatsApp = () => {
    shareWhatsApp(options);
  };

  const handlePreview = async () => {
    const { title, subtitle, columns, data, summaryRows } = options;

    const headers = columns.map(c => ({
      label: c.header,
      align: (c.align ?? "left") as "left" | "right" | "center",
    }));

    const rows = data.map(row => ({
      cells: columns.map(col => {
        const val = row[col.key];
        return col.format ? col.format(val, row) : String(val ?? "");
      }),
      className: row._rowClass ?? "",
    }));

    let content = buildPrintTable(headers, rows);

    if (summaryRows?.length) {
      content += `<div class="info-grid" style="margin-top:20px;">`;
      summaryRows.forEach(s => {
        content += `<div class="info-box"><div class="label">${s.label}</div><div class="value">${s.value}</div></div>`;
      });
      content += `</div>`;
    }

    const html = await generatePrintHTML({ title, subtitle, content });
    setPreviewHTML(html);
    setPreviewOpen(true);
  };

  const buildReportHtml = async (): Promise<string> => {
    const { title, subtitle, columns, data, summaryRows } = options;

    const headers = columns.map(c => ({
      label: c.header,
      align: (c.align ?? "left") as "left" | "right" | "center",
    }));

    const rows = data.map(row => ({
      cells: columns.map(col => {
        const val = row[col.key];
        return col.format ? col.format(val, row) : String(val ?? "");
      }),
      className: row._rowClass ?? "",
    }));

    let tableHtml = `<table style="width:100%;border-collapse:collapse;font-size:13px;">`;
    tableHtml += `<thead><tr>`;
    headers.forEach(h => {
      tableHtml += `<th style="border:1px solid #ddd;padding:8px 6px;background:#f5f5f5;text-align:${h.align};">${h.label}</th>`;
    });
    tableHtml += `</tr></thead><tbody>`;
    rows.forEach(r => {
      tableHtml += `<tr>`;
      r.cells.forEach((cell, i) => {
        tableHtml += `<td style="border:1px solid #ddd;padding:6px;text-align:${headers[i]?.align || 'left'};">${cell}</td>`;
      });
      tableHtml += `</tr>`;
    });
    tableHtml += `</tbody></table>`;

    let summaryHtml = "";
    if (summaryRows?.length) {
      summaryHtml = `<div style="display:flex;gap:16px;margin-top:16px;flex-wrap:wrap;">`;
      summaryRows.forEach(s => {
        summaryHtml += `<div style="background:#f8f9fa;border-radius:8px;padding:12px 16px;min-width:140px;"><div style="font-size:11px;color:#666;">${s.label}</div><div style="font-size:18px;font-weight:bold;">${s.value}</div></div>`;
      });
      summaryHtml += `</div>`;
    }

    return `<div style="font-family:Arial,sans-serif;max-width:900px;margin:0 auto;padding:20px;">
      <h2 style="color:#1e40af;margin-bottom:4px;">${title}</h2>
      ${subtitle ? `<p style="color:#666;margin-top:0;">${subtitle}</p>` : ''}
      ${summaryHtml}
      <div style="margin-top:16px;">${tableHtml}</div>
      <p style="color:#999;font-size:11px;margin-top:20px;">Relatório gerado automaticamente pelo NexusERP em ${new Date().toLocaleString('pt-BR')}</p>
    </div>`;
  };

  const handleSendEmail = async () => {
    if (!emailTo) { toast.error("Informe o e-mail de destino"); return; }
    setSendingEmail(true);
    try {
      const [html, pdfAttachment] = await Promise.all([
        buildReportHtml(),
        generateReportPdfAttachment(options),
      ]);

      const { data, error } = await supabase.functions.invoke("send-report-email", {
        body: {
          to: emailTo,
          subject: `Relatório: ${options.title}`,
          html,
          reportType: options.title,
          attachments: [pdfAttachment],
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      // Log to email history
      await supabase.from("email_send_history" as any).insert({
        destinatario: emailTo,
        assunto: `Relatório: ${options.title}`,
        tipo: "manual",
        status: "enviado",
      });
      toast.success(`Relatório enviado para ${emailTo}!`);
      setEmailDialogOpen(false);
      setEmailTo("");
    } catch (err: unknown) {
      const errorMessage = await getInvokeErrorMessage(err);
      try {
        await supabase.from("email_send_history" as any).insert({
          destinatario: emailTo,
          assunto: `Relatório: ${options.title}`,
          tipo: "manual",
          status: "falhou",
          erro: errorMessage,
        });
      } catch {
        // erro ignorado
      }
      toast.error("Falha ao enviar relatório por e-mail", { description: errorMessage });
    } finally {
      setSendingEmail(false);
    }
  };

  const emailDialog = (
    <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Mail size={18} /> Enviar Relatório por E-mail</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">O relatório <strong>{options.title}</strong> será enviado usando as configurações SMTP da empresa ativa.</p>
          <div>
            <Label>E-mail de destino *</Label>
            <Input type="email" value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="destinatario@email.com" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleSendEmail} disabled={sendingEmail || !emailTo}>
            {sendingEmail ? <Loader2 size={16} className="animate-spin mr-1" /> : <Mail size={16} className="mr-1" />}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (inline) {
    return (
      <div className="flex gap-1.5 flex-wrap">
        <Button variant="outline" size="sm" onClick={handlePreview}>
          <Eye className="h-4 w-4 mr-1" /> Visualizar
        </Button>
        <Button variant="outline" size="sm" onClick={handlePDF}>
          <Printer className="h-4 w-4 mr-1" /> PDF
        </Button>
        {thermal && (
          <Button variant="outline" size="sm" onClick={handleThermal}>
            <Receipt className="h-4 w-4 mr-1" /> Térmica
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={handleExcel}>
          <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
        </Button>
        <Button variant="outline" size="sm" onClick={handleWhatsApp}>
          <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
        </Button>
        <Button variant="outline" size="sm" onClick={() => setEmailDialogOpen(true)}>
          <Mail className="h-4 w-4 mr-1" /> E-mail
        </Button>
        <PDFPreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} htmlContent={previewHTML} title={options.title} />
        {emailDialog}
      </div>
    );
  }

  return (
    <div className="flex gap-1.5 items-center">
      {!hidePrint && (
        <Button variant="outline" size="sm" onClick={handlePreview} title="Pré-visualizar relatório antes de imprimir">
          <Eye className="h-4 w-4 mr-1" /> Visualizar
        </Button>
      )}
      {!hidePrint && (
        <Button variant="outline" size="sm" onClick={handlePDF} title="Imprimir relatório (escolha a impressora)">
          <Printer className="h-4 w-4 mr-1" /> Imprimir
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" /> Exportar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handlePreview}>
            <Eye className="h-4 w-4 mr-2" /> Pré-visualizar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handlePDF}>
            <Printer className="h-4 w-4 mr-2" /> Imprimir / PDF
          </DropdownMenuItem>
          {thermal && (
            <DropdownMenuItem onClick={handleThermal}>
              <Receipt className="h-4 w-4 mr-2" /> Impressão Térmica (80mm)
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel (.xlsx)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCSV}>
            <Download className="h-4 w-4 mr-2" /> CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleWhatsApp}>
            <MessageCircle className="h-4 w-4 mr-2" /> Enviar por WhatsApp
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setEmailDialogOpen(true)}>
            <Mail className="h-4 w-4 mr-2" /> Enviar por E-mail
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <PDFPreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} htmlContent={previewHTML} title={options.title} />
      {emailDialog}
    </div>
  );
}
