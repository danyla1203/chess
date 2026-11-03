import type { INestApplication, INestMicroservice } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';
import type { GrpcOptions } from '@nestjs/microservices';
import {
  DEFAULT_GRPC_PORT,
  GAME_PACKAGE,
  GAME_PROTO,
  HEALTH_PACKAGE,
  HEALTH_PROTO,
  PROTO_LOADER,
  SERVER_CHANNEL_OPTIONS,
} from '../infrastructure/grpc';
import { LoggerService } from '../infrastructure/logger';
import { DeadlineInterceptor } from './deadline.interceptor';
import { HttpToGrpcFilter } from './http-to-grpc.filter';

export const grpcServerOptions = (port: number | string): GrpcOptions => ({
  transport: Transport.GRPC,
  options: {
    package: [GAME_PACKAGE, HEALTH_PACKAGE],
    protoPath: [GAME_PROTO, HEALTH_PROTO],
    url: `0.0.0.0:${port}`,
    loader: PROTO_LOADER,
    channelOptions: SERVER_CHANNEL_OPTIONS,
    gracefulShutdown: true,
  },
});

export function connectGrpc(
  app: INestApplication,
  port: number | string = process.env.GRPC_PORT ?? DEFAULT_GRPC_PORT,
): INestMicroservice {
  const grpc = app.connectMicroservice<GrpcOptions>(grpcServerOptions(port), {
    deferInitialization: true,
  });
  grpc.useGlobalInterceptors(new DeadlineInterceptor());
  grpc.useGlobalFilters(new HttpToGrpcFilter(app.get(LoggerService)));
  return grpc;
}
