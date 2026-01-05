CREATE TABLE `agentCashFlowHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int,
	`agentCode` varchar(64) NOT NULL,
	`agentName` varchar(255) NOT NULL,
	`titleLevel` varchar(50),
	`uplineSMD` varchar(255),
	`cashFlowAmount` decimal(15,2) NOT NULL,
	`cumulativeCashFlow` decimal(15,2) NOT NULL,
	`paymentDate` date,
	`paymentCycle` varchar(100),
	`isNetLicensed` boolean NOT NULL DEFAULT false,
	`netLicensedDate` date,
	`reportPeriod` varchar(100),
	`syncedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agentCashFlowHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `agentCashFlowHistory` ADD CONSTRAINT `agentCashFlowHistory_agentId_agents_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON DELETE no action ON UPDATE no action;