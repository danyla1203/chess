import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { GameService } from '../game.service';
import { ClientStore } from '../ClientStore';

@Injectable()
export class IsPlayer implements CanActivate {
  constructor(
    private readonly service: GameService,
    private readonly clientStore: ClientStore,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const wsContext = context.switchToWs();
    const client = this.clientStore.getClient(wsContext.getClient());
    const gameId = wsContext.getData().gameId;
    if (!client) return false;

    const game = await this.service.findGameById(gameId);

    return !!game.findPlayer(client.userId);
  }
}
