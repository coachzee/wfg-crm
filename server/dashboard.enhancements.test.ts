import { describe, expect, it, vi, beforeEach } from "vitest";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

// Mock the database module before importing routers
vi.mock("./db", () => ({
  getAgents: vi.fn().mockResolvedValue([
    { id: 1, firstName: "John", lastName: "Doe", currentStage: "NET_LICENSED", currentRank: "Associate" },
    { id: 2, firstName: "Jane", lastName: "Smith", currentStage: "LICENSED", currentRank: "Associate" },
    { id: 3, firstName: "Bob", lastName: "Jones", currentStage: "RECRUITMENT", currentRank: "Trainee" },
  ]),
  getWorkflowTasks: vi.fn().mockResolvedValue([
    { id: 1, completedAt: new Date(), dueDate: new Date() },
    { id: 2, completedAt: null, dueDate: new Date(Date.now() + 86400000) },
    { id: 3, completedAt: null, dueDate: new Date(Date.now() - 86400000) },
  ]),
  getLatestSyncLog: vi.fn().mockResolvedValue({ syncDate: new Date().toISOString() }),
  getDashboardMetrics: vi.fn().mockResolvedValue({
    activeAssociates: 91,
    licensedAgents: 27,
    totalFaceAmount: 43440000,
    familiesProtected: 77,
    superTeamCashFlow: 319600,
    netLicensedData: { totalNetLicensed: 6 },
    commissionOnHold: 0,
  }),
  getAllProductionRecords: vi.fn().mockResolvedValue([]),
  getMonthlyTeamCashFlow: vi.fn().mockResolvedValue([
    { monthYear: "2/25", month: 2, year: 2025, superTeamCashFlow: "15000.50", personalCashFlow: "5000.25" },
    { monthYear: "3/25", month: 3, year: 2025, superTeamCashFlow: "18000.00", personalCashFlow: "6000.00" },
    { monthYear: "4/25", month: 4, year: 2025, superTeamCashFlow: "22000.75", personalCashFlow: "7500.50" },
  ]),
  getPendingPolicies: vi.fn().mockResolvedValue([]),
  getInforcePolicies: vi.fn().mockResolvedValue([]),
  getPolicyAnniversaries: vi.fn().mockResolvedValue([]),
  getAnniversarySummary: vi.fn().mockResolvedValue({ upcoming: 0, thisWeek: 0, today: 0 }),
  createWorkflowTask: vi.fn().mockResolvedValue({ id: 1 }),
  getAllUsers: vi.fn().mockResolvedValue([]),
  getUserByOpenId: vi.fn().mockResolvedValue(null),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getDb: vi.fn(),
}));

// Mock email-tracking module
vi.mock("./email-tracking", () => ({
  getEmailTrackingStats: vi.fn().mockResolvedValue({}),
  getRecentEmailTracking: vi.fn().mockResolvedValue([]),
  getAnniversaryEmailStats: vi.fn().mockResolvedValue({}),
  getEmailsEligibleForResend: vi.fn().mockResolvedValue([]),
  getEmailByTrackingId: vi.fn().mockResolvedValue(null),
  markEmailResent: vi.fn().mockResolvedValue(undefined),
  scheduleEmail: vi.fn().mockResolvedValue(undefined),
  getScheduledEmails: vi.fn().mockResolvedValue([]),
  cancelScheduledEmail: vi.fn().mockResolvedValue(undefined),
  processScheduledEmails: vi.fn().mockResolvedValue(undefined),
}));

// Mock dynamic imports used in dashboard router
vi.mock("./mywfg-sync-data", () => ({
  getSyncStatus: vi.fn().mockReturnValue({ isRunning: false }),
  getPaymentCycleInfo: vi.fn().mockReturnValue({ currentCycle: "Q1" }),
  getRecentSyncLogs: vi.fn().mockReturnValue([]),
}));

vi.mock("./sync-service", () => ({
  runFullSync: vi.fn().mockResolvedValue({}),
  getLastSyncTime: vi.fn().mockReturnValue(null),
}));

vi.mock("./chargeback-notification", () => ({
  getCurrentTransamericaAlerts: vi.fn().mockReturnValue({ reversedPremiumPayments: [], eftRemovals: [] }),
  sendChargebackNotification: vi.fn().mockResolvedValue(true),
}));

vi.mock("./gmail-otp", () => ({
  getMyWFGCredentials: vi.fn().mockReturnValue({ email: "test@test.com", appPassword: "test" }),
  getTransamericaCredentials: vi.fn().mockReturnValue({ email: "test@test.com", appPassword: "test" }),
  verifyGmailCredentials: vi.fn().mockResolvedValue({ success: true }),
}));

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("dashboard.stats - lastUpdated timestamp", () => {
  it("returns lastUpdated as a UTC timestamp in the response", async () => {
    const { appRouter } = await import("./routers");
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const before = Date.now();
    const result = await caller.dashboard.stats();
    const after = Date.now();

    expect(result).toHaveProperty("lastUpdated");
    expect(typeof result.lastUpdated).toBe("number");
    expect(result.lastUpdated).toBeGreaterThanOrEqual(before);
    expect(result.lastUpdated).toBeLessThanOrEqual(after);
  });

  it("returns all expected stat fields alongside lastUpdated", async () => {
    const { appRouter } = await import("./routers");
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dashboard.stats();

    expect(result).toHaveProperty("totalAgents");
    expect(typeof result.totalAgents).toBe("number");
    expect(result.totalAgents).toBe(3);

    expect(result).toHaveProperty("agentsByStage");
    expect(result.agentsByStage.NET_LICENSED).toBe(1);
    expect(result.agentsByStage.LICENSED).toBe(1);
    expect(result.agentsByStage.RECRUITMENT).toBe(1);

    expect(result).toHaveProperty("taskStats");
    expect(result.taskStats.total).toBe(3);
    expect(result.taskStats.completed).toBe(1);
    expect(result.taskStats.pending).toBe(2);
    expect(result.taskStats.overdue).toBe(1);

    expect(result).toHaveProperty("lastSyncDate");
    expect(result).toHaveProperty("lastUpdated");
  });
});

describe("dashboard.monthlyCashFlow - date filtering data", () => {
  it("returns cash flow records with numeric values (not strings)", async () => {
    const { appRouter } = await import("./routers");
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dashboard.monthlyCashFlow();

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(3);

    for (const record of result) {
      expect(typeof record.superTeamCashFlow).toBe("number");
      expect(typeof record.personalCashFlow).toBe("number");
      expect(Number.isNaN(record.superTeamCashFlow)).toBe(false);
      expect(Number.isNaN(record.personalCashFlow)).toBe(false);
    }
  });

  it("correctly parses string cash flow values to numbers", async () => {
    const { appRouter } = await import("./routers");
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dashboard.monthlyCashFlow();

    // First record: "15000.50" should become 15000.5
    expect(result[0].superTeamCashFlow).toBe(15000.5);
    expect(result[0].personalCashFlow).toBe(5000.25);
    // Second record: "18000.00" should become 18000
    expect(result[1].superTeamCashFlow).toBe(18000);
    expect(result[1].personalCashFlow).toBe(6000);
  });

  it("returns monthYear in expected format", async () => {
    const { appRouter } = await import("./routers");
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dashboard.monthlyCashFlow();

    for (const record of result) {
      expect(record).toHaveProperty("monthYear");
      expect(typeof record.monthYear).toBe("string");
      // Should contain a slash separator
      expect(record.monthYear).toContain("/");
    }
  });
});

describe("dashboard.metrics - impact metrics data", () => {
  it("returns all expected metric fields", async () => {
    const { appRouter } = await import("./routers");
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dashboard.metrics();

    expect(result).toBeDefined();
    expect(result).toHaveProperty("activeAssociates");
    expect(result).toHaveProperty("licensedAgents");
    expect(result).toHaveProperty("totalFaceAmount");
    expect(result).toHaveProperty("familiesProtected");
    expect(result).toHaveProperty("superTeamCashFlow");
    expect(result.activeAssociates).toBe(91);
    expect(result.licensedAgents).toBe(27);
    expect(result.totalFaceAmount).toBe(43440000);
    expect(result.familiesProtected).toBe(77);
    expect(result.superTeamCashFlow).toBe(319600);
  });
});
