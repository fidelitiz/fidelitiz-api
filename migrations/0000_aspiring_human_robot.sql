CREATE TABLE `demo_members` (
	`session_id` text NOT NULL,
	`code` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`member_number` text NOT NULL,
	`status` text NOT NULL,
	`points` integer NOT NULL,
	`initial_points` integer NOT NULL,
	`last_visit_at` text,
	PRIMARY KEY(`session_id`, `code`)
);
--> statement-breakpoint
CREATE TABLE `demo_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`code` text NOT NULL,
	`kind` text NOT NULL,
	`points` integer NOT NULL,
	`previous_points` integer NOT NULL,
	`amount_cents` integer,
	`receipt_key` text,
	`created_at` text NOT NULL,
	`undone` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `demo_receipt_once` ON `demo_transactions` (`session_id`,`receipt_key`);