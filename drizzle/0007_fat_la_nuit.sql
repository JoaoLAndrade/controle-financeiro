ALTER TABLE `categories` MODIFY COLUMN `type` enum('income','expense','both','transfer') NOT NULL DEFAULT 'both';--> statement-breakpoint
ALTER TABLE `recurring_transactions` MODIFY COLUMN `type` enum('income','expense','transfer') NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` MODIFY COLUMN `type` enum('income','expense','transfer') NOT NULL;