import { createServer, Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Server, ServerOptions } from 'socket.io';
import { io, Socket as ClientSocket } from 'socket.io-client';
import Redis from 'ioredis';
import type { Emitter } from '@socket.io/redis-emitter';
import { RedisIoAdapter } from '../../src/infrastructure/socket/redis-io.adapter';
import { SocketEventPublisher } from '../../src/game-service/socket.publisher';
import { socketEmitterProvider } from '../../src/game-service/socket.emitter';
import { Game as GameEvent, GameEnd, Lobby } from '@chess/contract';
import { userRoom } from '../../src/infrastructure/socket/rooms';
import { Game } from '../../src/domain/game/entities/game';
import { GameAdapter } from '../../src/game/game.adapter';
import { LoggerService } from '../../src/infrastructure/logger';
import { generateClient, generateConfig } from '../game/generators';

type Node = { http: HttpServer; io: Server; adapter: RedisIoAdapter };

const startNode = async (): Promise<Node & { url: string }> => {
  const http = createServer();
  const adapter = new RedisIoAdapter(http as never, process.env.REDIS_URL);
  await adapter.connect();
  const server = adapter.createIOServer(0, {
    transports: ['websocket'],
  } as ServerOptions);
  server.of('/game').on('connection', (socket) => {
    void socket.join(userRoom(Number(socket.handshake.query.userId)));
  });
  await new Promise<void>((resolve) => http.listen(0, resolve));
  const { port } = http.address() as AddressInfo;
  return { http, io: server, adapter, url: `http://localhost:${port}` };
};

const connect = (url: string, userId: number) =>
  new Promise<ClientSocket>((resolve) => {
    const socket = io(`${url}/game`, {
      transports: ['websocket'],
      query: { userId: String(userId) },
    });
    socket.on('connect', () => resolve(socket));
  });

const next = (socket: ClientSocket, event: string) =>
  new Promise<unknown>((resolve) => socket.once(event, resolve));

const settle = () => new Promise((r) => setTimeout(r, 100));

describe('SocketEventPublisher from game-svc (integration, Redis emitter)', () => {
  let a: Node & { url: string };
  let b: Node & { url: string };
  let white: ClientSocket;
  let black: ClientSocket;
  let redis: Redis;
  let publisher: SocketEventPublisher;
  const logger = { warn: jest.fn() } as unknown as LoggerService;
  const whiteClient = generateClient(true, 1);
  const blackClient = generateClient(true, 2);

  beforeAll(async () => {
    a = await startNode();
    b = await startNode();
    white = await connect(a.url, 1);
    black = await connect(b.url, 2);
    redis = new Redis(process.env.REDIS_URL);
    const emitter = (
      socketEmitterProvider as { useFactory: (...args: unknown[]) => Emitter }
    ).useFactory(redis, logger);
    publisher = new SocketEventPublisher(emitter, new GameAdapter());
    await settle();
  });
  afterAll(async () => {
    white.disconnect();
    black.disconnect();
    for (const node of [a, b]) {
      await node.adapter.close(node.io);
      node.http.close();
    }
    await redis.quit();
  });

  it('should play the push side of a game across instances', async () => {
    const game = new Game(whiteClient, generateConfig('w', 0), 42);

    const added = next(black, Lobby.added);
    publisher.publish(game, game.pullEvents());
    expect(await added).toMatchObject({ id: 42, players: [{ userId: 1 }] });

    game.addPlayer(blackClient);
    game.start();
    const inits = Promise.all([
      next(white, GameEvent.init),
      next(black, GameEvent.init),
    ]);
    const removed = next(white, Lobby.removed);
    publisher.publish(game, game.pullEvents());
    const [whiteInit, blackInit] = (await inits) as { side: string }[];
    expect([whiteInit.side, blackInit.side]).toStrictEqual(['w', 'b']);
    expect(await removed).toStrictEqual({ gameId: 42 });

    game.makeTurn(1, 'pawn4', 'd4');
    const boards = Promise.all([
      next(white, GameEvent.boardUpdate),
      next(black, GameEvent.boardUpdate),
    ]);
    publisher.publish(game, game.pullEvents());
    for (const board of await boards) {
      expect(board).toMatchObject({
        update: { figure: 'pawn4', cell: 'd4', prevCell: 'd2', side: 'w' },
        clock: { running: 'b' },
      });
    }

    game.endGame(game.players[1], game.players[0], GameEnd.surrender);
    const ends = Promise.all([
      next(white, GameEvent.end),
      next(black, GameEvent.end),
    ]);
    publisher.publish(game, game.pullEvents());
    const [whiteEnd, blackEnd] = await ends;
    expect(whiteEnd).toMatchObject({
      winner: false,
      reason: GameEnd.surrender,
    });
    expect(blackEnd).toMatchObject({ winner: true, game: { id: 42 } });
  });
});
