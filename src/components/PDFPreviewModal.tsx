import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X, Download, RotateCcw } from "lucide-react";
import { useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  htmlContent: string;
  title?: string;
}

export function PDFPreviewModal({ open, onClose, htmlContent, title = "Pré-visualização" }: Props) {
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [iframeEl, setIframeEl] = useState<HTMLIFrameElement | null>(null);

  const handlePrint = () => {
    if (!iframeEl?.contentWindow) return;
    iframeEl.contentWindow.print();
  };

  const handleDownloadPDF = () => {
    // Use browser print dialog with "Save as PDF" option
    handlePrint();
  };

  return (
    <Dialog open={open} onOpenChange={() => {/* block auto-close */}} modal>
      <DialogContent
        className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0 [&>button.absolute]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-4 py-3 border-b border-border flex flex-row items-center justify-between shrink-0">
          <DialogTitle className="text-base">{title}</DialogTitle>
          <div className="flex gap-2 items-center">
            <Button
              size="sm"
              variant={orientation === "portrait" ? "outline" : "secondary"}
              onClick={() => setOrientation(o => o === "portrait" ? "landscape" : "portrait")}
              title={`Orientação: ${orientation === "portrait" ? "Retrato" : "Paisagem"}`}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              {orientation === "portrait" ? "Retrato" : "Paisagem"}
            </Button>
            <Button size="sm" variant="outline" onClick={handleDownloadPDF} disabled={!htmlContent}>
              <Download className="h-4 w-4 mr-1" /> Baixar PDF
            </Button>
            <Button size="sm" onClick={handlePrint} disabled={!htmlContent}>
              <Printer className="h-4 w-4 mr-1" /> Imprimir
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-auto bg-muted/30 p-4 flex justify-center">
          <div className={`bg-white shadow-lg rounded-sm ${orientation === "portrait" ? "w-full max-w-[210mm] min-h-[297mm]" : "w-full max-w-[297mm] min-h-[210mm]"}`}>
            <iframe
              ref={setIframeEl}
              srcDoc={htmlContent}
              className="w-full h-full border-0"
              style={{ minHeight: "calc(85vh - 80px)" }}
              title="PDF Preview"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
