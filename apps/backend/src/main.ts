import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Prefijo global para todos los endpoints de la API
  app.setGlobalPrefix('api');

  // Habilitar CORS para permitir llamadas desde el Landing y la PWA
  app.enableCors({
    origin: true, // En desarrollo permite todos los orígenes locales
    credentials: true,
  });

  // Validación estricta global de DTOs con class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Filtro global de excepciones estructuradas
  app.useGlobalFilters(new HttpExceptionFilter());

  // Configuración de documentación OpenAPI / Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Fidelity Wallet API')
    .setDescription(
      'API Core para el motor de pases de Apple / Google Wallet, gestión transaccional de sellos FIFO y administración de personal.',
    )
    .setVersion('1.0.0')
    .addTag('Customers', 'Alta y búsqueda de clientes para emisión de pases')
    .addTag('Passes', 'Generación criptográfica de pases Apple y Google Wallet')
    .addTag('Scan', 'Validación, asignación de sellos FIFO y canjes')
    .addTag('Staff', 'Invitación y gestión de personal cajero')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Fidelity Wallet API Docs',
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  logger.log(`🚀 API REST ejecutándose en: http://localhost:${port}/api`);
  logger.log(`📖 Documentación Swagger disponible en: http://localhost:${port}/api/docs`);
}

await bootstrap();
