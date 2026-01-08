// Script to seed cash flow data into the database
import { bulkUpsertCashFlowRecords, getNetLicensedAgents } from '../server/db.ts';

const cashFlowData = [
  { agentCode: '73DXR', agentName: 'Zaid Shopeju', titleLevel: 'SMD', uplineSMD: 'Adewale Adeleke', cashFlowAmount: '189931.39', cumulativeCashFlow: '189931.39', reportPeriod: 'January 2025 - December 2025' },
  { agentCode: 'D0T7M', agentName: 'Augustina Armstrong-Ogbonna', titleLevel: 'SMD', uplineSMD: 'Zaid Shopeju', cashFlowAmount: '57655.48', cumulativeCashFlow: '57655.48', reportPeriod: 'January 2025 - December 2025' },
  { agentCode: 'E0D89', agentName: 'Chinonyerem Nkemere', titleLevel: 'A', uplineSMD: 'Augustina Armstrong-Ogbonna', cashFlowAmount: '15071.31', cumulativeCashFlow: '15071.31', reportPeriod: 'January 2025 - December 2025' },
  { agentCode: 'C9U9S', agentName: 'Oluwatosin Adetona', titleLevel: 'A', uplineSMD: 'Zaid Shopeju', cashFlowAmount: '6488.12', cumulativeCashFlow: '6488.12', reportPeriod: 'January 2025 - December 2025' },
  { agentCode: 'D6W3S', agentName: 'Nonso Humphrey', titleLevel: 'A', uplineSMD: 'Zaid Shopeju', cashFlowAmount: '4993.62', cumulativeCashFlow: '4993.62', reportPeriod: 'January 2025 - December 2025' },
  { agentCode: 'D3Y16', agentName: 'Odion Imasuen', titleLevel: 'A', uplineSMD: 'Zaid Shopeju', cashFlowAmount: '3361.35', cumulativeCashFlow: '3361.35', reportPeriod: 'January 2025 - December 2025' },
  { agentCode: '49AEA', agentName: 'Francis Ogunlolu', titleLevel: 'A', uplineSMD: 'Zaid Shopeju', cashFlowAmount: '1802.15', cumulativeCashFlow: '1802.15', reportPeriod: 'January 2025 - December 2025' },
  { agentCode: 'D3Z8L', agentName: 'Renata Jeroe', titleLevel: 'A', uplineSMD: 'Augustina Armstrong-Ogbonna', cashFlowAmount: '1245.17', cumulativeCashFlow: '1245.17', reportPeriod: 'January 2025 - December 2025' },
  { agentCode: 'C9F3Z', agentName: 'Mercy Okonofua', titleLevel: 'A', uplineSMD: 'Zaid Shopeju', cashFlowAmount: '755.76', cumulativeCashFlow: '755.76', reportPeriod: 'January 2025 - December 2025' },
  { agentCode: 'D3U63', agentName: 'Ese Moses', titleLevel: 'TA', uplineSMD: 'Zaid Shopeju', cashFlowAmount: '155.96', cumulativeCashFlow: '155.96', reportPeriod: 'January 2025 - December 2025' },
  { agentCode: '42EBU', agentName: 'Clive Henry', titleLevel: 'A', uplineSMD: 'Zaid Shopeju', cashFlowAmount: '9.84', cumulativeCashFlow: '9.84', reportPeriod: 'January 2025 - December 2025' },
  { agentCode: '16CKG', agentName: 'Folashade Olaiya', titleLevel: 'A', uplineSMD: 'Zaid Shopeju', cashFlowAmount: '0.64', cumulativeCashFlow: '0.64', reportPeriod: 'January 2025 - December 2025' },
];

async function main() {
  console.log('Seeding cash flow data...');
  const results = await bulkUpsertCashFlowRecords(cashFlowData);
  console.log('Results:', results);
  
  console.log('\nFetching Net Licensed agents...');
  const netLicensed = await getNetLicensedAgents();
  console.log('Net Licensed:', netLicensed);
}

main().catch(console.error);
