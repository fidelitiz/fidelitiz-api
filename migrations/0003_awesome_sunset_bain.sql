CREATE TABLE `demo_automations` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`trigger` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`paused` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `demo_automations_session` ON `demo_automations` (`session_id`,`created_at`);