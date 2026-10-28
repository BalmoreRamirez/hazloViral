import './config/timezone';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { getAllowedCorsOrigins } from './common/config/cors-origins';

async function bootstrap() {
  // rawBody:true necesario para verificar firma del webhook de Wompi
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: getAllowedCorsOrigins(),
    credentials: true,
  });

  const port = process.env.APP_PORT ?? 3009;
  await app.listen(port, '0.0.0.0');
  console.log(`Backend corriendo en http://localhost:${port}/api`);
}
bootstrap();
