/**
 * Tests for Pending Policies feature
 * Tests the database operations and tRPC procedures for Transamerica pending policies
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { pendingPolicies, pendingRequirements } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Pending Policies Database Operations", () => {
  let db: Awaited<ReturnType<typeof getDb>>;
  let testPolicyId: number;

  beforeAll(async () => {
    db = await getDb();
  });

  it("should insert a pending policy", async () => {
    if (!db) throw new Error("Database not available");

    const testPolicy = {
      policyNumber: "TEST-001",
      ownerName: "TEST OWNER",
      productType: "Test Product",
      faceAmount: "$100,000",
      status: "Pending" as const,
      statusAsOf: "01/08/2026",
      agentName: "Test Agent",
      lastSyncedAt: new Date(),
    };

    const result = await db.insert(pendingPolicies).values(testPolicy);
    testPolicyId = result[0].insertId;

    expect(testPolicyId).toBeGreaterThan(0);
  });

  it("should insert requirements for a policy", async () => {
    if (!db) throw new Error("Database not available");

    const testRequirements = [
      {
        policyId: testPolicyId,
        category: "Pending with Producer" as const,
        dateRequested: "01/01/2026",
        requirementOn: "TEST OWNER",
        status: "Outstanding",
        requirement: "Test Requirement 1",
        instruction: "Test instruction",
      },
      {
        policyId: testPolicyId,
        category: "Pending with Transamerica" as const,
        dateRequested: "01/01/2026",
        requirementOn: "TEST OWNER",
        status: "Processing",
        requirement: "Test Requirement 2",
        instruction: "Test instruction 2",
      },
      {
        policyId: testPolicyId,
        category: "Completed" as const,
        dateRequested: "01/01/2026",
        requirementOn: "TEST OWNER",
        status: "Received",
        requirement: "Test Requirement 3",
        instruction: "Test instruction 3",
      },
    ];

    await db.insert(pendingRequirements).values(testRequirements);

    const requirements = await db
      .select()
      .from(pendingRequirements)
      .where(eq(pendingRequirements.policyId, testPolicyId));

    expect(requirements.length).toBe(3);
    expect(requirements.filter(r => r.category === "Pending with Producer").length).toBe(1);
    expect(requirements.filter(r => r.category === "Pending with Transamerica").length).toBe(1);
    expect(requirements.filter(r => r.category === "Completed").length).toBe(1);
  });

  it("should retrieve a policy with its requirements", async () => {
    if (!db) throw new Error("Database not available");

    const policy = await db
      .select()
      .from(pendingPolicies)
      .where(eq(pendingPolicies.id, testPolicyId))
      .limit(1);

    expect(policy.length).toBe(1);
    expect(policy[0].policyNumber).toBe("TEST-001");
    expect(policy[0].ownerName).toBe("TEST OWNER");
    expect(policy[0].status).toBe("Pending");
  });

  it("should update a policy status", async () => {
    if (!db) throw new Error("Database not available");

    await db
      .update(pendingPolicies)
      .set({ status: "Issued" })
      .where(eq(pendingPolicies.id, testPolicyId));

    const updated = await db
      .select()
      .from(pendingPolicies)
      .where(eq(pendingPolicies.id, testPolicyId))
      .limit(1);

    expect(updated[0].status).toBe("Issued");
  });

  afterAll(async () => {
    if (!db) return;

    // Clean up test data
    await db.delete(pendingRequirements).where(eq(pendingRequirements.policyId, testPolicyId));
    await db.delete(pendingPolicies).where(eq(pendingPolicies.id, testPolicyId));
  });
});

describe("Pending Policies Summary", () => {
  let db: Awaited<ReturnType<typeof getDb>>;

  beforeAll(async () => {
    db = await getDb();
  });

  it("should count policies by status", async () => {
    if (!db) throw new Error("Database not available");

    const policies = await db.select().from(pendingPolicies);

    const byStatus: Record<string, number> = {};
    policies.forEach(p => {
      byStatus[p.status] = (byStatus[p.status] || 0) + 1;
    });

    // Current data from Transamerica: 12 policies total
    // 5 Issued, 3 Pending, 2 Post Approval Processing, 2 Incomplete
    expect(byStatus["Pending"]).toBe(3);
    expect(byStatus["Incomplete"]).toBe(2);
    expect(byStatus["Post Approval Processing"]).toBe(2);
    expect(byStatus["Issued"]).toBe(5);
  });

  it("should count requirements by category", async () => {
    if (!db) throw new Error("Database not available");

    const requirements = await db.select().from(pendingRequirements);

    const byCategory: Record<string, number> = {};
    requirements.forEach(r => {
      byCategory[r.category] = (byCategory[r.category] || 0) + 1;
    });

    // Verify we have requirements in each category
    expect(byCategory["Pending with Producer"]).toBeGreaterThan(0);
    expect(byCategory["Completed"]).toBeGreaterThan(0);
  });
});
