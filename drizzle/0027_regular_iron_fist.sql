CREATE TABLE `goals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`metricKey` varchar(64) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`targetValue` decimal(15,2) NOT NULL,
	`currentValue` decimal(15,2) NOT NULL DEFAULT '0',
	`unit` varchar(32) NOT NULL DEFAULT 'count',
	`periodType` enum('MONTHLY','QUARTERLY','YEARLY') NOT NULL DEFAULT 'MONTHLY',
	`periodMonth` int,
	`periodQuarter` int,
	`periodYear` int NOT NULL,
	`status` enum('ACTIVE','COMPLETED','MISSED','ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
	`completedAt` timestamp,
	`color` varchar(32) DEFAULT 'primary',
	`icon` varchar(64),
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `goals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `goals` ADD CONSTRAINT `goals_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_goals_user_id` ON `goals` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_goals_period` ON `goals` (`periodYear`,`periodMonth`);--> statement-breakpoint
CREATE INDEX `idx_goals_status` ON `goals` (`status`);--> statement-breakpoint
CREATE INDEX `idx_goals_metric_key` ON `goals` (`metricKey`);