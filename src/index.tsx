import * as React from 'react';
import ReactDOM = require('react-dom');
import { Provider, useSelector, useDispatch } from 'react-redux';
import { store } from './store/index';
import { Notifications } from './components/Notification/Notifications';
import { GameWaiting } from './components/GameWaiting/GameWaiting';
import { Router } from './Router';

import { getUserByRefresh } from './store/slices/user';

import './index.scss';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import { connect, close } from './store/slices/ws';

export enum GameTypes {
  START_NEW = 'START_NEW',
  CONNECT_TO_EXISTING_GAME = 'CONNECT_TO_EXISTING_GAME',
  CONNECT_TO_GAME_AS_SPECTATOR = 'CONNECT_TO_GAME_AS_SPECTATOR',
  MAKE_TURN = 'MAKE_TURN',
  CHAT_MESSAGE = 'CHAT_MESSAGE',
}

const App = () => {
  const accessToken = useSelector((state: any) => state.user.accessToken);
  const isGetTokenLoaded = useSelector((state: any) => state.user.isGetTokenLoaded);
  const isWsLoaded = useSelector((state: any) => state.ws.isConnected);
  const dispatch = useDispatch<any>();

  React.useEffect(() => {
    const refresh = localStorage.getItem('refreshToken');
    dispatch(getUserByRefresh(refresh));
  }, []);

  React.useEffect(() => {
    if (isGetTokenLoaded) {
      dispatch(close());
      dispatch(connect(accessToken));
    }
  }, [ isGetTokenLoaded, accessToken ]);
  
  if (isGetTokenLoaded && isWsLoaded) {
    return (
      <div className="wrapper">
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
      <GameWaiting />
    </Provider>
  );
};

ReactDOM.render(<WrappedApp />, document.getElementById('output'));
