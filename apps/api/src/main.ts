import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger as PinoLogger } from 'nestjs-pino';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';
import type { Env } from '@artisangh/api-core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(PinoLogger));

  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: config
      .get('CORS_ORIGINS')
      .split(',')
      .map((s) => s.trim()),
    credentials: true,
  });
  app.setGlobalPrefix('api');

  const swagger = new DocumentBuilder()
    .setTitle('The Artisan GH API')
    .setDescription(
      'Marketplace API — auth, users, artisans, bookings, payments.',
    )
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const doc = SwaggerModule.createDocument(app, swagger);
  SwaggerModule.setup('api/docs', app, doc, {
    jsonDocumentUrl: 'api/openapi.json',
  });

  const port = config.get('API_PORT');
  const host = config.get('API_HOST');
  await app.listen(port, host);
  Logger.log(`🚀 API ready on http://${host}:${port}/api  (docs: /api/docs)`);
}

bootstrap();
