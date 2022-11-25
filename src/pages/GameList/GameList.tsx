import * as React from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import useWebSocket from 'react-use-websocket';
import { GameTypes, ServerMessageTypes } from '../..';
import { GameData } from '../../store/slices/gamelist';

export const GameList = () => {
  const { sendJsonMessage } = useWebSocket('ws://localhost:3000', { share: true });
  const games: GameData[] = useSelector((state: any) => state.gameList.games);
  
  const connectToGame = (gameId: string) => {
    sendJsonMessage({ type: ServerMessageTypes.Game, body: { type: GameTypes.CONNECT_TO_EXISTING_GAME, body: { gameId } } });
  };

  const renderedGameList = games.map((game: GameData) => {
    return (
      <div className='game-item' key={game.id}>
        <h3>{game.id}</h3>
        <button onClick={() => connectToGame(game.id)}>
          <Link to='/game'>Connect to game</Link>
        </button>
      </div>
    );
  });
  return (
    <div id='game-list'>
      { renderedGameList }
    </div>
  );
};