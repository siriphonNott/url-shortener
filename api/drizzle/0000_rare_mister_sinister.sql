CREATE TABLE `api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`key_name` text NOT NULL,
	`key_hash` text NOT NULL,
	`key_prefix` text NOT NULL,
	`scopes` text DEFAULT '{"links":"read","stats":"read"}' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`expires_at` text,
	`last_used_at` text,
	`is_personal` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CHECK (status IN ('active','inactive','expired','revoked'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_key_hash_unique` ON `api_keys` (`key_hash`);--> statement-breakpoint
CREATE INDEX `idx_api_keys_user` ON `api_keys` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_api_keys_prefix` ON `api_keys` (`key_prefix`);--> statement-breakpoint
CREATE TABLE `links` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`destination_url` text NOT NULL,
	`title` text,
	`description` text,
	`created_by` text,
	`click_count` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`expires_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `links_code_unique` ON `links` (`code`);--> statement-breakpoint
CREATE INDEX `idx_links_created_by` ON `links` (`created_by`);--> statement-breakpoint
CREATE INDEX `idx_links_created_at` ON `links` (`created_at`);--> statement-breakpoint
CREATE TABLE `redirect_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`link_id` text NOT NULL,
	`ip` text,
	`user_agent` text,
	`referer` text,
	`country` text,
	`city` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`link_id`) REFERENCES `links`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_redirect_logs_link` ON `redirect_logs` (`link_id`);--> statement-breakpoint
CREATE INDEX `idx_redirect_logs_created_at` ON `redirect_logs` (`created_at`);--> statement-breakpoint
CREATE TABLE `roles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`permissions` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `roles_name_unique` ON `roles` (`name`);--> statement-breakpoint
CREATE TABLE `user_roles` (
	`user_id` text NOT NULL,
	`role_id` text NOT NULL,
	PRIMARY KEY(`user_id`, `role_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_user_roles_role` ON `user_roles` (`role_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`full_name` text DEFAULT '' NOT NULL,
	`account_type` text DEFAULT 'free' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CHECK (account_type IN ('free','premium','enterprise')),
	CHECK (status IN ('active','inactive','suspended','pending_verification'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);