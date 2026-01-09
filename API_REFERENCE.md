# Wealth Builders Haven CRM - API Reference

**Version:** 1.0  
**Last Updated:** January 8, 2026  
**Author:** Manus AI

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Architecture](#api-architecture)
4. [Endpoints Reference](#endpoints-reference)
   - [Auth Router](#auth-router)
   - [Agents Router](#agents-router)
   - [Clients Router](#clients-router)
   - [Tasks Router](#tasks-router)
   - [Production Router](#production-router)
   - [Credentials Router](#credentials-router)
   - [Dashboard Router](#dashboard-router)
   - [Cash Flow Router](#cash-flow-router)
   - [Team Router](#team-router)
   - [Sync Logs Router](#sync-logs-router)
   - [Pending Policies Router](#pending-policies-router)
   - [Inforce Policies Router](#inforce-policies-router)
5. [Data Schemas](#data-schemas)
6. [Error Handling](#error-handling)
7. [Rate Limiting](#rate-limiting)
8. [Examples](#examples)

---

## Overview

The Wealth Builders Haven CRM API is built using **tRPC** (TypeScript Remote Procedure Call), providing end-to-end type safety between the client and server. All API endpoints are accessible through the `/api/trpc` base path.

### Key Characteristics

| Aspect | Description |
|--------|-------------|
| **Protocol** | tRPC over HTTP |
| **Base URL** | `/api/trpc` |
| **Authentication** | JWT-based session cookies |
| **Serialization** | SuperJSON (supports Date, BigInt, etc.) |
| **Type Safety** | Full TypeScript inference |

### Request Format

All tRPC requests follow this pattern:

```
GET /api/trpc/{procedure}?input={encodedInput}  # For queries
POST /api/trpc/{procedure}                       # For mutations
```

---

## Authentication

### Session Management

The API uses JWT-based session cookies for authentication. After successful login via OAuth, a session cookie is set that authenticates subsequent requests.

### Procedure Types

| Type | Description | Requires Auth |
|------|-------------|---------------|
| `publicProcedure` | Accessible without authentication | No |
| `protectedProcedure` | Requires valid session | Yes |
| `adminProcedure` | Requires admin role | Yes (admin only) |

### Authentication Flow

1. User initiates OAuth login via `/api/oauth/login`
2. OAuth callback at `/api/oauth/callback` sets session cookie
3. All subsequent requests include the session cookie automatically
4. Session can be verified via `auth.me` query

---

## API Architecture

### Router Structure

The API is organized into logical routers, each handling a specific domain:

```
appRouter
├── system          # System utilities (notifications)
├── auth            # Authentication & user management
├── agents          # Agent CRUD operations
├── clients         # Client CRUD operations
├── tasks           # Workflow task management
├── production      # Production records
├── credentials     # MyWFG credential storage
├── dashboard       # Dashboard analytics
├── cashFlow        # Cash flow records
├── team            # Team management (admin)
├── syncLogs        # Sync operation logs
├── pendingPolicies # Transamerica pending policies
└── inforcePolicies # Transamerica inforce policies
```

---

## Endpoints Reference

### Auth Router

Handles authentication and user session management.

#### `auth.me`

Returns the currently authenticated user or null.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth** | Public |
| **Input** | None |

**Response Schema:**

```typescript
{
  id: number;
  openId: string;
  name: string;
  email: string;
  avatar: string | null;
  role: "admin" | "user";
  createdAt: Date;
  updatedAt: Date;
} | null
```

#### `auth.logout`

Clears the session cookie and logs out the user.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth** | Public |
| **Input** | None |

**Response:**

```typescript
{ success: true }
```

#### `auth.listUsers`

Lists all users in the system.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth** | Protected |
| **Input** | None |

---

### Agents Router

Manages agent records and their workflow stages.

#### `agents.list`

Retrieves a list of agents with optional filtering.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth** | Protected |

**Input Schema:**

```typescript
{
  stage?: string;      // Filter by workflow stage
  isActive?: boolean;  // Filter by active status
}
```

**Response:** Array of Agent objects

#### `agents.getById`

Retrieves a single agent by ID.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth** | Protected |
| **Input** | `number` (agent ID) |

#### `agents.create`

Creates a new agent record.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth** | Protected |

**Input Schema:**

```typescript
{
  agentCode?: string;
  firstName: string;        // Required, min 1 char
  lastName: string;         // Required, min 1 char
  email?: string;           // Valid email format
  phone?: string;
  currentStage?: AgentStage;
  examDate?: Date;
  licenseNumber?: string;
  notes?: string;
}
```

**Agent Stages:**

| Stage | Description |
|-------|-------------|
| `RECRUITMENT` | Initial recruitment phase |
| `EXAM_PREP` | Preparing for licensing exam |
| `LICENSED` | Has obtained license |
| `PRODUCT_TRAINING` | Learning products |
| `BUSINESS_LAUNCH` | Launching business |
| `NET_LICENSED` | $1,000+ cash flow achieved |
| `CLIENT_TRACKING` | Active client management |
| `CHARGEBACK_PROOF` | Established, low chargeback risk |

#### `agents.update`

Updates an existing agent.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth** | Protected |

**Input:**

```typescript
{
  id: number;
  data: Partial<AgentSchema>
}
```

#### `agents.updateStage`

Updates only the agent's workflow stage.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth** | Protected |

**Input:**

```typescript
{
  id: number;
  stage: string;
}
```

---

### Clients Router

Manages client records.

#### `clients.list`

Retrieves clients, optionally filtered by agent.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth** | Protected |

**Input:**

```typescript
{
  agentId?: number;  // Filter by assigned agent
}
```

#### `clients.getById`

Retrieves a single client by ID.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth** | Protected |
| **Input** | `number` (client ID) |

#### `clients.create`

Creates a new client record.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth** | Protected |

**Input Schema:**

```typescript
{
  agentId: number;      // Required - assigned agent
  firstName: string;    // Required
  lastName: string;     // Required
  email?: string;
  phone?: string;
  address?: string;
  renewalDate?: Date;
  notes?: string;
}
```

#### `clients.update`

Updates an existing client.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth** | Protected |

**Input:**

```typescript
{
  id: number;
  data: Partial<ClientSchema>
}
```

---

### Tasks Router

Manages workflow tasks and follow-ups.

#### `tasks.list`

Retrieves tasks with optional filtering.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth** | Protected |

**Input:**

```typescript
{
  agentId?: number;
  clientId?: number;
  completed?: boolean;
}
```

#### `tasks.create`

Creates a new workflow task.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth** | Protected |

**Input Schema:**

```typescript
{
  agentId?: number;
  clientId?: number;
  taskType: TaskType;      // Required
  dueDate: Date;           // Required
  priority?: "LOW" | "MEDIUM" | "HIGH";
  description?: string;
}
```

**Task Types:**

| Type | Description |
|------|-------------|
| `EXAM_PREP_FOLLOW_UP` | Follow up on exam preparation |
| `LICENSE_VERIFICATION` | Verify license status |
| `PRODUCT_TRAINING` | Product training reminder |
| `BUSINESS_LAUNCH_PREP` | Business launch preparation |
| `RENEWAL_REMINDER` | Policy renewal reminder |
| `CHARGEBACK_MONITORING` | Monitor for chargebacks |
| `GENERAL_FOLLOW_UP` | General follow-up task |

#### `tasks.complete`

Marks a task as completed.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth** | Protected |
| **Input** | `number` (task ID) |

#### `tasks.update`

Updates an existing task.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth** | Protected |

---

### Production Router

Manages production records.

#### `production.list`

Retrieves all production records.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth** | Protected |
| **Input** | None |

#### `production.getByAgent`

Retrieves production records for a specific agent.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth** | Protected |
| **Input** | `number` (agent ID) |

#### `production.create`

Creates a new production record.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth** | Protected |

**Input:**

```typescript
{
  agentId: number;
  policyNumber: string;
  policyType: string;
  commissionAmount?: string;
  premiumAmount?: string;
  issueDate: Date;
}
```

---

### Credentials Router

Manages encrypted MyWFG credentials.

#### `credentials.get`

Retrieves credential metadata (not the actual credentials).

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth** | Protected |

**Response:**

```typescript
{
  id: number;
  isActive: boolean;
  lastUsedAt: Date | null;
} | null
```

#### `credentials.save`

Saves or updates MyWFG credentials (encrypted).

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth** | Protected |

**Input:**

```typescript
{
  username: string;  // Min 1 char
  password: string;  // Min 1 char
  apiKey?: string;
}
```

---

### Dashboard Router

Provides dashboard analytics and metrics.

#### `dashboard.stats`

Retrieves comprehensive dashboard statistics.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth** | Protected |

**Response:**

```typescript
{
  agentsByStage: {
    RECRUITMENT: number;
    EXAM_PREP: number;
    LICENSED: number;
    PRODUCT_TRAINING: number;
    BUSINESS_LAUNCH: number;
    NET_LICENSED: number;
    CLIENT_TRACKING: number;
    CHARGEBACK_PROOF: number;
  };
  taskStats: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
  };
  recentAgents: Agent[];
  upcomingTasks: WorkflowTask[];
}
```

#### `dashboard.metrics`

Retrieves key performance metrics.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth** | Protected |

**Response:**

```typescript
{
  totalAgents: number;
  activeAgents: number;
  licensedAgents: number;
  netLicensedAgents: number;
  totalClients: number;
  totalCashFlow: string;
  totalFaceAmount: string;
  familiesProtected: number;
  lastSyncAt: Date | null;
}
```

#### `dashboard.netLicensedAgents`

Retrieves list of net licensed agents ($1,000+ cash flow).

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth** | Protected |

---

### Cash Flow Router

Manages cash flow records from MyWFG.

#### `cashFlow.list`

Retrieves all cash flow records.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth** | Protected |

#### `cashFlow.upsert`

Inserts or updates a single cash flow record.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth** | Protected |

**Input:**

```typescript
{
  agentCode: string;
  agentName: string;
  titleLevel?: string;
  uplineSMD?: string;
  cashFlowAmount: string;
  cumulativeCashFlow: string;
  paymentDate?: string;
  paymentCycle?: string;
  reportPeriod?: string;
}
```

#### `cashFlow.bulkUpsert`

Bulk inserts or updates multiple cash flow records.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth** | Protected |

**Input:**

```typescript
{
  records: CashFlowRecord[]
}
```

#### `cashFlow.clearAll`

Clears all cash flow records (admin only).

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth** | Admin |

---

### Team Router

Team management (admin only).

#### `team.listUsers`

Lists all users in the system.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth** | Admin |

---

### Sync Logs Router

Monitors sync operation history.

#### `syncLogs.getRecent`

Retrieves recent sync logs.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth** | Protected |

**Input:**

```typescript
{
  limit?: number;  // Default: 20, Max: 100
}
```

#### `syncLogs.getPaginated`

Retrieves paginated sync logs with filtering.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth** | Protected |

**Input:**

```typescript
{
  page: number;      // Default: 1
  pageSize: number;  // Default: 20, Max: 100
  status?: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED" | "PARTIAL";
  syncType?: "FULL_SYNC" | "DOWNLINE_STATUS" | "CONTACT_INFO" | "CASH_FLOW" | "PRODUCTION";
  scheduledTime?: string;
}
```

#### `syncLogs.getLatest`

Retrieves the most recent sync log.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth** | Protected |

#### `syncLogs.getToday`

Retrieves all sync logs from today.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth** | Protected |

#### `syncLogs.getWeeklySummary`

Retrieves weekly sync summary for dashboard.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth** | Protected |

---

### Pending Policies Router

Manages Transamerica pending policies.

#### `pendingPolicies.list`

Retrieves all pending policies with requirements.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth** | Protected |

#### `pendingPolicies.summary`

Retrieves summary statistics for dashboard.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth** | Protected |

**Response:**

```typescript
{
  totalPending: number;
  pendingWithProducer: number;
  pendingWithTransamerica: number;
  incomplete: number;
}
```

#### `pendingPolicies.getByNumber`

Retrieves a single pending policy by policy number.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth** | Protected |
| **Input** | `string` (policy number) |

#### `pendingPolicies.upsert`

Inserts or updates a pending policy with requirements.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth** | Protected |

**Input:**

```typescript
{
  policyNumber: string;
  ownerName: string;
  productType?: string;
  faceAmount?: string;
  status: "Pending" | "Issued" | "Incomplete" | "Post Approval Processing" | "Declined" | "Withdrawn";
  // ... additional fields
  requirements: {
    pendingWithProducer: Requirement[];
    pendingWithTransamerica: Requirement[];
    completed: Requirement[];
  }
}
```

---

### Inforce Policies Router

Manages Transamerica inforce policies and production data.

#### `inforcePolicies.list`

Retrieves inforce policies with optional filtering.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth** | Protected |

**Input:**

```typescript
{
  status?: string;
  agentId?: number;
}
```

#### `inforcePolicies.getByPolicyNumber`

Retrieves a single policy by policy number.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth** | Protected |
| **Input** | `string` (policy number) |

#### `inforcePolicies.getSummary`

Retrieves production summary for dashboard.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth** | Protected |

**Response:**

```typescript
{
  totalPremium: number;
  totalCommission: number;
  activePolicies: number;
  totalPolicies: number;
  totalFaceAmount: number;
  statusBreakdown: {
    status: string;
    count: number;
  }[];
}
```

#### `inforcePolicies.getTopProducers`

Retrieves top producers by premium amount.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth** | Protected |
| **Input** | `number` (limit, default: 10) |

#### `inforcePolicies.getByWritingAgent`

Retrieves production grouped by writing agent.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth** | Protected |

#### `inforcePolicies.getTopAgentsByCommission`

Retrieves top agents ranked by commission earned.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth** | Protected |
| **Input** | `number` (limit, default: 10) |

#### `inforcePolicies.updatePolicy`

Updates policy with target premium and split agent data.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth** | Protected |

**Input:**

```typescript
{
  policyNumber: string;
  targetPremium?: number;
  writingAgentName?: string;
  writingAgentCode?: string;
  writingAgentSplit?: number;    // 0-100
  writingAgentLevel?: number;    // 0-1
  secondAgentName?: string;
  secondAgentCode?: string;
  secondAgentSplit?: number;
  secondAgentLevel?: number;
}
```

#### `inforcePolicies.bulkUpdateTargetPremium`

Bulk updates target premium for multiple policies.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth** | Protected |

**Input:**

```typescript
Array<{
  policyNumber: string;
  targetPremium: number;
}>
```

---

## Data Schemas

### Agent Schema

```typescript
interface Agent {
  id: number;
  agentCode: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  currentStage: AgentStage;
  stageEnteredAt: Date;
  examDate: Date | null;
  licenseNumber: string | null;
  notes: string | null;
  isActive: boolean;
  recruiterUserId: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Client Schema

```typescript
interface Client {
  id: number;
  agentId: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  renewalDate: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### Workflow Task Schema

```typescript
interface WorkflowTask {
  id: number;
  agentId: number | null;
  clientId: number | null;
  assignedToUserId: number;
  taskType: TaskType;
  dueDate: Date;
  priority: "LOW" | "MEDIUM" | "HIGH";
  description: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### Inforce Policy Schema

```typescript
interface InforcePolicy {
  id: number;
  policyNumber: string;
  ownerName: string;
  productType: string | null;
  faceAmount: string | null;
  premium: string | null;
  targetPremium: string | null;
  status: string;
  issueDate: string | null;
  writingAgentName: string | null;
  writingAgentCode: string | null;
  writingAgentSplit: number | null;
  writingAgentLevel: string | null;
  writingAgentCommission: string | null;
  secondAgentName: string | null;
  secondAgentCode: string | null;
  secondAgentSplit: number | null;
  secondAgentLevel: string | null;
  secondAgentCommission: string | null;
  calculatedCommission: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Error Handling

### Error Response Format

All errors follow the tRPC error format:

```typescript
{
  error: {
    message: string;
    code: TRPCErrorCode;
    data?: {
      code: string;
      httpStatus: number;
      path: string;
    }
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `BAD_REQUEST` | 400 | Invalid input data |
| `INTERNAL_SERVER_ERROR` | 500 | Server error |

---

## Rate Limiting

Currently, no rate limiting is implemented. For production deployments, consider implementing rate limiting at the Nginx level or using a middleware.

---

## Examples

### Using tRPC Client (React)

```typescript
import { trpc } from '@/lib/trpc';

// Query example
function AgentList() {
  const { data: agents, isLoading } = trpc.agents.list.useQuery({
    stage: 'LICENSED'
  });
  
  if (isLoading) return <div>Loading...</div>;
  return <div>{agents?.map(a => a.firstName)}</div>;
}

// Mutation example
function CreateAgent() {
  const createAgent = trpc.agents.create.useMutation({
    onSuccess: () => {
      // Invalidate and refetch
      trpc.useUtils().agents.list.invalidate();
    }
  });
  
  const handleSubmit = (data) => {
    createAgent.mutate({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email
    });
  };
}
```

### Using HTTP Directly

```bash
# Query example
curl -X GET "https://your-domain.com/api/trpc/agents.list?input=%7B%7D" \
  -H "Cookie: session=your-session-cookie"

# Mutation example
curl -X POST "https://your-domain.com/api/trpc/agents.create" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=your-session-cookie" \
  -d '{"firstName":"John","lastName":"Doe","email":"john@example.com"}'
```

---

## References

- [tRPC Documentation](https://trpc.io/docs)
- [Zod Validation](https://zod.dev/)
- [SuperJSON](https://github.com/blitz-js/superjson)

---

*This API documentation is maintained by the Wealth Builders Haven team. For the latest updates, visit the GitHub repository.*
