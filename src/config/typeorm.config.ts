import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

const parseBoolean = (value?: string | boolean): boolean | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'boolean') return value;
  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes'].includes(normalized)) return true;
  if (['false', '0', 'no'].includes(normalized)) return false;
  return undefined;
};

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  const nodeEnv = configService.get<string>('NODE_ENV') ?? 'development';
  const isProduction = nodeEnv === 'production';
  const certPath = configService.get<string>('DATABASE_SSL_DIR');

  const fallbackHost =
    configService.get<string>('DB_HOST') ??
    configService.get<string>('database.host') ??
    'localhost';
  const fallbackPort =
    configService.get<string>('DB_PORT') ??
    configService.get<number>('database.port') ??
    5432;
  const fallbackUsername =
    configService.get<string>('DB_USERNAME') ??
    configService.get<string>('database.username') ??
    'postgres';
  const fallbackPassword =
    configService.get<string>('DB_PASSWORD') ??
    configService.get<string>('database.password') ??
    '';
  const fallbackDatabase =
    configService.get<string>('DB_NAME') ??
    configService.get<string>('database.name') ??
    'planorra';

  const fallbackUrl = `postgres://${fallbackUsername}:${encodeURIComponent(
    fallbackPassword,
  )}@${fallbackHost}:${fallbackPort}/${fallbackDatabase}`;

  const databaseUrl = configService.get<string>('DATABASE_URL') ?? fallbackUrl;

  const explicitSync =
    parseBoolean(configService.get('TYPEORM_SYNCHRONIZE')) ??
    parseBoolean(configService.get('DATABASE_SYNCHRONIZE'));

  const synchronize = explicitSync ?? !isProduction;

  const explicitDrop =
    parseBoolean(configService.get('TYPEORM_DROP_SCHEMA')) ??
    parseBoolean(configService.get('DATABASE_DROP_SCHEMA'));

  const dropSchema = explicitDrop ?? false;

  const sslConfig = isProduction
    ? {
        rejectUnauthorized: false,
        ca: certPath,
      }
    : false;

  return {
    type: 'postgres',
    url: databaseUrl,
    entities: [`${__dirname}/../**/*.entity{.ts,.js}`],
    migrations: [`${__dirname}/../migrations/**/*{.ts,.js}`],
    autoLoadEntities: true,
    synchronize,
    dropSchema,
    logging: !isProduction ? 'all' : false,
    ssl: sslConfig,
    extra: {
      poolSize: 10,
      connectionTimeoutMillis: 120000,
      idleTimeoutMillis: 120000,
    },
  };
};
