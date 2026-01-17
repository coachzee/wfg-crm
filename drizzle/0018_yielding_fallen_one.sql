ALTER TABLE `emailTracking` ADD `resendCount` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `emailTracking` ADD `lastResendAt` timestamp;