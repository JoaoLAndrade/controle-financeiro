CREATE TABLE `recurring_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`type` enum('income','expense') NOT NULL,
	`categoryId` int,
	`dayOfMonth` int NOT NULL DEFAULT 1,
	`active` enum('yes','no') NOT NULL DEFAULT 'yes',
	`lastGeneratedMonth` varchar(7),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recurring_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `transactions` ADD `recurringId` int;