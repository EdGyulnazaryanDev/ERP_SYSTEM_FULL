import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContractFieldsToEmployees1774284088280 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "employees"
        ADD COLUMN IF NOT EXISTS "contract_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS "contract_signature" TEXT,
        ADD COLUMN IF NOT EXISTS "contract_signed_at" TIMESTAMP
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "employees"
        DROP COLUMN IF EXISTS "contract_status",
        DROP COLUMN IF EXISTS "contract_signature",
        DROP COLUMN IF EXISTS "contract_signed_at"
    `);
  }
}
