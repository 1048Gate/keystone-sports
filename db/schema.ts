import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const posts = sqliteTable('posts', {
  id: text('id').primaryKey(), authorId: text('author_id').notNull(), date: text('date').notNull(),
  kind: text('kind').notNull(), title: text('title').notNull(), body: text('body').notNull(), eventTime: text('event_time'),
  teamSlug: text('team_slug'), published: integer('published').notNull().default(0), updatedAt: text('updated_at').notNull(),
}, table => [
  index('posts_published_date').on(table.published, table.date),
  index('posts_team_date').on(table.teamSlug, table.date),
]);
export const usage = sqliteTable('ai_usage', {
  key: text('key').primaryKey(), count: integer('count').notNull().default(0), expiresAt: integer('expires_at').notNull(),
});
