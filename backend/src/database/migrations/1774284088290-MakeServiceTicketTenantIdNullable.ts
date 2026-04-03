import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeServiceTicketTenantIdNullable1774284088290 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "service_tickets" ALTER COLUMN "tenant_id" DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "service_tickets" ALTER COLUMN "tenant_id" SET NOT NULL
    `);
  }
}
