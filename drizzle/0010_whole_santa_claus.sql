CREATE TABLE `inforcePolicies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`policyNumber` varchar(50) NOT NULL,
	`ownerName` varchar(255) NOT NULL,
	`issueState` varchar(10),
	`productType` varchar(100),
	`faceAmount` decimal(15,2),
	`premium` decimal(12,2),
	`premiumFrequency` varchar(20),
	`annualPremium` decimal(12,2),
	`transamericaMultiplier` decimal(5,2) DEFAULT '1.25',
	`calculatedCommission` decimal(12,2),
	`writingAgentName` varchar(255),
	`writingAgentCode` varchar(50),
	`writingAgentSplit` int DEFAULT 100,
	`writingAgentLevel` decimal(5,2) DEFAULT '0.55',
	`agentId` int,
	`premiumDueDate` varchar(20),
	`expiryDate` varchar(20),
	`issueDate` varchar(20),
	`status` enum('Active','Surrendered','Free Look Surrender','Lapsed','Terminated') NOT NULL DEFAULT 'Active',
	`overwritingAgents` json,
	`lastSyncedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inforcePolicies_id` PRIMARY KEY(`id`),
	CONSTRAINT `inforcePolicies_policyNumber_unique` UNIQUE(`policyNumber`)
);
--> statement-breakpoint
ALTER TABLE `syncLogs` MODIFY COLUMN `syncType` enum('FULL_SYNC','DOWNLINE_STATUS','CONTACT_INFO','CASH_FLOW','PRODUCTION','TRANSAMERICA_PENDING','TRANSAMERICA_INFORCE') NOT NULL;--> statement-breakpoint
ALTER TABLE `inforcePolicies` ADD CONSTRAINT `inforcePolicies_agentId_agents_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON DELETE no action ON UPDATE no action;