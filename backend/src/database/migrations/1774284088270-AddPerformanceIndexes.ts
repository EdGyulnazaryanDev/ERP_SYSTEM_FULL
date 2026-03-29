import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1774284088270 implements MigrationInterface {
  name = 'AddPerformanceIndexes1774284088270';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Products
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_products_tenant_status" ON "products" ("tenant_id", "is_active")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_products_tenant_created" ON "products" ("tenant_id", "created_at" DESC)`);

    // Categories
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_categories_tenant_created" ON "categories" ("tenant_id", "created_at" DESC)`);

    // Transactions
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_transactions_tenant_status" ON "transactions" ("tenant_id", "status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_transactions_tenant_created" ON "transactions" ("tenant_id", "created_at" DESC)`);

    // Inventory
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_inventory_tenant_created" ON "inventory_items" ("tenant_id", "created_at" DESC)`);

    // Journal entries
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_journal_entries_tenant_created" ON "journal_entries" ("tenant_id", "created_at" DESC)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_journal_entries_tenant_status" ON "journal_entries" ("tenant_id", "status")`);

    // Page access
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_page_access_role_tenant" ON "page_access" ("role_id", "tenant_id")`);

    // User roles
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_user_roles_user" ON "user_roles" ("user_id")`);

    // Company subscriptions
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_company_subscriptions_tenant_status" ON "company_subscriptions" ("tenant_id", "status")`);

    // Audit logs
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_audit_logs_tenant_created" ON "audit_logs" ("tenant_id", "created_at" DESC)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_products_tenant_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_products_tenant_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_categories_tenant_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_transactions_tenant_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_transactions_tenant_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_inventory_tenant_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_journal_entries_tenant_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_journal_entries_tenant_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_page_access_role_tenant"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_roles_user"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_company_subscriptions_tenant_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_logs_tenant_created"`);
  }
}
