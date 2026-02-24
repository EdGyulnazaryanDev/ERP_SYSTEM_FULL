import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { ModuleField } from './types';

@Injectable()
export class DynamicSchemaService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  async createModuleTable(
    moduleName: string,
    fields: ModuleField[],
  ): Promise<void> {
    const tableName = `module_${moduleName}`;

    // Build column definitions
    const columns = [
      'id UUID PRIMARY KEY DEFAULT gen_random_uuid()',
      'tenant_id UUID NOT NULL',
      ...fields.map((field) => this.fieldToSQL(field)),
      'created_at TIMESTAMP DEFAULT NOW()',
      'updated_at TIMESTAMP DEFAULT NOW()',
    ];

    const sql = `
      CREATE TABLE IF NOT EXISTS ${tableName} (
        ${columns.join(',\n        ')}
      );
      
      CREATE INDEX IF NOT EXISTS idx_${tableName}_tenant 
        ON ${tableName}(tenant_id);
    `;

    await this.dataSource.query(sql);
  }

  async dropModuleTable(moduleName: string): Promise<void> {
    const tableName = `module_${moduleName}`;
    await this.dataSource.query(`DROP TABLE IF EXISTS ${tableName} CASCADE`);
  }

  async addColumn(
    moduleName: string,
    field: ModuleField,
  ): Promise<void> {
    const tableName = `module_${moduleName}`;
    const columnDef = this.fieldToSQL(field);
    
    await this.dataSource.query(
      `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${columnDef}`,
    );
  }

  async dropColumn(moduleName: string, fieldName: string): Promise<void> {
    const tableName = `module_${moduleName}`;
    await this.dataSource.query(
      `ALTER TABLE ${tableName} DROP COLUMN IF EXISTS ${fieldName}`,
    );
  }

  private fieldToSQL(field: ModuleField): string {
    const typeMap: Record<string, string> = {
      text: 'VARCHAR(255)',
      longtext: 'TEXT',
      number: 'NUMERIC',
      integer: 'INTEGER',
      decimal: 'DECIMAL(10,2)',
      date: 'DATE',
      datetime: 'TIMESTAMP',
      boolean: 'BOOLEAN',
      email: 'VARCHAR(255)',
      phone: 'VARCHAR(50)',
      url: 'VARCHAR(500)',
    };

    const type = typeMap[field.type] || 'TEXT';
    const nullable = field.required ? 'NOT NULL' : 'NULL';
    const unique = field.unique ? 'UNIQUE' : '';
    const defaultVal = field.defaultValue
      ? `DEFAULT '${field.defaultValue}'`
      : '';

    return `${field.name} ${type} ${nullable} ${unique} ${defaultVal}`.trim();
  }
}
