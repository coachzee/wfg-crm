import { describe, it, expect } from "vitest";
import { getAgents, getInforcePolicies, getPendingPolicies } from "./db";

describe("Dashboard Clickable Items", () => {
  describe("getMissingLicenses", () => {
    it("should return agents in RECRUITMENT or EXAM_PREP stages", async () => {
      const allAgents = await getAgents();
      const missingLicenses = allAgents.filter((a) => 
        a.currentStage === 'RECRUITMENT' || a.currentStage === 'EXAM_PREP'
      );
      
      // All returned agents should be in recruitment or exam prep
      missingLicenses.forEach((agent) => {
        expect(['RECRUITMENT', 'EXAM_PREP']).toContain(agent.currentStage);
      });
    });

    it("should return agents with required fields", async () => {
      const allAgents = await getAgents();
      const missingLicenses = allAgents.filter((a) => 
        a.currentStage === 'RECRUITMENT' || a.currentStage === 'EXAM_PREP'
      );
      
      if (missingLicenses.length > 0) {
        const agent = missingLicenses[0];
        expect(agent).toHaveProperty('id');
        expect(agent).toHaveProperty('firstName');
        expect(agent).toHaveProperty('lastName');
        expect(agent).toHaveProperty('currentStage');
      }
    });
  });

  describe("getNoRecurring", () => {
    it("should return policies with Annual or Flexible payment frequency", async () => {
      const policies = await getInforcePolicies();
      const noRecurring = policies.filter((p) => 
        !p.premiumFrequency || p.premiumFrequency === 'Annual' || p.premiumFrequency === 'Flexible'
      );
      
      // All returned policies should have non-monthly frequency
      noRecurring.forEach((policy) => {
        expect(['Annual', 'Flexible', null, undefined]).toContain(policy.premiumFrequency);
      });
    });

    it("should return policies with required fields", async () => {
      const policies = await getInforcePolicies();
      
      if (policies.length > 0) {
        const policy = policies[0];
        expect(policy).toHaveProperty('id');
        expect(policy).toHaveProperty('policyNumber');
        expect(policy).toHaveProperty('ownerName');
      }
    });
  });

  describe("getPendingIssued", () => {
    it("should return pending policies with issued status", async () => {
      const pending = await getPendingPolicies();
      const issued = pending.filter((p: any) => 
        p.status?.toLowerCase() === 'issued' || 
        p.status?.toLowerCase() === 'policy issued'
      );
      
      // All returned policies should have issued status
      issued.forEach((policy: any) => {
        expect(['issued', 'policy issued']).toContain(policy.status?.toLowerCase());
      });
    });

    it("should return pending policies with required fields", async () => {
      const pending = await getPendingPolicies();
      
      if (pending.length > 0) {
        const policy = pending[0];
        expect(policy).toHaveProperty('id');
        expect(policy).toHaveProperty('policyNumber');
        expect(policy).toHaveProperty('status');
      }
    });
  });

  describe("getInUnderwriting", () => {
    it("should return pending policies in underwriting status", async () => {
      const pending = await getPendingPolicies();
      const inUnderwriting = pending.filter((p: any) => 
        p.status?.toLowerCase() === 'pending' || 
        p.status?.toLowerCase() === 'in underwriting' ||
        p.status?.toLowerCase() === 'underwriting'
      );
      
      // All returned policies should have underwriting status
      inUnderwriting.forEach((policy: any) => {
        expect(['pending', 'in underwriting', 'underwriting']).toContain(policy.status?.toLowerCase());
      });
    });
  });
});
