import { io } from 'socket.io-client';
import { config } from '../config';
import { store } from '.';
import { setConnectStatus } from './slices/ws';
import { 
  addMessage,
  addStrikedFigure,
  endGame,
  initGameData,
  setShah,
  startGame,
  updateBoard,
  updateTimerByServerEvent,
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
    this.socket.on('game:board-update', (payload) => dispatch(updateBoard(payload)));
    this.socket.on('game:strike', (payload) => dispatch(addStrikedFigure(payload)));
    this.socket.on('game:shah', (payload) => dispatch(setShah(payload)));
    this.socket.on('game:mate', (payload) => dispatch(endGame(payload))); 
    this.socket.on('game:time', (payload) => dispatch(updateTimerByServerEvent(payload)));
    this.socket.on('game:end', () => dispatch(endGame()));
    this.socket.on('game:chat-message', (payload) => dispatch(addMessage(payload)));
  }

  close() {
    if (this.socket) this.socket.close();
  }
  send(event: string, data: any) {
    this.socket.emit(event, data);
  }
  
}

export const ws = new WebsocketClient();