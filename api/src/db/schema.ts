import { sqliteTable, text, integer, primaryKey, index } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  fullName: text('full_name').notNull().default(''),
  accountType: text('account_type').notNull().default('free'),
  status: text('status').notNull().default('active'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const roles = sqliteTable('roles', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description').notNull().default(''),
  permissions: text('permissions').notNull().default('{}'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const userRoles = sqliteTable('user_roles', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: text('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.roleId] }),
  roleIdx: index('idx_user_roles_role').on(t.roleId),
}));

export const links = sqliteTable('links', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  destinationUrl: text('destination_url').notNull(),
  title: text('title'),
  description: text('description'),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  clickCount: integer('click_count').notNull().default(0),
  isActive: integer('is_active').notNull().default(1),
  expiresAt: text('expires_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (t) => ({
  byUser: index('idx_links_created_by').on(t.createdBy),
  byCreated: index('idx_links_created_at').on(t.createdAt),
}));

export const apiKeys = sqliteTable('api_keys', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  keyName: text('key_name').notNull(),
  keyHash: text('key_hash').notNull().unique(),
  keyPrefix: text('key_prefix').notNull(),
  scopes: text('scopes').notNull().default('{"links":"read","stats":"read"}'),
  status: text('status').notNull().default('active'),
  expiresAt: text('expires_at'),
  lastUsedAt: text('last_used_at'),
  isPersonal: integer('is_personal').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (t) => ({
  byUser: index('idx_api_keys_user').on(t.userId),
  byPrefix: index('idx_api_keys_prefix').on(t.keyPrefix),
}));

export const redirectLogs = sqliteTable('redirect_logs', {
  id: text('id').primaryKey(),
  linkId: text('link_id').notNull().references(() => links.id, { onDelete: 'cascade' }),
  ip: text('ip'),
  userAgent: text('user_agent'),
  referer: text('referer'),
  country: text('country'),
  city: text('city'),
  createdAt: text('created_at').notNull(),
}, (t) => ({
  byLink: index('idx_redirect_logs_link').on(t.linkId),
  byCreated: index('idx_redirect_logs_created_at').on(t.createdAt),
}));

export const schema = { users, roles, userRoles, links, apiKeys, redirectLogs };
