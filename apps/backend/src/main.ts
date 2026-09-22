import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Prefijo global para todos los endpoints de la API
  app.setGlobalPrefix('api');

  // Habilitar CORS restringido a orígenes permitidos
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
      ];

  app.enableCors({
    origin: allowedOrigins,
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

  // Configuración de documentación OpenAPI / Swagger (gate estricto por entorno o flag explícito)
  const enableSwagger =
    process.env.NODE_ENV === 'development' || process.env.ENABLE_SWAGGER === 'true';

  if (enableSwagger) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Fidelity Wallet API')
      .setDescription(
        'API Core para el motor de pases de Apple / Google Wallet, gestión transaccional de sellos FIFO y administración de personal.',
      )
      .setVersion('1.0.0')
      .addTag('Customers', 'Alta y búsqueda de clientes para emisión de pases')
      .addTag('Wallet Passes & Engine', 'Generación criptográfica de pases Apple y Google Wallet')
      .addTag('Cashier Scanner (PWA)', 'Validación, asignación de sellos FIFO y canjes')
      .addTag('Merchants & Staff', 'Invitación y gestión de personal cajero')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      customSiteTitle: 'Fidelity Wallet API Docs',
    });
    logger.log('📖 Documentación Swagger disponible en: /api/docs');
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  logger.log(`🚀 API REST ejecutándose en: http://localhost:${port}/api`);
}

await bootstrap();
