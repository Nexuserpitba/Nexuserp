/**
 * Universal export utilities: PDF, Excel (xlsx), WhatsApp sharing.
 */
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { printPDF, buildPrintTable, printCurrency } from "./printUtils";

// ========== Types ==========

export interface ExportColumn {
  header: string;
  key: string;
  align?: "left" | "right" | "center";
  format?: (value: any, row: any) => string;
}

export interface ExportOptions {
  title: string;
  subtitle?: string;
  filename: string;
  columns: ExportColumn[];
  data: Record<string, any>[];
  /** Optional summary rows at the bottom */
  summaryRows?: { label: string; value: string }[];
  /** Use thermal 80mm layout for printing */
  thermal?: boolean;
}

// ========== PDF Export ==========

export function exportPDF(options: ExportOptions & { thermal?: boolean }) {
  const { title, subtitle, columns, data, summaryRows, thermal } = options;

  const headers = columns.map(c => ({
    label: c.header,
    align: c.align ?? "left" as "left" | "right" | "center",
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

  printPDF({ title, subtitle, content, thermal });
}

// ========== Excel Export ==========

export async function exportExcel(options: ExportOptions) {
  const { columns, data, filename, title } = options;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(title.substring(0, 31));

  // Header row
  const headerRow = ws.addRow(columns.map(c => c.header));
  headerRow.eachCell(cell => {
    cell.font = { bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } };
  });

  // Data rows
  data.forEach(row => {
    ws.addRow(columns.map(col => {
      const val = row[col.key];
      return col.format ? col.format(val, row) : val ?? "";
    }));
  });

  // Auto-width columns
  ws.columns.forEach((col, i) => {
    const header = columns[i]?.header ?? "";
    let maxLen = header.length;
    data.forEach(row => {
      const val = row[columns[i].key];
      const str = columns[i].format ? columns[i].format!(val, row) : String(val ?? "");
      maxLen = Math.max(maxLen, str.length);
    });
    col.width = maxLen + 3;
  });

  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${filename}.xlsx`);
}

// ========== CSV Export ==========

export function exportCSV(options: ExportOptions) {
  const { columns, data, filename } = options;

  const header = columns.map(c => c.header).join(";") + "\n";
  const rows = data.map(row =>
    columns.map(col => {
      const val = row[col.key];
      const formatted = col.format ? col.format(val, row) : String(val ?? "");
      return `"${formatted.replace(/"/g, '""')}"`;
    }).join(";")
  ).join("\n");

  const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ========== WhatsApp Share ==========

export function shareWhatsApp(options: ExportOptions) {
  const { title, subtitle, columns, data, summaryRows } = options;
  const maxRows = 30; // WhatsApp message limit
  const limitedData = data.slice(0, maxRows);

  let text = `🔷 *NexusERP*\n`;
  text += `━━━━━━━━━━━━━━━━\n`;
  text += `📋 *${title}*\n`;
  text += `━━━━━━━━━━━━━━━━\n`;
  text += `📋 *${title}*\n`;
  if (subtitle) text += `📅 _${subtitle}_\n`;
  text += `━━━━━━━━━━━━━━━━\n\n`;

  // Build simple text table
  limitedData.forEach((row, idx) => {
    const line = columns
      .map(col => {
        const val = row[col.key];
        return `${col.header}: ${col.format ? col.format(val, row) : val ?? ""}`;
      })
      .join(" | ");
    text += `${idx + 1}. ${line}\n`;
  });

  if (data.length > maxRows) {
    text += `\n_... e mais ${data.length - maxRows} registros_\n`;
  }

  if (summaryRows?.length) {
    text += `\n━━━━━━━━━━━━━━━━\n`;
    text += `*📊 Resumo:*\n`;
    summaryRows.forEach(s => {
      text += `• ${s.label}: *${s.value}*\n`;
    });
  }

  text += `\n_Relatório gerado por NexusERP em ${new Date().toLocaleString("pt-BR")}_`;

  const encoded = encodeURIComponent(text);
  window.open(`https://wa.me/?text=${encoded}`, "_blank");
}

// ========== Helper ==========

export function formatBRL(value: number): string {
  return printCurrency(value);
}
