// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { EnhancedValidationPipe } from './common/pipes/validation.pipe';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Raw body for webhooks
  app.use(
    '/orders/webhook',
    bodyParser.raw({ type: '*/*' }),
    (req, _res, next) => {
      (req as any).rawBody = req.body;
      next();
    },
  );

  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: configService.get<string>('app.frontendUrl') || '*',
    credentials: true,
  });

  app.useGlobalPipes(new EnhancedValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Swagger Setup
  const config = new DocumentBuilder()
    .setTitle('PlanOrra API')
    .setDescription('Event ticketing marketplace — split payments, R2 uploads, OTP')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT-auth', // this name is used below
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = configService.get<number>('port') || 3000;
  await app.listen(port);

  console.log(`API running → http://localhost:${port}/api/v1`);
  console.log(`Swagger UI → http://localhost:${port}/api/docs`);
}
bootstrap();
