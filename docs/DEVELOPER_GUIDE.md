# WBH CRM Developer Guide

**Version:** 1.0  
**Last Updated:** January 8, 2026  
**Author:** Manus AI

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Project Structure](#project-structure)
3. [Development Workflow](#development-workflow)
4. [Code Conventions](#code-conventions)
5. [Adding New Features](#adding-new-features)
6. [Testing](#testing)
7. [Common Tasks](#common-tasks)

---

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 22.x or higher
- **pnpm** package manager
- **MySQL** or access to TiDB database
- **Chrome/Chromium** for Puppeteer automation

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd wbh-crm

# Install dependencies
pnpm install

# Set up environment variables (see OPERATIONS_GUIDE.md)
cp .env.example .env

# Push database schema
pnpm db:push

# Start development server
pnpm dev
```

### Environment Setup

The application requires several environment variables. See `OPERATIONS_GUIDE.md` for the complete list and how to configure them in the Manus Secrets panel.

---

## Project Structure

```
wbh-crm/
├── client/                    # Frontend React application
│   ├── public/               # Static assets (logo, favicon)
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   │   ├── ui/          # shadcn/ui components
│   │   │   └── *.tsx        # Custom components
│   │   ├── contexts/        # React contexts (Theme, Auth)
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utility functions
│   │   │   ├── trpc.ts     # tRPC client configuration
│   │   │   └── utils.ts    # Helper functions
│   │   ├── pages/           # Page components
│   │   ├── App.tsx          # Main app with routing
│   │   ├── main.tsx         # Entry point
│   │   └── index.css        # Global styles
│   └── index.html           # HTML template
│
├── server/                    # Backend server
│   ├── _core/               # Framework internals (DO NOT MODIFY)
│   │   ├── context.ts      # tRPC context
│   │   ├── env.ts          # Environment variables
│   │   ├── oauth.ts        # OAuth handling
│   │   └── trpc.ts         # tRPC setup
│   ├── routers.ts           # Main tRPC router
│   ├── db.ts                # Database helpers
│   ├── gmail-otp.ts         # Gmail OTP service
│   ├── auto-login-*.ts      # Portal automation
│   ├── mywfg-*.ts           # MyWBH services
│   ├── transamerica-*.ts    # Transamerica services
│   └── *.test.ts            # Test files
│
├── drizzle/                   # Database schema and migrations
│   ├── schema.ts            # Table definitions
│   ├── relations.ts         # Table relationships
│   └── *.sql                # Migration files
│
├── scripts/                   # Utility scripts
│   ├── seed-*.mjs           # Data seeding scripts
│   ├── import-*.mjs         # Data import scripts
│   └── fetch-*.mjs          # Data fetching scripts
│
├── shared/                    # Shared types and constants
│   ├── types.ts             # Shared TypeScript types
│   └── const.ts             # Shared constants
│
├── docs/                      # Documentation
│   ├── ARCHITECTURE.md      # System architecture
│   ├── DEVELOPER_GUIDE.md   # This file
│   └── OPERATIONS_GUIDE.md  # Operations and troubleshooting
│
└── Configuration files
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── vitest.config.ts
    └── drizzle.config.ts
```

---

## Development Workflow

### Running the Development Server

```bash
# Start the dev server (frontend + backend)
pnpm dev
```

The server runs on `http://localhost:3000` with hot module replacement enabled.

### Database Operations

```bash
# Generate and apply migrations after schema changes
pnpm db:push

# View database in browser (if using Drizzle Studio)
pnpm db:studio
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm vitest run server/agents.test.ts

# Run tests in watch mode
pnpm vitest
```

### Type Checking

```bash
# Check for TypeScript errors
pnpm exec tsc --noEmit
```

---

## Code Conventions

### TypeScript

- Use strict TypeScript with `noEmit` for type checking
- Define interfaces for all data structures
- Use type inference where possible, explicit types where clarity is needed

```typescript
// Good: Interface for data structure
interface Agent {
  id: number;
  firstName: string;
  lastName: string;
  rank: WfgRank;
}

// Good: Type inference for simple cases
const agents = await db.select().from(agentsTable);

// Good: Explicit return type for complex functions
async function getAgentWithDetails(id: number): Promise<AgentWithDetails | null> {
  // ...
}
```

### React Components

- Use functional components with hooks
- Use TypeScript for props interfaces
- Implement loading, error, and empty states

```tsx
interface AgentCardProps {
  agent: Agent;
  onSelect?: (agent: Agent) => void;
}

export function AgentCard({ agent, onSelect }: AgentCardProps) {
  return (
    <Card onClick={() => onSelect?.(agent)}>
      <CardHeader>
        <CardTitle>{agent.firstName} {agent.lastName}</CardTitle>
      </CardHeader>
    </Card>
  );
}
```

### tRPC Procedures

- Use `publicProcedure` for unauthenticated endpoints
- Use `protectedProcedure` for authenticated endpoints
- Always validate input with Zod schemas

```typescript
// In server/routers.ts
myProcedure: protectedProcedure
  .input(z.object({
    id: z.number(),
    name: z.string().min(1),
  }))
  .mutation(async ({ ctx, input }) => {
    // ctx.user is available (authenticated user)
    return await updateRecord(input.id, input.name);
  }),
```

### Database Queries

- Use Drizzle ORM for all database operations
- Create helper functions in `server/db.ts` for reusable queries
- Always handle null/undefined cases

```typescript
// In server/db.ts
export async function getAgentByCode(agentCode: string) {
  const db = await getDb();
  if (!db) return null;
  
  const results = await db
    .select()
    .from(agents)
    .where(eq(agents.agentCode, agentCode))
    .limit(1);
  
  return results[0] || null;
}
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `agent-detail.tsx` |
| Components | PascalCase | `AgentDetail` |
| Functions | camelCase | `getAgentById` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Database tables | camelCase | `agentCashFlowHistory` |
| Environment variables | SCREAMING_SNAKE_CASE | `DATABASE_URL` |

---

## Adding New Features

### 1. Adding a New Database Table

**Step 1:** Define the table in `drizzle/schema.ts`:

```typescript
export const newTable = mysqlTable("newTable", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type NewRecord = typeof newTable.$inferSelect;
export type InsertNewRecord = typeof newTable.$inferInsert;
```

**Step 2:** Run migrations:

```bash
pnpm db:push
```

**Step 3:** Add database helpers in `server/db.ts`:

```typescript
export async function createNewRecord(data: InsertNewRecord) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.insert(newTable).values(data);
  return result[0].insertId;
}
```

### 2. Adding a New tRPC Procedure

**Step 1:** Add the procedure to `server/routers.ts`:

```typescript
// In the appRouter
newFeature: {
  list: protectedProcedure.query(async ({ ctx }) => {
    return await getNewRecords();
  }),
  
  create: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await createNewRecord(input);
    }),
},
```

### 3. Adding a New Page

**Step 1:** Create the page component in `client/src/pages/NewFeature.tsx`:

```tsx
import { trpc } from "@/lib/trpc";

export default function NewFeature() {
  const { data, isLoading } = trpc.newFeature.list.useQuery();
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold">New Feature</h1>
      {/* Content */}
    </div>
  );
}
```

**Step 2:** Add the route in `client/src/App.tsx`:

```tsx
import NewFeature from "./pages/NewFeature";

// In the Router
<Route path="/new-feature" component={NewFeature} />
```

**Step 3:** Add navigation in `client/src/components/DashboardLayout.tsx`:

```tsx
const navItems = [
  // ... existing items
  { href: "/new-feature", icon: Star, label: "New Feature" },
];
```

### 4. Adding a New Sync Service

**Step 1:** Create the sync service file:

```typescript
// server/new-sync.ts
export async function syncNewData(): Promise<SyncResult> {
  // Implementation
}

export function scheduleNewSync(): void {
  // Schedule at specific times
}
```

**Step 2:** Add sync type to schema:

```typescript
// In drizzle/schema.ts
syncType: mysqlEnum("syncType", [
  // ... existing types
  "NEW_SYNC_TYPE",
]).notNull(),
```

**Step 3:** Run migrations and integrate with routers.

---

## Testing

### Writing Tests

Tests are written using Vitest and located alongside the code they test:

```typescript
// server/new-feature.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";

describe("New Feature", () => {
  let db: Awaited<ReturnType<typeof getDb>>;

  beforeAll(async () => {
    db = await getDb();
  });

  it("should create a new record", async () => {
    // Test implementation
    expect(result).toBeDefined();
  });
});
```

### Test Patterns

1. **Database Tests** - Test CRUD operations directly
2. **Integration Tests** - Test tRPC procedures end-to-end
3. **Unit Tests** - Test utility functions in isolation

---

## Common Tasks

### Updating Portal Credentials

See `OPERATIONS_GUIDE.md` for detailed instructions on updating MyWBH and Transamerica credentials in the Manus Secrets panel.

### Debugging Sync Issues

1. Check the Sync History page for error messages
2. Review server logs for detailed stack traces
3. Run sync manually via the dashboard "Sync Now" button
4. Check if OTP emails are being received

### Adding a New Dashboard Metric

1. Add the calculation in `server/db.ts` (e.g., `getNewMetric()`)
2. Include in the `getDashboardMetrics()` function
3. Add the card in `client/src/pages/Dashboard.tsx`

### Modifying the Sidebar Navigation

Edit `client/src/components/DashboardLayout.tsx` and update the `navItems` array.

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| TypeScript errors after schema change | Run `pnpm db:push` to regenerate types |
| tRPC type errors | Restart the dev server to refresh types |
| Database connection errors | Check `DATABASE_URL` environment variable |
| Sync failing | Check credentials and OTP email access |

### Getting Help

1. Check existing documentation in `/docs`
2. Review test files for usage examples
3. Check the sync logs for error details
4. Review browser automation screenshots (if available)

---

## References

- [tRPC Documentation](https://trpc.io/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [React Documentation](https://react.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
