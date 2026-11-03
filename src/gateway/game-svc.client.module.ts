import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import {
  CLIENT_CHANNEL_OPTIONS,
  DEFAULT_GRPC_PORT,
  GAME_PACKAGE,
  GAME_PROTO,
  PROTO_LOADER,
} from '../infrastructure/grpc';
import { GAME_SVC } from './game.client';

export const gameSvcTarget = (config: ConfigService): string =>
  config.get<string>('GAME_SVC_GRPC_TARGET') ??
  `localhost:${DEFAULT_GRPC_PORT}`;

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: GAME_SVC,
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: GAME_PACKAGE,
            protoPath: GAME_PROTO,
            url: gameSvcTarget(config),
            loader: PROTO_LOADER,
            channelOptions: CLIENT_CHANNEL_OPTIONS,
          },
        }),
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class GameSvcClientModule {}
