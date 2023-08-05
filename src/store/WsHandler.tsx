import { io } from 'socket.io-client';
import { config } from '../config';
import { store } from '.';
import { setConnectStatus } from './slices/ws';
import { 
  initGameData,
  startGame,
} from '../store/slices/game';
import { setGames } from '../store/slices/gamelist';
import { Socket } from 'socket.io-client';

const dispatch = (action) => {
  store.dispatch(action);
};

export class WebsocketClient {
  socket: Socket;

  connect(accessToken: string) {
    this.socket = io(`ws://${config.apiDomain}/game?Authorization=${accessToken}`, { transports: [ 'websocket' ], });
    this.socket.connect();
    this.socket.on('connect', () => dispatch(setConnectStatus()));

    this.socket.on('lobby:update', (payload) => dispatch(setGames(payload)));
    this.socket.on('game:start', () => dispatch(startGame()));
    this.socket.on('game:init-data', (payload) => dispatch(initGameData(payload)));
  }

  close() {
    if (this.socket) this.socket.close();
  }
  send(event: string, data: any) {
    this.socket.emit(event, data);
  }
  
}

export const ws = new WebsocketClient();