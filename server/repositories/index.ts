/**
 * Repositories Index
 * 
 * Re-exports all repository modules for easy importing.
 * Repositories handle database operations for specific domains.
 */

// Agent repository
export {
  initAgentsRepository,
  getAgents,
  getAgentById,
  createAgent,
  updateAgent,
  getAgentCashFlowHistory,
  getAllCashFlowRecords,
  getNetLicensedAgents,
  upsertCashFlowRecord,
  bulkUpsertCashFlowRecords,
  clearAllCashFlowRecords,
  getAgentContactInfo,
} from './agents';
export type { Agent, AgentCashFlowHistory } from './agents';

// Client repository
export {
  initClientsRepository,
  getClients,
  getClientById,
  createClient,
  updateClient,
  getClientEmailByName,
} from './clients';
export type { Client } from './clients';

// Task repository
export {
  initTasksRepository,
  getWorkflowTasks,
  createWorkflowTask,
  updateWorkflowTask,
  getTaskById,
  completeTask,
  getTaskStats,
} from './tasks';
export type { WorkflowTask } from './tasks';

// Dashboard repository
export {
  initDashboardRepository,
  getDashboardMetrics,
  getAgentStats,
  getProductionStats,
  getMonthlyTeamCashFlow,
  upsertMonthlyTeamCashFlow,
  bulkUpsertMonthlyTeamCashFlow,
  getCashFlowTotals,
} from './dashboard';
