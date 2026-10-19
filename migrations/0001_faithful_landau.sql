CREATE TABLE `demo_nfc_settings` (
	`session_id` text PRIMARY KEY NOT NULL,
	`threshold` integer DEFAULT 4 NOT NULL,
	`google_url` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `demo_notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`code` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`created_at` text NOT NULL,
	`send_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `demo_notifications_member` ON `demo_notifications` (`session_id`,`code`,`send_at`);--> statement-breakpoint
CREATE TABLE `demo_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`rating` integer NOT NULL,
	`comment` text NOT NULL,
	`source` text NOT NULL,
	`status` text NOT NULL,
	`note` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `demo_reviews_session` ON `demo_reviews` (`session_id`,`created_at`);