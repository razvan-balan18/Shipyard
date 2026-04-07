import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import helmet from 'helmet';
import { AppModule } from './app.module';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new IoAdapter(app));

  if (!process.env.CORS_ORIGIN) {
    logger.warn(
      'CORS_ORIGIN is not set — falling back to http://localhost:4200. Set this in production.',
    );
  }

  app.use(helmet());

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:4200',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
