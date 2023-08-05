import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';

const GameItem = ({ game, connectToGame }) => {
  const beautyMaxTime = Math.floor(game.config.time / (1000 * 60));
  const beautyTimeIncrement = Math.floor(game.config.timeIncrement / 1000);

  const creator: any = Object.values(game.players)[0];

  return (
    <div className='game-list__item' key={game.id} onClick={() => connectToGame(game.id)} >
      <div className='game-list__item__data-block'>
        <h3 className='game-list__item__name'>{creator.name}</h3>
      </div>
      <div className='game-list__item__data-block'>
        <span className={`game-list__item__side-selection-circle ${game.config.side}-circle`}></span>
      </div>
      <div className='game-list__item__data-block'>
        <h3>{beautyMaxTime}-{beautyTimeIncrement}</h3>
      </div>
    </div>
  );
};

import './GameList.scss';
import { GameData } from '../../store/slices/gamelist';
import { sendMessage } from '../../store/slices/ws';

export const GameList = () => {
  const games: GameData[] = useSelector((state: any) => state.gameList.games);
  const dispatch = useDispatch();
  
  const connectToGame = (gameId: string) => {
    dispatch(sendMessage({ event: 'join', body: { gameId } }));
  };

  return (
    <div className='game-list'>
      <div className="game-list__labels">
        <h3 className='game-list__labels__item'>Player name:</h3>
        <h3 className='game-list__labels__item'>Side:</h3>
        <h3 className='game-list__labels__item'>Time:</h3>
      </div>
      { 
        games.map((game) => <GameItem game={game} connectToGame={connectToGame} />) 
      }
    </div>
  );
};