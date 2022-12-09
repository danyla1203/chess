import * as React from 'react';
import ReactDOM = require('react-dom');
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { LoginPage } from './pages/Login/Login';
import { MainPage } from './pages/Main/Main';
import { Navbar } from './components/Navbar/Navbar';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { store } from './store/index';
import { GamePage } from './pages/Game/Game';
import { Signup } from './pages/Signup/Signup';
import { UserPage } from './pages/User/User';
import { WsHandler } from './WsHandler';

import { userMeRequest } from './store/slices/user';
import { getTokens } from './store/slices/tokens';

import './index.scss';
import { GameList } from './pages/GameList/GameList';

export enum GameTypes {
  START_NEW = 'START_NEW',
  CONNECT_TO_EXISTING_GAME = 'CONNECT_TO_EXISTING_GAME',
  CONNECT_TO_GAME_AS_SPECTATOR = 'CONNECT_TO_GAME_AS_SPECTATOR',
  MAKE_TURN = 'MAKE_TURN',
  CHAT_MESSAGE = 'CHAT_MESSAGE',
}

const Router = () => {
  const wsStatus = useSelector((state: any) => state.wsConnection);
  if (wsStatus) {
    return (
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/game" element={<GamePage />} />
          <Route path='/lobby' element={<GameList />} />
          <Route path='/user' element={<UserPage />} />
        </Routes>
      </ BrowserRouter>
    );
  }
};

const App = () => {
  const tokens = useSelector((state: any) => state.tokens);
  const dispatch = useDispatch<any>();
  React.useEffect(() => {
    dispatch(getTokens(localStorage.getItem('refreshToken')));
  }, []);
  React.useEffect(() => {
    if (tokens.accessToken) {
      dispatch(userMeRequest(tokens.accessToken));
    }
  }, [ tokens.accessToken ]);
  if (tokens.isGetTokenLoaded) {
    return (
      <div className="wrapper">
        <WsHandler accessToken={tokens.accessToken}/>
        <Router />
      </div>
    );
  } else {
    return <div>Loading</div>;
  }
};

const WrappedApp = () => {
  return (
    <Provider store={store}>
      <App />
    </Provider>
  );
};

ReactDOM.render(<WrappedApp />, document.getElementById('output'));
