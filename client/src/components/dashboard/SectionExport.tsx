import { memo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";

export interface ExportColumn {
  key: string;
  header: string;
  format?: (value: any) => string;
}

export interface SectionExportProps {
  title: string;
  subtitle?: string;
  columns: ExportColumn[];
  data: Record<string, any>[];
  summaryRows?: { label: string; values: Record<string, string | number> }[];
  accentColor?: string;
}

function formatValue(value: any, format?: (v: any) => string): string {
  if (format) return format(value);
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return value.toLocaleString("en-US");
  return String(value);
}

function generateCSV(props: SectionExportProps): string {
  const { title, subtitle, columns, data, summaryRows } = props;
  const lines: string[] = [];

  lines.push(title);
  if (subtitle) lines.push(subtitle);
  lines.push(`Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`);
  lines.push("");

  // Column headers
  lines.push(columns.map((c) => c.header).join(","));

  // Data rows
  for (const row of data) {
    const cells = columns.map((col) => {
      const val = formatValue(row[col.key], col.format);
      // Escape commas and quotes in CSV
      if (val.includes(",") || val.includes('"') || val.includes("\n")) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    });
    lines.push(cells.join(","));
  }

  // Summary rows
  if (summaryRows && summaryRows.length > 0) {
    lines.push("");
    for (const sr of summaryRows) {
      const cells = columns.map((col, i) => {
        if (i === 0) return sr.label;
        return sr.values[col.key] !== undefined ? String(sr.values[col.key]) : "";
      });
      lines.push(cells.join(","));
    }
  }

  return lines.join("\n");
}

function generatePDFHTML(props: SectionExportProps): string {
  const { title, subtitle, columns, data, summaryRows, accentColor = "#3b82f6" } = props;

  const headerCells = columns
    .map(
      (col, i) =>
        `<th style="padding: 10px 12px; text-align: ${i === 0 ? "left" : "right"}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; border-bottom: 2px solid #e5e7eb; background: #f3f4f6;">${col.header}</th>`
    )
    .join("");

  const dataRows = data
    .map((row) => {
      const cells = columns
        .map(
          (col, i) =>
            `<td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: ${i === 0 ? "left" : "right"};">${formatValue(row[col.key], col.format)}</td>`
        )
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  const summaryHTML = summaryRows
    ? summaryRows
        .map((sr) => {
          const cells = columns
            .map((col, i) => {
              if (i === 0)
                return `<td style="padding: 12px; font-weight: 700; border-top: 2px solid #1f2937;">${sr.label}</td>`;
              return `<td style="padding: 12px; text-align: right; font-weight: 700; border-top: 2px solid #1f2937;">${sr.values[col.key] !== undefined ? sr.values[col.key] : ""}</td>`;
            })
            .join("");
          return `<tr>${cells}</tr>`;
        })
        .join("")
    : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    @media print { body { margin: 0; } .no-print { display: none; } }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; max-width: 900px; margin: 0 auto; padding: 40px 20px; }
    .header { border-bottom: 3px solid ${accentColor}; padding-bottom: 16px; margin-bottom: 24px; }
    .header h1 { font-size: 24px; margin: 0 0 4px 0; color: #111827; }
    .header p { font-size: 14px; color: #6b7280; margin: 2px 0; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${title}</h1>
    ${subtitle ? `<p>${subtitle}</p>` : ""}
    <p>Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
  </div>
  <table>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${dataRows}${summaryHTML}</tbody>
  </table>
  <div class="footer">WFG Agent & Client CRM &mdash; Wealth Builders Haven</div>
</body>
</html>`;
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const SectionExport = memo(function SectionExport(props: SectionExportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState<"csv" | "pdf" | null>(null);

  const filePrefix = props.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");

  const handleCSVExport = useCallback(() => {
    setIsExporting("csv");
    try {
      const csv = generateCSV(props);
      const dateStr = new Date().toISOString().split("T")[0];
      downloadFile(csv, `${filePrefix}-${dateStr}.csv`, "text/csv;charset=utf-8;");
    } finally {
      setIsExporting(null);
      setIsOpen(false);
    }
  }, [props, filePrefix]);

  const handlePDFExport = useCallback(() => {
    setIsExporting("pdf");
    try {
      const html = generatePDFHTML(props);
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
      }
    } finally {
      setIsExporting(null);
      setIsOpen(false);
    }
  }, [props]);

  if (!props.data || props.data.length === 0) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs font-medium gap-1.5">
          <Download className="h-3 w-3" />
          Export
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1" align="end">
        <button
          className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors text-left"
          onClick={handleCSVExport}
          disabled={isExporting !== null}
        >
          {isExporting === "csv" ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
          )}
          <div>
            <div className="font-medium">Export CSV</div>
            <div className="text-xs text-muted-foreground">Spreadsheet format</div>
          </div>
        </button>
        <button
          className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors text-left"
          onClick={handlePDFExport}
          disabled={isExporting !== null}
        >
          {isExporting === "pdf" ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <FileText className="h-4 w-4 text-red-500" />
          )}
          <div>
            <div className="font-medium">Export PDF</div>
            <div className="text-xs text-muted-foreground">Print-ready report</div>
          </div>
        </button>
      </PopoverContent>
    </Popover>
  );
});
