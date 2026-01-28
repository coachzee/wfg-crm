CREATE INDEX `idx_agents_agent_code` ON `agents` (`agentCode`);--> statement-breakpoint
CREATE INDEX `idx_agents_current_stage` ON `agents` (`currentStage`);--> statement-breakpoint
CREATE INDEX `idx_agents_is_active` ON `agents` (`isActive`);--> statement-breakpoint
CREATE INDEX `idx_agents_recruiter_user_id` ON `agents` (`recruiterUserId`);--> statement-breakpoint
CREATE INDEX `idx_agents_created_at` ON `agents` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_inforce_policies_status` ON `inforcePolicies` (`status`);--> statement-breakpoint
CREATE INDEX `idx_inforce_policies_writing_agent_code` ON `inforcePolicies` (`writingAgentCode`);--> statement-breakpoint
CREATE INDEX `idx_inforce_policies_agent_id` ON `inforcePolicies` (`agentId`);--> statement-breakpoint
CREATE INDEX `idx_inforce_policies_created_at` ON `inforcePolicies` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_pending_policies_status` ON `pendingPolicies` (`status`);--> statement-breakpoint
CREATE INDEX `idx_pending_policies_agent_code` ON `pendingPolicies` (`agentCode`);--> statement-breakpoint
CREATE INDEX `idx_pending_policies_created_at` ON `pendingPolicies` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_sync_logs_sync_type` ON `syncLogs` (`syncType`);--> statement-breakpoint
CREATE INDEX `idx_sync_logs_status` ON `syncLogs` (`status`);--> statement-breakpoint
CREATE INDEX `idx_sync_logs_created_at` ON `syncLogs` (`createdAt`);