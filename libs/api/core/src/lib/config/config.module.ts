import { Global, Module } from '@nestjs/common';
import {
  ConfigModule as NestConfigModule,
  ConfigService,
} from '@nestjs/config';
import { EnvSchema, type Env } from './env.schema';

export type TypedConfigService = ConfigService<Env, true>;
export { ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      validate: (raw) => EnvSchema.parse(raw),
    }),
  ],
  exports: [NestConfigModule],
})
export class AppConfigModule {}
