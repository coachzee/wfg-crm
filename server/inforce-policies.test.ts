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
      // We seeded 95 policies
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
      // Use a known policy number from our seed data
      const policy = await getInforcePolicyByNumber('6602265832');
      expect(policy).toBeTruthy();
      if (policy) {
        expect(policy.policyNumber).toBe('6602265832');
        expect(policy.ownerName).toBe('ZAID SHOPEJU');
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
      
      // We seeded 95 policies
      expect(summary.totalPolicies).toBe(95);
      // Active policies should be less than or equal to total
      expect(summary.activePolicies).toBeLessThanOrEqual(summary.totalPolicies);
    });

    it('should calculate total premium correctly', async () => {
      const summary = await getProductionSummary();
      
      // Total premium should be around $674,380 based on seed data
      expect(summary.totalPremium).toBeGreaterThan(600000);
      expect(summary.totalPremium).toBeLessThan(700000);
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
    
    // Commission should be approximately: totalPremium × 1.25 × 0.55
    const expectedCommission = summary.totalPremium * 1.25 * 0.55;
    
    // Allow 1% tolerance for rounding differences
    const tolerance = expectedCommission * 0.01;
    expect(Math.abs(summary.totalCommission - expectedCommission)).toBeLessThan(tolerance);
  });
});
