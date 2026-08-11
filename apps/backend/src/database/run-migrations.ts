import 'reflect-metadata';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { allEntities } from './entities';

/**
 * Standalone migration runner for the compiled (dist) build — used by the Docker entrypoint
 * before starting the app. Unlike `data-source.ts` (which targets the TypeORM CLI via ts-node
 * and globs `migrations/*.ts`), this globs the compiled `migrations/*.js` files directly, since
 * no ts-node/tsconfig-paths is available in the production image.
 */

const mssqlOptions = {
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 1433),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: (process.env.DB_ENCRYPT ?? 'true') === 'true',
    trustServerCertificate: (process.env.DB_TRUST_SERVER_CERTIFICATE ?? 'true') === 'true',
  },
};

/** A fresh SQL Server only has `master` — create the target database on first boot. */
async function ensureDatabaseExists(database: string): Promise<void> {
  const masterDataSource = new DataSource({ type: 'mssql', ...mssqlOptions, database: 'master' });
  await masterDataSource.initialize();
  await masterDataSource.query(
    `IF DB_ID('${database}') IS NULL EXEC('CREATE DATABASE [${database}]')`,
  );
  await masterDataSource.destroy();
}

async function run(): Promise<void> {
  const database = process.env.DB_DATABASE as string;
  await ensureDatabaseExists(database);

  const dataSource = new DataSource({
    type: 'mssql',
    ...mssqlOptions,
    database,
    entities: allEntities,
    synchronize: false,
    migrations: [path.join(__dirname, 'migrations', '*.js')],
  });

  await dataSource.initialize();
  const applied = await dataSource.runMigrations();
  console.log(`Migrations applied: ${applied.length}`);
  await dataSource.destroy();
}

run().catch((err) => {
  console.error('Migration run failed:', err);
  process.exit(1);
});
