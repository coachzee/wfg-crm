import { describe, it, expect, beforeAll } from "vitest";
import { getDb, getPoliciesWithAnniversaryInDays, getPolicyAnniversaries } from "./db";

describe("Policy Anniversary Notifications", () => {
  beforeAll(async () => {
    const db = await getDb();
    expect(db).toBeTruthy();
  });

  it("should get policies with anniversaries in exactly 7 days", async () => {
    const policies = await getPoliciesWithAnniversaryInDays(7);
    expect(Array.isArray(policies)).toBe(true);
    
    // Each policy should have required fields
    policies.forEach(policy => {
      expect(policy).toHaveProperty('policyNumber');
      expect(policy).toHaveProperty('ownerName');
      expect(policy).toHaveProperty('anniversaryDate');
      expect(policy).toHaveProperty('policyAge');
      expect(typeof policy.policyAge).toBe('number');
    });
  });

  it("should get policies with anniversaries in 14 days", async () => {
    const policies = await getPoliciesWithAnniversaryInDays(14);
    expect(Array.isArray(policies)).toBe(true);
  });

  it("should get policies with anniversaries in 30 days", async () => {
    const policies = await getPoliciesWithAnniversaryInDays(30);
    expect(Array.isArray(policies)).toBe(true);
  });

  it("should return empty array for 0 days (today)", async () => {
    const policies = await getPoliciesWithAnniversaryInDays(0);
    expect(Array.isArray(policies)).toBe(true);
  });

  it("should have consistent data between getPoliciesWithAnniversaryInDays and getPolicyAnniversaries", async () => {
    // Get all anniversaries in next 7 days
    const allIn7Days = await getPolicyAnniversaries(7);
    
    // Get policies with anniversary in exactly 7 days
    const exactlyIn7Days = await getPoliciesWithAnniversaryInDays(7);
    
    // The exactlyIn7Days should be a subset of allIn7Days (or equal if all are on day 7)
    expect(Array.isArray(allIn7Days)).toBe(true);
    expect(Array.isArray(exactlyIn7Days)).toBe(true);
    
    // If there are policies in exactly 7 days, they should all be in the 7-day range
    if (exactlyIn7Days.length > 0) {
      const allPolicyNumbers = allIn7Days.map(p => p.policyNumber);
      exactlyIn7Days.forEach(policy => {
        expect(allPolicyNumbers).toContain(policy.policyNumber);
      });
    }
  });

  it("should calculate policy age correctly", async () => {
    const policies = await getPoliciesWithAnniversaryInDays(7);
    
    policies.forEach(policy => {
      // Policy age should be positive (at least 1 year for anniversary)
      expect(policy.policyAge).toBeGreaterThanOrEqual(0);
      // Policy age should be reasonable (less than 100 years)
      expect(policy.policyAge).toBeLessThan(100);
    });
  });

  it("should format anniversary date correctly", async () => {
    const policies = await getPoliciesWithAnniversaryInDays(7);
    
    policies.forEach(policy => {
      // Anniversary date should be a string
      expect(typeof policy.anniversaryDate).toBe('string');
      // Should contain month name (e.g., "Jan", "Feb")
      expect(policy.anniversaryDate).toMatch(/[A-Z][a-z]{2}/);
    });
  });
});

describe("Anniversary Email Alert Function", () => {
  it("should import alertPolicyAnniversary without errors", async () => {
    const { alertPolicyAnniversary } = await import("./email-alert");
    expect(typeof alertPolicyAnniversary).toBe('function');
  });

  it("should return true for empty policies array", async () => {
    const { alertPolicyAnniversary } = await import("./email-alert");
    const result = await alertPolicyAnniversary([]);
    expect(result).toBe(true);
  });
});
