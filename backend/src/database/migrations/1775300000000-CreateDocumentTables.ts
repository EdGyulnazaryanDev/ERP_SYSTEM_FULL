import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDocumentTables1775300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS document_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        template_type VARCHAR(50) NOT NULL,
        "templateContent" TEXT NOT NULL,
        "variablesSchema" JSONB NOT NULL DEFAULT '{}',
        "outputFormats" TEXT[] NOT NULL DEFAULT '{pdf}',
        is_active BOOLEAN NOT NULL DEFAULT true,
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        created_by UUID NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS generated_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        template_id UUID REFERENCES document_templates(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        file_path VARCHAR(500),
        file_size BIGINT,
        format VARCHAR(50) NOT NULL,
        data JSONB NOT NULL DEFAULT '{}',
        status VARCHAR(50) NOT NULL DEFAULT 'generated',
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        created_by UUID NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS generated_documents`);
    await queryRunner.query(`DROP TABLE IF EXISTS document_templates`);
  }
}
