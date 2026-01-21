CREATE TABLE `agentExamPrep` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int,
	`xcelFirstName` varchar(255) NOT NULL,
	`xcelLastName` varchar(255) NOT NULL,
	`course` varchar(255) NOT NULL,
	`state` varchar(50),
	`dateEnrolled` date,
	`lastLogin` timestamp,
	`pleCompletePercent` int DEFAULT 0,
	`preparedToPass` varchar(50),
	`lastSyncedAt` timestamp NOT NULL DEFAULT (now()),
	`emailSubject` varchar(500),
	`emailReceivedAt` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agentExamPrep_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `agentExamPrep` ADD CONSTRAINT `agentExamPrep_agentId_agents_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON DELETE no action ON UPDATE no action;