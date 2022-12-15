import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { logoutRequest, userGameList } from '../../store/slices/user';

const GameHistoryItem = ({ data: { maxTime, timeIncrement, sideSelecting, playersId } }: any) => {
  return (
    <div className='user-page__game-history__item'>
      <h3 className='user-page__game-history__item__timings'>{maxTime}-{timeIncrement}</h3>
      <h3 className='user-page__game-history__item__side-selecting'>{sideSelecting}</h3>
      <div className='user-page__game-history__item__players'>
        <h3 className='user-page__game-history__item__players__item'>{playersId[0].name}</h3>
        <h3 className='user-page__game-history__item__players__item'>{playersId[1].name}</h3>
      </div>
    </div>
  );
};

const GameHistory = () => {
  const gameHistory = useSelector((state: any) => state.user.gameHistory);
  console.log(gameHistory);
  return (
    <div className='user-page__game-history'>
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
        <h3>{ userName }</h3>
        <button onClick={() => dispatch(logoutRequest())}>Logout</button>
        <GameHistory />
      </div>
    </div>
  );
};