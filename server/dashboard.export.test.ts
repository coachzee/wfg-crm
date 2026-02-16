import { describe, expect, it } from "vitest";

// Test the export utility functions directly (these are pure functions)
// We test the CSV generation logic and date range filtering logic

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatMonthYear(monthYear: string): string {
  const [month, year] = monthYear.split('/');
  return `${MONTH_NAMES[parseInt(month)]} 20${year}`;
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface CashFlowData {
  monthYear: string;
  superTeamCashFlow: number;
  personalCashFlow: number;
}

function generateCSV(data: CashFlowData[], superTeamTotal: number, personalTotal: number, rangeLabel: string): string {
  const lines: string[] = [];
  lines.push("WFG Cash Flow Report");
  lines.push(`Period: ${rangeLabel || "All Time"}`);
  lines.push(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);
  lines.push("");
  lines.push("Month,Super Team Cash Flow,Personal Cash Flow,Total");
  for (const row of data) {
    const total = row.superTeamCashFlow + row.personalCashFlow;
    lines.push(`${formatMonthYear(row.monthYear)},${row.superTeamCashFlow.toFixed(2)},${row.personalCashFlow.toFixed(2)},${total.toFixed(2)}`);
  }
  lines.push("");
  lines.push(`TOTAL,${superTeamTotal.toFixed(2)},${personalTotal.toFixed(2)},${(superTeamTotal + personalTotal).toFixed(2)}`);
  return lines.join("\n");
}

function parseMonthYear(monthYear: string): Date {
  const [month, year] = monthYear.split("/");
  return new Date(parseInt(`20${year}`), parseInt(month) - 1, 1);
}

function filterByDateRange(data: CashFlowData[], from: Date | undefined, to: Date | undefined): CashFlowData[] {
  if (!from && !to) return data;
  return data.filter((item) => {
    const itemDate = parseMonthYear(item.monthYear);
    if (from && itemDate < from) return false;
    if (to && itemDate > to) return false;
    return true;
  });
}

const SAMPLE_DATA: CashFlowData[] = [
  { monthYear: "1/25", superTeamCashFlow: 15000.50, personalCashFlow: 5000.25 },
  { monthYear: "2/25", superTeamCashFlow: 18000.00, personalCashFlow: 6000.00 },
  { monthYear: "3/25", superTeamCashFlow: 22000.75, personalCashFlow: 7500.50 },
  { monthYear: "4/25", superTeamCashFlow: 19500.00, personalCashFlow: 6800.00 },
  { monthYear: "5/25", superTeamCashFlow: 25000.00, personalCashFlow: 8200.00 },
  { monthYear: "6/25", superTeamCashFlow: 21000.00, personalCashFlow: 7100.00 },
];

describe("CSV Export Generation", () => {
  it("generates valid CSV with correct headers", () => {
    const csv = generateCSV(SAMPLE_DATA, 120501.25, 40600.75, "Jan 2025 - Jun 2025");
    const lines = csv.split("\n");

    expect(lines[0]).toBe("WFG Cash Flow Report");
    expect(lines[1]).toBe("Period: Jan 2025 - Jun 2025");
    expect(lines[3]).toBe(""); // blank line
    expect(lines[4]).toBe("Month,Super Team Cash Flow,Personal Cash Flow,Total");
  });

  it("generates correct data rows", () => {
    const csv = generateCSV(SAMPLE_DATA, 120501.25, 40600.75, "Jan 2025 - Jun 2025");
    const lines = csv.split("\n");

    // First data row (line 5)
    expect(lines[5]).toBe("Jan 2025,15000.50,5000.25,20000.75");
    // Second data row (line 6)
    expect(lines[6]).toBe("Feb 2025,18000.00,6000.00,24000.00");
  });

  it("generates correct totals row", () => {
    const csv = generateCSV(SAMPLE_DATA, 120501.25, 40600.75, "Jan 2025 - Jun 2025");
    const lines = csv.split("\n");

    const totalsLine = lines[lines.length - 1];
    expect(totalsLine).toBe("TOTAL,120501.25,40600.75,161102.00");
  });

  it("handles empty data gracefully", () => {
    const csv = generateCSV([], 0, 0, "");
    const lines = csv.split("\n");

    expect(lines[0]).toBe("WFG Cash Flow Report");
    expect(lines[1]).toBe("Period: All Time");
    const totalsLine = lines[lines.length - 1];
    expect(totalsLine).toBe("TOTAL,0.00,0.00,0.00");
  });

  it("handles single row data", () => {
    const singleRow = [SAMPLE_DATA[0]];
    const csv = generateCSV(singleRow, 15000.50, 5000.25, "Jan 2025");
    const lines = csv.split("\n");

    expect(lines[5]).toBe("Jan 2025,15000.50,5000.25,20000.75");
    const totalsLine = lines[lines.length - 1];
    expect(totalsLine).toBe("TOTAL,15000.50,5000.25,20000.75");
  });
});

describe("Date Range Filtering", () => {
  it("returns all data when no date range is specified", () => {
    const result = filterByDateRange(SAMPLE_DATA, undefined, undefined);
    expect(result.length).toBe(6);
  });

  it("filters data by start date only", () => {
    const from = new Date(2025, 2, 1); // March 2025
    const result = filterByDateRange(SAMPLE_DATA, from, undefined);
    expect(result.length).toBe(4); // Mar, Apr, May, Jun
    expect(result[0].monthYear).toBe("3/25");
  });

  it("filters data by end date only", () => {
    const to = new Date(2025, 2, 1); // March 2025
    const result = filterByDateRange(SAMPLE_DATA, undefined, to);
    expect(result.length).toBe(3); // Jan, Feb, Mar
    expect(result[result.length - 1].monthYear).toBe("3/25");
  });

  it("filters data by both start and end date", () => {
    const from = new Date(2025, 1, 1); // Feb 2025
    const to = new Date(2025, 3, 1); // Apr 2025
    const result = filterByDateRange(SAMPLE_DATA, from, to);
    expect(result.length).toBe(3); // Feb, Mar, Apr
    expect(result[0].monthYear).toBe("2/25");
    expect(result[result.length - 1].monthYear).toBe("4/25");
  });

  it("returns empty array when range excludes all data", () => {
    const from = new Date(2026, 0, 1); // Jan 2026
    const to = new Date(2026, 5, 1); // Jun 2026
    const result = filterByDateRange(SAMPLE_DATA, from, to);
    expect(result.length).toBe(0);
  });

  it("returns single month when range is exact", () => {
    const from = new Date(2025, 2, 1); // March 1, 2025
    const to = new Date(2025, 2, 1); // March 1, 2025
    const result = filterByDateRange(SAMPLE_DATA, from, to);
    expect(result.length).toBe(1);
    expect(result[0].monthYear).toBe("3/25");
  });
});

describe("Utility Functions", () => {
  it("formatMonthYear converts MM/YY to readable format", () => {
    expect(formatMonthYear("1/25")).toBe("Jan 2025");
    expect(formatMonthYear("12/24")).toBe("Dec 2024");
    expect(formatMonthYear("6/25")).toBe("Jun 2025");
  });

  it("formatCurrency formats numbers correctly", () => {
    expect(formatCurrency(15000.50)).toBe("$15,000.50");
    expect(formatCurrency(0)).toBe("$0.00");
    expect(formatCurrency(1234567.89)).toBe("$1,234,567.89");
  });

  it("parseMonthYear creates correct Date objects", () => {
    const date = parseMonthYear("3/25");
    expect(date.getFullYear()).toBe(2025);
    expect(date.getMonth()).toBe(2); // March = 2 (0-indexed)
    expect(date.getDate()).toBe(1);
  });
});
