CREATE TABLE `dismissedAlerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`alertType` enum('REVERSED_PREMIUM_PAYMENT','EFT_REMOVAL','CHARGEBACK','OTHER') NOT NULL,
	`policyNumber` varchar(50) NOT NULL,
	`ownerName` varchar(255),
	`alertDate` varchar(50),
	`dismissedBy` int,
	`dismissedAt` timestamp NOT NULL DEFAULT (now()),
	`dismissReason` text,
	`originalAlertData` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dismissedAlerts_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_policy_alert` UNIQUE(`policyNumber`,`alertType`,`alertDate`)
);
--> statement-breakpoint
CREATE TABLE `queryMetricsHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`snapshotAt` timestamp NOT NULL DEFAULT (now()),
	`totalQueries` int NOT NULL DEFAULT 0,
	`totalDurationMs` decimal(15,2) NOT NULL DEFAULT '0',
	`avgDurationMs` decimal(10,2) NOT NULL DEFAULT '0',
	`maxDurationMs` decimal(10,2) NOT NULL DEFAULT '0',
	`minDurationMs` decimal(10,2) NOT NULL DEFAULT '0',
	`selectCount` int NOT NULL DEFAULT 0,
	`insertCount` int NOT NULL DEFAULT 0,
	`updateCount` int NOT NULL DEFAULT 0,
	`deleteCount` int NOT NULL DEFAULT 0,
	`otherCount` int NOT NULL DEFAULT 0,
	`slowQueryCount` int NOT NULL DEFAULT 0,
	`failedQueryCount` int NOT NULL DEFAULT 0,
	`slowQueries` json,
	`periodType` enum('HOURLY','DAILY','WEEKLY') NOT NULL DEFAULT 'HOURLY',
	`periodStart` timestamp NOT NULL,
	`periodEnd` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `queryMetricsHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `dismissedAlerts` ADD CONSTRAINT `dismissedAlerts_dismissedBy_users_id_fk` FOREIGN KEY (`dismissedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_dismissed_alerts_type` ON `dismissedAlerts` (`alertType`);--> statement-breakpoint
CREATE INDEX `idx_dismissed_alerts_dismissed_at` ON `dismissedAlerts` (`dismissedAt`);--> statement-breakpoint
CREATE INDEX `idx_query_metrics_snapshot_at` ON `queryMetricsHistory` (`snapshotAt`);--> statement-breakpoint
CREATE INDEX `idx_query_metrics_period_type` ON `queryMetricsHistory` (`periodType`);