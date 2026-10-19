CREATE TABLE `contact_leads` (
	`id` text PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`business` text NOT NULL,
	`interest` text NOT NULL,
	`message` text NOT NULL,
	`consent_at` text NOT NULL,
	`created_at` text NOT NULL,
	`status` text DEFAULT 'nouvelle' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `contact_leads_created_at` ON `contact_leads` (`created_at`);