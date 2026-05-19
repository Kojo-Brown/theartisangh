import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Logger as PinoLogger } from 'nestjs-pino';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(PinoLogger));
  Logger.log(
    '🛠  Worker booted — consumers: sms.send, kyc.verify, voice.transcribe',
  );

  const shutdown = async (signal: string) => {
    Logger.log(`${signal} received, shutting down worker…`);
    await app.close();
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap();
