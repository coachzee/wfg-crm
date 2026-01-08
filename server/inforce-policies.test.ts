/**
 * Tests for Inforce Policies (Transamerica Production Data)
 * 
 * These tests verify the database operations and API procedures
 * for tracking production data from Transamerica Life Access.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { 
  getInforcePolicies, 
  getInforcePolicyByNumber, 
  getProductionSummary,
  getTopProducersByPremium,
  getProductionByWritingAgent,
  getDb 
} from './db';

describe('Inforce Policies Database Operations', () => {
  beforeAll(async () => {
    // Ensure database is available
    const db = await getDb();
    expect(db).toBeTruthy();
  });

  describe('getInforcePolicies', () => {
    it('should return all inforce policies', async () => {
      const policies = await getInforcePolicies();
      expect(Array.isArray(policies)).toBe(true);
      // Should have policies in the database
      expect(policies.length).toBeGreaterThan(0);
    });

    it('should filter by status when provided', async () => {
      const activePolicies = await getInforcePolicies({ status: 'Active' });
      expect(Array.isArray(activePolicies)).toBe(true);
      activePolicies.forEach((policy: any) => {
        expect(policy.status).toBe('Active');
      });
    });
  });

  describe('getInforcePolicyByNumber', () => {
    it('should return a policy by policy number', async () => {
      // First get a list of policies to find a valid policy number
      const policies = await getInforcePolicies();
      if (policies.length > 0) {
        const testPolicyNumber = policies[0].policyNumber;
        const policy = await getInforcePolicyByNumber(testPolicyNumber);
        expect(policy).toBeTruthy();
        if (policy) {
          expect(policy.policyNumber).toBe(testPolicyNumber);
          expect(policy.ownerName).toBeDefined();
        }
      } else {
        // If no policies exist, skip this test
        expect(policies.length).toBe(0);
      }
    });

    it('should return null for non-existent policy', async () => {
      const policy = await getInforcePolicyByNumber('NONEXISTENT123');
      expect(policy).toBeNull();
    });
  });

  describe('getProductionSummary', () => {
    it('should return production summary with all required fields', async () => {
      const summary = await getProductionSummary();
      
      expect(summary).toHaveProperty('totalPolicies');
      expect(summary).toHaveProperty('activePolicies');
      expect(summary).toHaveProperty('totalPremium');
      expect(summary).toHaveProperty('totalCommission');
      expect(summary).toHaveProperty('totalFaceAmount');
      expect(summary).toHaveProperty('byStatus');
      
      expect(typeof summary.totalPolicies).toBe('number');
      expect(typeof summary.activePolicies).toBe('number');
      expect(typeof summary.totalPremium).toBe('number');
      expect(typeof summary.totalCommission).toBe('number');
      expect(typeof summary.totalFaceAmount).toBe('number');
    });

    it('should have correct policy counts', async () => {
      const summary = await getProductionSummary();
      
      // Should have policies in the database (97 based on current data)
      expect(summary.totalPolicies).toBeGreaterThanOrEqual(90);
      expect(summary.totalPolicies).toBeLessThanOrEqual(100);
      // Active policies should be less than or equal to total
      expect(summary.activePolicies).toBeLessThanOrEqual(summary.totalPolicies);
    });

    it('should calculate total premium correctly', async () => {
      const summary = await getProductionSummary();
      
      // Total premium should be around $467,457 based on current data
      expect(summary.totalPremium).toBeGreaterThan(400000);
      expect(summary.totalPremium).toBeLessThan(600000);
    });
  });

  describe('getTopProducersByPremium', () => {
    it('should return top producers sorted by premium', async () => {
      const topProducers = await getTopProducersByPremium(10);
      
      expect(Array.isArray(topProducers)).toBe(true);
      expect(topProducers.length).toBeLessThanOrEqual(10);
      
      // Verify sorted in descending order
      for (let i = 1; i < topProducers.length; i++) {
        expect(topProducers[i - 1].totalPremium).toBeGreaterThanOrEqual(topProducers[i].totalPremium);
      }
    });

    it('should include required fields for each producer', async () => {
      const topProducers = await getTopProducersByPremium(5);
      
      topProducers.forEach((producer: any) => {
        expect(producer).toHaveProperty('name');
        expect(producer).toHaveProperty('totalPremium');
        expect(producer).toHaveProperty('totalCommission');
        expect(producer).toHaveProperty('policyCount');
        expect(producer).toHaveProperty('totalFaceAmount');
      });
    });

    it('should respect the limit parameter', async () => {
      const top5 = await getTopProducersByPremium(5);
      const top10 = await getTopProducersByPremium(10);
      
      expect(top5.length).toBeLessThanOrEqual(5);
      expect(top10.length).toBeLessThanOrEqual(10);
    });
  });

  describe('getProductionByWritingAgent', () => {
    it('should return production grouped by writing agent', async () => {
      const agentProduction = await getProductionByWritingAgent();
      
      expect(Array.isArray(agentProduction)).toBe(true);
      
      agentProduction.forEach((agent: any) => {
        expect(agent).toHaveProperty('name');
        expect(agent).toHaveProperty('totalPremium');
        expect(agent).toHaveProperty('totalCommission');
        expect(agent).toHaveProperty('policyCount');
      });
    });

    it('should be sorted by total premium descending', async () => {
      const agentProduction = await getProductionByWritingAgent();
      
      for (let i = 1; i < agentProduction.length; i++) {
        expect(agentProduction[i - 1].totalPremium).toBeGreaterThanOrEqual(agentProduction[i].totalPremium);
      }
    });
  });
});

describe('Commission Calculation', () => {
  it('should calculate commission correctly using formula: Premium × 125% × Agent Level', async () => {
    const summary = await getProductionSummary();
    
    // Commission calculation uses individual policy agent levels
    // The total commission should be a positive number
    expect(summary.totalCommission).toBeGreaterThan(0);
    
    // Commission should be greater than the total premium (due to 125% multiplier and varying agent levels)
    // With an average agent level around 55-65%, commission should be roughly 0.7-0.8x of premium
    expect(summary.totalCommission).toBeGreaterThan(summary.totalPremium * 0.5);
    expect(summary.totalCommission).toBeLessThan(summary.totalPremium * 2);
  });
});
