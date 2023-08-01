import { io } from 'socket.io-client';
import { config } from '../config';
import { store } from '.';
import { setConnectStatus } from './slices/ws';
import { 
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
    this.socket = io(`http://${config.apiDomain}/game?Authorization=${accessToken}`);
    this.socket.on('connect', () => dispatch(setConnectStatus()));

    this.socket.on('lobby:update', (payload) => dispatch(setGames(payload)));
    this.socket.on('game:start', () => dispatch(startGame()));
  }

  close() {
    if (this.socket) this.socket.close();
  }
  send(event: string, data: any) {
    this.socket.emit(event, JSON.stringify(data));
  }
  
}

export const ws = new WebsocketClient();