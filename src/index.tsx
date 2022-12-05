import * as React from 'react';
import ReactDOM = require('react-dom');
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { LoginPage } from './pages/Login/Login';
import { MainPage } from './pages/Main/Main';
import { Navbar } from './components/Navbar/Navbar';
import { Provider, useSelector } from 'react-redux';
import { store } from './store/index';
import { GamePage } from './pages/Game/Game';
import { WsHandler } from './WsHandler';

import './index.scss';
import { GameList } from './pages/GameList/GameList';

export enum GameTypes {
  START_NEW = 'START_NEW',
  CONNECT_TO_EXISTING_GAME = 'CONNECT_TO_EXISTING_GAME',
  CONNECT_TO_GAME_AS_SPECTATOR = 'CONNECT_TO_GAME_AS_SPECTATOR',
  MAKE_TURN = 'MAKE_TURN',
  CHAT_MESSAGE = 'CHAT_MESSAGE',
}

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
