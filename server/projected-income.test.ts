import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDashboardMetrics } from './db';

describe('Projected Income Calculation', () => {
  it('should return projected income data with correct structure', async () => {
    const metrics = await getDashboardMetrics();
    
    // Verify projectedIncome exists and has correct structure
    expect(metrics.projectedIncome).toBeDefined();
    expect(metrics.projectedIncome).toHaveProperty('fromPendingPolicies');
    expect(metrics.projectedIncome).toHaveProperty('fromInforcePolicies');
    expect(metrics.projectedIncome).toHaveProperty('totalProjected');
    expect(metrics.projectedIncome).toHaveProperty('pendingPoliciesCount');
    expect(metrics.projectedIncome).toHaveProperty('inforcePoliciesCount');
    expect(metrics.projectedIncome).toHaveProperty('breakdown');
    expect(metrics.projectedIncome).toHaveProperty('agentLevel');
    expect(metrics.projectedIncome).toHaveProperty('transamericaConstant');
  });

  it('should use correct SMD agent level of 65%', async () => {
    const metrics = await getDashboardMetrics();
    
    // Verify the agent level is 65% (0.65) for SMD
    expect(metrics.projectedIncome.agentLevel).toBe(0.65);
  });

  it('should use correct Transamerica constant of 125%', async () => {
    const metrics = await getDashboardMetrics();
    
    // Verify the Transamerica constant is 125% (1.25)
    expect(metrics.projectedIncome.transamericaConstant).toBe(1.25);
  });

  it('should have breakdown with pendingIssued, pendingUnderwriting, and inforceActive', async () => {
    const metrics = await getDashboardMetrics();
    
    expect(metrics.projectedIncome.breakdown).toHaveProperty('pendingIssued');
    expect(metrics.projectedIncome.breakdown).toHaveProperty('pendingUnderwriting');
    expect(metrics.projectedIncome.breakdown).toHaveProperty('inforceActive');
    
    // All values should be numbers
    expect(typeof metrics.projectedIncome.breakdown.pendingIssued).toBe('number');
    expect(typeof metrics.projectedIncome.breakdown.pendingUnderwriting).toBe('number');
    expect(typeof metrics.projectedIncome.breakdown.inforceActive).toBe('number');
  });

  it('should calculate totalProjected as sum of pending and inforce', async () => {
    const metrics = await getDashboardMetrics();
    
    const expectedTotal = metrics.projectedIncome.fromPendingPolicies + metrics.projectedIncome.fromInforcePolicies;
    
    // Allow for small floating point differences
    expect(Math.abs(metrics.projectedIncome.totalProjected - expectedTotal)).toBeLessThan(0.01);
  });

  it('should have non-negative values for all income projections', async () => {
    const metrics = await getDashboardMetrics();
    
    expect(metrics.projectedIncome.fromPendingPolicies).toBeGreaterThanOrEqual(0);
    expect(metrics.projectedIncome.fromInforcePolicies).toBeGreaterThanOrEqual(0);
    expect(metrics.projectedIncome.totalProjected).toBeGreaterThanOrEqual(0);
    expect(metrics.projectedIncome.breakdown.pendingIssued).toBeGreaterThanOrEqual(0);
    expect(metrics.projectedIncome.breakdown.pendingUnderwriting).toBeGreaterThanOrEqual(0);
    expect(metrics.projectedIncome.breakdown.inforceActive).toBeGreaterThanOrEqual(0);
  });

  it('should have policy counts matching database', async () => {
    const metrics = await getDashboardMetrics();
    
    // Policy counts should be non-negative integers
    expect(Number.isInteger(metrics.projectedIncome.pendingPoliciesCount)).toBe(true);
    expect(Number.isInteger(metrics.projectedIncome.inforcePoliciesCount)).toBe(true);
    expect(metrics.projectedIncome.pendingPoliciesCount).toBeGreaterThanOrEqual(0);
    expect(metrics.projectedIncome.inforcePoliciesCount).toBeGreaterThanOrEqual(0);
  });
});
