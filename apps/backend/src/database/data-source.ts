import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { allEntities } from './entities';

dotenv.config();

/**
 * Standalone DataSource for the TypeORM CLI (migration:generate/run/revert against mssql).
 * `@nestjs/typeorm`'s forRootAsync isn't usable by the CLI, hence this separate export.
 */
export const AppDataSource = new DataSource({
  type: 'mssql',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 1433),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: (process.env.DB_ENCRYPT ?? 'true') === 'true',
    trustServerCertificate: (process.env.DB_TRUST_SERVER_CERTIFICATE ?? 'true') === 'true',
  },
  entities: allEntities,
  synchronize: false,
  migrations: [path.join(__dirname, 'migrations', '*.ts')],
});
