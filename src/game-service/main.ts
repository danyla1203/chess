import '../infrastructure/telemetry/otel';
import { NestFactory } from '@nestjs/core';
import { LoggerService } from '../infrastructure/logger';
import { GameServiceModule } from './game-service.module';
import { connectGrpc } from './grpc.server';

async function bootstrap() {
  const app = await NestFactory.create(GameServiceModule, {
    logger: new LoggerService(),
  });
  app.enableShutdownHooks();
  connectGrpc(app);
  await app.startAllMicroservices();
  await app.listen(process.env.HEALTH_PORT ?? 9300);
}
void bootstrap();
