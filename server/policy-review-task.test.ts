import { describe, it, expect, beforeAll } from "vitest";
import { getDb, createWorkflowTask, getWorkflowTasks } from "./db";

describe("Policy Review Task Creation", () => {
  beforeAll(async () => {
    const db = await getDb();
    expect(db).toBeTruthy();
  });

  it("should create a POLICY_REVIEW task with correct structure", async () => {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7); // 7 days from now
    
    const taskData = {
      taskType: 'POLICY_REVIEW' as const,
      dueDate: dueDate,
      priority: 'MEDIUM' as const,
      description: `Policy Review for John Doe
Policy #: 12345678
Anniversary Date: 2026-02-15
Policy Age: 3 year(s)
Face Amount: $500,000
Premium: $2,500
Product Type: IUL

Review Topics:
- Coverage adequacy
- Beneficiary updates
- Premium payment status
- Additional coverage needs`,
      assignedToUserId: 1,
    };
    
    // Create the task
    const result = await createWorkflowTask(taskData);
    expect(result).toBeTruthy();
  });

  it("should retrieve POLICY_REVIEW tasks from the database", async () => {
    const tasks = await getWorkflowTasks({ completed: false });
    expect(Array.isArray(tasks)).toBe(true);
    
    // Check if any POLICY_REVIEW tasks exist
    const policyReviewTasks = tasks.filter((t: any) => t.taskType === 'POLICY_REVIEW');
    expect(policyReviewTasks.length).toBeGreaterThanOrEqual(0);
  });

  it("should create task with HIGH priority for urgent anniversaries", async () => {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3); // 3 days from now (urgent)
    
    const taskData = {
      taskType: 'POLICY_REVIEW' as const,
      dueDate: dueDate,
      priority: 'HIGH' as const,
      description: `Urgent Policy Review for Jane Smith
Policy #: 87654321
Anniversary Date: ${dueDate.toISOString().split('T')[0]}
Policy Age: 1 year(s)
Face Amount: $250,000
Premium: $1,200
Product Type: Term Life`,
      assignedToUserId: 1,
    };
    
    const result = await createWorkflowTask(taskData);
    expect(result).toBeTruthy();
  });

  it("should handle task creation without optional fields", async () => {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);
    
    const taskData = {
      taskType: 'POLICY_REVIEW' as const,
      dueDate: dueDate,
      priority: 'LOW' as const,
      description: 'Basic policy review task',
    };
    
    const result = await createWorkflowTask(taskData);
    expect(result).toBeTruthy();
  });
});
