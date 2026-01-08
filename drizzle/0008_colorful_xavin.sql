CREATE TABLE `pendingPolicies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`policyNumber` varchar(50) NOT NULL,
	`ownerName` varchar(255) NOT NULL,
	`productType` varchar(100),
	`faceAmount` varchar(50),
	`deathBenefitOption` varchar(50),
	`moneyReceived` varchar(50),
	`premium` varchar(50),
	`premiumFrequency` varchar(50),
	`issueDate` varchar(20),
	`submittedDate` varchar(20),
	`policyClosureDate` varchar(20),
	`policyDeliveryTrackingNumber` varchar(100),
	`status` enum('Pending','Issued','Incomplete','Post Approval Processing','Declined','Withdrawn') NOT NULL,
	`statusAsOf` varchar(20),
	`underwritingDecision` varchar(100),
	`underwriter` varchar(100),
	`riskClass` varchar(50),
	`agentCode` varchar(20),
	`agentName` varchar(255),
	`lastSyncedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pendingPolicies_id` PRIMARY KEY(`id`),
	CONSTRAINT `pendingPolicies_policyNumber_unique` UNIQUE(`policyNumber`)
);
--> statement-breakpoint
CREATE TABLE `pendingRequirements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`policyId` int NOT NULL,
	`category` enum('Pending with Producer','Pending with Transamerica','Completed') NOT NULL,
	`dateRequested` varchar(20),
	`requirementOn` varchar(255),
	`status` varchar(50),
	`requirement` varchar(255),
	`instruction` text,
	`comments` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pendingRequirements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `pendingRequirements` ADD CONSTRAINT `pendingRequirements_policyId_pendingPolicies_id_fk` FOREIGN KEY (`policyId`) REFERENCES `pendingPolicies`(`id`) ON DELETE no action ON UPDATE no action;