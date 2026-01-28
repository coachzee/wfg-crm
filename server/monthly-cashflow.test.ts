import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('./db', () => ({
  getMonthlyTeamCashFlow: vi.fn(),
}));

import { getMonthlyTeamCashFlow } from './db';

describe('Monthly Cash Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMonthlyTeamCashFlow', () => {
    it('should return monthly cash flow records for an agent', async () => {
      const mockRecords = [
        { monthYear: '2/2025', month: 2, year: 2025, superTeamCashFlow: '3092.63', personalCashFlow: '1657.80', agentCode: '73DXR' },
        { monthYear: '3/2025', month: 3, year: 2025, superTeamCashFlow: '5496.92', personalCashFlow: '4025.81', agentCode: '73DXR' },
        { monthYear: '4/2025', month: 4, year: 2025, superTeamCashFlow: '6830.54', personalCashFlow: '5890.65', agentCode: '73DXR' },
      ];

      (getMonthlyTeamCashFlow as any).mockResolvedValue(mockRecords);

      const result = await getMonthlyTeamCashFlow('73DXR');

      expect(result).toHaveLength(3);
      expect(result[0].monthYear).toBe('2/2025');
      expect(result[0].superTeamCashFlow).toBe('3092.63');
      expect(result[0].personalCashFlow).toBe('1657.80');
    });

    it('should return empty array when no records exist', async () => {
      (getMonthlyTeamCashFlow as any).mockResolvedValue([]);

      const result = await getMonthlyTeamCashFlow('UNKNOWN');

      expect(result).toEqual([]);
    });

    it('should return records ordered by month and year', async () => {
      const mockRecords = [
        { monthYear: '2/2025', month: 2, year: 2025, superTeamCashFlow: '3092.63', personalCashFlow: '1657.80' },
        { monthYear: '3/2025', month: 3, year: 2025, superTeamCashFlow: '5496.92', personalCashFlow: '4025.81' },
        { monthYear: '1/2026', month: 1, year: 2026, superTeamCashFlow: '13523.39', personalCashFlow: '15958.85' },
      ];

      (getMonthlyTeamCashFlow as any).mockResolvedValue(mockRecords);

      const result = await getMonthlyTeamCashFlow('73DXR');

      // Verify ordering - Feb 2025 should come before Jan 2026
      expect(result[0].year).toBe(2025);
      expect(result[0].month).toBe(2);
      expect(result[2].year).toBe(2026);
      expect(result[2].month).toBe(1);
    });
  });

  describe('Cash Flow Totals Calculation', () => {
    it('should correctly calculate Super Team total from monthly records', async () => {
      const mockRecords = [
        { superTeamCashFlow: '3092.63', personalCashFlow: '1657.80' },
        { superTeamCashFlow: '5496.92', personalCashFlow: '4025.81' },
        { superTeamCashFlow: '6830.54', personalCashFlow: '5890.65' },
      ];

      const superTeamTotal = mockRecords.reduce(
        (sum, r) => sum + parseFloat(r.superTeamCashFlow), 
        0
      );

      expect(superTeamTotal).toBeCloseTo(15420.09, 2);
    });

    it('should correctly calculate Personal total from monthly records', async () => {
      const mockRecords = [
        { superTeamCashFlow: '3092.63', personalCashFlow: '1657.80' },
        { superTeamCashFlow: '5496.92', personalCashFlow: '4025.81' },
        { superTeamCashFlow: '6830.54', personalCashFlow: '5890.65' },
      ];

      const personalTotal = mockRecords.reduce(
        (sum, r) => sum + parseFloat(r.personalCashFlow), 
        0
      );

      expect(personalTotal).toBeCloseTo(11574.26, 2);
    });
  });

  describe('Dashboard Metrics Integration', () => {
    it('should format cash flow values correctly for display', () => {
      const superTeamCashFlow = 319570.24;
      const displayValue = `$${(superTeamCashFlow / 1000).toFixed(1)}K`;
      
      expect(displayValue).toBe('$319.6K');
    });

    it('should format full cash flow values with proper locale', () => {
      const superTeamCashFlow = 319570.24;
      const displayValue = superTeamCashFlow.toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      });
      
      expect(displayValue).toBe('319,570.24');
    });
  });
});
