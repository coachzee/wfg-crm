/**
 * Seed Cash Flow Data
 * 
 * This script populates the agentCashFlowHistory table with initial data
 * from MyWFG Custom Reports - Personal Cash Flow YTD
 * 
 * Data source: MyWFG.com > MY BUSINESS > Custom Reports > Cash Flow (YTD)
 * Report period: January 2025 - December 2025
 * Last updated: January 5, 2026
 */

import { bulkUpsertCashFlowRecords } from './db';

// Cash Flow data from MyWFG Custom Reports (as of Jan 5, 2026)
// This is the complete list from the Personal Cash Flow YTD report
const cashFlowData = [
  // Note: SMD (Senior Marketing Director) and above are excluded from Net Licensed count
  // Only TA (Training Associate) and A (Associate) with $1,000+ qualify as Net Licensed
  { 
    agentCode: '73DXR', 
    agentName: 'Zaid Shopeju', 
    titleLevel: 'SMD', 
    uplineSMD: 'Adewale Adeleke',
    cashFlowAmount: '189931.39',
    cumulativeCashFlow: '189931.39',
    reportPeriod: 'January 2025 - December 2025'
  },
  { 
    agentCode: 'D0T7M', 
    agentName: 'Augustina Armstrong-Ogbonna', 
    titleLevel: 'SMD', 
    uplineSMD: 'Zaid Shopeju',
    cashFlowAmount: '57655.48',
    cumulativeCashFlow: '57655.48',
    reportPeriod: 'January 2025 - December 2025'
  },
  { 
    agentCode: 'E0D89', 
    agentName: 'Chinonyerem Nkemere', 
    titleLevel: 'A', 
    uplineSMD: 'Augustina Armstrong-Ogbonna',
    cashFlowAmount: '15071.31',
    cumulativeCashFlow: '15071.31',
    reportPeriod: 'January 2025 - December 2025'
  },
  { 
    agentCode: 'C9U9S', 
    agentName: 'Oluwatosin Adetona', 
    titleLevel: 'A', 
    uplineSMD: 'Zaid Shopeju',
    cashFlowAmount: '6488.12',
    cumulativeCashFlow: '6488.12',
    reportPeriod: 'January 2025 - December 2025'
  },
  { 
    agentCode: 'D6W3S', 
    agentName: 'Nonso Humphrey', 
    titleLevel: 'A', 
    uplineSMD: 'Zaid Shopeju',
    cashFlowAmount: '4993.62',
    cumulativeCashFlow: '4993.62',
    reportPeriod: 'January 2025 - December 2025'
  },
  { 
    agentCode: 'D3Y16', 
    agentName: 'Odion Imasuen', 
    titleLevel: 'A', 
    uplineSMD: 'Zaid Shopeju',
    cashFlowAmount: '3361.35',
    cumulativeCashFlow: '3361.35',
    reportPeriod: 'January 2025 - December 2025'
  },
  { 
    agentCode: '49AEA', 
    agentName: 'Francis Ogunlolu', 
    titleLevel: 'A', 
    uplineSMD: 'Zaid Shopeju',
    cashFlowAmount: '1802.15',
    cumulativeCashFlow: '1802.15',
    reportPeriod: 'January 2025 - December 2025'
  },
  { 
    agentCode: 'D3Z8L', 
    agentName: 'Renata Jeroe', 
    titleLevel: 'A', 
    uplineSMD: 'Augustina Armstrong-Ogbonna',
    cashFlowAmount: '1245.17',
    cumulativeCashFlow: '1245.17',
    reportPeriod: 'January 2025 - December 2025'
  },
  { 
    agentCode: 'C9F3Z', 
    agentName: 'Mercy Okonofua', 
    titleLevel: 'A', 
    uplineSMD: 'Zaid Shopeju',
    cashFlowAmount: '755.76',
    cumulativeCashFlow: '755.76',
    reportPeriod: 'January 2025 - December 2025'
  },
  { 
    agentCode: 'D3U63', 
    agentName: 'Ese Moses', 
    titleLevel: 'TA', 
    uplineSMD: 'Zaid Shopeju',
    cashFlowAmount: '155.96',
    cumulativeCashFlow: '155.96',
    reportPeriod: 'January 2025 - December 2025'
  },
  { 
    agentCode: '42EBU', 
    agentName: 'Clive Henry', 
    titleLevel: 'A', 
    uplineSMD: 'Zaid Shopeju',
    cashFlowAmount: '9.84',
    cumulativeCashFlow: '9.84',
    reportPeriod: 'January 2025 - December 2025'
  },
  { 
    agentCode: '16CKG', 
    agentName: 'Folashade Olaiya', 
    titleLevel: 'A', 
    uplineSMD: 'Zaid Shopeju',
    cashFlowAmount: '0.64',
    cumulativeCashFlow: '0.64',
    reportPeriod: 'January 2025 - December 2025'
  },
];

export async function seedCashFlowData() {
  console.log('[Seed] Starting cash flow data seed...');
  console.log(`[Seed] Inserting ${cashFlowData.length} agent cash flow records...`);
  
  try {
    const results = await bulkUpsertCashFlowRecords(cashFlowData);
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    console.log(`[Seed] Completed: ${successCount} success, ${failCount} failed`);
    
    // Calculate Net Licensed count
    const netLicensedCount = cashFlowData.filter(agent => {
      const cashFlow = parseFloat(agent.cumulativeCashFlow);
      const title = agent.titleLevel.toUpperCase();
      return cashFlow >= 1000 && (title === 'TA' || title === 'A');
    }).length;
    
    console.log(`[Seed] Net Licensed agents (TA/A with $1,000+): ${netLicensedCount}`);
    
    return { success: true, inserted: successCount, failed: failCount, netLicensedCount };
  } catch (error) {
    console.error('[Seed] Error seeding cash flow data:', error);
    return { success: false, error: String(error) };
  }
}

// Export the raw data for reference
export { cashFlowData };
