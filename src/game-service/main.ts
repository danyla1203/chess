import '../tools/telemetry/otel';
import { NestFactory } from '@nestjs/core';
import { LoggerService } from '../tools/logger';
import { GameServiceModule } from './game-service.module';

async function bootstrap() {
  const app = await NestFactory.create(GameServiceModule, {
    logger: new LoggerService(),
  });
  app.enableShutdownHooks();
  await app.listen(process.env.HEALTH_PORT ?? 9300);
}
void bootstrap();
