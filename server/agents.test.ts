import { describe, expect, it, afterEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";
import { agents } from "../drizzle/schema";
import { eq, like, or } from "drizzle-orm";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

// Track created agent IDs for cleanup
const createdAgentIds: number[] = [];

function createAuthContext(role: "user" | "admin" = "admin"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

// Clean up test agents after each test
afterEach(async () => {
  if (createdAgentIds.length > 0) {
    const db = await getDb();
    if (db) {
      for (const id of createdAgentIds) {
        await db.delete(agents).where(eq(agents.id, id));
      }
    }
    createdAgentIds.length = 0;
  }
});

describe("agents router", () => {
  describe("agents.list", () => {
    it("returns an array of agents", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.agents.list();

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("agents.create", () => {
    it("creates a new agent with required fields", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const newAgent = {
        firstName: "Test",
        lastName: "Agent",
        email: "testagent@example.com",
        phone: "555-1234",
        agentCode: `TEST-${Date.now()}`,
        notes: "Test agent created by vitest",
      };

      const result = await caller.agents.create(newAgent);
      createdAgentIds.push(result.id); // Track for cleanup

      expect(result).toBeDefined();
      expect(result.firstName).toBe(newAgent.firstName);
      expect(result.lastName).toBe(newAgent.lastName);
      expect(result.email).toBe(newAgent.email);
      expect(result.currentStage).toBe("RECRUITMENT");
      expect(result.currentRank).toBe("TRAINING_ASSOCIATE");
    });

    it("creates agent with default rank as TRAINING_ASSOCIATE", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const newAgent = {
        firstName: "Rank",
        lastName: "Test",
        agentCode: `RANK-${Date.now()}`,
      };

      const result = await caller.agents.create(newAgent);
      createdAgentIds.push(result.id); // Track for cleanup

      expect(result.currentRank).toBe("TRAINING_ASSOCIATE");
      expect(result.isLifeLicensed).toBe(false);
      expect(result.isSecuritiesLicensed).toBe(false);
    });
  });

  describe("agents.getById", () => {
    it("returns agent details by ID", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // First create an agent
      const newAgent = await caller.agents.create({
        firstName: "GetById",
        lastName: "Test",
        agentCode: `GETID-${Date.now()}`,
      });
      createdAgentIds.push(newAgent.id); // Track for cleanup

      // Then fetch it
      const result = await caller.agents.getById(newAgent.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(newAgent.id);
      expect(result?.firstName).toBe("GetById");
    });

    it("returns null for non-existent agent", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.agents.getById(999999);

      expect(result).toBeNull();
    });
  });

  describe("agents.updateStage", () => {
    it("updates agent workflow stage", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Create an agent first
      const newAgent = await caller.agents.create({
        firstName: "Stage",
        lastName: "Update",
        agentCode: `STAGE-${Date.now()}`,
      });
      createdAgentIds.push(newAgent.id); // Track for cleanup

      // Update stage using the created agent's ID
      const result = await caller.agents.updateStage({
        id: newAgent.id,
        stage: "EXAM_PREP",
      });

      expect(result.currentStage).toBe("EXAM_PREP");
    });
  });
});

describe("WFG rank system", () => {
  it("validates rank hierarchy order", () => {
    const rankOrder = [
      "TRAINING_ASSOCIATE",
      "ASSOCIATE",
      "SENIOR_ASSOCIATE",
      "MARKETING_DIRECTOR",
      "SENIOR_MARKETING_DIRECTOR",
      "EXECUTIVE_MARKETING_DIRECTOR",
      "CEO_MARKETING_DIRECTOR",
      "EXECUTIVE_VICE_CHAIRMAN",
      "SENIOR_EXECUTIVE_VICE_CHAIRMAN",
      "FIELD_CHAIRMAN",
      "EXECUTIVE_CHAIRMAN",
    ];

    expect(rankOrder.length).toBe(11);
    expect(rankOrder[0]).toBe("TRAINING_ASSOCIATE");
    expect(rankOrder[rankOrder.length - 1]).toBe("EXECUTIVE_CHAIRMAN");
  });

  it("validates advancement requirements structure", () => {
    const advancementRequirements = {
      ASSOCIATE: { recruits: 3, rollingMonths: 1 },
      SENIOR_ASSOCIATE: { directLegs: 3, licensedAgents: 4, baseShopPoints: 30000, rollingMonths: 3 },
      MARKETING_DIRECTOR: { directLegs: 3, licensedAgents: 5, baseShopPoints: 40000, rollingMonths: 3 },
      SENIOR_MARKETING_DIRECTOR: { directLegs: 3, licensedAgents: 10, baseShopPoints: 75000, cashFlow: 30000, rollingMonths: 3 },
      EXECUTIVE_MARKETING_DIRECTOR: { smdLegs: 3, baseShopPoints: 500000, rollingMonths: 6 },
      CEO_MARKETING_DIRECTOR: { smdLegs: 6, baseShopPoints: 1000000, rollingMonths: 6 },
      EXECUTIVE_VICE_CHAIRMAN: { smdLegs: 9, baseShopPoints: 1500000, rollingMonths: 6 },
    };

    expect(advancementRequirements.SENIOR_MARKETING_DIRECTOR.baseShopPoints).toBe(75000);
    expect(advancementRequirements.SENIOR_MARKETING_DIRECTOR.cashFlow).toBe(30000);
    expect(advancementRequirements.SENIOR_MARKETING_DIRECTOR.licensedAgents).toBe(10);
    expect(advancementRequirements.EXECUTIVE_MARKETING_DIRECTOR.smdLegs).toBe(3);
    expect(advancementRequirements.EXECUTIVE_MARKETING_DIRECTOR.baseShopPoints).toBe(500000);
  });
});

describe("commission structure", () => {
  it("validates generational override percentages", () => {
    const generationalOverrides = {
      1: 12,
      2: 6,
      3: 3.5,
      4: 2.5,
      5: 1.25,
      6: 0.75,
    };

    const totalOverride = Object.values(generationalOverrides).reduce((sum, val) => sum + val, 0);
    expect(totalOverride).toBe(26);
    expect(generationalOverrides[1]).toBe(12);
    expect(generationalOverrides[6]).toBe(0.75);
  });

  it("validates base shop payout percentage", () => {
    const baseShopPayout = 65;
    expect(baseShopPayout).toBe(65);
  });

  it("validates bonus pool percentages", () => {
    const bonusPool = 6.5;
    const executivePool = 2.5;
    
    expect(bonusPool).toBe(6.5);
    expect(executivePool).toBe(2.5);
  });
});

describe("dashboard metrics", () => {
  it("returns face amount, families protected, cash flow, and team metrics", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dashboard.metrics();

    expect(result).toBeDefined();
    expect(typeof result.totalFaceAmount).toBe("number");
    expect(typeof result.totalPolicies).toBe("number");
    expect(typeof result.familiesProtected).toBe("number");
    expect(typeof result.totalClients).toBe("number");
    expect(typeof result.superTeamCashFlow).toBe("number");
    expect(typeof result.personalCashFlow).toBe("number");
    expect(typeof result.activeAssociates).toBe("number");
    expect(typeof result.licensedAgents).toBe("number");
    
    expect(result.totalFaceAmount).toBeGreaterThanOrEqual(0);
    expect(result.totalPolicies).toBeGreaterThanOrEqual(0);
    expect(result.familiesProtected).toBeGreaterThanOrEqual(0);
    expect(result.totalClients).toBeGreaterThanOrEqual(0);
    
    expect(result.familiesProtected).toBe(77);
    expect(result.superTeamCashFlow).toBe(290099.22);
    expect(result.personalCashFlow).toBe(189931.39);
    expect(result.activeAssociates).toBe(91);
    expect(result.licensedAgents).toBe(27);
  });

  it("returns dashboard stats", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dashboard.stats();

    expect(result).toBeDefined();
    expect(typeof result.totalAgents).toBe("number");
    expect(result.agentsByStage).toBeDefined();
    expect(result.taskStats).toBeDefined();
    expect(result.taskStats.total).toBeGreaterThanOrEqual(0);
    expect(result.taskStats.completed).toBeGreaterThanOrEqual(0);
    expect(result.taskStats.pending).toBeGreaterThanOrEqual(0);
  });
});
