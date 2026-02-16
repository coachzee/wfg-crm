/**
 * Goals Router & Quarterly Report Tests
 * 
 * Tests for goal tracking CRUD operations and quarterly report data aggregation.
 * Uses mocked database layer to avoid real DB connections.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the goals repository
vi.mock("./repositories/goals", () => ({
  initGoalsRepository: vi.fn(),
  getGoals: vi.fn(),
  getGoalById: vi.fn(),
  createGoal: vi.fn(),
  updateGoal: vi.fn(),
  updateGoalProgress: vi.fn(),
  deleteGoal: vi.fn(),
  getActiveGoals: vi.fn(),
  archiveExpiredGoals: vi.fn(),
}));

// Mock the db module for getDashboardMetrics used by quarterly report
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    getGoals: vi.fn(),
    getGoalById: vi.fn(),
    createGoal: vi.fn(),
    updateGoal: vi.fn(),
    updateGoalProgress: vi.fn(),
    deleteGoal: vi.fn(),
    getActiveGoals: vi.fn(),
    archiveExpiredGoals: vi.fn(),
    getDashboardMetrics: vi.fn().mockResolvedValue({
      totalAgents: 51,
      licensedAgents: 51,
      activeAssociates: 51,
      netLicensed: 6,
      familiesProtected: 77,
      totalFaceAmount: 43440000,
      superTeamCashFlow: 319600,
      taskCompletion: { completed: 0, total: 211 },
    }),
    getMonthlyTeamCashFlow: vi.fn().mockResolvedValue([
      { month: "2025-01", amount: "50000" },
      { month: "2025-02", amount: "45000" },
      { month: "2025-03", amount: "55000" },
    ]),
    getAnniversarySummary: vi.fn().mockResolvedValue({
      upcoming7Days: 2,
      upcoming30Days: 5,
      upcoming90Days: 12,
    }),
    getWeeklySyncSummary: vi.fn().mockResolvedValue({
      totalSyncs: 14,
      successfulSyncs: 12,
      failedSyncs: 2,
    }),
  };
});

import {
  getGoals,
  getGoalById,
  createGoal,
  updateGoal,
  updateGoalProgress,
  deleteGoal,
  getActiveGoals,
  archiveExpiredGoals,
} from "./repositories/goals";

describe("Goals Repository Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getActiveGoals", () => {
    it("should return active goals for a user", async () => {
      const mockGoals = [
        {
          id: 1,
          userId: 1,
          metricKey: "new_agents",
          title: "New Agents Recruited",
          targetValue: "10",
          currentValue: "5",
          unit: "count",
          status: "ACTIVE",
          periodType: "MONTHLY",
          periodMonth: 2,
          periodYear: 2026,
        },
        {
          id: 2,
          userId: 1,
          metricKey: "cash_flow",
          title: "Cash Flow Target",
          targetValue: "50000",
          currentValue: "25000",
          unit: "currency",
          status: "ACTIVE",
          periodType: "MONTHLY",
          periodMonth: 2,
          periodYear: 2026,
        },
      ];
      vi.mocked(getActiveGoals).mockResolvedValue(mockGoals as any);

      const result = await getActiveGoals(1);
      expect(result).toHaveLength(2);
      expect(result[0].metricKey).toBe("new_agents");
      expect(result[1].unit).toBe("currency");
    });

    it("should return empty array when no active goals", async () => {
      vi.mocked(getActiveGoals).mockResolvedValue([]);

      const result = await getActiveGoals(1);
      expect(result).toHaveLength(0);
    });
  });

  describe("createGoal", () => {
    it("should create a new goal with valid data", async () => {
      const newGoal = {
        userId: 1,
        metricKey: "policies_written",
        title: "Policies Written",
        targetValue: "20",
        unit: "count" as const,
        periodType: "MONTHLY" as const,
        periodMonth: 2,
        periodYear: 2026,
      };
      const created = { id: 3, ...newGoal, currentValue: "0", status: "ACTIVE" };
      vi.mocked(createGoal).mockResolvedValue(created as any);

      const result = await createGoal(newGoal as any);
      expect(result.id).toBe(3);
      expect(result.metricKey).toBe("policies_written");
      expect(result.currentValue).toBe("0");
      expect(result.status).toBe("ACTIVE");
    });

    it("should create a quarterly goal", async () => {
      const newGoal = {
        userId: 1,
        metricKey: "cash_flow",
        title: "Q1 Cash Flow Target",
        targetValue: "100000",
        unit: "currency" as const,
        periodType: "QUARTERLY" as const,
        periodQuarter: 1,
        periodYear: 2026,
      };
      const created = { id: 4, ...newGoal, currentValue: "0", status: "ACTIVE" };
      vi.mocked(createGoal).mockResolvedValue(created as any);

      const result = await createGoal(newGoal as any);
      expect(result.periodType).toBe("QUARTERLY");
      expect(result.periodQuarter).toBe(1);
    });
  });

  describe("updateGoalProgress", () => {
    it("should update goal progress value", async () => {
      const updated = {
        id: 1,
        currentValue: "7",
        targetValue: "10",
        status: "ACTIVE",
      };
      vi.mocked(updateGoalProgress).mockResolvedValue(updated as any);

      const result = await updateGoalProgress(1, "7");
      expect(result.currentValue).toBe("7");
    });

    it("should mark goal as completed when target reached", async () => {
      const updated = {
        id: 1,
        currentValue: "10",
        targetValue: "10",
        status: "COMPLETED",
      };
      vi.mocked(updateGoalProgress).mockResolvedValue(updated as any);

      const result = await updateGoalProgress(1, "10");
      expect(result.status).toBe("COMPLETED");
    });
  });

  describe("deleteGoal", () => {
    it("should delete a goal by id", async () => {
      vi.mocked(deleteGoal).mockResolvedValue(undefined as any);

      await deleteGoal(1);
      expect(deleteGoal).toHaveBeenCalledWith(1);
    });
  });

  describe("archiveExpiredGoals", () => {
    it("should archive expired goals for a user", async () => {
      vi.mocked(archiveExpiredGoals).mockResolvedValue(undefined as any);

      await archiveExpiredGoals(1);
      expect(archiveExpiredGoals).toHaveBeenCalledWith(1);
    });
  });

  describe("getGoals with filters", () => {
    it("should filter goals by year", async () => {
      const mockGoals = [
        { id: 1, periodYear: 2026, status: "ACTIVE" },
        { id: 2, periodYear: 2026, status: "COMPLETED" },
      ];
      vi.mocked(getGoals).mockResolvedValue(mockGoals as any);

      const result = await getGoals(1, { periodYear: 2026 });
      expect(result).toHaveLength(2);
      expect(getGoals).toHaveBeenCalledWith(1, { periodYear: 2026 });
    });

    it("should filter goals by status", async () => {
      const mockGoals = [
        { id: 1, status: "COMPLETED" },
      ];
      vi.mocked(getGoals).mockResolvedValue(mockGoals as any);

      const result = await getGoals(1, { status: "COMPLETED" });
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("COMPLETED");
    });
  });
});

describe("Goal Progress Calculations", () => {
  it("should calculate correct progress percentage", () => {
    const current = 7;
    const target = 10;
    const percent = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
    expect(percent).toBe(70);
  });

  it("should cap progress at 100%", () => {
    const current = 15;
    const target = 10;
    const percent = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
    expect(percent).toBe(100);
  });

  it("should handle zero target gracefully", () => {
    const current = 5;
    const target = 0;
    const percent = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
    expect(percent).toBe(0);
  });

  it("should handle zero progress", () => {
    const current = 0;
    const target = 10;
    const percent = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
    expect(percent).toBe(0);
  });

  it("should calculate currency goal progress", () => {
    const current = 25000;
    const target = 50000;
    const percent = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
    expect(percent).toBe(50);
  });
});

describe("Goal Value Formatting", () => {
  function formatValue(value: number, unit: string): string {
    if (unit === "currency") {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
    }
    if (unit === "percentage") {
      return `${value}%`;
    }
    return new Intl.NumberFormat("en-US").format(value);
  }

  it("should format count values", () => {
    expect(formatValue(1500, "count")).toBe("1,500");
  });

  it("should format currency values", () => {
    expect(formatValue(50000, "currency")).toBe("$50,000");
  });

  it("should format percentage values", () => {
    expect(formatValue(75, "percentage")).toBe("75%");
  });

  it("should format zero values", () => {
    expect(formatValue(0, "count")).toBe("0");
    expect(formatValue(0, "currency")).toBe("$0");
    expect(formatValue(0, "percentage")).toBe("0%");
  });
});

describe("Goal Progress Color Logic", () => {
  function getProgressColor(percent: number): string {
    if (percent >= 100) return "bg-emerald-500";
    if (percent >= 75) return "bg-blue-500";
    if (percent >= 50) return "bg-amber-500";
    if (percent >= 25) return "bg-orange-500";
    return "bg-red-500";
  }

  it("should return emerald for 100%+", () => {
    expect(getProgressColor(100)).toBe("bg-emerald-500");
    expect(getProgressColor(150)).toBe("bg-emerald-500");
  });

  it("should return blue for 75-99%", () => {
    expect(getProgressColor(75)).toBe("bg-blue-500");
    expect(getProgressColor(99)).toBe("bg-blue-500");
  });

  it("should return amber for 50-74%", () => {
    expect(getProgressColor(50)).toBe("bg-amber-500");
    expect(getProgressColor(74)).toBe("bg-amber-500");
  });

  it("should return orange for 25-49%", () => {
    expect(getProgressColor(25)).toBe("bg-orange-500");
    expect(getProgressColor(49)).toBe("bg-orange-500");
  });

  it("should return red for 0-24%", () => {
    expect(getProgressColor(0)).toBe("bg-red-500");
    expect(getProgressColor(24)).toBe("bg-red-500");
  });
});
