import { Injectable } from '@nestjs/common';
import { AuthService, TokenService } from '../auth';
import { Socket } from 'socket.io';
import { Client } from './entities';

@Injectable()
export class ConnectionPatchProvider {
  constructor(
    private readonly authService: AuthService,
    private readonly tokensService: TokenService,
  ) {}

  private createAnonymousToken(client: Client): void {
    const userId = Math.floor(Math.random() * 100000);
    const { token } = this.tokensService.anonymousToken(userId);
    client.authorized = false;
    client.userId = userId;
    client.name = 'Anonymous';
    client.anonymousTempToken = token;
  }

  private async withToken(
    client: Client,
    payload: any,
    token: string,
  ): Promise<void> {
    try {
      const authorizedUserData = await this.authService.checkoutUserSession(
        payload.userId,
        payload.deviceId,
      );
      client.authorized = true;
      client.name = authorizedUserData.name;
      client.userId = authorizedUserData.id;
    } catch (e) {
      client.authorized = false;
      client.name = 'Anonymous';
      client.userId = payload.userId;
      client.anonymousTempToken = token;
    }
  }

  public async processClient(socket: Socket): Promise<Client> {
    const authToken = socket.handshake.query['Authorization'];
    const client = new Client(socket);

    try {
      const payload = await this.tokensService.parseToken(authToken as string);
      await this.withToken(client, payload, authToken as string);
    } catch (e) {
      this.createAnonymousToken(client);
    }
    return client;
  }
}
