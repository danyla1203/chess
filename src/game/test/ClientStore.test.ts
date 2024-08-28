import { Test, TestingModule } from '@nestjs/testing';
import { ClientStore } from '../ClientStore';
import { Client } from '../entities';

describe('ClientStore', () => {
  let clientStore: ClientStore;
  let mockClient: Client;
  const socketId1 = 'socket1';
  const socketId2 = 'socket2';
  const userId = 123;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClientStore],
    }).compile();

    clientStore = module.get<ClientStore>(ClientStore);

    // Mock Client object
    mockClient = new Client({ id: socketId1 } as any);
    mockClient.userId = userId;
    mockClient.authorized = true;
    mockClient.name = 'Test User';
  });

  it('should add a client to the store', () => {
    clientStore.setClient(socketId1, mockClient);
    expect(clientStore.getClient(socketId1)).toEqual(mockClient);
  });

  it('should update an existing client’s socket when the same userId is used', () => {
    const newSocket = { id: socketId2 } as any;

    clientStore.setClient(socketId1, mockClient);

    const updatedClient = new Client(newSocket);
    updatedClient.userId = userId;

    const returnedClient = clientStore.setClient(socketId2, updatedClient);

    expect(returnedClient.socket).toEqual(newSocket);
    expect(clientStore.getClient(socketId2)).toEqual(returnedClient);
    expect(clientStore.getClient(socketId1)).toBeUndefined();
  });

  it('should return the correct client by socket ID', () => {
    clientStore.setClient(socketId1, mockClient);
    const client = clientStore.getClient(socketId1);
    expect(client).toBeDefined();
    expect(client?.socket.id).toEqual(socketId1);
  });

  it('should return undefined for non-existing socket ID', () => {
    const client = clientStore.getClient('non-existing-socket');
    expect(client).toBeUndefined();
  });
});
