import { ClientStore } from '../../src/game/ClientStore';
import { generateClient, generateSocket } from './generators';

describe('ClientStore', () => {
  const store = new ClientStore();

  it('should keep the client on the socket', () => {
    const socket = generateSocket();
    const client = generateClient();
    expect(store.setClient(socket, client)).toBe(client);
    expect(socket.data.client).toBe(client);
    expect(store.getClient(socket)).toBe(client);
  });

  it('should return undefined for a socket without a client', () => {
    expect(store.getClient(generateSocket())).toBeUndefined();
  });
});
