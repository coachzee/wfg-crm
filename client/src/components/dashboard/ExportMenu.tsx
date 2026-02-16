import { memo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";

interface CashFlowData {
  monthYear: string;
  superTeamCashFlow: number;
  personalCashFlow: number;
}

interface ExportMenuProps {
  data: CashFlowData[];
  superTeamTotal: number;
  personalTotal: number;
  rangeLabel: string;
}

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatMonthYear(monthYear: string): string {
  const [month, year] = monthYear.split('/');
  return `${MONTH_NAMES[parseInt(month)]} 20${year}`;
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function generateCSV(data: CashFlowData[], superTeamTotal: number, personalTotal: number, rangeLabel: string): string {
  const lines: string[] = [];
  
  // Header
  lines.push("WFG Cash Flow Report");
  lines.push(`Period: ${rangeLabel || "All Time"}`);
  lines.push(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);
  lines.push("");
  
  // Column headers
  lines.push("Month,Super Team Cash Flow,Personal Cash Flow,Total");
  
  // Data rows
  for (const row of data) {
    const total = row.superTeamCashFlow + row.personalCashFlow;
    lines.push(`${formatMonthYear(row.monthYear)},${row.superTeamCashFlow.toFixed(2)},${row.personalCashFlow.toFixed(2)},${total.toFixed(2)}`);
  }
  
  // Totals
  lines.push("");
  lines.push(`TOTAL,${superTeamTotal.toFixed(2)},${personalTotal.toFixed(2)},${(superTeamTotal + personalTotal).toFixed(2)}`);
  
  return lines.join("\n");
}

function generatePDFHTML(data: CashFlowData[], superTeamTotal: number, personalTotal: number, rangeLabel: string): string {
  const rows = data.map(row => {
    const total = row.superTeamCashFlow + row.personalCashFlow;
    return `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${formatMonthYear(row.monthYear)}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #3b82f6;">${formatCurrency(row.superTeamCashFlow)}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #10b981;">${formatCurrency(row.personalCashFlow)}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${formatCurrency(total)}</td>
      </tr>
    `;
  }).join("");

  const grandTotal = superTeamTotal + personalTotal;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Cash Flow Report</title>
      <style>
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #1f2937;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px 20px;
        }
        .header {
          border-bottom: 3px solid #3b82f6;
          padding-bottom: 16px;
          margin-bottom: 24px;
        }
        .header h1 {
          font-size: 24px;
          margin: 0 0 4px 0;
          color: #111827;
        }
        .header p {
          font-size: 14px;
          color: #6b7280;
          margin: 2px 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        thead th {
          background: #f3f4f6;
          padding: 10px 12px;
          text-align: left;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #6b7280;
          border-bottom: 2px solid #e5e7eb;
        }
        thead th:not(:first-child) {
          text-align: right;
        }
        .totals-row td {
          padding: 12px;
          font-weight: 700;
          border-top: 2px solid #1f2937;
          border-bottom: none;
        }
        .summary {
          display: flex;
          gap: 16px;
          margin-top: 24px;
        }
        .summary-card {
          flex: 1;
          padding: 16px;
          border-radius: 8px;
          text-align: center;
        }
        .summary-card.blue { background: #eff6ff; border: 1px solid #bfdbfe; }
        .summary-card.green { background: #ecfdf5; border: 1px solid #a7f3d0; }
        .summary-card.gray { background: #f9fafb; border: 1px solid #e5e7eb; }
        .summary-card .label { font-size: 12px; color: #6b7280; margin-bottom: 4px; }
        .summary-card .value { font-size: 20px; font-weight: 700; }
        .summary-card.blue .value { color: #3b82f6; }
        .summary-card.green .value { color: #10b981; }
        .summary-card.gray .value { color: #1f2937; }
        .footer {
          margin-top: 32px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
          font-size: 11px;
          color: #9ca3af;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Monthly Cash Flow Report</h1>
        <p>Period: ${rangeLabel || "All Time"}</p>
        <p>Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
      </div>

      <table>
        <thead>
          <tr>
            <th>Month</th>
            <th>Super Team</th>
            <th>Personal</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr class="totals-row">
            <td style="padding: 12px;">TOTAL</td>
            <td style="padding: 12px; text-align: right; color: #3b82f6;">${formatCurrency(superTeamTotal)}</td>
            <td style="padding: 12px; text-align: right; color: #10b981;">${formatCurrency(personalTotal)}</td>
            <td style="padding: 12px; text-align: right;">${formatCurrency(grandTotal)}</td>
          </tr>
        </tbody>
      </table>

      <div class="summary">
        <div class="summary-card blue">
          <div class="label">Super Team Cash Flow</div>
          <div class="value">${formatCurrency(superTeamTotal)}</div>
        </div>
        <div class="summary-card green">
          <div class="label">Personal Cash Flow</div>
          <div class="value">${formatCurrency(personalTotal)}</div>
        </div>
        <div class="summary-card gray">
          <div class="label">Grand Total</div>
          <div class="value">${formatCurrency(grandTotal)}</div>
        </div>
      </div>

      <div class="footer">
        WFG Agent & Client CRM &mdash; Wealth Builders Haven
      </div>
    </body>
    </html>
  `;
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

export const ExportMenu = memo(function ExportMenu({
  data,
  superTeamTotal,
  personalTotal,
  rangeLabel,
}: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState<"csv" | "pdf" | null>(null);

  const handleCSVExport = useCallback(() => {
    setIsExporting("csv");
    try {
      const csv = generateCSV(data, superTeamTotal, personalTotal, rangeLabel);
      const dateStr = new Date().toISOString().split("T")[0];
      downloadFile(csv, `cash-flow-report-${dateStr}.csv`, "text/csv;charset=utf-8;");
    } finally {
      setIsExporting(null);
      setIsOpen(false);
    }
  }, [data, superTeamTotal, personalTotal, rangeLabel]);

  const handlePDFExport = useCallback(() => {
    setIsExporting("pdf");
    try {
      const html = generatePDFHTML(data, superTeamTotal, personalTotal, rangeLabel);
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        // Give the browser time to render, then trigger print
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }
    } finally {
      setIsExporting(null);
      setIsOpen(false);
    }
  }, [data, superTeamTotal, personalTotal, rangeLabel]);

  if (!data || data.length === 0) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2.5 text-xs font-medium gap-1.5"
        >
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
