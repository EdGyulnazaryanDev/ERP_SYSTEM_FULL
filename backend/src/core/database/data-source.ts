import 'dotenv/config';
import { DataSource } from 'typeorm';
import * as path from 'path';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? process.env.POSTGRES_USER,
  password: process.env.DB_PASSWORD ?? process.env.POSTGRES_PASSWORD,
  database: process.env.DB_NAME ?? process.env.POSTGRES_DB,
  entities: [path.join(__dirname, '../../**/*.entity.{ts,js}')],
  migrations: [path.join(__dirname, '../../database/migrations/*.{ts,js}')],
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});
