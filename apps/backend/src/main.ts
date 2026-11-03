import './infrastructure/telemetry/otel';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { LoggerFilter, LoggerService } from './infrastructure/logger';
import { RedisIoAdapter } from './infrastructure/socket/redis-io.adapter';

async function bootstrap() {
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
  const ioAdapter = new RedisIoAdapter(app, process.env.REDIS_URL);
  await ioAdapter.connect();
  app.useWebSocketAdapter(ioAdapter);
  app.enableShutdownHooks();
  await app.listen(process.env.PORT);
}
void bootstrap();
