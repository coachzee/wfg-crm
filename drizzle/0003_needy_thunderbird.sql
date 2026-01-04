ALTER TABLE `clients` ADD `totalFaceAmount` decimal(15,2);--> statement-breakpoint
ALTER TABLE `clients` ADD `householdId` varchar(64);--> statement-breakpoint
ALTER TABLE `clients` ADD `isHeadOfHousehold` boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE `productionRecords` ADD `clientId` int;--> statement-breakpoint
ALTER TABLE `productionRecords` ADD `faceAmount` decimal(15,2);--> statement-breakpoint
ALTER TABLE `productionRecords` ADD CONSTRAINT `productionRecords_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;