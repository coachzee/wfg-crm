CREATE TABLE `scheduledEmails` (
	`id` int AUTO_INCREMENT NOT NULL,
	`originalTrackingId` varchar(64),
	`emailType` enum('ANNIVERSARY_GREETING','ANNIVERSARY_REMINDER','POLICY_REVIEW_REMINDER','CHARGEBACK_ALERT','GENERAL_NOTIFICATION') NOT NULL,
	`recipientEmail` varchar(255) NOT NULL,
	`recipientName` varchar(255),
	`relatedEntityType` varchar(50),
	`relatedEntityId` varchar(100),
	`customContent` json,
	`scheduledFor` timestamp NOT NULL,
	`status` enum('PENDING','SENT','CANCELLED','FAILED') NOT NULL DEFAULT 'PENDING',
	`processedAt` timestamp,
	`newTrackingId` varchar(64),
	`errorMessage` text,
	`metadata` json,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scheduledEmails_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `scheduledEmails` ADD CONSTRAINT `scheduledEmails_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;