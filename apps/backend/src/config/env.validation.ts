import { plainToInstance } from 'class-transformer';
import { IsIn, IsNotEmpty, IsOptional, validateSync, ValidateIf } from 'class-validator';

/** Matches the fallback baked into JwtModule's registerAsync (auth.module.ts) and
 * data-source-options.ts — the whole point of this check is to catch that placeholder still
 * being live in production. */
const INSECURE_JWT_SECRET_DEFAULT = 'change-me-in-production';

class EnvironmentVariables {
  @IsOptional()
  @IsIn(['development', 'production', 'test'])
  NODE_ENV?: string;

  @IsOptional()
  @IsIn(['sqlite', 'mssql'])
  DB_TYPE?: string;

  @IsNotEmpty({ message: 'JWT_SECRET must be set' })
  JWT_SECRET: string;

  @ValidateIf((env: EnvironmentVariables) => env.DB_TYPE === 'mssql')
  @IsNotEmpty({ message: 'DB_HOST is required when DB_TYPE=mssql' })
  DB_HOST?: string;

  @ValidateIf((env: EnvironmentVariables) => env.DB_TYPE === 'mssql')
  @IsNotEmpty({ message: 'DB_USERNAME is required when DB_TYPE=mssql' })
  DB_USERNAME?: string;

  @ValidateIf((env: EnvironmentVariables) => env.DB_TYPE === 'mssql')
  @IsNotEmpty({ message: 'DB_PASSWORD is required when DB_TYPE=mssql' })
  DB_PASSWORD?: string;

  @ValidateIf((env: EnvironmentVariables) => env.DB_TYPE === 'mssql')
  @IsNotEmpty({ message: 'DB_DATABASE is required when DB_TYPE=mssql' })
  DB_DATABASE?: string;
}

/**
 * Passed to ConfigModule.forRoot({ validate }) — runs before any other module initializes, so a
 * bad environment fails the boot loudly instead of the app coming up in a silently-insecure or
 * silently-misconfigured state. Two separate failure modes:
 *  1. Structural — a required var is missing outright (class-validator, same library already used
 *     for every DTO in this app, so no new validation approach to learn).
 *  2. The insecure JWT_SECRET placeholder is still live specifically in production — allowed in
 *     dev/test since it's harmless on a machine nothing else can reach.
 */
export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, { enableImplicitConversion: true });
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    const messages = errors.flatMap((e) => Object.values(e.constraints ?? {}));
    throw new Error(`Invalid environment configuration:\n${messages.join('\n')}`);
  }

  if (validated.NODE_ENV === 'production' && validated.JWT_SECRET === INSECURE_JWT_SECRET_DEFAULT) {
    throw new Error(
      'JWT_SECRET is still set to the insecure placeholder ("change-me-in-production"). ' +
        'Set a real secret before running in production — anyone who reads the source code ' +
        'can otherwise forge a valid login token for any user, including admin.',
    );
  }

  return validated;
}
