import { describe, it, expect, beforeAll } from "vitest";
import { getPolicyAnniversaries, getAnniversarySummary } from "./db";

describe("Policy Anniversaries", () => {
  describe("getPolicyAnniversaries", () => {
    it("should return an array of policies with upcoming anniversaries", async () => {
      const anniversaries = await getPolicyAnniversaries(90);
      expect(Array.isArray(anniversaries)).toBe(true);
    });

    it("should include required fields in each anniversary record", async () => {
      const anniversaries = await getPolicyAnniversaries(90);
      
      if (anniversaries.length > 0) {
        const first = anniversaries[0];
        expect(first).toHaveProperty("id");
        expect(first).toHaveProperty("policyNumber");
        expect(first).toHaveProperty("ownerName");
        expect(first).toHaveProperty("anniversaryDate");
        expect(first).toHaveProperty("daysUntilAnniversary");
        expect(first).toHaveProperty("policyAge");
      }
    });

    it("should return policies sorted by days until anniversary (ascending)", async () => {
      const anniversaries = await getPolicyAnniversaries(90);
      
      if (anniversaries.length > 1) {
        for (let i = 1; i < anniversaries.length; i++) {
          expect(anniversaries[i].daysUntilAnniversary).toBeGreaterThanOrEqual(
            anniversaries[i - 1].daysUntilAnniversary
          );
        }
      }
    });

    it("should only return policies within the specified days ahead", async () => {
      const anniversaries = await getPolicyAnniversaries(30);
      
      for (const policy of anniversaries) {
        expect(policy.daysUntilAnniversary).toBeLessThanOrEqual(30);
        expect(policy.daysUntilAnniversary).toBeGreaterThanOrEqual(0);
      }
    });

    it("should return fewer or equal policies for shorter time periods", async () => {
      const week = await getPolicyAnniversaries(7);
      const month = await getPolicyAnniversaries(30);
      const quarter = await getPolicyAnniversaries(90);
      
      expect(week.length).toBeLessThanOrEqual(month.length);
      expect(month.length).toBeLessThanOrEqual(quarter.length);
    });
  });

  describe("getAnniversarySummary", () => {
    it("should return summary statistics", async () => {
      const summary = await getAnniversarySummary();
      
      expect(summary).not.toBeNull();
      if (summary) {
        expect(summary).toHaveProperty("thisWeek");
        expect(summary).toHaveProperty("thisMonth");
        expect(summary).toHaveProperty("next60Days");
        expect(summary).toHaveProperty("next90Days");
        expect(summary).toHaveProperty("upcomingAnniversaries");
      }
    });

    it("should have consistent counts across time periods", async () => {
      const summary = await getAnniversarySummary();
      
      if (summary) {
        expect(summary.thisWeek).toBeLessThanOrEqual(summary.thisMonth);
        expect(summary.thisMonth).toBeLessThanOrEqual(summary.next60Days);
        expect(summary.next60Days).toBeLessThanOrEqual(summary.next90Days);
      }
    });

    it("should include upcoming anniversaries array matching thisMonth count", async () => {
      const summary = await getAnniversarySummary();
      
      if (summary) {
        expect(Array.isArray(summary.upcomingAnniversaries)).toBe(true);
        expect(summary.upcomingAnniversaries.length).toBe(summary.thisMonth);
      }
    });
  });
});
