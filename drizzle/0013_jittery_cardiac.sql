ALTER TABLE `inforcePolicies` ADD `writingAgentCommission` decimal(12,2);--> statement-breakpoint
ALTER TABLE `inforcePolicies` ADD `secondAgentName` varchar(255);--> statement-breakpoint
ALTER TABLE `inforcePolicies` ADD `secondAgentCode` varchar(50);--> statement-breakpoint
ALTER TABLE `inforcePolicies` ADD `secondAgentSplit` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `inforcePolicies` ADD `secondAgentLevel` decimal(5,2) DEFAULT '0.25';--> statement-breakpoint
ALTER TABLE `inforcePolicies` ADD `secondAgentCommission` decimal(12,2);--> statement-breakpoint
ALTER TABLE `inforcePolicies` ADD `secondAgentId` int;--> statement-breakpoint
ALTER TABLE `inforcePolicies` ADD CONSTRAINT `inforcePolicies_secondAgentId_agents_id_fk` FOREIGN KEY (`secondAgentId`) REFERENCES `agents`(`id`) ON DELETE no action ON UPDATE no action;