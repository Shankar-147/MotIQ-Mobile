import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // The web app (5173) and the mobile app in a browser (8081) run on other
  // ports in development, so the browser needs permission to call this API.
  const origins = process.env.CORS_ORIGIN ?? 'http://localhost:5173,http://localhost:8081';
  app.enableCors({ origin: origins.split(',') });
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
