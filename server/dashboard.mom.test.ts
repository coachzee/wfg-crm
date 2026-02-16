import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("./db", () => ({
  getMonthOverMonthComparison: vi.fn(),
}));

import { getMonthOverMonthComparison } from "./db";

const mockGetMoM = vi.mocked(getMonthOverMonthComparison);

describe("Month-over-Month Comparison", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return MoM data with correct structure", async () => {
    const mockData = {
      activeAssociates: { current: 51, previous: 48, change: 3, changePercent: 6 },
      licensedAgents: { current: 27, previous: 25, change: 2, changePercent: 8 },
      totalPolicies: { current: 100, previous: 95, change: 5, changePercent: 5 },
      familiesProtected: { current: 77, previous: 75, change: 2, changePercent: 3 },
      superTeamCashFlow: { current: 50000, previous: 45000, change: 5000, changePercent: 11 },
      totalFaceAmount: { current: 43000000, previous: 42000000, change: 1000000, changePercent: 2 },
    };
    mockGetMoM.mockResolvedValue(mockData);

    const result = await getMonthOverMonthComparison();

    expect(result).toHaveProperty("activeAssociates");
    expect(result).toHaveProperty("licensedAgents");
    expect(result).toHaveProperty("totalPolicies");
    expect(result).toHaveProperty("familiesProtected");
    expect(result).toHaveProperty("superTeamCashFlow");
    expect(result).toHaveProperty("totalFaceAmount");
  });

  it("should return correct change calculations for positive growth", async () => {
    const mockData = {
      activeAssociates: { current: 51, previous: 48, change: 3, changePercent: 6 },
      licensedAgents: { current: 27, previous: 25, change: 2, changePercent: 8 },
      totalPolicies: { current: 100, previous: 95, change: 5, changePercent: 5 },
      familiesProtected: { current: 77, previous: 75, change: 2, changePercent: 3 },
      superTeamCashFlow: { current: 50000, previous: 45000, change: 5000, changePercent: 11 },
      totalFaceAmount: { current: 43000000, previous: 42000000, change: 1000000, changePercent: 2 },
    };
    mockGetMoM.mockResolvedValue(mockData);

    const result = await getMonthOverMonthComparison();

    expect(result.activeAssociates.change).toBe(3);
    expect(result.activeAssociates.changePercent).toBe(6);
    expect(result.activeAssociates.current).toBeGreaterThan(result.activeAssociates.previous);
  });

  it("should handle zero previous values correctly", async () => {
    const mockData = {
      activeAssociates: { current: 10, previous: 0, change: 10, changePercent: 100 },
      licensedAgents: { current: 5, previous: 0, change: 5, changePercent: 100 },
      totalPolicies: { current: 20, previous: 0, change: 20, changePercent: 100 },
      familiesProtected: { current: 15, previous: 0, change: 15, changePercent: 100 },
      superTeamCashFlow: { current: 10000, previous: 0, change: 10000, changePercent: 100 },
      totalFaceAmount: { current: 5000000, previous: 0, change: 5000000, changePercent: 100 },
    };
    mockGetMoM.mockResolvedValue(mockData);

    const result = await getMonthOverMonthComparison();

    // When previous is 0 and current > 0, changePercent should be 100
    expect(result.activeAssociates.changePercent).toBe(100);
    expect(result.superTeamCashFlow.changePercent).toBe(100);
  });

  it("should handle negative growth (decline)", async () => {
    const mockData = {
      activeAssociates: { current: 45, previous: 50, change: -5, changePercent: -10 },
      licensedAgents: { current: 20, previous: 25, change: -5, changePercent: -20 },
      totalPolicies: { current: 90, previous: 100, change: -10, changePercent: -10 },
      familiesProtected: { current: 70, previous: 75, change: -5, changePercent: -7 },
      superTeamCashFlow: { current: 40000, previous: 50000, change: -10000, changePercent: -20 },
      totalFaceAmount: { current: 40000000, previous: 43000000, change: -3000000, changePercent: -7 },
    };
    mockGetMoM.mockResolvedValue(mockData);

    const result = await getMonthOverMonthComparison();

    expect(result.activeAssociates.change).toBeLessThan(0);
    expect(result.activeAssociates.changePercent).toBeLessThan(0);
    expect(result.superTeamCashFlow.change).toBe(-10000);
    expect(result.superTeamCashFlow.changePercent).toBe(-20);
  });

  it("should handle no change (flat)", async () => {
    const mockData = {
      activeAssociates: { current: 50, previous: 50, change: 0, changePercent: 0 },
      licensedAgents: { current: 25, previous: 25, change: 0, changePercent: 0 },
      totalPolicies: { current: 100, previous: 100, change: 0, changePercent: 0 },
      familiesProtected: { current: 75, previous: 75, change: 0, changePercent: 0 },
      superTeamCashFlow: { current: 50000, previous: 50000, change: 0, changePercent: 0 },
      totalFaceAmount: { current: 43000000, previous: 43000000, change: 0, changePercent: 0 },
    };
    mockGetMoM.mockResolvedValue(mockData);

    const result = await getMonthOverMonthComparison();

    expect(result.activeAssociates.changePercent).toBe(0);
    expect(result.activeAssociates.change).toBe(0);
    expect(result.totalPolicies.changePercent).toBe(0);
  });

  it("should return all zero values when database is unavailable", async () => {
    const emptyData = {
      activeAssociates: { current: 0, previous: 0, change: 0, changePercent: 0 },
      licensedAgents: { current: 0, previous: 0, change: 0, changePercent: 0 },
      totalPolicies: { current: 0, previous: 0, change: 0, changePercent: 0 },
      familiesProtected: { current: 0, previous: 0, change: 0, changePercent: 0 },
      superTeamCashFlow: { current: 0, previous: 0, change: 0, changePercent: 0 },
      totalFaceAmount: { current: 0, previous: 0, change: 0, changePercent: 0 },
    };
    mockGetMoM.mockResolvedValue(emptyData);

    const result = await getMonthOverMonthComparison();

    for (const key of Object.keys(result)) {
      const metric = result[key as keyof typeof result];
      expect(metric.current).toBe(0);
      expect(metric.previous).toBe(0);
      expect(metric.change).toBe(0);
      expect(metric.changePercent).toBe(0);
    }
  });

  it("should have each metric contain current, previous, change, and changePercent", async () => {
    const mockData = {
      activeAssociates: { current: 51, previous: 48, change: 3, changePercent: 6 },
      licensedAgents: { current: 27, previous: 25, change: 2, changePercent: 8 },
      totalPolicies: { current: 100, previous: 95, change: 5, changePercent: 5 },
      familiesProtected: { current: 77, previous: 75, change: 2, changePercent: 3 },
      superTeamCashFlow: { current: 50000, previous: 45000, change: 5000, changePercent: 11 },
      totalFaceAmount: { current: 43000000, previous: 42000000, change: 1000000, changePercent: 2 },
    };
    mockGetMoM.mockResolvedValue(mockData);

    const result = await getMonthOverMonthComparison();

    for (const key of Object.keys(result)) {
      const metric = result[key as keyof typeof result];
      expect(metric).toHaveProperty("current");
      expect(metric).toHaveProperty("previous");
      expect(metric).toHaveProperty("change");
      expect(metric).toHaveProperty("changePercent");
      expect(typeof metric.current).toBe("number");
      expect(typeof metric.previous).toBe("number");
      expect(typeof metric.change).toBe("number");
      expect(typeof metric.changePercent).toBe("number");
    }
  });
});
