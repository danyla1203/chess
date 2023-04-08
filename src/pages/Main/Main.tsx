import * as React from 'react';
import useWebSocket from 'react-use-websocket';
import { Link } from 'react-router-dom';
import { Chat } from './Chat';

import './Main.scss';
import { useSelector } from 'react-redux';
import { config } from '../../config';

export const MainPage = () => {
  const accessToken = useSelector((state: any) => state.user.accessToken);
  const [ minutes, setMinutes ] = React.useState(6);
  const [ timeAdd, setTimeAdd ] = React.useState(15);
  const { sendJsonMessage } = useWebSocket(`ws://${config.apiDomain}`, {
    share: true,
    queryParams: {
      'Authorization': accessToken,
    }, 
  });

  const createGame = (side: 'w'|'b'|'rand') => {
    const body = {
      side,
      time: minutes * 60 * 1000,
      timeIncrement: timeAdd * 1000
    };
    sendJsonMessage({ action: '/game/new-game', body });
  };

  return (
    <main>
      <Chat />
      <div className="create-game">
        <div className="create-game__time-config">
          <h4>Minutes per side: {minutes}</h4>
          <input
            className="create-game__minutes"
            onChange={(e: any) => setMinutes(e.target.value)}
            type="range"
            min="1"
            max="38"
            value={minutes}
          />
          <h4>Increment in seconds: {timeAdd}</h4>
          <input
            className="create-game_time-add"
            onChange={(e: any) => setTimeAdd(e.target.value)}
            type="range"
            min="1"
            max="38"
            value={timeAdd}
          />
        </div>
        <div className='create-game__select-side'>
          <button className='create-game__classic__btn' onClick={() => createGame('b')}>
            <Link to='/game'>Black</Link>
          </button>
          <button className='create-game__classic__btn' onClick={() => createGame('rand')}>
            <Link to='/game'>Random</Link>
          </button>
          <button className='create-game__classic__btn' onClick={() => createGame('w')}>
            <Link to='/game'>White</Link>
          </button>
        </div>
      </div>
    </main>
  );
};