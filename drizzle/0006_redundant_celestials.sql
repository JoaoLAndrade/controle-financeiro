ALTER TABLE `dashboard_prefs` MODIFY COLUMN `widgetOrder` text NOT NULL;--> statement-breakpoint
ALTER TABLE `dashboard_prefs` MODIFY COLUMN `hiddenWidgets` text NOT NULL;--> statement-breakpoint
ALTER TABLE `goals` MODIFY COLUMN `yearMonth` varchar(7) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `currency` enum('BRL','USD') DEFAULT 'BRL' NOT NULL;