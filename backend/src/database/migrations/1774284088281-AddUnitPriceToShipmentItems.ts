import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUnitPriceToShipmentItems1774284088281 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "shipment_items"
        ADD COLUMN IF NOT EXISTS "unit_price" DECIMAL(10,2)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "shipment_items"
        DROP COLUMN IF EXISTS "unit_price"
    `);
  }
}
