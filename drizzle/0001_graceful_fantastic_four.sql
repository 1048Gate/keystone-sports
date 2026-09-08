ALTER TABLE `posts` ADD `team_slug` text;--> statement-breakpoint
CREATE INDEX `posts_team_date` ON `posts` (`team_slug`,`date`);