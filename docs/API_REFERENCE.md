# WBH CRM API Reference

**Version:** 1.0  
**Last Updated:** January 8, 2026  
**Author:** Manus AI

---

## Overview

The WBH CRM API is built using tRPC, providing end-to-end type safety between the client and server. All procedures are accessible via the `trpc` client in the frontend.

---

## Authentication

### auth.me

Returns the currently authenticated user.

**Type:** Query  
**Auth Required:** No (returns null if not authenticated)

```typescript
const { data: user } = trpc.auth.me.useQuery();
// Returns: User | null
```

**Response:**
```typescript
{
  id: number;
  openId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: "admin" | "user";
}
```

### auth.logout

Logs out the current user by clearing the session cookie.

**Type:** Mutation  
**Auth Required:** Yes

```typescript
const logout = trpc.auth.logout.useMutation();
await logout.mutateAsync();
```

---

## Agents

### agents.list

Returns a paginated list of all agents.

**Type:** Query  
**Auth Required:** Yes

```typescript
const { data } = trpc.agents.list.useQuery({
  page: 1,
  limit: 20,
  search: "John",
  stage: "active"
});
```

**Input:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 20) |
| search | string | No | Search by name or agent code |
| stage | string | No | Filter by workflow stage |

**Response:**
```typescript
{
  agents: Agent[];
  total: number;
  page: number;
  totalPages: number;
}
```

### agents.getById

Returns a single agent by ID with full details.

**Type:** Query  
**Auth Required:** Yes

```typescript
const { data } = trpc.agents.getById.useQuery({ id: 123 });
```

**Input:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | number | Yes | Agent ID |

### agents.create

Creates a new agent record.

**Type:** Mutation  
**Auth Required:** Yes

```typescript
const create = trpc.agents.create.useMutation();
await create.mutateAsync({
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  agentCode: "ABC123"
});
```

### agents.update

Updates an existing agent.

**Type:** Mutation  
**Auth Required:** Yes

```typescript
const update = trpc.agents.update.useMutation();
await update.mutateAsync({
  id: 123,
  firstName: "John",
  lastName: "Smith"
});
```

### agents.updateStage

Updates an agent's workflow stage.

**Type:** Mutation  
**Auth Required:** Yes

```typescript
const updateStage = trpc.agents.updateStage.useMutation();
await updateStage.mutateAsync({
  id: 123,
  stage: "licensed"
});
```

---

## Clients

### clients.list

Returns a paginated list of clients.

**Type:** Query  
**Auth Required:** Yes

```typescript
const { data } = trpc.clients.list.useQuery({
  page: 1,
  limit: 20,
  agentId: 123
});
```

### clients.getById

Returns a single client by ID.

**Type:** Query  
**Auth Required:** Yes

```typescript
const { data } = trpc.clients.getById.useQuery({ id: 456 });
```

### clients.create

Creates a new client record.

**Type:** Mutation  
**Auth Required:** Yes

```typescript
const create = trpc.clients.create.useMutation();
await create.mutateAsync({
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  phone: "555-1234",
  agentId: 123
});
```

### clients.update

Updates an existing client.

**Type:** Mutation  
**Auth Required:** Yes

---

## Tasks

### tasks.list

Returns tasks for the current user or specified agent.

**Type:** Query  
**Auth Required:** Yes

```typescript
const { data } = trpc.tasks.list.useQuery({
  agentId: 123,
  status: "pending"
});
```

### tasks.create

Creates a new task.

**Type:** Mutation  
**Auth Required:** Yes

```typescript
const create = trpc.tasks.create.useMutation();
await create.mutateAsync({
  title: "Follow up with client",
  description: "Call about policy renewal",
  dueDate: new Date("2026-01-15"),
  agentId: 123,
  clientId: 456
});
```

### tasks.update

Updates a task.

**Type:** Mutation  
**Auth Required:** Yes

### tasks.complete

Marks a task as completed.

**Type:** Mutation  
**Auth Required:** Yes

```typescript
const complete = trpc.tasks.complete.useMutation();
await complete.mutateAsync({ id: 789 });
```

---

## Dashboard

### dashboard.getMetrics

Returns dashboard metrics including totals and summaries.

**Type:** Query  
**Auth Required:** Yes

```typescript
const { data } = trpc.dashboard.getMetrics.useQuery();
```

**Response:**
```typescript
{
  activeAssociates: number;
  licensedAgents: number;
  netLicensed: number;
  taskCompletion: number;
  totalFaceAmount: number;
  familiesProtected: number;
  superTeamCashFlow: number;
  lastSyncTime: Date | null;
  lastSyncStatus: string;
}
```

### dashboard.getCashFlow

Returns monthly cash flow data.

**Type:** Query  
**Auth Required:** Yes

```typescript
const { data } = trpc.dashboard.getCashFlow.useQuery({
  year: 2026,
  month: 1
});
```

---

## Sync

### sync.getStatus

Returns the current sync status.

**Type:** Query  
**Auth Required:** Yes

```typescript
const { data } = trpc.sync.getStatus.useQuery();
```

**Response:**
```typescript
{
  lastSync: Date | null;
  status: "success" | "failed" | "running" | "never";
  nextScheduledSync: Date;
}
```

### sync.getLogs

Returns sync history logs.

**Type:** Query  
**Auth Required:** Yes

```typescript
const { data } = trpc.sync.getLogs.useQuery({
  limit: 50,
  syncType: "MYWFG_FULL"
});
```

### sync.triggerMyWFG

Triggers a manual MyWBH sync.

**Type:** Mutation  
**Auth Required:** Yes (Admin only)

```typescript
const trigger = trpc.sync.triggerMyWFG.useMutation();
await trigger.mutateAsync();
```

### sync.triggerTransamerica

Triggers a manual Transamerica sync.

**Type:** Mutation  
**Auth Required:** Yes (Admin only)

```typescript
const trigger = trpc.sync.triggerTransamerica.useMutation();
await trigger.mutateAsync();
```

---

## Pending Policies

### pendingPolicies.list

Returns all pending policies from Transamerica.

**Type:** Query  
**Auth Required:** Yes

```typescript
const { data } = trpc.pendingPolicies.list.useQuery({
  status: "Pending"
});
```

**Input:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| status | string | No | Filter by status (Pending, Incomplete, etc.) |

**Response:**
```typescript
{
  policies: PendingPolicy[];
  summary: {
    total: number;
    pendingWithProducer: number;
    pendingWithTransamerica: number;
    incomplete: number;
  };
}
```

### pendingPolicies.getById

Returns a single pending policy with all requirements.

**Type:** Query  
**Auth Required:** Yes

```typescript
const { data } = trpc.pendingPolicies.getById.useQuery({ id: 123 });
```

**Response:**
```typescript
{
  policy: PendingPolicy;
  requirements: {
    pendingWithProducer: Requirement[];
    pendingWithTransamerica: Requirement[];
    completed: Requirement[];
  };
}
```

### pendingPolicies.sync

Triggers a sync of pending policies from Transamerica.

**Type:** Mutation  
**Auth Required:** Yes (Admin only)

```typescript
const sync = trpc.pendingPolicies.sync.useMutation();
await sync.mutateAsync();
```

---

## Production

### production.list

Returns production records.

**Type:** Query  
**Auth Required:** Yes

```typescript
const { data } = trpc.production.list.useQuery({
  agentId: 123,
  startDate: new Date("2026-01-01"),
  endDate: new Date("2026-01-31")
});
```

### production.getSummary

Returns production summary by agent or team.

**Type:** Query  
**Auth Required:** Yes

```typescript
const { data } = trpc.production.getSummary.useQuery({
  year: 2026,
  month: 1
});
```

---

## Credentials

### credentials.verify

Verifies that stored credentials are valid.

**Type:** Mutation  
**Auth Required:** Yes (Admin only)

```typescript
const verify = trpc.credentials.verify.useMutation();
const result = await verify.mutateAsync({
  type: "mywfg" // or "transamerica" or "gmail"
});
```

**Response:**
```typescript
{
  valid: boolean;
  message: string;
}
```

---

## System

### system.notifyOwner

Sends a notification to the system owner.

**Type:** Mutation  
**Auth Required:** Yes

```typescript
const notify = trpc.system.notifyOwner.useMutation();
await notify.mutateAsync({
  title: "New Form Submission",
  content: "A new lead has submitted the contact form."
});
```

---

## Error Handling

All procedures may throw tRPC errors with the following codes:

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | User is not authenticated |
| `FORBIDDEN` | User lacks permission for this action |
| `NOT_FOUND` | Requested resource does not exist |
| `BAD_REQUEST` | Invalid input parameters |
| `INTERNAL_SERVER_ERROR` | Server-side error |

**Example error handling:**

```typescript
const mutation = trpc.agents.create.useMutation({
  onError: (error) => {
    if (error.data?.code === "UNAUTHORIZED") {
      // Redirect to login
    } else {
      toast.error(error.message);
    }
  }
});
```

---

## Type Definitions

### Agent

```typescript
interface Agent {
  id: number;
  agentCode: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  rank: WfgRank;
  stage: WorkflowStage;
  recruiterId: number | null;
  homeAddress: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### Client

```typescript
interface Client {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  agentId: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### PendingPolicy

```typescript
interface PendingPolicy {
  id: number;
  policyNumber: string;
  ownerName: string;
  status: string;
  faceAmount: number;
  product: string;
  closureDate: Date | null;
  writingAgent: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Requirement

```typescript
interface Requirement {
  id: number;
  policyId: number;
  category: "pending_with_producer" | "pending_with_transamerica" | "completed";
  requirement: string;
  status: string;
  dateRequested: Date | null;
  dateReceived: Date | null;
}
```

---

## Usage Examples

### Fetching Dashboard Data

```tsx
import { trpc } from "@/lib/trpc";

function Dashboard() {
  const { data: metrics, isLoading } = trpc.dashboard.getMetrics.useQuery();
  
  if (isLoading) return <Spinner />;
  
  return (
    <div>
      <MetricCard title="Active Associates" value={metrics.activeAssociates} />
      <MetricCard title="Licensed Agents" value={metrics.licensedAgents} />
    </div>
  );
}
```

### Creating a New Client with Optimistic Updates

```tsx
import { trpc } from "@/lib/trpc";

function ClientForm() {
  const utils = trpc.useUtils();
  
  const createClient = trpc.clients.create.useMutation({
    onSuccess: () => {
      utils.clients.list.invalidate();
      toast.success("Client created successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });
  
  const handleSubmit = (data: ClientInput) => {
    createClient.mutate(data);
  };
  
  return <form onSubmit={handleSubmit}>...</form>;
}
```

### Triggering Manual Sync

```tsx
import { trpc } from "@/lib/trpc";

function SyncButton() {
  const sync = trpc.sync.triggerMyWFG.useMutation({
    onSuccess: () => {
      toast.success("Sync started");
    }
  });
  
  return (
    <Button 
      onClick={() => sync.mutate()} 
      disabled={sync.isPending}
    >
      {sync.isPending ? "Syncing..." : "Sync Now"}
    </Button>
  );
}
```
