import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { DataSourceOptions } from 'typeorm';
import { allEntities } from './entities';

/**
 * Builds TypeORM datasource options depending on DB_TYPE.
 * - "sqlite" (dev default): sql.js driver — no external DB install/admin rights required,
 *   synchronize:true creates the schema automatically.
 * - "mssql" (production): real SQL Server, synchronize disabled, migrations required.
 */
export function buildDataSourceOptions(config: ConfigService): DataSourceOptions {
  const dbType = config.get<string>('DB_TYPE', 'sqlite');

  if (dbType === 'sqlite') {
    const location = path.resolve(config.get<string>('DB_SQLITE_PATH', './data/dev.sqlite'));
    fs.mkdirSync(path.dirname(location), { recursive: true });

    return {
      type: 'sqljs',
      location,
      autoSave: true,
      entities: allEntities,
      synchronize: true,
    } as DataSourceOptions;
  }

  return {
    type: 'mssql',
    host: config.get<string>('DB_HOST', 'localhost'),
    port: config.get<number>('DB_PORT', 1433),
    username: config.get<string>('DB_USERNAME'),
    password: config.get<string>('DB_PASSWORD'),
    database: config.get<string>('DB_DATABASE'),
    options: {
      encrypt: config.get<string>('DB_ENCRYPT', 'true') === 'true',
      trustServerCertificate: config.get<string>('DB_TRUST_SERVER_CERTIFICATE', 'true') === 'true',
    },
    entities: allEntities,
    synchronize: false,
    migrations: [path.join(__dirname, 'migrations', '*.js')],
    migrationsRun: false,
  } as DataSourceOptions;
}
