CREATE TABLE `syncLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`syncType` enum('FULL_SYNC','DOWNLINE_STATUS','CONTACT_INFO','CASH_FLOW','PRODUCTION') NOT NULL,
	`scheduledTime` varchar(20),
	`status` enum('PENDING','RUNNING','SUCCESS','FAILED','PARTIAL') NOT NULL DEFAULT 'PENDING',
	`startedAt` timestamp,
	`completedAt` timestamp,
	`durationSeconds` int,
	`agentsProcessed` int DEFAULT 0,
	`agentsUpdated` int DEFAULT 0,
	`agentsCreated` int DEFAULT 0,
	`contactsUpdated` int DEFAULT 0,
	`errorsCount` int DEFAULT 0,
	`errorMessages` json,
	`summary` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `syncLogs_id` PRIMARY KEY(`id`)
);
