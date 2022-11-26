import * as React from 'react';
import ReactDOM = require('react-dom');
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { LoginPage } from './pages/Login/Login';
import { MainPage } from './pages/Main/Main';
import { Navbar } from './components/Navbar/Navbar';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store } from './store/index';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { setConnectStatus } from './store/slices/ws';
import { setGames } from './store/slices/gamelist';
import { GamePage } from './pages/Game/Game';
import { addStrikedFigure, createGame, endGame, initGameData, setShah, startGame, updateBoard } from './store/slices/game';
import { setUserData } from './store/slices/user';

import './index.scss';
import { GameList } from './pages/GameList/GameList';

export enum ServerMessageTypes {
  Game = 'Game',
  GameChat = 'GameChat',
  GameList = 'GameList',
  User = 'User',
} 
export enum GameTypes {
  START_NEW = 'START_NEW',
  CONNECT_TO_EXISTING_GAME = 'CONNECT_TO_EXISTING_GAME',
  CONNECT_TO_GAME_AS_SPECTATOR = 'CONNECT_TO_GAME_AS_SPECTATOR',
  MAKE_TURN = 'MAKE_TURN'
}
enum GameServerResponses {
  INIT_GAME = 'INIT_GAME',
  GAME_CREATED = 'GAME_CREATED',
  GAME_START = 'GAME_START',
  UPDATE_STATE = 'UPDATE_STATE',
  STRIKE = 'STRIKE',
  SHAH = 'SHAH',
  MATE = 'MATE',
  PLAYER_TIMEOUT = 'PLAYER_TIMEOUT'
}

const WsHandler = (): null => {
  const dispatch = useDispatch();

  const GameHandler = (data: any) => {
    switch (data.type) {
    case GameServerResponses.GAME_CREATED:
      dispatch(createGame());
      break;
    case GameServerResponses.INIT_GAME:
      dispatch(initGameData(data));
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
    }
  };
  const GameListHandler = (data: any) => {
    dispatch(setGames(data));
  };

  const { readyState } = useWebSocket('ws://localhost:3000', {
    protocols: 'echo-protocol',
    share: true,
    onMessage: ({ data }) => {
      try {
        data = JSON.parse(data);
      } catch (e) {
        return;
      }
      switch (data.type) {
      case ServerMessageTypes.GameList:
        GameListHandler(data.payload);
        break;
      case ServerMessageTypes.Game:
        GameHandler(data.payload);
        break;
      case ServerMessageTypes.User:
        dispatch(setUserData(data.payload));
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


const App = () => {
  const wsStatus = useSelector((state: any) => state.wsConnection.isConnected);

  if (wsStatus) {
    return (
      <div className="wrapper">
        <BrowserRouter>
          <Navbar />
          <Routes>
            <Route path="/" element={<MainPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/game" element={<GamePage />} />
            <Route path='/lobby' element={<GameList />}/>
          </Routes>
        </ BrowserRouter>
      </div>
    );
  }
  return (
    <div>loading</div>
  );
};

const WrappedApp = () => {
  return (
    <Provider store={store}>
      <WsHandler />
      <App />
    </Provider>
  );
};

ReactDOM.render(<WrappedApp />, document.getElementById('output'));
