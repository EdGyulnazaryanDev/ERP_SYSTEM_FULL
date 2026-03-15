import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from './core/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS - Allow all origins in development
  app.enableCors({
    origin: true, // Allow all origins in development
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
    ],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');

  app.useGlobalFilters(new GlobalExceptionFilter());

  const PORT = process.env.PORT || 3000;
  app.enableShutdownHooks();
  await app.listen(PORT);
}

bootstrap()
  .then(() => {
    const PORT = process.env.PORT || 3000;
    console.log(`Server running on http://localhost:${PORT}`);
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
