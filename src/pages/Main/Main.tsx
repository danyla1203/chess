import * as React from 'react';
import { GameList } from '../../components/GameList/GameList';
import useWebSocket from 'react-use-websocket';
import { GameTypes, ServerMessageTypes } from '../..';
import { Link } from 'react-router-dom';

export const MainPage = () => {
  const { sendJsonMessage } = useWebSocket('ws://localhost:3000', { share: true });

  const createGame = () => {
    sendJsonMessage({ type: ServerMessageTypes.Game, body: { type: GameTypes.START_NEW, body: {} } });
  };

  return (
    <div id='main'>
      <GameList />
      <button onClick={createGame}>
        <Link to='/game'>Create new game</Link>
      </button>
    </div>
  );
};