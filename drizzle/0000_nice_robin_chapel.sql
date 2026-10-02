CREATE TABLE `check_ins` (
	`id` text PRIMARY KEY NOT NULL,
	`ticket_id` text NOT NULL,
	`scanned_by` text,
	`result` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')) NOT NULL,
	FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `check_ins_ticket_idx` ON `check_ins` (`ticket_id`);--> statement-breakpoint
CREATE TABLE `event_forecasts` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`paid_registrations` integer NOT NULL,
	`predicted_attendance` real NOT NULL,
	`predicted_no_shows` integer NOT NULL,
	`no_show_rate` real NOT NULL,
	`recommended_waitlist` integer NOT NULL,
	`confidence` real NOT NULL,
	`confidence_label` text NOT NULL,
	`top_reasons` text DEFAULT '[]' NOT NULL,
	`recommendation` text NOT NULL,
	`model_version` text NOT NULL,
	`is_stale` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `event_forecasts_event_idx` ON `event_forecasts` (`event_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`organizer_id` text NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`category` text NOT NULL,
	`venue` text NOT NULL,
	`location_type` text NOT NULL,
	`date_time` text NOT NULL,
	`capacity` integer NOT NULL,
	`price_taka` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')) NOT NULL,
	FOREIGN KEY (`organizer_id`) REFERENCES `organizers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `events_slug_unique` ON `events` (`slug`);--> statement-breakpoint
CREATE INDEX `events_organizer_idx` ON `events` (`organizer_id`);--> statement-breakpoint
CREATE TABLE `organizer_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`action_type` text NOT NULL,
	`payload` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `organizer_actions_event_idx` ON `organizer_actions` (`event_id`);--> statement-breakpoint
CREATE TABLE `organizers` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_name` text NOT NULL,
	`contact_name` text NOT NULL,
	`contact_phone` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`registration_id` text NOT NULL,
	`amount_taka` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`mock_transaction_id` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')) NOT NULL,
	`paid_at` text,
	FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payments_registration_unique` ON `payments` (`registration_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `payments_mock_transaction_unique` ON `payments` (`mock_transaction_id`);--> statement-breakpoint
CREATE TABLE `predictions` (
	`id` text PRIMARY KEY NOT NULL,
	`registration_id` text NOT NULL,
	`attendance_probability` real NOT NULL,
	`no_show_risk` text NOT NULL,
	`top_reasons` text DEFAULT '[]' NOT NULL,
	`model_version` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')) NOT NULL,
	FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `predictions_registration_idx` ON `predictions` (`registration_id`);--> statement-breakpoint
CREATE TABLE `registrations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`event_id` text NOT NULL,
	`status` text DEFAULT 'pending_payment' NOT NULL,
	`days_before_event` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `registrations_user_event_unique` ON `registrations` (`user_id`,`event_id`);--> statement-breakpoint
CREATE INDEX `registrations_event_status_idx` ON `registrations` (`event_id`,`status`);--> statement-breakpoint
CREATE TABLE `reminders` (
	`id` text PRIMARY KEY NOT NULL,
	`registration_id` text NOT NULL,
	`sent_at` text,
	`opened_at` text,
	`confirmed_at` text,
	FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reminders_registration_idx` ON `reminders` (`registration_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`registration_id` text NOT NULL,
	`qr_token` text NOT NULL,
	`status` text DEFAULT 'valid' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')) NOT NULL,
	`checked_in_at` text,
	FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tickets_registration_unique` ON `tickets` (`registration_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `tickets_qr_token_unique` ON `tickets` (`qr_token`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`interests` text DEFAULT '[]' NOT NULL,
	`upay_account_reference` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_phone_unique` ON `users` (`phone`);