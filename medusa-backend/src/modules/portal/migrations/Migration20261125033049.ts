import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261125033049 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "collab_request" add column if not exists "customer_address" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "collab_request" drop column if exists "customer_address";`);
  }

}
