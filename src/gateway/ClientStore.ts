import { Injectable } from '@nestjs/common';
import type { Socket } from 'socket.io';
import { Client } from '../game/entities';

@Injectable()
export class ClientStore {
  setClient(socket: Socket, client: Client): Client {
    socket.data.client = client;
    return client;
  }

  getClient(socket: Socket): Client | undefined {
    return socket.data?.client as Client | undefined;
  }
}
