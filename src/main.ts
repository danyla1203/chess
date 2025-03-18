import { otelSDK } from './tools/tracing';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { LoggerFilter, LoggerService } from './tools/logger';

async function bootstrap() {
  await otelSDK.start();
  const allowedOrigin =
    process.env.ENV === 'dev' ? 'http://localhost:3000' : '*';
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
    rawBody: true,
    cors: {
      origin: allowedOrigin,
    },
  });
  const { httpAdapter } = app.get(HttpAdapterHost);

  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalFilters(new LoggerFilter(new LoggerService(), httpAdapter));
  await app.listen(process.env.PORT);
}
bootstrap();
