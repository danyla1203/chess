import { RequestTypes } from './wsHandlers/WsHandler';

export interface ControllerI {
  handle(): void
}
export type WsHandlerI = ControllerI & {
  send(type: RequestTypes, payload: any): void
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
export type ShahData = {
  shachedSide: 'w'|'b',
  byFigure: Figure
}
export type MateData = {
  matedSide: 'w'|'b',
  byFigure: Figure
}

export enum GameRequestTypes {
  START_NEW = 'START_NEW',
  CONNECT_TO_EXISTING_GAME = 'CONNECT_TO_EXISTING_GAME',
  MAKE_TURN = 'MAKE_TURN'
}