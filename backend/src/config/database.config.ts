import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';

/** Shared database configuration; feature modules own their entities. */
export function databaseConfig(config: ConfigService): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    extra: { options: '-c timezone=America/El_Salvador' },
    host: config.get<string>('DB_HOST'),
    port: config.get<number>('DB_PORT'),
    database: config.get<string>('DB_DATABASE'),
    username: config.get<string>('DB_USERNAME'),
    password: config.get<string>('DB_PASSWORD'),
    entities: [join(__dirname, '..', 'modules', '**', '*.entity{.ts,.js}')],
    synchronize: config.get<string>('NODE_ENV') === 'development',
    logging: config.get<string>('NODE_ENV') === 'development',
  };
}
