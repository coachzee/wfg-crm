CREATE TABLE `monthlyTeamCashFlow` (
	`id` int AUTO_INCREMENT NOT NULL,
	`monthYear` varchar(10) NOT NULL,
	`month` int NOT NULL,
	`year` int NOT NULL,
	`superTeamCashFlow` decimal(15,2) NOT NULL,
	`personalCashFlow` decimal(15,2) NOT NULL,
	`agentCode` varchar(64) NOT NULL DEFAULT '73DXR',
	`agentName` varchar(255) NOT NULL DEFAULT 'SHOPEJU, ZAID',
	`syncedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `monthlyTeamCashFlow_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_month_year_agent` UNIQUE(`monthYear`,`agentCode`)
);
