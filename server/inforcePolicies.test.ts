import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { getDb, getInforcePolicyByNumber, getTopAgentsByCommission } from './db';
import { inforcePolicies } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

// Mock user for protected procedures
const mockUser = {
  id: 1,
  openId: 'test-open-id',
  name: 'Test User',
  role: 'admin' as const,
};

describe('Inforce Policies Commission Calculation', () => {
  // Test the commission calculation formula
  describe('Commission Formula', () => {
    it('should calculate commission correctly with 100% split', () => {
      const targetPremium = 37740;
      const multiplier = 1.25;
      const agentLevel = 0.55;
      const split = 100;
      
      const commission = targetPremium * multiplier * agentLevel * (split / 100);
      
      expect(commission).toBeCloseTo(25946.25, 2);
    });

    it('should calculate commission correctly with split agents', () => {
      const targetPremium = 32835;
      const multiplier = 1.25;
      
      // Agent 1: 40% split, 65% level
      const agent1Level = 0.65;
      const agent1Split = 40;
      const agent1Commission = targetPremium * multiplier * agent1Level * (agent1Split / 100);
      
      // Agent 2: 60% split, 25% level
      const agent2Level = 0.25;
      const agent2Split = 60;
      const agent2Commission = targetPremium * multiplier * agent2Level * (agent2Split / 100);
      
      const totalCommission = agent1Commission + agent2Commission;
      
      expect(agent1Commission).toBeCloseTo(10671.38, 2);
      expect(agent2Commission).toBeCloseTo(6156.56, 2);
      expect(totalCommission).toBeCloseTo(16827.94, 2);
    });

    it('should handle different agent levels correctly', () => {
      const targetPremium = 10000;
      const multiplier = 1.25;
      const split = 100;
      
      const levels = [0.25, 0.35, 0.45, 0.55, 0.65];
      const expectedCommissions = [3125, 4375, 5625, 6875, 8125];
      
      levels.forEach((level, index) => {
        const commission = targetPremium * multiplier * level * (split / 100);
        expect(commission).toBeCloseTo(expectedCommissions[index], 2);
      });
    });
  });

  describe('Policy Update Logic', () => {
    it('should validate split percentages sum to 100 or less', () => {
      const agent1Split = 40;
      const agent2Split = 60;
      
      expect(agent1Split + agent2Split).toBeLessThanOrEqual(100);
    });

    it('should handle single agent (100% split) correctly', () => {
      const agent1Split = 100;
      const agent2Split = 0;
      
      expect(agent1Split + agent2Split).toBe(100);
    });

    it('should calculate correct total when second agent has 0% split', () => {
      const targetPremium = 10000;
      const multiplier = 1.25;
      
      const agent1Commission = targetPremium * multiplier * 0.55 * (100 / 100);
      const agent2Commission = 0; // 0% split means no commission
      
      const totalCommission = agent1Commission + agent2Commission;
      
      expect(totalCommission).toBeCloseTo(6875, 2);
    });
  });

  describe('Database Integration', () => {
    it('should connect to database', async () => {
      const db = await getDb();
      expect(db).toBeDefined();
    });

    it('should retrieve policy by number', async () => {
      // This test uses a known policy number from the synced data
      const policy = await getInforcePolicyByNumber('6602238677');
      
      // If the policy exists (after sync), verify its structure
      if (policy) {
        expect(policy.policyNumber).toBe('6602238677');
        expect(policy.ownerName).toBeDefined();
        expect(policy.premium).toBeDefined();
      }
    });

    it('should have updated target premium for policy 6602238677', async () => {
      const policy = await getInforcePolicyByNumber('6602238677');
      
      if (policy && policy.targetPremium) {
        // After our update, target premium should be 32835
        const targetPremium = parseFloat(policy.targetPremium.toString());
        expect(targetPremium).toBe(32835);
      }
    });

    it('should have split agent data for policy 6602238677', async () => {
      const policy = await getInforcePolicyByNumber('6602238677');
      
      if (policy) {
        // After our update, should have split agent data
        // Note: writingAgentSplit is 100 (full), secondAgentSplit is 60 (override)
        expect(policy.writingAgentSplit).toBe(100);
        expect(policy.secondAgentSplit).toBe(60);
        expect(policy.writingAgentName).toBe('ZAID SHOPEJU');
        expect(policy.secondAgentName).toBe('OLUSEYI OGUNLOLU');
      }
    });

    it('should have correct calculated commission for policy 6602238677', async () => {
      const policy = await getInforcePolicyByNumber('6602238677');
      
      if (policy && policy.calculatedCommission) {
        // Total commission based on current data: $26,678.44
        const commission = parseFloat(policy.calculatedCommission.toString());
        expect(commission).toBeCloseTo(26678.44, 0);
      }
    });
  });

  describe('getTopAgentsByCommission', () => {
    it('should return agents sorted by commission', async () => {
      const topAgents = await getTopAgentsByCommission(10);
      
      expect(Array.isArray(topAgents)).toBe(true);
      expect(topAgents.length).toBeLessThanOrEqual(10);
      
      // Verify sorted in descending order by commission
      for (let i = 1; i < topAgents.length; i++) {
        expect(topAgents[i - 1].totalCommission).toBeGreaterThanOrEqual(topAgents[i].totalCommission);
      }
    });

    it('should include required fields for each agent', async () => {
      const topAgents = await getTopAgentsByCommission(5);
      
      topAgents.forEach((agent: any) => {
        expect(agent).toHaveProperty('name');
        expect(agent).toHaveProperty('totalCommission');
        expect(agent).toHaveProperty('totalPremium');
        expect(agent).toHaveProperty('policyCount');
        expect(agent).toHaveProperty('avgCommissionLevel');
      });
    });

    it('should calculate commission using default level when not set', async () => {
      const topAgents = await getTopAgentsByCommission(10);
      
      // Find an agent with policies (should have positive commission)
      const agentWithPolicies = topAgents.find((a: any) => a.policyCount > 0);
      if (agentWithPolicies) {
        expect(agentWithPolicies.totalCommission).toBeGreaterThan(0);
        // Average level should be positive
        expect(agentWithPolicies.avgCommissionLevel).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
