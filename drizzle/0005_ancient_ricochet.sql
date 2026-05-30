CREATE TABLE `dashboard_prefs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`widgetOrder` text NOT NULL DEFAULT ('[]'),
	`hiddenWidgets` text NOT NULL DEFAULT ('[]'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dashboard_prefs_id` PRIMARY KEY(`id`),
	CONSTRAINT `dashboard_prefs_userId_unique` UNIQUE(`userId`)
);
