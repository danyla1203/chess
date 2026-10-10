import { faker } from '@faker-js/faker';
import { Client, Player } from '../../src/game/entities';
import {
  Config,
  GameResult,
  Game as GameEntity,
} from '../../src/game/entities/game';

export const generateGameResult = (
  config?: Config,
  id?: number,
): GameResult => {
  return {
    id: id || faker.number.int(),
    config: config || generateConfig(),
    moves: [],
  };
};
export const generateGameWithWinner = (gm?: GameEntity) => {
  const game =
    gm ??
    new GameEntity(generateClient(), generateConfig(), faker.number.int());
  const res = generateGameResult(game.config, game.id);
  return {
    ...res,
    moves: game.moves,
    looser: {
      userId: game.looser?.userId,
      side: game.looser?.side,
      name: game.looser?.name,
    },
    winner: {
      userId: game.winner?.userId,
      side: game.winner?.side,
      name: game.winner?.name,
    },
  };
};

export const generatePlayer = (
  side: 'w' | 'b',
  authorized = true,
  userId = faker.number.int({ max: 99999, min: 1 }),
): Player => {
  const cl = generateClient(authorized, userId);
  return new Player(cl, side, 10000);
};

export const generateClient = (
  authorized = true,
  userId = faker.number.int({ max: 99999, min: 1 }),
): Client => {
  const client = new Client();
  client.authorized = authorized;
  client.userId = userId;
  client.name = faker.person.firstName();
  return client;
};

export const generateSocket = (client?: Client, id = faker.string.uuid()) =>
  ({
    id,
    data: client ? { client } : {},
    emit: jest.fn(),
    join: jest.fn().mockResolvedValue(undefined),
    handshake: { query: {} },
  }) as any;

export const startedGame = (
  config = generateConfig('w', 0),
  now = Date.now(),
): GameEntity => {
  const game = new GameEntity(
    generateClient(true, faker.number.int({ min: 1, max: 1000 })),
    config,
    faker.number.int({ min: 1, max: 100000 }),
  );
  game.addPlayer(
    generateClient(true, faker.number.int({ min: 1001, max: 2000 })),
  );
  game.start(now);
  return game;
};

export const generateConfig = (
  side: 'w' | 'b' | 'rand' = 'w',
  bet?: number,
): Config => {
  return {
    side,
    bet: bet || (bet === 0 ? bet : faker.number.int({ min: 0, max: 500 })),
    time: faker.number.int({ min: 3600, max: 100000 }),
    timeIncrement: faker.number.int({ min: 60, max: 10000 }),
  };
};

export const getFigureCellState = () => {
  const b = {
    a7: 'pawn1',
    b7: 'pawn2',
    c7: 'pawn3',
    d7: 'pawn4',
    e7: 'pawn5',
    f7: 'pawn6',
    g7: 'pawn7',
    h7: 'pawn8',
    a8: 'R1',
    c8: 'B1',
    b8: 'K1',
    d8: 'Q',
    e8: 'Kn',
    g8: 'K2',
    f8: 'B2',
    h8: 'R2',
  };
  const w = {
    a2: 'pawn1',
    b2: 'pawn2',
    c2: 'pawn3',
    d2: 'pawn4',
    e2: 'pawn5',
    f2: 'pawn6',
    g2: 'pawn7',
    h2: 'pawn8',
    a1: 'R1',
    c1: 'B1',
    b1: 'K1',
    d1: 'Q',
    e1: 'Kn',
    g1: 'K2',
    f1: 'B2',
    h1: 'R2',
  };
  return {
    w,
    b,
  };
};
