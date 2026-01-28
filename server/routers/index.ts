/**
 * Router Index
 * 
 * Re-exports all domain routers for easy importing.
 * This allows the main routers.ts to import from a single location.
 */

export { dashboardRouter } from './dashboard';
export { agentsRouter, AgentSchema } from './agents';
export { clientsRouter, ClientSchema, ClientUpdateSchema } from './clients';
export { tasksRouter, TaskSchema } from './tasks';
export { mywfgRouter } from './mywfg';
export { cashFlowRouter } from './cashFlow';
export { syncLogsRouter } from './syncLogs';
export { pendingPoliciesRouter } from './pendingPolicies';
export { inforcePoliciesRouter } from './inforcePolicies';
export { credentialsRouter } from './credentials';
export { productionRouter, ProductionRecordSchema } from './production';
export { teamRouter } from './team';
export { alertsRouter } from './alerts';
