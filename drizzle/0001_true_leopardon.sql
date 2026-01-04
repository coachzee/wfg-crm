CREATE TABLE `agents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentCode` varchar(64),
	`firstName` varchar(255) NOT NULL,
	`lastName` varchar(255) NOT NULL,
	`email` varchar(320),
	`phone` varchar(20),
	`recruiterUserId` int,
	`currentStage` enum('RECRUITMENT','EXAM_PREP','LICENSED','PRODUCT_TRAINING','BUSINESS_LAUNCH','NET_LICENSED','CLIENT_TRACKING','CHARGEBACK_PROOF') NOT NULL DEFAULT 'RECRUITMENT',
	`stageEnteredAt` timestamp NOT NULL DEFAULT (now()),
	`examDate` date,
	`licenseNumber` varchar(100),
	`firstPolicyDate` date,
	`firstProductionAmount` decimal(10,2),
	`productionMilestoneDate` date,
	`notes` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agents_id` PRIMARY KEY(`id`),
	CONSTRAINT `agents_agentCode_unique` UNIQUE(`agentCode`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`firstName` varchar(255) NOT NULL,
	`lastName` varchar(255) NOT NULL,
	`email` varchar(320),
	`phone` varchar(20),
	`dateOfBirth` date,
	`address` text,
	`policyNumbers` json,
	`policyTypes` json,
	`totalPremium` decimal(12,2),
	`renewalDate` date,
	`lastContactDate` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`encryptedUsername` text NOT NULL,
	`encryptedPassword` text NOT NULL,
	`encryptedApiKey` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastUsedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `credentials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mywfgSyncLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`syncDate` timestamp NOT NULL DEFAULT (now()),
	`status` enum('SUCCESS','FAILED','PARTIAL') NOT NULL,
	`recordsProcessed` int DEFAULT 0,
	`errorMessage` text,
	`syncedAgentCodes` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mywfgSyncLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `productionRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`policyNumber` varchar(100) NOT NULL,
	`policyType` varchar(50) NOT NULL,
	`commissionAmount` decimal(12,2),
	`premiumAmount` decimal(12,2),
	`issueDate` date NOT NULL,
	`chargebackProofDate` date,
	`isChargebackProof` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `productionRecords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflowTasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int,
	`clientId` int,
	`taskType` enum('EXAM_PREP_FOLLOW_UP','LICENSE_VERIFICATION','PRODUCT_TRAINING','BUSINESS_LAUNCH_PREP','RENEWAL_REMINDER','CHARGEBACK_MONITORING','GENERAL_FOLLOW_UP') NOT NULL,
	`dueDate` date NOT NULL,
	`completedAt` timestamp,
	`assignedToUserId` int,
	`priority` enum('LOW','MEDIUM','HIGH') NOT NULL DEFAULT 'MEDIUM',
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workflowTasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `agents` ADD CONSTRAINT `agents_recruiterUserId_users_id_fk` FOREIGN KEY (`recruiterUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clients` ADD CONSTRAINT `clients_agentId_agents_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `credentials` ADD CONSTRAINT `credentials_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `productionRecords` ADD CONSTRAINT `productionRecords_agentId_agents_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workflowTasks` ADD CONSTRAINT `workflowTasks_agentId_agents_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workflowTasks` ADD CONSTRAINT `workflowTasks_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workflowTasks` ADD CONSTRAINT `workflowTasks_assignedToUserId_users_id_fk` FOREIGN KEY (`assignedToUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;