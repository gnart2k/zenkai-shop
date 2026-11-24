import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20261124032649 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "variant_cost" add column if not exists "original_price" numeric null, add column if not exists "raw_original_price" jsonb null;`
    );
    this.addSql(
      `alter table if exists "variant_cost" alter column "original_cost" type numeric using ("original_cost"::numeric);`
    );
    this.addSql(`alter table if exists "variant_cost" alter column "original_cost" drop not null;`);
    this.addSql(
      `alter table if exists "variant_cost" alter column "raw_original_cost" type jsonb using ("raw_original_cost"::jsonb);`
    );
    this.addSql(
      `alter table if exists "variant_cost" alter column "raw_original_cost" drop not null;`
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "variant_cost" drop column if exists "original_price", drop column if exists "raw_original_price";`
    );

    this.addSql(
      `alter table if exists "variant_cost" alter column "original_cost" type numeric using ("original_cost"::numeric);`
    );
    this.addSql(`alter table if exists "variant_cost" alter column "original_cost" set not null;`);
    this.addSql(
      `alter table if exists "variant_cost" alter column "raw_original_cost" type jsonb using ("raw_original_cost"::jsonb);`
    );
    this.addSql(
      `alter table if exists "variant_cost" alter column "raw_original_cost" set not null;`
    );
  }
}
