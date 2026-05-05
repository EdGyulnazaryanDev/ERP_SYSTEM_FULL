import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateServiceSchemas1775400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS inventory`);
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS procurement`);
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS accounting`);
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS hr`);
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS crm`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP SCHEMA IF EXISTS crm CASCADE`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS hr CASCADE`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS accounting CASCADE`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS procurement CASCADE`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS inventory CASCADE`);
  }
}
