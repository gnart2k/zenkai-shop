import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20261124111119 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "portal_setting" drop constraint if exists "portal_setting_slug_unique";`
    );
    this.addSql(
      `alter table if exists "portal_setting" add column if not exists "slug" text null;`
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_portal_setting_slug_unique" ON "portal_setting" ("slug") WHERE slug is not null AND deleted_at IS NULL;`
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_portal_setting_slug_unique";`);
    this.addSql(`alter table if exists "portal_setting" drop column if exists "slug";`);
  }
}
