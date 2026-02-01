CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`type` enum('SYNC_COMPLETED','SYNC_FAILED','POLICY_ANNIVERSARY','AGENT_MILESTONE','CHARGEBACK_ALERT','NEW_POLICY','SYSTEM_ALERT','TASK_DUE','WELCOME') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`linkUrl` varchar(512),
	`linkLabel` varchar(100),
	`relatedEntityType` varchar(50),
	`relatedEntityId` varchar(100),
	`priority` enum('LOW','MEDIUM','HIGH','URGENT') NOT NULL DEFAULT 'MEDIUM',
	`isRead` boolean NOT NULL DEFAULT false,
	`readAt` timestamp,
	`isDismissed` boolean NOT NULL DEFAULT false,
	`dismissedAt` timestamp,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp,
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_notifications_user_id` ON `notifications` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_notifications_type` ON `notifications` (`type`);--> statement-breakpoint
CREATE INDEX `idx_notifications_is_read` ON `notifications` (`isRead`);--> statement-breakpoint
CREATE INDEX `idx_notifications_created_at` ON `notifications` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_notifications_user_unread` ON `notifications` (`userId`,`isRead`,`isDismissed`);