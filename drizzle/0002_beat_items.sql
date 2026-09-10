CREATE TABLE `beat_items` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`source_tier` text NOT NULL,
	`author_account` text NOT NULL,
	`team_slug` text,
	`league` text,
	`category` text NOT NULL,
	`headline` text NOT NULL,
	`context` text,
	`original_url` text NOT NULL,
	`embed_url` text,
	`embed_id` text,
	`oembed_html` text,
	`timestamp` text NOT NULL,
	`media_type` text NOT NULL,
	`verified_official` integer DEFAULT 0 NOT NULL,
	`expires_at` text,
	`approval_status` text DEFAULT 'pending' NOT NULL,
	`approval_mode` text DEFAULT 'manual' NOT NULL,
	`approved_by` text,
	`approved_at` text,
	`pinned` integer DEFAULT 0 NOT NULL,
	`relevance_score` real,
	`duplicate_fingerprint` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`created_by` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `beat_items_original_url` ON `beat_items` (`original_url`);--> statement-breakpoint
CREATE INDEX `beat_items_pub` ON `beat_items` (`approval_status`,`expires_at`,`category`);--> statement-breakpoint
CREATE INDEX `beat_items_team` ON `beat_items` (`team_slug`,`approval_status`);--> statement-breakpoint
CREATE INDEX `beat_items_fingerprint` ON `beat_items` (`duplicate_fingerprint`);