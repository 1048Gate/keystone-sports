-- Resolve historical duplicate_fingerprint values and add a partial unique index.
--
-- Survivor rule (deterministic, preserves editorial history):
--   1. For each group of records sharing a non-null duplicate_fingerprint:
--      a. Preserve an approved item first (approval_status = 'approved').
--      b. If none approved, preserve the oldest (earliest created_at).
--   2. Set duplicate_fingerprint = NULL on all other records in the group.
--   3. Create a partial unique index on non-null duplicate_fingerprint values.
--
-- This ensures cron retries and overlapping jobs cannot create duplicate
-- Beat candidates via different URLs with the same fingerprint.
-- No records are deleted — only fingerprints are nulled on non-survivors.
--> statement-breakpoint
UPDATE `beat_items`
SET `duplicate_fingerprint` = NULL
WHERE `duplicate_fingerprint` IS NOT NULL
  AND `id` NOT IN (
    SELECT `id` FROM (
      SELECT
        `id`,
        `duplicate_fingerprint`,
        ROW_NUMBER() OVER (
          PARTITION BY `duplicate_fingerprint`
          ORDER BY
            CASE WHEN `approval_status` = 'approved' THEN 0 ELSE 1 END,
            `created_at` ASC
        ) AS `rn`
      FROM `beat_items`
      WHERE `duplicate_fingerprint` IS NOT NULL
    ) WHERE `rn` = 1
  );--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `beat_items_duplicate_fingerprint_unique`
  ON `beat_items` (`duplicate_fingerprint`)
  WHERE `duplicate_fingerprint` IS NOT NULL;
