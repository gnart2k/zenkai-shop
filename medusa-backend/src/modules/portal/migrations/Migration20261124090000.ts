import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20261124090000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "portal_setting" ("id" text not null, "store_id" text not null, "deposit_percent" real not null default 20, "default_contact_email" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "portal_setting_pkey" primary key ("id"));`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_portal_setting_deleted_at" ON "portal_setting" ("deleted_at") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_portal_setting_store_id_unique" ON "portal_setting" ("store_id") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `create table if not exists "portal_admin" ("id" text not null, "email" text not null, "name" text null, "store_id" text not null, "activated_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "portal_admin_pkey" primary key ("id"));`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_portal_admin_deleted_at" ON "portal_admin" ("deleted_at") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_portal_admin_email_unique" ON "portal_admin" ("email") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `create table if not exists "collaborator" ("id" text not null, "email" text not null, "name" text null, "phone" text null, "activated_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "collaborator_pkey" primary key ("id"));`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_collaborator_deleted_at" ON "collaborator" ("deleted_at") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_collaborator_email_unique" ON "collaborator" ("email") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `create table if not exists "store_collaborator" ("id" text not null, "store_id" text not null, "collaborator_id" text not null, "status" text check ("status" in ('invited', 'active', 'revoked')) not null default 'invited', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "store_collaborator_pkey" primary key ("id"));`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_store_collaborator_deleted_at" ON "store_collaborator" ("deleted_at") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_store_collaborator_store_id_collaborator_id_unique" ON "store_collaborator" ("store_id", "collaborator_id") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `create table if not exists "variant_cost" ("id" text not null, "variant_id" text not null, "original_cost" numeric not null, "raw_original_cost" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "variant_cost_pkey" primary key ("id"));`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_variant_cost_deleted_at" ON "variant_cost" ("deleted_at") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_variant_cost_variant_id_unique" ON "variant_cost" ("variant_id") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `create table if not exists "collab_request" ("id" text not null, "store_id" text not null, "collaborator_id" text not null, "variant_id" text not null, "sku" text null, "product_title" text null, "quantity" integer not null, "currency_code" text not null, "original_price" numeric not null, "raw_original_price" jsonb not null, "commercial_price" numeric not null, "raw_commercial_price" jsonb not null, "deposit_percent" real not null, "deposit_amount" numeric not null, "raw_deposit_amount" jsonb not null, "customer_name" text not null, "customer_email" text not null, "customer_phone" text null, "proof_url" text not null, "proof_file_id" text null, "status" text check ("status" in ('pending', 'approved', 'rejected', 'paid', 'cancelled')) not null default 'pending', "reject_reason" text null, "reviewed_by" text null, "reviewed_at" timestamptz null, "cart_id" text null, "order_id" text null, "paid_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "collab_request_pkey" primary key ("id"));`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_collab_request_deleted_at" ON "collab_request" ("deleted_at") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_collab_request_store_id_status" ON "collab_request" ("store_id", "status") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_collab_request_collaborator_id" ON "collab_request" ("collaborator_id") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_collab_request_cart_id" ON "collab_request" ("cart_id") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_collab_request_order_id" ON "collab_request" ("order_id") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `create table if not exists "earning_ledger_entry" ("id" text not null, "store_id" text not null, "collaborator_id" text not null, "request_id" text not null, "order_id" text null, "type" text check ("type" in ('earning', 'reversal')) not null, "amount" numeric not null, "raw_amount" jsonb not null, "currency_code" text not null, "payout_id" text null, "note" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "earning_ledger_entry_pkey" primary key ("id"));`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_earning_ledger_entry_deleted_at" ON "earning_ledger_entry" ("deleted_at") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_earning_ledger_entry_store_id_collaborator_id" ON "earning_ledger_entry" ("store_id", "collaborator_id") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_earning_ledger_entry_request_id_type" ON "earning_ledger_entry" ("request_id", "type") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_earning_ledger_entry_payout_id" ON "earning_ledger_entry" ("payout_id") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `create table if not exists "payout" ("id" text not null, "store_id" text not null, "collaborator_id" text not null, "period" text not null, "amount" numeric not null, "raw_amount" jsonb not null, "currency_code" text not null, "status" text check ("status" in ('pending', 'paid')) not null default 'pending', "paid_at" timestamptz null, "note" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "payout_pkey" primary key ("id"));`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_payout_deleted_at" ON "payout" ("deleted_at") WHERE deleted_at IS NULL;`
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "payout" cascade;`);
    this.addSql(`drop table if exists "earning_ledger_entry" cascade;`);
    this.addSql(`drop table if exists "collab_request" cascade;`);
    this.addSql(`drop table if exists "variant_cost" cascade;`);
    this.addSql(`drop table if exists "store_collaborator" cascade;`);
    this.addSql(`drop table if exists "collaborator" cascade;`);
    this.addSql(`drop table if exists "portal_admin" cascade;`);
    this.addSql(`drop table if exists "portal_setting" cascade;`);
  }
}
