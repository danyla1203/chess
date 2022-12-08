import * as React from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

export const UserPage = () => {
  const isAuthorized = useSelector((state: any) => state.tokens.authorized);
  const userData = useSelector((state: any) => state.user);

  if (!isAuthorized) return <Navigate to={'/'} />;
  return (
    <div className="user-page">
      <div className="user-page__personal">
        <h3>{ userData.name }</h3>
      </div>
    </div>
  );
};