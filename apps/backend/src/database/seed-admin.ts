import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './data-source-options';
import { User } from '../users/entities/user.entity';
import { Role } from '@workflow-brasal/shared';

dotenv.config();

/**
 * One-off dev helper: self-registration always creates a MEMBER (see AuthService.register),
 * so promoting the very first ADMIN needs a direct DB write. Usage: `pnpm seed:admin`.
 * Reads ADMIN_EMAIL/ADMIN_PASSWORD/ADMIN_NAME from the environment, with sane defaults for dev.
 */
async function main() {
  const configLike = {
    get: <T>(key: string, fallback?: T): T => (process.env[key] as unknown as T) ?? (fallback as T),
  };
  const dataSource = new DataSource(buildDataSourceOptions(configLike as any));
  await dataSource.initialize();

  const email = process.env.ADMIN_EMAIL ?? 'admin@brasal.local';
  const password = process.env.ADMIN_PASSWORD ?? 'admin123456';
  const name = process.env.ADMIN_NAME ?? 'Administrador';

  const repo = dataSource.getRepository(User);
  const existing = await repo.findOne({ where: { email } });
  if (existing) {
    existing.role = Role.ADMIN;
    existing.isActive = true;
    await repo.save(existing);
    console.log(`Usuário existente "${email}" promovido a ADMIN.`);
  } else {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = repo.create({ name, email, passwordHash, role: Role.ADMIN, isActive: true });
    await repo.save(user);
    console.log(`ADMIN criado: ${email} / senha: ${password} (troque em produção)`);
  }

  await dataSource.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
