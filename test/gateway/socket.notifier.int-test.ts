import { createServer, Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Server, ServerOptions } from 'socket.io';
import { io, Socket as ClientSocket } from 'socket.io-client';
import { RedisIoAdapter } from '../../src/infrastructure/socket/redis-io.adapter';
import { SocketNotifier, userRoom } from '../../src/gateway/socket.notifier';
import { Game as GameEvent, room } from '../../src/domain/game/EmitTypes';

type Node = {
  http: HttpServer;
  io: Server;
  adapter: RedisIoAdapter;
  notifier: SocketNotifier;
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
  const notifier = new SocketNotifier();
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

describe('SocketNotifier across instances (integration, Redis adapter)', () => {
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
    const received = next(black, GameEvent.playerDiconnected);
    a.notifier.opponentDisconnected(2);
    await expect(received).resolves.toBeUndefined();
  });

  it('should broadcast to a game room whose sockets live on both instances', async () => {
    a.io.of('/game').in(userRoom(1)).socketsJoin(room(5));
    a.io.of('/game').in(userRoom(2)).socketsJoin(room(5));
    await settle();

    const clock = { w: 1000, b: 2000, running: 'w', serverNow: 1 };
    const toWhite = next(white, GameEvent.addTime);
    const toBlack = next(black, GameEvent.addTime);
    b.notifier.toGame(5, GameEvent.addTime, clock);

    expect(await toWhite).toStrictEqual(clock);
    expect(await toBlack).toStrictEqual(clock);
  });
});
