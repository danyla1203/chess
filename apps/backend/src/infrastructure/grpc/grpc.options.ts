import { join } from 'node:path';
import type { ChannelOptions } from '@grpc/grpc-js';
import type { Options } from '@grpc/proto-loader';
import { CHESS_GAME_V1_PACKAGE_NAME } from '../../generated/chess/game/v1/game';
import { GRPC_HEALTH_V1_PACKAGE_NAME } from '../../generated/grpc/health/v1/health';

const PROTO_ROOT = join(__dirname, '..', '..', 'proto');

export const GAME_PROTO = join(PROTO_ROOT, 'chess/game/v1/game.proto');
export const HEALTH_PROTO = join(PROTO_ROOT, 'grpc/health/v1/health.proto');

export const GAME_PACKAGE = CHESS_GAME_V1_PACKAGE_NAME;
export const HEALTH_PACKAGE = GRPC_HEALTH_V1_PACKAGE_NAME;

export const DEFAULT_GRPC_PORT = 50051;
export const COMMAND_DEADLINE_MS = 5000;

export const PROTO_LOADER: Options = {
  keepCase: false,
  longs: Number,
  enums: String,
  defaults: true,
  oneofs: true,
  includeDirs: [PROTO_ROOT],
};

const KEEPALIVE: ChannelOptions = {
  'grpc.keepalive_time_ms': 30000,
  'grpc.keepalive_timeout_ms': 10000,
  'grpc.keepalive_permit_without_calls': 1,
};

export const SERVER_CHANNEL_OPTIONS: ChannelOptions = {
  ...KEEPALIVE,
  'grpc.max_concurrent_streams': 1000,
  'grpc.http2.min_ping_interval_without_data_ms': 20000,
};

export const CLIENT_CHANNEL_OPTIONS: ChannelOptions = {
  ...KEEPALIVE,
  'grpc.service_config': JSON.stringify({
    loadBalancingConfig: [{ round_robin: {} }],
    methodConfig: [
      {
        name: [{ service: `${GAME_PACKAGE}.GameCommands` }],
        retryPolicy: {
          maxAttempts: 2,
          initialBackoff: '0.05s',
          maxBackoff: '0.2s',
          backoffMultiplier: 2,
          retryableStatusCodes: ['UNAVAILABLE'],
        },
      },
    ],
  }),
};
