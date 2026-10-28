import './config/timezone';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  // rawBody:true necesario para verificar firma del webhook de Wompi
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
  });

  const port = process.env.APP_PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Backend corriendo en http://localhost:${port}/api`);
}
bootstrap();
