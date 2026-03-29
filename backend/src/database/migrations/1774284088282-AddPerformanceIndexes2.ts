import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Composite indexes on (tenant_id, status) and (tenant_id, created_at)
 * across all major tables to eliminate full-table scans filtered by tenant.
 */
export class AddPerformanceIndexes21774284088282 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const indexes: [string, string, string[]][] = [
      // [table, index_name, columns]
      ['shipments',             'idx_shipments_tenant_status',       ['tenant_id', 'status']],
      ['shipments',             'idx_shipments_tenant_created',      ['tenant_id', 'created_at']],
      ['transactions',          'idx_transactions_tenant_status',    ['tenant_id', 'status']],
      ['transactions',          'idx_transactions_tenant_created',   ['tenant_id', 'created_at']],
      ['account_receivables',   'idx_ar_tenant_status',              ['tenant_id', 'status']],
      ['account_receivables',   'idx_ar_tenant_created',             ['tenant_id', 'created_at']],
      ['account_payables',      'idx_ap_tenant_status',              ['tenant_id', 'status']],
      ['account_payables',      'idx_ap_tenant_created',             ['tenant_id', 'created_at']],
      ['journal_entries',       'idx_je_tenant_status',              ['tenant_id', 'status']],
      ['journal_entries',       'idx_je_tenant_created',             ['tenant_id', 'created_at']],
      ['inventory',             'idx_inventory_tenant_created',      ['tenant_id', 'created_at']],
      ['employees',             'idx_employees_tenant_status',       ['tenant_id', 'status']],
      ['employees',             'idx_employees_tenant_created',      ['tenant_id', 'created_at']],
      ['purchase_orders',       'idx_po_tenant_status',              ['tenant_id', 'status']],
      ['purchase_orders',       'idx_po_tenant_created',             ['tenant_id', 'created_at']],
      ['products',              'idx_products_tenant_created',       ['tenant_id', 'created_at']],
      ['assets',                'idx_assets_tenant_status',          ['tenant_id', 'status']],
      ['assets',                'idx_assets_tenant_created',         ['tenant_id', 'created_at']],
      ['service_tickets',       'idx_tickets_tenant_status',         ['tenant_id', 'status']],
      ['service_tickets',       'idx_tickets_tenant_created',        ['tenant_id', 'created_at']],
      ['projects',              'idx_projects_tenant_status',        ['tenant_id', 'status']],
      ['projects',              'idx_projects_tenant_created',       ['tenant_id', 'created_at']],
      ['production_orders',     'idx_prod_orders_tenant_status',     ['tenant_id', 'status']],
      ['production_orders',     'idx_prod_orders_tenant_created',    ['tenant_id', 'created_at']],
      ['payments',              'idx_payments_tenant_created',       ['tenant_id', 'created_at']],
      ['leave_requests',        'idx_leave_tenant_status',           ['tenant_id', 'status']],
      ['leave_requests',        'idx_leave_tenant_created',          ['tenant_id', 'created_at']],
      ['stock_movements',       'idx_stock_mv_tenant_created',       ['tenant_id', 'created_at']],
      ['crm_activities',        'idx_crm_act_tenant_status',         ['tenant_id', 'status']],
      ['crm_activities',        'idx_crm_act_tenant_created',        ['tenant_id', 'created_at']],
    ];

    for (const [table, name, cols] of indexes) {
      const colList = cols.map((c) => `"${c}"`).join(', ');
      await queryRunner.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "${name}"
        ON "${table}" (${colList})
      `).catch(() => {
        // Table may not exist in all deployments — skip gracefully
      });
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const names = [
      'idx_shipments_tenant_status', 'idx_shipments_tenant_created',
      'idx_transactions_tenant_status', 'idx_transactions_tenant_created',
      'idx_ar_tenant_status', 'idx_ar_tenant_created',
      'idx_ap_tenant_status', 'idx_ap_tenant_created',
      'idx_je_tenant_status', 'idx_je_tenant_created',
      'idx_inventory_tenant_created',
      'idx_employees_tenant_status', 'idx_employees_tenant_created',
      'idx_po_tenant_status', 'idx_po_tenant_created',
      'idx_products_tenant_created',
      'idx_assets_tenant_status', 'idx_assets_tenant_created',
      'idx_tickets_tenant_status', 'idx_tickets_tenant_created',
      'idx_projects_tenant_status', 'idx_projects_tenant_created',
      'idx_prod_orders_tenant_status', 'idx_prod_orders_tenant_created',
      'idx_payments_tenant_created',
      'idx_leave_tenant_status', 'idx_leave_tenant_created',
      'idx_stock_mv_tenant_created',
      'idx_crm_act_tenant_status', 'idx_crm_act_tenant_created',
    ];
    for (const name of names) {
      await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "${name}"`).catch(() => {});
    }
  }
}
