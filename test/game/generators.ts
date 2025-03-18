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
  gm = gm ? gm : new GameEntity(generateClient(), generateConfig(), jest.fn());
  const res = generateGameResult(gm?.config, gm?.id);
  return {
    ...res,
    looser: {
      userId: gm?.looser.userId,
      side: gm?.looser.side,
      name: gm?.looser.name,
    },
    winner: {
      userId: gm?.winner.userId,
      side: gm?.winner.side,
      name: gm?.winner.name,
    },
  };
};
export const generateGameWithDraw = (gm?: GameEntity) => {
  console.log(gm.players);
  gm = gm ? gm : new GameEntity(generateClient(), generateConfig(), jest.fn());
  const res = generateGameResult(gm?.config, gm?.id);
  return {
    ...res,
    pl1: {
      userId: gm?.players[0].client.userId,
      side: gm?.players[0].side,
      name: gm?.players[0].name,
    },
    pl2: {
      userId: gm?.players[1].client.userId,
      side: gm?.players[1].side,
      name: gm?.players[1].name,
    },
  };
};

export const generatePlayer = (
  side: 'w' | 'b',
  authorized = true,
  userId = faker.number.int({ max: 99999, min: 1 }),
): Player => {
  const cl = generateClient(authorized, userId);
  const pl = new Player(cl, side, 10000);
  pl.gameEndEvent = jest.fn();
  pl.initedGameDataEvent = jest.fn();
  pl.timeTickEvent = jest.fn();
  return pl;
};

export const generateClient = (
  authorized = true,
  userId = faker.number.int({ max: 99999, min: 1 }),
): Client => {
  const socket = { emit: jest.fn() } as any;
  const client = new Client(socket);
  client.join = jest.fn();
  client.gameCreatedEvent = jest.fn();
  client.pendingGameEvent = jest.fn();
  client.lobbyUpdateEvent = jest.fn();
  client.authorized = authorized;
  client.userId = userId;
  return client;
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
