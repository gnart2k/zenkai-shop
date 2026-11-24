import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20261124105947 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "portal_setting" add column if not exists "domains" jsonb null;`
    );
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "portal_setting" drop column if exists "domains";`);
  }
}
