import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { logoutRequest } from '../../store/slices/user';

export const UserPage = () => {
  const isAuthorized = useSelector((state: any) => state.user.authorized);
  const userName = useSelector((state: any) => state.user.name);
  const dispatch = useDispatch<any>();
  
  if (!isAuthorized) return <Navigate to={'/'} />;
  return (
    <div className="user-page">
      <div className="user-page__personal">
        <h3>{ userName }</h3>
        <button onClick={() => dispatch(logoutRequest())}>Logout</button>
      </div>
    </div>
  );
};