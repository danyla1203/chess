import * as React from 'react';
import ReactDOM = require('react-dom');
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { LoginPage } from './pages/Authorization/Authorization';
import { MainPage } from './pages/Main/Main';
import { Navbar } from './components/Navbar/Navbar';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { store } from './store/index';
import { GamePage } from './pages/Game/Game';
import { UserPage } from './pages/User/User';
import { Notifications } from './components/Notification/Notifications';
import { WsHandler } from './WsHandler';
import { EmailConfirmation } from './pages/Authorization/signup/EmailConfirmation';
import { GoogleConfirm } from './pages/Authorization/signup/GoogleConfirm';
import { Signup } from './pages/Authorization/signup/Signup';

import { userMeRequest } from './store/slices/user';
import { getTokens } from './store/slices/user';

import './index.scss';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

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
          <Route path="/email-confirmation" element={<EmailConfirmation />} />
          <Route path="/complete-registration" element={<GoogleConfirm />}/>
          <Route path="/game" element={<GamePage />} />
          <Route path='/user' element={<UserPage />} />
        </Routes>
      </ BrowserRouter>
    );
  }
};

const App = () => {
  const accessToken = useSelector((state: any) => state.user.accessToken);
  const isGetTokenLoaded = useSelector((state: any) => state.user.isGetTokenLoaded);
  const dispatch = useDispatch<any>();
  React.useEffect(() => {
    dispatch(getTokens(localStorage.getItem('refreshToken')));
  }, []);
  React.useEffect(() => {
    if (accessToken) {
      dispatch(userMeRequest(accessToken));
    }
  }, [ accessToken ]);

  if (isGetTokenLoaded) {
    return (
      <div className="wrapper">
        <WsHandler accessToken={accessToken}/>
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
      <Notifications />
      <App />
    </Provider>
  );
};

ReactDOM.render(<WrappedApp />, document.getElementById('output'));
