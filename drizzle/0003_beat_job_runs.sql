CREATE TABLE `beat_job_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`job_type` text NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`apify_run_id` text,
	`retrieved` integer DEFAULT 0 NOT NULL,
	`discarded` integer DEFAULT 0 NOT NULL,
	`deduped` integer DEFAULT 0 NOT NULL,
	`pending_written` integer DEFAULT 0 NOT NULL,
	`approx_cost_usd` real,
	`error` text,
	`summary_json` text
);
--> statement-breakpoint
CREATE INDEX `beat_job_runs_started` ON `beat_job_runs` (`started_at`);
--> statement-breakpoint
CREATE INDEX `beat_job_runs_type` ON `beat_job_runs` (`job_type`, `started_at`);
