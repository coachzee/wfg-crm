CREATE TABLE `job_locks` (
	`name` varchar(128) NOT NULL,
	`ownerId` varchar(64) NOT NULL,
	`lockedAt` timestamp NOT NULL DEFAULT (now()),
	`lockedUntil` timestamp NOT NULL,
	`heartbeatAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `job_locks_name` PRIMARY KEY(`name`)
);
--> statement-breakpoint
CREATE TABLE `sync_runs` (
	`id` varchar(64) NOT NULL,
	`jobName` varchar(128) NOT NULL,
	`status` enum('running','success','failed','cancelled') NOT NULL,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`finishedAt` timestamp,
	`durationMs` int,
	`errorSummary` text,
	`metrics` json,
	`artifactsPath` varchar(512),
	`triggeredBy` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sync_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_sync_runs_job_name` ON `sync_runs` (`jobName`);--> statement-breakpoint
CREATE INDEX `idx_sync_runs_status` ON `sync_runs` (`status`);--> statement-breakpoint
CREATE INDEX `idx_sync_runs_started_at` ON `sync_runs` (`startedAt`);