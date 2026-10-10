import { ExecutionContext } from '@nestjs/common';
import { IsPlayer } from '../../src/game/guards';
import { ClientStore } from '../../src/game/ClientStore';
import { GameService } from '../../src/game/game.service';
import { generateClient, generateSocket, startedGame } from './generators';

describe('IsPlayer (unit)', () => {
  const game = startedGame();
  const service = {
    findGameById: jest.fn().mockResolvedValue(game),
  } as unknown as GameService;
  const guard = new IsPlayer(service, new ClientStore());

  const context = (socket: unknown): ExecutionContext =>
    ({
      switchToWs: () => ({
        getClient: () => socket,
        getData: () => ({ gameId: game.id }),
      }),
    }) as unknown as ExecutionContext;

  it('should allow a player of the game', async () => {
    const socket = generateSocket(generateClient(true, game.players[1].userId));
    await expect(guard.canActivate(context(socket))).resolves.toBe(true);
  });

  it('should deny someone outside the game', async () => {
    const socket = generateSocket(generateClient(true, 999999));
    await expect(guard.canActivate(context(socket))).resolves.toBe(false);
  });

  it('should deny a socket that was never registered', async () => {
    await expect(guard.canActivate(context(generateSocket()))).resolves.toBe(
      false,
    );
  });
});
