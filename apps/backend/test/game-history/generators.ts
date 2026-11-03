import { faker } from '@faker-js/faker';
import type { GameEndedEvent } from '../../src/infrastructure/messaging';

export const generateGameEndedEvent = (
  overrides: Partial<GameEndedEvent> = {},
  winnerId = faker.number.int({ min: 1, max: 99999 }),
  looserId = faker.number.int({ min: 1, max: 99999 }),
): GameEndedEvent => ({
  matchId: faker.string.uuid(),
  gameId: faker.number.int({ max: 100000 }),
  reason: 'surrender',
  isDraw: false,
  endedAt: new Date().toISOString(),
  config: { side: 'w', time: 60000, timeIncrement: 1000, bet: 50 },
  moves: [],
  players: [
    {
      userId: winnerId,
      name: faker.person.firstName(),
      side: 'w',
      authorized: true,
      isWinner: true,
    },
    {
      userId: looserId,
      name: faker.person.firstName(),
      side: 'b',
      authorized: true,
      isWinner: false,
    },
  ],
  ...overrides,
});
