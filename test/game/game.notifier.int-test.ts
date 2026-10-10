import { createServer, Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Server, ServerOptions } from 'socket.io';
import { io, Socket as ClientSocket } from 'socket.io-client';
import { RedisIoAdapter } from '../../src/tools/redis-io.adapter';
import { GameNotifier, userRoom } from '../../src/game/game.notifier';
import { Game as GameEvent, GameEnd } from '../../src/game/EmitTypes';

type Node = {
  http: HttpServer;
  io: Server;
  adapter: RedisIoAdapter;
  notifier: GameNotifier;
  url: string;
};

const startNode = async (): Promise<Node> => {
  const http = createServer();
  const adapter = new RedisIoAdapter(http as never, process.env.REDIS_URL);
  await adapter.connect();
  const server = adapter.createIOServer(0, {
    transports: ['websocket'],
  } as ServerOptions);
  const namespace = server.of('/game');
  namespace.on('connection', (socket) => {
    void socket.join(userRoom(Number(socket.handshake.query.userId)));
  });
  const notifier = new GameNotifier();
  notifier.bind(namespace);
  await new Promise<void>((resolve) => http.listen(0, resolve));
  const { port } = http.address() as AddressInfo;
  return {
    http,
    io: server,
    adapter,
    notifier,
    url: `http://localhost:${port}`,
  };
};

const connect = (node: Node, userId: number) =>
  new Promise<ClientSocket>((resolve) => {
    const socket = io(`${node.url}/game`, {
      transports: ['websocket'],
      query: { userId: String(userId) },
    });
    socket.on('connect', () => resolve(socket));
  });

const next = (socket: ClientSocket, event: string) =>
  new Promise<unknown>((resolve) => socket.once(event, resolve));

const settle = () => new Promise((r) => setTimeout(r, 100));

describe('GameNotifier across instances (integration, Redis adapter)', () => {
  let a: Node;
  let b: Node;
  let white: ClientSocket;
  let black: ClientSocket;

  beforeAll(async () => {
    a = await startNode();
    b = await startNode();
    white = await connect(a, 1);
    black = await connect(b, 2);
    await settle();
  });
  afterAll(async () => {
    white.disconnect();
    black.disconnect();
    for (const node of [a, b]) {
      await node.adapter.close(node.io);
      node.http.close();
    }
  });

  it('should reach a user connected to another instance', async () => {
    const received = next(black, GameEvent.end);
    a.notifier.gameEnd(2, true, { id: 7 }, GameEnd.timeout);
    expect(await received).toStrictEqual({
      winner: true,
      game: { id: 7 },
      reason: GameEnd.timeout,
    });
  });

  it('should join remote sockets to a game room and broadcast to it', async () => {
    a.notifier.joinGame(1, 5);
    a.notifier.joinGame(2, 5);
    await settle();

    const toWhite = next(white, GameEvent.timeTick);
    const toBlack = next(black, GameEvent.timeTick);
    b.notifier.timeTick(5, { w: 1000, b: 2000 });

    expect(await toWhite).toStrictEqual({ w: 1000, b: 2000 });
    expect(await toBlack).toStrictEqual({ w: 1000, b: 2000 });
  });

  it('should start the game for both players wherever they are connected', async () => {
    const started = Promise.all([
      next(white, GameEvent.start),
      next(black, GameEvent.start),
    ]);
    b.notifier.gameStart([1, 2]);
    await expect(started).resolves.toHaveLength(2);
  });
});
