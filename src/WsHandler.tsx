import { useDispatch } from 'react-redux';
import * as React from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { addMessage, addStrikedFigure, createGame, endGame, initGameData, setShah, startGame, updateBoard } from './store/slices/game';
import { setConnectStatus } from './store/slices/ws';
import { setGames } from './store/slices/gamelist';
import { setUserData } from './store/slices/user';
import { setTimers, updateTimerByServerEvent } from './store/slices/timers';
import { addError } from './store/slices/errors';
import { config } from './config';
import { pushMessage, setMessages } from './store/slices/chat';

export enum ServerMessageTypes {
  Game = 'Game',
  GameChat = 'GameChat',
  GameList = 'LOBBY',
  User = 'User_INIT',
  USER_ALREADY_IN_GAME = 'USER_ALREADY_IN_GAME'
}
enum GameServerResponses {
  INIT_GAME = 'INIT_GAME',
  GAME_CREATED = 'GAME_CREATED',
  GAME_START = 'GAME_START',
  UPDATE_STATE = 'UPDATE_STATE',
  UPDATE_TIMERS = 'UPDATE_TIMERS',
  STRIKE = 'STRIKE',
  SHAH = 'SHAH',
  MATE = 'MATE',
  PLAYER_TIMEOUT = 'PLAYER_TIMEOUT',
  CHAT_MESSAGE = 'CHAT_MESSAGE',
}

export const WsHandler = ({ accessToken }: any): null => {
  const dispatch = useDispatch();

  const { readyState } = useWebSocket(`ws://${config.apiDomain}`, {
    protocols: 'echo-protocol',
    share: true,
    queryParams: {
      'Authorization': accessToken,
    },
    onMessage: ({ data }) => {
      try {
        data = JSON.parse(data);
      } catch (e) {
        return;
      }
      switch (data.type) {
      case GameServerResponses.INIT_GAME:
        dispatch(initGameData(data.payload));
        dispatch(setTimers(data.payload));
        break;
      case 'LOBBY':
        dispatch(setGames(data.payload));
        break;
      case 'NEW_MESSAGE':
        dispatch(pushMessage(data.payload));
        break;
      case ServerMessageTypes.User:
        dispatch(setUserData(data.payload));
        break;
      case ServerMessageTypes.USER_ALREADY_IN_GAME:
        dispatch(addError(data.payload));
        break;
      case GameServerResponses.GAME_CREATED:
        dispatch(createGame());
        break;
      case GameServerResponses.GAME_START:
        dispatch(startGame());
        break;
      case GameServerResponses.UPDATE_STATE:
        dispatch(updateBoard(data));
        break;
      case GameServerResponses.STRIKE:
        dispatch(addStrikedFigure(data.payload));
        break;
      case GameServerResponses.SHAH:
        dispatch(setShah(data.payload));
        break;
      case GameServerResponses.MATE:
        dispatch(endGame());
        break;
      case GameServerResponses.PLAYER_TIMEOUT:
        dispatch(endGame());
        break;
      case GameServerResponses.CHAT_MESSAGE:
        dispatch(addMessage(data.payload));
        break;
      case GameServerResponses.UPDATE_TIMERS:
        dispatch(updateTimerByServerEvent(data.payload));
        break;
      case 'CHAT':
        dispatch(setMessages(data.payload));
        break;
      }
    }
  });
  const connectionStatus = {
    [ReadyState.CONNECTING]: 'Connecting',
    [ReadyState.OPEN]: 'Open',
    [ReadyState.CLOSING]: 'Closing',
    [ReadyState.CLOSED]: 'Closed',
    [ReadyState.UNINSTANTIATED]: 'Uninstantiated',
  }[readyState];

  React.useEffect(() => {
    if (connectionStatus === 'Open') {
      dispatch(setConnectStatus());
    }
  });

  return null;
};