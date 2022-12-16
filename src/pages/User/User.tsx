import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { logoutRequest, userGameList } from '../../store/slices/user';

import './User.scss';

const GameHistoryItem = ({ data: { maxTime, timeIncrement, sideSelecting, players } }: any) => {
  const beautyMaxTime = Math.floor(maxTime / (1000 * 60));
  const beautyTimeIncrement = Math.floor(timeIncrement / 1000);
  return (
    <div className='user-page__game-history__item'>
      <h3 className='user-page__game-history__item__timings'>{beautyMaxTime}-{beautyTimeIncrement}</h3>
      <span className={`user-page__game-history__item__side-selecting ${sideSelecting}-circle`}></span>
      <div className='user-page__game-history__item__players'>
        <h3 className='user-page__game-history__item__players__item'>{players[0].name}</h3>
        <h3 className='user-page__game-history__item__players__item'>{players[1].name}</h3>
      </div>
    </div>
  );
};

const GameHistory = () => {
  const gameHistory = useSelector((state: any) => state.user.gameHistory);
  console.log(gameHistory);
  return (
    <div className='user-page__game-history'>
      <h2 className='user-page__game-history__label'>Games history</h2>
      <div className="user-page__game-history__labels">
        <h3 className='user-page__game-history__labels__item'>Timings:</h3>
        <h3 className='user-page__game-history__labels__item'>Side:</h3>
        <h3 className='user-page__game-history__labels__item'>Players:</h3>
      </div>
      { gameHistory.map((game: any) => <GameHistoryItem data={game}/>) }
    </div>
  );
};

export const UserPage = () => {
  const isAuthorized = useSelector((state: any) => state.user.authorized);
  const accessToken = useSelector((state: any) => state.user.accessToken);
  const userName = useSelector((state: any) => state.user.name);
  const dispatch = useDispatch<any>();
  
  if (!isAuthorized) return <Navigate to={'/'} />;
  React.useEffect(() => {
    dispatch(userGameList(accessToken));
  }, []);
  return (
    <div className="user-page">
      <div className="user-page__personal">
        <h3 className='user-page__personal__name'>{ userName }</h3>
        <button 
          onClick={() => dispatch(logoutRequest())}
          className='user-page__personal__btn'
        >Logout</button>
      </div>
      <GameHistory />
    </div>
  );
};