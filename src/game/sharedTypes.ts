import { MessageType } from './WsHandler';

export interface ControllerI {
  handle(): void
}
export type WsHandlerI = ControllerI & {
  send(type: MessageType, payload: any): void
}

export type Figure = string;
export type Cell = string;

export type Player = 'w' | 'b';

export type White = {[index: Figure]: Cell}
export type Black = White;

export type Board = {
  white: White
  black: Black
}

export type Striked = {
  strikedSide: 'w'|'b'
  figure: Figure
}
