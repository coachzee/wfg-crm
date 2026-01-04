CREATE TABLE `advancementProgress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`targetRank` enum('ASSOCIATE','SENIOR_ASSOCIATE','MARKETING_DIRECTOR','SENIOR_MARKETING_DIRECTOR','EXECUTIVE_MARKETING_DIRECTOR','CEO_MARKETING_DIRECTOR','EXECUTIVE_VICE_CHAIRMAN','SENIOR_EXECUTIVE_VICE_CHAIRMAN','FIELD_CHAIRMAN','EXECUTIVE_CHAIRMAN') NOT NULL,
	`rollingPeriodStart` date NOT NULL,
	`rollingPeriodEnd` date NOT NULL,
	`currentRecruits` int DEFAULT 0,
	`requiredRecruits` int DEFAULT 0,
	`currentDirectLegs` int DEFAULT 0,
	`requiredDirectLegs` int DEFAULT 0,
	`currentLicensedAgents` int DEFAULT 0,
	`requiredLicensedAgents` int DEFAULT 0,
	`currentBaseShopPoints` decimal(15,2) DEFAULT '0',
	`requiredBaseShopPoints` decimal(15,2) DEFAULT '0',
	`currentCashFlow` decimal(15,2) DEFAULT '0',
	`requiredCashFlow` decimal(15,2) DEFAULT '0',
	`currentSmdLegs` int DEFAULT 0,
	`requiredSmdLegs` int DEFAULT 0,
	`trainingCompleted` boolean DEFAULT false,
	`trainingCompletedDate` date,
	`progressPercentage` decimal(5,2) DEFAULT '0',
	`isQualified` boolean NOT NULL DEFAULT false,
	`qualifiedDate` date,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `advancementProgress_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `commissionPayments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`paymentDate` date NOT NULL,
	`paymentCycle` varchar(50) NOT NULL,
	`grossAmount` decimal(12,2) NOT NULL,
	`netAmount` decimal(12,2) NOT NULL,
	`deductions` decimal(12,2) DEFAULT '0',
	`paymentMethod` varchar(50),
	`personalCommission` decimal(12,2) DEFAULT '0',
	`overrideCommission` decimal(12,2) DEFAULT '0',
	`bonusAmount` decimal(12,2) DEFAULT '0',
	`mywfgSyncId` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `commissionPayments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `mywfgSyncLogs` MODIFY COLUMN `status` enum('SUCCESS','FAILED','PARTIAL','PENDING_OTP') NOT NULL;--> statement-breakpoint
ALTER TABLE `workflowTasks` MODIFY COLUMN `taskType` enum('EXAM_PREP_FOLLOW_UP','LICENSE_VERIFICATION','PRODUCT_TRAINING','BUSINESS_LAUNCH_PREP','RENEWAL_REMINDER','CHARGEBACK_MONITORING','GENERAL_FOLLOW_UP','ADVANCEMENT_TRACKING') NOT NULL;--> statement-breakpoint
ALTER TABLE `agents` ADD `mywfgAgentId` varchar(64);--> statement-breakpoint
ALTER TABLE `agents` ADD `uplineAgentId` int;--> statement-breakpoint
ALTER TABLE `agents` ADD `currentRank` enum('TRAINING_ASSOCIATE','ASSOCIATE','SENIOR_ASSOCIATE','MARKETING_DIRECTOR','SENIOR_MARKETING_DIRECTOR','EXECUTIVE_MARKETING_DIRECTOR','CEO_MARKETING_DIRECTOR','EXECUTIVE_VICE_CHAIRMAN','SENIOR_EXECUTIVE_VICE_CHAIRMAN','FIELD_CHAIRMAN','EXECUTIVE_CHAIRMAN') DEFAULT 'TRAINING_ASSOCIATE' NOT NULL;--> statement-breakpoint
ALTER TABLE `agents` ADD `rankAchievedDate` date;--> statement-breakpoint
ALTER TABLE `agents` ADD `isLifeLicensed` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `agents` ADD `isSecuritiesLicensed` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `agents` ADD `licenseApprovalDate` date;--> statement-breakpoint
ALTER TABLE `agents` ADD `totalBaseShopPoints` decimal(15,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `agents` ADD `totalPersonalPoints` decimal(15,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `agents` ADD `totalCashFlow` decimal(15,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `agents` ADD `directRecruits` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `agents` ADD `licensedAgentsInOrg` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `agents` ADD `directSmdLegs` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `mywfgSyncLogs` ADD `syncType` enum('FULL','DOWNLINE_STATUS','COMMISSIONS','PAYMENTS','CASH_FLOW','TEAM_CHART') DEFAULT 'FULL' NOT NULL;--> statement-breakpoint
ALTER TABLE `mywfgSyncLogs` ADD `reportUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `productionRecords` ADD `productCompany` varchar(100);--> statement-breakpoint
ALTER TABLE `productionRecords` ADD `customerName` varchar(255);--> statement-breakpoint
ALTER TABLE `productionRecords` ADD `basePoints` decimal(12,2);--> statement-breakpoint
ALTER TABLE `productionRecords` ADD `generation` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `productionRecords` ADD `overridePercentage` decimal(5,2);--> statement-breakpoint
ALTER TABLE `productionRecords` ADD `mywfgSyncId` varchar(100);--> statement-breakpoint
ALTER TABLE `productionRecords` ADD `paymentCycle` varchar(50);--> statement-breakpoint
ALTER TABLE `agents` ADD CONSTRAINT `agents_mywfgAgentId_unique` UNIQUE(`mywfgAgentId`);--> statement-breakpoint
ALTER TABLE `advancementProgress` ADD CONSTRAINT `advancementProgress_agentId_agents_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `commissionPayments` ADD CONSTRAINT `commissionPayments_agentId_agents_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON DELETE no action ON UPDATE no action;