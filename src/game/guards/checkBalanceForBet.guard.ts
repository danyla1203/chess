import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ClientStore } from '../ClientStore';
import { GameModel } from '../model';

@Injectable()
export class IsBalanceEnough implements CanActivate {
  constructor(
    private readonly clientStore: ClientStore,
    private readonly model: GameModel,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const wsContext = context.switchToWs();
    const socket = wsContext.getClient();
    const { bet } = wsContext.getData();
    const client = this.clientStore.getClient(socket);
    if (bet > 0) {
      if (!client.authorized) return false;
      const playerBalance = await this.model.getUserBalance(client.userId);
      if (playerBalance < bet) return false;
    }

    return true;
  }
}
