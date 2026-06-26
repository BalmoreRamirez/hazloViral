import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { join } from 'path';
import * as express from 'express';

async function bootstrap() {
  // rawBody:true necesario para verificar firma del webhook de Wompi
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Servir archivos subidos (PDFs, videos, imágenes) sin el prefijo /api
  // Rutas: /uploads/pdfs/<file>  y  /uploads/files/<file>
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
  });

  const port = process.env.APP_PORT ?? 3000;
  await app.listen(port);
  console.log(`Backend corriendo en http://localhost:${port}/api`);
}
bootstrap();
