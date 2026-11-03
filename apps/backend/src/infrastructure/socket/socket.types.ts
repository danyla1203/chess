import type { Namespace, Socket } from 'socket.io';
import type { Emitter } from '@socket.io/redis-emitter';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@chess/contract';

export type GameNamespace = Namespace<
  ClientToServerEvents,
  ServerToClientEvents
>;
export type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
export type GameEmitter = Emitter<ServerToClientEvents>;
