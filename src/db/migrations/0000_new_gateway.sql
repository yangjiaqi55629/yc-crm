CREATE TABLE `ai_analyses` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`input_snapshot` text NOT NULL,
	`output_json` text NOT NULL,
	`model_name` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ai_analyses_customer_id_index` ON `ai_analyses` (`customer_id`);--> statement-breakpoint
CREATE TABLE `customer_tags` (
	`customer_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`customer_id`, `tag_id`),
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`phone_normalized` text NOT NULL,
	`email` text,
	`company` text,
	`title` text,
	`region` text,
	`industry` text,
	`need_description` text,
	`budget_range` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`last_follow_up_at` text,
	`next_follow_up_at` text,
	`archived_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_phone_normalized_unique` ON `customers` (`phone_normalized`);--> statement-breakpoint
CREATE INDEX `customers_status_index` ON `customers` (`status`);--> statement-breakpoint
CREATE INDEX `customers_next_follow_up_index` ON `customers` (`next_follow_up_at`);--> statement-breakpoint
CREATE TABLE `follow_ups` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`channel` text NOT NULL,
	`content` text NOT NULL,
	`outcome` text,
	`follow_up_at` text NOT NULL,
	`next_follow_up_at` text,
	`status_after` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `follow_ups_customer_id_index` ON `follow_ups` (`customer_id`);--> statement-breakpoint
CREATE TABLE `lead_events` (
	`id` text PRIMARY KEY NOT NULL,
	`event_key` text NOT NULL,
	`portal_lead_id` text,
	`customer_id` text NOT NULL,
	`raw_name` text NOT NULL,
	`raw_phone` text NOT NULL,
	`raw_email` text,
	`source` text DEFAULT 'web' NOT NULL,
	`submitted_at` text NOT NULL,
	`received_at` text NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lead_events_event_key_unique` ON `lead_events` (`event_key`);--> statement-breakpoint
CREATE INDEX `lead_events_customer_id_index` ON `lead_events` (`customer_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_hash_unique` ON `sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `sessions_user_id_index` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `sync_failures` (
	`id` text PRIMARY KEY NOT NULL,
	`event_key` text,
	`portal_lead_id` text,
	`reason` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` text NOT NULL,
	`resolved_at` text
);
--> statement-breakpoint
CREATE INDEX `sync_failures_status_index` ON `sync_failures` (`status`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);--> statement-breakpoint
CREATE TABLE `timeline_events` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`detail` text,
	`related_id` text,
	`occurred_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `timeline_events_customer_occurred_index` ON `timeline_events` (`customer_id`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);