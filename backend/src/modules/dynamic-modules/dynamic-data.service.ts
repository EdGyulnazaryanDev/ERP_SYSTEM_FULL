import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class DynamicDataService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  async findAll(
    moduleName: string,
    tenantId: string,
    filters?: Record<string, any>,
    page = 1,
    limit = 50,
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const tableName = `module_${moduleName}`;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE tenant_id = $1';

    const params: any[] = [tenantId];
    let paramIndex = 2;

    // Add filters
    if (filters && Object.keys(filters).length > 0) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          whereClause += ` AND ${key} = $${paramIndex}`;

          params.push(value);
          paramIndex++;
        }
      });
    }

    // Get total count
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const countResult = await this.dataSource.query(
      `SELECT COUNT(*) as count FROM ${tableName} ${whereClause}`,
      params,
    );
    const total = parseInt(
      (countResult as Array<{ count: string }>)[0]?.count || '0',
      10,
    );

    // Get data
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const data = await this.dataSource.query(
      `SELECT * FROM ${tableName} ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,

      [...params, limit, offset], // eslint-disable-line @typescript-eslint/no-unsafe-assignment
    );

    return { data: data as any[], total, page, limit };
  }
  async findOne(
    moduleName: string,
    id: string,
    tenantId: string,
  ): Promise<any> {
    const tableName = `module_${moduleName}`;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result = await this.dataSource.query(
      `SELECT * FROM ${tableName} WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId],
    );

    if (!Array.isArray(result) || result.length === 0) {
      throw new NotFoundException('Record not found');
    }

    return result[0];
  }

  async create(
    moduleName: string,
    data: Record<string, any>,
    tenantId: string,
  ): Promise<any> {
    const tableName = `module_${moduleName}`;

    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 2}`);

    const sql = `
      INSERT INTO ${tableName} (tenant_id, ${columns.join(', ')})
      VALUES ($1, ${placeholders.join(', ')})
      RETURNING *
    `;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result = await this.dataSource.query(sql, [
      tenantId,
      ...(values as (string | number | boolean)[]),
    ]);

    if (!Array.isArray(result)) {
      throw new Error('Unexpected database response');
    }

    return result[0];
  }

  async update(
    moduleName: string,
    id: string,
    data: Record<string, any>,
    tenantId: string,
  ): Promise<any> {
    const tableName = `module_${moduleName}`;

    const updates = Object.entries(data)
      .map(([key], i) => `${key} = $${i + 3}`)
      .join(', ');

    const values = Object.values(data);

    const sql = `
      UPDATE ${tableName}
      SET ${updates}, updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2
      RETURNING *
    `;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result = await this.dataSource.query(sql, [
      id,
      tenantId,
      ...(values as (string | number | boolean)[]),
    ]);

    if (!Array.isArray(result) || result.length === 0) {
      throw new NotFoundException('Record not found');
    }

    return result[0];
  }

  async delete(
    moduleName: string,
    id: string,
    tenantId: string,
  ): Promise<void> {
    const tableName = `module_${moduleName}`;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result = await this.dataSource.query(
      `DELETE FROM ${tableName} WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [id, tenantId],
    );

    if (!Array.isArray(result) || result.length === 0) {
      throw new NotFoundException('Record not found');
    }
  }

  async bulkDelete(
    moduleName: string,
    ids: string[],
    tenantId: string,
  ): Promise<number> {
    const tableName = `module_${moduleName}`;
    const placeholders = ids.map((_, i) => `$${i + 2}`).join(',');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result = await this.dataSource.query(
      `DELETE FROM ${tableName} 
       WHERE id IN (${placeholders}) AND tenant_id = $1 
       RETURNING id`,
      [tenantId, ...ids],
    );

    return Array.isArray(result) ? result.length : 0;
  }
}
