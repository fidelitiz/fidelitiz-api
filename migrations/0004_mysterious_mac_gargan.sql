CREATE TABLE `demo_nfc_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`slug` text NOT NULL,
	`label` text NOT NULL,
	`location` text NOT NULL,
	`status` text NOT NULL,
	`color` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `demo_nfc_cards_slug` ON `demo_nfc_cards` (`session_id`,`slug`);