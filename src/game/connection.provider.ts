import { Injectable } from '@nestjs/common';
import { AuthService, TokenService } from '../auth';
import { Anonymous } from './entities/Anonymous';
import { InternalAuthorizedUserFields } from '../user/entities';

@Injectable()
export class ConnectionPatchProvider {
  constructor(
    private readonly authService: AuthService,
    private readonly tokensService: TokenService,
  ) {}

  private async authorizedPatch(
    { name, id }: InternalAuthorizedUserFields,
    client,
  ) {
    client.name = name;
    client.authorized = true;
    client.userId = id;
  }
  private anonymousPatch(payload, client) {
    client.name = payload.name;
    client.userId = payload.userId;
    client.token = client.handshake.query['Authorization'];
  }
  private async withToken(payload, client) {
    try {
      const authorizedUserData = await this.authService.checkoutUserSession(
        payload.userId,
        payload.deviceId,
      );
      await this.authorizedPatch(authorizedUserData, client);
    } catch (e) {
      this.anonymousPatch(payload, client);
    }
  }
  private withoutToken(client) {
    const userId = Math.floor(Math.random() * 100000);
    const { token, exp } = this.tokensService.anonymousToken(userId);
    const user: Anonymous = new Anonymous(userId, token, exp);
    client.userId = user.userId;
    client.name = user.name;
    client.token = user.tempToken;
  }

  public async processClient(client) {
    const authToken = client.handshake.query['Authorization'];
    client.authorized = false;
    try {
      const payload = await this.tokensService.parseToken(authToken);
      await this.withToken(payload, client);
    } catch (e) {
      this.withoutToken(client);
    }
    return client;
  }
}
